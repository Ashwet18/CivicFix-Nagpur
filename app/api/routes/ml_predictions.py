"""API routes for ML predictions."""

from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session
from app.schemas.ml_predictions import (
    ClassificationPrediction,
    SeverityPrediction,
    DuplicateDetection,
    DuplicateCandidate,
    ClassifyRequest,
    PredictSeverityRequest,
    DetectDuplicatesRequest
)
from app.db.session import get_db
from app.core.config import settings
from ml.classification.predictor import get_classification_predictor
from ml.severity.predictor import get_severity_predictor
from ml.duplicate_detection.detector import DuplicateDetector

router = APIRouter(prefix="/api/v1/ml", tags=["ml-predictions"])


@router.post(
    "/classify",
    response_model=ClassificationPrediction,
    status_code=status.HTTP_200_OK,
    summary="Classify issue category",
    description=(
        "Predicts the category of a civic issue based on title and description. "
        "Returns model_unavailable status if no trained model is loaded."
    )
)
def classify_issue(request: ClassifyRequest) -> ClassificationPrediction:
    """
    Classify an issue into a category using AI.
    
    Args:
        request: Classification request with title and description
        
    Returns:
        ClassificationPrediction with predicted category or unavailable status
    """
    predictor = get_classification_predictor(
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_model=settings.OLLAMA_MODEL,
        ollama_timeout=settings.OLLAMA_TIMEOUT,
    )
    
    predicted_category, confidence, pred_status = predictor.predict(
        title=request.title,
        description=request.description
    )
    
    return ClassificationPrediction(
        predicted_category=predicted_category,
        confidence=confidence,
        model_version=predictor.get_model_version(),
        status=pred_status
    )


@router.post(
    "/predict-severity",
    response_model=SeverityPrediction,
    status_code=status.HTTP_200_OK,
    summary="Predict issue severity",
    description=(
        "Predicts the severity level of a civic issue based on title, description, "
        "and optionally category. Returns model_unavailable status if no trained model is loaded."
    )
)
def predict_severity(request: PredictSeverityRequest) -> SeverityPrediction:
    """
    Predict the severity of an issue using ML.
    
    Args:
        request: Severity prediction request
        
    Returns:
        SeverityPrediction with predicted severity or unavailable status
    """
    predictor = get_severity_predictor()
    
    predicted_severity, confidence, pred_status = predictor.predict(
        title=request.title,
        description=request.description,
        category=request.category
    )
    
    return SeverityPrediction(
        predicted_severity=predicted_severity,
        confidence=confidence,
        model_version=predictor.get_model_version(),
        status=pred_status
    )


@router.post(
    "/detect-duplicates",
    response_model=DuplicateDetection,
    status_code=status.HTTP_200_OK,
    summary="Detect duplicate issues",
    description=(
        "Finds potential duplicate issues using location-aware detection combining "
        "geographic proximity (Haversine distance), text similarity (TF-IDF), and "
        "category matching. Returns detailed candidate information including distance, "
        "text similarity scores, and category match status."
    )
)
def detect_duplicates(
    request: DetectDuplicatesRequest,
    db: Session = Depends(get_db)
) -> DuplicateDetection:
    """
    Detect potential duplicate issues using location-aware detection.
    
    Combines three signals:
    - Geographic proximity (if location provided)
    - Text similarity using TF-IDF
    - Category matching (if category provided)
    
    Args:
        request: Duplicate detection request with title, description, optional location and category
        db: Database session (injected)
        
    Returns:
        DuplicateDetection with detailed candidate information or unavailable status
    """
    # Get search radius from config
    search_radius = settings.DUPLICATE_SEARCH_RADIUS_METERS
    
    # Create detector instance with database session
    detector = DuplicateDetector(db_session=db, search_radius_meters=search_radius)
    
    # Detect duplicates
    candidates_raw, det_status = detector.detect_duplicates(
        title=request.title,
        description=request.description,
        category=request.category,
        latitude=request.latitude,
        longitude=request.longitude,
        max_candidates=request.max_candidates
    )
    
    # Convert raw dictionaries to DuplicateCandidate objects
    candidates = [
        DuplicateCandidate(
            issue_id=candidate["issue_id"],
            similarity_score=candidate["overall_score"],
            distance_meters=candidate.get("distance_meters"),
            text_similarity=candidate["text_similarity"],
            category_match=candidate["category_match"]
        )
        for candidate in candidates_raw
    ]
    
    # Determine search radius for response (None if no location data)
    response_search_radius = search_radius if (request.latitude is not None and request.longitude is not None) else None
    
    return DuplicateDetection(
        candidates=candidates,
        search_radius_meters=response_search_radius,
        model_version=detector.get_model_version(),
        status=det_status
    )
