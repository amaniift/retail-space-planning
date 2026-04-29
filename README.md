# Retail Space Planning & Optimization Tool

An end-to-end local tool for retail professionals to design, optimize, and visualize 3D planograms using physical product dimensions and real-world sales velocity.

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### Backend Setup
```powershell
cd backend
pip install -r requirements.txt
python seed.py  # Initializes and seeds the local retail.db
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` to view the tool.

## 📂 Documentation
- [Functional Specification](docs/functional_spec.md): Business logic, user flows, and merchandising formulas.
- [Technical Specification](docs/technical_spec.md): Architecture, API documentation, and algorithmic details.

## 🛠 Features
- **Real-time 3D Rendering**: High-fidelity planogram visualization using React Three Fiber.
- **Dynamic Optimization**: Algorithmic packing based on Space Elasticity and Days of Supply (DOS).
- **Interactive Workspace**: Drag-and-drop shelf management with real-time collision detection.
- **Integrated Analytics**: Instant SKU-level performance metrics and inventory health warnings.
