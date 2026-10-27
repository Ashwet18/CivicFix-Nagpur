"""Duplicate issue detection interface."""

from typing import Optional, List, Tuple, Dict
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import select

from ml.duplicate_detection.geo_utils import haversine_distance, validate_coordinates
from app.core.config import settings


class DuplicateDetector:
    """Location-aware duplicate issue detection using geographic proximity and text similarity.
    
    This implementation uses a rule-based approach combining:
    1. Geographic distance (Haversine formula)
    2. Text similarity (TF-IDF with cosine similarity)
    3. Category agreement (when available)
    
    This is a baseline heuristic implementation, not a trained ML model.
    """
    
    def __init__(
        self,
        search_radius_meters: Optional[int] = None,
        db_session: Optional[Session] = None
    ):
        """Initialize the duplicate detector.
        
        Args:
            search_radius_meters: Geographic search radius in meters (uses config default if None)
            db_session: Database session for querying existing issues
        """
        self.search_radius_meters = (
            search_radius_meters if search_radius_meters is not None
            else settings.DUPLICATE_SEARCH_RADIUS_METERS
        )
        self.db_session = db_session
        self.model_version = "baseline-v1.0.0"
        
        # Initialize text similarity components
        self._tfidf_vectorizer = None
        self._initialize_text_similarity()
    
    def _initialize_text_similarity(self) -> None:
        """Initialize TF-IDF vectorizer for text similarity."""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            
            self._tfidf_vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2),
                lowercase=True
            )
            self._cosine_similarity = cosine_similarity
        except ImportError:
            print("Warning: scikit-learn not available, text similarity disabled")
            self._tfidf_vectorizer = None
    
    def is_available(self) -> bool:
        """Check if duplicate detection is available.
        
        Returns:
            bool: True if detector is ready (always True for this baseline)
        """
        return True
    
    def detect_duplicates(
        self,
        title: str,
        description: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        category: Optional[str] = None,
        max_candidates: int = 5,
        exclude_issue_id: Optional[int] = None
    ) -> Tuple[List[Dict], str]:
        """Detect potential duplicate issues using location and text similarity.
        
        Args:
            title: Issue title
            description: Issue description
            latitude: Issue latitude (required for location-based matching)
            longitude: Issue longitude (required for location-based matching)
            category: Issue category (optional, helps ranking)
            max_candidates: Maximum number of candidates to return
            exclude_issue_id: Issue ID to exclude (when searching for duplicates of existing issue)
            
        Returns:
            Tuple of (candidates, status)
            - candidates: List of dicts with issue_id, distance_meters, text_similarity, 
                         category_match, and overall_score
            - status: "success" or "error"
        """
        if self.db_session is None:
            return [], "error"
        
        try:
            # Import here to avoid circular dependency
            from app.models.issue import Issue
            
            # Check if coordinates are explicitly provided but invalid
            coords_provided = (latitude is not None or longitude is not None)
            if coords_provided and not validate_coordinates(latitude, longitude):
                # Invalid coordinates explicitly provided - return error
                return [], "error"
            
            candidates = []
            
            # Step 1: Find geographically nearby issues
            if validate_coordinates(latitude, longitude):
                nearby_issues = self._find_nearby_issues(
                    latitude, longitude, exclude_issue_id
                )
                
                if not nearby_issues:
                    return [], "success"
                
                # Step 2: Calculate text similarity for nearby issues
                candidates = self._rank_candidates(
                    title, description, category, nearby_issues
                )
                
                # Step 3: Return top candidates
                candidates = candidates[:max_candidates]
            else:
                # No location provided - try text-only matching (limited results)
                if self._tfidf_vectorizer is not None:
                    text_candidates = self._find_by_text_only(
                        title, description, category, max_candidates, exclude_issue_id
                    )
                    candidates = text_candidates
            
            return candidates, "success"
            
        except Exception as e:
            print(f"Duplicate detection error: {e}")
            import traceback
            traceback.print_exc()
            return [], "error"
    
    def _find_nearby_issues(
        self,
        latitude: float,
        longitude: float,
        exclude_issue_id: Optional[int]
    ) -> List[Tuple]:
        """Find issues within the configured search radius.
        
        Args:
            latitude: Search center latitude
            longitude: Search center longitude
            exclude_issue_id: Issue ID to exclude
            
        Returns:
            List of (Issue, distance_meters) tuples
        """
        from app.models.issue import Issue
        
        # Query all issues with valid coordinates
        query = select(Issue).where(
            Issue.latitude.isnot(None),
            Issue.longitude.isnot(None)
        )
        
        if exclude_issue_id is not None:
            query = query.where(Issue.id != exclude_issue_id)
        
        all_issues = self.db_session.execute(query).scalars().all()
        
        # Calculate distances and filter by radius
        nearby = []
        for issue in all_issues:
            try:
                distance = haversine_distance(
                    latitude, longitude,
                    float(issue.latitude), float(issue.longitude)
                )
                
                if distance <= self.search_radius_meters:
                    nearby.append((issue, distance))
            except (ValueError, TypeError):
                continue
        
        return nearby
    
    def _rank_candidates(
        self,
        title: str,
        description: str,
        category: Optional[str],
        nearby_issues: List[Tuple]
    ) -> List[Dict]:
        """Rank candidate duplicates by combining multiple signals.
        
        Args:
            title: Query issue title
            description: Query issue description
            category: Query issue category
            nearby_issues: List of (Issue, distance) tuples
            
        Returns:
            List of candidate dicts with scores, sorted by overall_score descending
        """
        query_text = f"{title} {description}"
        
        candidates = []
        
        for issue, distance in nearby_issues:
            candidate = {
                'issue_id': issue.id,
                'distance_meters': round(distance, 2),
                'text_similarity': 0.0,
                'category_match': False,
                'overall_score': 0.0
            }
            
            # Calculate text similarity
            if self._tfidf_vectorizer is not None:
                issue_text = f"{issue.title} {issue.description}"
                try:
                    vectors = self._tfidf_vectorizer.fit_transform([query_text, issue_text])
                    similarity = self._cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
                    candidate['text_similarity'] = round(float(similarity), 3)
                except Exception:
                    candidate['text_similarity'] = 0.0
            
            # Check category match
            if category and issue.category:
                candidate['category_match'] = (category.lower() == issue.category.lower())
            
            # Calculate overall score (heuristic weighted combination)
            # - Closer is better (inverse distance factor)
            # - Higher text similarity is better
            # - Category match gives a boost
            distance_score = max(0, 1 - (distance / self.search_radius_meters))
            text_score = candidate['text_similarity']
            category_score = 1.0 if candidate['category_match'] else 0.0
            
            # Weighted combination: 40% distance, 50% text, 10% category
            overall = (0.4 * distance_score + 
                      0.5 * text_score + 
                      0.1 * category_score)
            
            candidate['overall_score'] = round(overall, 3)
            candidates.append(candidate)
        
        # Sort by overall score descending
        candidates.sort(key=lambda x: x['overall_score'], reverse=True)
        
        return candidates
    
    def _find_by_text_only(
        self,
        title: str,
        description: str,
        category: Optional[str],
        max_candidates: int,
        exclude_issue_id: Optional[int]
    ) -> List[Dict]:
        """Find similar issues using text similarity only (no location).
        
        This is a fallback when location is not provided.
        Results are less reliable than location-aware detection.
        
        Args:
            title: Issue title
            description: Issue description
            category: Issue category
            max_candidates: Maximum results
            exclude_issue_id: Issue ID to exclude
            
        Returns:
            List of candidate dicts
        """
        from app.models.issue import Issue
        
        # Query issues, optionally filtering by category
        query = select(Issue)
        
        if category:
            query = query.where(Issue.category == category)
        
        if exclude_issue_id is not None:
            query = query.where(Issue.id != exclude_issue_id)
        
        # Limit query to avoid processing too many
        query = query.limit(100)
        
        issues = self.db_session.execute(query).scalars().all()
        
        if not issues:
            return []
        
        # Calculate text similarity
        query_text = f"{title} {description}"
        texts = [query_text] + [f"{issue.title} {issue.description}" for issue in issues]
        
        try:
            vectors = self._tfidf_vectorizer.fit_transform(texts)
            similarities = self._cosine_similarity(vectors[0:1], vectors[1:])[0]
            
            candidates = []
            for idx, (issue, similarity) in enumerate(zip(issues, similarities)):
                if similarity > 0.3:  # Minimum threshold for text-only
                    candidates.append({
                        'issue_id': issue.id,
                        'distance_meters': None,
                        'text_similarity': round(float(similarity), 3),
                        'category_match': bool(category and issue.category and 
                                              category.lower() == issue.category.lower()),
                        'overall_score': round(float(similarity), 3)
                    })
            
            # Sort by similarity
            candidates.sort(key=lambda x: x['overall_score'], reverse=True)
            return candidates[:max_candidates]
            
        except Exception as e:
            print(f"Text-only search error: {e}")
            return []
    
    def get_model_version(self) -> Optional[str]:
        """Get the version identifier.
        
        Returns:
            str: Version identifier indicating this is a baseline heuristic
        """
        return self.model_version


# Global detector instance
_detector: Optional[DuplicateDetector] = None


def get_duplicate_detector(
    search_radius_meters: Optional[int] = None,
    db_session: Optional[Session] = None
) -> DuplicateDetector:
    """Get or create the duplicate detector instance.
    
    Args:
        search_radius_meters: Optional custom search radius
        db_session: Database session for querying
        
    Returns:
        DuplicateDetector: The detector instance
    """
    # Note: We create a new instance each time to allow custom radius and session
    # This is appropriate for this baseline implementation
    return DuplicateDetector(
        search_radius_meters=search_radius_meters,
        db_session=db_session
    )

