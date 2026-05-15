import numpy as np

from backend.fea_core.element_q4 import compute_q4_Ke
from backend.fea_core.element_t3 import compute_t3_Ke


def assemble_K_global(nodes, elements, D, config, verbose=True):
    """Assemble global stiffness matrix for Q4 and T3 elements."""
    num_nodes = len(nodes)
    total_dof = 2 * num_nodes
    K_global = np.zeros((total_dof, total_dof))
    thickness = config['material'].get('thickness', 0.1)

    for el_idx, elem_nodes in enumerate(elements):
        elem_nodes = list(map(int, elem_nodes))
        coords = nodes[elem_nodes]
        node_count = len(elem_nodes)

        if node_count == 4:
            Ke = compute_q4_Ke(coords, D, thickness, config, element_id=el_idx, verbose=verbose)
        elif node_count == 3:
            Ke = compute_t3_Ke(coords, D, thickness, element_id=el_idx, verbose=verbose)
        else:
            raise ValueError(f"Unsupported element with {node_count} nodes at element {el_idx}.")

        for local_i, global_i in enumerate(elem_nodes):
            for local_j, global_j in enumerate(elem_nodes):
                K_global[
                    2 * global_i: 2 * global_i + 2,
                    2 * global_j: 2 * global_j + 2,
                ] += Ke[
                    2 * local_i: 2 * local_i + 2,
                    2 * local_j: 2 * local_j + 2,
                ]

    return K_global


__all__ = ["assemble_K_global"]
