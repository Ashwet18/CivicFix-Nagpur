# CivicFix-Nagpur

An AI-powered civic issue reporting, prioritization, and resolution tracking platform for Nagpur city.

## Overview

CivicFix-Nagpur is a comprehensive platform designed to streamline civic issue management by enabling citizens to report problems, automatically classify and prioritize issues using machine learning, detect duplicates, and track resolutions efficiently.

### Problem Statement

Citizens often struggle to report civic issues effectively, and municipal authorities face challenges in prioritizing and tracking the resolution of these issues. CivicFix-Nagpur addresses these challenges by:

- Providing an easy-to-use interface for reporting civic issues
- Automatically classifying issues into appropriate categories
- Estimating issue severity using AI models
- Detecting duplicate reports to reduce redundancy
- Tracking issue resolution status and progress

### Key Features

- **Issue Reporting**: Citizens can report civic issues with descriptions, images, and location data
- **AI-Powered Classification**: Automatic categorization of issues (roads, sanitation, electricity, water, etc.)
- **Severity Estimation**: ML-based severity assessment to prioritize critical issues
- **Duplicate Detection**: Intelligent detection of similar/duplicate issue reports
- **Resolution Tracking**: Real-time tracking of issue status and resolution progress
- **Admin Dashboard**: Management interface for municipal authorities
- **Analytics**: Insights and trends in civic issue reporting and resolution

## Technology Stack

### Backend
- **FastAPI**: Modern, high-performance web framework for building APIs
- **Python 3.11+**: Core programming language
- **PostgreSQL**: Relational database for structured data storage
- **SQLAlchemy**: ORM for database interactions

### Machine Learning
- **Scikit-learn**: Classification and traditional ML algorithms
- **TensorFlow/PyTorch**: Deep learning models (to be implemented)
- **Transformers**: NLP models for text classification
- **spaCy**: Natural language processing

### Development Tools
- **pytest**: Testing framework
- **uvicorn**: ASGI server for FastAPI
- **python-dotenv**: Environment variable management

## Project Structure

```
CivicFix-Nagpur/
│
├── app/                      # Main application package
│   ├── main.py              # FastAPI application entry point
│   ├── api/                 # API layer
│   │   └── routes/          # API route handlers
│   ├── core/                # Core configuration and utilities
│   ├── db/                  # Database configuration
│   ├── models/              # Database models
│   ├── schemas/             # Pydantic schemas for validation
│   └── services/            # Business logic layer
│
├── ml/                       # Machine learning modules
│   ├── classification/      # Issue classification models
│   ├── severity/            # Severity estimation models
│   ├── duplicate_detection/ # Duplicate detection algorithms
│   └── evaluation/          # Model evaluation utilities
│
├── tests/                    # Test suite
├── datasets/                 # Training and evaluation datasets
├── .env.example             # Example environment configuration
├── .gitignore               # Git ignore rules
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## Prerequisites

- **Python 3.11 or newer**
- **Git** (for version control)
- **PostgreSQL** (for database, to be configured later)
- **Virtual environment** (recommended)

## Setup Instructions

### 1. Clone the Repository

If you haven't already cloned the repository:

```powershell
git clone <repository-url>
cd CivicFix-Nagpur
```

### 2. Create and Activate Virtual Environment

**Windows PowerShell:**

```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1
```

If you encounter an execution policy error, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the example environment file and configure it:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your actual configuration values. **Never commit the `.env` file to Git.**

### 5. Run the Development Server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Root**: http://localhost:8000
- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Alternative API Docs (ReDoc)**: http://localhost:8000/redoc

## API Endpoints

### Current Endpoints

| Method | Endpoint   | Description                          |
|--------|-----------|--------------------------------------|
| GET    | `/`       | Welcome message and API status       |
| GET    | `/health` | Health check for monitoring          |

### Planned Endpoints

- `POST /api/v1/issues` - Create a new issue report
- `GET /api/v1/issues` - List all issues with filtering
- `GET /api/v1/issues/{id}` - Get issue details
- `PATCH /api/v1/issues/{id}` - Update issue status
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/analytics` - Issue analytics and trends

## Testing the API

### Using a Web Browser

Navigate to:
- http://localhost:8000 - See the welcome message
- http://localhost:8000/health - Check health status
- http://localhost:8000/docs - Interactive API documentation

### Using PowerShell (Invoke-WebRequest)

```powershell
# Test root endpoint
Invoke-WebRequest -Uri http://localhost:8000 -Method GET

# Test health endpoint
Invoke-WebRequest -Uri http://localhost:8000/health -Method GET
```

### Using curl (if installed)

```powershell
# Test root endpoint
curl http://localhost:8000

# Test health endpoint
curl http://localhost:8000/health
```

## Development Workflow

### Git Workflow for Collaborative Development

1. **Before starting work, pull the latest changes:**
   ```powershell
   git pull origin main
   ```

2. **Create a feature branch:**
   ```powershell
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes and commit regularly:**
   ```powershell
   git add .
   git commit -m "Descriptive commit message"
   ```

4. **Push your branch to GitHub:**
   ```powershell
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request on GitHub for code review**

6. **After review and approval, merge to main**

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-issue-classification`)
- `bugfix/` - Bug fixes (e.g., `bugfix/fix-duplicate-detection`)
- `docs/` - Documentation updates (e.g., `docs/update-api-docs`)
- `refactor/` - Code refactoring (e.g., `refactor/optimize-ml-pipeline`)

## Running Tests

Once tests are implemented:

```powershell
pytest
```

Run tests with coverage:

```powershell
pytest --cov=app --cov=ml
```

## Machine Learning Development

The ML modules (`ml/classification`, `ml/severity`, `ml/duplicate_detection`) are currently placeholders and will be implemented incrementally. Each module will include:

- Data preprocessing pipelines
- Model training scripts
- Evaluation metrics
- Model versioning and storage
- Inference endpoints

See `datasets/README.md` for information about datasets and training data.

## Contributing

This is a collaborative project. Team members should:

1. Communicate changes and coordinate work through issues and pull requests
2. Follow Python coding conventions (PEP 8)
3. Write tests for new features
4. Document code and API endpoints
5. Review pull requests from other team members
6. Keep the README and documentation up to date

## Team Responsibilities

### Dev1 (Backend & ML)
- Backend API development
- Database design and integration
- ML model development and evaluation
- Issue classification, severity estimation, duplicate detection

### Dev2 (Frontend)
- User interface for issue reporting
- Citizen-facing web application
- Integration with backend API

### Dev3 (Admin Dashboard)
- Admin interface for municipal authorities
- Issue management and tracking features
- Analytics and reporting dashboards

## Next Steps

1. **Database Setup**: Configure PostgreSQL and create database models
2. **Authentication**: Implement user authentication and authorization
3. **Issue Management API**: Build CRUD endpoints for civic issues
4. **ML Pipeline**: Develop and train classification models
5. **Frontend Integration**: Connect with frontend applications
6. **Testing**: Write comprehensive test suite
7. **Deployment**: Set up CI/CD and production environment

## License

[To be determined]

## Contact

For questions or collaboration, contact the development team.

---

**Note**: This is an early-stage project. Features and documentation will be expanded as development progresses.
