import numpy as np


def polygon_area(coords):
    x = coords[:, 0]
    y = coords[:, 1]
    return 0.5 * abs(float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))))


def element_aspect_ratio(coords):
    edge_lengths = []
    for idx in range(len(coords)):
        edge_lengths.append(float(np.linalg.norm(coords[(idx + 1) % len(coords)] - coords[idx])))
    min_edge = max(min(edge_lengths), 1e-12)
    return max(edge_lengths) / min_edge


def compute_mesh_quality(nodes, elements):
    element_metrics = []
    areas = []
    aspect_ratios = []
    bad_count = 0

    for element_id, element in enumerate(elements):
        coords = nodes[element]
        area = polygon_area(coords)
        aspect_ratio = element_aspect_ratio(coords)
        is_bad = area <= 1e-12 or aspect_ratio > 5.0
        if is_bad:
            bad_count += 1
        areas.append(area)
        aspect_ratios.append(aspect_ratio)
        element_metrics.append({
            "id": int(element_id),
            "area": float(area),
            "aspectRatio": float(aspect_ratio),
            "isBad": bool(is_bad),
        })

    if not areas:
        return {
            "badElementCount": 0,
            "minArea": 0.0,
            "maxArea": 0.0,
            "maxAspectRatio": 0.0,
            "elementMetrics": [],
        }

    return {
        "badElementCount": int(bad_count),
        "minArea": float(min(areas)),
        "maxArea": float(max(areas)),
        "maxAspectRatio": float(max(aspect_ratios)),
        "elementMetrics": element_metrics,
    }


__all__ = ["polygon_area", "element_aspect_ratio", "compute_mesh_quality"]
