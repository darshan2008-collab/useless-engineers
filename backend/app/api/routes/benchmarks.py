from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.models.database import get_db, ProcessingRun
from backend.app.models.schemas import ApiResponse, ErrorItem
from backend.app.services.benchmark_service import BenchmarkService

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


@router.get("/{run_id}", response_model=ApiResponse)
def get_run_benchmark(run_id: str, db: Session = Depends(get_db)):
    """
    Section 34, 35 & 40: Return benchmark comparing Raw vs MA vs Gaussian vs Kalman vs Hybrid Quantum.
    """
    run = db.query(ProcessingRun).filter(ProcessingRun.id == run_id).first()
    if not run:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NOT_FOUND", message=f"Run {run_id} not found")]
        )

    try:
        benchmark_data = BenchmarkService.get_or_run_benchmark(run, db)
        return ApiResponse(
            success=True,
            data=benchmark_data.model_dump(),
            metadata={"run_id": run.id, "evaluation_available": True}
        )
    except Exception as e:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="BENCHMARK_ERROR", message=str(e))]
        )
