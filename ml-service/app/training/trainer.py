"""
Training orchestration for ML models.
"""

from typing import Dict, Any, Optional
import numpy as np
from datetime import datetime

from ..models.complexity_model import ComplexityModel
from ..models.test_yield_model import TestYieldModel
from ..services.model_manager import ModelManager
from ..config import get_settings
from .data_loader import DataLoader

settings = get_settings()


class Trainer:
    """Orchestrates model training."""

    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.data_loader = DataLoader()

    async def train(
        self,
        model_type: str,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Train a model.

        Args:
            model_type: "complexity" or "test_yield"
            force: Force training even with insufficient data

        Returns:
            Training result with metrics
        """
        if model_type == "complexity":
            return await self.train_complexity_model(force=force)
        elif model_type == "test_yield":
            return await self.train_all_test_yield_models(force=force)
        else:
            raise ValueError(f"Unknown model type: {model_type}")

    async def train_complexity_model(
        self,
        force: bool = False,
        new_version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Train the complexity classification model."""
        result = {
            "model_type": "complexity",
            "started_at": datetime.utcnow().isoformat(),
            "status": "running",
        }

        try:
            # Fetch training data
            cases = await self.data_loader.fetch_cases_for_training(limit=2000)
            overrides = await self.data_loader.fetch_overrides("COMPLEXITY_TIER", since_days=90)

            # Prepare dataset
            X, y, sample_weights = self.data_loader.prepare_complexity_dataset(cases, overrides)

            if len(X) == 0:
                result["status"] = "failed"
                result["error"] = "No training data available"
                return result

            if len(X) < settings.min_training_samples and not force:
                result["status"] = "failed"
                result["error"] = f"Insufficient training samples: {len(X)} < {settings.min_training_samples}"
                return result

            # Train model
            model = ComplexityModel()
            metrics = model.fit(X, y)

            # Generate new version if not specified
            version = new_version or self._generate_version()
            model.version = version

            # Save model
            model_path = model.save(version)

            # Update model manager
            self.model_manager.update_complexity_model(model)

            result["status"] = "completed"
            result["samples_used"] = len(X)
            result["metrics"] = metrics
            result["version"] = version
            result["model_path"] = model_path

        except Exception as e:
            result["status"] = "failed"
            result["error"] = str(e)

        result["completed_at"] = datetime.utcnow().isoformat()
        return result

    async def train_all_test_yield_models(
        self,
        force: bool = False,
    ) -> Dict[str, Any]:
        """Train all test yield models."""
        result = {
            "model_type": "test_yield",
            "started_at": datetime.utcnow().isoformat(),
            "status": "running",
            "models": {},
        }

        try:
            # Fetch data once
            cases = await self.data_loader.fetch_cases_for_training(limit=2000)
            overrides = await self.data_loader.fetch_overrides("TEST_RECOMMENDATION", since_days=90)

            version = self._generate_version()

            for test_code in TestYieldModel.SUPPORTED_TESTS:
                model_result = await self.train_test_yield_model(
                    test_code, cases, overrides, force=force, version=version
                )
                result["models"][test_code] = model_result

            # Check if any model succeeded
            succeeded = sum(1 for r in result["models"].values() if r.get("status") == "completed")
            if succeeded > 0:
                result["status"] = "completed"
                result["version"] = version
            else:
                result["status"] = "failed"
                result["error"] = "No models could be trained"

        except Exception as e:
            result["status"] = "failed"
            result["error"] = str(e)

        result["completed_at"] = datetime.utcnow().isoformat()
        return result

    async def train_test_yield_model(
        self,
        test_code: str,
        cases: list,
        overrides: list,
        force: bool = False,
        version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Train a single test yield model."""
        result = {
            "test_code": test_code,
            "status": "running",
        }

        try:
            # Prepare dataset
            X, y, sample_weights = self.data_loader.prepare_test_yield_dataset(
                test_code, cases, overrides
            )

            if len(X) == 0:
                result["status"] = "skipped"
                result["reason"] = "No training data"
                return result

            min_samples = settings.min_training_samples // 2  # Lower threshold for individual tests
            if len(X) < min_samples and not force:
                result["status"] = "skipped"
                result["reason"] = f"Insufficient samples: {len(X)} < {min_samples}"
                return result

            # Train model
            test_model = self.model_manager.test_yield_model
            if not test_model:
                test_model = TestYieldModel()

            metrics = test_model.fit(test_code, X, y)

            # Save
            v = version or self._generate_version()
            test_model.version = v
            model_path = test_model.save(test_code, v)

            result["status"] = "completed"
            result["samples_used"] = len(X)
            result["metrics"] = metrics
            result["model_path"] = model_path

        except Exception as e:
            result["status"] = "failed"
            result["error"] = str(e)

        return result

    def _generate_version(self) -> str:
        """Generate a new version string."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"v{timestamp}"
