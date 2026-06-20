from typing import Tuple

BASE_PAYOUT = 30.0
PER_KM_RATE = 15.0


def calculate_dynamic_payout_range(distance_meters: float) -> Tuple[float, float]:
    """Compute payout bounds from base payout and per-kilometer variable rate."""
    distance_km = max(distance_meters, 0) / 1000.0
    base_payout = BASE_PAYOUT + (distance_km * PER_KM_RATE)
    min_range = round(base_payout * 0.95, 2)
    max_range = round(base_payout * 1.15, 2)
    return min_range, max_range
