export function mergeStrategyLogs (current, incoming, limit = 200) {
  const byId = new Map(current.map(row => [row.id, row]))
  for (const row of incoming) byId.set(row.id, row)
  return [...byId.values()].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, limit)
}
