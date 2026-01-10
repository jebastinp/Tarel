import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import make_url

# Ensure the app package is importable when tests run from repo root
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure tests run against an isolated Postgres database
base_db_url = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:882010@localhost:5432/Tarel",
)
parsed_url = make_url(base_db_url)
test_db_name = os.getenv("TEST_DATABASE_NAME", f"{parsed_url.database}_test")

test_url = parsed_url.set(database=test_db_name)
admin_url = parsed_url.set(database="postgres")

os.environ["DATABASE_URL"] = str(test_url)

# Ensure the test database exists
admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
with admin_engine.connect() as conn:
    exists = conn.execute(
        text("SELECT 1 FROM pg_database WHERE datname = :name"),
        {"name": test_db_name},
    ).scalar()
    if not exists:
        conn.execute(text(f'CREATE DATABASE "{test_db_name}" OWNER "{parsed_url.username}"'))
admin_engine.dispose()

from app.main import app  # noqa: E402  (import after setting env)
from app.database import Base, get_db  # noqa: E402

engine = create_engine(os.environ["DATABASE_URL"])
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_tables():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c
