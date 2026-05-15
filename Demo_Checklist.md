# Demo Checklist — Mobile-based FEA Meshing System

## 1. Purpose

This checklist is used to prepare and run the final academic demo. It ensures that the mobile app, backend API, simulation pipeline, project history, visualization dashboard, and export features work reliably before presentation.

---

## 2. Pre-demo Environment Checklist

### Backend

- [ ] Open terminal at repository root.
- [ ] Activate Python virtual environment.
- [ ] Install dependencies if needed:

```bash
pip install -r requirements.txt
```

- [ ] Run backend:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

- [ ] Verify health check:

```bash
curl http://localhost:8000/
```

Expected:

```json
{
  "status": "success",
  "message": "FEM API is running"
}
```

### Mobile App

- [ ] Open terminal in `base/`.
- [ ] Install dependencies if needed:

```bash
npm install
```

- [ ] Start Android app:

```bash
npx react-native run-android
```

- [ ] Confirm Android emulator can reach backend using `http://10.0.2.2:8000`.
- [ ] If using physical Android device, confirm phone and laptop are on the same network and API URL uses laptop LAN IP.

---

## 3. Demo Scenario 1 — Rectangle Q4 Structured Mesh

### Input

- Geometry: Rectangle.
- Width: `2.0` m.
- Height: `1.0` m.
- Element Type: `Q4`.
- Algorithm: `Structured`.
- Young's Modulus: `20e9` Pa.
- Poisson's Ratio: `0.3`.
- Thickness: `0.1` m.
- Point Load: `10000` N downward.
- NX: `5`.
- NY: `1` or `2`.

### Steps

- [ ] Open app.
- [ ] Go to Geometry Editor.
- [ ] Choose Rectangle.
- [ ] Enter width and height.
- [ ] Create rectangle.
- [ ] Open Meshing & Physics Parameters.
- [ ] Select Q4.
- [ ] Start Generation.
- [ ] Wait for Processing Status to complete.
- [ ] Verify Mesh & Quality View opens.

### Expected Result

- [ ] Header shows `RECTANGLE Q4 • STRUCTURED`.
- [ ] Original mesh is visible.
- [ ] Deformed mesh is visible.
- [ ] Node count and element count are displayed.
- [ ] Displacement result panel is displayed.
- [ ] Quality metrics are displayed.
- [ ] Layer toggles work.
- [ ] Export JSON opens and shows `exportVersion 1.1`.

---

## 4. Demo Scenario 2 — Rectangle T3 Structured Mesh

### Input

Same as Scenario 1, except:

- Element Type: `T3`.

### Steps

- [ ] Return to Projects or start a new simulation.
- [ ] Choose Rectangle.
- [ ] Enter width and height.
- [ ] Create rectangle.
- [ ] Select T3 in the parameter modal.
- [ ] Start Generation.
- [ ] Wait for result dashboard.

### Expected Result

- [ ] Header shows `RECTANGLE T3 • STRUCTURED`.
- [ ] Mesh appears as triangular elements.
- [ ] Metadata shows `Element Type = T3`.
- [ ] Result dashboard still supports layer toggles, contour, quality, and export.
- [ ] Project history labels the run as T3.

---

## 5. Demo Scenario 3 — Custom Polygon Delaunay T3 Mesh

### Input

Default polygon points:

```text
0,0
2,0
2,1
1,1.4
0,1
```

### Steps

- [ ] Return to Projects or start a new simulation.
- [ ] Choose Polygon mode.
- [ ] Keep or edit polygon points.
- [ ] Create Polygon.
- [ ] Open Meshing & Physics Parameters.
- [ ] Confirm T3 is selected and Q4 is disabled.
- [ ] Start Generation.
- [ ] Wait for result dashboard.

### Expected Result

- [ ] Header shows `POLYGON T3 • DELAUNAY`.
- [ ] Mesh appears as triangular Delaunay mesh.
- [ ] Metadata shows `Geometry = POLYGON`, `Algorithm = DELAUNAY`, `Element Type = T3`.
- [ ] Export package includes polygon points and mesh config.
- [ ] Project history labels the run as Custom Polygon / Delaunay / T3.

---

## 6. Project History Demo

- [ ] Return to My Projects.
- [ ] Confirm newly created projects are listed.
- [ ] Search for `Q4`.
- [ ] Search for `T3`.
- [ ] Search for `Delaunay` or `Polygon`.
- [ ] Open a project detail modal.
- [ ] Confirm latest mesh preview is shown.
- [ ] Confirm algorithm, element type, geometry, displacement, and quality summary are shown.
- [ ] Rename a project.
- [ ] Delete a test project if needed.

---

## 7. Export Demo

- [ ] Open Export from Mesh & Quality View.
- [ ] Confirm Package Summary displays geometry/element/algorithm.
- [ ] Confirm JSON includes:
  - `exportVersion`.
  - `input.geometry`.
  - `input.material`.
  - `input.boundaryConditions`.
  - `input.meshConfig`.
  - `input.solverSettings`.
  - `output.mesh`.
  - `output.results`.
  - `output.quality`.
  - `metadata`.

---

## 8. Backup Demo Plan

If Custom Polygon fails during live demo:

1. Explain that the system supports Delaunay T3 through provided polygon point sets.
2. Use the default polygon points only.
3. Avoid concave or self-intersecting points.
4. Continue with Q4 and T3 rectangle flows, which should be stable.

If backend connection fails:

1. Confirm backend terminal is still running.
2. Restart:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

3. Verify Android emulator uses `10.0.2.2:8000`.

---

## 9. Final Talking Points

- The app is not only a numerical prototype but also an information system.
- The mobile app manages simulation input, output, metadata, history, dashboard, and export package.
- The backend owns numerical computation and exposes a structured API.
- Q4, T3, and Delaunay custom polygon flows demonstrate multiple meshing modes.
- The current system targets educational accuracy and integration clarity.
- Engineering-grade validation, sparse solving, robust CAD editing, and cloud deployment are future work.
