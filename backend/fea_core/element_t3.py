import numpy as np


def compute_t3_Ke(coords, D, thickness, element_id=None, verbose=False):
    """Compute CST/T3 element stiffness matrix for a 3-node triangle.

    The implementation uses the constant strain triangle formulation:
    Ke = t * A * B^T * D * B
    where B is constant over the element.
    """
    if coords.shape != (3, 2):
        raise ValueError("T3 element requires exactly 3 nodes with x/y coordinates.")

    x1, y1 = coords[0]
    x2, y2 = coords[1]
    x3, y3 = coords[2]

    twice_area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)
    area = 0.5 * abs(float(twice_area))

    if area <= 1e-12:
        raise ValueError(f"Degenerate T3 element detected at element {element_id}.")

    # If node ordering is clockwise, swap node 2 and node 3 locally to keep positive orientation.
    if twice_area < 0:
        x2, y2, x3, y3 = x3, y3, x2, y2
        twice_area = -twice_area

    b1 = y2 - y3
    b2 = y3 - y1
    b3 = y1 - y2
    c1 = x3 - x2
    c2 = x1 - x3
    c3 = x2 - x1

    B = (1.0 / twice_area) * np.array([
        [b1, 0.0, b2, 0.0, b3, 0.0],
        [0.0, c1, 0.0, c2, 0.0, c3],
        [c1, b1, c2, b2, c3, b3],
    ])

    Ke = thickness * area * (B.T @ D @ B)

    if verbose:
        print(f"   [T3 #{element_id}] area={area:.6e}, Ke shape={Ke.shape}")

    return Ke


__all__ = ["compute_t3_Ke"]
