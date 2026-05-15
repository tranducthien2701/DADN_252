from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

from backend.services.simulation_service import SimulationService, build_error_response

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "status": "success",
        "message": "FEM API is running",
    }


@app.post("/api/process-mesh")
async def process_mesh(data: Request):
    try:
        content = await data.json()
        print("Received:", content)
        return SimulationService.run(content)

    except ValueError as e:
        return build_error_response(
            "INVALID_INPUT",
            str(e),
            suggested_action="Edit geometry, material, boundary condition, or mesh settings and retry.",
        )
    except np.linalg.LinAlgError as e:
        return build_error_response(
            "SOLVER_FAILED",
            str(e),
            suggested_action="Check supports and loads. The model may be under-constrained.",
        )
    except Exception as e:
        return build_error_response(
            "INTERNAL_ERROR",
            str(e),
            suggested_action="Retry the simulation or inspect the backend logs.",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
