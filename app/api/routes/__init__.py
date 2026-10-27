"""API routes package."""

from app.api.routes.issues import router as issues_router
from app.api.routes.ml_predictions import router as ml_router

__all__ = ["issues_router", "ml_router"]
