import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.database import engine, Base, SessionLocal
from backend.seed_data import seed_database
from backend.routers import (
    auth_routes, erp_routes, lms_routes, attendance_routes,
    certificate_routes, job_routes, ai_routes, analytics_routes
)

app = FastAPI(
    title="SAHAKAR-LINK Enterprise Core Platform API",
    description="AI & LMS-Enabled Cooperative Capacity Building, ERP & Employment Ecosystem (SIH #26087)",
    version="2.1.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable fast GZip compression for API responses >= 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include all modular routers
app.include_router(auth_routes.router)
app.include_router(erp_routes.router)
app.include_router(lms_routes.router)
app.include_router(attendance_routes.router)
app.include_router(certificate_routes.router)
app.include_router(job_routes.router)
app.include_router(ai_routes.router)
app.include_router(analytics_routes.router)

_startup_initialized = False

@app.on_event("startup")
def on_startup():
    global _startup_initialized
    if _startup_initialized:
        return
    try:
        from backend.models import User
        db = SessionLocal()
        user_exists = db.query(User.id).first()
        db.close()
        if not user_exists:
            Base.metadata.create_all(bind=engine)
            seed_database()
    except Exception:
        try:
            Base.metadata.create_all(bind=engine)
            seed_database()
        except Exception as e:
            print(f"Startup warning: {e}")
    _startup_initialized = True

@app.get("/api/health")
def api_health():
    return {
        "status": "ONLINE",
        "service": "SAHAKAR-LINK Unified Monolith",
        "ministry": "Ministry of Cooperation, Government of India",
        "target_organization": "National Council for Cooperative Training (NCCT)",
        "sih_problem_id": 26087,
        "database": "SQLite (Local) / PostgreSQL Ready",
        "docs_url": "/docs"
    }

# =======================================================
# PRODUCTION SINGLE-ORIGIN SPA SERVING
# Serves the compiled React bundle directly from /
# =======================================================
PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/sw.js")
    def serve_sw():
        sw_file = FRONTEND_DIST / "sw.js"
        if not sw_file.exists():
            sw_file = PROJECT_ROOT / "frontend" / "public" / "sw.js"
        if sw_file.exists():
            return FileResponse(str(sw_file), media_type="application/javascript")
        return {"error": "Service worker not found"}

    @app.get("/favicon.svg")
    def serve_favicon():
        fav_file = FRONTEND_DIST / "favicon.svg"
        if not fav_file.exists():
            fav_file = PROJECT_ROOT / "frontend" / "public" / "favicon.svg"
        if fav_file.exists():
            return FileResponse(str(fav_file), media_type="image/svg+xml")
        return {"error": "Favicon not found"}

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Allow API endpoints and docs to pass through
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path == "openapi.json":
            return {"detail": "Not Found"}
        
        # Check if direct static file exists in dist
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        
        # SPA client-side fallback to index.html
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"status": "Frontend dist not built. Run npm run build."}
else:
    @app.get("/")
    def health_check_fallback():
        return api_health()

if __name__ == "__main__":
    import uvicorn
    from backend.config import API_HOST, API_PORT
    uvicorn.run("backend.main:app", host=API_HOST, port=API_PORT, reload=True)
