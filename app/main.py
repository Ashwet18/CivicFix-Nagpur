"""FastAPI application entry point for CivicFix-Nagpur."""

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict
from app.db.session import get_db
from app.api.routes import issues_router

app = FastAPI(
    title="CivicFix-Nagpur API",
    description=(
        "AI-powered civic issue reporting, prioritization, and resolution tracking platform "
        "for Nagpur city. This API enables citizens to report civic issues, uses machine learning "
        "to classify and prioritize them, and helps track their resolution."
    ),
    version="0.1.0",
)

# Register API routers
app.include_router(issues_router)


@app.get("/", response_model=Dict[str, str])
async def root() -> Dict[str, str]:
    """
    Welcome endpoint providing basic API information.
    
    Returns:
        dict: Welcome message and application status
    """
    return {
        "message": "Welcome to CivicFix-Nagpur API",
        "status": "active",
        "version": "0.1.0",
        "description": "AI-powered civic issue management platform for Nagpur"
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Health check endpoint for monitoring application and database status.
    
    Executes a lightweight database query to verify connectivity.
    Returns HTTP 200 when healthy, HTTP 503 when database is unavailable.
    
    Args:
        db: Database session injected by FastAPI dependency
    
    Returns:
        dict: Health status of the application and database
        
    Raises:
        HTTPException: 503 error if database is unavailable
    """
    try:
        # Execute lightweight database query
        result = db.execute(text("SELECT 1"))
        result.fetchone()
        
        return {
            "status": "healthy",
            "service": "CivicFix-Nagpur API",
            "database": "connected"
        }
    except Exception as e:
        # Log error internally but don't expose details to clients
        # In production, use proper logging instead of print
        print(f"Database health check failed: {type(e).__name__}")
        
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "service": "CivicFix-Nagpur API",
                "database": "disconnected"
            }
        )
