from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from collections import Counter
from typing import List, Optional
import math
from . import models, schemas
from .database import SessionLocal, engine
from .optimizer import optimize_shelf_layout
import datetime

MIN_DOS = 7.0
GRID_SNAP_MM = 10.0

models.Base.metadata.create_all(bind=engine)


def ensure_schema():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "fixtures" not in tables:
        return

    column_names = {column["name"]
                    for column in inspector.get_columns("fixtures")}
    if "store_id" not in column_names:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE fixtures ADD COLUMN store_id INTEGER"))

    product_column_names = {column["name"]
                            for column in inspector.get_columns("products")}
    if "category" not in product_column_names:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE products ADD COLUMN category TEXT"))
    with engine.begin() as connection:
        connection.execute(
            text(
                "UPDATE products SET category = COALESCE(category, 'General') WHERE category IS NULL")
        )

    # Create missing tables if needed
    if "users" not in tables or "comments" not in tables or "workflow_states" not in tables:
        models.Base.metadata.create_all(bind=engine)

    # Seed a default admin user if no users exist
    with SessionLocal() as db:
        if db.query(models.User).count() == 0:
            default_user = models.User(username="admin", role="admin")
            db.add(default_user)
            db.commit()


ensure_schema()

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Retail Space Planning API is running. Go to /api/planogram/1 for data."}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def snap_to_grid(value: float, grid_size: float = GRID_SNAP_MM) -> float:
    return round(value / grid_size) * grid_size


def get_product_category(product: models.Product) -> str:
    return (product.category or product.brand or "Uncategorized").strip()


def interval_overlaps(left_min: float, left_max: float, right_min: float, right_max: float) -> bool:
    return left_min < right_max and left_max > right_min


def resolve_facings_wide(
    requested_facings_wide: int,
    product: models.Product,
    shelf: models.Shelf,
    facings_high: int,
    facings_deep: int,
):
    warnings = []
    max_fit = int(shelf.width // product.width)
    if max_fit < 1:
        raise HTTPException(
            status_code=400, detail="Product cannot fit on this shelf.")

    perf = product.performance
    daily_mov = perf.daily_unit_movement if perf and perf.daily_unit_movement and perf.daily_unit_movement > 0 else 0.0
    min_for_dos = 1
    if daily_mov > 0:
        min_for_dos = max(1, math.ceil(
            (MIN_DOS * daily_mov) / max(1, facings_high * facings_deep)))

    snapped = max(requested_facings_wide, min_for_dos)
    snapped = min(snapped, max_fit)

    if snapped != requested_facings_wide:
        warnings.append(
            f"Facings snapped to {snapped} to stay within shelf limits and DOS rules.")
    if snapped < min_for_dos:
        warnings.append(
            f"DOS warning: this shelf can only support {snapped} facings, below the minimum DOS target.")

    return snapped, warnings, daily_mov


def validate_position_request(
    shelf: models.Shelf,
    product: models.Product,
    pos_x: float,
    facings_wide: int,
    facings_high: int,
    facings_deep: int,
    ignore_position_id: Optional[int] = None,
):
    warnings = []
    facings_wide, facing_warnings, daily_mov = resolve_facings_wide(
        facings_wide,
        product,
        shelf,
        facings_high,
        facings_deep,
    )
    warnings.extend(facing_warnings)

    product_width = product.width * facings_wide
    half_width = product_width / 2.0
    if product_width > shelf.width:
        raise HTTPException(
            status_code=400, detail="Product is wider than the shelf and cannot be placed safely.")

    snapped_x = snap_to_grid(pos_x)
    min_x = half_width
    max_x = shelf.width - half_width
    clamped_x = min(max(snapped_x, min_x), max_x)

    if clamped_x != pos_x:
        warnings.append(
            f"Placement snapped to a valid shelf position at {clamped_x:.1f} mm.")

    desired_min = clamped_x - half_width
    desired_max = clamped_x + half_width

    for other in shelf.positions:
        if ignore_position_id is not None and other.id == ignore_position_id:
            continue
        other_width = other.product.width * other.facings_wide
        other_min = other.pos_x - (other_width / 2.0)
        other_max = other.pos_x + (other_width / 2.0)
        if interval_overlaps(desired_min, desired_max, other_min, other_max):
            raise HTTPException(
                status_code=400, detail="Placement overlaps another product on the shelf.")

    capacity = facings_wide * facings_high * facings_deep
    dos = capacity / daily_mov if daily_mov > 0 else None
    if dos is not None and dos < MIN_DOS:
        warnings.append(
            f"DOS warning: {dos:.2f} days is below the minimum {MIN_DOS:.1f} days.")

    shelf_categories = []
    for other in shelf.positions:
        if ignore_position_id is not None and other.id == ignore_position_id:
            continue
        shelf_categories.append(get_product_category(other.product))

    if shelf_categories:
        dominant_category = Counter(shelf_categories).most_common(1)[0][0]
        current_category = get_product_category(product)
        if dominant_category != current_category:
            warnings.append(
                f"Category warning: this shelf is mostly {dominant_category}, but the placed item is {current_category}."
            )

    return clamped_x, warnings, dos, facings_wide


@app.get("/api/planogram/{fixture_id}", response_model=schemas.FixtureSchema)
def get_planogram(fixture_id: int, db: Session = Depends(get_db)):
    fixture = db.query(models.Fixture).filter(
        models.Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")
    return fixture


@app.get("/api/products", response_model=List[schemas.ProductSchema])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@app.get("/api/stores", response_model=List[schemas.StoreSchema])
def get_stores(db: Session = Depends(get_db)):
    return db.query(models.Store).all()


@app.get("/api/store/{store_id}/fixtures", response_model=List[schemas.FixtureSchema])
def get_store_fixtures(store_id: int, db: Session = Depends(get_db)):
    fixtures = db.query(models.Fixture).filter(
        models.Fixture.store_id == store_id).all()
    return fixtures


@app.post("/api/fixtures", response_model=schemas.FixtureSchema)
def create_fixture(request: schemas.FixtureCreateRequest, db: Session = Depends(get_db)):
    store = db.query(models.Store).filter(
        models.Store.id == request.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    fixture = models.Fixture(
        name=request.name,
        type=request.type,
        store_id=request.store_id,
        width=request.width,
        height=request.height,
        depth=request.depth,
        base_height=request.base_height,
        number_of_shelves=request.number_of_shelves,
    )
    db.add(fixture)
    db.commit()
    db.refresh(fixture)

    shelf_spacing = 400.0
    for index in range(request.number_of_shelves):
        shelf = models.Shelf(
            fixture_id=fixture.id,
            vertical_position_y=request.base_height + index * shelf_spacing,
            width=request.width,
            depth=request.depth,
        )
        db.add(shelf)

    db.commit()
    db.refresh(fixture)
    return fixture


@app.get("/api/planogram/{fixture_id}/analytics")
def get_fixture_analytics(fixture_id: int, db: Session = Depends(get_db)):
    fixture = db.query(models.Fixture).filter(
        models.Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    # Aggregate metrics per shelf
    shelves = db.query(models.Shelf).filter(
        models.Shelf.fixture_id == fixture_id).all()
    analytics = {"fixture_id": fixture_id, "shelves": []}

    for shelf in shelves:
        positions = db.query(models.Position).filter(
            models.Position.shelf_id == shelf.id).all()
        total_capacity = 0
        total_daily_movement = 0.0
        est_daily_revenue = 0.0

        for pos in positions:
            perf = pos.product.performance
            daily_mov = perf.daily_unit_movement if perf and perf.daily_unit_movement > 0 else 0.0
            unit_cost = perf.unit_cost if perf and perf.unit_cost else 0.0
            capacity = pos.facings_wide * pos.facings_high * pos.facings_deep
            total_capacity += capacity
            total_daily_movement += daily_mov
            # Use unit_cost as proxy for price to estimate revenue when selling_price unavailable
            est_daily_revenue += daily_mov * unit_cost * pos.facings_wide

        avg_dos = (total_capacity /
                   total_daily_movement) if total_daily_movement > 0 else None
        analytics["shelves"].append({
            "shelf_id": shelf.id,
            "vertical_position_y": shelf.vertical_position_y,
            "width": shelf.width,
            "depth": shelf.depth,
            "total_capacity": total_capacity,
            "total_daily_movement": total_daily_movement,
            "estimated_daily_revenue": est_daily_revenue,
            "avg_dos": avg_dos
        })

    return analytics


@app.post("/api/planogram/position/add")
def add_position(request: schemas.PositionCreateRequest, db: Session = Depends(get_db)):
    shelf = db.query(models.Shelf).filter(
        models.Shelf.id == request.shelf_id).first()
    product = db.query(models.Product).filter(
        models.Product.id == request.product_id).first()
    if not shelf or not product:
        raise HTTPException(
            status_code=404, detail="Shelf or Product not found")

    available_height = 400.0
    facings_high = int(
        available_height // product.height) if available_height >= product.height else 1
    if facings_high < 1:
        facings_high = 1
    facings_deep = int(
        shelf.depth // product.depth) if shelf.depth >= product.depth else 1
    if facings_deep < 1:
        facings_deep = 1

    snapped_x, warnings, dos, snapped_facings_wide = validate_position_request(
        shelf,
        product,
        request.pos_x,
        request.facings_wide,
        facings_high,
        facings_deep,
    )

    pos = models.Position(
        shelf_id=request.shelf_id,
        product_id=request.product_id,
        pos_x=snapped_x,
        pos_y=shelf.vertical_position_y,
        pos_z=0,
        facings_wide=snapped_facings_wide,
        facings_high=facings_high,
        facings_deep=facings_deep
    )
    db.add(pos)
    db.commit()
    return {
        "message": "Position added",
        "position_id": pos.id,
        "pos_x": pos.pos_x,
        "pos_y": pos.pos_y,
        "dos": dos,
        "warnings": warnings,
    }


@app.delete("/api/planogram/position/{position_id}")
def delete_position(position_id: int, db: Session = Depends(get_db)):
    pos = db.query(models.Position).filter(
        models.Position.id == position_id).first()
    if pos:
        db.delete(pos)
        db.commit()
    return {"message": "Deleted"}


@app.post("/api/planogram/position/{position_id}/update")
def update_position(position_id: int, request: schemas.PositionUpdateRequest, db: Session = Depends(get_db)):
    pos = db.query(models.Position).filter(
        models.Position.id == position_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")

    target_shelf_id = request.shelf_id if request.shelf_id is not None else pos.shelf_id
    target_shelf = db.query(models.Shelf).filter(
        models.Shelf.id == target_shelf_id).first()
    if not target_shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")

    snapped_x, warnings, dos, snapped_facings_wide = validate_position_request(
        target_shelf,
        pos.product,
        request.pos_x,
        request.facings_wide,
        pos.facings_high,
        pos.facings_deep,
        ignore_position_id=pos.id,
    )

    pos.pos_x = snapped_x
    pos.pos_y = target_shelf.vertical_position_y
    pos.shelf_id = target_shelf.id
    pos.facings_wide = snapped_facings_wide

    db.commit()
    db.refresh(pos)

    return {
        "id": pos.id,
        "pos_x": pos.pos_x,
        "pos_y": pos.pos_y,
        "pos_z": pos.pos_z,
        "facings_wide": pos.facings_wide,
        "facings_high": pos.facings_high,
        "facings_deep": pos.facings_deep,
        "capacity": pos.facings_wide * pos.facings_high * pos.facings_deep,
        "dos": dos,
        "warnings": warnings,
    }


@app.post("/api/planogram/{fixture_id}/recommendations")
def get_recommendations(fixture_id: int, request: schemas.RecommendationRequest, db: Session = Depends(get_db)):
    # Return a preview of recommended positions without modifying DB
    fixture = db.query(models.Fixture).filter(
        models.Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    recs = optimize_shelf_layout(
        fixture_id, db, product_ids=request.product_ids if request else None, apply=False)
    return {"fixture_id": fixture_id, "recommendations": recs}


@app.post("/api/planogram/{fixture_id}/apply_recommendations")
def apply_recommendations(fixture_id: int, request: schemas.RecommendationRequest, db: Session = Depends(get_db)):
    # Apply recommendations to DB (destructive: clears current positions in fixture)
    fixture = db.query(models.Fixture).filter(
        models.Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    optimize_shelf_layout(
        fixture_id, db, product_ids=request.product_ids if request else None, apply=True)
    return {"message": "Recommendations applied", "fixture_id": fixture_id}


@app.get("/api/users", response_model=List[schemas.UserSchema])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.get("/api/planogram/{fixture_id}/workflow", response_model=schemas.WorkflowStateSchema)
def get_workflow(fixture_id: int, db: Session = Depends(get_db)):
    fixture = db.query(models.Fixture).filter(
        models.Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    workflow = db.query(models.WorkflowState).filter(
        models.WorkflowState.fixture_id == fixture_id).first()
    if not workflow:
        # Return default if not explicitly created yet
        return schemas.WorkflowStateSchema(
            id=0, fixture_id=fixture_id, status="Draft", updated_at=datetime.datetime.utcnow()
        )
    return workflow


@app.post("/api/planogram/{fixture_id}/workflow", response_model=schemas.WorkflowStateSchema)
def update_workflow(fixture_id: int, request: schemas.WorkflowUpdateRequest, db: Session = Depends(get_db)):
    fixture = db.query(models.Fixture).filter(
        models.Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")

    workflow = db.query(models.WorkflowState).filter(
        models.WorkflowState.fixture_id == fixture_id).first()
    if not workflow:
        workflow = models.WorkflowState(
            fixture_id=fixture_id, status=request.status, updated_by=request.user_id)
        db.add(workflow)
    else:
        workflow.status = request.status
        workflow.updated_by = request.user_id

    db.commit()
    db.refresh(workflow)
    return workflow


@app.post("/api/comments", response_model=schemas.CommentSchema)
def add_comment(request: schemas.CommentCreateRequest, db: Session = Depends(get_db)):
    comment = models.Comment(
        position_id=request.position_id,
        user_id=request.user_id,
        text=request.text
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
