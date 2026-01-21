from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routers import admin, auth, categories, getaddress, orders, products, site, support
from .seed import seed_database

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)


@app.on_event("startup")
async def startup_event():
    """Seed database on startup if empty."""
    try:
        seed_database()
    except Exception as e:
        print(f"Warning: Could not seed database: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(categories.router, prefix=settings.API_PREFIX)
app.include_router(products.router, prefix=settings.API_PREFIX)
app.include_router(orders.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)
app.include_router(site.router, prefix=settings.API_PREFIX)
app.include_router(support.router, prefix=settings.API_PREFIX)
app.include_router(getaddress.router)

media_path = Path(settings.MEDIA_ROOT)
media_path.mkdir(parents=True, exist_ok=True)
media_mount = settings.MEDIA_URL if settings.MEDIA_URL.startswith("/") else f"/{settings.MEDIA_URL}"
app.mount(media_mount, StaticFiles(directory=media_path), name="media")


@app.get("/")
def root():
    return {"status": "ok", "name": settings.PROJECT_NAME}
