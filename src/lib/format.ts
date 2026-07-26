// Currency formatting helper
export function formatNpr(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatNprWithSymbol(amount: number, decimals: number = 2): string {
  const formatted = formatNpr(amount, decimals)
  return amount < 0 ? `-Rs ${formatted.replace('-', '')}` : `Rs ${formatted}`
}

export function formatNprCompact(amount: number): string {
  if (Math.abs(amount) >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)} Cr`
  if (Math.abs(amount) >= 100000) return `Rs ${(amount / 100000).toFixed(2)} L`
  if (Math.abs(amount) >= 1000) return `Rs ${(amount / 1000).toFixed(1)} K`
  return `Rs ${amount.toFixed(0)}`
}

export function formatNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(amount)
}
