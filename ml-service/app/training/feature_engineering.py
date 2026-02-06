"""
Feature engineering utilities for ML models.
"""

from typing import Dict, List, Any, Optional
import numpy as np


class FeatureEngineer:
    """Feature engineering for underwriting ML models."""

    @staticmethod
    def calculate_bmi(height_cm: Optional[float], weight_kg: Optional[float]) -> Optional[float]:
        """Calculate BMI from height and weight."""
        if not height_cm or not weight_kg:
            return None
        height_m = height_cm / 100
        return round(weight_kg / (height_m * height_m), 1)

    @staticmethod
    def calculate_age(date_of_birth: str) -> Optional[int]:
        """Calculate age from date of birth string."""
        if not date_of_birth:
            return None

        from datetime import datetime

        try:
            dob = datetime.fromisoformat(date_of_birth.replace("Z", "+00:00"))
            today = datetime.now()
            age = today.year - dob.year
            if (today.month, today.day) < (dob.month, dob.day):
                age -= 1
            return age
        except:
            return None

    @staticmethod
    def encode_smoking_status(status: Optional[str]) -> int:
        """Encode smoking status as numeric."""
        if status == "current":
            return 2
        elif status == "former":
            return 1
        return 0

    @staticmethod
    def get_sum_assured_tier(sum_assured: float) -> int:
        """Convert sum assured to tier (0-3)."""
        if sum_assured >= 10000000:  # 1 Cr
            return 3
        elif sum_assured >= 5000000:  # 50 L
            return 2
        elif sum_assured >= 2500000:  # 25 L
            return 1
        return 0

    @staticmethod
    def extract_condition_flags(disclosures: List[Dict[str, Any]]) -> Dict[str, bool]:
        """Extract boolean flags for specific conditions."""
        condition_text = " ".join([
            d.get("condition_name", "").lower()
            for d in disclosures
            if d.get("disclosure_type") == "condition"
        ])

        return {
            "has_cardiac": any(kw in condition_text for kw in ["cardiac", "heart", "coronary", " mi ", "angina", "arrhythmia"]),
            "has_diabetes": "diabetes" in condition_text,
            "has_hypertension": any(kw in condition_text for kw in ["hypertension", "blood pressure", "htn"]),
            "has_renal": any(kw in condition_text for kw in ["kidney", "renal", "ckd", "nephro"]),
            "has_hepatic": any(kw in condition_text for kw in ["liver", "hepatic", "cirrhosis"]),
            "has_respiratory": any(kw in condition_text for kw in ["asthma", "copd", "respiratory", "pulmonary"]),
            "has_cancer": any(kw in condition_text for kw in ["cancer", "malignant", "tumor", "carcinoma"]),
            "has_neurological": any(kw in condition_text for kw in ["stroke", "epilepsy", "parkinson", "alzheimer"]),
        }

    @staticmethod
    def extract_family_history_flags(disclosures: List[Dict[str, Any]]) -> Dict[str, bool]:
        """Extract boolean flags for family history conditions."""
        family_text = " ".join([
            d.get("family_condition", "").lower()
            for d in disclosures
            if d.get("disclosure_type") == "family_history"
        ])

        return {
            "family_history_cardiac": any(kw in family_text for kw in ["cardiac", "heart", "coronary"]),
            "family_history_diabetes": "diabetes" in family_text,
            "family_history_cancer": any(kw in family_text for kw in ["cancer", "malignant"]),
            "family_history_stroke": "stroke" in family_text,
        }

    @staticmethod
    def count_disclosures(disclosures: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count disclosures by type."""
        counts = {
            "condition_count": 0,
            "medication_count": 0,
            "family_history_count": 0,
            "surgery_count": 0,
        }

        for d in disclosures:
            dtype = d.get("disclosure_type", "")
            if dtype == "condition":
                counts["condition_count"] += 1
            elif dtype == "medication":
                counts["medication_count"] += 1
            elif dtype == "family_history":
                counts["family_history_count"] += 1
            elif dtype == "surgery":
                counts["surgery_count"] += 1

        return counts

    @classmethod
    def prepare_features(
        cls,
        applicant: Dict[str, Any],
        sum_assured: float,
        disclosures: List[Dict[str, Any]],
        feature_names: List[str],
    ) -> np.ndarray:
        """
        Prepare feature vector from raw data.

        Args:
            applicant: Applicant data dictionary
            sum_assured: Sum assured amount
            disclosures: List of medical disclosures
            feature_names: Ordered list of feature names

        Returns:
            numpy array of feature values
        """
        # Calculate derived values
        bmi = applicant.get("bmi") or cls.calculate_bmi(
            applicant.get("height_cm"), applicant.get("weight_kg")
        )
        age = applicant.get("age") or cls.calculate_age(applicant.get("date_of_birth"))

        # Extract flags
        condition_flags = cls.extract_condition_flags(disclosures)
        family_flags = cls.extract_family_history_flags(disclosures)
        counts = cls.count_disclosures(disclosures)

        # Build feature dictionary
        all_features = {
            "age": age or 35,
            "bmi": bmi or 24.0,
            "smoking_status": cls.encode_smoking_status(applicant.get("smoking_status")),
            "sum_assured": sum_assured / 1000000,  # Normalize to millions
            "sum_assured_tier": cls.get_sum_assured_tier(sum_assured),
            **condition_flags,
            **family_flags,
            **counts,
        }

        # Extract in order
        vector = [all_features.get(name, 0) for name in feature_names]

        return np.array(vector, dtype=np.float32)

    @classmethod
    def get_feature_importance_explanation(
        cls,
        feature_name: str,
        feature_value: Any,
    ) -> str:
        """Get human-readable explanation for a feature's contribution."""
        explanations = {
            "age": f"Applicant age of {feature_value} years",
            "bmi": f"BMI of {feature_value:.1f}",
            "smoking_status": "Smoking history" if feature_value > 0 else "Non-smoker",
            "has_cardiac": "Cardiac condition disclosed" if feature_value else "No cardiac history",
            "has_diabetes": "Diabetes disclosed" if feature_value else "No diabetes",
            "has_hypertension": "Hypertension disclosed" if feature_value else "No hypertension",
            "has_renal": "Renal condition disclosed" if feature_value else "No renal issues",
            "condition_count": f"{int(feature_value)} medical conditions disclosed",
            "medication_count": f"{int(feature_value)} medications disclosed",
            "family_history_cardiac": "Family history of cardiac disease" if feature_value else "No family cardiac history",
            "sum_assured": f"Sum assured of Rs. {feature_value:.1f} million",
        }

        return explanations.get(feature_name, f"{feature_name}: {feature_value}")
