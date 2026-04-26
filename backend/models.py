from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Fixture(Base):
    __tablename__ = "fixtures"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String, default="Gondola")
    width = Column(Float)
    height = Column(Float)
    depth = Column(Float)
    base_height = Column(Float)
    number_of_shelves = Column(Integer)

    shelves = relationship("Shelf", back_populates="fixture")


class Shelf(Base):
    __tablename__ = "shelves"
    id = Column(Integer, primary_key=True, index=True)
    fixture_id = Column(Integer, ForeignKey("fixtures.id"))
    vertical_position_y = Column(Float)
    width = Column(Float)
    depth = Column(Float)

    fixture = relationship("Fixture", back_populates="shelves")
    positions = relationship("Position", back_populates="shelf")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True)
    name = Column(String)
    brand = Column(String)
    width = Column(Float)
    height = Column(Float)
    depth = Column(Float)
    color_hex = Column(String)

    performance = relationship("PerformanceData", back_populates="product", uselist=False)
    positions = relationship("Position", back_populates="product")


class PerformanceData(Base):
    __tablename__ = "performance_data"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True)
    daily_unit_movement = Column(Float)
    unit_cost = Column(Float)

    product = relationship("Product", back_populates="performance")


class Position(Base):
    __tablename__ = "positions"
    id = Column(Integer, primary_key=True, index=True)
    shelf_id = Column(Integer, ForeignKey("shelves.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    pos_x = Column(Float)
    pos_y = Column(Float)
    pos_z = Column(Float)
    facings_wide = Column(Integer, default=1)
    facings_high = Column(Integer, default=1)
    facings_deep = Column(Integer, default=1)

    shelf = relationship("Shelf", back_populates="positions")
    product = relationship("Product", back_populates="positions")
