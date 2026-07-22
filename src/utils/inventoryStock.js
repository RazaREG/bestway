/** Default when deduct_ratio is missing or invalid. */
export const DEFAULT_DEDUCT_RATIO = 1;

export function getDeductRatio(item) {
  const ratio = Number(item?.deduct_ratio);
  return ratio > 0 ? ratio : DEFAULT_DEDUCT_RATIO;
}

/** Stock removed = quantity entered × deduct ratio. */
export function calcStockDeduction(usedQty, item) {
  const ratio = getDeductRatio(item);
  const entered = Number(usedQty) || 0;
  const deduct = roundStock(entered * ratio);
  return { entered, ratio, deduct };
}

export function roundStock(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

/** Max whole/part quantity the user can enter without exceeding available stock. */
export function maxEnterableQty(stockQty, ratio) {
  const r = ratio > 0 ? ratio : DEFAULT_DEDUCT_RATIO;
  const stock = Number(stockQty) || 0;
  if (stock <= 0) return 0;
  return roundStock(stock / r);
}
