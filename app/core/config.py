"""Application configuration management."""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""
    
    # Application
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/civicfix_db"
    )
    
    # API Security
    API_SECRET_KEY: str = os.getenv(
        "API_SECRET_KEY",
        "development-secret-key-change-in-production"
    )
    
    # CORS
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173"
    ).split(",")
    
    # ML Models
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./ml/models")
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT == "production"


# Global settings instance
settings = Settings()
