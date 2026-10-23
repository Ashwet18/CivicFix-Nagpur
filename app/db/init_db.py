"""Database initialization script.

This module provides functionality to create initial database tables
using SQLAlchemy's metadata.create_all(). For production environments,
use Alembic migrations instead.

Usage:
    python -m app.db.init_db
"""

import sys
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError
from app.db.base import Base, import_models
from app.db.session import engine
from app.core.config import settings


def init_db() -> None:
    """Initialize the database by creating all tables.
    
    This function:
    1. Imports all models to register them with SQLAlchemy
    2. Creates all tables defined in the models
    3. Reports success or failure
    
    Note:
        This is suitable for development and initial setup.
        For production, use Alembic migrations to manage schema changes.
    
    Raises:
        OperationalError: If database connection fails
        ProgrammingError: If database doesn't exist or permissions are insufficient
    """
    print("=" * 60)
    print("CivicFix-Nagpur Database Initialization")
    print("=" * 60)
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Database: {settings.DATABASE_URL.split('@')[-1]}")  # Hide credentials
    print()
    
    try:
        # Test database connection
        print("Testing database connection...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        print("✓ Database connection successful")
        print()
        
        # Import all models
        print("Importing models...")
        import_models()
        print("✓ Models imported successfully")
        print()
        
        # Create all tables
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created successfully")
        print()
        
        # List created tables
        print("Created tables:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")
        print()
        
        print("=" * 60)
        print("Database initialization completed successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. For schema migrations, initialize Alembic:")
        print("   alembic init alembic")
        print()
        print("2. Configure alembic.ini with your database URL")
        print()
        print("3. Generate initial migration:")
        print("   alembic revision --autogenerate -m 'Initial migration'")
        print()
        print("4. Apply migrations:")
        print("   alembic upgrade head")
        print()
        
    except OperationalError as e:
        print("✗ Database connection failed!")
        print()
        print("Error details:")
        print(f"  {str(e)}")
        print()
        print("Possible causes:")
        print("  - PostgreSQL server is not running")
        print("  - Incorrect database credentials in .env file")
        print("  - Database host or port is incorrect")
        print("  - Network connectivity issues")
        print()
        print("Please verify:")
        print("  1. PostgreSQL is running: pg_ctl status")
        print("  2. Database exists: psql -l")
        print("  3. Credentials in .env match your PostgreSQL setup")
        sys.exit(1)
        
    except ProgrammingError as e:
        print("✗ Database access error!")
        print()
        print("Error details:")
        print(f"  {str(e)}")
        print()
        print("Possible causes:")
        print("  - Database 'civicfix_db' does not exist")
        print("  - User lacks permissions to create tables")
        print()
        print("To create the database:")
        print("  psql -U postgres -c 'CREATE DATABASE civicfix_db;'")
        sys.exit(1)
        
    except Exception as e:
        print("✗ Unexpected error occurred!")
        print()
        print("Error details:")
        print(f"  {type(e).__name__}: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    init_db()
