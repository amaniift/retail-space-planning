from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

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

@app.get("/api/planogram/{fixture_id}", response_model=schemas.FixtureSchema)
def get_planogram(fixture_id: int, db: Session = Depends(get_db)):
    fixture = db.query(models.Fixture).filter(models.Fixture.id == fixture_id).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture not found")
    return fixture

@app.get("/api/products", response_model=List[schemas.ProductSchema])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()

@app.post("/api/planogram/position/add")
def add_position(request: schemas.PositionCreateRequest, db: Session = Depends(get_db)):
    shelf = db.query(models.Shelf).filter(models.Shelf.id == request.shelf_id).first()
    product = db.query(models.Product).filter(models.Product.id == request.product_id).first()
    if not shelf or not product:
        raise HTTPException(status_code=404, detail="Shelf or Product not found")
        
    available_height = 400.0
    facings_high = int(available_height // product.height) if available_height >= product.height else 1
    if facings_high < 1: facings_high = 1
    facings_deep = int(shelf.depth // product.depth) if shelf.depth >= product.depth else 1
    if facings_deep < 1: facings_deep = 1

    pos = models.Position(
        shelf_id=request.shelf_id,
        product_id=request.product_id,
        pos_x=request.pos_x,
        pos_y=request.pos_y,
        pos_z=0,
        facings_wide=request.facings_wide,
        facings_high=facings_high,
        facings_deep=facings_deep
    )
    db.add(pos)
    db.commit()
    return {"message": "Position added", "position_id": pos.id}

@app.delete("/api/planogram/position/{position_id}")
def delete_position(position_id: int, db: Session = Depends(get_db)):
    pos = db.query(models.Position).filter(models.Position.id == position_id).first()
    if pos:
        db.delete(pos)
        db.commit()
    return {"message": "Deleted"}

@app.post("/api/planogram/position/{position_id}/update")
def update_position(position_id: int, request: schemas.PositionUpdateRequest, db: Session = Depends(get_db)):
    pos = db.query(models.Position).filter(models.Position.id == position_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
        
    pos.pos_x = request.pos_x
    pos.pos_y = request.pos_y
    pos.facings_wide = request.facings_wide
    if request.shelf_id is not None:
        pos.shelf_id = request.shelf_id
    
    db.commit()
    db.refresh(pos)
    
    capacity = pos.facings_wide * pos.facings_high * pos.facings_deep
    perf = pos.product.performance
    daily_mov = perf.daily_unit_movement if perf and perf.daily_unit_movement > 0 else 0.1
    dos = capacity / daily_mov
    
    return {
        "id": pos.id,
        "pos_x": pos.pos_x,
        "pos_y": pos.pos_y,
        "pos_z": pos.pos_z,
        "facings_wide": pos.facings_wide,
        "facings_high": pos.facings_high,
        "facings_deep": pos.facings_deep,
        "capacity": capacity,
        "dos": dos
    }
