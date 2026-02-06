"""
Override learning service for incorporating underwriter feedback into models.
"""

from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime, timedelta
import httpx

from ..config import get_settings

settings = get_settings()


class OverrideLearningService:
    """Service for learning from underwriter overrides."""

    def __init__(self):
        self.backend_url = settings.backend_url

    async def fetch_overrides(
        self,
        override_type: str,
        since_days: int = 30,
        validated_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """Fetch override data from Node.js backend."""
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "type": override_type,
                    "days": since_days,
                    "validated": validated_only,
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

    async def fetch_complexity_overrides(self, since_days: int = 30) -> List[Dict[str, Any]]:
        """Fetch complexity tier overrides for training."""
        return await self.fetch_overrides("COMPLEXITY_TIER", since_days)

    async def fetch_test_overrides(self, since_days: int = 30) -> List[Dict[str, Any]]:
        """Fetch test recommendation overrides for training."""
        return await self.fetch_overrides("TEST_RECOMMENDATION", since_days)

    def prepare_complexity_training_data(
        self,
        overrides: List[Dict[str, Any]],
    ) -> tuple:
        """
        Prepare training data from complexity overrides.

        Returns (X, y, sample_weights) where:
        - X: Feature matrix
        - y: Target labels (underwriter's choice)
        - sample_weights: Higher weight for validated overrides
        """
        if not overrides:
            return None, None, None

        features_list = []
        labels = []
        weights = []

        tier_map = {"ROUTINE": 0, "MODERATE": 1, "COMPLEX": 2}

        for override in overrides:
            context = override.get("contextSnapshot", {})
            case_data = context.get("case", {})
            applicant = context.get("applicant", {})

            # Extract features
            features = {
                "age": applicant.get("age", 35),
                "bmi": applicant.get("bmi", 24),
                "sum_assured": case_data.get("sumAssured", 5000000) / 1000000,
                "smoking_status": 2 if applicant.get("smokingStatus") == "current" else 0,
                "condition_count": len(context.get("conditions", [])),
                "medication_count": len(context.get("medications", [])),
                "has_cardiac": 1 if context.get("hasCardiac") else 0,
                "has_diabetes": 1 if context.get("hasDiabetes") else 0,
                "has_hypertension": 1 if context.get("hasHypertension") else 0,
                "has_renal": 1 if context.get("hasRenal") else 0,
                "family_history_cardiac": 1 if context.get("familyHistoryCardiac") else 0,
                "family_history_diabetes": 1 if context.get("familyHistoryDiabetes") else 0,
            }

            features_list.append(list(features.values()))

            # Use underwriter's choice as the label
            uw_choice = override.get("underwriterChoice", "MODERATE")
            labels.append(tier_map.get(uw_choice, 1))

            # Weight based on validation status and underwriter experience
            weight = 1.0
            if override.get("validatedByChief"):
                weight = 2.0
            elif override.get("validated"):
                weight = 1.5

            # Bonus weight for experienced underwriters
            exp_years = override.get("underwriterExperienceYears", 0)
            if exp_years >= 10:
                weight *= 1.3
            elif exp_years >= 5:
                weight *= 1.1

            weights.append(weight)

        X = np.array(features_list, dtype=np.float32)
        y = np.array(labels, dtype=np.int32)
        sample_weights = np.array(weights, dtype=np.float32)

        return X, y, sample_weights

    def prepare_test_yield_training_data(
        self,
        overrides: List[Dict[str, Any]],
        test_code: str,
    ) -> tuple:
        """
        Prepare training data from test recommendation overrides.

        For test yield, we use:
        - Added tests (underwriter added) -> higher yield expected
        - Removed tests (underwriter removed) -> lower yield expected
        """
        if not overrides:
            return None, None, None

        # Filter to relevant test overrides
        relevant = [
            o for o in overrides
            if o.get("details", {}).get("testCode") == test_code
        ]

        if not relevant:
            return None, None, None

        features_list = []
        labels = []  # 1 = high yield, 0 = low yield
        weights = []

        for override in relevant:
            context = override.get("contextSnapshot", {})
            applicant = context.get("applicant", {})

            features = {
                "age": applicant.get("age", 35),
                "bmi": applicant.get("bmi", 24),
                "smoking_status": 2 if applicant.get("smokingStatus") == "current" else 0,
                "condition_count": len(context.get("conditions", [])),
                "has_condition_related": 1 if context.get("hasRelatedCondition") else 0,
                "sum_assured_tier": self._get_sa_tier(context.get("sumAssured", 0)),
            }

            features_list.append(list(features.values()))

            # Determine label based on override direction
            direction = override.get("direction", "")
            if direction == "ADD":
                # Underwriter added this test -> they expect it to be useful
                labels.append(0.8)
            elif direction == "REMOVE":
                # Underwriter removed this test -> they expect it to be low yield
                labels.append(0.2)
            else:
                # Substitution or other -> neutral
                labels.append(0.5)

            # Weight
            weight = 1.0 if override.get("validated") else 0.7
            weights.append(weight)

        X = np.array(features_list, dtype=np.float32)
        y = np.array(labels, dtype=np.float32)
        sample_weights = np.array(weights, dtype=np.float32)

        return X, y, sample_weights

    def _get_sa_tier(self, sum_assured: float) -> int:
        """Convert sum assured to tier."""
        if sum_assured >= 10000000:
            return 3
        elif sum_assured >= 5000000:
            return 2
        elif sum_assured >= 2500000:
            return 1
        return 0

    def calculate_learning_metrics(
        self,
        overrides: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Calculate learning insights from override patterns."""
        if not overrides:
            return {}

        # Direction distribution
        directions = {}
        for o in overrides:
            d = o.get("direction", "UNKNOWN")
            directions[d] = directions.get(d, 0) + 1

        # Reasoning tags distribution
        tags = {}
        for o in overrides:
            for tag in o.get("reasoningTags", []):
                tags[tag] = tags.get(tag, 0) + 1

        # Underwriter agreement rate (if multiple underwriters override same case)
        validated_count = sum(1 for o in overrides if o.get("validated"))

        return {
            "total_overrides": len(overrides),
            "validated_count": validated_count,
            "validation_rate": validated_count / len(overrides) if overrides else 0,
            "direction_distribution": directions,
            "common_reasoning_tags": dict(sorted(tags.items(), key=lambda x: -x[1])[:10]),
        }
