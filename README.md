# FEA_Project
===========

**Mô tả dự án:**
Một phần mềm mini mô phỏng Phân tích Phần tử Hữu hạn (FEA - Finite Element Analysis) 2D viết bằng Python. Dự án hỗ trợ cả lưới có cấu trúc (Structured Mesh - Tứ giác/Tam giác) cho các hình cơ bản và **lưới không cấu trúc (Unstructured Mesh - Thuật toán Delaunay Triangulation)** cho các vật thể lồi lõm phức tạp. Các mã nguồn lõi nằm trong thư mục `ThuatToan`.

**Yêu cầu hệ thống**
- Python 3.10+ (Windows/macOS/Linux)
- Khuyến nghị: Dùng môi trường ảo `venv`
- Thư viện Python: `numpy`, `scipy` (cho thuật toán Delaunay), `matplotlib` (cho đồ họa).

---

### 🚀 Cài đặt nhanh (Windows PowerShell)

1. Tạo môi trường ảo (nếu chưa có):
   python -m venv .venv

2. Kích hoạt môi trường ảo:
   & .venv\Scripts\Activate.ps1

3. Cài đặt các thư viện lõi:
   pip install numpy scipy matplotlib

Hoặc cài đặt qua file requirements (nếu có):
   pip install -r requirements.txt

---

### 🎮 Chạy Demo

Từ thư mục gốc của dự án (nơi chứa file README này), sau khi đã kích hoạt venv:

   python ThuatToan\main.py

---

### 📂 Kiến trúc Dự án (Các file quan trọng)
Dự án được thiết kế theo chuẩn Modular Architecture, tách biệt rõ ràng giữa Lõi tính toán, Bảng điều khiển và Kho dữ liệu:

- ThuatToan/main.py — **Nhạc trưởng:** Điều phối toàn bộ quy trình từ đọc cấu hình, chia lưới, lắp ráp ma trận, giải phương trình và vẽ đồ thị.
- ThuatToan/meshing.py — **Bộ phận Chia lưới:** Chứa các hàm sinh lưới Tứ giác (Q4), Tam giác (CST) và Thuật toán Delaunay.
- ThuatToan/fem_core.py — **Lõi Vật lý & Toán học:** Tính toán Tích phân Gauss, Ma trận độ cứng (Ke), Lắp ráp hệ toàn cục và Xử lý điều kiện biên (Ngàm/Lực).
- ThuatToan/plotter.py — **Đồ họa:** Xử lý hiển thị lưới biến dạng bằng matplotlib.
- ThuatToan/config.json — **Bảng điều khiển:** Nơi kỹ sư thay đổi thông số vật liệu, kích thước, và chọn chế độ chia lưới (auto hoặc custom).
- ThuatToan/mesh_data.json — **Kho dữ liệu Hình học:** Nơi lưu trữ tọa độ của các vật thể lồi lõm phức tạp (Cờ lê, dầm chữ I, chữ L...).

---

### 🧠 Luồng thực thi (Execution Flow)

1. **Đọc Cấu hình**: main() nạp config.json.
2. **Chia Lưới**: 
   - Nếu mesh_source là auto: Tự động băm lưới hình chữ nhật chuẩn.
   - Nếu mesh_source là custom: Đọc tọa độ từ mesh_data.json và chạy delaunay_mesh().
3. **Lắp ráp Ma trận**: Lặp qua từng phần tử, tính Ke và cộng dồn vào K_global.
4. **Điều kiện biên**: 
   - Khóa ngàm bên trái bằng phương pháp Penalty (10^15).
   - Tự động tìm nút gần tọa độ đích nhất để đặt lực kéo P.
5. **Giải Hệ Phương Trình**: Dùng np.linalg.solve tìm vector chuyển vị u.
6. **Vẽ đồ thị**: Hiển thị lưới biến dạng qua plot_mesh.

**Call Stack Tóm Tắt:**

main()
 ├── load_config()
 ├── [Branching: Meshing]
 │    ├── uniform_mesh_quad4() / uniform_mesh_triangle()  [If Auto]
 │    └── delaunay_mesh()                                 [If Custom]
 ├── assemble_global_system()
 │    └── compute_Ke() / compute_Ke_triangle()
 │         ├── get_D_matrix()
 │         └── shape_function_derivatives()
 ├── apply_boundary_conditions()
 ├── np.linalg.solve()
 ├── print_results()
 └── plot_mesh()

---

### 🛠 Hướng dẫn chia sẻ dự án (Clone & Run)

1. Clone repository:
   git clone <url-to-repo>
   cd <repo-folder>

2. Kích hoạt môi trường và cài đặt:
   python -m venv .venv
   & .venv\Scripts\Activate.ps1
   pip install -r requirements.txt

3. Chạy mô phỏng:
   Mở ThuatToan/config.json, đổi mesh_source thành "custom", chọn shape_name là "hinh_chu_L" và chạy:
   python ThuatToan\main.py