"""Application configuration management."""

import os
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
        "http://localhost:3000,http://localhost:5173,http://localhost:5174,"
        "http://localhost:8081,http://127.0.0.1:3000,http://127.0.0.1:5173,"
        "http://127.0.0.1:5174,http://127.0.0.1:8081"
    ).split(",")
    
    # ML Models
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./ml/models")
    
    # Local AI Classification (Ollama)
    # Classification uses a locally running Ollama model — no API key required.
    # Install Ollama: https://ollama.com/download
    # Pull model:    ollama pull qwen2.5:3b
    # Start server:  ollama serve
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "30"))

    # Duplicate Detection
    DUPLICATE_SEARCH_RADIUS_METERS: int = int(
        os.getenv("DUPLICATE_SEARCH_RADIUS_METERS", "20")
    )

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
