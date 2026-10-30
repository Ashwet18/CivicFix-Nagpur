"""Pydantic schemas for Issue API endpoints."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class IssueCreate(BaseModel):
    """Schema for creating a new issue."""
    
    title: str = Field(
        ...,
        min_length=5,
        max_length=150,
        description="Issue title (5-150 characters)"
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Detailed description of the issue (10-5000 characters)"
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Issue category (e.g., roads, water, sanitation)"
    )
    severity: Optional[str] = Field(
        None,
        max_length=50,
        description="Issue severity level"
    )
    latitude: Optional[float] = Field(
        None,
        ge=-90.0,
        le=90.0,
        description="Latitude coordinate (-90 to 90)"
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180.0,
        le=180.0,
        description="Longitude coordinate (-180 to 180)"
    )
    image_url: Optional[str] = Field(
        None,
        max_length=500,
        description="URL reference to issue image"
    )

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_and_normalize_text(cls, value: object) -> object:
        """Normalize whitespace in text fields to avoid inconsistent inputs."""
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("category", "severity", mode="before")
    @classmethod
    def normalize_optional_strings(cls, value: object) -> object:
        """Trim optional string values and treat blank strings as unset."""
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return None if not normalized else normalized.lower()
        return value

    @field_validator("image_url", mode="before")
    @classmethod
    def normalize_image_url(cls, value: object) -> object:
        """Trim image URLs and treat blank values as unset."""
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return None if not normalized else normalized
        return value
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Pothole on Main Street",
                    "description": "Large pothole near traffic light causing vehicle damage",
                    "category": "road_damage",
                    "severity": "high",
                    "latitude": 21.1458,
                    "longitude": 79.0882
                }
            ]
        }
    }


class IssueUpdate(BaseModel):
    """Schema for partially updating an issue."""
    
    title: Optional[str] = Field(
        None,
        min_length=5,
        max_length=150,
        description="Updated issue title"
    )
    description: Optional[str] = Field(
        None,
        min_length=10,
        max_length=5000,
        description="Updated description"
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Updated category"
    )
    severity: Optional[str] = Field(
        None,
        max_length=50,
        description="Updated severity"
    )
    latitude: Optional[float] = Field(
        None,
        ge=-90.0,
        le=90.0,
        description="Updated latitude"
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180.0,
        le=180.0,
        description="Updated longitude"
    )
    image_url: Optional[str] = Field(
        None,
        max_length=500,
        description="Updated image URL"
    )

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_text_fields(cls, value: object) -> object:
        """Normalize whitespace in text fields to avoid inconsistent inputs."""
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("category", "severity", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        """Trim optional string values and treat blank strings as unset."""
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return None if not normalized else normalized.lower()
        return value

    @field_validator("image_url", mode="before")
    @classmethod
    def normalize_image_url(cls, value: object) -> object:
        """Trim image URLs and treat blank values as unset."""
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return None if not normalized else normalized
        return value


class IssueStatusUpdate(BaseModel):
    """Schema for updating issue status."""
    
    status: str = Field(
        ...,
        description="New status value"
    )
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate and normalize status value."""
        allowed_statuses = {
            'reported', 'acknowledged', 'in_progress', 
            'resolved', 'rejected'
        }
        normalized = v.lower().strip()
        if normalized not in allowed_statuses:
            raise ValueError(
                f"Invalid status. Must be one of: {', '.join(sorted(allowed_statuses))}"
            )
        return normalized
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {"status": "acknowledged"},
                {"status": "in_progress"}
            ]
        }
    }


class IssueResponse(BaseModel):
    """Schema for issue response."""
    
    id: int
    title: str
    description: str
    status: str
    category: Optional[str] = None
    severity: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "title": "Pothole on Main Street",
                    "description": "Large pothole near traffic light causing vehicle damage",
                    "status": "reported",
                    "category": "road_damage",
                    "severity": "high",
                    "latitude": 21.1458,
                    "longitude": 79.0882,
                    "image_url": None,
                    "created_at": "2024-01-01T10:00:00",
                    "updated_at": "2024-01-01T10:00:00"
                }
            ]
        }
    }


class IssueListResponse(BaseModel):
    """Schema for paginated issue list response."""
    
    items: List[IssueResponse]
    total: int = Field(..., description="Total number of issues matching filters")
    skip: int = Field(..., description="Number of items skipped")
    limit: int = Field(..., description="Maximum number of items returned")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "items": [
                        {
                            "id": 1,
                            "title": "Pothole on Main Street",
                            "description": "Large pothole near traffic light",
                            "status": "reported",
                            "category": "road_damage",
                            "severity": "high",
                            "latitude": 21.1458,
                            "longitude": 79.0882,
                            "image_url": None,
                            "created_at": "2024-01-01T10:00:00",
                            "updated_at": "2024-01-01T10:00:00"
                        }
                    ],
                    "total": 1,
                    "skip": 0,
                    "limit": 20
                }
            ]
        }
    }
