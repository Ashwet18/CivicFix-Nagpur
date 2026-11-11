"""
Runtime flow verification test.
Uses the same in-memory SQLite override as the existing test suite.
Verifies the full citizen → admin → citizen status update cycle.
"""
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.session import get_db
from app.db.base import Base

# In-memory SQLite — same approach as tests/test_issues.py
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app, raise_server_exceptions=False)

results = []


def step(name, passed, detail=""):
    mark = "PASS" if passed else "FAIL"
    msg = f"[{mark}] {name}"
    if detail:
        msg += f" — {detail}"
    results.append((passed, msg))
    print(msg)


def test_runtime_flow():
    # ── 1. Health ──────────────────────────────────────────────────────────
    r = client.get("/health")
    step("GET /health", r.status_code == 200,
         f"status={r.status_code} db={r.json().get('database')}")

    # ── 2. Empty list ─────────────────────────────────────────────────────
    r = client.get("/api/v1/issues")
    step("GET /api/v1/issues (empty)", r.status_code == 200 and r.json()["total"] == 0,
         f"total={r.json().get('total')}")

    # ── 3. Citizen submits a complaint ────────────────────────────────────
    payload = {
        "title": "Pothole on MG Road near Sitabuldi",
        "description": "Large pothole causing traffic hazard near main junction",
        "category": "road_damage",
        "latitude": 21.1458,
        "longitude": 79.0882,
    }
    r = client.post("/api/v1/issues", json=payload)
    step("POST /api/v1/issues (citizen creates complaint)",
         r.status_code == 201,
         f"status={r.status_code} id={r.json().get('id')} backend_status={r.json().get('status')}")
    issue = r.json()
    issue_id = issue["id"]

    # ── 4. Citizen reads complaint list ───────────────────────────────────
    r = client.get("/api/v1/issues")
    items = r.json()["items"]
    step("GET /api/v1/issues (citizen complaint list)",
         r.status_code == 200 and len(items) == 1,
         f"total={r.json()['total']} first_status={items[0]['status'] if items else 'none'}")

    # ── 5. Citizen views complaint detail ─────────────────────────────────
    r = client.get(f"/api/v1/issues/{issue_id}")
    d = r.json()
    step(f"GET /api/v1/issues/{issue_id} (citizen detail)",
         r.status_code == 200 and d.get("status") == "reported",
         f"status={d.get('status')} lat={d.get('latitude')} lon={d.get('longitude')}")

    # ── 6. Admin finds the same complaint ────────────────────────────────
    r = client.get("/api/v1/issues?status=reported")
    step("GET /api/v1/issues?status=reported (admin filter)",
         r.status_code == 200 and r.json()["total"] == 1,
         f"total={r.json()['total']}")

    # ── 7. Admin updates status to acknowledged ───────────────────────────
    r = client.patch(f"/api/v1/issues/{issue_id}/status",
                     json={"status": "acknowledged"})
    step(f"PATCH /api/v1/issues/{issue_id}/status → acknowledged (admin)",
         r.status_code == 200 and r.json().get("status") == "acknowledged",
         f"new_status={r.json().get('status')}")

    # ── 8. Admin updates status to in_progress ────────────────────────────
    r = client.patch(f"/api/v1/issues/{issue_id}/status",
                     json={"status": "in_progress"})
    step(f"PATCH /api/v1/issues/{issue_id}/status → in_progress (admin)",
         r.status_code == 200 and r.json().get("status") == "in_progress",
         f"new_status={r.json().get('status')}")

    # ── 9. Citizen refreshes — sees updated status ────────────────────────
    r = client.get(f"/api/v1/issues/{issue_id}")
    step(f"GET /api/v1/issues/{issue_id} (citizen refresh, expects in_progress)",
         r.status_code == 200 and r.json().get("status") == "in_progress",
         f"status={r.json().get('status')}")

    # ── 10. Admin updates status to resolved ─────────────────────────────
    r = client.patch(f"/api/v1/issues/{issue_id}/status",
                     json={"status": "resolved"})
    step(f"PATCH /api/v1/issues/{issue_id}/status → resolved (admin)",
         r.status_code == 200 and r.json().get("status") == "resolved",
         f"new_status={r.json().get('status')}")

    # ── 11. Citizen sees resolved ─────────────────────────────────────────
    r = client.get(f"/api/v1/issues/{issue_id}")
    step("GET detail (citizen sees resolved)",
         r.status_code == 200 and r.json().get("status") == "resolved",
         f"status={r.json().get('status')}")

    # ── 12. Second complaint ──────────────────────────────────────────────
    r = client.post("/api/v1/issues", json={
        "title": "Broken streetlight Wardha Road",
        "description": "Three streetlights not working near Shankar Nagar for two weeks",
        "category": "streetlight",
        "latitude": 21.1217,
        "longitude": 79.0746,
    })
    step("POST second complaint", r.status_code == 201,
         f"id={r.json().get('id')}")
    r2_id = r.json()["id"]

    # ── 13. Category filter ────────────────────────────────────────────────
    r = client.get("/api/v1/issues?category=streetlight")
    step("GET /api/v1/issues?category=streetlight",
         r.status_code == 200 and r.json()["total"] == 1,
         f"total={r.json()['total']}")

    # ── 14. Invalid status rejected ───────────────────────────────────────
    r = client.patch(f"/api/v1/issues/{r2_id}/status",
                     json={"status": "bogus_status"})
    step("PATCH invalid status → 422",
         r.status_code == 422,
         f"status={r.status_code}")

    # ── 15. Final list ─────────────────────────────────────────────────────
    r = client.get("/api/v1/issues")
    total = r.json()["total"]
    step("Final GET /api/v1/issues (2 complaints total)",
         r.status_code == 200 and total == 2,
         f"total={total}")

    # Summary
    passed = sum(1 for ok, _ in results if ok)
    failed = sum(1 for ok, _ in results if not ok)
    print(f"\n{'='*50}")
    print(f"RESULT: {passed} passed, {failed} failed out of {len(results)} steps")
    print("="*50)
    assert failed == 0, f"{failed} runtime flow steps failed"


if __name__ == "__main__":
    test_runtime_flow()
