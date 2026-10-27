"""Complaint classification predictor using local Ollama AI.

Architecture decision
---------------------
Only complaint classification uses local AI (Ollama).
Severity prediction and duplicate detection use separate ML components and
are NOT affected by this module.
"""

from typing import Optional, Tuple
from pathlib import Path

from ml.classification.ai_service import OllamaClassificationService
from ml.classification.categories import normalize_category


class ClassificationPredictor:
    """Classify civic complaints into canonical categories via a local Ollama model.

    The predictor delegates all AI work to :class:`OllamaClassificationService`.
    It does *not* use any hosted AI provider (OpenAI, Anthropic, etc.).

    Confidence scores
    -----------------
    The local model does not emit calibrated probability values.
    ``confidence`` is always returned as ``0.0`` to avoid fabricating a
    statistically meaningful number.  Consumers should treat the field as
    "not available" rather than as a low-confidence prediction.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "qwen2.5:3b",
        ollama_timeout: int = 30,
    ) -> None:
        """Initialise the predictor.

        Args:
            model_path:       Reserved for a future trained ML model; not used.
            ollama_base_url:  Ollama server URL.
            ollama_model:     Model tag to use (e.g. ``"qwen2.5:3b"``).
            ollama_timeout:   HTTP request timeout in seconds.
        """
        self.model_path = model_path
        self.model = None           # Placeholder for future trained model
        self.model_version = None

        self.ai_service = OllamaClassificationService(
            base_url=ollama_base_url,
            model=ollama_model,
            timeout=ollama_timeout,
        )

        # Attempt to load a traditional ML model if a path was given.
        self._load_model()

    # ------------------------------------------------------------------
    # Traditional ML model loading (future use)
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        """Load a trained ML model if one exists at ``model_path``.

        No model file is expected at this stage; the method is a placeholder
        for when a trained scikit-learn (or similar) model is available.
        """
        if self.model_path is None:
            return

        model_file = Path(self.model_path)
        if not model_file.exists():
            return

        # TODO: load the trained model when available.
        # import joblib
        # self.model = joblib.load(self.model_path)
        # self.model_version = "v1.0.0"

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def is_available(self) -> bool:
        """Return True when a classification method is ready.

        Currently this reflects whether the Ollama server is reachable.
        A future trained ML model would also satisfy this check.
        """
        return self.ai_service.is_available() or (self.model is not None)

    def predict(
        self, title: str, description: str
    ) -> Tuple[Optional[str], float, str]:
        """Predict the complaint category.

        Args:
            title:       Complaint title.
            description: Complaint description.

        Returns:
            ``(predicted_category, confidence, status)`` where:

            * ``predicted_category`` – One of the canonical categories, or
              ``None`` when unavailable.
            * ``confidence``         – Always ``0.0``; the local model does
              not emit calibrated probabilities.
            * ``status``             – ``"success"``, ``"model_unavailable"``,
              or ``"error"``.
        """
        # ---- Ollama AI path ------------------------------------------------
        category, _explanation, status = self.ai_service.classify(title, description)

        if status == "success" and category:
            try:
                normalized = normalize_category(category)
                return normalized, 0.0, "success"
            except ValueError:
                return None, 0.0, "error"

        if status == "service_unavailable":
            # Ollama is not running; fall through to traditional model below
            pass
        elif status == "error":
            # Malformed response or invalid category; fall through
            pass

        # ---- Traditional ML model path (future) ----------------------------
        if self.model is not None:
            try:
                # TODO: real prediction once a trained model is available
                pass
            except Exception as e:
                print(f"Classification prediction error: {e}")
                return None, 0.0, "error"

        # ---- Nothing available ---------------------------------------------
        if status == "service_unavailable":
            return None, 0.0, "model_unavailable"

        return None, 0.0, "error"

    def get_model_version(self) -> Optional[str]:
        """Return a version string for the active classification method."""
        return self.ai_service.get_model_version()


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_predictor: Optional[ClassificationPredictor] = None


def get_classification_predictor(
    model_path: Optional[str] = None,
    ollama_base_url: str = "http://localhost:11434",
    ollama_model: str = "qwen2.5:3b",
    ollama_timeout: int = 30,
) -> ClassificationPredictor:
    """Return (or create) the global :class:`ClassificationPredictor` instance.

    Args:
        model_path:       Reserved for a future trained ML model.
        ollama_base_url:  Ollama server URL.
        ollama_model:     Ollama model tag.
        ollama_timeout:   HTTP request timeout in seconds.

    Returns:
        The shared :class:`ClassificationPredictor` instance.
    """
    global _predictor
    if _predictor is None:
        _predictor = ClassificationPredictor(
            model_path=model_path,
            ollama_base_url=ollama_base_url,
            ollama_model=ollama_model,
            ollama_timeout=ollama_timeout,
        )
    return _predictor
