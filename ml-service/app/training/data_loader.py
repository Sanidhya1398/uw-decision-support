"""
Data loader for fetching training data from Node.js backend.
"""

from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import httpx

from ..config import get_settings
from .feature_engineering import FeatureEngineer

settings = get_settings()


class DataLoader:
    """Loads training data from the Node.js backend."""

    def __init__(self):
        self.backend_url = settings.backend_url
        self.feature_engineer = FeatureEngineer()

    async def fetch_cases_for_training(
        self,
        limit: int = 1000,
        include_completed_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Fetch cases with outcomes for training."""
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "limit": limit,
                    "status": "COMPLETED" if include_completed_only else None,
                    "include_disclosures": True,
                    "include_risk_factors": True,
                    "include_decisions": True,
                }
                response = await client.get(
                    f"{self.backend_url}/api/v1/cases/for-training",
                    params={k: v for k, v in params.items() if v is not None},
                    timeout=60.0,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"Failed to fetch training cases: {e}")
            return []

    async def fetch_overrides(
        self,
        override_type: str,
        since_days: int = 90,
    ) -> List[Dict[str, Any]]:
        """Fetch override data for training."""
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "type": override_type,
                    "days": since_days,
                    "validated": True,
                }
                response = await client.get(
                    f"{self.backend_url}/api/v1/overrides/for-training",
                    params=params,
                    timeout=30.0,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"Failed to fetch overrides: {e}")
            return []

    def prepare_complexity_dataset(
        self,
        cases: List[Dict[str, Any]],
        overrides: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare dataset for complexity model training.

        Returns (X, y, sample_weights)
        """
        feature_names = settings.complexity_features
        X_list = []
        y_list = []
        weights_list = []

        tier_map = {"ROUTINE": 0, "MODERATE": 1, "COMPLEX": 2}

        # Process completed cases
        for case in cases:
            applicant = case.get("applicant", {})
            disclosures = case.get("medicalDisclosures", [])
            sum_assured = case.get("sumAssured", 5000000)

            # Get the final complexity tier (from decision or risk assessment)
            final_tier = case.get("complexityTier") or case.get("assignedComplexity", "MODERATE")

            # Extract features
            features = self._extract_case_features(applicant, sum_assured, disclosures)
            X_list.append([features.get(f, 0) for f in feature_names])
            y_list.append(tier_map.get(final_tier, 1))
            weights_list.append(1.0)

        # Process overrides (with higher weight)
        if overrides:
            for override in overrides:
                context = override.get("contextSnapshot", {})
                applicant = context.get("applicant", {})
                disclosures = context.get("disclosures", [])
                sum_assured = context.get("sumAssured", 5000000)

                # Underwriter's choice is the target
                uw_choice = override.get("underwriterChoice", "MODERATE")

                features = self._extract_case_features(applicant, sum_assured, disclosures)
                X_list.append([features.get(f, 0) for f in feature_names])
                y_list.append(tier_map.get(uw_choice, 1))

                # Higher weight for validated overrides
                weight = 2.0 if override.get("validated") else 1.5
                weights_list.append(weight)

        if not X_list:
            return np.array([]), np.array([]), np.array([])

        return (
            np.array(X_list, dtype=np.float32),
            np.array(y_list, dtype=np.int32),
            np.array(weights_list, dtype=np.float32),
        )

    def prepare_test_yield_dataset(
        self,
        test_code: str,
        cases: List[Dict[str, Any]],
        overrides: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare dataset for test yield model training.

        Returns (X, y, sample_weights)
        """
        feature_names = settings.test_yield_features
        X_list = []
        y_list = []
        weights_list = []

        # Process cases with test results
        for case in cases:
            tests = case.get("testResults", [])
            test_result = next((t for t in tests if t.get("testCode") == test_code), None)

            if not test_result:
                continue

            applicant = case.get("applicant", {})
            disclosures = case.get("medicalDisclosures", [])
            sum_assured = case.get("sumAssured", 5000000)

            # Determine if test was informative
            was_informative = self._was_test_informative(test_result)

            features = self._extract_test_features(test_code, applicant, sum_assured, disclosures)
            X_list.append([features.get(f, 0) for f in feature_names])
            y_list.append(1.0 if was_informative else 0.0)
            weights_list.append(1.0)

        # Process test overrides
        if overrides:
            for override in overrides:
                if override.get("details", {}).get("testCode") != test_code:
                    continue

                context = override.get("contextSnapshot", {})
                applicant = context.get("applicant", {})
                disclosures = context.get("disclosures", [])
                sum_assured = context.get("sumAssured", 5000000)

                direction = override.get("direction", "")

                features = self._extract_test_features(test_code, applicant, sum_assured, disclosures)
                X_list.append([features.get(f, 0) for f in feature_names])

                # Added test = expected to be useful, Removed = expected low yield
                if direction == "ADD":
                    y_list.append(0.8)
                elif direction == "REMOVE":
                    y_list.append(0.2)
                else:
                    y_list.append(0.5)

                weights_list.append(1.5)

        if not X_list:
            return np.array([]), np.array([]), np.array([])

        return (
            np.array(X_list, dtype=np.float32),
            np.array(y_list, dtype=np.float32),
            np.array(weights_list, dtype=np.float32),
        )

    def _extract_case_features(
        self,
        applicant: Dict[str, Any],
        sum_assured: float,
        disclosures: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Extract features from case data."""
        condition_flags = FeatureEngineer.extract_condition_flags(disclosures)
        family_flags = FeatureEngineer.extract_family_history_flags(disclosures)
        counts = FeatureEngineer.count_disclosures(disclosures)

        bmi = applicant.get("bmi") or FeatureEngineer.calculate_bmi(
            applicant.get("heightCm"), applicant.get("weightKg")
        )

        return {
            "age": applicant.get("age", 35),
            "bmi": bmi or 24.0,
            "sum_assured": sum_assured / 1000000,
            "smoking_status": FeatureEngineer.encode_smoking_status(applicant.get("smokingStatus")),
            **condition_flags,
            **family_flags,
            **counts,
        }

    def _extract_test_features(
        self,
        test_code: str,
        applicant: Dict[str, Any],
        sum_assured: float,
        disclosures: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Extract features for test yield prediction."""
        base_features = self._extract_case_features(applicant, sum_assured, disclosures)

        # Check if has condition related to test
        condition_flags = FeatureEngineer.extract_condition_flags(disclosures)

        test_condition_map = {
            "HBA1C": ["has_diabetes"],
            "LIPID": ["has_cardiac", "has_diabetes"],
            "ECG": ["has_cardiac", "has_hypertension"],
            "LFT": ["has_hepatic"],
            "RFT": ["has_renal", "has_diabetes", "has_hypertension"],
        }

        related_conditions = test_condition_map.get(test_code, [])
        has_related = any(condition_flags.get(c, False) for c in related_conditions)

        return {
            **base_features,
            "has_condition_related": 1 if has_related else 0,
            "sum_assured_tier": FeatureEngineer.get_sum_assured_tier(sum_assured),
        }

    def _was_test_informative(self, test_result: Dict[str, Any]) -> bool:
        """Determine if a test result was informative/actionable."""
        # Check if result was abnormal or led to action
        if test_result.get("resultStatus") in ["abnormal", "borderline"]:
            return True

        if test_result.get("ledToAction"):
            return True

        # Check if result influenced decision
        if test_result.get("influencedDecision"):
            return True

        return False
