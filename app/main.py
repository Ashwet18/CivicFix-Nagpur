"""FastAPI application entry point for CivicFix-Nagpur."""

from fastapi import FastAPI
from typing import Dict

app = FastAPI(
    title="CivicFix-Nagpur API",
    description=(
        "AI-powered civic issue reporting, prioritization, and resolution tracking platform "
        "for Nagpur city. This API enables citizens to report civic issues, uses machine learning "
        "to classify and prioritize them, and helps track their resolution."
    ),
    version="0.1.0",
)


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


@app.get("/health", response_model=Dict[str, str])
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint for monitoring application status.
    
    Returns:
        dict: Health status of the application
    """
    return {
        "status": "healthy",
        "service": "CivicFix-Nagpur API"
    }
