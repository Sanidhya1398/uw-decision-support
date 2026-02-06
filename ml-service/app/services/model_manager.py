"""
Model manager for loading, versioning, and switching between model versions.
"""

from typing import Dict, Optional, Any
import os
from datetime import datetime

from ..models.complexity_model import ComplexityModel
from ..models.test_yield_model import TestYieldModel
from ..config import get_settings

settings = get_settings()


class ModelManager:
    """Manages ML model lifecycle including loading, versioning, and hot-swapping."""

    def __init__(self):
        self.complexity_model: Optional[ComplexityModel] = None
        self.test_yield_model: Optional[TestYieldModel] = None
        self.current_version: str = settings.current_model_version

        # Auto-load models on initialization
        self._load_models()

    def _load_models(self) -> None:
        """Load all models from disk."""
        # Load complexity model
        self.complexity_model = ComplexityModel()
        loaded = self.complexity_model.load(self.current_version)
        if not loaded:
            print(f"Complexity model not found for version {self.current_version}, using rule-based fallback")

        # Load test yield models
        self.test_yield_model = TestYieldModel()
        loaded_tests = self.test_yield_model.load(self.current_version)
        loaded_count = sum(1 for v in loaded_tests.values() if v)
        print(f"Loaded {loaded_count}/{len(loaded_tests)} test yield models")

    def get_loaded_models(self) -> Dict[str, bool]:
        """Get status of loaded models."""
        result = {
            "complexity": self.complexity_model.is_fitted if self.complexity_model else False,
        }

        if self.test_yield_model:
            for test_code in self.test_yield_model.SUPPORTED_TESTS:
                result[f"test_yield_{test_code.lower()}"] = self.test_yield_model.is_fitted.get(test_code, False)

        return result

    def get_model_info(self) -> Dict[str, Any]:
        """Get detailed information about all models."""
        info = {}

        # Complexity model info
        if self.complexity_model:
            info["complexity"] = {
                "model_type": "complexity",
                "version": self.complexity_model.version,
                "trained_at": None,  # Would be stored in model metadata
                "samples_trained": None,
                "metrics": self.complexity_model.training_metrics,
                "features": self.complexity_model.feature_names,
            }

        # Test yield models info
        if self.test_yield_model:
            for test_code in self.test_yield_model.SUPPORTED_TESTS:
                if self.test_yield_model.is_fitted.get(test_code, False):
                    info[f"test_yield_{test_code.lower()}"] = {
                        "model_type": "test_yield",
                        "test_code": test_code,
                        "version": self.test_yield_model.version,
                        "trained_at": None,
                        "samples_trained": None,
                        "metrics": self.test_yield_model.training_metrics.get(test_code, {}),
                        "features": self.test_yield_model.feature_names,
                    }

        return info

    def reload_models(self, version: str = None) -> Dict[str, bool]:
        """Reload models, optionally from a different version."""
        if version:
            self.current_version = version

        self._load_models()
        return self.get_loaded_models()

    def get_available_versions(self) -> list:
        """Get list of available model versions."""
        model_dir = settings.model_dir
        if not os.path.exists(model_dir):
            return []

        versions = []
        for item in os.listdir(model_dir):
            item_path = os.path.join(model_dir, item)
            if os.path.isdir(item_path) and item.startswith("v"):
                versions.append(item)

        return sorted(versions, reverse=True)

    def save_complexity_model(self, version: str = None) -> str:
        """Save the current complexity model."""
        if not self.complexity_model:
            raise ValueError("No complexity model loaded")
        return self.complexity_model.save(version)

    def save_test_yield_model(self, test_code: str, version: str = None) -> str:
        """Save a specific test yield model."""
        if not self.test_yield_model:
            raise ValueError("No test yield model loaded")
        return self.test_yield_model.save(test_code, version)

    def update_complexity_model(self, model: ComplexityModel) -> None:
        """Hot-swap the complexity model."""
        self.complexity_model = model

    def update_test_yield_model(self, test_code: str, model: TestYieldModel) -> None:
        """Update a specific test yield model."""
        if self.test_yield_model:
            self.test_yield_model.models[test_code] = model.models.get(test_code)
            self.test_yield_model.is_fitted[test_code] = True
