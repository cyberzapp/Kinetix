from core.payout import calculate_dynamic_payout_range


def test_dynamic_payout_range():
    assert calculate_dynamic_payout_range(1000) == (42.75, 51.75)
    assert calculate_dynamic_payout_range(3000) == (71.25, 86.25)
