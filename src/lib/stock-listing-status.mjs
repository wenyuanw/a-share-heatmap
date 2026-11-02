/**
 * Exclude only confirmed, effective terminations. This deliberately leaves
 * suspended securities, IPOs, unknown industries and zero-change quotes alone.
 * @param {{ stocks: Array<{ code: string, delistedOn: string }> }} snapshot
 * @param {Date} [now]
 */
export function getDelistedCodes(snapshot, now = new Date()) {
  const shanghaiDate = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
  return new Set(snapshot.stocks.filter((stock) => stock.delistedOn <= shanghaiDate).map((stock) => stock.code));
}

/** @param {string} code */
export function isAShareCode(code) {
  return /^(?:6\d{5}\.SH|[03]\d{5}\.SZ|(?:43|83|87|88|92)\d{4}\.BJ)$/.test(code);
}

/**
 * A quote feed is not a listing register: missing rows must never delete a
 * suspended stock or an IPO. Only confirmed terminations remove existing codes.
 * @template {{code: string}} T
 * @param {T[]} previous
 * @param {T[]} incoming
 * @param {Set<string>} excludedCodes
 * @returns {T[]}
 */
export function mergeEligibleStocks(previous, incoming, excludedCodes) {
  const stocks = new Map();
  for (const stock of [...previous, ...incoming]) {
    if (isAShareCode(stock.code) && !excludedCodes.has(stock.code)) stocks.set(stock.code, stock);
  }
  return [...stocks.values()];
}
