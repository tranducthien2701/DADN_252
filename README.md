# FEA_Project
===========

**Mô tả dự án:**
Một phần mềm mini mô phỏng Phân tích Phần tử Hữu hạn (FEA - Finite Element Analysis) 2D viết bằng Python. Dự án được thiết kế theo chuẩn **Data Pipeline (Đường ống dữ liệu)**, chia nhỏ quá trình giải toán thành 7 bước độc lập giúp kỹ sư dễ dàng kiểm soát, debug và trực quan hóa từng ma trận toán học. Hỗ trợ cả lưới có cấu trúc (Tứ giác/Tam giác) và lưới không cấu trúc (Thuật toán Delaunay). 

Các mã nguồn lõi nằm trong thư mục `ThuatToan_Final`.

**Yêu cầu hệ thống**
- Python 3.10+ (Windows/macOS/Linux)
- Khuyến nghị: Dùng môi trường ảo `venv`
- Thư viện Python: `numpy` (tính toán ma trận), `scipy` (thuật toán Delaunay), `matplotlib` (đồ họa).

---

### 🚀 Cài đặt nhanh (Windows PowerShell)

1. Tạo môi trường ảo (nếu chưa có):
   ```powershell
   python -m venv .venv
   ```

2. Kích hoạt môi trường ảo:
   ```powershell
   .\.venv\Scripts\activate
   ```

3. Cài đặt toàn bộ thư viện lõi chỉ với 1 lệnh:
   ```powershell
   pip install -r requirements.txt
   ```

---

### 🎮 Chạy Demo Toàn Bộ Hệ Thống

Từ thư mục gốc của dự án (nơi chứa file README này), sau khi đã kích hoạt venv, hãy chạy "Nhạc trưởng":

```powershell
python ThuatToan_Final\main.py
```
*Chương trình sẽ tự động quét qua 7 bước, in ra các ma trận chi tiết và bật lên cửa sổ đồ họa mô phỏng biến dạng.*

---

### 📂 Kiến trúc Dự án (Pipeline 7 Bước)
Dự án tách biệt rõ ràng giữa Lõi tính toán, Cấu hình và Dữ liệu. Bạn có thể chạy độc lập từng file `step...` để kiểm tra output của bước đó.

- **`config.json`** — **Bảng điều khiển trung tâm:** Nơi kỹ sư thiết lập thông số vật liệu (E, nu), kích thước lưới, số điểm Gauss tích phân và các điều kiện biên (Ngàm/Lực).
- **`mesh_data.json`** — **Kho dữ liệu Hình học:** Lưu trữ tọa độ mảng điểm cho thuật toán Delaunay (các hình lồi lõm phức tạp).
- **`main.py`** — **Nhạc trưởng:** Nạp `config.json` một lần duy nhất lên RAM và điều phối dữ liệu chảy qua 7 bước dưới đây:
  - `step1_meshing.py` — **Rời rạc hóa:** Sinh lưới tọa độ Nút (Nodes) và Bảng kết nối Phần tử (Elements).
  - `step2_get_D_matrix.py` — **Vật liệu:** Tính Ma trận đàn hồi D cho trạng thái Ứng suất phẳng.
  - `step3_get_dN_nat.py` — **Toán học lõi:** Truy xuất tọa độ điểm Gauss và tính Đạo hàm hàm dạng dN_nat.
  - `step4_get_Ke.py` — **Trái tim phần tử:** Tính Jacobian J, Ma trận biến dạng B và tích phân ra Ma trận độ cứng phần tử Ke (Ví dụ: 8x8 cho phần tử Q4).
  - `step5_assemble_global.py` — **Lắp ráp:** Cộng dồn các Ke vào Siêu ma trận độ cứng toàn cục K_global.
  - `step6_solve_system.py` — **Giải hệ:** Áp đặt Điều kiện biên (phương pháp *Zeroing out* hàng/cột) và giải phương trình K * U = F để tìm Chuyển vị U.
  - `step7_plot_results.py` — **Post-processing:** Phóng đại (Scale Factor) và trực quan hóa lưới biến dạng đè lên lưới gốc.

---

### 🧠 Luồng thực thi tóm tắt (Call Stack)

```text
main()
 ├── load_config() -> Đọc cấu hình từ JSON
 ├── [BƯỚC 1] step1_meshing.MeshGenerator.generate()
 ├── [BƯỚC 2] step2_get_D_matrix.get_D_matrix()
 ├── [BƯỚC 3] step3_get_dN_nat.get_gauss_points() & compute_dN_nat()
 ├── [BƯỚC 4 & 5] step5_assemble_global.assemble_K_global()
 │    └── step4_get_Ke.compute_Ke() [Lặp qua từng phần tử]
 ├── [BƯỚC 6] step6_solve_system.apply_bcs_and_solve() -> Trả về U_global
 └── [BƯỚC 7] step7_plot_results.plot_fea_results() -> Hiển thị UI
```

---

### 🛠 Tính năng Testing Độc lập (Sanity Check)

Kiến trúc cho phép kỹ sư kiểm toán toán học tại bất kỳ khâu nào mà không cần chạy toàn bộ dự án. Ví dụ, để kiểm tra xem ma trận Đàn hồi có tính đúng theo công thức lý thuyết hay không, chỉ cần chạy:

```powershell
python ThuatToan_Final\step2_get_D_matrix.py


