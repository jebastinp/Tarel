#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "backend/.venv/bin/activate" ]; then
  echo "Backend virtualenv not found. Run 'cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt' first." >&2
  exit 1
fi

# Get local IP address for mobile access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo "========================================"
echo "🚀 Starting TAREL Development Services"
echo "========================================"
echo ""
echo "📱 Access from mobile/other devices:"
echo "   Backend API:  http://${LOCAL_IP}:8000"
echo "   Frontend:     http://${LOCAL_IP}:3000"
echo "   Admin Panel:  http://${LOCAL_IP}:5173"
echo ""
echo "💻 Access from this machine:"
echo "   Backend API:  http://localhost:8000"
echo "   Frontend:     http://localhost:3000"
echo "   Admin Panel:  http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"
echo ""

cleanup() {
  echo ""
  echo "========================================"
  echo "🛑 Stopping all services..."
  echo "========================================"
  pkill -P $$ || true
  echo "✅ All services stopped"
}

trap cleanup EXIT

(
  cd backend
  source .venv/bin/activate
  export GETADDRESS_API_KEY="UF1ey2evy0iTrxKXrVcLbA48669"
  # Allow CORS from localhost and local network IP for mobile access
  export FRONTEND_ORIGINS="http://localhost:5173,http://localhost:3000,http://${LOCAL_IP}:5173,http://${LOCAL_IP}:3000"
  echo "[backend] Starting uvicorn on http://0.0.0.0:8000"
  echo "[backend] CORS enabled for: ${FRONTEND_ORIGINS}"
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) &

(
  cd frontend
  # Set API URL for mobile access
  export NEXT_PUBLIC_API_BASE="http://${LOCAL_IP}:8000"
  echo "[frontend] Starting Next.js dev server on http://0.0.0.0:3000"
  echo "[frontend] API Base: ${NEXT_PUBLIC_API_BASE}"
  npm run dev -- --hostname 0.0.0.0
) &

(
  cd admin-dashboard
  # Set API URL for mobile access
  export VITE_API_BASE="http://${LOCAL_IP}:8000/api"
  echo "[admin] Starting Vite dev server on http://0.0.0.0:5173"
  echo "[admin] API Base: ${VITE_API_BASE}"
  npm run dev -- --host
) &

wait
