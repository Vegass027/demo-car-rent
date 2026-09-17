// ============================================================
// API: ФИНАНСЫ
// Запросы к views (cash_flow, monthly_stats) и salary_withdrawals
// snake_case из БД → camelCase в приложении
// ============================================================

import { getClient } from '@/lib/api-client'
import { calcBuyoutProfitShare } from '@/utils/calc'
import type { CashFlow, MonthlyStats, SalaryWithdrawal, SalaryFormData, MonthlyProfitData, CarAnalyticsSummary } from '@/types'

// --- VIEW: cash_flow ---

export async function getCashFlow(): Promise<CashFlow> {
  const { data, error } = await getClient()
    .from('cash_flow')
    .select('*')
    .limit(1)
    .single()

  if (error) throw new Error(error.message)
  
  return {
    totalIncome: Number(data.total_income) || 0,
    totalExpense: Number(data.total_expense) || 0,
    totalSalary: Number(data.total_salary) || 0,
    balance: Number(data.balance) || 0,
  }
}

// --- VIEW: monthly_stats ---

function mapMonthlyStatsFromDb(row: Record<string, unknown>): MonthlyStats {
  return {
    carId: row.car_id as string,
    carName: row.car_name as string,
    colorTag: row.color_tag as string,
    month: row.month as string,
    recordsCount: Number(row.records_count) || 0,
    rentedDays: Number(row.rented_days) || 0,
    idleDays: Number(row.idle_days) || 0,
    totalRental: Number(row.total_rental) || 0,
    totalService: Number(row.total_service) || 0,
    totalOther: Number(row.total_other) || 0,
    totalExpense: Number(row.total_expense) || 0,
    totalProfit: Number(row.total_profit) || 0,
    occupancyPercent: Number(row.occupancy_percent) || 0,
  }
}

// Получить статистику за месяц
export async function getMonthlyStats(year: number, month: number): Promise<MonthlyStats[]> {
  // Используем диапазон дат вместо точного сравнения для совместимости с PostgreSQL
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  
  const { data, error } = await getClient()
    .from('monthly_stats')
    .select('*')
    .gte('month', monthStart)
    .lt('month', nextMonthStart)

  if (error) throw new Error(error.message)
  return (data || []).map(mapMonthlyStatsFromDb)
}

// Получить статистику по конкретной машине за все месяцы
export async function getCarMonthlyStats(carId: string): Promise<MonthlyStats[]> {
  const { data, error } = await getClient()
    .from('monthly_stats')
    .select('*')
    .eq('car_id', carId)
    .order('month', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(mapMonthlyStatsFromDb)
}

// Получить статистику за год (все машины)
export async function getYearlyStats(year: number): Promise<MonthlyStats[]> {
  // Используем строковый формат даты для совместимости с PostgreSQL
  const yearStart = `${year}-01-01`
  const yearEnd = `${year + 1}-01-01`

  const { data, error } = await getClient()
    .from('monthly_stats')
    .select('*')
    .gte('month', yearStart)
    .lt('month', yearEnd)
    .order('month', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []).map(mapMonthlyStatsFromDb)
}

// Получить агрегированную статистику за месяц (итого)
export async function getMonthSummary(year: number, month: number): Promise<{
  totalRental: number
  totalExpense: number
  totalProfit: number
  rentedDays: number
  idleDays: number
  avgOccupancy: number
}> {
  const stats = await getMonthlyStats(year, month)
  
  return {
    totalRental: stats.reduce((sum, s) => sum + s.totalRental, 0),
    totalExpense: stats.reduce((sum, s) => sum + s.totalExpense, 0),
    totalProfit: stats.reduce((sum, s) => sum + s.totalProfit, 0),
    rentedDays: stats.reduce((sum, s) => sum + s.rentedDays, 0),
    idleDays: stats.reduce((sum, s) => sum + s.idleDays, 0),
    avgOccupancy: stats.length > 0 
      ? Math.round(stats.reduce((sum, s) => sum + s.occupancyPercent, 0) / stats.length)
      : 0,
  }
}

// --- ANALYTICS: Сравнение машин за всё время ---

// Получить агрегированную статистику по всем машинам за всё время
// Дни аренды считаем из car_records (start_date - end_date), 
// доход/прибыль из monthly_stats (там правильная логика с buyout)
export async function getAllTimeCarStats(): Promise<CarAnalyticsSummary[]> {
  // Получаем данные из monthly_stats (доход, расход, прибыль)
  const { data: stats, error } = await getClient()
    .from('monthly_stats')
    .select('*')
    .order('month', { ascending: false })

  if (error) throw new Error(error.message)

  // Получаем данные о машинах
  const { data: cars, error: carsError } = await getClient()
    .from('cars')
    .select('id, name, license_plate, purchase_price, preparation_cost, color_tag, purchase_date, status')

  if (carsError) throw new Error(carsError.message)

  // Получаем записи для подсчёта реальных дней
  const { data: records, error: recordsError } = await getClient()
    .from('car_records')
    .select('car_id, rental_amount, start_date, end_date, record_type, record_date')

  if (recordsError) throw new Error(recordsError.message)

  // Получаем выплаты партнёрам (только с car_id)
  const { data: salaries, error: salariesError } = await getClient()
    .from('salary_withdrawals')
    .select('car_id, amount')

  if (salariesError) throw new Error(salariesError.message)

  // Группируем выплаты по carId
  const carSalaryMap = new Map<string, number>()
  for (const s of salaries || []) {
    if (s.car_id) {
      const existing = carSalaryMap.get(s.car_id) || 0
      carSalaryMap.set(s.car_id, existing + (Number(s.amount) || 0))
    }
  }

  // Группируем финансовую статистику по carId
  const carStatsMap = new Map<string, {
    totalRental: number
    totalExpense: number
    totalProfit: number
  }>()

  for (const row of stats || []) {
    const carId = row.car_id as string
    const existing = carStatsMap.get(carId) || { totalRental: 0, totalExpense: 0, totalProfit: 0 }
    carStatsMap.set(carId, {
      totalRental: existing.totalRental + (Number(row.total_rental) || 0),
      totalExpense: existing.totalExpense + (Number(row.total_expense) || 0),
      totalProfit: existing.totalProfit + (Number(row.total_profit) || 0),
    })
  }

  // Считаем реальные дни из car_records
  const carDaysMap = new Map<string, { rentedDays: number; idleDays: number }>()

  for (const record of records || []) {
    const carId = record.car_id as string
    const recordType = record.record_type as string
    const rentalAmount = Number(record.rental_amount) || 0
    const startDate = record.start_date as string | null
    const endDate = record.end_date as string | null

    if (recordType === 'buyout') continue

    const existing = carDaysMap.get(carId) || { rentedDays: 0, idleDays: 0 }

    // Считаем дни только если есть start и end даты
    let days = 0
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    }

    if (recordType === 'normal' || recordType === 'booking') {
      if (days > 0) {
        if (rentalAmount > 0) {
          carDaysMap.set(carId, { rentedDays: existing.rentedDays + days, idleDays: existing.idleDays })
        } else {
          carDaysMap.set(carId, { rentedDays: existing.rentedDays, idleDays: existing.idleDays + days })
        }
      }
      // Если days = 0 (нет дат) - пропускаем эту запись
    }
  }

  // Формируем итоговый массив
  const result: CarAnalyticsSummary[] = []

  for (const car of cars || []) {
    const carId = car.id
    const statsData = carStatsMap.get(carId) || { totalRental: 0, totalExpense: 0, totalProfit: 0 }
    const daysData = carDaysMap.get(carId) || { rentedDays: 0, idleDays: 0 }

    const purchasePrice = Number(car.purchase_price) || 0
    const preparationCost = Number(car.preparation_cost) || 0
    const totalInvestment = purchasePrice + preparationCost

    const purchaseDate = car.purchase_date
      ? new Date(car.purchase_date as string)
      : (() => {
          const carRecords = (records || []).filter(r => r.car_id === carId)
          const recordDates = carRecords
            .map(r => new Date(r.record_date as string).getTime())
            .filter(Boolean)
          return recordDates.length > 0 ? new Date(Math.min(...recordDates)) : new Date()
        })()

    const calendarDays = Math.max(1, Math.ceil(
      (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1)

    const yearsOwned = Math.max(0.1, calendarDays / 365)
    const totalSalary = carSalaryMap.get(carId) || 0
    const operationalProfit = statsData.totalProfit
    const netProfit = operationalProfit - totalSalary

    result.push({
      carId,
      carName: car.name,
      colorTag: car.color_tag || '#888',
      licensePlate: car.license_plate || '',
      purchasePrice,
      preparationCost,
      totalInvestment,
      totalRental: statsData.totalRental,
      totalExpense: statsData.totalExpense,
      totalProfit: operationalProfit,
      totalSalary,
      netProfit,
      rentedDays: daysData.rentedDays,
      idleDays: daysData.idleDays,
      occupancyPercent: Math.round((daysData.rentedDays / calendarDays) * 100),
      avgDailyIncome: daysData.rentedDays > 0 ? Math.round(statsData.totalRental / daysData.rentedDays) : 0,
      roi: totalInvestment > 0 ? Math.round((netProfit / totalInvestment / yearsOwned) * 100) : 0,
      purchaseDate: car.purchase_date as string | null,
      carStatus: car.status as string,
    })
  }

  return result.sort((a, b) => b.netProfit - a.netProfit)
}

// Получить статистику по машинам за произвольный период
// Дни аренды считаем из car_records, доход/прибыль из monthly_stats
export async function getCarStatsByPeriod(
  startDate: string,
  endDate: string
): Promise<CarAnalyticsSummary[]> {
  if (!startDate || !endDate) {
    return []
  }

  // Парсим даты
  const [startYear, startMonth] = startDate.split('-').map(Number)
  const [endYear, endMonth] = endDate.split('-').map(Number)

  // Проверяем хронологический порядок
  const startDateObj = new Date(startYear, startMonth - 1, 1)
  const endDateObj = new Date(endYear, endMonth - 1, 1)
  
  let rangeStartYear = startYear
  let rangeStartMonth = startMonth
  let rangeEndYear = endYear
  let rangeEndMonth = endMonth
  
  if (startDateObj > endDateObj) {
    rangeStartYear = endYear
    rangeStartMonth = endMonth
    rangeEndYear = startYear
    rangeEndMonth = startMonth
  }

  // Диапазон для monthly_stats
  const rangeStart = `${rangeStartYear}-${String(rangeStartMonth).padStart(2, '0')}-01`
  const nextEndMonth = rangeEndMonth === 12 ? 1 : rangeEndMonth + 1
  const nextEndYear = rangeEndMonth === 12 ? rangeEndYear + 1 : rangeEndYear
  const rangeEnd = `${nextEndYear}-${String(nextEndMonth).padStart(2, '0')}-01`

  // Получаем данные из monthly_stats
  const { data: stats, error } = await getClient()
    .from('monthly_stats')
    .select('*')
    .gte('month', rangeStart)
    .lt('month', rangeEnd)

  if (error) throw new Error(error.message)

  // Получаем данные о машинах
  const { data: cars, error: carsError } = await getClient()
    .from('cars')
    .select('id, name, license_plate, purchase_price, preparation_cost, color_tag, purchase_date, status')

  if (carsError) throw new Error(carsError.message)

  // Получаем записи car_records для подсчёта дней
  const { data: records, error: recordsError } = await getClient()
    .from('car_records')
    .select('car_id, rental_amount, start_date, end_date, record_type, record_date')

  if (recordsError) throw new Error(recordsError.message)
  // Получаем выплаты партнёрам за период (только с car_id)
  const { data: salaries, error: salariesError } = await getClient()
    .from('salary_withdrawals')
    .select('car_id, amount, withdrawal_date')
    .gte('withdrawal_date', rangeStart)
    .lt('withdrawal_date', rangeEnd)
  if (salariesError) throw new Error(salariesError.message)

  // Группируем выплаты по carId
  const carSalaryMap = new Map<string, number>()
  for (const s of salaries || []) {
    if (s.car_id) {
      const existing = carSalaryMap.get(s.car_id) || 0
      carSalaryMap.set(s.car_id, existing + (Number(s.amount) || 0))
    }
  }

  // Финансовая статистика из monthly_stats
  const carStatsMap = new Map<string, { totalRental: number; totalExpense: number; totalProfit: number }>()

  for (const row of stats || []) {
    const carId = row.car_id as string
    const existing = carStatsMap.get(carId) || { totalRental: 0, totalExpense: 0, totalProfit: 0 }
    carStatsMap.set(carId, {
      totalRental: existing.totalRental + (Number(row.total_rental) || 0),
      totalExpense: existing.totalExpense + (Number(row.total_expense) || 0),
      totalProfit: existing.totalProfit + (Number(row.total_profit) || 0),
    })
  }

  // Считаем дни из car_records (только записи в диапазоне)
  const periodStart = new Date(rangeStartYear, rangeStartMonth - 1, 1)
  const periodEnd = new Date(nextEndYear, nextEndMonth - 1, 1)
  
  const carDaysMap = new Map<string, { rentedDays: number; idleDays: number }>()

  for (const record of records || []) {
    const carId = record.car_id as string
    const recordType = record.record_type as string
    const rentalAmount = Number(record.rental_amount) || 0
    const startDateVal = record.start_date as string | null
    const endDateVal = record.end_date as string | null
    const recordDate = new Date(record.record_date as string)

    if (recordType === 'buyout') continue

    // Проверяем что запись в диапазоне
    if (recordDate < periodStart || recordDate >= periodEnd) continue

    const existing = carDaysMap.get(carId) || { rentedDays: 0, idleDays: 0 }

    let days = 0
    if (startDateVal && endDateVal) {
      const start = new Date(startDateVal)
      const end = new Date(endDateVal)
      days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    }

    if ((recordType === 'normal' || recordType === 'booking') && days > 0) {
      if (rentalAmount > 0) {
        carDaysMap.set(carId, { rentedDays: existing.rentedDays + days, idleDays: existing.idleDays })
      } else {
        carDaysMap.set(carId, { rentedDays: existing.rentedDays, idleDays: existing.idleDays + days })
      }
    }
  }

  // Формируем результат
  const result: CarAnalyticsSummary[] = []

  for (const car of cars || []) {
    const carId = car.id
    const statsData = carStatsMap.get(carId) || { totalRental: 0, totalExpense: 0, totalProfit: 0 }
    const daysData = carDaysMap.get(carId) || { rentedDays: 0, idleDays: 0 }

    const purchasePrice = Number(car.purchase_price) || 0
    const preparationCost = Number(car.preparation_cost) || 0
    const totalInvestment = purchasePrice + preparationCost

    const calendarDays = Math.max(1, Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    ))
    const totalSalary = carSalaryMap.get(carId) || 0
    const operationalProfit = statsData.totalProfit
    const netProfit = operationalProfit - totalSalary

    result.push({
      carId,
      carName: car.name,
      colorTag: car.color_tag || '#888',
      licensePlate: car.license_plate || '',
      purchasePrice,
      preparationCost,
      totalInvestment,
      totalRental: statsData.totalRental,
      totalExpense: statsData.totalExpense,
      totalProfit: operationalProfit,
      totalSalary,
      netProfit,
      rentedDays: daysData.rentedDays,
      idleDays: daysData.idleDays,
      occupancyPercent: Math.round((daysData.rentedDays / calendarDays) * 100),
      avgDailyIncome: daysData.rentedDays > 0 ? Math.round(statsData.totalRental / daysData.rentedDays) : 0,
      roi: totalInvestment > 0 ? Math.round((netProfit / totalInvestment) * 100) : 0,
      purchaseDate: car.purchase_date as string | null,
      carStatus: car.status as string,
    })
  }

  return result.sort((a, b) => b.netProfit - a.netProfit)
}

// --- SALARY WITHDRAWALS ---

function mapSalaryFromDb(row: Record<string, unknown>): SalaryWithdrawal {
  // Получаем данные о машине из связанной таблицы
  const carsData = row.cars as Record<string, unknown> | null
  const carName = carsData && typeof carsData === 'object' && 'name' in carsData 
    ? (carsData as { name: string }).name 
    : undefined
  
  return {
    id: row.id as string,
    amount: Number(row.amount) || 0,
    withdrawalDate: row.withdrawal_date as string,
    recipientName: row.recipient_name as string | null,
    notes: row.notes as string | null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    // Новые поля для выплат по месяцам
    month: row.month as string | null,
    percent: Number(row.percent) || 50,
    grossIncome: Number(row.gross_income) || 0,
    netProfit: Number(row.net_profit) || 0,
    // Привязка к машине
    carId: row.car_id as string | null,
    carName,
  }
}

// Получить выводы зарплаты
export async function getSalaryWithdrawals(limit?: number): Promise<SalaryWithdrawal[]> {
  let query = getClient()
    .from('salary_withdrawals')
    .select('*')
    .order('withdrawal_date', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data || []).map(mapSalaryFromDb)
}

// Создать вывод зарплаты
export async function createSalaryWithdrawal(
  data: SalaryFormData,
  userId?: string,
  carName?: string
): Promise<SalaryWithdrawal> {
  const dbData = {
    amount: data.amount,
    withdrawal_date: data.withdrawalDate,
    recipient_name: data.recipientName || null,
    notes: data.notes || null,
    created_by: userId || null,
    // Новые поля для выплат по месяцам
    month: data.month || null,
    percent: data.percent || 50,
    gross_income: data.grossIncome || 0,
    net_profit: data.netProfit || 0,
    // Привязка к машине
    car_id: data.carId || null,
    car_name: carName || null,
  }

  const { data: result, error } = await getClient()
    .from('salary_withdrawals')
    .insert(dbData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapSalaryFromDb(result)
}

// Удалить вывод зарплаты
export async function deleteSalaryWithdrawal(id: string): Promise<void> {
  const { error } = await getClient()
    .from('salary_withdrawals')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// --- РАСЧЁТ ПРИБЫЛИ ЗА МЕСЯЦ ---

// Получить прибыль за месяц по всем машинам (или по конкретной машине)
// carId - необязательный параметр для фильтрации по машине
// Логика совпадает с VIEW monthly_stats:
// - buyout записи → полностью исключены
// - buyout_payment → в доход идёт только профит (доля прибыли)
// - service_cost — ВСЕГДА учитывается
// - other_cost — НЕ учитывается если категория = "Страховка" или "Шины"
export async function getMonthlyProfit(
  year: number,
  month: number,
  carId?: string | null
): Promise<MonthlyProfitData> {
  // Диапазон дат месяца
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  
  // Строим запрос - получаем все записи за месяц с категориями (исключаем только buyout)
  let query = getClient()
    .from('car_records')
    .select(`
      rental_amount,
      service_cost,
      other_cost,
      record_type,
      buyout_data,
      expense_category_id,
      notes,
      expense_categories(name)
    `)
    .gte('record_date', monthStart)
    .lt('record_date', nextMonthStart)
    .neq('record_type', 'buyout')
  
  // Если передан carId - фильтруем по машине
  if (carId) {
    query = query.eq('car_id', carId)
  }

  const { data: records, error } = await query

  if (error) throw new Error(error.message)

  // Считаем доходы и расходы (логика как в VIEW monthly_stats)
  let grossIncome = 0
  let totalExpense = 0

  for (const record of records || []) {
    const recordType = record.record_type as string
    const rentalAmount = Number(record.rental_amount) || 0
    
    if (recordType === 'buyout_payment') {
      const buyoutData = record.buyout_data as Record<string, unknown> | null
      const profitPercent = Number(buyoutData?.profitPercent) || 0
      grossIncome += calcBuyoutProfitShare(rentalAmount, profitPercent)
    } else {
      // Обычные записи — полный доход
      grossIncome += rentalAmount
    }
    
    // service_cost учитывается ВСЕГДА (как в VIEW)
    totalExpense += Number(record.service_cost) || 0
    
    // other_cost НЕ учитывается для категорий "Страховка" и "Шины"
    // а также для записей с notes "Первичная подготовка%" (первичные расходы на авто)
    const categoryData = record.expense_categories as unknown
    const categoryName = categoryData && typeof categoryData === 'object' && 'name' in categoryData
      ? (categoryData as { name: string }).name
      : null
    const notes = (record.notes as string) || ''
    const isPrepCategory = categoryName === 'Страховка' || categoryName === 'Шины'
    const isPrimaryPrep = notes.startsWith('Первичная подготовка')
    
    if (!isPrepCategory && !isPrimaryPrep) {
      totalExpense += Number(record.other_cost) || 0
    }
  }

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    grossIncome,
    totalExpense,
    netProfit: grossIncome - totalExpense,
  }
}
