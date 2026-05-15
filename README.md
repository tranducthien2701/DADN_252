# Mobile-based FEA Meshing System

A multidisciplinary academic project focused on **Information Systems**, **Software Engineering**, and **2D Finite Element Analysis (FEA)**.

The system provides a mobile workflow for defining 2D geometry, configuring material and mesh parameters, running a Python/FastAPI FEA backend, visualizing mesh and displacement results, managing local simulation projects, and exporting simulation data as JSON.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Implemented Features](#implemented-features)
3. [Supported Simulation Modes](#supported-simulation-modes)
4. [System Architecture](#system-architecture)
5. [Repository Structure](#repository-structure)
6. [Prerequisites](#prerequisites)
7. [Backend Setup](#backend-setup)
8. [Mobile App Setup](#mobile-app-setup)
9. [Running the Full System](#running-the-full-system)
10. [Final Demo Flow](#final-demo-flow)
11. [API Overview](#api-overview)
12. [Important Notes for Submission](#important-notes-for-submission)
13. [Troubleshooting](#troubleshooting)
14. [Documentation](#documentation)
15. [Limitations and Future Work](#limitations-and-future-work)

---

## Project Overview

This project is an educational mobile-based FEA meshing and simulation prototype. It demonstrates how a mobile information system can manage the full simulation workflow:

```text
Geometry Input
→ Mesh Configuration
→ Backend Simulation
→ FEA Computation
→ Result Visualization
→ Project History
→ JSON Export
```

The project is designed for academic demonstration. It is not an industrial-grade FEA solver, but it implements a clear and explainable workflow for small 2D linear-static demo cases.

The system has two main parts:

| Part | Technology | Responsibility |
|---|---|---|
| Mobile App | React Native | UI, geometry input, project management, dashboard, export |
| Backend API | Python + FastAPI | Validation, meshing, FEA pipeline, result formatting |

---

## Implemented Features

### Mobile App

- React Native mobile application.
- Project home screen with local project history.
- Project search, rename, and delete.
- Project detail modal with latest mesh preview.
- Geometry editor with:
  - Rectangle mode.
  - Custom polygon mode using editable `x,y` points.
- Mesh setup with:
  - Q4 structured rectangle mesh.
  - T3 structured rectangle mesh.
  - Delaunay T3 custom polygon mesh.
- Material and load parameter input.
- Processing screen with simulation pipeline progress.
- Error handling for backend connection or validation failure.
- Result dashboard with:
  - Original mesh layer.
  - Deformed mesh layer.
  - Displacement contour lite.
  - Fixed support markers.
  - Load vector markers.
  - Bad element highlight layer.
  - Simulation metadata.
  - Boundary summary.
  - Displacement result summary.
  - Mesh quality metrics.
- JSON export package v1.1.

### Backend

- FastAPI backend.
- Modular backend structure under `backend/`.
- Compatibility root entrypoint through `api.py`.
- Simulation service and pipeline wrapper.
- FEA core compatibility layer.
- Q4 element support.
- T3/CST element support.
- Q4/T3 global assembly dispatcher.
- Structured rectangle meshing.
- Delaunay custom polygon T3 meshing.
- Linear static solve for educational demo scenarios.
- Structured API response with mesh, result, boundary visualization, quality, and metadata.

---

## Supported Simulation Modes

| Geometry | Algorithm | Element Type | Status |
|---|---|---|---|
| Rectangle | Structured | Q4 | Implemented |
| Rectangle | Structured | T3 | Implemented |
| Custom Polygon | Delaunay | T3 | Implemented |
| Custom Polygon | Delaunay | Q4 | Not supported |

Current custom polygon input works best with simple or convex point sets. Robust concave polygon clipping/filtering is future work.

---

## System Architecture

High-level architecture:

```text
React Native Mobile App
        |
        | HTTP JSON Request
        v
FastAPI Backend
        |
        v
SimulationPipeline
        |
        v
FEA Core Modules
        |
        v
Structured JSON Response
        |
        v
Mobile Visualization Dashboard + Local Project Storage
```

Backend pipeline:

```text
Validate Input
→ Build FEM Config
→ Generate Mesh
→ Build Material Matrix
→ Assemble Global Stiffness Matrix
→ Apply Boundary Conditions
→ Solve Linear System
→ Post-process Displacement
→ Compute Mesh Quality
→ Format API Response
```

---

## Repository Structure

```text
Mobile-based-FEA-Meshing-System/
├── api.py                         # Compatibility backend entrypoint: uvicorn api:app
├── requirements.txt               # Root Python dependencies for backend setup
├── backend/
│   ├── __init__.py
│   ├── main.py                    # Main FastAPI app: uvicorn backend.main:app
│   ├── requirements.txt
│   ├── services/
│   │   ├── __init__.py
│   │   └── simulation_service.py  # SimulationService + SimulationPipeline
│   └── fea_core/
│       ├── __init__.py
│       ├── meshing.py
│       ├── material.py
│       ├── element_q4.py
│       ├── element_t3.py
│       ├── assembly.py
│       ├── solver.py
│       └── quality.py
├── base/                          # React Native mobile app
│   ├── package.json
│   ├── android/
│   ├── ios/
│   └── src/
│       ├── screen/
│       │   ├── MyProjects.js
│       │   ├── GeometryEditor.js
│       │   ├── ProcessingStatus.js
│       │   └── MeshQualityView.js
│       ├── services/
│       │   └── feaApi.js
│       ├── storage/
│       │   └── projectStorage.js
│       └── utils/
│           └── exportSimulation.js
└── ThuatToan_Final/               # Original academic FEA core used by compatibility wrappers

```

Important: `ThuatToan_Final/` is still required because several backend FEA wrapper modules depend on the original academic implementation.

---

## Prerequisites

### Required Software

- Python 3.10 or later recommended.
- Node.js 18 or later recommended.
- npm.
- Android Studio.
- Android SDK and Android emulator.
- Java/JDK compatible with React Native Android build.
- Git.

### Recommended Development Environment

- Windows 10/11.
- Android Studio emulator.
- VS Code or another code editor.
- PowerShell or terminal.

---

## Backend Setup

Open a terminal at the repository root:

```bash
cd Mobile-based-FEA-Meshing-System
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\.venv\Scripts\activate
```

Windows CMD:

```cmd
.venv\Scripts\activate.bat
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Run the backend using the modular entrypoint:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Alternative compatibility command:

```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/
```

Expected response:

```json
{
  "status": "success",
  "message": "FEM API is running"
}
```

Keep this backend terminal running while using the mobile app.

---

## Mobile App Setup

Open a second terminal and go to the React Native app folder:

```bash
cd Mobile-based-FEA-Meshing-System/base
```

Install mobile dependencies:

```bash
npm install
```

Start Metro bundler if needed (in another terminal):

```bash
npm start
```

In another terminal inside `base/`, run the Android app:

```bash
npm run android
```

### Android Emulator Backend URL

For Android emulator, the app should call the backend through:

```text
http://10.0.2.2:8000
```

This is the Android emulator alias for the host machine's localhost.

### Physical Android Device Backend URL

For a physical Android device, use the laptop's LAN IP address:

```text
http://<laptop-lan-ip>:8000
```

The phone and laptop must be connected to the same network.

---

## Running the Full System

Use two terminals.

### Terminal 1 — Backend

```bash
cd Mobile-based-FEA-Meshing-System
.\.venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Terminal 2 — Mobile App

```bash
cd Mobile-based-FEA-Meshing-System/base
npm install
npm run android
```

Then open the app on the Android emulator and run one of the demo flows.

---

## Final Demo Flow

Recommended demo order:

### 1. Rectangle Q4 Structured Mesh

```text
My Projects
→ Geometry Editor
→ Rectangle
→ Create Rectangle
→ Element Type: Q4
→ Start Generation
→ Mesh & Quality View
```

Expected dashboard label:

```text
RECTANGLE Q4 • STRUCTURED
```

### 2. Rectangle T3 Structured Mesh

```text
My Projects
→ Geometry Editor
→ Rectangle
→ Create Rectangle
→ Element Type: T3
→ Start Generation
→ Mesh & Quality View
```

Expected dashboard label:

```text
RECTANGLE T3 • STRUCTURED
```

### 3. Custom Polygon Delaunay T3 Mesh

Default polygon points:

```text
0,0
2,0
2,1
1,1.4
0,1
```

Flow:

```text
My Projects
→ Geometry Editor
→ Polygon
→ Create Polygon
→ Start Generation
→ Mesh & Quality View
```

Expected dashboard label:

```text
POLYGON T3 • DELAUNAY
```

### 4. Project History

After running simulations:

```text
Return to My Projects
→ Search Q4 / T3 / Delaunay / Polygon
→ Open project detail
→ Inspect latest mesh preview
→ Rename project
→ Delete test project if needed
```

### 5. Export JSON

From Mesh & Quality View:

```text
Export
→ Inspect JSON package
```

Export package includes:

- Geometry input.
- Material input.
- Boundary conditions.
- Mesh configuration.
- Solver settings.
- Output mesh.
- Displacement results.
- Quality metrics.
- Metadata.

---

## API Overview

### Health Check

```http
GET /
```

### Run Simulation

```http
POST /api/process-mesh
```

Example rectangle request:

```json
{
  "geometry": {
    "type": "rectangle",
    "rectangle": {
      "width": 2.0,
      "height": 1.0
    }
  },
  "material": {
    "youngModulus": 20000000000,
    "poissonRatio": 0.3,
    "thickness": 0.1
  },
  "meshConfig": {
    "algorithm": "structured",
    "elementType": "quad",
    "nx": 5,
    "ny": 1,
    "minAngleDeg": 28.5,
    "maxArea": 0.05
  },
  "boundaryConditions": {
    "constraints": [
      {
        "type": "fixed",
        "target": "edge",
        "selector": { "edge": "left" },
        "dof": ["u", "v"]
      }
    ],
    "loads": [
      {
        "type": "point_load",
        "target": "coordinate",
        "coordinate": [2.0, 1.0],
        "force": [0, -10000]
      }
    ]
  },
  "solverSettings": {
    "analysisType": "linear_static",
    "scaleFactor": 200
  }
}
```

Example custom polygon request:

```json
{
  "geometry": {
    "type": "polygon",
    "polygon": {
      "points": [
        [0, 0],
        [2, 0],
        [2, 1],
        [1, 1.4],
        [0, 1]
      ]
    }
  },
  "material": {
    "youngModulus": 20000000000,
    "poissonRatio": 0.3,
    "thickness": 0.1
  },
  "meshConfig": {
    "algorithm": "delaunay",
    "elementType": "t3",
    "nx": 5,
    "ny": 2,
    "minAngleDeg": 28.5,
    "maxArea": 0.05
  },
  "boundaryConditions": {
    "constraints": [
      {
        "type": "fixed",
        "target": "edge",
        "selector": { "edge": "left" },
        "dof": ["u", "v"]
      }
    ],
    "loads": [
      {
        "type": "point_load",
        "target": "coordinate",
        "coordinate": [2, 1],
        "force": [0, -10000]
      }
    ]
  },
  "solverSettings": {
    "analysisType": "linear_static",
    "scaleFactor": 200
  }
}
```

---

## Troubleshooting

### Backend is not reachable from Android emulator

Check that the backend is running:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

For Android emulator, use:

```text
http://10.0.2.2:8000
```

Do not use `localhost` inside the Android emulator, because `localhost` refers to the emulator itself.

### `ModuleNotFoundError` when running backend

Make sure you run the backend command from the repository root:

```bash
cd Mobile-based-FEA-Meshing-System
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Also make sure `ThuatToan_Final/` exists in the root folder.

### Python package errors

Reinstall dependencies:

```bash
pip install -r requirements.txt
```

### Android build fails

Try:

```bash
cd base
npm install
cd android
./gradlew clean
cd ..
npx react-native run-android
```

On Windows PowerShell, use:

```powershell
cd base\android
.\gradlew clean
cd ..
npx react-native run-android
```

### Metro bundler issue

Restart Metro:

```bash
cd base
npx react-native start --reset-cache
```

---

## Documentation

Main project documentation:

- `Demo_Checklist.md` — repeatable final demo checklist.
- `Final_Status_Report.md` — implemented scope, limitations, and future work.

---

## Educational FEA Scope

The current system is an educational academic prototype. It demonstrates the main computational structure of 2D FEA:

```text
Input validation
→ Mesh generation
→ Material matrix D
→ Element stiffness
→ Global assembly
→ Boundary condition application
→ Linear solve
→ Post-processing
→ Visualization and storage
```

The implementation prioritizes workflow correctness, explainability, mobile-system integration, and information management.

---

## Limitations and Future Work

Current limitations:

- Educational accuracy, not engineering-certified validation.
- Dense matrix solving, suitable for small meshes only.
- Simplified point load model.
- Fixed-left-edge support as the default boundary condition.
- Custom polygon mode works best with simple or convex point sets.
- Robust concave polygon clipping/filtering is not implemented.
- Stress/strain engineering validation is not implemented.
- No cloud backend, authentication, or multi-user database.
- No PDF/image report export.

Future work:

- Robust polygon clipping and filtering for concave geometry.
- CAD-like sketch editor.
- User-selectable supports and load points.
- Multiple load cases.
- Stress and strain computation with validation.
- Sparse matrix assembly and solver.
- Material library.
- PDF/image report export.
- Backend database and cloud deployment.
- Authentication and user accounts.

---

## Final Feature Status

| Feature | Status |
|---|---|
| React Native app | Implemented |
| FastAPI backend | Implemented |
| Q4 rectangle simulation | Implemented |
| T3 rectangle simulation | Implemented |
| Delaunay custom polygon T3 simulation | Implemented |
| Project search/rename/delete | Implemented |
| Local simulation history | Implemented |
| Mesh/result dashboard | Implemented |
| Layer toggles | Implemented |
| Displacement contour lite | Implemented |
| Mesh quality metrics | Implemented |
| JSON export v1.1 | Implemented |
| Stress/strain engineering validation | Future Work |
| Robust concave polygon filtering | Future Work |
| Cloud deployment/authentication | Future Work |
