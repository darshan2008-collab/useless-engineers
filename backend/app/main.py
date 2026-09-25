from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.database import init_db
from backend.app.api.routes import datasets, processing, benchmarks, results, simulation


# Initialize database tables on load
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Q-SENSE database and environment...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down Q-SENSE engine.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Quantum-Assisted Spatio-Temporal Sensor Denoising Engine",
    lifespan=lifespan
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(datasets.router, prefix="/api")
app.include_router(processing.router, prefix="/api")
app.include_router(benchmarks.router, prefix="/api")
app.include_router(results.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")


@app.get("/")
def root():
    return {
        "engine": "Q-SENSE",
        "name": "Quantum-Assisted Spatio-Temporal Sensor Denoising Engine",
        "status": "ONLINE",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "qsense-backend"}
