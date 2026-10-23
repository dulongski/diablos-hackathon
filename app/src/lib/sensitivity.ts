/** Local sensitivity on an RPM grid; endpoint changes can cancel. */
export function rpmSensitivity(grid: { rpm: number; mar: number }[]) {
  if (grid.length < 2) return null;
  const changes = grid.slice(1).map((p, i) => {
    const step = p.rpm - grid[i].rpm;
    if (!(step > 0) || !Number.isFinite(p.mar) || !Number.isFinite(grid[i].mar)) throw new Error('Expected finite scores and increasing RPM');
    return (p.mar - grid[i].mar) * 100 / step;
  });
  return { meanAbsolutePer100: changes.reduce((s, x) => s + Math.abs(x), 0) / changes.length,
    minPer100: Math.min(...changes), maxPer100: Math.max(...changes),
    endpointPer100: (grid[grid.length - 1].mar - grid[0].mar) * 100 / (grid[grid.length - 1].rpm - grid[0].rpm) };
}
