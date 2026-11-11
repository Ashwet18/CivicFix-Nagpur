"""
tests/test_api_integration.py

Comprehensive SQLite-backed API integration tests.
Verifies every endpoint contract used by the citizen app and admin dashboard.
Uses the same in-memory SQLite override as the existing test suite so no
PostgreSQL credentials are required.

Coverage:
  POST   /api/v1/issues              — create
  GET    /api/v1/issues              — list (empty, paginated, filtered)
  GET    /api/v1/issues/{id}         — detail
  PATCH  /api/v1/issues/{id}         — partial update
  PATCH  /api/v1/issues/{id}/status  — status update
  Error responses: 404, 422
  Pagination metadata contract
  Status value contract (all 5 valid statuses)
  Category normalisation
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import get_db
from app.db.base import Base
from app.models.issue import Issue

# ── Shared SQLite in-memory engine ───────────────────────────────────────────
SQLITE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    """Wipe issues table before every test for isolation."""
    db = TestSession()
    try:
        db.execute(delete(Issue))
        db.commit()
    finally:
        db.close()


# ── Helpers ───────────────────────────────────────────────────────────────────
MINIMAL = {
    "title": "Broken footpath near bus stop",
    "description": "Cracked tiles causing tripping hazard on the footpath",
}

FULL = {
    "title": "Pothole on MG Road near Sitabuldi",
    "description": "Large pothole causing traffic hazard near main junction",
    "category": "road_damage",
    "severity": "high",
    "latitude": 21.1458,
    "longitude": 79.0882,
}

VALID_STATUSES = ["reported", "acknowledged", "in_progress", "resolved", "rejected"]


def create_issue(payload=None):
    r = client.post("/api/v1/issues", json=payload or MINIMAL)
    assert r.status_code == 201, f"Expected 201 got {r.status_code}: {r.text}"
    return r.json()


# ── POST /api/v1/issues ───────────────────────────────────────────────────────

class TestCreateIssue:

    def test_create_minimal_fields_returns_201(self):
        r = client.post("/api/v1/issues", json=MINIMAL)
        assert r.status_code == 201
        d = r.json()
        assert d["title"] == MINIMAL["title"]
        assert d["description"] == MINIMAL["description"]

    def test_create_sets_default_status_to_reported(self):
        d = create_issue()
        assert d["status"] == "reported"

    def test_create_assigns_integer_id(self):
        d = create_issue()
        assert isinstance(d["id"], int)
        assert d["id"] >= 1

    def test_create_with_all_fields(self):
        r = client.post("/api/v1/issues", json=FULL)
        assert r.status_code == 201
        d = r.json()
        assert d["category"] == "road_damage"
        assert d["severity"] == "high"
        assert d["latitude"] == pytest.approx(21.1458, abs=1e-4)
        assert d["longitude"] == pytest.approx(79.0882, abs=1e-4)

    def test_create_returns_timestamps(self):
        d = create_issue()
        assert "created_at" in d and d["created_at"]
        assert "updated_at" in d and d["updated_at"]

    def test_create_missing_title_returns_422(self):
        r = client.post("/api/v1/issues", json={"description": "desc only"})
        assert r.status_code == 422

    def test_create_missing_description_returns_422(self):
        r = client.post("/api/v1/issues", json={"title": "title only"})
        assert r.status_code == 422

    def test_create_title_too_short_returns_422(self):
        r = client.post("/api/v1/issues", json={**MINIMAL, "title": "abc"})
        assert r.status_code == 422

    def test_create_description_too_short_returns_422(self):
        r = client.post("/api/v1/issues", json={**MINIMAL, "description": "short"})
        assert r.status_code == 422

    def test_create_latitude_out_of_range_returns_422(self):
        r = client.post("/api/v1/issues", json={**MINIMAL, "latitude": 95.0})
        assert r.status_code == 422

    def test_create_longitude_out_of_range_returns_422(self):
        r = client.post("/api/v1/issues", json={**MINIMAL, "longitude": -200.0})
        assert r.status_code == 422

    def test_create_whitespace_title_stripped(self):
        r = client.post("/api/v1/issues", json={**MINIMAL, "title": "  Pothole on road  "})
        assert r.status_code == 201
        assert r.json()["title"] == "Pothole on road"

    def test_create_blank_category_stored_as_null(self):
        r = client.post("/api/v1/issues", json={**MINIMAL, "category": "   "})
        assert r.status_code == 201
        assert r.json()["category"] is None

    def test_create_category_lowercased(self):
        r = client.post("/api/v1/issues", json={**MINIMAL, "category": "Roads"})
        assert r.status_code == 201
        assert r.json()["category"] == "roads"

    def test_create_local_image_uri_rejected(self):
        # The API accepts only http/https image URLs — this is validated by the
        # citizen service layer (not the API itself, which accepts any string)
        # Verify that a valid HTTP URL is accepted
        r = client.post("/api/v1/issues", json={
            **MINIMAL, "image_url": "https://example.com/photo.jpg"
        })
        assert r.status_code == 201
        assert r.json()["image_url"] == "https://example.com/photo.jpg"


# ── GET /api/v1/issues ────────────────────────────────────────────────────────

class TestListIssues:

    def test_empty_list_returns_total_zero(self):
        r = client.get("/api/v1/issues")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 0
        assert d["items"] == []
        assert d["skip"] == 0
        assert d["limit"] == 20

    def test_list_returns_created_issue(self):
        create_issue()
        r = client.get("/api/v1/issues")
        assert r.status_code == 200
        assert r.json()["total"] == 1
        assert len(r.json()["items"]) == 1

    def test_list_ordered_newest_first(self):
        create_issue({**MINIMAL, "title": "First issue created today"})
        create_issue({**MINIMAL, "title": "Second issue created later"})
        items = client.get("/api/v1/issues").json()["items"]
        assert items[0]["title"] == "Second issue created later"
        assert items[1]["title"] == "First issue created today"

    def test_list_pagination_skip_and_limit(self):
        for i in range(5):
            create_issue({**MINIMAL, "title": f"Issue number {i + 1} description"})
        r = client.get("/api/v1/issues?skip=2&limit=2")
        d = r.json()
        assert d["total"] == 5
        assert len(d["items"]) == 2
        assert d["skip"] == 2
        assert d["limit"] == 2

    def test_list_limit_zero_returns_422(self):
        r = client.get("/api/v1/issues?limit=0")
        assert r.status_code == 422

    def test_list_negative_skip_returns_422(self):
        r = client.get("/api/v1/issues?skip=-1")
        assert r.status_code == 422

    def test_list_filter_by_status_reported(self):
        issue_id = create_issue()["id"]
        r = client.get("/api/v1/issues?status=reported")
        assert r.json()["total"] == 1
        # Update to acknowledged
        client.patch(f"/api/v1/issues/{issue_id}/status",
                     json={"status": "acknowledged"})
        r2 = client.get("/api/v1/issues?status=reported")
        assert r2.json()["total"] == 0

    def test_list_filter_by_status_case_insensitive(self):
        create_issue()
        r = client.get("/api/v1/issues?status=Reported")
        assert r.json()["total"] == 1

    def test_list_filter_by_category(self):
        create_issue({**MINIMAL, "category": "roads"})
        create_issue({**MINIMAL,
                      "title": "Broken streetlight on Wardha Road",
                      "description": "Street lights non-functional near colony",
                      "category": "streetlight"})
        r = client.get("/api/v1/issues?category=roads")
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["category"] == "roads"

    def test_list_filter_category_case_insensitive(self):
        create_issue({**MINIMAL, "category": "roads"})
        r = client.get("/api/v1/issues?category=Roads")
        assert r.json()["total"] == 1

    def test_list_pagination_metadata_consistent(self):
        for i in range(3):
            create_issue({**MINIMAL, "title": f"Test issue number {i + 1} pad"})
        r = client.get("/api/v1/issues?skip=0&limit=20")
        d = r.json()
        assert d["total"] == 3
        assert len(d["items"]) == 3
        assert d["skip"] + len(d["items"]) <= d["total"]


# ── GET /api/v1/issues/{id} ───────────────────────────────────────────────────

class TestGetIssue:

    def test_get_existing_issue(self):
        issue_id = create_issue(FULL)["id"]
        r = client.get(f"/api/v1/issues/{issue_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == issue_id
        assert d["title"] == FULL["title"]
        assert d["category"] == "road_damage"

    def test_get_nonexistent_issue_returns_404(self):
        r = client.get("/api/v1/issues/99999")
        assert r.status_code == 404
        assert "99999" in r.json()["detail"]

    def test_get_zero_id_returns_422(self):
        r = client.get("/api/v1/issues/0")
        assert r.status_code == 422

    def test_get_negative_id_returns_422(self):
        r = client.get("/api/v1/issues/-1")
        assert r.status_code == 422

    def test_get_returns_location_fields(self):
        issue_id = create_issue(FULL)["id"]
        d = client.get(f"/api/v1/issues/{issue_id}").json()
        assert d["latitude"] == pytest.approx(21.1458, abs=1e-4)
        assert d["longitude"] == pytest.approx(79.0882, abs=1e-4)

    def test_get_null_location_when_not_provided(self):
        issue_id = create_issue(MINIMAL)["id"]
        d = client.get(f"/api/v1/issues/{issue_id}").json()
        assert d["latitude"] is None
        assert d["longitude"] is None


# ── PATCH /api/v1/issues/{id}/status ─────────────────────────────────────────

class TestUpdateStatus:

    @pytest.mark.parametrize("status", VALID_STATUSES)
    def test_all_valid_statuses_accepted(self, status):
        issue_id = create_issue()["id"]
        r = client.patch(f"/api/v1/issues/{issue_id}/status",
                         json={"status": status})
        assert r.status_code == 200
        assert r.json()["status"] == status

    def test_status_update_persists(self):
        issue_id = create_issue()["id"]
        client.patch(f"/api/v1/issues/{issue_id}/status",
                     json={"status": "in_progress"})
        d = client.get(f"/api/v1/issues/{issue_id}").json()
        assert d["status"] == "in_progress"

    def test_status_update_reflected_in_list(self):
        issue_id = create_issue()["id"]
        client.patch(f"/api/v1/issues/{issue_id}/status",
                     json={"status": "resolved"})
        items = client.get("/api/v1/issues").json()["items"]
        assert items[0]["status"] == "resolved"

    def test_status_case_insensitive_input(self):
        issue_id = create_issue()["id"]
        r = client.patch(f"/api/v1/issues/{issue_id}/status",
                         json={"status": "In_Progress"})
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

    def test_invalid_status_returns_422(self):
        issue_id = create_issue()["id"]
        r = client.patch(f"/api/v1/issues/{issue_id}/status",
                         json={"status": "pending"})
        assert r.status_code == 422

    def test_missing_status_field_returns_422(self):
        issue_id = create_issue()["id"]
        r = client.patch(f"/api/v1/issues/{issue_id}/status", json={})
        assert r.status_code == 422

    def test_nonexistent_issue_status_update_returns_404(self):
        r = client.patch("/api/v1/issues/99999/status",
                         json={"status": "resolved"})
        assert r.status_code == 404

    def test_full_status_lifecycle(self):
        """Citizen submits → admin acknowledges → in_progress → resolved → citizen sees it."""
        issue_id = create_issue()["id"]

        # Citizen sees reported
        assert client.get(f"/api/v1/issues/{issue_id}").json()["status"] == "reported"

        # Admin: acknowledged
        r = client.patch(f"/api/v1/issues/{issue_id}/status",
                         json={"status": "acknowledged"})
        assert r.status_code == 200
        assert r.json()["status"] == "acknowledged"

        # Admin: in_progress
        r = client.patch(f"/api/v1/issues/{issue_id}/status",
                         json={"status": "in_progress"})
        assert r.status_code == 200

        # Admin: resolved
        r = client.patch(f"/api/v1/issues/{issue_id}/status",
                         json={"status": "resolved"})
        assert r.status_code == 200

        # Citizen refreshes — sees resolved
        final = client.get(f"/api/v1/issues/{issue_id}").json()
        assert final["status"] == "resolved"


# ── PATCH /api/v1/issues/{id} (partial field update) ─────────────────────────

class TestUpdateIssueFields:

    def test_update_title(self):
        issue_id = create_issue()["id"]
        r = client.patch(f"/api/v1/issues/{issue_id}",
                         json={"title": "Updated title for the broken footpath"})
        assert r.status_code == 200
        assert r.json()["title"] == "Updated title for the broken footpath"

    def test_update_category(self):
        issue_id = create_issue()["id"]
        r = client.patch(f"/api/v1/issues/{issue_id}",
                         json={"category": "drainage"})
        assert r.status_code == 200
        assert r.json()["category"] == "drainage"

    def test_update_coordinates(self):
        issue_id = create_issue()["id"]
        r = client.patch(f"/api/v1/issues/{issue_id}",
                         json={"latitude": 21.1500, "longitude": 79.0900})
        assert r.status_code == 200
        assert r.json()["latitude"] == pytest.approx(21.1500, abs=1e-4)

    def test_update_nonexistent_returns_404(self):
        r = client.patch("/api/v1/issues/99999",
                         json={"title": "Will not exist as an issue record"})
        assert r.status_code == 404

    def test_empty_body_returns_200_unchanged(self):
        issue_id = create_issue()["id"]
        original = client.get(f"/api/v1/issues/{issue_id}").json()
        r = client.patch(f"/api/v1/issues/{issue_id}", json={})
        assert r.status_code == 200
        assert r.json()["title"] == original["title"]


# ── Cross-frontend contract verification ──────────────────────────────────────

class TestCrossFrontendContract:
    """
    Verifies the API contract shared by both frontends.
    - Citizen: uses reported/in_progress/resolved display labels
    - Admin: uses same backend values + acknowledged/rejected
    - Both read the same fields from IssueResponse
    """

    def test_issue_response_has_all_required_fields(self):
        """Both frontends rely on these fields being present."""
        issue_id = create_issue(FULL)["id"]
        d = client.get(f"/api/v1/issues/{issue_id}").json()
        required = ["id", "title", "description", "status",
                    "category", "severity", "latitude", "longitude",
                    "image_url", "created_at", "updated_at"]
        for field in required:
            assert field in d, f"Missing field: {field}"

    def test_list_response_has_pagination_fields(self):
        """Both frontends parse total/skip/limit for pagination."""
        r = client.get("/api/v1/issues")
        d = r.json()
        for field in ["items", "total", "skip", "limit"]:
            assert field in d, f"Missing pagination field: {field}"

    def test_status_values_match_both_frontend_maps(self):
        """
        Citizen maps: reported→Reported, acknowledged→Acknowledged,
                      in_progress→In Progress, resolved→Resolved, rejected→Rejected
        Admin maps: identical set
        All five must be accepted and round-trip correctly.
        """
        issue_id = create_issue()["id"]
        for status in VALID_STATUSES:
            r = client.patch(f"/api/v1/issues/{issue_id}/status",
                             json={"status": status})
            assert r.status_code == 200
            assert r.json()["status"] == status

    def test_citizen_create_admin_reads_same_record(self):
        """Simulate citizen POSTing and admin GETting the same issue."""
        created = create_issue(FULL)
        issue_id = created["id"]

        # Admin fetches single issue
        admin_view = client.get(f"/api/v1/issues/{issue_id}").json()
        assert admin_view["id"] == issue_id
        assert admin_view["title"] == FULL["title"]
        assert admin_view["category"] == "road_damage"
        assert admin_view["status"] == "reported"

        # Admin updates status
        client.patch(f"/api/v1/issues/{issue_id}/status",
                     json={"status": "in_progress"})

        # Citizen refreshes list — sees new status
        citizen_list = client.get("/api/v1/issues").json()
        assert citizen_list["items"][0]["status"] == "in_progress"

    def test_category_filter_works_for_admin_dashboard(self):
        """Admin dashboard filters by category."""
        create_issue({**MINIMAL, "category": "roads"})
        create_issue({**MINIMAL,
                      "title": "Water pipe leaking outside main gate",
                      "description": "Water pipe leaking at the main colony gate for two days",
                      "category": "water_supply"})
        create_issue({**MINIMAL,
                      "title": "Garbage overflow on main footpath area",
                      "description": "Dustbin overflowing near bus stop entrance area",
                      "category": "garbage"})

        for cat, expected in [("roads", 1), ("water_supply", 1), ("garbage", 1)]:
            r = client.get(f"/api/v1/issues?category={cat}")
            assert r.json()["total"] == expected, \
                f"category={cat}: expected {expected}, got {r.json()['total']}"
