"""
Inference service for making predictions using loaded models.
"""

from typing import Dict, List, Any

from ..api.schemas import (
    ComplexityPrediction,
    ComplexityTier,
    TestYieldPrediction,
    FeatureContribution,
)
from .model_manager import ModelManager


class InferenceService:
    """Service for running inference on loaded models."""

    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager

    def predict_complexity(
        self,
        case_id: str,
        applicant: Dict[str, Any],
        sum_assured: float,
        medical_disclosures: List[Dict[str, Any]],
        existing_risk_factors: List[Dict[str, Any]] = None,
    ) -> ComplexityPrediction:
        """Predict case complexity tier."""

        # Prepare features
        features = self._prepare_complexity_features(
            applicant, sum_assured, medical_disclosures, existing_risk_factors or []
        )

        # Get prediction from model
        model = self.model_manager.complexity_model
        tier, confidence, probabilities, contributions = model.predict(features)

        # Convert contributions to schema format
        feature_contributions = [
            FeatureContribution(
                feature=c["feature"],
                value=c["value"],
                contribution=c["contribution"],
                direction=c["direction"],
            )
            for c in contributions
        ]

        return ComplexityPrediction(
            tier=ComplexityTier(tier),
            confidence=confidence,
            probabilities=probabilities,
            feature_contributions=feature_contributions,
            model_version=model.version,
        )

    def predict_test_yield(
        self,
        case_id: str,
        test_code: str,
        applicant: Dict[str, Any],
        sum_assured: float,
        medical_disclosures: List[Dict[str, Any]],
    ) -> TestYieldPrediction:
        """Predict diagnostic yield for a test."""

        # Prepare features
        features = self._prepare_test_features(
            test_code, applicant, sum_assured, medical_disclosures
        )

        # Get prediction from model
        model = self.model_manager.test_yield_model
        yield_prob, confidence, recommendation, contributions = model.predict(test_code, features)

        # Convert contributions
        feature_contributions = [
            FeatureContribution(
                feature=c["feature"],
                value=c["value"],
                contribution=c["contribution"],
                direction=c["direction"],
            )
            for c in contributions
        ]

        return TestYieldPrediction(
            test_code=test_code,
            predicted_yield=yield_prob,
            confidence=confidence,
            recommendation=recommendation,
            feature_contributions=feature_contributions,
            model_version=model.version,
        )

    def _prepare_complexity_features(
        self,
        applicant: Dict[str, Any],
        sum_assured: float,
        medical_disclosures: List[Dict[str, Any]],
        existing_risk_factors: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Prepare features for complexity prediction."""

        # Extract basic applicant features
        features = {
            "age": applicant.get("age"),
            "bmi": applicant.get("bmi"),
            "smoking_status": applicant.get("smoking_status"),
            "sum_assured": sum_assured,
        }

        # Calculate BMI if not provided
        if not features["bmi"] and applicant.get("height_cm") and applicant.get("weight_kg"):
            height_m = applicant["height_cm"] / 100
            features["bmi"] = applicant["weight_kg"] / (height_m * height_m)

        # Process medical disclosures
        conditions = []
        medications = []
        family_history = []

        for disclosure in medical_disclosures:
            dtype = disclosure.get("disclosure_type", "")
            if dtype == "condition":
                conditions.append(disclosure)
            elif dtype == "medication":
                medications.append(disclosure)
            elif dtype == "family_history":
                family_history.append(disclosure)

        features["condition_count"] = len(conditions)
        features["medication_count"] = len(medications)

        # Check for specific conditions
        condition_names = " ".join([c.get("condition_name", "").lower() for c in conditions])

        features["has_cardiac"] = any(
            kw in condition_names for kw in ["cardiac", "heart", "coronary", " mi ", "angina"]
        )
        features["has_diabetes"] = "diabetes" in condition_names
        features["has_hypertension"] = any(
            kw in condition_names for kw in ["hypertension", "blood pressure", "htn"]
        )
        features["has_renal"] = any(
            kw in condition_names for kw in ["kidney", "renal", "ckd"]
        )

        # Check family history
        family_conditions = " ".join([f.get("family_condition", "").lower() for f in family_history])
        features["family_history_cardiac"] = any(
            kw in family_conditions for kw in ["cardiac", "heart"]
        )
        features["family_history_diabetes"] = "diabetes" in family_conditions

        return features

    def _prepare_test_features(
        self,
        test_code: str,
        applicant: Dict[str, Any],
        sum_assured: float,
        medical_disclosures: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Prepare features for test yield prediction."""

        # Start with complexity features
        features = self._prepare_complexity_features(
            applicant, sum_assured, medical_disclosures, []
        )

        # Add test-specific features
        features["test_code"] = test_code

        return features
