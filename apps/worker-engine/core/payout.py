from typing import Tuple


def calculate_dynamic_payout_range(distance_meters: float) -> Tuple[float, float]:
    distance_km = max(distance_meters, 0) / 1000.0
    base_payout = 30.0 + (distance_km * 15.0)
    min_range = round(base_payout * 0.95, 2)
    max_range = round(base_payout * 1.15, 2)
    return min_range, max_range
