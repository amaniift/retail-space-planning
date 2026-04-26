from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
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

@app.post("/api/planogram/position/{position_id}/update")
def update_position(position_id: int, request: schemas.PositionUpdateRequest, db: Session = Depends(get_db)):
    pos = db.query(models.Position).filter(models.Position.id == position_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
        
    pos.pos_x = request.pos_x
    pos.pos_y = request.pos_y
    pos.facings_wide = request.facings_wide
    
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
