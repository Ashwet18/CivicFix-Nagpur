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
- Tracking issue resolution status and resolution progress

### Key Features
- **Issue Reporting**: Citizens can report civic issues with descriptions, images, and location data
- **AI-Powered Classification**: Automatic categorization of issues using a local Ollama model — no API key required (roads, sanitation, electricity, water, etc.)
- **Severity Estimation**: ML-based severity assessment to prioritize critical issues
- **Duplicate Detection**: Intelligent detection of similar/duplicate issue reports using location and text similarity
- **Resolution Tracking**: Real-time tracking of issue status and resolution progress
- **Admin Dashboard**: Management interface for municipal authorities
- **Analytics**: Insights and trends in civic issue reporting and resolution

## Technology Stack

### Backend (Dev1)
- **FastAPI**: Modern, high-performance web framework for building APIs
- **Python 3.11+**: Core programming language
- **PostgreSQL**: Relational database for structured data storage
- **SQLAlchemy**: ORM for database interactions

### Machine Learning (Dev1)
- **Scikit-learn**: Classification and traditional ML algorithms
- **TensorFlow/PyTorch**: Deep learning models (to be implemented)
- **Transformers**: NLP models for text classification
- **spaCy**: Natural language processing

### Frontend (Dev2)
- **React Native + Expo**: Cross-platform citizen mobile app (iOS/Android/Web)
- **React + Vite**: Admin web dashboard
- **Expo Router**: File-based navigation
- **JavaScript**: Frontend language

### Development Tools
- **pytest**: Testing framework
- **uvicorn**: ASGI server for FastAPI
- **python-dotenv**: Environment variable management

## Project Structure
```
CivicFix-Nagpur/
│
├── app/                      # FastAPI application (Dev1)
│   ├── main.py              # Entry point
│   ├── api/routes/          # API route handlers
│   ├── core/                # Configuration and utilities
│   ├── db/                  # Database configuration
│   ├── models/              # Database models
│   ├── schemas/             # Pydantic schemas
│   └── services/            # Business logic
│
├── ml/                       # Machine learning modules (Dev1)
│   ├── classification/      # Issue classification models
│   ├── severity/            # Severity estimation models
│   ├── duplicate_detection/ # Duplicate detection algorithms
│   └── evaluation/          # Model evaluation utilities
│
├── citizen-app/              # React Native Expo app (Dev2)
│   ├── app/                 # Expo Router screens
│   │   ├── (auth)/          # Login & registration
│   │   ├── (tabs)/          # Home, Report, Complaints
│   │   └── complaint/       # Complaint detail [id]
│   ├── components/          # Reusable UI components
│   ├── context/             # Auth & complaints contexts
│   └── constants/           # Colour palette, config
│
├── admin-dashboard/          # React + Vite web dashboard (Dev2)
│   └── src/
│       ├── components/      # Sidebar, Topbar
│       └── pages/           # Dashboard, Complaints, Departments
│
├── tests/                    # Backend test suite (Dev1)
├── datasets/                 # Training datasets (Dev1)
├── .env.example             # Environment configuration template
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## Prerequisites
- **Python 3.11 or newer** (backend)
- **Node.js v18+** (frontend)
- **Git**
- **PostgreSQL** (to be configured later)

## Setup Instructions

### Backend (Dev1)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env if Ollama runs on a non-default URL (default: http://localhost:11434)

# Start the Ollama server and pull the classification model (one-time setup)
# 1. Install Ollama: https://ollama.com/download
# 2. ollama pull qwen2.5:3b
# 3. ollama serve

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API available at http://localhost:8000 | Swagger docs: http://localhost:8000/docs

**Configuration**: See `.env.example` for all options. See [AI Classification Documentation](docs/AI_CLASSIFICATION.md) for Ollama setup details.

### Citizen App (Dev2)
```powershell
cd citizen-app
npm install
npx expo start
```
Scan QR code with Expo Go app, or press `w` for browser at http://localhost:8081

### Admin Dashboard (Dev2)
```powershell
cd admin-dashboard
npm install
npm run dev
```
Opens at http://localhost:5174

## API Endpoints

### Current Endpoints
| Method | Endpoint   | Description                    |
|--------|-----------|--------------------------------|
| GET    | `/`       | Welcome message and API status |
| GET    | `/health` | Health check for monitoring    |

### ML Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ml/classify` | Classify complaint category using local Ollama AI |
| POST | `/api/v1/ml/predict-severity` | Predict issue severity (ML model) |
| POST | `/api/v1/ml/detect-duplicates` | Find duplicate complaints using location and text similarity |

**See [AI Classification Documentation](docs/AI_CLASSIFICATION.md) for Ollama setup and API details.**

### Planned Endpoints (Dev1)
- `POST /api/v1/issues` — Create a new issue report
- `GET /api/v1/issues` — List all issues with filtering
- `GET /api/v1/issues/{id}` — Get issue details
- `PATCH /api/v1/issues/{id}` — Update issue status
- `POST /api/v1/auth/login` — User authentication
- `GET /api/v1/analytics` — Issue analytics and trends

## Development Workflow

### Git Workflow
1. Pull latest changes: `git pull origin main`
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit regularly with descriptive messages
4. Push branch: `git push origin feature/your-feature-name`
5. Create a Pull Request for code review
6. Merge to main after approval

### Branch Naming Convention
- `feature/` — New features
- `bugfix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring

## Team Responsibilities

### Dev1 (Backend & ML)
- FastAPI backend, database design, ML models
- Issue classification, severity estimation, duplicate detection

### Dev2 (Frontend)
- Citizen mobile app (React Native + Expo)
- Admin dashboard (React + Vite)
- Integration with backend API

## Running Tests

```powershell
# Backend tests (no Ollama server or API key needed — all tests use mocks)
pytest

# Run specific test modules
pytest tests/test_ai_classification.py -v   # 41 Ollama classification tests
pytest tests/test_duplicate_detection.py -v # 22 duplicate detection tests

# With coverage
pytest --cov=app --cov=ml
```

## AI Classification Evaluation

Requires Ollama to be running with `qwen2.5:3b` pulled. Makes real model calls.

```powershell
# Ensure Ollama is running: ollama serve
python -m ml.evaluation.evaluate_classification
```

See [AI Classification Documentation](docs/AI_CLASSIFICATION.md) for full setup and troubleshooting.

## License
[To be determined]
