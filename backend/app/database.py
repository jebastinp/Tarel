import logging

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

logger = logging.getLogger("tarel.database")
def _initialise_engine():
    url = settings.DATABASE_URL
    engine = create_engine(url, pool_pre_ping=True)

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database engine initialised")
        return engine
    except SQLAlchemyError:
        logger.error("Failed to initialise database engine", exc_info=True)
        raise


engine = _initialise_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
