function calculateDynamicPayoutRange(distanceMeters: number): [number, number] {
  const distanceKm = distanceMeters / 1000;
  const base = 30 + distanceKm * 15;
  return [Number((base * 0.95).toFixed(2)), Number((base * 1.15).toFixed(2))];
}

describe('dynamic payout range', () => {
  it('calculates payout bounds based on distance', () => {
    expect(calculateDynamicPayoutRange(1000)).toEqual([42.75, 51.75]);
    expect(calculateDynamicPayoutRange(3000)).toEqual([71.25, 86.25]);
  });
});
