"""
Test yield prediction models using LightGBM.
Predicts the probability that a test will provide diagnostically useful results.
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import joblib
import os
from lightgbm import LGBMRegressor

from ..config import get_settings

settings = get_settings()


class TestYieldModel:
    """LightGBM-based test yield predictor."""

    # Supported test codes
    SUPPORTED_TESTS = ["HBA1C", "LIPID", "ECG", "LFT", "RFT", "CBC", "URINE", "ECHO", "TMT"]

    # Condition relevance mapping
    TEST_CONDITIONS = {
        "HBA1C": ["diabetes", "metabolic"],
        "LIPID": ["cardiac", "metabolic", "obesity"],
        "ECG": ["cardiac", "hypertension"],
        "LFT": ["hepatic", "alcohol", "medication"],
        "RFT": ["renal", "diabetes", "hypertension"],
        "CBC": [],  # General screening
        "URINE": ["renal", "diabetes"],
        "ECHO": ["cardiac"],
        "TMT": ["cardiac"],
    }

    def __init__(self):
        self.models: Dict[str, LGBMRegressor] = {}
        self.feature_names: List[str] = settings.test_yield_features
        self.version: str = "v1"
        self.is_fitted: Dict[str, bool] = {test: False for test in self.SUPPORTED_TESTS}
        self.training_metrics: Dict[str, Dict[str, float]] = {}

    def get_model_path(self, test_code: str, version: str = None) -> str:
        """Get path to model file for a specific test."""
        v = version or self.version
        return os.path.join(settings.model_dir, v, f"test_yield_{test_code.lower()}.joblib")

    def load(self, version: str = None) -> Dict[str, bool]:
        """Load all test models from disk."""
        loaded = {}
        for test_code in self.SUPPORTED_TESTS:
            path = self.get_model_path(test_code, version)
            if os.path.exists(path):
                data = joblib.load(path)
                self.models[test_code] = data.get("model")
                self.is_fitted[test_code] = True
                self.training_metrics[test_code] = data.get("metrics", {})
                loaded[test_code] = True
            else:
                loaded[test_code] = False
        return loaded

    def save(self, test_code: str, version: str = None) -> str:
        """Save a specific test model to disk."""
        if test_code not in self.models:
            raise ValueError(f"No model for test {test_code}")

        v = version or self.version
        path = self.get_model_path(test_code, v)
        os.makedirs(os.path.dirname(path), exist_ok=True)

        joblib.dump({
            "model": self.models[test_code],
            "feature_names": self.feature_names,
            "version": v,
            "metrics": self.training_metrics.get(test_code, {}),
        }, path)

        return path

    def fit(self, test_code: str, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Train model for a specific test."""
        if test_code not in self.SUPPORTED_TESTS:
            raise ValueError(f"Unsupported test: {test_code}")

        model = LGBMRegressor(
            n_estimators=50,
            max_depth=4,
            learning_rate=0.1,
            num_leaves=15,
            min_child_samples=10,
            random_state=42,
            verbose=-1,
        )

        model.fit(X, y)
        self.models[test_code] = model
        self.is_fitted[test_code] = True

        # Calculate metrics
        y_pred = model.predict(X)
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

        metrics = {
            "mse": float(mean_squared_error(y, y_pred)),
            "mae": float(mean_absolute_error(y, y_pred)),
            "r2": float(r2_score(y, y_pred)),
        }
        self.training_metrics[test_code] = metrics

        return metrics

    def predict(self, test_code: str, features: Dict[str, Any]) -> Tuple[float, float, str, List[Dict]]:
        """
        Predict test yield probability.

        Returns:
            Tuple of (yield_probability, confidence, recommendation, feature_contributions)
        """
        if test_code not in self.SUPPORTED_TESTS:
            raise ValueError(f"Unsupported test: {test_code}")

        if not self.is_fitted.get(test_code, False):
            # Fall back to rule-based prediction
            return self._rule_based_prediction(test_code, features)

        # Extract features
        X = self._extract_features(test_code, features)

        # Predict
        yield_prob = float(self.models[test_code].predict(X.reshape(1, -1))[0])
        yield_prob = max(0.0, min(1.0, yield_prob))  # Clamp to [0, 1]

        # Calculate confidence based on feature coverage
        confidence = self._calculate_confidence(features)

        # Get recommendation
        recommendation = self._get_recommendation(yield_prob, test_code)

        # Calculate contributions
        contributions = self._calculate_contributions(test_code, features, X)

        return yield_prob, confidence, recommendation, contributions

    def _extract_features(self, test_code: str, features: Dict[str, Any]) -> np.ndarray:
        """Extract feature vector for a specific test."""
        vector = []

        for fname in self.feature_names:
            if fname == "age":
                vector.append(features.get("age", 35))
            elif fname == "bmi":
                vector.append(features.get("bmi", 24))
            elif fname == "smoking_status":
                status = features.get("smoking_status", "never")
                vector.append(2 if status == "current" else (1 if status == "former" else 0))
            elif fname == "condition_count":
                vector.append(features.get("condition_count", 0))
            elif fname == "has_condition_related":
                # Check if applicant has conditions related to this test
                related = self._has_related_condition(test_code, features)
                vector.append(1 if related else 0)
            elif fname == "sum_assured_tier":
                sa = features.get("sum_assured", 0)
                if sa >= 10000000:
                    vector.append(3)
                elif sa >= 5000000:
                    vector.append(2)
                elif sa >= 2500000:
                    vector.append(1)
                else:
                    vector.append(0)
            else:
                vector.append(0)

        return np.array(vector, dtype=np.float32)

    def _has_related_condition(self, test_code: str, features: Dict[str, Any]) -> bool:
        """Check if applicant has conditions related to the test."""
        related_conditions = self.TEST_CONDITIONS.get(test_code, [])

        if "cardiac" in related_conditions and features.get("has_cardiac"):
            return True
        if "diabetes" in related_conditions and features.get("has_diabetes"):
            return True
        if "renal" in related_conditions and features.get("has_renal"):
            return True
        if "hypertension" in related_conditions and features.get("has_hypertension"):
            return True
        if "obesity" in related_conditions and features.get("bmi", 24) >= 30:
            return True
        if "metabolic" in related_conditions and (
            features.get("has_diabetes") or features.get("bmi", 24) >= 30
        ):
            return True

        return False

    def _calculate_confidence(self, features: Dict[str, Any]) -> float:
        """Calculate prediction confidence based on feature availability."""
        required = ["age", "bmi"]
        optional = ["smoking_status", "has_diabetes", "has_cardiac"]

        score = 0.5  # Base confidence

        # Check required features
        for f in required:
            if f in features and features[f] is not None:
                score += 0.15

        # Check optional features
        for f in optional:
            if f in features and features[f] is not None:
                score += 0.05

        return min(0.95, score)

    def _get_recommendation(self, yield_prob: float, test_code: str) -> str:
        """Get recommendation based on yield probability."""
        if yield_prob >= 0.6:
            return "recommended"
        elif yield_prob >= 0.3:
            return "optional"
        else:
            return "low_yield"

    def _calculate_contributions(self, test_code: str, features: Dict[str, Any], X: np.ndarray) -> List[Dict]:
        """Calculate feature contributions."""
        contributions = []

        related = self._has_related_condition(test_code, features)

        # Key contributions
        if related:
            contributions.append({
                "feature": "related_condition",
                "value": True,
                "contribution": 0.3,
                "direction": "increases",
            })

        age = features.get("age", 35)
        if age >= 45:
            contributions.append({
                "feature": "age",
                "value": age,
                "contribution": 0.1 * (age - 35) / 30,
                "direction": "increases",
            })

        bmi = features.get("bmi", 24)
        if bmi >= 30 and test_code in ["LIPID", "HBA1C", "ECG"]:
            contributions.append({
                "feature": "bmi",
                "value": bmi,
                "contribution": 0.15,
                "direction": "increases",
            })

        if features.get("smoking_status") == "current" and test_code in ["ECG", "LIPID", "LFT"]:
            contributions.append({
                "feature": "smoking_status",
                "value": "current",
                "contribution": 0.12,
                "direction": "increases",
            })

        return contributions

    def _rule_based_prediction(self, test_code: str, features: Dict[str, Any]) -> Tuple[float, float, str, List[Dict]]:
        """Fallback rule-based prediction."""
        base_yield = 0.3  # Base probability

        # Increase based on related conditions
        if self._has_related_condition(test_code, features):
            base_yield += 0.35

        # Age factor
        age = features.get("age", 35)
        if age >= 55:
            base_yield += 0.15
        elif age >= 45:
            base_yield += 0.08

        # BMI factor for metabolic tests
        bmi = features.get("bmi", 24)
        if bmi >= 30 and test_code in ["HBA1C", "LIPID"]:
            base_yield += 0.12

        # Smoking factor
        if features.get("smoking_status") == "current":
            if test_code in ["ECG", "LIPID", "LFT"]:
                base_yield += 0.1

        yield_prob = min(0.95, base_yield)
        recommendation = self._get_recommendation(yield_prob, test_code)

        contributions = [
            {"feature": "rule_based", "value": yield_prob, "contribution": yield_prob, "direction": "increases"}
        ]

        return yield_prob, 0.7, recommendation, contributions
