from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Dict, Optional
import time
import uuid
import tempfile
import os
import shutil

from .schemas import (
    ClassifyComplexityRequest,
    PredictTestYieldRequest,
    TriggerTrainingRequest,
    ComplexityPrediction,
    TestYieldPrediction,
    TrainingJobStatus,
    ModelInfo,
    HealthResponse,
)
from ..services.inference_service import InferenceService
from ..services.model_manager import ModelManager
from ..services.ocr_service import process_document, extract_with_structure
from ..config import get_settings

router = APIRouter()
settings = get_settings()

# Initialize services
model_manager = ModelManager()
inference_service = InferenceService(model_manager)

# Track service start time
START_TIME = time.time()

# Track training jobs
training_jobs: Dict[str, TrainingJobStatus] = {}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and model status."""
    return HealthResponse(
        status="healthy",
        version=settings.api_version,
        models_loaded=model_manager.get_loaded_models(),
        uptime_seconds=time.time() - START_TIME,
    )


@router.get("/models/info", response_model=Dict[str, ModelInfo])
async def get_model_info():
    """Get information about loaded models."""
    return model_manager.get_model_info()


@router.post("/classify-complexity", response_model=ComplexityPrediction)
async def classify_complexity(request: ClassifyComplexityRequest):
    """Classify case complexity using ML model."""
    try:
        prediction = inference_service.predict_complexity(
            case_id=request.case_id,
            applicant=request.applicant.model_dump(),
            sum_assured=request.sum_assured,
            medical_disclosures=[d.model_dump() for d in request.medical_disclosures],
            existing_risk_factors=request.existing_risk_factors,
        )
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict-test-yield", response_model=TestYieldPrediction)
async def predict_test_yield(request: PredictTestYieldRequest):
    """Predict diagnostic yield for a test."""
    try:
        prediction = inference_service.predict_test_yield(
            case_id=request.case_id,
            test_code=request.test_code,
            applicant=request.applicant.model_dump(),
            sum_assured=request.sum_assured,
            medical_disclosures=[d.model_dump() for d in request.medical_disclosures],
        )
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/training/trigger", response_model=TrainingJobStatus)
async def trigger_training(request: TriggerTrainingRequest, background_tasks: BackgroundTasks):
    """Trigger model retraining."""
    job_id = str(uuid.uuid4())

    # Create job status
    job = TrainingJobStatus(
        job_id=job_id,
        model_type=request.model_type,
        status="pending",
    )
    training_jobs[job_id] = job

    # Start training in background
    async def run_training():
        from ..training.trainer import Trainer
        trainer = Trainer(model_manager)

        job.status = "running"
        import datetime
        job.started_at = datetime.datetime.utcnow()

        try:
            result = await trainer.train(
                model_type=request.model_type,
                force=request.force,
            )
            job.status = "completed"
            job.completed_at = datetime.datetime.utcnow()
            job.samples_used = result.get("samples_used")
            job.metrics = result.get("metrics")
        except Exception as e:
            job.status = "failed"
            job.error = str(e)

    background_tasks.add_task(run_training)

    return job


@router.get("/training/status/{job_id}", response_model=TrainingJobStatus)
async def get_training_status(job_id: str):
    """Get status of a training job."""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    return training_jobs[job_id]


# ============== OCR Endpoints ==============

@router.post("/ocr/extract")
async def extract_text_from_document(
    file: UploadFile = File(...),
    extract_structure: bool = Form(default=False),
):
    """
    Extract text from uploaded document using PaddleOCR.

    Supports:
    - PDF files (searchable and scanned)
    - Images (PNG, JPG, TIFF, etc.)

    Args:
        file: Uploaded document file
        extract_structure: If True, also extract tables and layout structure

    Returns:
        Extracted text, confidence score, and metadata
    """
    # Validate file type
    allowed_types = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/tiff",
        "image/bmp",
    ]

    content_type = file.content_type or "application/octet-stream"
    if content_type not in allowed_types and not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Supported: PDF, PNG, JPG, TIFF"
        )

    # Save uploaded file to temp location
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename or "document")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process document
        result = process_document(temp_path, content_type)

        # Optionally extract structure (tables, etc.)
        if extract_structure and result.get("text"):
            structure = extract_with_structure(temp_path)
            result["structure"] = structure

        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "content_type": content_type,
            "extraction": result,
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

    finally:
        # Cleanup temp files
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except:
            pass


@router.post("/ocr/extract-from-path")
async def extract_text_from_path(
    file_path: str = Form(...),
    file_type: str = Form(default="application/pdf"),
):
    """
    Extract text from a file already on the server (for backend integration).

    Args:
        file_path: Path to the file on the server
        file_type: MIME type of the file

    Returns:
        Extracted text, confidence score, and metadata
    """
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    try:
        result = process_document(file_path, file_type)
        return JSONResponse(content={
            "success": True,
            "file_path": file_path,
            "extraction": result,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.get("/ocr/health")
async def ocr_health():
    """Check OCR service availability."""
    from ..services.ocr_service import get_ocr

    ocr = get_ocr()
    return {
        "ocr_available": ocr is not None,
        "engine": "EasyOCR" if ocr else "unavailable",
        "supported_formats": ["PDF", "PNG", "JPG", "TIFF", "BMP"],
        "features": [
            "Text extraction",
            "Scanned document OCR",
            "Multi-language support (80+ languages)",
            "Handwriting recognition",
        ]
    }
