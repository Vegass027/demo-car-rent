// Расчёт прибыли
export const calcProfit = (
  rental: number,
  service: number,
  other: number
): number => rental - service - other

// Расчёт загрузки (процент занятых дней)
export const calcOccupancy = (rentedDays: number, totalDays: number): number =>
  totalDays === 0 ? 0 : Math.round((rentedDays / totalDays) * 100)

// Расчёт ROI
export const calcROI = (totalProfit: number, totalInvestment: number): number =>
  totalInvestment === 0 ? 0 : Math.round((totalProfit / totalInvestment) * 100)

// Расчёт полной суммы выкупа: carPrice × (1 + profitPercent / 100)
export const calcBuyoutTotalSum = (carPrice: number, profitPercent: number): number =>
  Math.round(carPrice * (1 + profitPercent / 100))

// Расчёт ежемесячного платежа выкупа
export const calcBuyoutMonthlyPayment = (totalSum: number, termMonths: number): number =>
  Math.round(totalSum / termMonths)

// Расчёт доли прибыли из платежа выкупа
// profitPercent — процент чистой прибыли (217 = 217%)
// Возвращает: paymentAmount × profitPercent / (100 + profitPercent)
// Это доля от платежа, которая является чистой прибылью
export const calcBuyoutProfitShare = (paymentAmount: number, profitPercent: number): number => {
  if (profitPercent <= 0) return 0
  return paymentAmount * profitPercent / (100 + profitPercent)
}
