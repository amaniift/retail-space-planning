import random
from faker import Faker
from database import engine, SessionLocal, Base
import models
from models import Fixture, Shelf, Product, PerformanceData
from optimizer import optimize_shelf_layout

fake = Faker()
PRODUCT_CATEGORIES = ["Grocery", "Beverage", "Health", "Household"]


def create_fixture(db, store, name, fixture_type, width, height, depth, base_height, shelf_count, product_count):
    fixture = Fixture(
        name=name,
        type=fixture_type,
        store_id=store.id,
        width=width,
        height=height,
        depth=depth,
        base_height=base_height,
        number_of_shelves=shelf_count,
    )
    db.add(fixture)
    db.commit()
    db.refresh(fixture)

    for index in range(shelf_count):
        shelf = Shelf(
            fixture_id=fixture.id,
            vertical_position_y=fixture.base_height + index * 400.0,
            width=fixture.width,
            depth=fixture.depth,
        )
        db.add(shelf)
    db.commit()

    created_product_ids = []
    for _ in range(product_count):
        product = Product(
            sku=fake.unique.ean(length=13),
            name=fake.catch_phrase(),
            brand=fake.company(),
            category=random.choice(PRODUCT_CATEGORIES),
            width=random.uniform(50.0, 200.0),
            height=random.uniform(50.0, 300.0),
            depth=random.uniform(50.0, 400.0),
            color_hex=fake.hex_color(),
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        created_product_ids.append(product.id)

        perf = PerformanceData(
            product_id=product.id,
            daily_unit_movement=random.uniform(0.1, 20.0),
            unit_cost=random.uniform(1.0, 100.0),
        )
        db.add(perf)
        db.commit()

    optimize_shelf_layout(fixture.id, db, product_ids=created_product_ids)
    return fixture


def seed_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    stores = [
        models.Store(name="Downtown Market", region="Central"),
        models.Store(name="Uptown Market", region="North"),
    ]
    for store in stores:
        db.add(store)
    db.commit()
    for store in stores:
        db.refresh(store)

    create_fixture(
        db,
        stores[0],
        "Downtown Gondola A",
        "Gondola",
        1200.0,
        2000.0,
        500.0,
        200.0,
        4,
        18,
    )
    create_fixture(
        db,
        stores[0],
        "Downtown End Cap",
        "End Cap",
        900.0,
        1800.0,
        450.0,
        150.0,
        3,
        12,
    )
    create_fixture(
        db,
        stores[1],
        "Uptown Health & Beauty",
        "Gondola",
        1200.0,
        2000.0,
        500.0,
        200.0,
        4,
        16,
    )
    create_fixture(
        db,
        stores[1],
        "Uptown Promo Bay",
        "Promo Display",
        1000.0,
        1700.0,
        400.0,
        150.0,
        3,
        10,
    )

    db.close()

if __name__ == "__main__":
    seed_db()
    print("Database seeded successfully.")
