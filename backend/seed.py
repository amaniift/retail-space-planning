import random
from faker import Faker
from database import engine, SessionLocal, Base
from models import Fixture, Shelf, Product, PerformanceData, Position
from optimizer import optimize_shelf_layout

fake = Faker()

def seed_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1 standard Gondola fixture (configured with 4 shelves vertically spaced)
    fixture = Fixture(
        name="Main Aisle Gondola",
        type="Gondola",
        width=1200.0,  # mm
        height=2000.0, # mm
        depth=500.0,   # mm
        base_height=200.0,
        number_of_shelves=4
    )
    db.add(fixture)
    db.commit()
    db.refresh(fixture)
    
    # 4 shelves
    for i in range(4):
        shelf = Shelf(
            fixture_id=fixture.id,
            vertical_position_y=fixture.base_height + i * 400.0,
            width=fixture.width,
            depth=fixture.depth
        )
        db.add(shelf)
    
    # 100 random products
    for _ in range(100):
        # width between 50mm and 200mm
        width = random.uniform(50.0, 200.0)
        height = random.uniform(50.0, 300.0)
        depth = random.uniform(50.0, 400.0)
        
        color_hex = fake.hex_color()
        
        product = Product(
            sku=fake.unique.ean(length=13),
            name=fake.catch_phrase(),
            brand=fake.company(),
            width=width,
            height=height,
            depth=depth,
            color_hex=color_hex
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        
        perf = PerformanceData(
            product_id=product.id,
            daily_unit_movement=random.uniform(0.1, 20.0),
            unit_cost=random.uniform(1.0, 100.0)
        )
        db.add(perf)
        
    db.commit()
    
    # optimize layout
    optimize_shelf_layout(fixture.id, db)
    
    db.close()

if __name__ == "__main__":
    seed_db()
    print("Database seeded successfully.")
