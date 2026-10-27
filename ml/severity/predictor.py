"""Issue severity prediction interface."""

from typing import Optional, Tuple
from pathlib import Path


class SeverityPredictor:
    """Interface for issue severity prediction.
    
    This class provides a clean interface for severity prediction.
    When no trained model is available, it returns a clear unavailable status
    rather than fake predictions.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """Initialize the severity predictor.
        
        Args:
            model_path: Path to the trained model file (optional)
        """
        self.model_path = model_path
        self.model = None
        self.model_version = None
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the trained model if available.
        
        This method attempts to load a trained model from the specified path.
        If no model exists, it sets self.model to None, indicating unavailability.
        """
        if self.model_path is None:
            return
        
        model_file = Path(self.model_path)
        if not model_file.exists():
            return
        
        # TODO: Implement actual model loading when trained model is available
        # Example:
        # import joblib
        # self.model = joblib.load(self.model_path)
        # self.model_version = "v1.0.0"
        pass
    
    def is_available(self) -> bool:
        """Check if a trained model is available.
        
        Returns:
            bool: True if model is loaded and ready, False otherwise
        """
        return self.model is not None
    
    def predict(
        self, 
        title: str, 
        description: str,
        category: Optional[str] = None
    ) -> Tuple[Optional[str], float, str]:
        """Predict the severity for an issue.
        
        Args:
            title: Issue title
            description: Issue description
            category: Issue category (optional, can help prediction)
            
        Returns:
            Tuple of (predicted_severity, confidence, status)
            - predicted_severity: The predicted severity or None if unavailable
            - confidence: Prediction confidence (0.0 if unavailable)
            - status: "success", "model_unavailable", or "error"
        """
        if not self.is_available():
            return None, 0.0, "model_unavailable"
        
        try:
            # TODO: Implement actual prediction when model is available
            # Example:
            # text = f"{title} {description}"
            # if category:
            #     text = f"{category} {text}"
            # prediction = self.model.predict([text])[0]
            # confidence = self.model.predict_proba([text]).max()
            # return prediction, confidence, "success"
            
            # This should never execute with a real model
            return None, 0.0, "model_unavailable"
            
        except Exception as e:
            print(f"Severity prediction error: {e}")
            return None, 0.0, "error"
    
    def get_model_version(self) -> Optional[str]:
        """Get the version of the loaded model.
        
        Returns:
            str: Model version identifier or None if unavailable
        """
        return self.model_version


# Global predictor instance
_predictor: Optional[SeverityPredictor] = None


def get_severity_predictor(model_path: Optional[str] = None) -> SeverityPredictor:
    """Get or create the global severity predictor instance.
    
    Args:
        model_path: Path to the trained model file (optional)
        
    Returns:
        SeverityPredictor: The predictor instance
    """
    global _predictor
    if _predictor is None:
        _predictor = SeverityPredictor(model_path)
    return _predictor
