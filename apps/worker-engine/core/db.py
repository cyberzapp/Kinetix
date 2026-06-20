import os
from psycopg2 import connect


def create_connection():
    return connect(os.getenv('DATABASE_URL', '******127.0.0.1:5432/kinetix'))
