# AI-Powered Complaint Classification (Ollama)

## Overview

CivicFix-Nagpur classifies civic complaints into predefined categories using a
**locally running Ollama model** (`qwen2.5:3b` by default).  All inference
happens on the same machine as the backend — no complaint text is sent to any
external service, no API key is required, and there is no per-request cost.

Only complaint classification uses local AI.  Severity prediction and
duplicate detection use separate, independent ML components and are not
affected by the Ollama setup.

---

## Supported Categories

| Category | Description | Example complaints |
|---|---|---|
| `road_damage` | Road infrastructure issues | Potholes, cracks, damaged dividers |
| `garbage` | Waste management issues | Uncollected garbage, illegal dumping |
| `water_supply` | Water supply problems | Pipe bursts, leaks, supply disruption |
| `drainage` | Drainage and flooding issues | Blocked drains, waterlogging |
| `streetlight` | Street lighting problems | Non-functional lights, damaged poles |
| `electricity` | Electrical issues | Power outages, dangerous live wires |
| `sanitation` | Public sanitation problems | Dirty public toilets, overflowing sewage |
| `public_safety` | Public safety concerns | Broken footpaths, missing manhole covers |
| `other` | Miscellaneous issues | Issues that don't fit any category above |

### Backward-Compatible Aliases

Existing records and API consumers that use older category strings are still
supported — they are normalised automatically:

| Alias | Resolves to |
|---|---|
| `roads`, `road` | `road_damage` |
| `water` | `water_supply` |
| `drain` | `drainage` |
| `lights`, `street_light` | `streetlight` |
| `waste`, `trash` | `garbage` |
| `safety` | `public_safety` |
| `sewer` | `drainage` |

---

## Prerequisites

1. **Install Ollama** — download from <https://ollama.com/download>  
   (Available for macOS, Linux, and Windows.)

2. **Pull the model**

   ```powershell
   ollama pull qwen2.5:3b
   ```

3. **Start the Ollama server**

   ```powershell
   ollama serve
   ```

   By default the server listens on `http://localhost:11434`.  You can verify
   it is running with:

   ```powershell
   Invoke-RestMethod http://localhost:11434/
   ```

   The response should be `Ollama is running`.

---

## Configuration

All settings have sensible defaults; you only need to override them in `.env`
if your setup differs.

```bash
# Local AI Classification (Ollama)
OLLAMA_BASE_URL=http://localhost:11434   # Ollama server URL
OLLAMA_MODEL=qwen2.5:3b                 # Model tag to use
OLLAMA_TIMEOUT=30                        # HTTP request timeout (seconds)
```

No `AI_API_KEY` or external credentials are needed.

---

## API Reference

### Endpoint

```
POST /api/v1/ml/classify
```

### Request

```json
{
  "title": "Large pothole on MG Road near City Mall",
  "description": "There is a huge pothole about 2 feet wide causing vehicle damage."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | yes | 1 – 500 chars |
| `description` | string | yes | 1 – 5000 chars |

### Successful response

```json
{
  "predicted_category": "road_damage",
  "confidence": 0.0,
  "model_version": "ollama-qwen2.5:3b",
  "status": "success"
}
```

### Error / unavailable response

```json
{
  "predicted_category": null,
  "confidence": 0.0,
  "model_version": "ollama-qwen2.5:3b",
  "status": "model_unavailable"
}
```

### Status values

| Status | Meaning |
|---|---|
| `success` | Classification completed; `predicted_category` is a valid category. |
| `model_unavailable` | Ollama server is not running or unreachable. |
| `error` | Ollama responded but returned malformed JSON, an invalid category, or an HTTP error. |

### Confidence field

`confidence` is always `0.0`.  The local model does not emit calibrated
probability values.  The field is retained for API compatibility; it should
not be interpreted as a statistical probability.

### Example curl

```bash
curl -X POST http://localhost:8000/api/v1/ml/classify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Garbage not collected for 5 days",
    "description": "Municipal trucks have not arrived. Waste is piling up."
  }'
```

---

## Setup and Verification

### 1. Install dependencies

```powershell
pip install -r requirements.txt
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env
# Open .env — the default Ollama values need no changes for a local setup
```

### 3. Start Ollama

```powershell
ollama serve
```

### 4. Verify Ollama is reachable

```powershell
Invoke-RestMethod http://localhost:11434/
# Expected: "Ollama is running"
```

### 5. Start the FastAPI server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Test the endpoint

```powershell
Invoke-RestMethod -Method POST http://localhost:8000/api/v1/ml/classify `
  -ContentType "application/json" `
  -Body '{"title":"Broken street light","description":"Street light on Wardha Road not working for 2 weeks"}'
```

---

## Running Tests

All tests mock Ollama HTTP responses — no running server or pulled model is
required.

```powershell
# Classification unit tests (41 tests)
pytest tests/test_ai_classification.py -v

# ML endpoint integration tests (19 tests)
pytest tests/test_ml_predictions.py -v

# Full backend suite
pytest -v
```

Test coverage includes:
- All 9 valid categories
- All error paths: connection refused, timeout, HTTP 4xx/5xx
- Malformed JSON, missing fields, invalid category values
- Embedded JSON extraction fallback
- Category alias normalisation
- Configuration propagation (URL, model, timeout)

---

## Evaluation

The evaluation script runs the live Ollama model against a 25-example
human-reviewed dataset and reports accuracy, per-category precision / recall /
F1, and a confusion matrix.

```powershell
# Ollama must be running and the model must be pulled first
python -m ml.evaluation.evaluate_classification
```

**Important**: A 25-example dataset is a preliminary check only.  The results
are indicative and are not sufficient evidence of production readiness.
A statistically meaningful evaluation requires several hundred labelled examples
that were not used during prompt design.  Accuracy numbers are not reported
here because the evaluation has not yet been run against the live model.

---

## Troubleshooting

### `status: model_unavailable`

Ollama is not running or the server URL is wrong.

```powershell
# Check if Ollama is running
Invoke-RestMethod http://localhost:11434/

# Start it if not
ollama serve
```

If the server is on a different host or port, update `OLLAMA_BASE_URL` in
`.env`.

### `status: error` with valid input

The model returned an unrecognised category or malformed JSON.

- Ensure the model is fully pulled: `ollama pull qwen2.5:3b`
- Try a different (larger) model: set `OLLAMA_MODEL=qwen2.5:7b` in `.env`
- Check Ollama logs for model-side errors: `ollama serve` output in terminal

### Slow classification

The first request after `ollama serve` may be slow while the model loads into
memory.  Subsequent requests are faster.  Increase `OLLAMA_TIMEOUT` if needed.

### Wrong model

```powershell
# List available local models
ollama list

# Pull a different model
ollama pull mistral:7b
# Then set OLLAMA_MODEL=mistral:7b in .env
```

---

## Architecture Notes

| Component | Technology | Uses Ollama? |
|---|---|---|
| Complaint classification | Ollama `qwen2.5:3b` (local AI) | **Yes** |
| Severity prediction | scikit-learn ML model | No |
| Duplicate detection | TF-IDF + Haversine distance | No |

Only the classification component communicates with Ollama.  The other two
components are entirely independent.

---

## Future Enhancements

- Multi-language support (Hindi / Marathi)
- Image-based classification using a vision-capable Ollama model
- Confidence estimation through ensemble or sampling methods
- Active learning from admin-reviewed corrections
- Batch classification for bulk imports
