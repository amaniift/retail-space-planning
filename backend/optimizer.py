from models import Fixture, Shelf, Product, Position, PerformanceData
from sqlalchemy.orm import Session

def optimize_shelf_layout(fixture_id: int, db: Session, product_ids=None):
    fixture = db.query(Fixture).filter(Fixture.id == fixture_id).first()
    if not fixture:
        return
        
    # Get products and sort by movement desc; allow fixture-specific seeding when product_ids is provided.
    product_query = db.query(Product).join(PerformanceData)
    if product_ids:
        product_query = product_query.filter(Product.id.in_(product_ids))
    products = product_query.order_by(PerformanceData.daily_unit_movement.desc()).all()
    
    # Get shelves for fixture, ordered bottom to top
    shelves = db.query(Shelf).filter(Shelf.fixture_id == fixture_id).order_by(Shelf.vertical_position_y.asc()).all()
    
    # clear existing positions
    db.query(Position).filter(Position.shelf_id.in_([s.id for s in shelves])).delete(synchronize_session=False)
    
    product_idx = 0
    total_products = len(products)
    
    for shelf in shelves:
        current_x = 0.0
        
        while product_idx < total_products:
            product = products[product_idx]
            perf = product.performance
            daily_movement = perf.daily_unit_movement if perf and perf.daily_unit_movement > 0 else 0.1
            
            # Start with 1 facing
            facings_wide = 1
            # Calculate max facings high based on shelf height (assuming 400mm space between shelves)
            # In seed.py, shelves are spaced by 400mm. Let's use 400 as max available height.
            available_height = 400.0
            facings_high = int(available_height // product.height) if available_height >= product.height else 1
            if facings_high < 1: facings_high = 1
            
            facings_deep = int(shelf.depth // product.depth) if shelf.depth >= product.depth else 1
            if facings_deep < 1:
                facings_deep = 1
            
            def calculate_dos(f_wide, f_high, f_deep, daily_mov):
                capacity = f_wide * f_high * f_deep
                return capacity / daily_mov
                
            # Increase facings wide until DOS >= 7.0 or we hit the shelf width
            while calculate_dos(facings_wide, facings_high, facings_deep, daily_movement) < 7.0:
                if current_x + (facings_wide + 1) * product.width <= shelf.width:
                    facings_wide += 1
                else:
                    break
            
            # Check if even 1 facing fits
            if current_x + (facings_wide * product.width) <= shelf.width:
                pos = Position(
                    shelf_id=shelf.id,
                    product_id=product.id,
                    pos_x=current_x + (facings_wide * product.width)/2.0, # Center X relative to left
                    pos_y=shelf.vertical_position_y,
                    pos_z=0,
                    facings_wide=facings_wide,
                    facings_high=facings_high,
                    facings_deep=facings_deep
                )
                db.add(pos)
                current_x += facings_wide * product.width
                product_idx += 1
            else:
                # Move to next shelf
                break
                
    db.commit()
