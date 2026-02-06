"""
Complexity classification model using LightGBM.
Classifies cases into ROUTINE, MODERATE, or COMPLEX tiers.
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import joblib
import os
from sklearn.calibration import CalibratedClassifierCV
from lightgbm import LGBMClassifier

from ..config import get_settings

settings = get_settings()


class ComplexityModel:
    """LightGBM-based complexity classifier with calibration."""

    CLASSES = ["ROUTINE", "MODERATE", "COMPLEX"]

    def __init__(self):
        self.model: Optional[CalibratedClassifierCV] = None
        self.base_model: Optional[LGBMClassifier] = None
        self.feature_names: List[str] = settings.complexity_features
        self.version: str = "v1"
        self.is_fitted: bool = False
        self.training_metrics: Dict[str, float] = {}

    def get_model_path(self, version: str = None) -> str:
        """Get path to model file."""
        v = version or self.version
        return os.path.join(settings.model_dir, v, "complexity_model.joblib")

    def load(self, version: str = None) -> bool:
        """Load model from disk."""
        path = self.get_model_path(version)
        if os.path.exists(path):
            data = joblib.load(path)
            self.model = data.get("model")
            self.base_model = data.get("base_model")
            self.feature_names = data.get("feature_names", self.feature_names)
            self.version = data.get("version", version or self.version)
            self.training_metrics = data.get("metrics", {})
            self.is_fitted = True
            return True
        return False

    def save(self, version: str = None) -> str:
        """Save model to disk."""
        v = version or self.version
        path = self.get_model_path(v)
        os.makedirs(os.path.dirname(path), exist_ok=True)

        joblib.dump({
            "model": self.model,
            "base_model": self.base_model,
            "feature_names": self.feature_names,
            "version": v,
            "metrics": self.training_metrics,
        }, path)

        return path

    def fit(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Train the model."""
        # Create base LightGBM classifier
        self.base_model = LGBMClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            num_leaves=31,
            min_child_samples=20,
            class_weight="balanced",
            random_state=42,
            verbose=-1,
        )

        # Wrap with calibration for better probability estimates
        self.model = CalibratedClassifierCV(
            self.base_model,
            cv=5,
            method="isotonic",
        )

        self.model.fit(X, y)
        self.is_fitted = True

        # Calculate training metrics
        y_pred = self.model.predict(X)
        y_proba = self.model.predict_proba(X)

        from sklearn.metrics import accuracy_score, f1_score, log_loss

        self.training_metrics = {
            "accuracy": float(accuracy_score(y, y_pred)),
            "f1_macro": float(f1_score(y, y_pred, average="macro")),
            "log_loss": float(log_loss(y, y_proba)),
        }

        return self.training_metrics

    def predict(self, features: Dict[str, Any]) -> Tuple[str, float, Dict[str, float], List[Dict]]:
        """
        Predict complexity tier.

        Returns:
            Tuple of (tier, confidence, probabilities, feature_contributions)
        """
        if not self.is_fitted:
            # Fall back to rule-based prediction
            return self._rule_based_prediction(features)

        # Extract feature vector
        X = self._extract_features(features)

        # Get probabilities
        probabilities = self.model.predict_proba(X.reshape(1, -1))[0]
        prob_dict = {cls: float(p) for cls, p in zip(self.CLASSES, probabilities)}

        # Get predicted class
        predicted_idx = np.argmax(probabilities)
        predicted_tier = self.CLASSES[predicted_idx]
        confidence = float(probabilities[predicted_idx])

        # Calculate feature contributions
        contributions = self._calculate_contributions(features, X)

        return predicted_tier, confidence, prob_dict, contributions

    def _extract_features(self, features: Dict[str, Any]) -> np.ndarray:
        """Extract feature vector from input dictionary."""
        vector = []

        for fname in self.feature_names:
            if fname == "age":
                vector.append(features.get("age", 35))
            elif fname == "bmi":
                vector.append(features.get("bmi", 24))
            elif fname == "sum_assured":
                vector.append(features.get("sum_assured", 5000000) / 1000000)  # Normalize to millions
            elif fname == "smoking_status":
                status = features.get("smoking_status", "never")
                vector.append(2 if status == "current" else (1 if status == "former" else 0))
            elif fname == "condition_count":
                vector.append(features.get("condition_count", 0))
            elif fname == "medication_count":
                vector.append(features.get("medication_count", 0))
            elif fname == "has_cardiac":
                vector.append(1 if features.get("has_cardiac", False) else 0)
            elif fname == "has_diabetes":
                vector.append(1 if features.get("has_diabetes", False) else 0)
            elif fname == "has_hypertension":
                vector.append(1 if features.get("has_hypertension", False) else 0)
            elif fname == "has_renal":
                vector.append(1 if features.get("has_renal", False) else 0)
            elif fname == "family_history_cardiac":
                vector.append(1 if features.get("family_history_cardiac", False) else 0)
            elif fname == "family_history_diabetes":
                vector.append(1 if features.get("family_history_diabetes", False) else 0)
            else:
                vector.append(0)

        return np.array(vector, dtype=np.float32)

    def _calculate_contributions(self, features: Dict[str, Any], X: np.ndarray) -> List[Dict]:
        """Calculate feature contributions to the prediction."""
        contributions = []

        # Define feature weights for contribution calculation
        weights = {
            "age": 0.15,
            "bmi": 0.10,
            "sum_assured": 0.08,
            "smoking_status": 0.12,
            "condition_count": 0.10,
            "has_cardiac": 0.15,
            "has_diabetes": 0.10,
            "has_hypertension": 0.08,
            "has_renal": 0.08,
            "family_history_cardiac": 0.04,
        }

        for i, fname in enumerate(self.feature_names):
            value = X[i]
            weight = weights.get(fname, 0.05)

            # Determine contribution direction
            if fname == "age":
                contribution = weight * (value - 35) / 30  # Normalized around 35
                direction = "increases" if value > 45 else "neutral"
            elif fname == "bmi":
                contribution = weight * (value - 24) / 10  # Normalized around 24
                direction = "increases" if value > 30 else "neutral"
            elif fname in ["has_cardiac", "has_diabetes", "has_renal"]:
                contribution = weight * value
                direction = "increases" if value > 0 else "neutral"
            elif fname == "smoking_status":
                contribution = weight * value / 2
                direction = "increases" if value > 0 else "neutral"
            else:
                contribution = weight * value * 0.1
                direction = "increases" if value > 0 else "neutral"

            contributions.append({
                "feature": fname,
                "value": features.get(fname, value),
                "contribution": float(contribution),
                "direction": direction,
            })

        # Sort by absolute contribution
        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        return contributions[:8]  # Return top 8 contributions

    def _rule_based_prediction(self, features: Dict[str, Any]) -> Tuple[str, float, Dict[str, float], List[Dict]]:
        """Fallback rule-based prediction when model is not fitted."""
        score = 0.0

        # Age contribution
        age = features.get("age", 35)
        if age >= 65:
            score += 0.4
        elif age >= 55:
            score += 0.2

        # BMI contribution
        bmi = features.get("bmi", 24)
        if bmi >= 35:
            score += 0.35
        elif bmi >= 30:
            score += 0.2

        # Smoking
        if features.get("smoking_status") == "current":
            score += 0.3

        # Conditions
        if features.get("has_cardiac"):
            score += 0.5
        if features.get("has_diabetes"):
            score += 0.25
        if features.get("has_renal"):
            score += 0.4

        # Sum assured
        sa = features.get("sum_assured", 0)
        if sa >= 10000000:  # 1 Cr
            score += 0.1

        # Determine tier
        if score >= 0.6:
            tier = "COMPLEX"
            probs = {"ROUTINE": 0.1, "MODERATE": 0.2, "COMPLEX": 0.7}
        elif score >= 0.3:
            tier = "MODERATE"
            probs = {"ROUTINE": 0.2, "MODERATE": 0.6, "COMPLEX": 0.2}
        else:
            tier = "ROUTINE"
            probs = {"ROUTINE": 0.7, "MODERATE": 0.2, "COMPLEX": 0.1}

        confidence = probs[tier]

        contributions = [
            {"feature": "rule_based", "value": score, "contribution": score, "direction": "increases"}
        ]

        return tier, confidence, probs, contributions
