"""Tests for issue API endpoints."""

import pytest

# ---------------------------------------------------------------------------
# All DB wiring (engine, session, override, clean_database fixture, client)
# comes from the shared conftest.py.  Importing them here makes them
# available as module-level names so the test classes below can use `client`
# directly without changes.
# ---------------------------------------------------------------------------
from tests.conftest import client, TestingSessionLocal  # noqa: F401


class TestCreateIssue:
    """Tests for POST /api/v1/issues endpoint."""
    
    def test_create_issue_successfully(self):
        """Test creating a valid issue returns 201 with correct data."""
        issue_data = {
            "title": "Pothole on Main Street",
            "description": "Large pothole near the traffic light causing damage to vehicles",
            "category": "roads",
            "severity": "high",
            "latitude": 21.1458,
            "longitude": 79.0882
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == issue_data["title"]
        assert data["description"] == issue_data["description"]
        assert data["category"] == issue_data["category"]
        assert data["severity"] == issue_data["severity"]
        assert data["latitude"] == issue_data["latitude"]
        assert data["longitude"] == issue_data["longitude"]
        assert data["status"] == "reported"  # Default status
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
    
    def test_create_issue_minimal_fields(self):
        """Test creating issue with only required fields."""
        issue_data = {
            "title": "Water leakage issue",
            "description": "Continuous water leakage from underground pipe"
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == issue_data["title"]
        assert data["description"] == issue_data["description"]
        assert data["category"] is None
        assert data["severity"] is None
        assert data["latitude"] is None
        assert data["longitude"] is None
        assert data["status"] == "reported"
    
    def test_create_issue_missing_title(self):
        """Test creating issue without title returns 422."""
        issue_data = {
            "description": "Missing title field"
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 422
    
    def test_create_issue_missing_description(self):
        """Test creating issue without description returns 422."""
        issue_data = {
            "title": "Missing description"
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 422
    
    def test_create_issue_title_too_short(self):
        """Test creating issue with title less than 5 characters returns 422."""
        issue_data = {
            "title": "Test",
            "description": "This title is too short"
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 422
    
    def test_create_issue_title_too_long(self):
        """Test creating issue with title exceeding 150 characters returns 422."""
        issue_data = {
            "title": "x" * 151,
            "description": "This title is too long"
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 422
    
    def test_create_issue_description_too_short(self):
        """Test creating issue with description less than 10 characters returns 422."""
        issue_data = {
            "title": "Valid title",
            "description": "Too short"
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 422
    
    def test_create_issue_invalid_latitude(self):
        """Test creating issue with invalid latitude returns 422."""
        issue_data = {
            "title": "Valid title",
            "description": "Valid description with enough characters",
            "latitude": 95.0  # Invalid: > 90
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 422
    
    def test_create_issue_invalid_longitude(self):
        """Test creating issue with invalid longitude returns 422."""
        issue_data = {
            "title": "Valid title",
            "description": "Valid description with enough characters",
            "longitude": -185.0  # Invalid: < -180
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 422
    
    def test_create_issue_valid_coordinates(self):
        """Test creating issue with valid edge case coordinates."""
        issue_data = {
            "title": "Valid title",
            "description": "Valid description with enough characters",
            "latitude": 90.0,
            "longitude": -180.0
        }
        
        response = client.post("/api/v1/issues", json=issue_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["latitude"] == 90.0
        assert data["longitude"] == -180.0


class TestListIssues:
    """Tests for GET /api/v1/issues endpoint."""
    
    def test_list_issues_empty(self):
        """Test listing issues when database is empty."""
        response = client.get("/api/v1/issues")
        
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["skip"] == 0
        assert data["limit"] == 20
    
    def test_list_issues_with_data(self):
        """Test listing issues returns correct data."""
        # Create test issues
        for i in range(3):
            client.post("/api/v1/issues", json={
                "title": f"Test Issue {i+1}",
                "description": f"Description for test issue {i+1}"
            })
        
        response = client.get("/api/v1/issues")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total"] == 3
        assert data["skip"] == 0
        assert data["limit"] == 20
    
    def test_list_issues_pagination(self):
        """Test pagination works correctly."""
        # Create 5 test issues
        for i in range(5):
            client.post("/api/v1/issues", json={
                "title": f"Test Issue {i+1}",
                "description": f"Description for test issue {i+1}"
            })
        
        # Get first page
        response = client.get("/api/v1/issues?skip=0&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["skip"] == 0
        assert data["limit"] == 2
        
        # Get second page
        response = client.get("/api/v1/issues?skip=2&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["skip"] == 2
    
    def test_list_issues_ordered_by_newest(self):
        """Test issues are ordered by newest first."""
        # Create issues in sequence
        titles = ["First", "Second", "Third"]
        for title in titles:
            client.post("/api/v1/issues", json={
                "title": title + " issue",
                "description": "Description for " + title
            })
        
        response = client.get("/api/v1/issues")
        
        assert response.status_code == 200
        data = response.json()
        # Newest first means "Third" should be first
        assert data["items"][0]["title"] == "Third issue"
        assert data["items"][1]["title"] == "Second issue"
        assert data["items"][2]["title"] == "First issue"
    
    def test_list_issues_filter_by_status(self):
        """Test filtering issues by status."""
        # Create issues with different statuses
        issue1 = client.post("/api/v1/issues", json={
            "title": "Reported Issue",
            "description": "This is a reported issue"
        }).json()
        
        issue2 = client.post("/api/v1/issues", json={
            "title": "Another Issue",
            "description": "This will be acknowledged"
        }).json()
        
        # Update second issue status
        client.patch(f"/api/v1/issues/{issue2['id']}/status", json={
            "status": "acknowledged"
        })
        
        # Filter by reported
        response = client.get("/api/v1/issues?status=reported")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "reported"
        
        # Filter by acknowledged
        response = client.get("/api/v1/issues?status=acknowledged")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "acknowledged"
    
    def test_list_issues_filter_by_category(self):
        """Test filtering issues by category."""
        # Create issues with different categories
        client.post("/api/v1/issues", json={
            "title": "Road Issue",
            "description": "This is about roads",
            "category": "roads"
        })
        
        client.post("/api/v1/issues", json={
            "title": "Water Issue",
            "description": "This is about water",
            "category": "water"
        })
        
        # Filter by roads
        response = client.get("/api/v1/issues?category=roads")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "roads"
    
    def test_list_issues_invalid_pagination(self):
        """Test invalid pagination parameters return 422."""
        # Negative skip
        response = client.get("/api/v1/issues?skip=-1")
        assert response.status_code == 422
        
        # Limit exceeds maximum
        response = client.get("/api/v1/issues?limit=101")
        assert response.status_code == 422
        
        # Zero limit
        response = client.get("/api/v1/issues?limit=0")
        assert response.status_code == 422


class TestGetIssue:
    """Tests for GET /api/v1/issues/{issue_id} endpoint."""
    
    def test_get_existing_issue(self):
        """Test retrieving an existing issue by ID."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Test Issue",
            "description": "This is a test issue for retrieval",
            "category": "test"
        })
        issue_id = create_response.json()["id"]
        
        # Retrieve the issue
        response = client.get(f"/api/v1/issues/{issue_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == issue_id
        assert data["title"] == "Test Issue"
        assert data["description"] == "This is a test issue for retrieval"
        assert data["category"] == "test"
    
    def test_get_nonexistent_issue(self):
        """Test retrieving a non-existent issue returns 404."""
        response = client.get("/api/v1/issues/99999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_issue_invalid_id(self):
        """Test retrieving issue with invalid ID returns 422."""
        # Zero ID
        response = client.get("/api/v1/issues/0")
        assert response.status_code == 422
        
        # Negative ID
        response = client.get("/api/v1/issues/-1")
        assert response.status_code == 422


class TestUpdateIssue:
    """Tests for PATCH /api/v1/issues/{issue_id} endpoint."""
    
    def test_update_issue_single_field(self):
        """Test updating a single field."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Original Title",
            "description": "Original description with enough text"
        })
        issue_id = create_response.json()["id"]
        
        # Update only title
        response = client.patch(f"/api/v1/issues/{issue_id}", json={
            "title": "Updated Title"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["description"] == "Original description with enough text"
    
    def test_update_issue_multiple_fields(self):
        """Test updating multiple fields at once."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Original Title",
            "description": "Original description with enough text"
        })
        issue_id = create_response.json()["id"]
        
        # Update multiple fields
        response = client.patch(f"/api/v1/issues/{issue_id}", json={
            "title": "New Title",
            "description": "New description with more details",
            "category": "roads",
            "severity": "high"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Title"
        assert data["description"] == "New description with more details"
        assert data["category"] == "roads"
        assert data["severity"] == "high"
    
    def test_update_issue_coordinates(self):
        """Test updating location coordinates."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Location Test",
            "description": "Testing location updates"
        })
        issue_id = create_response.json()["id"]
        
        # Update coordinates
        response = client.patch(f"/api/v1/issues/{issue_id}", json={
            "latitude": 21.1458,
            "longitude": 79.0882
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["latitude"] == 21.1458
        assert data["longitude"] == 79.0882
    
    def test_update_issue_invalid_field_values(self):
        """Test updating with invalid values returns 422."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Test Issue",
            "description": "Testing invalid updates"
        })
        issue_id = create_response.json()["id"]
        
        # Invalid title (too short)
        response = client.patch(f"/api/v1/issues/{issue_id}", json={
            "title": "Hi"
        })
        assert response.status_code == 422
        
        # Invalid latitude
        response = client.patch(f"/api/v1/issues/{issue_id}", json={
            "latitude": 95.0
        })
        assert response.status_code == 422
    
    def test_update_nonexistent_issue(self):
        """Test updating non-existent issue returns 404."""
        response = client.patch("/api/v1/issues/99999", json={
            "title": "Updated Title"
        })
        
        assert response.status_code == 404
    
    def test_update_issue_empty_body(self):
        """Test updating with empty body doesn't change anything."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Original Title",
            "description": "Original description with text"
        })
        issue_id = create_response.json()["id"]
        original_data = create_response.json()
        
        # Update with empty body
        response = client.patch(f"/api/v1/issues/{issue_id}", json={})
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == original_data["title"]
        assert data["description"] == original_data["description"]


class TestUpdateIssueStatus:
    """Tests for PATCH /api/v1/issues/{issue_id}/status endpoint."""
    
    def test_update_status_to_acknowledged(self):
        """Test updating status to acknowledged."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Test Issue",
            "description": "Testing status update"
        })
        issue_id = create_response.json()["id"]
        
        # Update status
        response = client.patch(f"/api/v1/issues/{issue_id}/status", json={
            "status": "acknowledged"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "acknowledged"
    
    def test_update_status_all_valid_statuses(self):
        """Test all valid status transitions."""
        valid_statuses = ["acknowledged", "in_progress", "resolved", "rejected"]
        
        for status in valid_statuses:
            # Create new issue for each test
            create_response = client.post("/api/v1/issues", json={
                "title": f"Test {status}",
                "description": f"Testing {status} status"
            })
            issue_id = create_response.json()["id"]
            
            # Update status
            response = client.patch(f"/api/v1/issues/{issue_id}/status", json={
                "status": status
            })
            
            assert response.status_code == 200
            assert response.json()["status"] == status
    
    def test_update_status_case_insensitive(self):
        """Test status update is case-insensitive."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Test Issue",
            "description": "Testing case sensitivity"
        })
        issue_id = create_response.json()["id"]
        
        # Update with uppercase status
        response = client.patch(f"/api/v1/issues/{issue_id}/status", json={
            "status": "ACKNOWLEDGED"
        })
        
        assert response.status_code == 200
        assert response.json()["status"] == "acknowledged"
    
    def test_update_status_invalid_value(self):
        """Test updating with invalid status returns 422."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Test Issue",
            "description": "Testing invalid status"
        })
        issue_id = create_response.json()["id"]
        
        # Try invalid status
        response = client.patch(f"/api/v1/issues/{issue_id}/status", json={
            "status": "invalid_status"
        })
        
        assert response.status_code == 422
    
    def test_update_status_nonexistent_issue(self):
        """Test updating status of non-existent issue returns 404."""
        response = client.patch("/api/v1/issues/99999/status", json={
            "status": "acknowledged"
        })
        
        assert response.status_code == 404
    
    def test_update_status_missing_field(self):
        """Test updating status without status field returns 422."""
        # Create an issue
        create_response = client.post("/api/v1/issues", json={
            "title": "Test Issue",
            "description": "Testing missing status field"
        })
        issue_id = create_response.json()["id"]
        
        # Try without status field
        response = client.patch(f"/api/v1/issues/{issue_id}/status", json={})
        
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
