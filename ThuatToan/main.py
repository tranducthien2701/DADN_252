import json
import os
import numpy as np

# Import cả 2 hàm chia lưới từ file meshing.py
from meshing import uniform_mesh_quad4, uniform_mesh_triangle
from fem_core import assemble_global_system, apply_boundary_conditions
from plotter import plot_mesh

def load_config(filepath='config.json'):
    """
    [MỤC ĐÍCH THỰC TẾ]
    Đọc "Đề bài" từ file cấu hình (config.json). Hàm này giống như việc kỹ sư 
    nhận bản vẽ kỹ thuật và thông số vật liệu trước khi bắt đầu tính toán.

    [CÔNG THỨC & LOGIC SỬ DỤNG]
    Sử dụng thư viện `json` của Python để chuyển đổi nội dung file chữ (text) 
    thành các biến dạng từ điển (Dictionary) để code dễ dàng truy xuất.
    Lệnh `os.path` giúp máy tính tự động tìm đúng file config.json dù bạn 
    đang chạy code từ bất kỳ thư mục nào.

    [VÍ DỤ MINH HỌA]
    - Đầu vào: File `config.json` chứa thông số vật liệu E = 20e9.
    - Đầu ra: Trả về một biến config, để sau đó có thể lấy config['material']['E'] ra dùng.
    """
    if not os.path.isabs(filepath):
        base_dir = os.path.dirname(__file__)
        filepath = os.path.join(base_dir, filepath)
    with open(filepath, 'r', encoding='utf-8') as file:
        return json.load(file)

def print_results(u, nodes):
    """
    [MỤC ĐÍCH THỰC TẾ]
    In báo cáo nghiệm thu. Sau khi máy tính giải xong hệ phương trình khổng lồ, 
    nó sẽ in ra một bảng danh sách báo cáo chính xác Nút số mấy, ở tọa độ nào, 
    bị xê dịch sang trái/phải (u_x) và lên/xuống (u_y) bao nhiêu mét.

    [CÔNG THỨC & LOGIC SỬ DỤNG]
    Vector nghiệm `u` có kích thước = (Số lượng nút x 2).
    Cứ mỗi nút i, nó sẽ có 2 giá trị nằm liên tiếp nhau trong vector u:
    - Giá trị ở vị trí chẵn (2*i): Độ xê dịch trục X (u_x)
    - Giá trị ở vị trí lẻ (2*i + 1): Độ xê dịch trục Y (u_y)

    [VÍ DỤ MINH HỌA]
    Nút 8 tọa độ (5.0, 3.0). u_x = 0.0001 m, u_y = -0.00005 m.
    Có nghĩa là điểm này bị giật sang phải 0.1mm và lún xuống 0.05mm.
    """
    print("\nCHUYỂN VỊ TẠI CÁC NÚT (m):")
    print("-" * 55)
    print(f"{'Nút':<5} | {'Tọa độ (x, y)':<15} | {'u_x (m)':<12} | {'u_y (m)':<12}")
    print("-" * 55)
    for i in range(len(nodes)):
        x, y = nodes[i]
        print(f"{i:<5} | ({x:.1f}, {y:.1f})      | {u[2*i]:>12.6e} | {u[2*i+1]:>12.6e}")

def main():
    """
    [MỤC ĐÍCH THỰC TẾ]
    Hàm Nhạc Trưởng (Conductor). Đây là bộ não điều phối toàn bộ chương trình. 
    Nó gọi lần lượt các "Phòng ban" (các hàm khác) theo đúng quy trình của 
    môn Phần tử hữu hạn: Đọc đề -> Chia lưới -> Lắp ráp ma trận -> Khóa ngàm & Kéo lực 
    -> Giải phương trình -> Vẽ hình báo cáo.

    [LOGIC CẬP NHẬT MỚI]
    Đã được nâng cấp để đọc thuộc tính `element_type` từ file config.
    Tự động rẽ nhánh để gọi đúng hàm chia lưới Tam giác (CST) hoặc Tứ giác (Q4).
    """
    # 1. ĐỌC CẤU HÌNH
    config = load_config()
    mat = config['material']
    geo = config['geometry']
    mesh = config['mesh']
    bc = config['boundary_conditions']

    # Đọc loại phần tử từ JSON (nếu người dùng không ghi gì thì mặc định dùng 'quad')
    element_type = mesh.get('element_type', 'quad')

    # 2. CHIA LƯỚI
    print(f"1. Đang chia lưới theo kiểu [{element_type.upper()}]...")
    if element_type == 'quad':
        nodes, elements = uniform_mesh_quad4(
            geo['start_x'], geo['start_y'], geo['end_x'], geo['end_y'], 
            mesh['nx'], mesh['ny']
        )
    elif element_type == 'triangle':
        nodes, elements = uniform_mesh_triangle(
            geo['start_x'], geo['start_y'], geo['end_x'], geo['end_y'], 
            mesh['nx'], mesh['ny']
        )
    else:
        print("Lỗi: Loại phần tử (element_type) trong file config không hợp lệ!")
        return

    # 3. LẮP RÁP MA TRẬN TỔNG
    print("2. Đang tính toán ma trận độ cứng tổng...")
    # Bổ sung truyền biến element_type vào hàm lắp ráp để nó chọn đúng công thức (Ke)
    K_global, F_global = assemble_global_system(
        nodes, elements, mat['E'], mat['nu'], mat['thickness'], element_type=element_type
    )

    # 4. ĐIỀU KIỆN BIÊN & LỰC
    print("3. Đang áp dụng điều kiện biên...")
    K_global, F_global = apply_boundary_conditions(K_global, F_global, nodes, geo, bc)

    # 5. GIẢI HỆ PHƯƠNG TRÌNH
    print("4. Đang giải hệ phương trình...")
    u = np.linalg.solve(K_global, F_global)
    
    # 6. IN KẾT QUẢ VÀ VẼ ĐỒ THỊ
    print_results(u, nodes)
    print("\n5. Đang hiển thị biểu đồ...")
    
    # Hệ số phóng đại giúp dễ nhìn thấy sự biến dạng
    plot_mesh(nodes, elements, u=u, scale=500.0)

if __name__ == "__main__":
    main()