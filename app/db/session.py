"""Database session management and connection handling.

This module configures the SQLAlchemy engine and session factory
using SQLAlchemy 2.x conventions with Psycopg 3.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings


# Create SQLAlchemy engine with Psycopg 3
# Using pool_pre_ping to verify connections before use
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.is_development,  # Log SQL queries in development
)

# Create session factory
# autocommit=False: Don't commit automatically
# autoflush=False: Don't flush automatically
# bind=engine: Bind to our database engine
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a database session.
    
    Yields a database session and ensures it is closed after use,
    even if an exception occurs.
    
    Usage in FastAPI endpoints:
        @app.get("/endpoint")
        def endpoint(db: Session = Depends(get_db)):
            # Use db session here
            pass
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
