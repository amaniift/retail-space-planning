from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class PerformanceDataSchema(BaseModel):
    id: int
    product_id: int
    daily_unit_movement: float
    unit_cost: float
    model_config = ConfigDict(from_attributes=True)

class ProductSchema(BaseModel):
    id: int
    sku: str
    name: str
    brand: str
    width: float
    height: float
    depth: float
    color_hex: str
    performance: Optional[PerformanceDataSchema] = None
    model_config = ConfigDict(from_attributes=True)

class PositionSchema(BaseModel):
    id: int
    shelf_id: int
    product_id: int
    pos_x: float
    pos_y: float
    pos_z: float
    facings_wide: int = 1
    facings_high: int = 1
    facings_deep: int = 1
    product: ProductSchema
    model_config = ConfigDict(from_attributes=True)

class ShelfSchema(BaseModel):
    id: int
    fixture_id: int
    vertical_position_y: float
    width: float
    depth: float
    positions: List[PositionSchema] = []
    model_config = ConfigDict(from_attributes=True)

class FixtureSchema(BaseModel):
    id: int
    name: str
    type: str
    store_id: Optional[int] = None
    width: float
    height: float
    depth: float
    base_height: float
    number_of_shelves: int
    shelves: List[ShelfSchema] = []
    model_config = ConfigDict(from_attributes=True)


class StoreSchema(BaseModel):
    id: int
    name: str
    region: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PositionUpdateRequest(BaseModel):
    pos_x: float
    pos_y: float
    facings_wide: int
    shelf_id: Optional[int] = None

class PositionCreateRequest(BaseModel):
    product_id: int
    shelf_id: int
    pos_x: float
    pos_y: float
    facings_wide: int = 1
