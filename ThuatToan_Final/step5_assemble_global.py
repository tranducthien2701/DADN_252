import numpy as np
from ThuatToan_Final.step4_get_Ke import compute_Ke
def assemble_K_global(nodes, elements, D, config, verbose=True):
    """
    [BƯỚC 5] Lắp ráp Ma trận độ cứng Toàn cục (K_global).
    """
    num_nodes = len(nodes)
    total_dof = 2 * num_nodes
    K_global = np.zeros((total_dof, total_dof))
    
    thickness = config['material'].get('thickness', 0.1)
    
    # Vòng lặp vĩ đại
    for el_idx, elem_nodes in enumerate(elements):
        if len(elem_nodes) != 4:
            continue 
            
        coords = nodes[elem_nodes]
        
        # Gọi Bước 4 tính Ke (Bật verbose=True để in chi tiết)
        Ke = compute_Ke(coords, D, thickness, config, element_id=el_idx, verbose=verbose)
        
        # Bắn các giá trị từ Ke(8x8) vào K_global(2N x 2N)
        for i in range(4):           
            global_i = elem_nodes[i] 
            for j in range(4):       
                global_j = elem_nodes[j]
                K_global[2*global_i : 2*global_i+2, 2*global_j : 2*global_j+2] += Ke[2*i:2*i+2, 2*j:2*j+2]
                
    return K_global