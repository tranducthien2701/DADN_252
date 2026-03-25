import numpy as np

def get_D_matrix(E, nu):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Khai báo "mã gen" của vật liệu (Ma trận đàn hồi D). Nó cho máy tính biết vật thể này 
    được làm bằng thép cứng hay cao su mềm. Hàm này dùng cho bài toán "Ứng suất phẳng" 
    (Plane Stress - tấm mỏng chịu lực trong mặt phẳng).

    [CÔNG THỨC & LOGIC]
    D = (E / (1 - nu^2)) * [ 1   nu  0 ]
                           [ nu  1   0 ]
                           [ 0   0  (1-nu)/2 ]

    [VÍ DỤ MINH HỌA (THAY SỐ)]
    - Đầu vào: Thép có E = 20 GPa (20e9), Poisson nu = 0.3.
    - Hệ số bên ngoài = 20e9 / (1 - 0.3^2) = 21.978e9
    - Đầu ra D (Ma trận 3x3): 
      [[ 21.978e9,   6.593e9,   0.       ]
       [  6.593e9,  21.978e9,   0.       ]
       [  0.     ,   0.     ,   7.692e9  ]]
    """
    factor = E / (1 - nu**2)
    return factor * np.array([
        [1, nu, 0],
        [nu, 1, 0],
        [0, 0, (1 - nu) / 2]
    ])

def shape_function_derivatives(xi, eta):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Tính đạo hàm của 4 Hàm dạng (Shape functions). Nó giúp trả lời câu hỏi: "Khi tọa độ 
    thay đổi một chút thì sự biến dạng bên trong viên gạch diễn ra như thế nào?".
    Toán học FEA luôn tính toán trên một "hình vuông chuẩn" 2x2 trong hệ tọa độ tự nhiên (xi, eta).

    [CÔNG THỨC & LOGIC]
    Đạo hàm của N1 theo xi: dN1/dxi = -1/4 * (1 - eta)
    Đạo hàm của N1 theo eta: dN1/deta = -1/4 * (1 - xi)
    (Làm tương tự cho N2, N3, N4)

    [VÍ DỤ MINH HỌA (THAY SỐ)]
    - Đầu vào: Xét tại điểm Gauss thứ nhất xi = -0.577, eta = -0.577.
    - dN1/dxi = -0.25 * (1 - (-0.577)) = -0.394.
    - Đầu ra: Một ma trận 2x4 chứa 8 giá trị đạo hàm tại điểm đó.
    """
    dN_dxi = 0.25 * np.array([-(1 - eta),  (1 - eta),  (1 + eta), -(1 + eta)])
    dN_deta = 0.25 * np.array([-(1 - xi),  -(1 + xi),   (1 + xi),  (1 - xi)])
    return np.vstack((dN_dxi, dN_deta))

def compute_Ke(coords, E, nu, thickness):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Khám sức khỏe cho 1 "viên gạch Tứ giác" duy nhất. Hàm này tính ra Ma trận độ cứng Ke (8x8).
    Nó là đại diện cho mức độ lỳ lợm của 4 nút trên viên gạch khi bị giằng xé.

    [CÔNG THỨC & LOGIC]
    Dùng phương pháp Tích phân Gauss (2x2 = 4 điểm). Thay vì tính tích phân cực khó, 
    máy tính sẽ "chấm" 4 điểm bên trong viên gạch, tính độ cứng tại 4 điểm đó rồi cộng dồn lại:
    Ke = Tổng( B^T * D * B * det(J) * thickness ) tại 4 điểm Gauss.
    - J (Jacobian) là hệ số quy đổi giữa viên gạch bị méo (thực tế) và hình vuông chuẩn (toán học).
    - B là Ma trận biến dạng (liên hệ giữa chuyển vị nút và biến dạng bên trong).
    """
    D = get_D_matrix(E, nu)
    Ke = np.zeros((8, 8))
    # Tọa độ 2 điểm Gauss cơ bản: -1/căn(3) và 1/căn(3)
    gauss_points = [-1/np.sqrt(3), 1/np.sqrt(3)]
    
    for xi in gauss_points:
        for eta in gauss_points:
            # 1. Lấy đạo hàm trong tọa độ chuẩn
            dN_nat = shape_function_derivatives(xi, eta)
            # 2. Tính ma trận Jacobian J và định thức của nó
            J = dN_nat @ coords
            detJ = np.linalg.det(J)
            invJ = np.linalg.inv(J)
            
            # 3. Đổi đạo hàm về tọa độ thực (x, y)
            dN_real = invJ @ dN_nat
            
            # 4. Lắp ráp ma trận B (3x8)
            B = np.zeros((3, 8))
            for i in range(4):
                dN_dx, dN_dy = dN_real[0, i], dN_real[1, i]
                B[0, 2*i], B[1, 2*i+1] = dN_dx, dN_dy
                B[2, 2*i], B[2, 2*i+1] = dN_dy, dN_dx
                
            # 5. Cộng dồn vào Ke (Trọng số W của Gauss 2x2 luôn = 1.0)
            Ke += (B.T @ D @ B) * detJ * thickness * 1.0 
    return Ke

def compute_Ke_triangle(coords, E, nu, thickness):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Tính độ cứng Ke (kích thước 6x6) cho phần tử Tam giác 3 nút (CST). 
    Vì Tam giác CST có biến dạng bên trong là một hằng số, ta không cần dùng Tích phân Gauss 
    mà có thể tính trực tiếp bằng một công thức giải tích đơn giản.

    [CÔNG THỨC & LOGIC]
    - B là ma trận biến dạng (3x6) chứa các hằng số hình học tính từ tọa độ đỉnh.
    - Công thức chuẩn: Ke = B^T * D * B * Diện_tích * Bề_dày
    """
    D = get_D_matrix(E, nu)
    
    x1, y1 = coords[0]
    x2, y2 = coords[1]
    x3, y3 = coords[2]
    
    # Tính diện tích tam giác (Area)
    Area = 0.5 * abs(x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2))
    
    # Tính các hệ số b, c cho ma trận B của tam giác CST
    b1 = y2 - y3; c1 = x3 - x2
    b2 = y3 - y1; c2 = x1 - x3
    b3 = y1 - y2; c3 = x2 - x1
    
    B = (1.0 / (2.0 * Area)) * np.array([
        [b1,  0, b2,  0, b3,  0],
        [ 0, c1,  0, c2,  0, c3],
        [c1, b1, c2, b2, c3, b3]
    ])
    
    # Tính Ke trực tiếp
    Ke = (B.T @ D @ B) * Area * thickness
    return Ke

def assemble_global_system(nodes, elements, E, nu, thickness, element_type="quad"):
    """
    [MỤC ĐÍCH THỰC TẾ]
    "Bôi keo" dán các viên gạch rời rạc lại thành một tấm thép hoàn chỉnh. 
    Hàm này có khả năng tự động nhận dạng xem bạn đang dán gạch Tứ giác (4 nút) hay Tam giác (3 nút).

    [CÔNG THỨC & LOGIC]
    K_global là một ma trận vuông khổng lồ. Kích thước = (Số nút * 2) x (Số nút * 2).
    Máy tính sẽ bốc từng Ke (8x8 hoặc 6x6) của từng phần tử, tra bản đồ xem các nút của phần tử này 
    mang số thứ tự bao nhiêu trong mảng tổng, rồi đem cộng (+=) các con số vào đúng vị trí đó.
    """
    num_nodes = len(nodes)
    K_global = np.zeros((2 * num_nodes, 2 * num_nodes))
    F_global = np.zeros(2 * num_nodes)
    
    for el_nodes in elements:
        coords = nodes[el_nodes] 
        
        # RẼ NHÁNH TÙY THEO LOẠI PHẦN TỬ ĐỂ GỌI ĐÚNG HÀM TÍNH ĐỘ CỨNG
        if element_type == "quad":
            Ke = compute_Ke(coords, E, nu, thickness)
            num_nodes_per_el = 4
        elif element_type == "triangle":
            Ke = compute_Ke_triangle(coords, E, nu, thickness)
            num_nodes_per_el = 3
        else:
            raise ValueError("Lỗi: element_type phải là 'quad' hoặc 'triangle'.")
            
        # Vòng lặp tự động điều chỉnh quét 4x4 (với quad) hoặc 3x3 (với triangle)
        for i in range(num_nodes_per_el):
            for j in range(num_nodes_per_el):
                # Xác định số thứ tự hàng/cột trong ma trận khổng lồ
                global_i_x, global_i_y = 2 * el_nodes[i], 2 * el_nodes[i] + 1
                global_j_x, global_j_y = 2 * el_nodes[j], 2 * el_nodes[j] + 1
                
                # Bơm dữ liệu từ Ke vào K_global
                K_global[global_i_x, global_j_x] += Ke[2*i, 2*j]
                K_global[global_i_x, global_j_y] += Ke[2*i, 2*j+1]
                K_global[global_i_y, global_j_x] += Ke[2*i+1, 2*j]
                K_global[global_i_y, global_j_y] += Ke[2*i+1, 2*j+1]
                
    return K_global, F_global

def apply_boundary_conditions(K_global, F_global, nodes, geo_config, bc_config):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Cố định tấm thép vào tường (Ngàm) và móc cần cẩu vào để kéo (Lực). 
    Nếu không có hàm này, ma trận K_global sẽ bị suy biến (định thức = 0), giải phương trình 
    sẽ bị lỗi vì tấm thép sẽ bay lơ lửng vô định trong không gian.

    [CÔNG THỨC & LOGIC]
    - Phương pháp Phạt (Penalty Method): Để ép chuyển vị u tại ngàm = 0, ta lấy số nằm trên 
      đường chéo chính của K_global nhân với một số khổng lồ (10^15). Phương trình lúc này trở thành:
      (Số khổng lồ) * u = 0  => Máy tính sẽ tự động giải ra u ≈ 0 (khóa chặt thành công).
    - Lực F: Điền giá trị lực P vào đúng vị trí hàng tương ứng trong vector F_global.
    """
    
    # 1. NGÀM CẠNH TRÁI (Khóa chặt vào tường)
    # Dùng np.isclose thay vì == để tránh sai số số học của Python (floating point error)
    fixed_nodes = np.where(np.isclose(nodes[:, 0], geo_config['start_x']))[0] 
    
    for node in fixed_nodes:
        dof_x, dof_y = 2 * node, 2 * node + 1
        # Nhân đường chéo với số phạt khổng lồ
        K_global[dof_x, dof_x] *= bc_config['penalty_value']
        K_global[dof_y, dof_y] *= bc_config['penalty_value']
        F_global[dof_x] = 0.0
        F_global[dof_y] = 0.0

    # 2. ÁP DỤNG LỰC KÉO TẠI GÓC (Tìm nút GẦN NHẤT với target_x, target_y)
    target_x = geo_config['end_x']
    target_y = geo_config['end_y']
    
    # Tính khoảng cách từ TẤT CẢ các nút đến điểm đích
    # Công thức Pytago: d = sqrt((x - target_x)^2 + (y - target_y)^2)
    distances = np.sqrt((nodes[:, 0] - target_x)**2 + (nodes[:, 1] - target_y)**2)
    
    # Lấy ra số thứ tự của nút có khoảng cách nhỏ nhất (Nút nằm gần góc đó nhất)
    pull_node = np.argmin(distances)
    
    # Gán lực vào đúng dòng tương ứng trong vector lực
    dof_x = 2 * pull_node
    F_global[dof_x] = bc_config['force_P']
        
    return K_global, F_global