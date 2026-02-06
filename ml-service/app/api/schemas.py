from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class ComplexityTier(str, Enum):
    """Case complexity tiers."""
    ROUTINE = "ROUTINE"
    MODERATE = "MODERATE"
    COMPLEX = "COMPLEX"


class SmokingStatus(str, Enum):
    """Smoking status values."""
    NEVER = "never"
    FORMER = "former"
    CURRENT = "current"


# ============== Request Schemas ==============

class ApplicantData(BaseModel):
    """Applicant information for ML prediction."""
    age: Optional[int] = Field(None, ge=0, le=120)
    bmi: Optional[float] = Field(None, ge=10, le=80)
    smoking_status: Optional[SmokingStatus] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None


class MedicalDisclosure(BaseModel):
    """Medical disclosure information."""
    disclosure_type: str  # condition, medication, family_history
    condition_name: Optional[str] = None
    condition_status: Optional[str] = None
    medication_name: Optional[str] = None
    family_condition: Optional[str] = None
    family_relationship: Optional[str] = None


class ClassifyComplexityRequest(BaseModel):
    """Request to classify case complexity."""
    case_id: str
    applicant: ApplicantData
    sum_assured: float = Field(ge=0)
    medical_disclosures: List[MedicalDisclosure] = []
    existing_risk_factors: List[Dict[str, Any]] = []


class PredictTestYieldRequest(BaseModel):
    """Request to predict test diagnostic yield."""
    case_id: str
    test_code: str  # HBA1C, LIPID, ECG, LFT, RFT, etc.
    applicant: ApplicantData
    sum_assured: float = Field(ge=0)
    medical_disclosures: List[MedicalDisclosure] = []


class TriggerTrainingRequest(BaseModel):
    """Request to trigger model retraining."""
    model_type: str = Field(..., pattern="^(complexity|test_yield)$")
    force: bool = False


# ============== Response Schemas ==============

class FeatureContribution(BaseModel):
    """Feature contribution to prediction."""
    feature: str
    value: Any
    contribution: float
    direction: str  # "increases", "decreases", "neutral"


class ComplexityPrediction(BaseModel):
    """Complexity classification result."""
    tier: ComplexityTier
    confidence: float = Field(ge=0, le=1)
    probabilities: Dict[str, float]
    feature_contributions: List[FeatureContribution]
    model_version: str


class TestYieldPrediction(BaseModel):
    """Test yield prediction result."""
    test_code: str
    predicted_yield: float = Field(ge=0, le=1, description="Probability of informative result")
    confidence: float = Field(ge=0, le=1)
    recommendation: str  # "recommended", "optional", "low_yield"
    feature_contributions: List[FeatureContribution]
    model_version: str


class TrainingJobStatus(BaseModel):
    """Training job status."""
    job_id: str
    model_type: str
    status: str  # "pending", "running", "completed", "failed"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    samples_used: Optional[int] = None
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None


class ModelInfo(BaseModel):
    """Model information."""
    model_type: str
    version: str
    trained_at: Optional[datetime] = None
    samples_trained: Optional[int] = None
    metrics: Dict[str, float] = {}
    features: List[str] = []


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    models_loaded: Dict[str, bool]
    uptime_seconds: float
