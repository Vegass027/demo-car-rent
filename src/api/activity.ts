// ============================================================
// API: ЛЕНТА СОБЫТИЙ (ЖУРНАЛ)
// Получение событий активности за период
// ============================================================

import { getClient } from '@/lib/api-client'
import { calcBuyoutProfitShare } from '@/utils/calc'
import { PREPARATION_CATEGORY_NAMES, PREPARATION_NOTES } from '@/constants'
import type { ActivityEvent, ActivityEventType, ActivityDayGroup, ActivityPeriodSummary } from '@/types'

// Кэш ID категорий подготовки
let preparationCategoryIds: string[] | null = null

// Получить ID категорий подготовки (страховка и шины)
async function getPreparationCategoryIds(): Promise<string[]> {
  if (preparationCategoryIds) return preparationCategoryIds
  
  const { data, error } = await getClient()
    .from('expense_categories')
    .select('id')
    .in('name', PREPARATION_CATEGORY_NAMES)
  
  if (error) {
    console.error('Ошибка получения категорий подготовки:', error)
    return []
  }
  
  preparationCategoryIds = (data || []).map(c => c.id)
  return preparationCategoryIds
}

// Маппинг записи из БД в ActivityEvent
async function mapRecordToActivityEvent(row: Record<string, unknown>): Promise<ActivityEvent | null> {
  const recordType = row.record_type as string | null
  
  // Пропускаем записи договоров выкупа — они не являются событиями для отображения
  if (recordType === 'buyout') {
    return null
  }
  
  let rentalAmount = Number(row.rental_amount) || 0
  const serviceCost = Number(row.service_cost) || 0
  const otherCost = Number(row.other_cost) || 0
  const deposit = Number(row.deposit) || 0
  const startDate = row.start_date as string | null
  const endDate = row.end_date as string | null
  const notes = row.notes as string | null
  
  // Для платежей выкупа в доход идёт только доля прибыли (30%)
  if (recordType === 'buyout_payment') {
    const buyoutData = row.buyout_data as Record<string, unknown> | null
    const profitPercent = Number(buyoutData?.profitPercent) || 0
    rentalAmount = calcBuyoutProfitShare(rentalAmount, profitPercent)
  }
  
  const car = row.cars as Record<string, unknown> | null
  const category = row.expense_categories as Record<string, unknown> | null
  
  // Проверяем запись первичной подготовки:
  // - "Первичная подготовка к запуску авто" (чистая) — скрыть (инвестиция)
  // - "Первичная подготовка к запуску авто Покупка фары" (с комментарием) — показать (операционный расход)
  // - Категория "Прочее" — всегда скрывать (это часть первичной подготовки)
  const isPurePreparation = notes === PREPARATION_NOTES
  const isCategoryProchee = category?.name === 'Прочее'
  
  // Проверяем категорию подготовки (Страховка, Шины)
  const categoryId = row.expense_category_id as string | null
  const prepCategoryIds = await getPreparationCategoryIds()
  const isPreparationCategory = categoryId ? prepCategoryIds.includes(categoryId) : false
  
  // Скрываем записи чистой первичной подготовки (без комментария) или категории "Прочее"
  if (isPurePreparation || isCategoryProchee) {
    return null
  }
  
  // Базовые поля
  const baseEvent = {
    id: row.id as string,
    timestamp: row.created_at as string,
    recordDate: row.record_date as string,
    carId: row.car_id as string,
    carName: car?.name as string || 'Неизвестно',
    carColorTag: car?.color_tag as string || '#6B7280',
    licensePlate: car?.license_plate as string || '',
    clientName: row.renter_name as string | undefined,
    clientPhone: row.renter_phone as string | undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    // Если есть комментарий после "Первичная подготовка..." — показываем его
    notes: (notes && notes !== PREPARATION_NOTES)
      ? notes.replace(PREPARATION_NOTES, '').trim()
      : (row.notes as string | undefined),
    recordId: row.id as string,
    expenseCategoryName: category?.name as string | undefined,
    expenseCategoryColor: category?.color as string | undefined,
    isPreparationCategory,
  }
  
  // Определяем тип события
  // Приоритет: аренда > расход > депозит
  
  // Если есть диапазон дат — это бронирование
  if (startDate && endDate) {
    const start = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')
    const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return {
      ...baseEvent,
      type: 'booking' as ActivityEventType,
      rentalAmount: rentalAmount,
      daysCount,
    }
  }
  
  // Если есть аренда — это аренда
  if (rentalAmount > 0) {
    return {
      ...baseEvent,
      type: recordType === 'buyout_payment' ? 'buyout_payment' : 'rental',
      rentalAmount: rentalAmount,
    }
  }
  
  // Если есть расход — это расход
  if (serviceCost > 0 || otherCost > 0) {
    return {
      ...baseEvent,
      type: 'expense' as ActivityEventType,
      expenseAmount: serviceCost + otherCost,
    }
  }
  
  // Если есть только депозит
  if (deposit > 0) {
    return {
      ...baseEvent,
      type: 'deposit_taken' as ActivityEventType,
      depositAmount: deposit,
    }
  }
  
  return null
}

// Получить события за период
export async function getActivityByDateRange(
  startDate: string,
  endDate: string
): Promise<ActivityEvent[]> {
  // Сбрасываем кэш категорий при каждом запросе
  preparationCategoryIds = null
  
  const { data, error } = await getClient()
    .from('car_records')
    .select(`
      id,
      car_id,
      record_date,
      start_date,
      end_date,
      rental_amount,
      service_cost,
      other_cost,
      deposit,
      renter_name,
      renter_phone,
      notes,
      created_at,
      expense_category_id,
      record_type,
      buyout_data,
      cars (id, name, license_plate, color_tag),
      expense_categories (id, name, color)
    `)
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  
  // Фильтруем null события и возвращаем
  const events = await Promise.all(
    (data || []).map(mapRecordToActivityEvent)
  )
  return events.filter((event): event is ActivityEvent => event !== null)
}

// Группировка событий по дням
export function groupEventsByDay(events: ActivityEvent[]): ActivityDayGroup[] {
  const groups: Record<string, ActivityEvent[]> = {}
  
  for (const event of events) {
    const date = event.recordDate
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
  }
  
  // Преобразуем в массив и считаем итоги (исключая подготовку)
  return Object.entries(groups)
    .map(([date, dayEvents]) => {
      // Итоги за день БЕЗ страховки и шин
      const totalRental = dayEvents.reduce((sum, e) => sum + (e.rentalAmount || 0), 0)
      const totalExpense = dayEvents
        .filter(e => !e.isPreparationCategory)
        .reduce((sum, e) => sum + (e.expenseAmount || 0), 0)
      
      // Форматируем дату для отображения
      const dateObj = new Date(date + 'T12:00:00')
      const dateLabel = dateObj.toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      
      return {
        date,
        dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
        events: dayEvents.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        totalRental,
        totalExpense,
        totalProfit: totalRental - totalExpense,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date)) // Новые даты сверху
}

// Подсчёт итогов за период (исключая страховку и шины)
export function calculatePeriodSummary(events: ActivityEvent[]): ActivityPeriodSummary {
  let totalRental = 0
  let totalExpense = 0
  let rentalsCount = 0
  let expensesCount = 0  // БЕЗ подготовки
  let bookingsCount = 0
  
  for (const event of events) {
    if (event.rentalAmount) {
      totalRental += event.rentalAmount
    }
    
    // Расходы считаем БЕЗ страховки и шин
    if (event.expenseAmount && !event.isPreparationCategory) {
      totalExpense += event.expenseAmount
    }
    
    switch (event.type) {
      case 'rental':
        rentalsCount++
        break
      case 'expense':
        // Считаем все расходы, но в сумме только не-подготовка
        expensesCount++
        break
      case 'booking':
        bookingsCount++
        break
    }
  }
  
  return {
    totalRental,
    totalExpense,
    totalProfit: totalRental - totalExpense,
    eventsCount: events.length,
    rentalsCount,
    expensesCount,
    bookingsCount,
  }
}

// Получить даты с событиями для календаря (для отображения точек)
export async function getDatesWithEvents(
  year: number,
  month: number
): Promise<Set<string>> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  
  const { data, error } = await getClient()
    .from('car_records')
    .select('record_date')
    .gte('record_date', monthStart)
    .lte('record_date', monthEnd)

  if (error) throw new Error(error.message)
  
  const dates = new Set<string>()
  for (const row of data || []) {
    if (row.record_date) {
      dates.add(row.record_date as string)
    }
  }
  
  return dates
}
