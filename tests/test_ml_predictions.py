"""Tests for ML prediction endpoints."""

import pytest

# ---------------------------------------------------------------------------
# All DB wiring comes from the shared conftest.py.
# ---------------------------------------------------------------------------
from tests.conftest import client  # noqa: F401


class TestClassifyEndpoint:
    """Tests for POST /api/v1/ml/classify endpoint."""
    
    def test_classify_returns_model_unavailable_status(self):
        """Test that classification returns model_unavailable when Ollama is not reachable.

        Mocks the Ollama availability check so this test is environment-independent
        (passes whether or not a real Ollama server is running).
        """
        from unittest.mock import patch
        from ml.classification.ai_service import OllamaClassificationService

        request_data = {
            "title": "Broken street light on MG Road",
            "description": "The street light near City Mall has been broken for 3 days"
        }

        # Simulate Ollama being unreachable by making classify() return service_unavailable
        with patch.object(
            OllamaClassificationService,
            "classify",
            return_value=(None, None, "service_unavailable"),
        ):
            response = client.post("/api/v1/ml/classify", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "model_unavailable"
        assert data["predicted_category"] is None
        assert data["confidence"] == 0.0
        assert data["model_version"] is not None
        assert "ollama" in data["model_version"]
    
    def test_classify_validates_request_schema(self):
        """Test that classification validates request schema."""
        # Missing title
        response = client.post("/api/v1/ml/classify", json={
            "description": "Some description"
        })
        assert response.status_code == 422
        
        # Missing description
        response = client.post("/api/v1/ml/classify", json={
            "title": "Some title"
        })
        assert response.status_code == 422
        
        # Empty strings
        response = client.post("/api/v1/ml/classify", json={
            "title": "",
            "description": "Some description"
        })
        assert response.status_code == 422
    
    def test_classify_response_structure(self):
        """Test that classification response has correct structure."""
        request_data = {
            "title": "Water leakage issue",
            "description": "Continuous water leakage from underground pipe on Station Road"
        }
        
        response = client.post("/api/v1/ml/classify", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields are present
        assert "predicted_category" in data
        assert "confidence" in data
        assert "model_version" in data
        assert "status" in data
        
        # Check confidence is in valid range
        assert 0.0 <= data["confidence"] <= 1.0
        
        # Check status is valid
        assert data["status"] in ["success", "model_unavailable", "error"]
    
    def test_classify_does_not_return_fake_predictions(self):
        """Test that endpoint never returns fake predictions when model is unavailable."""
        request_data = {
            "title": "Pothole on highway",
            "description": "Large pothole causing traffic issues"
        }
        
        response = client.post("/api/v1/ml/classify", json=request_data)
        data = response.json()
        
        # If status is not success, predicted_category must be None
        if data["status"] != "success":
            assert data["predicted_category"] is None
            assert data["confidence"] == 0.0


class TestPredictSeverityEndpoint:
    """Tests for POST /api/v1/ml/predict-severity endpoint."""
    
    def test_predict_severity_returns_model_unavailable_status(self):
        """Test that severity prediction returns model_unavailable when no model is loaded."""
        request_data = {
            "title": "Pothole on Main Street",
            "description": "Large pothole causing vehicle damage",
            "category": "roads"
        }
        
        response = client.post("/api/v1/ml/predict-severity", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should indicate model is unavailable
        assert data["status"] == "model_unavailable"
        assert data["predicted_severity"] is None
        assert data["confidence"] == 0.0
        assert data["model_version"] is None
    
    def test_predict_severity_without_category(self):
        """Test severity prediction works without optional category."""
        request_data = {
            "title": "Street flooding",
            "description": "Heavy water accumulation on street after rain"
        }
        
        response = client.post("/api/v1/ml/predict-severity", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    def test_predict_severity_validates_request_schema(self):
        """Test that severity prediction validates request schema."""
        # Missing title
        response = client.post("/api/v1/ml/predict-severity", json={
            "description": "Some description"
        })
        assert response.status_code == 422
        
        # Missing description
        response = client.post("/api/v1/ml/predict-severity", json={
            "title": "Some title"
        })
        assert response.status_code == 422
    
    def test_predict_severity_response_structure(self):
        """Test that severity prediction response has correct structure."""
        request_data = {
            "title": "Emergency water leak",
            "description": "Major water main break flooding the street"
        }
        
        response = client.post("/api/v1/ml/predict-severity", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields are present
        assert "predicted_severity" in data
        assert "confidence" in data
        assert "model_version" in data
        assert "status" in data
        
        # Check confidence is in valid range
        assert 0.0 <= data["confidence"] <= 1.0
        
        # Check status is valid
        assert data["status"] in ["success", "model_unavailable", "error"]
    
    def test_predict_severity_does_not_return_fake_predictions(self):
        """Test that endpoint never returns fake predictions when model is unavailable."""
        request_data = {
            "title": "Critical infrastructure failure",
            "description": "Major bridge damage requiring immediate attention"
        }
        
        response = client.post("/api/v1/ml/predict-severity", json=request_data)
        data = response.json()
        
        # If status is not success, predicted_severity must be None
        if data["status"] != "success":
            assert data["predicted_severity"] is None
            assert data["confidence"] == 0.0


class TestDetectDuplicatesEndpoint:
    """Tests for POST /api/v1/ml/detect-duplicates endpoint."""
    
    def test_detect_duplicates_returns_success_status(self):
        """Test that duplicate detection returns success when detector is available."""
        request_data = {
            "title": "Pothole on Main Street",
            "description": "Large pothole near traffic light",
            "latitude": 21.1458,
            "longitude": 79.0882,
            "max_candidates": 5
        }
        
        response = client.post("/api/v1/ml/detect-duplicates", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Baseline detector is now available and working
        assert data["status"] == "success"
        assert "candidates" in data
        assert "model_version" in data
        assert "search_radius_meters" in data
        assert data["model_version"] is not None
        assert "baseline" in data["model_version"].lower()
    
    def test_detect_duplicates_without_location(self):
        """Test duplicate detection works without optional location."""
        request_data = {
            "title": "Street light not working",
            "description": "The street light has been off for several days"
        }
        
        response = client.post("/api/v1/ml/detect-duplicates", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "candidates" in data
    
    def test_detect_duplicates_validates_coordinates(self):
        """Test that duplicate detection validates coordinates."""
        # Invalid latitude
        response = client.post("/api/v1/ml/detect-duplicates", json={
            "title": "Test issue",
            "description": "Test description",
            "latitude": 95.0,  # > 90
            "longitude": 79.0
        })
        assert response.status_code == 422
        
        # Invalid longitude
        response = client.post("/api/v1/ml/detect-duplicates", json={
            "title": "Test issue",
            "description": "Test description",
            "latitude": 21.0,
            "longitude": -185.0  # < -180
        })
        assert response.status_code == 422
    
    def test_detect_duplicates_validates_max_candidates(self):
        """Test that duplicate detection validates max_candidates parameter."""
        # max_candidates too low
        response = client.post("/api/v1/ml/detect-duplicates", json={
            "title": "Test issue",
            "description": "Test description",
            "max_candidates": 0
        })
        assert response.status_code == 422
        
        # max_candidates too high
        response = client.post("/api/v1/ml/detect-duplicates", json={
            "title": "Test issue",
            "description": "Test description",
            "max_candidates": 25  # > 20
        })
        assert response.status_code == 422
    
    def test_detect_duplicates_response_structure(self):
        """Test that duplicate detection response has correct structure."""
        request_data = {
            "title": "Broken sidewalk",
            "description": "The sidewalk is cracked and dangerous"
        }
        
        response = client.post("/api/v1/ml/detect-duplicates", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields are present
        assert "candidates" in data
        assert "model_version" in data
        assert "status" in data
        
        # Check candidates is a list
        assert isinstance(data["candidates"], list)
        
        # Check status is valid
        assert data["status"] in ["success", "model_unavailable", "error"]
    
    def test_detect_duplicates_candidate_structure(self):
        """Test that duplicate candidates have correct structure if returned."""
        request_data = {
            "title": "Test issue",
            "description": "Test description"
        }
        
        response = client.post("/api/v1/ml/detect-duplicates", json=request_data)
        data = response.json()
        
        # If candidates are returned, check their structure
        for candidate in data["candidates"]:
            assert "issue_id" in candidate
            assert "similarity_score" in candidate
            assert "distance_meters" in candidate  # New field
            assert "text_similarity" in candidate  # New field
            assert "category_match" in candidate   # New field
            
            assert candidate["issue_id"] > 0
            assert 0.0 <= candidate["similarity_score"] <= 1.0
            assert 0.0 <= candidate["text_similarity"] <= 1.0
            assert isinstance(candidate["category_match"], bool)
            
            # distance_meters is optional (None if no location)
            if candidate["distance_meters"] is not None:
                assert candidate["distance_meters"] >= 0.0
    
    def test_detect_duplicates_returns_real_results(self):
        """Test that endpoint returns real baseline detection results."""
        request_data = {
            "title": "Another pothole",
            "description": "Similar to other potholes reported"
        }
        
        response = client.post("/api/v1/ml/detect-duplicates", json=request_data)
        data = response.json()
        
        # Baseline detector returns real results
        assert data["status"] == "success"
        # Candidates may be empty if no similar issues exist (valid outcome)
        assert isinstance(data["candidates"], list)


class TestMLEndpointsIntegration:
    """Integration tests for ML endpoints."""
    
    def test_all_ml_endpoints_accessible(self):
        """Test that all ML endpoints are accessible."""
        endpoints = [
            "/api/v1/ml/classify",
            "/api/v1/ml/predict-severity",
            "/api/v1/ml/detect-duplicates"
        ]
        
        for endpoint in endpoints:
            # Test with minimal valid data
            response = client.post(endpoint, json={
                "title": "Test",
                "description": "Test description"
            })
            
            # Should return 200 (even if model unavailable)
            assert response.status_code == 200
    
    def test_ml_endpoints_return_json(self):
        """Test that all ML endpoints return JSON."""
        endpoints = [
            "/api/v1/ml/classify",
            "/api/v1/ml/predict-severity",
            "/api/v1/ml/detect-duplicates"
        ]
        
        for endpoint in endpoints:
            response = client.post(endpoint, json={
                "title": "Test",
                "description": "Test description"
            })
            
            assert response.headers["content-type"] == "application/json"
    
    def test_ml_endpoints_handle_model_states(self):
        """Test that ML endpoints handle different model availability states.

        Classification is mocked to simulate Ollama being unavailable so this
        test is environment-independent.
        """
        from unittest.mock import patch
        from ml.classification.ai_service import OllamaClassificationService

        request_data = {
            "title": "Test issue",
            "description": "Test description for consistency check"
        }

        with patch.object(
            OllamaClassificationService,
            "classify",
            return_value=(None, None, "service_unavailable"),
        ):
            # Classification - simulated unavailable
            response = client.post("/api/v1/ml/classify", json=request_data)
            classify_data = response.json()
            assert classify_data["status"] == "model_unavailable"

        # Severity - model not available (no trained model loaded)
        response = client.post("/api/v1/ml/predict-severity", json=request_data)
        severity_data = response.json()
        assert severity_data["status"] == "model_unavailable"

        # Duplicates - baseline detector is available
        response = client.post("/api/v1/ml/detect-duplicates", json=request_data)
        duplicates_data = response.json()
        assert duplicates_data["status"] == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
