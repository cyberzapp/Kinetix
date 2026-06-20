import json
import os
import time
from typing import List, Tuple

import redis
from psycopg2.extras import execute_values

from core.db import create_connection
from core.payout import calculate_dynamic_payout_range

BATCH_SIZE = int(os.getenv('BATCH_SIZE', '500'))
FLUSH_INTERVAL = float(os.getenv('FLUSH_INTERVAL', '2'))

r = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0'))
db_conn = create_connection()
db_conn.autocommit = True

memory_buffer: List[Tuple[str, str, float, float, float]] = []
last_flush_time = time.time()


def flush_candidates_to_postgres() -> None:
    global memory_buffer, last_flush_time
    if not memory_buffer:
        return

    query = """
        INSERT INTO order_match_candidates (order_id, delivery_agent_id, min_payout, max_payout, distance_meters)
        VALUES %s
        ON CONFLICT (order_id, delivery_agent_id)
        DO UPDATE SET
            min_payout = EXCLUDED.min_payout,
            max_payout = EXCLUDED.max_payout,
            distance_meters = EXCLUDED.distance_meters,
            status = 'OPEN',
            updated_at = NOW()
    """

    with db_conn.cursor() as cursor:
        execute_values(cursor, query, memory_buffer)

    order_ids = {row[0] for row in memory_buffer}
    with db_conn.cursor() as cursor:
        cursor.execute(
            "UPDATE orders SET status = 'DRIVER_MATCHING' WHERE id = ANY(%s) AND status = 'STORE_ACCEPTED'",
            (list(order_ids),),
        )

    memory_buffer.clear()
    last_flush_time = time.time()


def process_order_matching_events() -> None:
    global last_flush_time
    pubsub = r.pubsub()
    pubsub.subscribe('order_matching_stream')
    print('[WORKER] Listening on order_matching_stream')

    while True:
        message = pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            event_data = json.loads(message['data'].decode('utf-8'))
            order_id = event_data['order_id']
            agent_id = event_data['agent_id']
            distance_meters = float(event_data['distance_meters'])

            min_pay, max_pay = calculate_dynamic_payout_range(distance_meters)
            memory_buffer.append((order_id, agent_id, min_pay, max_pay, distance_meters))

        if len(memory_buffer) >= BATCH_SIZE or (time.time() - last_flush_time) >= FLUSH_INTERVAL:
            flush_candidates_to_postgres()

        time.sleep(0.01)


if __name__ == '__main__':
    process_order_matching_events()
