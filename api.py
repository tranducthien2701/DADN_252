from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

# IMPORT ĐÚNG PIPELINE GỐC
from ThuatToan_Final.step1_meshing import MeshGenerator
from ThuatToan_Final.step2_get_D_matrix import get_D_matrix
from ThuatToan_Final.step5_assemble_global import assemble_K_global
from ThuatToan_Final.step6_solve_system import apply_bcs_and_solve

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
    return {"message": "FEM API (refactored) is running!"}


# ==========================================
# MAP DATA TỪ APP → CONFIG FEM
# ==========================================
def build_fem_config(content):
    dimensions = content.get("dimensions", {})
    physics = content.get("physics", {})
    meshing = content.get("meshingConfig", {})

    width = float(dimensions.get("width", 2.0))
    height = float(dimensions.get("height", 1.0))

    E = float(physics.get("youngModulus", 20e9))
    nu = float(physics.get("poissonRatio", 0.3))
    thickness = float(physics.get("thickness", 0.1))
    pressure = float(physics.get("pressure", 10000))

    nx = int(meshing.get("nx", 5))
    ny = int(meshing.get("ny", 1))

    config = {
        "material": {
            "E": E,
            "nu": nu,
            "thickness": thickness
        },
        "geometry": {
            "start_x": 0.0,
            "start_y": 0.0,
            "end_x": width,
            "end_y": height
        },
        "numerical_integration": {
            "method": "gauss_quadrature",
            "order": 2
        },
        "mesh": {
            "mesh_source": "auto",
            "element_type": "quad",
            "nx": nx,
            "ny": ny
        },
        "boundary_conditions": {
            "method": "zeroing_out",
            "fix_nodes": [
                {
                    "target": "x_equal",
                    "value": 0.0,
                    "dof": ["u", "v"]
                }
            ],
            "point_loads": [
                {
                    "target": "coordinate",
                    "value": [width, height],
                    "force": [0, -abs(pressure)]
                }
            ]
        }
    }

    return config


# ==========================================
# API CHÍNH
# ==========================================
@app.post("/api/process-mesh")
async def process_mesh(data: Request):
    try:
        content = await data.json()
        print("Received:", content)

        # 1. BUILD CONFIG CHUẨN FEM
        config = build_fem_config(content)

        # 2. MESHING (STEP 1)
        mesher = MeshGenerator(config)
        nodes, elements = mesher.generate()

        # 3. MATERIAL MATRIX (STEP 2)
        D = get_D_matrix(config)

        # 4 + 5. ASSEMBLE GLOBAL
        K_global = assemble_K_global(nodes, elements, D, config, verbose=False)

        # 6. APPLY BC + SOLVE
        U_global, F_global = apply_bcs_and_solve(K_global, nodes, config)

        # 7. POST-PROCESS
        scale_factor = 200.0
        U_formatted = U_global.reshape(-1, 2)
        deformed_nodes = nodes + U_formatted * scale_factor

        # FORMAT OUTPUT CHO FRONTEND
        nodes_out = [{"id": i, "x": float(n[0]), "y": float(n[1])} for i, n in enumerate(nodes)]
        elements_out = [{"id": i, "nodes": list(map(int, el))} for i, el in enumerate(elements)]
        deformed_out = [{"id": i, "x": float(n[0]), "y": float(n[1])} for i, n in enumerate(deformed_nodes)]
        disp_out = [{"id": i, "ux": float(u[0]), "uy": float(u[1])} for i, u in enumerate(U_formatted)]

        return {
            "status": "success",
            "nodes": nodes_out,
            "elements": elements_out,
            "deformedNodes": deformed_out,
            "displacements": disp_out,
            "nodeCount": len(nodes_out),
            "elementCount": len(elements_out),
            "scaleFactor": scale_factor,
            "meshInfo": config["mesh"]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


# RUN SERVER
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)