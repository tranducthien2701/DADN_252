import json
import os
import numpy as np
from meshing import uniform_mesh_quad4
from fem_core import assemble_global_system, apply_boundary_conditions
from plotter import plot_mesh

def load_config(filepath='config.json'):
    # If a relative path is given, resolve it relative to this script's directory
    if not os.path.isabs(filepath):
        base_dir = os.path.dirname(__file__)
        filepath = os.path.join(base_dir, filepath)
    with open(filepath, 'r') as file:
        return json.load(file)

def print_results(u, nodes):
    print("\nCHUYỂN VỊ TẠI CÁC NÚT (m):")
    print("-" * 55)
    print(f"{'Nút':<5} | {'Tọa độ (x, y)':<15} | {'u_x (m)':<12} | {'u_y (m)':<12}")
    print("-" * 55)
    for i in range(len(nodes)):
        x, y = nodes[i]
        print(f"{i:<5} | ({x:.1f}, {y:.1f})      | {u[2*i]:>12.6e} | {u[2*i+1]:>12.6e}")

def main():
    # 1. ĐỌC CẤU HÌNH
    config = load_config()
    mat = config['material']
    geo = config['geometry']
    mesh = config['mesh']
    bc = config['boundary_conditions']

    # 2. CHIA LƯỚI
    print("1. Đang chia lưới...")
    nodes, elements = uniform_mesh_quad4(geo['start_x'], geo['start_y'], geo['end_x'], geo['end_y'], mesh['nx'], mesh['ny'])

    # 3. LẮP RÁP MA TRẬN TỔNG
    print("2. Đang tính toán ma trận độ cứng tổng...")
    K_global, F_global = assemble_global_system(nodes, elements, mat['E'], mat['nu'], mat['thickness'])

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