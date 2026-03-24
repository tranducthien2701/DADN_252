FEA_Project
===========

**Mô tả dự án:**
Một minh họa nhỏ về Phân tích Phần tử Hữu hạn (FEA) viết bằng Python. Các mã chính nằm trong thư mục `ThuatToan`, bao gồm chia lưới, lắp hệ phương trình, giải bài toán đàn hồi 2D đơn giản và công cụ vẽ kết quả.

**Yêu cầu**
- Python 3.10+ (Windows)
- Khuyến nghị: dùng môi trường ảo `venv`
- Thư viện Python: `numpy`, `matplotlib`

**Cài đặt nhanh (Windows PowerShell)**

```powershell
# Tạo môi trường ảo (nếu chưa có)
python -m venv .venv
# Kích hoạt môi trường ảo
& .venv\Scripts\Activate.ps1
# Cài đặt phụ thuộc
pip install numpy matplotlib
```

Bạn cũng có thể tạo `requirements.txt` sau khi cài đặt bằng `pip freeze > requirements.txt` và cài bằng `pip install -r requirements.txt`.

**Chạy demo**

Từ thư mục gốc của dự án (nơi chứa file này):

```powershell
# Khi đã kích hoạt venv
python ThuatToan\main.py
```

Hoặc gọi trực tiếp Python của venv:

```powershell
& .venv\Scripts\python.exe ThuatToan\main.py
```

**Ghi chú**
- File cấu hình là `ThuatToan/config.json` — chỉnh file này để thay đổi hình học, lưới hoặc thông số vật liệu.
- Nếu cửa sổ vẽ không hiển thị, kiểm tra xem `matplotlib` đã được cài và môi trường đồ họa trên Windows hoạt động bình thường.

**Các file quan trọng**
- `ThuatToan/main.py` — chương trình chính: đọc cấu hình, chia lưới, lắp, giải và vẽ kết quả.
- `ThuatToan/meshing.py`, `ThuatToan/fem_core.py`, `ThuatToan/plotter.py` — các module lõi.

Muốn tôi tạo `requirements.txt` tự động hoặc commit thay đổi vào git không?

**Luồng chạy (Execution Flow)**

Dưới đây là luồng thực thi chính của chương trình khi bạn chạy `python ThuatToan\main.py` — xem `main.py` như người chỉ huy (conductor) gọi lần lượt các hàm trong các module khác:

1. `main()` gọi `load_config()`
	- Đọc `ThuatToan/config.json` và nạp các thông số `mat`, `geo`, `mesh`, `bc`.

2. `main()` gọi `uniform_mesh_quad4()` (trong `meshing.py`)
	- Sinh `nodes` (tọa độ) và `elements` (cách ghép 4 nút thành phần tử quad4).

3. `main()` gọi `assemble_global_system()` (trong `fem_core.py`)
	- Khởi tạo ma trận toàn cục `K_global` và vector tải `F_global`.
	- Lặp qua từng phần tử:
	  - Gọi `compute_Ke()` để tính ma trận độ cứng phần tử (`Ke`).
	  - Trong `compute_Ke()` gọi `get_D_matrix()` để lấy ma trận vật liệu và gọi `shape_function_derivatives()` tại mỗi điểm Gauss để tính ma trận B và Jacobian.
	  - Tính `Ke` (8×8) rồi ghép cộng vào `K_global` tại vị trí tương ứng.

4. `main()` gọi `apply_boundary_conditions()` (trong `fem_core.py`)
	- Áp phương pháp phạt (penalty): phạt các bậc tự do của nút ở mép trái (x=0) bằng một hằng số lớn (ví dụ 1e15) trên đường chéo của `K_global` để khóa biến位.
	- Thêm lực vào `F_global` tại nút đích (ví dụ góc trên bên phải) nếu cấu hình yêu cầu.

5. `main()` gọi `np.linalg.solve(K_global, F_global)`
	- Giải hệ tuyến tính để tìm vector biến位 `u` (toàn bộ chuyển vị các nút).

6. In kết quả và vẽ đồ thị
	- `print_results(u, nodes)` in biến位 tại từng nút ra console.
	- `plot_mesh(nodes, elements, u, scale=...)` vẽ lưới ban đầu và lưới biến dạng (đã nhân hệ số phóng đại).

Call stack tóm tắt:

```
main()
 ├── load_config()
 ├── uniform_mesh_quad4()
 ├── assemble_global_system()
 │    └── compute_Ke()  (lặp cho mỗi phần tử)
 │         ├── get_D_matrix()
 │         └── shape_function_derivatives() (lặp điểm Gauss)
 ├── apply_boundary_conditions()
 ├── np.linalg.solve()
 ├── print_results()
 └── plot_mesh()
```

Phần này giúp bạn hình dung rõ ràng dữ liệu và điều khiển luân chuyển giữa các module: từ `config.json` → `meshing` → `fem_core` → `plotter`.

**Hướng dẫn để người khác có thể chạy dự án (Share / Run on another machine)**

Chuẩn bị môi trường trên máy mới:

1) Sao chép (clone) repository về máy của họ:

```powershell
git clone <url-to-repo>
cd <repo-folder>
```

2) Tạo và kích hoạt môi trường ảo (đảm bảo dùng Python 3.10+):

PowerShell (Windows):
```powershell
python -m venv .venv
& .venv\Scripts\Activate.ps1
```

Command Prompt (Windows):
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

macOS / Linux (bash/zsh):
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3) Cài đặt phụ thuộc:

- Nếu đã có `requirements.txt` trong repo:
```bash
pip install -r requirements.txt
```
- Nếu không, cài thủ công những thư viện cần thiết:
```bash
pip install numpy matplotlib
```

Ghi chú: bạn có thể tạo `requirements.txt` trên máy phát triển bằng lệnh `pip freeze > requirements.txt` sau khi đã cài đầy đủ gói.

4) Kiểm tra file cấu hình `ThuatToan/config.json` — đảm bảo các tham số `geometry`, `mesh` và `material` hợp lệ.

5) Chạy chương trình:

```powershell
# khi đang ở thư mục gốc và venv đã active
python ThuatToan\main.py
```

Hoặc gọi trực tiếp python của venv:

```powershell
& .venv\Scripts\python.exe ThuatToan\main.py
```

Mẹo khi gặp vấn đề:
- Nếu gặp `FileNotFoundError` liên quan đến `config.json`, kiểm tra rằng file tồn tại tại `ThuatToan/config.json` và chương trình được chạy từ thư mục gốc hoặc cấu hình đường dẫn đúng.
- Nếu không thấy cửa sổ vẽ: kiểm tra `matplotlib` đã cài, hoặc chạy trong môi trường GUI (không phải SSH không có forwarding X).
- Để hiện tất cả cảnh báo Python giúp debug:
```bash
python -W always ThuatToan\main.py
```

Quy trình gợi ý khi chia sẻ repo cho người khác:
- Thêm `requirements.txt` bằng `pip freeze > requirements.txt` trước khi push.
- Thêm phần ngắn trong `README.md` nhắc họ chạy virtualenv, cài dependencies và kiểm tra `config.json`.

Muốn tôi tạo `requirements.txt` tự động từ môi trường hiện tại và/hoặc commit các thay đổi vào git không?