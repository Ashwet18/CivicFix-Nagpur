"""Pydantic schemas for request/response validation."""

from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueStatusUpdate,
    IssueResponse,
    IssueListResponse
)
from app.schemas.ml_predictions import (
    ClassificationPrediction,
    SeverityPrediction,
    DuplicateDetection,
    DuplicateCandidate,
    ClassifyRequest,
    PredictSeverityRequest,
    DetectDuplicatesRequest
)

__all__ = [
    "IssueCreate",
    "IssueUpdate",
    "IssueStatusUpdate",
    "IssueResponse",
    "IssueListResponse",
    "ClassificationPrediction",
    "SeverityPrediction",
    "DuplicateDetection",
    "DuplicateCandidate",
    "ClassifyRequest",
    "PredictSeverityRequest",
    "DetectDuplicatesRequest"
]
