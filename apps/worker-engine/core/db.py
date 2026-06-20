import os
from psycopg2 import connect


def create_connection():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise RuntimeError('DATABASE_URL is required')
    return connect(database_url)
