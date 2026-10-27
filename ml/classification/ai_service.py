"""Local AI classification service using Ollama.

This module classifies civic complaints into predefined categories by calling
a locally running Ollama instance.  No hosted AI API or API key is required.

Ollama setup:
    1. Install Ollama: https://ollama.com/download
    2. Pull the model:  ollama pull qwen2.5:3b
    3. Start the server: ollama serve   (runs on http://localhost:11434 by default)

Environment variables (all optional — defaults shown):
    OLLAMA_BASE_URL=http://localhost:11434
    OLLAMA_MODEL=qwen2.5:3b
"""

import json
from typing import Optional, Tuple

import httpx

from ml.classification.categories import VALID_CATEGORIES, is_valid_category


class OllamaClassificationService:
    """Classify civic complaints using a locally running Ollama model.

    All HTTP communication goes to the Ollama REST API
    (``POST /api/generate``).  No data leaves the machine.

    The service requests a structured JSON response from the model so that
    the category can be validated without fragile text parsing.
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "qwen2.5:3b",
        timeout: int = 30,
    ) -> None:
        """Initialise the service.

        Args:
            base_url: Ollama server base URL.
            model:    Ollama model tag to use for classification.
            timeout:  HTTP request timeout in seconds.
        """
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._generate_url = f"{self.base_url}/api/generate"

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        """Return True if the Ollama server is reachable.

        This is a lightweight check (HEAD /); it does **not** verify whether
        the configured model is pulled.
        """
        try:
            with httpx.Client(timeout=5) as client:
                response = client.get(f"{self.base_url}/")
                return response.status_code < 500
        except Exception:
            return False

    def classify(
        self,
        title: str,
        description: str,
    ) -> Tuple[Optional[str], Optional[str], str]:
        """Classify a complaint using the local Ollama model.

        Args:
            title:       Complaint title.
            description: Complaint description.

        Returns:
            A 3-tuple ``(category, explanation, status)`` where:

            * ``category``    – One of :data:`VALID_CATEGORIES`, or ``None``.
            * ``explanation`` – One-sentence rationale from the model, or ``None``.
            * ``status``      – ``"success"``, ``"service_unavailable"``, or
                                ``"error"``.

        Status semantics:
            ``service_unavailable`` — Ollama is not running or unreachable.
            ``error``               — Ollama responded but the output was
                                      malformed, contained an invalid category,
                                      or an HTTP error occurred.
        """
        prompt = self._build_prompt(title, description)

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    self._generate_url,
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        # Low temperature for deterministic classification
                        "options": {"temperature": 0.1},
                    },
                )
        except httpx.ConnectError:
            return None, None, "service_unavailable"
        except httpx.TimeoutException:
            return None, None, "error"
        except httpx.RequestError:
            return None, None, "service_unavailable"

        if response.status_code != 200:
            return None, None, "error"

        return self._parse_response(response.text)

    def get_model_version(self) -> str:
        """Return a version string identifying this service configuration."""
        return f"ollama-{self.model}"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_prompt(self, title: str, description: str) -> str:
        """Build the classification prompt sent to Ollama.

        The prompt asks for exactly one JSON object so that ``format: json``
        in the Ollama request body is satisfied and parsing is unambiguous.
        """
        return f"""You are a civic complaint classifier for Nagpur Municipal Corporation (NMC), India.

Your task: read the complaint and choose EXACTLY ONE category from the list below.

CATEGORY DEFINITIONS
====================

road_damage
  The carriageway or road surface used by vehicles is damaged.
  Includes: potholes, road cracks, broken speed breakers, damaged road dividers,
  peeling tar, subsidence of the road surface.
  Does NOT include: footpaths, pavements, or pedestrian walkways (those are public_safety).

garbage
  Solid waste is uncollected, illegally dumped, or improperly disposed.
  Includes: missed garbage collection, overflowing bins, illegal dumping of
  construction debris, building rubble, or any solid waste on public land.
  Does NOT include: sewage overflow or dirty public toilets (those are sanitation).

water_supply
  The drinking-water supply network has a fault.
  Includes: pipe bursts, leaking water mains, disrupted supply, low pressure,
  contaminated drinking water, incorrect water meter readings.
  Does NOT include: waterlogging, stagnant rainwater, or blocked drains
  (those are drainage).

drainage
  The storm-water or wastewater drainage system has a fault.
  Includes: blocked or broken drains, waterlogging, stagnant water accumulation,
  mosquito breeding from standing water, missing or broken manhole covers,
  sewage manhole issues, flooding caused by drainage failure.
  Does NOT include: drinking-water pipe faults (those are water_supply).

streetlight
  A public road-lighting streetlight managed by NMC is not working.
  Includes: non-functional streetlight poles, flickering streetlights,
  damaged streetlight fixtures.
  Does NOT include: traffic signals, park lights, building lights, or any
  lighting that is not a dedicated public road streetlight.

electricity
  The electrical power supply or electrical infrastructure is faulty or dangerous.
  Includes: power outages, tripped transformers, hanging or fallen power lines,
  exposed live wires, electrical sparks from poles or transformers.
  Does NOT include: streetlight faults (those are streetlight).

sanitation
  A public sanitation facility is dirty, broken, or non-functional.
  Includes: dirty or broken public toilets, overflowing septic tanks,
  sewage spreading from public facilities onto roads.
  Does NOT include: missed garbage collection or illegal dumping
  (those are garbage).

public_safety
  There is an immediate hazard to pedestrians or the general public that
  does not fit a more specific infrastructure category.
  Includes: broken footpaths / pavements causing pedestrian injuries,
  uneven or missing pavement tiles creating trip hazards, stray animal attacks,
  unsafe construction sites encroaching on public space.
  Does NOT include: road carriageway damage (that is road_damage) or
  drainage infrastructure such as manholes (those are drainage).

other
  The complaint does not fit any of the above categories.
  Use this when: the issue spans multiple departments with no clear primary
  category, the complaint is about general park or municipal property
  maintenance not covered above, traffic signal malfunctions, noise complaints,
  or any issue that cannot be placed in a single specific category.
  IMPORTANT: if you find yourself choosing between two or three categories
  and none is clearly primary, choose "other".

DECISION RULES
==============
1. Read the FULL title and description before deciding.
2. Match the PRIMARY subject of the complaint to the most specific category.
3. If a single complaint mentions multiple issues (e.g. broken park lights AND
   broken benches), use "other" — it spans multiple departments.
4. A traffic signal is NOT a streetlight — use "other" for traffic signals.
5. Footpaths and pavements are pedestrian infrastructure → public_safety,
   not road_damage (road_damage is for vehicle carriageways).
6. Stagnant water, waterlogging, mosquito breeding → drainage, not water_supply.
7. Missing manhole covers → drainage (manhole is part of the drainage system).
8. Illegal dumping of construction debris → garbage, not sanitation.

Respond with a JSON object containing exactly two keys:
  "category"    — one of the category names listed above (lowercase, exact spelling)
  "explanation" — one sentence explaining your choice

Complaint title: {title}
Complaint description: {description}

JSON response:"""

    def _parse_response(
        self, raw: str
    ) -> Tuple[Optional[str], Optional[str], str]:
        """Parse and validate the Ollama HTTP response body.

        Args:
            raw: Raw response body text from ``/api/generate``.

        Returns:
            ``(category, explanation, status)`` 3-tuple.
        """
        # Ollama wraps the model output in a JSON envelope:
        # {"model": "...", "response": "{...}", "done": true, ...}
        try:
            envelope = json.loads(raw)
        except json.JSONDecodeError:
            return None, None, "error"

        model_output = envelope.get("response", "")
        if not model_output:
            return None, None, "error"

        # The model_output itself should be JSON (we requested format: json)
        try:
            result = json.loads(model_output)
        except json.JSONDecodeError:
            # Try to extract the first JSON object if the model added prose
            result = self._extract_json_object(model_output)
            if result is None:
                return None, None, "error"

        if not isinstance(result, dict):
            return None, None, "error"

        category = result.get("category")
        explanation = result.get("explanation")

        if not category or not isinstance(category, str):
            return None, None, "error"

        # Validate category against the authoritative list
        if not is_valid_category(category):
            return None, None, "error"

        return category, explanation, "success"

    @staticmethod
    def _extract_json_object(text: str) -> Optional[dict]:
        """Best-effort extraction of the first JSON object from text.

        Used as a fallback when the model wraps its JSON in prose despite the
        ``format: json`` instruction.

        Returns:
            Parsed dict, or ``None`` if no valid JSON object is found.
        """
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None
