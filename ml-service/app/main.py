"""
FastAPI entry point for the ML Service.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .api.routes import router

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Machine Learning microservice for underwriting decision support",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": settings.api_title,
        "version": settings.api_version,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize models on startup."""
    print(f"Starting {settings.api_title} v{settings.api_version}")
    print(f"Model directory: {settings.model_dir}")
    print(f"API prefix: {settings.api_prefix}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down ML Service")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
