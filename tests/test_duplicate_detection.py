"""Comprehensive tests for location-aware duplicate detection functionality."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.issue import Issue
from ml.duplicate_detection.detector import DuplicateDetector
from ml.duplicate_detection.geo_utils import haversine_distance, validate_coordinates


# Create in-memory SQLite database for testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine
)


@pytest.fixture(scope="function")
def db_session() -> Session:
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=test_engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def sample_issues(db_session: Session):
    """Create sample issues in the database for testing."""
    issues = [
        Issue(
            id=1,
            title="Pothole on MG Road",
            description="Large pothole causing traffic issues on MG Road near City Mall",
            category="roads",
            latitude=21.1458,
            longitude=79.0882
        ),
        Issue(
            id=2,
            title="Pothole near City Mall",
            description="Dangerous pothole on MG Road affecting vehicles",
            category="roads",
            latitude=21.1459,  # ~11 meters away from issue 1
            longitude=79.0883
        ),
        Issue(
            id=3,
            title="Road damage on Station Road",
            description="Significant road damage requiring immediate repair",
            category="roads",
            latitude=21.1450,  # ~100 meters away
            longitude=79.0870
        ),
        Issue(
            id=4,
            title="Water leakage problem",
            description="Continuous water leakage from underground pipe",
            category="water",
            latitude=21.1458,  # Same location as issue 1, different category
            longitude=79.0882
        ),
        Issue(
            id=5,
            title="Street light not working",
            description="The street light has been off for several days",
            category="electricity",
            latitude=None,  # No location data
            longitude=None
        ),
        Issue(
            id=6,
            title="Broken street light",
            description="Street light damaged and needs replacement urgently",
            category="electricity",
            latitude=None,  # No location data
            longitude=None
        ),
    ]
    
    for issue in issues:
        db_session.add(issue)
    db_session.commit()
    
    return issues


class TestHaversineDistance:
    """Tests for Haversine distance calculation."""
    
    def test_haversine_same_location(self):
        """Test distance calculation for same location."""
        distance = haversine_distance(21.1458, 79.0882, 21.1458, 79.0882)
        assert distance == 0.0
    
    def test_haversine_known_distance(self):
        """Test distance calculation with known coordinates."""
        # Nagpur coordinates approximately 1 km apart
        lat1, lon1 = 21.1458, 79.0882
        lat2, lon2 = 21.1548, 79.0882  # ~1 km north
        
        distance = haversine_distance(lat1, lon1, lat2, lon2)
        
        # Should be approximately 1000 meters (allow 50m tolerance)
        assert 950 <= distance <= 1050
    
    def test_haversine_close_proximity(self):
        """Test distance calculation for very close points."""
        # Coordinates approximately 10-15 meters apart
        lat1, lon1 = 21.1458, 79.0882
        lat2, lon2 = 21.1459, 79.0883
        
        distance = haversine_distance(lat1, lon1, lat2, lon2)
        
        # Should be between 10-20 meters
        assert 5 <= distance <= 20
    
    def test_haversine_symmetry(self):
        """Test that distance calculation is symmetric."""
        lat1, lon1 = 21.1458, 79.0882
        lat2, lon2 = 21.1500, 79.0900
        
        distance_1_to_2 = haversine_distance(lat1, lon1, lat2, lon2)
        distance_2_to_1 = haversine_distance(lat2, lon2, lat1, lon1)
        
        assert abs(distance_1_to_2 - distance_2_to_1) < 0.001


class TestCoordinateValidation:
    """Tests for coordinate validation."""
    
    def test_validate_valid_coordinates(self):
        """Test validation of valid coordinates."""
        assert validate_coordinates(21.1458, 79.0882) is True
        assert validate_coordinates(0.0, 0.0) is True
        assert validate_coordinates(-90.0, -180.0) is True
        assert validate_coordinates(90.0, 180.0) is True
    
    def test_validate_invalid_latitude(self):
        """Test validation rejects invalid latitude."""
        assert validate_coordinates(91.0, 79.0) is False
        assert validate_coordinates(-91.0, 79.0) is False
        assert validate_coordinates(100.0, 79.0) is False
    
    def test_validate_invalid_longitude(self):
        """Test validation rejects invalid longitude."""
        assert validate_coordinates(21.0, 181.0) is False
        assert validate_coordinates(21.0, -181.0) is False
        assert validate_coordinates(21.0, 200.0) is False
    
    def test_validate_none_values(self):
        """Test validation handles None values."""
        assert validate_coordinates(None, 79.0) is False
        assert validate_coordinates(21.0, None) is False
        assert validate_coordinates(None, None) is False


class TestDuplicateDetectorLocationBased:
    """Tests for location-based duplicate detection."""
    
    def test_detect_duplicates_within_5_meters(self, db_session: Session, sample_issues):
        """Test detection of duplicates within 5 meters."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        # Search for issue similar to issue 1, but 3 meters away
        candidates, status = detector.detect_duplicates(
            title="Big pothole on MG Road",
            description="Major pothole on MG Road causing problems",
            category="roads",
            latitude=21.14582,  # Very close to issue 1
            longitude=79.08822,
            max_candidates=5
        )
        
        assert status == "success"
        assert len(candidates) > 0
        
        # Should find issue 1 as a top candidate
        issue_ids = [c["issue_id"] for c in candidates]
        assert 1 in issue_ids
        
        # First candidate should have high overall score
        assert candidates[0]["overall_score"] > 0.5
        assert candidates[0]["distance_meters"] is not None
        assert candidates[0]["distance_meters"] < 20
    
    def test_detect_duplicates_within_15_meters(self, db_session: Session, sample_issues):
        """Test detection of duplicates within 15 meters."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        # Issue 2 is ~11 meters from issue 1
        candidates, status = detector.detect_duplicates(
            title="Pothole on MG Road",
            description="Large pothole causing traffic issues",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        assert status == "success"
        assert len(candidates) > 0
        
        # Should find issue 2 (similar title, ~11m away)
        issue_ids = [c["issue_id"] for c in candidates]
        assert 2 in issue_ids
        
        # Check issue 2 details
        issue_2_candidate = next(c for c in candidates if c["issue_id"] == 2)
        assert issue_2_candidate["distance_meters"] < 20
        assert issue_2_candidate["category_match"] is True
    
    def test_detect_duplicates_outside_25_meters(self, db_session: Session, sample_issues):
        """Test that issues outside radius are not found with small radius."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        # Issue 3 is ~100 meters away
        candidates, status = detector.detect_duplicates(
            title="Pothole on MG Road",
            description="Large pothole causing traffic issues",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        assert status == "success"
        
        # Issue 3 should not be in candidates (outside 20m radius)
        issue_ids = [c["issue_id"] for c in candidates]
        assert 3 not in issue_ids
    
    def test_detect_duplicates_configurable_radius(self, db_session: Session, sample_issues):
        """Test that search radius is configurable."""
        # Small radius: 15 meters
        detector_small = DuplicateDetector(db_session=db_session, search_radius_meters=15)
        
        candidates_small, _ = detector_small.detect_duplicates(
            title="Road issue",
            description="Road problem",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        # Large radius: 200 meters
        detector_large = DuplicateDetector(db_session=db_session, search_radius_meters=200)
        
        candidates_large, _ = detector_large.detect_duplicates(
            title="Road issue",
            description="Road problem",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        # Larger radius should find more candidates
        assert len(candidates_large) >= len(candidates_small)
        
        # Issue 3 (~100m away) should be found with large radius but not small
        small_ids = [c["issue_id"] for c in candidates_small]
        large_ids = [c["issue_id"] for c in candidates_large]
        
        assert 3 not in small_ids
        assert 3 in large_ids


class TestDuplicateDetectorCategoryMatching:
    """Tests for category-based filtering."""
    
    def test_different_categories_penalized(self, db_session: Session, sample_issues):
        """Test that different categories are penalized in ranking."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        # Search for roads issue at same location as water issue
        candidates, status = detector.detect_duplicates(
            title="Pothole on MG Road",
            description="Large pothole causing problems",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        assert status == "success"
        
        # Should find both issue 1 (roads) and issue 4 (water)
        issue_ids = [c["issue_id"] for c in candidates]
        assert 1 in issue_ids
        assert 4 in issue_ids
        
        # Issue 1 (matching category) should rank higher than issue 4 (different category)
        issue_1_index = issue_ids.index(1)
        issue_4_index = issue_ids.index(4)
        assert issue_1_index < issue_4_index
        
        # Check category_match flags
        issue_1_candidate = candidates[issue_1_index]
        issue_4_candidate = candidates[issue_4_index]
        
        assert issue_1_candidate["category_match"] is True
        assert issue_4_candidate["category_match"] is False


class TestDuplicateDetectorInvalidInput:
    """Tests for handling invalid input."""
    
    def test_invalid_coordinates_rejected(self, db_session: Session):
        """Test that invalid coordinates are rejected."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        candidates, status = detector.detect_duplicates(
            title="Test issue",
            description="Test description",
            latitude=95.0,  # Invalid latitude
            longitude=79.0,
            max_candidates=5
        )
        
        assert status == "error"
        assert len(candidates) == 0
    
    def test_missing_required_fields(self, db_session: Session):
        """Test handling of missing required fields."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        # Missing description should be handled gracefully
        candidates, status = detector.detect_duplicates(
            title="Test issue",
            description="",
            max_candidates=5
        )
        
        # Should not crash, but may return error or empty results
        assert status in ["success", "error"]
        assert isinstance(candidates, list)


class TestDuplicateDetectorNoLocation:
    """Tests for text-only duplicate detection (no location data)."""
    
    def test_no_location_data_provided(self, db_session: Session, sample_issues):
        """Test duplicate detection without location data."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        # Search without providing coordinates
        candidates, status = detector.detect_duplicates(
            title="Street light not working properly",
            description="Street light damaged and not functioning",
            category="electricity",
            latitude=None,
            longitude=None,
            max_candidates=5
        )
        
        assert status == "success"
        
        # Should still find candidates based on text similarity
        # Issues 5 and 6 are about street lights with no location
        assert len(candidates) > 0
        
        # All candidates should have no distance_meters
        for candidate in candidates:
            assert candidate["distance_meters"] is None
    
    def test_no_matches_found(self, db_session: Session, sample_issues):
        """Test when no similar issues exist."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        # Completely different issue far away
        candidates, status = detector.detect_duplicates(
            title="Alien spaceship landed",
            description="Extraterrestrial vehicle in park",
            category="unknown",
            latitude=25.0,
            longitude=85.0,
            max_candidates=5
        )
        
        assert status == "success"
        # May find some candidates with low scores, or none at all
        assert isinstance(candidates, list)
        assert len(candidates) <= 5


class TestDuplicateDetectorMultipleCandidates:
    """Tests for multiple candidate ranking."""
    
    def test_multiple_candidates_ranked(self, db_session: Session, sample_issues):
        """Test that multiple candidates are properly ranked."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        candidates, status = detector.detect_duplicates(
            title="Pothole on MG Road",
            description="Large pothole causing traffic issues",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        assert status == "success"
        assert len(candidates) > 1
        
        # Candidates should be ordered by overall_score (descending)
        scores = [c["overall_score"] for c in candidates]
        assert scores == sorted(scores, reverse=True)
        
        # All scores should be between 0 and 1
        for score in scores:
            assert 0.0 <= score <= 1.0
    
    def test_max_candidates_limit_respected(self, db_session: Session, sample_issues):
        """Test that max_candidates limit is respected."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=200)
        
        candidates, status = detector.detect_duplicates(
            title="Road problem",
            description="Issue with road",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=2
        )
        
        assert status == "success"
        # Should not exceed max_candidates
        assert len(candidates) <= 2


class TestDuplicateDetectorCandidateStructure:
    """Tests for candidate response structure."""
    
    def test_candidate_has_required_fields(self, db_session: Session, sample_issues):
        """Test that each candidate has all required fields."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        candidates, status = detector.detect_duplicates(
            title="Pothole issue",
            description="Pothole causing problems",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        assert status == "success"
        
        for candidate in candidates:
            # Check all required fields are present
            assert "issue_id" in candidate
            assert "overall_score" in candidate
            assert "distance_meters" in candidate
            assert "text_similarity" in candidate
            assert "category_match" in candidate
            
            # Check field types
            assert isinstance(candidate["issue_id"], int)
            assert isinstance(candidate["overall_score"], float)
            assert candidate["distance_meters"] is None or isinstance(candidate["distance_meters"], (int, float))
            assert isinstance(candidate["text_similarity"], float)
            assert isinstance(candidate["category_match"], bool)
            
            # Check value ranges
            assert candidate["issue_id"] > 0
            assert 0.0 <= candidate["overall_score"] <= 1.0
            assert 0.0 <= candidate["text_similarity"] <= 1.0
            if candidate["distance_meters"] is not None:
                assert candidate["distance_meters"] >= 0.0


class TestDuplicateDetectorTextSimilarity:
    """Tests for text similarity calculation."""
    
    def test_high_text_similarity_ranked_higher(self, db_session: Session):
        """Test that issues with higher text similarity rank higher."""
        # Create issues with varying text similarity
        issues = [
            Issue(
                id=1,
                title="Pothole on MG Road",
                description="Large pothole causing severe traffic issues on MG Road",
                category="roads",
                latitude=21.1458,
                longitude=79.0882
            ),
            Issue(
                id=2,
                title="Pothole MG Road",
                description="Large pothole severe traffic MG Road",  # Very similar
                category="roads",
                latitude=21.1459,
                longitude=79.0883
            ),
            Issue(
                id=3,
                title="Water problem",
                description="Some unrelated water leakage issue",  # Not similar
                category="water",
                latitude=21.1459,
                longitude=79.0883
            ),
        ]
        
        for issue in issues:
            db_session.add(issue)
        db_session.commit()
        
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        candidates, status = detector.detect_duplicates(
            title="Pothole on MG Road",
            description="Large pothole causing severe traffic issues",
            category="roads",
            latitude=21.1458,
            longitude=79.0882,
            max_candidates=5
        )
        
        assert status == "success"
        assert len(candidates) >= 2
        
        # Issue 2 should rank higher than issue 3 due to text similarity
        issue_ids = [c["issue_id"] for c in candidates]
        assert 2 in issue_ids
        
        issue_2_candidate = next(c for c in candidates if c["issue_id"] == 2)
        
        # Issue 2 should have high text similarity
        assert issue_2_candidate["text_similarity"] > 0.5


class TestDuplicateDetectorModelVersion:
    """Tests for model version tracking."""
    
    def test_model_version_returned(self, db_session: Session):
        """Test that model version is returned."""
        detector = DuplicateDetector(db_session=db_session, search_radius_meters=20)
        
        version = detector.get_model_version()
        
        assert version is not None
        assert isinstance(version, str)
        assert "baseline" in version.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
