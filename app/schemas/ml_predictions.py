"""Pydantic schemas for ML prediction responses."""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class ClassificationPrediction(BaseModel):
    """Schema for issue category classification prediction."""
    
    predicted_category: Optional[str] = Field(
        None,
        description="Predicted category (roads, water, sanitation, etc.)"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Prediction confidence score (0-1)"
    )
    model_version: Optional[str] = Field(
        None,
        description="Version identifier of the model used"
    )
    status: Literal["success", "model_unavailable", "error"] = Field(
        ...,
        description="Prediction status"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "predicted_category": "road_damage",
                    "confidence": 0.0,
                    "model_version": "ollama-qwen2.5:3b",
                    "status": "success"
                },
                {
                    "predicted_category": None,
                    "confidence": 0.0,
                    "model_version": "ollama-qwen2.5:3b",
                    "status": "model_unavailable"
                }
            ]
        }
    }


class SeverityPrediction(BaseModel):
    """Schema for issue severity prediction."""
    
    predicted_severity: Optional[str] = Field(
        None,
        description="Predicted severity level (low, medium, high, critical)"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Prediction confidence score (0-1)"
    )
    model_version: Optional[str] = Field(
        None,
        description="Version identifier of the model used"
    )
    status: Literal["success", "model_unavailable", "error"] = Field(
        ...,
        description="Prediction status"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "predicted_severity": "high",
                    "confidence": 0.92,
                    "model_version": "v1.0.0",
                    "status": "success"
                },
                {
                    "predicted_severity": None,
                    "confidence": 0.0,
                    "model_version": None,
                    "status": "model_unavailable"
                }
            ]
        }
    }


class DuplicateCandidate(BaseModel):
    """Schema for a single duplicate candidate."""
    
    issue_id: int = Field(
        ...,
        gt=0,
        description="ID of the potential duplicate issue"
    )
    similarity_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall similarity score (0-1) - heuristic combination"
    )
    distance_meters: Optional[float] = Field(
        None,
        ge=0.0,
        description="Geographic distance in meters (null if no location data)"
    )
    text_similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Text similarity score (0-1) based on TF-IDF cosine similarity"
    )
    category_match: bool = Field(
        ...,
        description="Whether the candidate has the same category"
    )


class DuplicateDetection(BaseModel):
    """Schema for duplicate issue detection."""
    
    candidates: List[DuplicateCandidate] = Field(
        default_factory=list,
        description="List of potential duplicate issues, ranked by similarity"
    )
    search_radius_meters: Optional[float] = Field(
        None,
        ge=0.0,
        description="Search radius used for geographic filtering (null if no location data)"
    )
    model_version: Optional[str] = Field(
        None,
        description="Version identifier of the detection algorithm used"
    )
    status: Literal["success", "model_unavailable", "error"] = Field(
        ...,
        description="Detection status"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "candidates": [
                        {
                            "issue_id": 42,
                            "similarity_score": 0.88,
                            "distance_meters": 8.5,
                            "text_similarity": 0.92,
                            "category_match": True
                        },
                        {
                            "issue_id": 17,
                            "similarity_score": 0.76,
                            "distance_meters": 15.2,
                            "text_similarity": 0.81,
                            "category_match": True
                        }
                    ],
                    "search_radius_meters": 20.0,
                    "model_version": "baseline-v1.0.0",
                    "status": "success"
                },
                {
                    "candidates": [],
                    "search_radius_meters": None,
                    "model_version": None,
                    "status": "model_unavailable"
                }
            ]
        }
    }


# Request schemas for ML endpoints
class ClassifyRequest(BaseModel):
    """Request schema for classification endpoint."""
    
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Issue title"
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Issue description"
    )


class PredictSeverityRequest(BaseModel):
    """Request schema for severity prediction endpoint."""
    
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Issue title"
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Issue description"
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Issue category (if known)"
    )


class DetectDuplicatesRequest(BaseModel):
    """Request schema for duplicate detection endpoint."""
    
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Issue title"
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Issue description"
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Issue category for matching"
    )
    latitude: Optional[float] = Field(
        None,
        ge=-90.0,
        le=90.0,
        description="Issue latitude"
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180.0,
        le=180.0,
        description="Issue longitude"
    )
    max_candidates: int = Field(
        5,
        ge=1,
        le=20,
        description="Maximum number of duplicate candidates to return"
    )
