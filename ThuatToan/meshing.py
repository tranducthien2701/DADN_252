import numpy as np
from scipy.spatial import Delaunay

def uniform_mesh_quad4(sx, sy, ex, ey, nx, ny):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Hàm này thực hiện bước "Meshing" (Chia lưới) trong phương pháp Phần tử hữu hạn (FEA). 
    Nó lấy một tấm vật liệu hình chữ nhật (liên tục) và "băm" nó ra thành một mạng lưới 
    gồm nhiều "viên gạch" hình tứ giác nhỏ (rời rạc). Việc này giúp máy tính có thể 
    tính toán lực và biến dạng cho từng viên gạch nhỏ, sau đó cộng dồn lại để ra kết 
    quả của cả tấm vật liệu lớn.

    [CÔNG THỨC & LOGIC SỬ DỤNG]
    1. Công thức chia tọa độ:
       - Bước nhảy trục X: dx = (ex - sx) / nx
       - Bước nhảy trục Y: dy = (ey - sy) / ny
       - Tọa độ một điểm bất kỳ: x_j = sx + j*dx, y_i = sy + i*dy
       (Trong code, hàm np.linspace tự động thực hiện phép tính này).

    2. Logic nối phần tử (Topology):
       Mỗi phần tử (viên gạch) bắt buộc phải được tạo thành từ 4 Nút theo thứ tự 
       *Ngược chiều kim đồng hồ* (để tránh ma trận Jacobian bị âm):
       (Dưới-Trái) -> (Dưới-Phải) -> (Trên-Phải) -> (Trên-Trái)

    [VÍ DỤ MINH HỌA (THAY SỐ)]
    - Đầu vào (Input): Tấm thép 2x2 mét, chia làm 4 ô (2 cột, 2 hàng).
      sx=0, sy=0, ex=2, ey=2, nx=2, ny=2

    - Đầu ra (Output) gồm 2 ma trận:
      1. nodes (9 nút): 
         [[0. 0.], [1. 0.], [2. 0.],  <-- Hàng dưới cùng (y=0)
          [0. 1.], [1. 1.], [2. 1.],  <-- Hàng giữa (y=1)
          [0. 2.], [1. 2.], [2. 2.]]  <-- Hàng trên cùng (y=2)
          
      2. elements (4 phần tử):
         [[0, 1, 4, 3],  <-- Viên gạch góc dưới bên trái
          [1, 2, 5, 4],  <-- Viên gạch góc dưới bên phải
          [3, 4, 7, 6],  <-- Viên gạch góc trên bên trái
          [4, 5, 8, 7]]  <-- Viên gạch góc trên bên phải
    """
    
    # --- BƯỚC 1: TẠO CÁC MỐC TỌA ĐỘ TRÊN TRỤC X VÀ Y ---
    x = np.linspace(sx, ex, nx + 1)
    y = np.linspace(sy, ey, ny + 1)
    
    nodes = []
    
    # Ma trận nids (Node IDs) dùng để lập bản đồ vị trí 2D (hàng i, cột j) sang 1D.
    nids = np.zeros((ny + 1, nx + 1), dtype=int)
    
    # --- BƯỚC 2: TẠO DANH SÁCH TỌA ĐỘ CÁC NÚT (NODES) ---
    k = 0
    for i in range(ny + 1):          
        for j in range(nx + 1):      
            nids[i, j] = k           
            nodes.append([x[j], y[i]]) 
            k += 1                   
            
    nodes = np.array(nodes)
    
    # --- BƯỚC 3: KẾT NỐI 4 NÚT LẠI THÀNH 1 PHẦN TỬ (ELEMENTS) ---
    elements = []
    for i in range(ny):              
        for j in range(nx):          
            n1 = nids[i, j]          
            n2 = nids[i, j + 1]      
            n3 = nids[i + 1, j + 1]  
            n4 = nids[i + 1, j]      
            
            elements.append([n1, n2, n3, n4])
            
    elements = np.array(elements)
    
    return nodes, elements


def uniform_mesh_triangle(sx, sy, ex, ey, nx, ny):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Tạo lưới phần tử Tam giác 3 nút (CST). Lưới tam giác rất hữu dụng khi vật thể có 
    hình dáng méo mó, bo tròn hoặc có lỗ rỗng. 
    Trong bài toán tấm chữ nhật này, cách nhanh nhất để tạo lưới tam giác là: 
    Kẻ lưới ô vuông trước, sau đó lấy dao "chẻ đôi" mỗi ô vuông theo đường chéo 
    để tạo thành 2 tam giác.

    [CÔNG THỨC & LOGIC SỬ DỤNG]
    1. Tái sử dụng (Reuse) lại danh sách tọa độ Nút (nodes) từ hàm tứ giác.
    2. Logic chẻ phần tử:
       Đường chéo nối n1 và n3 sẽ chia tứ giác này thành 2 tam giác:
       - Tam giác nửa dưới: [n1, n2, n3] 
       - Tam giác nửa trên: [n1, n3, n4] 
    """
    
    # 1. Gọi hàm tạo lưới tứ giác cũ để lấy tọa độ các nút (nodes) và mảng tứ giác
    nodes, quad_elements = uniform_mesh_quad4(sx, sy, ex, ey, nx, ny)
    
    tri_elements = []
    
    # 2. Quét qua từng hình tứ giác để "chẻ đôi"
    for quad in quad_elements:
        n1, n2, n3, n4 = quad
        
        # Tam giác 1: Nửa dưới (Nút 1, 2, 3)
        tri_elements.append([n1, n2, n3])
        
        # Tam giác 2: Nửa trên (Nút 1, 3, 4)
        tri_elements.append([n1, n3, n4])
        
    return nodes, np.array(tri_elements)


def delaunay_mesh(points):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Áp dụng thuật toán Delaunay Triangulation (đúng như thầy ghi trong vở).
    Nó nhận vào một danh sách các điểm tọa độ bất kỳ (kể cả hình lồi lõm), 
    và tự động tìm cách nối chúng lại thành một lưới tam giác tối ưu nhất.

    [CÔNG THỨC & LOGIC SỬ DỤNG]
    Dùng module `Delaunay` của thư viện `scipy.spatial`. 
    Thuật toán đảm bảo không có điểm nào nằm bên trong đường tròn ngoại tiếp 
    của bất kỳ tam giác nào trong lưới (giúp tối đa hóa các góc nhỏ nhất, 
    tránh tam giác bị dẹt).

    [VÍ DỤ MINH HỌA]
    - Đầu vào: 6 điểm tạo thành hình chữ L.
    - Đầu ra: Tự động trả về ma trận elements gồm các tam giác nối 6 điểm đó 
      một cách hợp lý nhất mà không bị vắt chéo ra ngoài không gian rỗng.
    """
    nodes = np.array(points)
    
    # Chỉ 1 dòng lệnh này, thuật toán Delaunay tự động giải quyết mọi việc nối điểm!
    tri = Delaunay(nodes)
    
    # tri.simplices chính là mảng chứa danh sách các Nút tạo thành 1 tam giác
    elements = tri.simplices
    
    return nodes, elements