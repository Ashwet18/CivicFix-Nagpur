"""Tests for local Ollama-based complaint classification.

All Ollama HTTP calls are intercepted with httpx.MockTransport so the test
suite never requires a running Ollama server or a pulled model.

Test coverage:
  - Category validation helpers (categories.py)
  - OllamaClassificationService: initialisation, classification, every error path
  - ClassificationPredictor: full predict() flow, category normalisation
  - Configuration: OLLAMA_* environment variables honoured
"""

import json
from typing import Optional
from unittest.mock import MagicMock, patch

import httpx
import pytest

from ml.classification.categories import (
    VALID_CATEGORIES,
    is_valid_category,
    normalize_category,
)
from ml.classification.ai_service import OllamaClassificationService
from ml.classification.predictor import ClassificationPredictor


# ---------------------------------------------------------------------------
# Helpers — build mock Ollama HTTP responses
# ---------------------------------------------------------------------------

def _ollama_response(category: str, explanation: str = "Test explanation.") -> httpx.Response:
    """Build a well-formed Ollama /api/generate HTTP 200 response."""
    model_json = json.dumps({"category": category, "explanation": explanation})
    body = json.dumps({"model": "qwen2.5:3b", "response": model_json, "done": True})
    return httpx.Response(200, text=body)


def _ollama_error_response(status_code: int = 500) -> httpx.Response:
    """Build an Ollama HTTP error response."""
    return httpx.Response(status_code, text='{"error": "internal server error"}')


def _ollama_malformed_response(body: str) -> httpx.Response:
    """Build a response whose body is not valid Ollama JSON."""
    return httpx.Response(200, text=body)


class _MockTransport(httpx.MockTransport):
    """Wraps a single-call mock so tests can inspect what was sent."""

    def __init__(self, response: httpx.Response) -> None:
        self._response = response
        self.last_request: Optional[httpx.Request] = None

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        self.last_request = request
        return self._response


# ---------------------------------------------------------------------------
# Category validation
# ---------------------------------------------------------------------------

class TestCategoryValidation:
    def test_valid_categories_recognised(self):
        for cat in VALID_CATEGORIES:
            assert is_valid_category(cat), f"{cat!r} should be valid"

    def test_category_aliases_normalise(self):
        assert normalize_category("roads") == "road_damage"
        assert normalize_category("water") == "water_supply"
        assert normalize_category("drain") == "drainage"
        assert normalize_category("lights") == "streetlight"
        assert normalize_category("waste") == "garbage"
        assert normalize_category("safety") == "public_safety"

    def test_unknown_category_raises(self):
        with pytest.raises(ValueError):
            normalize_category("unknown_xyz")

    def test_case_insensitive_normalisation(self):
        assert normalize_category("ROAD_DAMAGE") == "road_damage"
        assert normalize_category("Garbage") == "garbage"

    def test_is_valid_category_returns_false_for_unknown(self):
        assert not is_valid_category("gpt4_answer")
        assert not is_valid_category("")


# ---------------------------------------------------------------------------
# OllamaClassificationService — initialisation
# ---------------------------------------------------------------------------

class TestOllamaServiceInitialisation:
    def test_default_values(self):
        svc = OllamaClassificationService()
        assert svc.base_url == "http://localhost:11434"
        assert svc.model == "qwen2.5:3b"
        assert svc.timeout == 30

    def test_custom_values(self):
        svc = OllamaClassificationService(
            base_url="http://localhost:9999",
            model="mistral:7b",
            timeout=60,
        )
        assert svc.base_url == "http://localhost:9999"
        assert svc.model == "mistral:7b"
        assert svc.timeout == 60

    def test_trailing_slash_stripped_from_base_url(self):
        svc = OllamaClassificationService(base_url="http://localhost:11434/")
        assert svc.base_url == "http://localhost:11434"
        assert svc._generate_url == "http://localhost:11434/api/generate"

    def test_get_model_version(self):
        svc = OllamaClassificationService(model="qwen2.5:3b")
        assert svc.get_model_version() == "ollama-qwen2.5:3b"


# ---------------------------------------------------------------------------
# OllamaClassificationService — is_available()
# ---------------------------------------------------------------------------

class TestOllamaServiceAvailability:
    def test_available_when_server_responds(self):
        transport = _MockTransport(httpx.Response(200, text="Ollama is running"))
        with patch("httpx.Client", return_value=httpx.Client(transport=transport)):
            svc = OllamaClassificationService()
            assert svc.is_available() is True

    def test_unavailable_when_connection_error(self):
        def raise_connect(*args, **kwargs):
            raise httpx.ConnectError("refused")

        with patch("httpx.Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get.side_effect = httpx.ConnectError("refused")
            mock_cls.return_value = mock_client
            svc = OllamaClassificationService()
            assert svc.is_available() is False


# ---------------------------------------------------------------------------
# OllamaClassificationService — classify() happy paths
# ---------------------------------------------------------------------------

class TestOllamaServiceClassification:
    """Each test uses a fresh mock to avoid shared-state issues."""

    def _make_service(self, response: httpx.Response) -> OllamaClassificationService:
        """Return a service whose HTTP calls return *response*."""
        transport = _MockTransport(response)
        svc = OllamaClassificationService()
        svc._mock_transport = transport  # kept for inspection
        return svc

    def _classify(self, svc: OllamaClassificationService, title: str, desc: str):
        transport = svc._mock_transport
        with patch("httpx.Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post.return_value = transport._response
            mock_cls.return_value = mock_client
            return svc.classify(title, desc)

    # -- Valid category returns ------------------------------------------------

    def test_classify_road_damage(self):
        svc = self._make_service(_ollama_response("road_damage"))
        cat, explanation, status = self._classify(
            svc, "Pothole on MG Road", "Deep pothole near city mall"
        )
        assert status == "success"
        assert cat == "road_damage"
        assert explanation is not None

    def test_classify_garbage(self):
        svc = self._make_service(_ollama_response("garbage"))
        cat, _, status = self._classify(
            svc, "Garbage not collected", "Waste piling up for 5 days"
        )
        assert status == "success"
        assert cat == "garbage"

    def test_classify_water_supply(self):
        svc = self._make_service(_ollama_response("water_supply"))
        cat, _, status = self._classify(
            svc, "Pipe burst on Station Road", "Water flooding the street"
        )
        assert status == "success"
        assert cat == "water_supply"

    def test_classify_drainage(self):
        svc = self._make_service(_ollama_response("drainage"))
        cat, _, status = self._classify(
            svc, "Blocked drain", "Waterlogging every monsoon"
        )
        assert status == "success"
        assert cat == "drainage"

    def test_classify_streetlight(self):
        svc = self._make_service(_ollama_response("streetlight"))
        cat, _, status = self._classify(
            svc, "Street light not working", "Dark road for 2 weeks"
        )
        assert status == "success"
        assert cat == "streetlight"

    def test_classify_electricity(self):
        svc = self._make_service(_ollama_response("electricity"))
        cat, _, status = self._classify(
            svc, "Hanging wire hazard", "High voltage wire dangling from pole"
        )
        assert status == "success"
        assert cat == "electricity"

    def test_classify_sanitation(self):
        svc = self._make_service(_ollama_response("sanitation"))
        cat, _, status = self._classify(
            svc, "Dirty public toilet", "No cleaning done for weeks"
        )
        assert status == "success"
        assert cat == "sanitation"

    def test_classify_public_safety(self):
        svc = self._make_service(_ollama_response("public_safety"))
        cat, _, status = self._classify(
            svc, "Broken footpath", "Sharp concrete injuring pedestrians"
        )
        assert status == "success"
        assert cat == "public_safety"

    def test_classify_other(self):
        svc = self._make_service(_ollama_response("other"))
        cat, _, status = self._classify(
            svc, "Park bench broken", "Needs general maintenance"
        )
        assert status == "success"
        assert cat == "other"


# ---------------------------------------------------------------------------
# OllamaClassificationService — classify() error paths
# ---------------------------------------------------------------------------

class TestOllamaServiceErrorPaths:
    def _classify_with_mock(self, svc, side_effect=None, return_value=None):
        """Helper: mock httpx.Client.post with either side_effect or return_value."""
        with patch("httpx.Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            if side_effect is not None:
                mock_client.post.side_effect = side_effect
            else:
                mock_client.post.return_value = return_value
            mock_cls.return_value = mock_client
            return svc.classify("Test title", "Test description")

    def test_connection_refused_returns_service_unavailable(self):
        svc = OllamaClassificationService()
        cat, _, status = self._classify_with_mock(
            svc, side_effect=httpx.ConnectError("Connection refused")
        )
        assert status == "service_unavailable"
        assert cat is None

    def test_request_error_returns_service_unavailable(self):
        svc = OllamaClassificationService()
        cat, _, status = self._classify_with_mock(
            svc, side_effect=httpx.RequestError("Network error")
        )
        assert status == "service_unavailable"
        assert cat is None

    def test_timeout_returns_error(self):
        svc = OllamaClassificationService()
        cat, _, status = self._classify_with_mock(
            svc, side_effect=httpx.TimeoutException("timed out")
        )
        assert status == "error"
        assert cat is None

    def test_http_500_returns_error(self):
        svc = OllamaClassificationService()
        cat, _, status = self._classify_with_mock(
            svc, return_value=_ollama_error_response(500)
        )
        assert status == "error"
        assert cat is None

    def test_http_404_returns_error(self):
        svc = OllamaClassificationService()
        cat, _, status = self._classify_with_mock(
            svc, return_value=_ollama_error_response(404)
        )
        assert status == "error"
        assert cat is None

    def test_invalid_category_in_response_returns_error(self):
        svc = OllamaClassificationService()
        # Model returns a made-up category not in VALID_CATEGORIES
        bad_json = json.dumps({"category": "flying_cars", "explanation": "Nope"})
        body = json.dumps({"response": bad_json, "done": True})
        cat, _, status = self._classify_with_mock(
            svc, return_value=httpx.Response(200, text=body)
        )
        assert status == "error"
        assert cat is None

    def test_malformed_outer_json_returns_error(self):
        svc = OllamaClassificationService()
        cat, _, status = self._classify_with_mock(
            svc, return_value=_ollama_malformed_response("this is not json at all")
        )
        assert status == "error"
        assert cat is None

    def test_malformed_inner_json_returns_error(self):
        """Outer envelope is valid but the model response field is not JSON."""
        svc = OllamaClassificationService()
        body = json.dumps({"response": "I would say road_damage", "done": True})
        cat, _, status = self._classify_with_mock(
            svc, return_value=httpx.Response(200, text=body)
        )
        # Inner response is prose, not JSON → error
        assert status == "error"
        assert cat is None

    def test_missing_category_field_returns_error(self):
        svc = OllamaClassificationService()
        inner = json.dumps({"explanation": "Some explanation but no category key"})
        body = json.dumps({"response": inner, "done": True})
        cat, _, status = self._classify_with_mock(
            svc, return_value=httpx.Response(200, text=body)
        )
        assert status == "error"
        assert cat is None

    def test_empty_response_field_returns_error(self):
        svc = OllamaClassificationService()
        body = json.dumps({"response": "", "done": True})
        cat, _, status = self._classify_with_mock(
            svc, return_value=httpx.Response(200, text=body)
        )
        assert status == "error"
        assert cat is None

    def test_embedded_json_extracted_from_prose(self):
        """Model wraps JSON in prose — fallback extraction should still work."""
        svc = OllamaClassificationService()
        inner = 'Here is my answer: {"category": "garbage", "explanation": "Waste issue."} done.'
        body = json.dumps({"response": inner, "done": True})
        cat, _, status = self._classify_with_mock(
            svc, return_value=httpx.Response(200, text=body)
        )
        # The service should extract the embedded JSON object
        assert status == "success"
        assert cat == "garbage"


# ---------------------------------------------------------------------------
# ClassificationPredictor
# ---------------------------------------------------------------------------

class TestClassificationPredictor:
    def _mock_classify(self, return_value):
        """Context manager: patches OllamaClassificationService.classify."""
        return patch.object(OllamaClassificationService, "classify", return_value=return_value)

    def test_predict_returns_success_with_valid_category(self):
        with self._mock_classify(("road_damage", "Pothole detected", "success")):
            predictor = ClassificationPredictor()
            cat, confidence, status = predictor.predict(
                "Pothole on MG Road", "Deep pothole causing accidents"
            )
        assert status == "success"
        assert cat == "road_damage"
        assert confidence == 0.0  # Local model — no calibrated score

    def test_predict_normalises_alias(self):
        """Predictor must normalise aliases returned by the model."""
        with self._mock_classify(("roads", "Road damage", "success")):
            predictor = ClassificationPredictor()
            cat, _, status = predictor.predict("Road issue", "Damage on highway")
        assert status == "success"
        assert cat == "road_damage"

    def test_predict_service_unavailable_returns_model_unavailable(self):
        with self._mock_classify((None, None, "service_unavailable")):
            predictor = ClassificationPredictor()
            cat, confidence, status = predictor.predict("title", "description")
        assert status == "model_unavailable"
        assert cat is None
        assert confidence == 0.0

    def test_predict_error_from_service_returns_error(self):
        with self._mock_classify((None, None, "error")):
            predictor = ClassificationPredictor()
            cat, confidence, status = predictor.predict("title", "description")
        assert status == "error"
        assert cat is None

    def test_predict_invalid_category_from_service_returns_error(self):
        """Service returns 'success' but with an unrecognised category."""
        with self._mock_classify(("invented_category_xyz", "explanation", "success")):
            predictor = ClassificationPredictor()
            cat, confidence, status = predictor.predict("title", "description")
        assert status == "error"
        assert cat is None

    def test_confidence_always_zero(self):
        """Confidence must never be a fabricated non-zero value."""
        with self._mock_classify(("electricity", "Power issue", "success")):
            predictor = ClassificationPredictor()
            _, confidence, _ = predictor.predict("Wire hazard", "Loose wire on pole")
        assert confidence == 0.0

    def test_get_model_version_reflects_ollama_model(self):
        predictor = ClassificationPredictor(ollama_model="qwen2.5:3b")
        version = predictor.get_model_version()
        assert "ollama" in version
        assert "qwen2.5:3b" in version


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

class TestOllamaConfiguration:
    def test_custom_base_url_passed_to_service(self):
        predictor = ClassificationPredictor(
            ollama_base_url="http://my-host:9999",
            ollama_model="mistral:7b",
        )
        assert predictor.ai_service.base_url == "http://my-host:9999"
        assert predictor.ai_service.model == "mistral:7b"

    def test_timeout_passed_to_service(self):
        predictor = ClassificationPredictor(ollama_timeout=60)
        assert predictor.ai_service.timeout == 60

    def test_default_config_matches_env_defaults(self):
        """Defaults must match what config.py advertises."""
        predictor = ClassificationPredictor()
        assert predictor.ai_service.base_url == "http://localhost:11434"
        assert predictor.ai_service.model == "qwen2.5:3b"
        assert predictor.ai_service.timeout == 30
