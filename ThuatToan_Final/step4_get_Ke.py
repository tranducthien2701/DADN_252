import numpy as np
from ThuatToan_Final.step3_get_dN_nat import compute_dN_nat, get_gauss_points

def compute_Ke(coords, D, thickness, config, element_id=None, verbose=False):
    """
    [BƯỚC 4] Tính Ma trận độ cứng phần tử (Ke) cho phần tử Q4.
    """
    Ke = np.zeros((8, 8))
    gauss_points, weights = get_gauss_points(config)
    
    if verbose:
        print(f"\n   [PHẦN TỬ #{element_id}] Tọa độ 4 nút: \n   {coords.tolist()}")
    
    # Lặp qua các điểm Gauss để tính tích phân số
    for idx, ((xi, eta), w) in enumerate(zip(gauss_points, weights)):
        # 1. Lấy đạo hàm dN_nat (2x4)
        dN_nat = compute_dN_nat(xi, eta)
        
        # 2. Tính Ma trận Jacobian (2x2) = dN_nat * Tọa_độ_thực
        J = dN_nat @ coords
        detJ = np.linalg.det(J)
        
        if detJ <= 0:
            raise ValueError(f"Lỗi: Định thức Jacobian âm (detJ = {detJ}) tại phần tử {element_id}. Lưới bị méo!")
            
        invJ = np.linalg.inv(J)
        
        # 3. Đạo hàm hàm dạng theo tọa độ thực x, y (2x4)
        dN_real = invJ @ dN_nat
        
        # 4. Lắp ráp Ma trận Biến dạng B (3x8)
        B = np.zeros((3, 8))
        for i in range(4):
            B[0, 2*i]     = dN_real[0, i]     # dNi/dx
            B[1, 2*i + 1] = dN_real[1, i]     # dNi/dy
            B[2, 2*i]     = dN_real[1, i]     # Đạo hàm chéo
            B[2, 2*i + 1] = dN_real[0, i]     # Đạo hàm chéo
            
        # In báo cáo Jacobian và B matrix tại điểm Gauss đầu tiên (hoặc in hết nếu muốn)
        if verbose:
            print(f"      -> Điểm Gauss #{idx+1} (xi={xi:.3f}, eta={eta:.3f})")
            print(f"         * Jacobian (J):\n{J}")
            print(f"         * Định thức det(J): {detJ:.4f}")
            print(f"         * B matrix (3x8):\n{B}")
            
        # 5. Cộng dồn vào Ke
        Ke += B.T @ D @ B * detJ * thickness * w
        
    if verbose:
        print(f"   => KẾT QUẢ: Ma trận Ke (8x8) của Phần tử #{element_id}:\n{Ke}")
        
    return Ke