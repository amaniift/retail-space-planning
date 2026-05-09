from sqlalchemy.orm import Session
import models
import schemas
from optimizer import optimize_shelf_layout
import datetime

def execute_ai_commands(commands: list, db: Session):
    results = []
    last_created_id = None
    
    for cmd in commands:
        action = cmd.get("action")
        params = cmd.get("params", {})
        
        try:
            if action == "CREATE_FIXTURE":
                fixture = models.Fixture(
                    name=params.get("name", "New Fixture"),
                    type=params.get("type", "Gondola"),
                    width=params.get("width", 1200.0),
                    height=params.get("height", 2000.0),
                    depth=params.get("depth", 500.0),
                    base_height=200.0,
                    number_of_shelves=params.get("shelves", 4),
                    store_id=1 # Default to first store for now
                )
                db.add(fixture)
                db.commit()
                db.refresh(fixture)
                last_created_id = fixture.id
                
                # Add shelves - distributed evenly
                num_s = fixture.number_of_shelves
                if num_s > 1:
                    spacing = (fixture.height - fixture.base_height) / (num_s - 1)
                else:
                    spacing = 0

                for i in range(num_s):
                    shelf = models.Shelf(
                        fixture_id=fixture.id,
                        vertical_position_y=fixture.base_height + i * spacing,
                        width=fixture.width,
                        depth=fixture.depth
                    )
                    db.add(shelf)
                db.commit()
                results.append({"action": action, "status": "success", "id": fixture.id})
                
            elif action == "OPTIMIZE_FIXTURE":
                fid = params.get("fixture_id")
                if fid == "LAST_CREATED":
                    fid = last_created_id
                
                if fid:
                    optimize_shelf_layout(fid, db, apply=True)
                    results.append({"action": action, "status": "success", "id": fid})
                else:
                    results.append({"action": action, "status": "failed", "reason": "No fixture ID"})
                    
            elif action == "POPULATE_FIXTURE":
                fid = params.get("fixture_id")
                if fid == "LAST_CREATED":
                    fid = last_created_id
                
                category = params.get("category")
                product_ids = params.get("product_ids")
                
                if fid:
                    p_ids = []
                    if product_ids:
                        p_ids = product_ids
                    elif category:
                        # Find products in this category
                        products = db.query(models.Product).filter(models.Product.category == category).all()
                        p_ids = [p.id for p in products]
                    
                    if p_ids:
                        optimize_shelf_layout(fid, db, product_ids=p_ids, apply=True)
                        results.append({"action": action, "status": "success", "id": fid, "count": len(p_ids)})
                    else:
                        results.append({"action": action, "status": "failed", "reason": "No products found to populate"})
                else:
                    results.append({"action": action, "status": "failed", "reason": "Missing fixture_id"})
                    
        except Exception as e:
            print(f"Error executing command {action}: {e}")
            results.append({"action": action, "status": "error", "message": str(e)})
            
    return results
