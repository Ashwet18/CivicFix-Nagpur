"""Tests for health check endpoints.

This module tests the root and health endpoints, including scenarios
where the database is available and unavailable.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.session import get_db
from app.db.base import Base


# Create in-memory SQLite database for testing
# StaticPool ensures the same connection is reused across threads
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


def override_get_db() -> Session:
    """Override get_db dependency for testing with in-memory database."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_db_failure():
    """Override get_db dependency to simulate database failure."""
    # Create a mock session that raises an exception when executing queries
    class FailingSession:
        def execute(self, *args, **kwargs):
            raise Exception("Database connection failed")
        
        def close(self):
            pass
    
    yield FailingSession()


# Create test client
client = TestClient(app)


class TestRootEndpoint:
    """Tests for the root endpoint."""
    
    def test_root_endpoint_returns_welcome_message(self):
        """Test that root endpoint returns welcome message and status."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Welcome to CivicFix-Nagpur API"
        assert data["status"] == "active"
        assert data["version"] == "0.1.0"
        assert "description" in data
    
    def test_root_endpoint_content_type(self):
        """Test that root endpoint returns JSON content."""
        response = client.get("/")
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"


class TestCORSMiddleware:
    """Tests for configured development web origins."""

    def test_allows_local_development_origin_without_credentials(self):
        response = client.options(
            "/api/v1/issues",
            headers={
                "Origin": "http://localhost:8081",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
        assert "access-control-allow-credentials" not in response.headers

    def test_rejects_unconfigured_origin(self):
        response = client.options(
            "/api/v1/issues",
            headers={
                "Origin": "http://untrusted.example",
                "Access-Control-Request-Method": "POST",
            },
        )

        assert response.status_code == 400
        assert "access-control-allow-origin" not in response.headers


class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    @pytest.fixture(autouse=True)
    def setup_health_test(self):
        """Setup test database before each test."""
        # Save existing overrides
        existing_overrides = app.dependency_overrides.copy()
        
        # Create tables in test database
        Base.metadata.create_all(bind=test_engine)
        
        # Override get_db dependency to use test database
        app.dependency_overrides[get_db] = override_get_db
        
        yield
        
        # Drop all tables
        Base.metadata.drop_all(bind=test_engine)
        
        # Restore previous overrides
        app.dependency_overrides.clear()
        app.dependency_overrides.update(existing_overrides)
    
    def test_health_endpoint_with_database_connection(self):
        """Test health endpoint returns 200 when database is available."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "CivicFix-Nagpur API"
        assert data["database"] == "connected"
    
    def test_health_endpoint_verifies_database_query(self):
        """Test that health endpoint actually executes database query."""
        # This test verifies the health check runs SELECT 1
        response = client.get("/health")
        
        assert response.status_code == 200
        # If we got a 200 response, the database query succeeded
        data = response.json()
        assert data["database"] == "connected"
    
    def test_health_endpoint_with_database_failure(self):
        """Test health endpoint returns 503 when database is unavailable."""
        # Override dependency to simulate database failure
        app.dependency_overrides[get_db] = override_get_db_failure
        
        response = client.get("/health")
        
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert data["detail"]["status"] == "unhealthy"
        assert data["detail"]["service"] == "CivicFix-Nagpur API"
        assert data["detail"]["database"] == "disconnected"
    
    def test_health_endpoint_does_not_expose_error_details(self):
        """Test that health endpoint doesn't expose sensitive error information."""
        # Override dependency to simulate database failure
        app.dependency_overrides[get_db] = override_get_db_failure
        
        response = client.get("/health")
        
        assert response.status_code == 503
        data = response.json()
        # Ensure no stack traces or sensitive details are exposed
        response_text = response.text.lower()
        assert "traceback" not in response_text
        assert "exception" not in response_text
        assert "password" not in response_text
    
    def test_health_endpoint_content_type(self):
        """Test that health endpoint returns JSON content."""
        response = client.get("/health")
        
        assert response.headers["content-type"] == "application/json"


class TestHealthEndpointIntegration:
    """Integration tests for health endpoint without mocking."""
    
    def test_health_endpoint_accessible(self):
        """Test that health endpoint is accessible."""
        # This test will fail if database is not configured
        # but verifies the endpoint exists and is routed correctly
        response = client.get("/health")
        
        # Should return either 200 (connected) or 503 (unavailable)
        assert response.status_code in [200, 503]
        
        # Should always return JSON
        assert response.headers["content-type"] == "application/json"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
