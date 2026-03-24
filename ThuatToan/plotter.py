import matplotlib.pyplot as plt
import numpy as np

def plot_mesh(nodes, elements, u=None, scale=1.0):
    plt.figure(figsize=(8, 6))
    
    # Vẽ lưới ban đầu
    for el in elements:
        poly_nodes = np.append(el, el[0]) 
        x = nodes[poly_nodes, 0]
        y = nodes[poly_nodes, 1]
        plt.plot(x, y, 'k--', alpha=0.5) 
        
    # Vẽ lưới biến dạng nếu đã tính được u
    if u is not None:
        deformed_nodes = np.copy(nodes)
        for i in range(len(nodes)):
            deformed_nodes[i, 0] += u[2*i] * scale
            deformed_nodes[i, 1] += u[2*i+1] * scale
            
        for el in elements:
            poly_nodes = np.append(el, el[0])
            x_def = deformed_nodes[poly_nodes, 0]
            y_def = deformed_nodes[poly_nodes, 1]
            plt.plot(x_def, y_def, 'b-', linewidth=1.5)
            
        plt.title(f"Lưới FEM Trước và Sau biến dạng (Phóng đại: {scale}x)")
        plt.plot([], [], 'k--', alpha=0.5, label='Ban đầu')
        plt.plot([], [], 'b-', linewidth=1.5, label='Sau biến dạng')
        plt.legend()
    else:
        plt.title("Lưới FEM Ban đầu (Chưa chịu lực)")

    # Chấm các điểm nút
    plt.plot(nodes[:, 0], nodes[:, 1], 'ro', markersize=4)
    
    plt.xlabel("Trục X (m)")
    plt.ylabel("Trục Y (m)")
    plt.axis('equal')
    plt.grid(True)
    plt.show()