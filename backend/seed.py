import random
from faker import Faker
from .database import engine, SessionLocal, Base
from . import models
from .models import Fixture, Shelf, Product, PerformanceData
from .optimizer import optimize_shelf_layout

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
        cat = random.choice(PRODUCT_CATEGORIES)
        image_map = {
            "Grocery": "/products/grocery.png",
            "Beverage": "/products/beverage.png",
            "Health": "/products/health.png",
            "Household": "/products/household.png"
        }
        product = Product(
            sku=fake.unique.ean(length=13),
            name=fake.catch_phrase(),
            brand=fake.company(),
            category=cat,
            width=random.uniform(50.0, 200.0),
            height=random.uniform(50.0, 300.0),
            depth=random.uniform(50.0, 400.0),
            color_hex=fake.hex_color(),
            image_url=image_map.get(cat, "/products/grocery.png")
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

    # Create 8 stores across different regions
    stores = [
        models.Store(name="Downtown Market", region="Central"),
        models.Store(name="Uptown Market", region="North"),
        models.Store(name="Westside Plaza", region="West"),
        models.Store(name="Eastside Mall", region="East"),
        models.Store(name="Riverside Shopping Center", region="South"),
        models.Store(name="Midtown Hub", region="Central"),
        models.Store(name="Airport Terminal Store", region="Airport"),
        models.Store(name="Lakeside Retail Park", region="North"),
    ]
    for store in stores:
        db.add(store)
    db.commit()
    for store in stores:
        db.refresh(store)

    # Define fixtures for each store
    store_fixtures = [
        # Downtown Market (Store 0)
        [
            ("Downtown Gondola A", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 20),
            ("Downtown Gondola B", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 20),
            ("Downtown End Cap", "End Cap", 900.0, 1800.0, 450.0, 150.0, 3, 15),
            ("Downtown Beverage Section", "Beverage Cooler",
             1500.0, 2200.0, 600.0, 200.0, 5, 25),
        ],
        # Uptown Market (Store 1)
        [
            ("Uptown Health & Beauty", "Gondola",
             1200.0, 2000.0, 500.0, 200.0, 4, 20),
            ("Uptown Grocery A", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 18),
            ("Uptown Promo Bay", "Promo Display",
             1000.0, 1700.0, 400.0, 150.0, 3, 12),
            ("Uptown Specialty", "Wall Mount", 800.0, 1600.0, 300.0, 100.0, 3, 10),
        ],
        # Westside Plaza (Store 2)
        [
            ("Westside Main Aisle", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 22),
            ("Westside Snacks", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 20),
            ("Westside Checkout", "End Cap", 900.0, 1800.0, 450.0, 150.0, 3, 14),
        ],
        # Eastside Mall (Store 3)
        [
            ("Eastside Gondola A", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 18),
            ("Eastside Gondola B", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 18),
            ("Eastside Beverage", "Beverage Cooler",
             1500.0, 2200.0, 600.0, 200.0, 5, 25),
            ("Eastside Promo", "Promo Display",
             1000.0, 1700.0, 400.0, 150.0, 3, 15),
        ],
        # Riverside Shopping Center (Store 4)
        [
            ("Riverside Main Gondola", "Gondola",
             1200.0, 2000.0, 500.0, 200.0, 4, 20),
            ("Riverside Specialty", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 18),
            ("Riverside Seasonal", "End Cap", 900.0, 1800.0, 450.0, 150.0, 3, 16),
        ],
        # Midtown Hub (Store 5)
        [
            ("Midtown Aisle A", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 19),
            ("Midtown Aisle B", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 19),
            ("Midtown Express Aisle", "Gondola",
             1000.0, 1800.0, 400.0, 150.0, 3, 14),
            ("Midtown Checkout Promo", "End Cap",
             900.0, 1800.0, 450.0, 150.0, 3, 13),
        ],
        # Airport Terminal Store (Store 6)
        [
            ("Airport Main Aisle", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 21),
            ("Airport Travel Essentials", "Gondola",
             1100.0, 1900.0, 450.0, 180.0, 4, 17),
            ("Airport Premium Section", "Wall Mount",
             800.0, 1600.0, 300.0, 100.0, 3, 11),
        ],
        # Lakeside Retail Park (Store 7)
        [
            ("Lakeside Gondola A", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 20),
            ("Lakeside Gondola B", "Gondola", 1200.0, 2000.0, 500.0, 200.0, 4, 20),
            ("Lakeside Beverage Station", "Beverage Cooler",
             1500.0, 2200.0, 600.0, 200.0, 5, 24),
        ],
    ]

    # Create fixtures for each store
    for store_idx, store in enumerate(stores):
        for fixture_spec in store_fixtures[store_idx]:
            create_fixture(db, store, *fixture_spec)

    db.close()


if __name__ == "__main__":
    seed_db()
    print("Database seeded successfully.")
