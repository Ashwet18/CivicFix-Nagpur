# CivicFix-Nagpur — Backend Category Contract

This document is the authoritative reference for complaint category identifiers.
It is intended for:

- **Dev 1 (backend)** — implementing validation, filtering, and normalization.
- **Dev 2 (frontend)** — aligning picker IDs and display labels with the backend
  before Stage 4 API integration.
- **QA / evaluators** — understanding what values the classifier returns.

---

## Canonical category identifiers

These are the exact string values returned by the classification endpoint and
stored in the `issues.category` database column.

| Identifier | Meaning | Typical complaints |
|---|---|---|
| `road_damage` | Vehicle carriageway damage | Potholes, road cracks, damaged speed breakers, broken road dividers |
| `garbage` | Solid waste not collected or illegally dumped | Missed collection, overflowing bins, illegal construction-debris dumping |
| `water_supply` | Drinking-water network fault | Pipe bursts, low pressure, supply disruption, water-meter errors, contamination |
| `drainage` | Storm-water / wastewater drainage failure | Blocked drains, waterlogging, stagnant water, missing manhole covers, mosquito breeding |
| `streetlight` | Public road-lighting streetlight fault | Non-functional streetlight poles, flickering fixtures |
| `electricity` | Electrical power supply / infrastructure fault | Power outages, hanging live wires, overheating transformers |
| `sanitation` | Public sanitation facility dirty or broken | Dirty/broken public toilets, overflowing septic tanks |
| `public_safety` | Immediate pedestrian or public hazard | Broken footpaths/pavements, stray animal attacks, unsafe construction encroachments |
| `other` | Does not fit a single specific category | Traffic signal faults, general park maintenance, cross-departmental issues |

---

## Supported aliases (backward compatibility)

The `normalize_category()` function in `ml/classification/categories.py` maps
these legacy strings to their canonical equivalents.  The mapping is applied
inside the classification predictor before any value is returned or stored via
the ML endpoint.

| Alias | Resolves to |
|---|---|
| `roads`, `road` | `road_damage` |
| `water` | `water_supply` |
| `drain`, `sewer` | `drainage` |
| `lights`, `street_light` | `streetlight` |
| `waste`, `trash` | `garbage` |
| `safety` | `public_safety` |

**Important:** the `issues` table stores whichever string the client sends
at creation time.  It does **not** auto-normalize on write.  Existing records
that contain `"roads"` or `"water"` remain valid; the alias table above
describes what `normalize_category()` can convert, not what the DB guarantees.

---

## Classification API — `/api/v1/ml/classify`

### Request

```json
POST /api/v1/ml/classify
Content-Type: application/json

{
  "title": "string  (1–500 chars, required)",
  "description": "string  (1–5000 chars, required)"
}
```

### Successful response

```json
{
  "predicted_category": "road_damage",
  "confidence": 0.0,
  "model_version": "ollama-qwen2.5:3b",
  "status": "success"
}
```

### Unavailable / error response

```json
{
  "predicted_category": null,
  "confidence": 0.0,
  "model_version": "ollama-qwen2.5:3b",
  "status": "model_unavailable"
}
```

### Status values

| `status` | Meaning |
|---|---|
| `success` | `predicted_category` holds a canonical identifier. |
| `model_unavailable` | Ollama server is not reachable; `predicted_category` is `null`. |
| `error` | Ollama responded but returned invalid output; `predicted_category` is `null`. |

### Confidence field

`confidence` is always `0.0`.  The local model does not produce calibrated
probability values.  The field is kept for API schema compatibility; consumers
must not treat it as a statistical probability.

### No API key required

Classification runs entirely on the local Ollama server.  No external AI
provider is used and no API key is needed.

---

## Issue creation — `/api/v1/issues` (POST)

The `category` field is `Optional[str]` with no server-side validation against
the canonical set.  Any string up to 100 characters is accepted and stored
verbatim.

**Current behavior:** if a client submits `"roads"`, that string is stored
as-is. If the ML endpoint later classifies a similar complaint as
`"road_damage"`, the two records have different `category` values.

**Recommended Stage 4 change (backend only):**
Normalize the `category` field in `create_issue()` before persisting:

```python
from ml.classification.categories import normalize_category, is_valid_category

if issue_data.category and is_valid_category(issue_data.category):
    issue_data.category = normalize_category(issue_data.category)
```

This preserves backward compatibility (all aliases resolve to canonical values)
while making new records consistent.

---

## Issue filtering — `/api/v1/issues?category=<value>`

The current filter is an exact string match:

```python
query = query.where(Issue.category == category)
```

This means `?category=road_damage` will not return rows stored as `"roads"`,
and vice versa.

**Recommended Stage 4 change (backend only):**
Normalize the query parameter before filtering:

```python
from ml.classification.categories import normalize_category, is_valid_category

if category:
    try:
        normalized = normalize_category(category)
        query = query.where(Issue.category == normalized)
    except ValueError:
        # Unknown category — return empty result rather than crash
        return {"items": [], "total": 0, "skip": skip, "limit": limit}
```

---

## Frontend integration notes (for Dev 2)

The citizen-app `CategoryPicker.jsx` currently uses these picker IDs:

| Picker `id` | Backend canonical equivalent | Status |
|---|---|---|
| `pothole` | `road_damage` | **Mismatch** — `pothole` is not a canonical value or alias |
| `garbage` | `garbage` | OK |
| `streetlight` | `streetlight` | OK |
| `water` | `water_supply` (via alias) | Partial — alias works for read, stored as `"water"` |
| `drainage` | `drainage` | OK |
| `other` | `other` | OK |

Categories present in backend but absent from picker: `road_damage`,
`electricity`, `sanitation`, `public_safety`.

**No change to frontend files is made by this document.**  The following
actions are recommended for Dev 2 at Stage 4 integration:

1. Change picker `id: 'pothole'` to `id: 'road_damage'` and update the label
   to `'Road Damage'`.
2. Change picker `id: 'water'` to `id: 'water_supply'` and update the label
   to `'Water Supply'`.
3. Add missing categories: `electricity`, `sanitation`, `public_safety`.
4. Optionally keep `pothole` as a **display label** (`'Pothole / Road Damage'`)
   while using `road_damage` as the submitted `id`.

Until Stage 4 integration, the citizen-app is in demo mode and does not make
live API calls, so there is no runtime breakage today.

---

## Database

The `issues.category` column is `VARCHAR(100) NULL` with no enum constraint
and no check constraint.  No migration is needed to support canonical values —
they are all short strings within the 100-character limit.

There are no Alembic migration scripts in the repository.  The schema is
managed via `Base.metadata.create_all()`.

---

## Adding a new category

1. Add the identifier to `VALID_CATEGORIES` in `ml/classification/categories.py`.
2. Add any aliases to `CATEGORY_ALIASES` in the same file.
3. Update the prompt in `ml/classification/ai_service.py` `_build_prompt()`.
4. Add evaluation examples to `datasets/classification_evaluation.json`.
5. Re-run `python -m ml.evaluation.evaluate_classification`.
6. Update this document.
7. Notify Dev 2 to add the new category to the frontend picker.
