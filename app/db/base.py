"""SQLAlchemy declarative base and model imports.

This module defines the declarative base for all ORM models
and imports all models to ensure they are registered with SQLAlchemy
for Alembic migrations.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


# Import all models here to ensure they are registered with SQLAlchemy
# This is required for Alembic to detect and generate migrations
def import_models() -> None:
    """Import all models to register them with SQLAlchemy.
    
    This function should be called before running Alembic migrations
    or creating tables with Base.metadata.create_all().
    """
    from app.models.issue import Issue  # noqa: F401
