"""Shared pytest fixtures for the CivicFix-Nagpur test suite.

Root cause of the previous test-isolation failures
----------------------------------------------------
Both ``test_issues.py`` and ``test_ml_predictions.py`` used to register
``app.dependency_overrides[get_db]`` at *module import time*, each pointing
to a *different* in-memory SQLite engine backed by ``StaticPool``.

When pytest collected both modules in the same session, the second module
to be imported silently overwrote the first module's override.  After that,
``test_issues.py``'s ``clean_database`` fixture deleted rows from the engine
that was currently registered (the *ml_predictions* engine), while the
``TestClient`` requests routed to the same engine — but that engine held no
rows from the *issues* test setup.  The result was five ``TestListIssues``
failures that only appeared when both modules ran together.

Fix
---
This ``conftest.py`` owns **one** canonical test engine and one
``override_get_db`` function.  A session-scoped ``autouse`` fixture registers
the override *once* before the first test and leaves it in place for the
entire pytest session.  A function-scoped ``clean_database`` fixture truncates
the ``issues`` table before every individual test so there is no state leakage
between tests.

Both ``test_issues.py`` and ``test_ml_predictions.py`` import their
``client``, ``TestingSessionLocal``, and ``clean_database`` from here instead
of defining their own.
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

# ---------------------------------------------------------------------------
# Single shared in-memory SQLite engine for the whole test suite
# ---------------------------------------------------------------------------
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)

# Create all tables once
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    """FastAPI dependency override: yield a session from the test engine."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Session-scoped fixture: register the DB override once for the whole run
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _register_db_override():
    """Register the test DB override before any test runs.

    Restores the original (empty) overrides dict after the session ends so
    that the app object is left clean for any future test sessions that reuse
    the same process.
    """
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Shared test client
# ---------------------------------------------------------------------------
# Created after the module-level override assignment above so it inherits it.
client = TestClient(app)


# ---------------------------------------------------------------------------
# Function-scoped fixture: wipe the issues table before every test
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def clean_database():
    """Delete all Issue rows before each test to prevent state leakage.

    The ``autouse=True`` means this runs for *every* test in the suite
    automatically.  Tests that don't touch the DB are unaffected (the
    DELETE is a no-op on an empty table).
    """
    db = TestingSessionLocal()
    try:
        db.execute(delete(Issue))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield
