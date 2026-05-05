from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base
import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(String, default="viewer")  # admin, editor, viewer

    comments = relationship("Comment", back_populates="user")
    workflows = relationship("WorkflowState", back_populates="user")


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(Integer, ForeignKey("positions.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    text = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    position = relationship("Position", back_populates="comments")
    user = relationship("User", back_populates="comments")


class WorkflowState(Base):
    __tablename__ = "workflow_states"
    id = Column(Integer, primary_key=True, index=True)
    fixture_id = Column(Integer, ForeignKey("fixtures.id"), unique=True)
    # Draft, Review, Approved, Published
    status = Column(String, default="Draft")
    updated_by = Column(Integer, ForeignKey("users.id"))
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    fixture = relationship("Fixture", back_populates="workflow")
    user = relationship("User", back_populates="workflows")


class Fixture(Base):
    __tablename__ = "fixtures"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String, default="Gondola")
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    width = Column(Float)
    height = Column(Float)
    depth = Column(Float)
    base_height = Column(Float)
    number_of_shelves = Column(Integer)

    shelves = relationship("Shelf", back_populates="fixture")
    store = relationship("Store", back_populates="fixtures")
    workflow = relationship(
        "WorkflowState", back_populates="fixture", uselist=False)


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
    category = Column(String, default="General")
    width = Column(Float)
    height = Column(Float)
    depth = Column(Float)
    color_hex = Column(String)
    image_url = Column(String, nullable=True)

    performance = relationship(
        "PerformanceData", back_populates="product", uselist=False)
    positions = relationship("Position", back_populates="product")


class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    region = Column(String, nullable=True)

    fixtures = relationship("Fixture", back_populates="store")


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
    comments = relationship("Comment", back_populates="position")
