"""Issue model for civic issue reporting."""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Issue(Base):
    """Model representing a civic issue report.
    
    This model stores information about civic issues reported by citizens,
    including location data, categorization, severity, and status tracking.
    """
    
    __tablename__ = "issues"
    
    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Required fields
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="reported",
        server_default="reported",
        index=True
    )
    
    # Optional classification fields
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    
    # Location fields (using Numeric for precise coordinates)
    latitude: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=10, scale=8),
        nullable=True
    )
    longitude: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=11, scale=8),
        nullable=True
    )
    
    # Image storage (URL reference)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Timestamps with timezone awareness
    # server_default uses PostgreSQL's timezone function
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    
    def __repr__(self) -> str:
        """String representation of Issue model."""
        return (
            f"<Issue(id={self.id}, title='{self.title}', "
            f"status='{self.status}', category='{self.category}')>"
        )
