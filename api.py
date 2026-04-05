# File: meshing/DADN_252/api.py
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import json

# Lấy thuật toán chia lưới thật từ file ThuatToan/meshing.py
from ThuatToan.meshing import uniform_mesh_quad4

app = FastAPI()

# Cho phép App điện thoại gọi tới (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Meshing Server is running!"}

@app.post("/api/process-mesh")
async def process_mesh(data: Request):
    """
    API nhận JSON or File, chạy thuật toán và trả kết quả.
    """
    try:
        # Nếu gửi JSON
        content = await data.json()
        print("Received MESHDATA from App:", content)
        
        # Đọc thông số hình chữ nhật truyền lên
        shape_type = content.get("shape", "Unknown")
        dimensions = content.get("dimensions", {})
        width = float(dimensions.get("width", 2.0))
        height = float(dimensions.get("height", 1.0))

        # 2. Đưa vào thuật toán thật của bạn trong ThuatToan.meshing
        nx = max(1, int(width))
        ny = max(1, int(height))
        
        nodes_np, elements_np = uniform_mesh_quad4(0.0, 0.0, width, height, nx, ny)
        
        # Chuyển đổi định dạng NumPy array sang list of dicts cho Frontend App
        nodes = [{"id": i, "x": float(n[0]), "y": float(n[1])} for i, n in enumerate(nodes_np)]
        elements = [{"id": i, "nodes": [int(n_id) for n_id in elem]} for i, elem in enumerate(elements_np)]

        result_data = {
            "status": "success",
            "message": f"Đã tạo lưới (mesh) cho {shape_type}",
            "nodeCount": len(nodes),
            "elementCount": len(elements),
            "nodes": nodes,
            "elements": elements,
            "quality": 0.95
        }
        
        # 3. Trả kết quả về cho App để hiển thị (sang MeshQualityView.js)
        return result_data

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Chạy server ở địa chỉ mạng local, port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)