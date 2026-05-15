import time

import numpy as np

from backend.fea_core.assembly import assemble_K_global
from backend.fea_core.material import get_D_matrix
from backend.fea_core.meshing import MeshGenerator
from backend.fea_core.quality import compute_mesh_quality
from backend.fea_core.solver import apply_bcs_and_solve


# ==========================================
# VALIDATION & DATA MAPPING HELPERS
# ==========================================
def _to_float(value, fallback, field_name):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number.")
    return parsed if np.isfinite(parsed) else fallback


def _to_int(value, fallback, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid integer.")
    return parsed


def normalize_element_type(value):
    normalized = str(value or "quad").lower().strip()
    if normalized in {"quad", "q4", "quadrilateral"}:
        return "quad"
    if normalized in {"t3", "triangle", "tri", "tri3"}:
        return "triangle"
    raise ValueError("Only Q4 quadrilateral and T3 triangular elements are supported.")


def normalize_algorithm(value, element_type, geometry_type):
    normalized = str(value or "structured").lower().strip()
    if geometry_type == "polygon":
        return "delaunay"
    if normalized in {"structured", "grid"}:
        return "structured"
    if normalized in {"delaunay", "custom"}:
        return "delaunay"
    if element_type == "triangle":
        return "structured"
    raise ValueError("Only structured and delaunay meshing algorithms are supported.")


def normalize_polygon_points(points):
    if not isinstance(points, list) or len(points) < 3:
        raise ValueError("Custom polygon requires at least 3 points.")

    normalized = []
    for index, point in enumerate(points):
        if isinstance(point, dict):
            x = point.get("x")
            y = point.get("y")
        elif isinstance(point, (list, tuple)) and len(point) >= 2:
            x, y = point[0], point[1]
        else:
            raise ValueError(f"Invalid polygon point at index {index}.")
        normalized.append([
            _to_float(x, 0.0, f"geometry.polygon.points[{index}].x"),
            _to_float(y, 0.0, f"geometry.polygon.points[{index}].y"),
        ])

    unique_points = {tuple(point) for point in normalized}
    if len(unique_points) < 3:
        raise ValueError("Custom polygon requires at least 3 unique points.")
    return normalized


def build_fem_config(content):
    """
    Build the internal FEM config from either the current mobile payload
    or the target structured simulation request described in Architecture.md.
    """
    geometry = content.get("geometry", {})
    dimensions = content.get("dimensions", {})
    material = content.get("material", {})
    physics = content.get("physics", {})
    mesh_config = content.get("meshConfig", {})
    meshing = content.get("meshingConfig", {})
    boundary_conditions = content.get("boundaryConditions", {})
    solver_settings = content.get("solverSettings", {})

    geometry_type = str(geometry.get("type", content.get("shape", "rectangle"))).lower().strip()
    rectangle = geometry.get("rectangle", {}) if isinstance(geometry, dict) else {}
    polygon = geometry.get("polygon", {}) if isinstance(geometry, dict) else {}

    polygon_points = []
    if geometry_type in {"polygon", "custom_polygon", "custom"}:
        geometry_type = "polygon"
        polygon_points = normalize_polygon_points(polygon.get("points", content.get("coordinates", [])))
        xs = [point[0] for point in polygon_points]
        ys = [point[1] for point in polygon_points]
        width = max(xs) - min(xs)
        height = max(ys) - min(ys)
    else:
        geometry_type = "rectangle"
        width = _to_float(
            rectangle.get("width", dimensions.get("width", 2.0)),
            2.0,
            "geometry.rectangle.width",
        )
        height = _to_float(
            rectangle.get("height", dimensions.get("height", 1.0)),
            1.0,
            "geometry.rectangle.height",
        )

    E = _to_float(
        material.get("youngModulus", physics.get("youngModulus", 20e9)),
        20e9,
        "material.youngModulus",
    )
    nu = _to_float(
        material.get("poissonRatio", physics.get("poissonRatio", 0.3)),
        0.3,
        "material.poissonRatio",
    )
    thickness = _to_float(
        material.get("thickness", physics.get("thickness", 0.1)),
        0.1,
        "material.thickness",
    )

    # Current UI calls this pressure, but the current academic demo treats it as a point load.
    point_load_magnitude = _to_float(
        physics.get("pressure", 10000),
        10000,
        "physics.pressure",
    )

    nx = _to_int(mesh_config.get("nx", meshing.get("nx", 5)), 5, "meshConfig.nx")
    ny = _to_int(mesh_config.get("ny", meshing.get("ny", 1)), 1, "meshConfig.ny")
    element_type = normalize_element_type(mesh_config.get("elementType", meshing.get("elementType", "quad")))
    algorithm = normalize_algorithm(mesh_config.get("algorithm", "structured"), element_type, geometry_type)

    validate_simulation_inputs(width, height, E, nu, thickness, nx, ny, algorithm, element_type, geometry_type, polygon_points)

    default_load_coordinate = [width, height] if geometry_type == "rectangle" else polygon_points[-1]
    constraints = boundary_conditions.get("constraints") or [
        {
            "type": "fixed",
            "target": "edge",
            "selector": {"edge": "left"},
            "dof": ["u", "v"],
        }
    ]

    loads = boundary_conditions.get("loads") or [
        {
            "type": "point_load",
            "target": "coordinate",
            "coordinate": default_load_coordinate,
            "force": [0, -abs(point_load_magnitude)],
        }
    ]

    mesh_source = "custom" if geometry_type == "polygon" or algorithm == "delaunay" else "auto"
    shape_name = "custom_polygon"

    config = {
        "project_id": content.get("projectId"),
        "material": {
            "E": E,
            "nu": nu,
            "thickness": thickness,
        },
        "geometry": {
            "type": geometry_type,
            "start_x": 0.0,
            "start_y": 0.0,
            "end_x": width,
            "end_y": height,
            "polygon_points": polygon_points,
        },
        "numerical_integration": {
            "method": "gauss_quadrature",
            "order": 2,
        },
        "mesh": {
            "mesh_source": mesh_source,
            "shape_name": shape_name,
            "element_type": element_type,
            "algorithm": algorithm,
            "nx": nx,
            "ny": ny,
            "minAngleDeg": mesh_config.get("minAngleDeg", meshing.get("minAngle", 28.5)),
            "maxArea": mesh_config.get("maxArea", meshing.get("maxArea", 0.05)),
        },
        "mesh_data": {
            shape_name: {
                "nodes": polygon_points,
            }
        } if polygon_points else None,
        "boundary_conditions": {
            "method": "zeroing_out",
            "fix_nodes": map_constraints_to_legacy_fix_nodes(constraints),
            "point_loads": map_loads_to_legacy_point_loads(loads, default_load_coordinate),
            "raw_constraints": constraints,
            "raw_loads": loads,
        },
        "solver_settings": {
            "analysisType": solver_settings.get("analysisType", "linear_static"),
            "scaleFactor": _to_float(solver_settings.get("scaleFactor", 200.0), 200.0, "solverSettings.scaleFactor"),
        },
    }

    return config


def validate_simulation_inputs(width, height, E, nu, thickness, nx, ny, algorithm, element_type, geometry_type, polygon_points):
    if width <= 0:
        raise ValueError("Geometry width must be greater than 0.")
    if height <= 0:
        raise ValueError("Geometry height must be greater than 0.")
    if E <= 0:
        raise ValueError("Young's modulus must be greater than 0.")
    if not (0 < nu < 0.5):
        raise ValueError("Poisson's ratio must be between 0 and 0.5 for the current demo.")
    if thickness <= 0:
        raise ValueError("Thickness must be greater than 0.")
    if nx < 1 or ny < 1:
        raise ValueError("Mesh density nx and ny must be positive integers.")
    if algorithm not in {"structured", "delaunay"}:
        raise ValueError("Only structured and delaunay meshing are implemented.")
    if element_type not in {"quad", "triangle"}:
        raise ValueError("Only Q4 quadrilateral and T3 triangular elements are implemented.")
    if geometry_type == "polygon" and element_type != "triangle":
        raise ValueError("Custom polygon Delaunay meshing requires T3 triangular elements.")
    if geometry_type == "polygon" and len(polygon_points) < 3:
        raise ValueError("Custom polygon requires at least 3 points.")


def map_constraints_to_legacy_fix_nodes(constraints):
    legacy = []
    for constraint in constraints:
        if constraint.get("type") != "fixed":
            continue
        selector = constraint.get("selector", {})
        edge = selector.get("edge", "left")
        value_by_edge = {
            "left": 0.0,
        }
        if edge not in value_by_edge:
            raise ValueError("Only fixed left edge is implemented in the current academic demo.")
        legacy.append({
            "target": "x_equal",
            "value": value_by_edge[edge],
            "dof": constraint.get("dof", ["u", "v"]),
        })
    return legacy or [{"target": "x_equal", "value": 0.0, "dof": ["u", "v"]}]


def map_loads_to_legacy_point_loads(loads, fallback_coordinate):
    legacy = []
    for load in loads:
        if load.get("type") != "point_load":
            continue
        coordinate = load.get("coordinate", fallback_coordinate)
        force = load.get("force", [0, -10000])
        if len(coordinate) != 2 or len(force) != 2:
            raise ValueError("Point load requires coordinate [x, y] and force [fx, fy].")
        legacy.append({
            "target": "coordinate",
            "value": [float(coordinate[0]), float(coordinate[1])],
            "force": [float(force[0]), float(force[1])],
        })
    return legacy or [{"target": "coordinate", "value": fallback_coordinate, "force": [0, -10000]}]


# ==========================================
# POST-PROCESSING HELPERS
# ==========================================
def build_nodes_out(nodes):
    return [{"id": i, "x": float(n[0]), "y": float(n[1])} for i, n in enumerate(nodes)]


def build_elements_out(elements, element_type):
    response_type = "t3" if element_type == "triangle" else "quad"
    return [
        {"id": i, "type": response_type, "nodes": list(map(int, el))}
        for i, el in enumerate(elements)
    ]


def get_fixed_node_ids(nodes, config):
    fixed_node_ids = set()
    for fix in config["boundary_conditions"].get("fix_nodes", []):
        if fix.get("target") == "x_equal":
            value = fix.get("value", 0.0)
            for node_id, coord in enumerate(nodes):
                if abs(coord[0] - value) < 1e-6:
                    fixed_node_ids.add(int(node_id))
    return sorted(fixed_node_ids)


def get_load_markers(nodes, config):
    markers = []
    for load in config["boundary_conditions"].get("point_loads", []):
        if load.get("target") != "coordinate":
            continue
        target_coord = np.array(load.get("value", [0.0, 0.0]), dtype=float)
        distances = np.linalg.norm(nodes - target_coord, axis=1)
        node_id = int(np.argmin(distances))
        markers.append({
            "nodeId": node_id,
            "x": float(nodes[node_id][0]),
            "y": float(nodes[node_id][1]),
            "force": [float(load["force"][0]), float(load["force"][1])],
        })
    return markers


def build_error_response(code, message, details=None, suggested_action="Review the input and retry."):
    return {
        "status": "error",
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "suggestedAction": suggested_action,
        },
    }


class SimulationPipeline:
    """Lightweight pipeline wrapper for the current academic FEA demo."""

    def __init__(self, content):
        self.content = content
        self.started_at = time.perf_counter()
        self.config = None
        self.scale_factor = None
        self.nodes = None
        self.elements = None
        self.D = None
        self.K_global = None
        self.U_global = None
        self.U_formatted = None
        self.deformed_nodes = None
        self.displacement_magnitude = None
        self.quality = None
        self.fixed_node_ids = []
        self.load_markers = []

    def validate(self):
        self.config = build_fem_config(self.content)
        self.scale_factor = self.config["solver_settings"]["scaleFactor"]
        return self

    def generate_mesh(self):
        mesher = MeshGenerator(self.config, self.config.get("mesh_data"))
        self.nodes, self.elements = mesher.generate()
        return self

    def build_material(self):
        self.D = get_D_matrix(self.config)
        return self

    def assemble(self):
        self.K_global = assemble_K_global(
            self.nodes,
            self.elements,
            self.D,
            self.config,
            verbose=False,
        )
        return self

    def solve(self):
        self.U_global, _ = apply_bcs_and_solve(self.K_global, self.nodes, self.config)
        return self

    def postprocess(self):
        self.U_formatted = self.U_global.reshape(-1, 2)
        self.deformed_nodes = self.nodes + self.U_formatted * self.scale_factor
        self.displacement_magnitude = np.linalg.norm(self.U_formatted, axis=1)
        self.fixed_node_ids = get_fixed_node_ids(self.nodes, self.config)
        self.load_markers = get_load_markers(self.nodes, self.config)
        return self

    def compute_quality(self):
        self.quality = compute_mesh_quality(self.nodes, self.elements)
        return self

    def to_response(self):
        max_node_id = int(np.argmax(self.displacement_magnitude)) if len(self.displacement_magnitude) else 0
        nodes_out = build_nodes_out(self.nodes)
        elements_out = build_elements_out(self.elements, self.config["mesh"]["element_type"])
        deformed_out = build_nodes_out(self.deformed_nodes)
        disp_out = [
            {"id": i, "ux": float(u[0]), "uy": float(u[1])}
            for i, u in enumerate(self.U_formatted)
        ]
        displacement_magnitude_out = [
            {"id": i, "value": float(value)}
            for i, value in enumerate(self.displacement_magnitude)
        ]
        processing_time_ms = int((time.perf_counter() - self.started_at) * 1000)
        element_type = self.config["mesh"].get("element_type", "quad")

        return {
            "status": "success",
            "data": {
                "mesh": {
                    "nodes": nodes_out,
                    "elements": elements_out,
                },
                "results": {
                    "deformedNodes": deformed_out,
                    "displacements": disp_out,
                    "displacementMagnitude": displacement_magnitude_out,
                    "maxDisplacement": {
                        "nodeId": max_node_id,
                        "value": float(self.displacement_magnitude[max_node_id]) if len(self.displacement_magnitude) else 0.0,
                        "ux": float(self.U_formatted[max_node_id][0]) if len(self.U_formatted) else 0.0,
                        "uy": float(self.U_formatted[max_node_id][1]) if len(self.U_formatted) else 0.0,
                    },
                },
                "boundaryVisualization": {
                    "fixedNodeIds": self.fixed_node_ids,
                    "loadMarkers": self.load_markers,
                },
                "quality": self.quality,
            },
            "metadata": {
                "processingTimeMs": processing_time_ms,
                "nodeCount": len(nodes_out),
                "elementCount": len(elements_out),
                "algorithm": self.config["mesh"].get("algorithm", "structured"),
                "elementType": "t3" if element_type == "triangle" else "quad",
                "geometryType": self.config["geometry"].get("type", "rectangle"),
                "scaleFactor": self.scale_factor,
                "meshInfo": self.config["mesh"],
            },
            "warnings": [],
        }

    def run(self):
        return (
            self.validate()
            .generate_mesh()
            .build_material()
            .assemble()
            .solve()
            .postprocess()
            .compute_quality()
            .to_response()
        )


class SimulationService:
    """Service layer that runs the current academic FEA simulation pipeline."""

    @staticmethod
    def run(content):
        return SimulationPipeline(content).run()
