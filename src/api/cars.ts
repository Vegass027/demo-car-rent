// ============================================================
// API: МАШИНЫ
// Все запросы к таблице cars
// snake_case из БД → camelCase в приложении
// ============================================================

import { getClient } from '@/lib/api-client'
import { formatDateISO, getTodayISO } from '@/utils/format'
import { calcBuyoutProfitShare } from '@/utils/calc'
import { PREPARATION_CATEGORY_NAMES, PREPARATION_NOTES } from '@/constants'
import { getExpenseCategoryByName } from '@/api/categories'
import type { Car, CarStatus, CarWithStats, CarFormData, CarPreparationDetail } from '@/types'

// Маппинг полей из snake_case в camelCase
function mapCarFromDb(row: Record<string, unknown>): Car {
  return {
    id: row.id as string,
    name: row.name as string,
    licensePlate: row.license_plate as string,
    brand: row.brand as string | null,
    model: row.model as string | null,
    year: row.year as number | null,
    vin: row.vin as string | null,
    color: row.color as string | null,
    purchaseDate: row.purchase_date as string | null,
    purchasePrice: Number(row.purchase_price) || 0,
    preparationCost: Number(row.preparation_cost) || 0,
    dailyPrice: Number(row.daily_price) || 0,
    status: row.status as CarStatus,
    colorTag: row.color_tag as string,
    photoUrl: row.photo_url as string | null,
    notes: row.notes as string | null,
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Маппинг в snake_case для БД
function mapCarToDb(car: Partial<Car>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  
  if (car.name !== undefined) mapped.name = car.name
  if (car.licensePlate !== undefined) mapped.license_plate = car.licensePlate
  if (car.brand !== undefined) mapped.brand = car.brand
  if (car.model !== undefined) mapped.model = car.model
  if (car.year !== undefined) mapped.year = car.year
  if (car.vin !== undefined) mapped.vin = car.vin
  if (car.color !== undefined) mapped.color = car.color
  if (car.purchaseDate !== undefined) mapped.purchase_date = car.purchaseDate
  if (car.purchasePrice !== undefined) mapped.purchase_price = car.purchasePrice
  if (car.preparationCost !== undefined) mapped.preparation_cost = car.preparationCost
  if (car.dailyPrice !== undefined) mapped.daily_price = car.dailyPrice
  if (car.status !== undefined) mapped.status = car.status
  if (car.colorTag !== undefined) mapped.color_tag = car.colorTag
  if (car.photoUrl !== undefined) mapped.photo_url = car.photoUrl
  if (car.notes !== undefined) mapped.notes = car.notes
  if (car.isActive !== undefined) mapped.is_active = car.isActive
  if (car.sortOrder !== undefined) mapped.sort_order = car.sortOrder
  
  return mapped
}

// Получить все активные машины
export async function getCars(): Promise<Car[]> {
  const { data, error } = await getClient()
    .from('cars')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  if (error) throw new Error(error.message)
  return (data || []).map(mapCarFromDb)
}

// Получить машину по ID
export async function getCarById(id: string): Promise<Car | null> {
  const { data, error } = await getClient()
    .from('cars')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // не найдено
    throw new Error(error.message)
  }
  return data ? mapCarFromDb(data) : null
}

// Получить машины со статистикой за месяц
export async function getCarsWithStats(year: number, month: number): Promise<CarWithStats[]> {
  // Формируем даты начала и конца месяца без UTC-сдвига
  const monthStart = formatDateISO(year, month, 1)
  const monthEnd = formatDateISO(year, month, new Date(year, month, 0).getDate())

  const db = getClient()

  // Получаем машины
  const { data: cars, error: carsError } = await db
    .from('cars')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  if (carsError) throw new Error(carsError.message)

  // Получаем ID категорий подготовки (Страховка и Шины) для исключения из статистики
  const { data: prepCategories } = await db
    .from('expense_categories')
    .select('id')
    .in('name', PREPARATION_CATEGORY_NAMES)
  
  const prepCategoryIds = (prepCategories || []).map(c => c.id)

  // Получаем записи за месяц с категориями (для месячной статистики)
  // Исключаем Страховку и Шины из расходов — они идут в preparation_cost
  // buyout (договор выкупа) — исключаем, это не платёж
  // buyout_payment — включаем, но в доход идёт только доля прибыли (30%)
  const { data: monthRecords, error: recordsError } = await db
    .from('car_records')
    .select('car_id, rental_amount, service_cost, other_cost, expense_category_id, record_type, buyout_data')
    .gte('record_date', monthStart)
    .lte('record_date', monthEnd)
    .neq('record_type', 'buyout')

  if (recordsError) throw new Error(recordsError.message)

  // Получаем ВСЕ записи (для расчёта окупаемости)
  // buyout_payment → в доход идёт только профит (доля прибыли)
  // buyout → полностью исключаем из дохода
  // Операционные расходы (service_cost, other_cost) учитываем, кроме подготовки (страховка, шины)
  const { data: allRecords, error: allRecordsError } = await db
    .from('car_records')
    .select('car_id, rental_amount, service_cost, other_cost, record_type, buyout_data, expense_category_id')
    .neq('record_type', 'buyout')

  if (allRecordsError) throw new Error(allRecordsError.message)

  // Получаем ближайшие ТО
  const today = getTodayISO()
  const { data: services, error: servicesError } = await db
    .from('service_events')
    .select('car_id, planned_date')
    .eq('status', 'planned')
    .gte('planned_date', today)
    .order('planned_date')

  if (servicesError) throw new Error(servicesError.message)

  // Агрегируем данные за месяц
  const monthStatsByCar: Record<string, { rental: number; expense: number; recoup: number }> = {}
  
  // Агрегируем ВСЕ данные (для окупаемости)
  const totalStatsByCar: Record<string, { income: number; expense: number }> = {}
  
  const nextServiceByCar: Record<string, string | null> = {}

  for (const record of monthRecords || []) {
    const carId = record.car_id as string
    if (!monthStatsByCar[carId]) {
      monthStatsByCar[carId] = { rental: 0, expense: 0, recoup: 0 }
    }
    
    const recordType = record.record_type as string
    const rentalAmount = Number(record.rental_amount) || 0
    
    // Для платежей выкупа в доход идёт только доля прибыли (30%)
    if (recordType === 'buyout_payment') {
      const buyoutData = record.buyout_data as Record<string, unknown> | null
      const profitPercent = Number(buyoutData?.profitPercent) || 0
      monthStatsByCar[carId].rental += calcBuyoutProfitShare(rentalAmount, profitPercent)
    } else {
      monthStatsByCar[carId].rental += rentalAmount
    }
    
    // Исключаем Страховку и Шины из месячных расходов — они учитываются в preparation_cost
    const categoryId = record.expense_category_id as string | null
    const isPrepCategory = categoryId && prepCategoryIds.includes(categoryId)
    
    if (!isPrepCategory) {
      monthStatsByCar[carId].expense += (Number(record.service_cost) || 0) + (Number(record.other_cost) || 0)
    }
  }

  // Считаем общие суммы по каждой машине для окупаемости
  // buyout_payment → в income идёт только доля прибыли
  // Остальные записи → полный rental_amount
  // ВАЖНО: расходы на подготовку (notes с PREPARATION_NOTES) НЕ вычитаем из income для ROI
  // потому что preparation_cost уже входит в totalInvestment
  for (const record of allRecords || []) {
    const carId = record.car_id as string
    if (!totalStatsByCar[carId]) {
      totalStatsByCar[carId] = { income: 0, expense: 0 }
    }
    const recordType = record.record_type as string
    const rentalAmount = Number(record.rental_amount) || 0
    
    if (recordType === 'buyout_payment') {
      // Для окупаемости выкупных машин — полный платёж (не 30%)
      totalStatsByCar[carId].income += rentalAmount
    } else {
      totalStatsByCar[carId].income += rentalAmount
    }
    // Накапливаем операционные расходы (исключая подготовку — страховка, шины)
    // Подготовка уже входит в preparation_cost как инвестиция
    const categoryId = record.expense_category_id as string | null
    const isPrepCategory = categoryId && prepCategoryIds.includes(categoryId)
    if (!isPrepCategory) {
      totalStatsByCar[carId].expense += (Number(record.service_cost) || 0) + (Number(record.other_cost) || 0)
    }
  }

  // Берём ближайшее ТО для каждой машины
  for (const service of services || []) {
    const carId = service.car_id as string
    if (!nextServiceByCar[carId]) {
      nextServiceByCar[carId] = service.planned_date as string
    }
  }

  // Вычисляем дни до ТО
  const todayDate = new Date()
  const getDaysToService = (plannedDate: string | null): number | null => {
    if (!plannedDate) return null
    const diff = Math.ceil((new Date(plannedDate).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : null
  }

  // Объединяем данные
  return (cars || []).map(car => {
    const carId = car.id as string
    const monthStats = monthStatsByCar[carId] || { rental: 0, expense: 0 }
    const totalStats = totalStatsByCar[carId] || { income: 0, expense: 0 }
    
    // Расчёт окупаемости
    // Процент = (полученные деньги / общая инвестиция) × 100
    // Не netProfit, потому что расходы на подготовку уже входят в preparation_cost (инвестиция)
    // При изменении подготовки меняется только инвестиция, НЕ сумма уже внесённых денег
    const purchasePrice = Number(car.purchase_price) || 0
    const preparationCost = Number(car.preparation_cost) || 0
    const totalInvestment = purchasePrice + preparationCost
    // roiPercent показывает сколько процентов от инвестиции уже вернулось в виде чистой прибыли
    // Чистая прибыль = доход - операционные расходы (без подготовки)
    const netProfit = totalStats.income - totalStats.expense
    const roiPercent = totalInvestment > 0
      ? Math.max(0, Math.min(100, Math.round((netProfit / totalInvestment) * 100)))
      : 0
    
    return {
      ...mapCarFromDb(car),
      monthRental: monthStats.rental,      // Полная сумма аренды для recoup
      monthExpense: monthStats.expense,
      monthProfit: monthStats.rental - monthStats.expense,  // Для обычной аренды
      daysToService: getDaysToService(nextServiceByCar[carId] || null),
      // Поля для окупаемости
      totalInvestment,
      totalIncome: totalStats.income,
      totalExpense: totalStats.expense,
      netProfit,
      roiPercent,
    }
  })
}

// Нормализация госномера: убрать пробелы, привести к верхнему регистру, конвертировать латиницу в кириллицу
function normalizeLicensePlate(plate: string): string {
  // Таблица замены латинских букв на кириллические (для российских госномеров)
  const latinToCyrillic: Record<string, string> = {
    'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К', 'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х', 'Y': 'У'
  }
  
  let normalized = plate.replace(/\s+/g, '').toUpperCase()
  
  // Заменяем латинские буквы на кириллические
  normalized = normalized.split('').map(char => latinToCyrillic[char] || char).join('')
  
  return normalized
}

// Создать машину
export async function createCar(car: Partial<Car>): Promise<Car> {
  const dbCar = mapCarToDb(car)
  
  // Нормализуем госномер перед сохранением
  if (dbCar.license_plate) {
    dbCar.license_plate = normalizeLicensePlate(dbCar.license_plate as string)
  }
  
  const { data, error } = await getClient()
    .from('cars')
    .insert(dbCar)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapCarFromDb(data)
}

// Обновить машину
export async function updateCar(id: string, updates: Partial<Car>): Promise<Car> {
  const dbUpdates = mapCarToDb(updates)
  
  // Нормализуем госномер перед обновлением
  if (dbUpdates.license_plate) {
    dbUpdates.license_plate = normalizeLicensePlate(dbUpdates.license_plate as string)
  }
  
  const { data, error } = await getClient()
    .from('cars')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapCarFromDb(data)
}

// Обновить статус машины
export async function updateCarStatus(id: string, status: CarStatus): Promise<void> {
  const { error } = await getClient()
    .from('cars')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// Удалить машину (мягкое удаление — статистика и записи сохраняются)
export async function deleteCar(id: string): Promise<void> {
  const car = await getCarById(id)

  const { error } = await getClient()
    .from('cars')
    .update({ is_active: false, status: 'inactive' })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Удаляем фото из Storage — не критично если не получится
  if (car?.photoUrl) {
    deleteCarPhoto(car.photoUrl).catch(() => {})
  }
}

// Добавить к preparation_cost через RPC функцию
export async function addToPreparationCost(carId: string, amount: number): Promise<void> {
  const { error } = await getClient().rpc('add_to_preparation_cost', {
    p_car_id: carId,
    p_amount: amount,
  })

  if (error) throw new Error(error.message)
}

// Получить записи подготовки машины (страховка, шины и прочее)
export async function getCarPreparationRecords(carId: string): Promise<{
  insurance: number
  tires: number
  otherExpenses: Array<{ id: string; comment: string; amount: number }>
}> {
  // Получаем ID категорий
  const insuranceCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[0])
  const tiresCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[1])
  const otherCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[2])

  const { data: records, error } = await getClient()
    .from('car_records')
    .select('id, expense_category_id, other_cost, notes')
    .eq('car_id', carId)
    .like('notes', `${PREPARATION_NOTES}%`)

  if (error) throw new Error(error.message)

  let insurance = 0
  let tires = 0
  const otherExpenses: Array<{ id: string; comment: string; amount: number }> = []

  for (const record of records || []) {
    if (record.expense_category_id === insuranceCategory?.id) {
      insurance += Number(record.other_cost) || 0
    }
    if (record.expense_category_id === tiresCategory?.id) {
      tires += Number(record.other_cost) || 0
    }
    if (record.expense_category_id === otherCategory?.id) {
      // Комментарий хранится в notes после префикса PREPARATION_NOTES
      const comment = record.notes?.replace(PREPARATION_NOTES, '').trim() || ''
      otherExpenses.push({
        id: record.id,
        comment,
        amount: Number(record.other_cost) || 0,
      })
    }
  }

  return { insurance, tires, otherExpenses }
}

// Получить полную детализацию подготовки одной машины (для аккордеона в финансах)
export async function getCarPreparationDetail(carId: string): Promise<CarPreparationDetail> {
  const car = await getCarById(carId)
  if (!car) throw new Error('Машина не найдена')

  const records = await getCarPreparationRecords(carId)

  return {
    carId: car.id,
    carName: car.name,
    colorTag: car.colorTag,
    licensePlate: car.licensePlate,
    preparationCost: car.preparationCost,
    insurance: records.insurance,
    tires: records.tires,
    otherExpenses: records.otherExpenses,
  }
}

// Обновить записи подготовки машины
export async function updateCarPreparationRecords(
  carId: string,
  insurance: number,
  tires: number,
  otherExpenses: Array<{ comment: string; amount: number }> = []
): Promise<void> {
  // Получаем ID категорий
  const insuranceCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[0])
  const tiresCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[1])
  const otherCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[2])

  const today = getTodayISO()

  // Удаляем старые записи подготовки (LIKE — чтобы удалить и «Прочее» с комментариями)
  await getClient()
    .from('car_records')
    .delete()
    .eq('car_id', carId)
    .like('notes', `${PREPARATION_NOTES}%`)

  // Создаём новые записи
  if (insurance > 0 && insuranceCategory) {
    await getClient().from('car_records').insert({
      car_id: carId,
      record_date: today,
      rental_amount: 0,
      service_cost: 0,
      other_cost: insurance,
      expense_category_id: insuranceCategory.id,
      notes: PREPARATION_NOTES,
    })
  }

  if (tires > 0 && tiresCategory) {
    await getClient().from('car_records').insert({
      car_id: carId,
      record_date: today,
      rental_amount: 0,
      service_cost: 0,
      other_cost: tires,
      expense_category_id: tiresCategory.id,
      notes: PREPARATION_NOTES,
    })
  }

  // Создаём записи "Прочее"
  if (otherCategory) {
    for (const expense of otherExpenses) {
      if (expense.amount > 0 && expense.comment.trim()) {
        await getClient().from('car_records').insert({
          car_id: carId,
          record_date: today,
          rental_amount: 0,
          service_cost: 0,
          other_cost: expense.amount,
          expense_category_id: otherCategory.id,
          notes: `${PREPARATION_NOTES} ${expense.comment}`,
        })
      }
    }
  }

  // Обновляем preparation_cost в таблице cars
  const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0)
  const newPreparationCost = insurance + tires + otherTotal
  await getClient()
    .from('cars')
    .update({ preparation_cost: newPreparationCost })
    .eq('id', carId)
}

// Создать машину с первичными расходами на подготовку
export async function createCarWithPreparation(data: CarFormData): Promise<Car> {
  // Вычисляем общую сумму подготовки
  const otherTotal = data.otherExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0
  const preparationCost = (data.insurance || 0) + (data.tires || 0) + otherTotal
  
  // Создаём машину
  const dbCar = mapCarToDb({
    name: `${data.brand || ''} ${data.model || ''}`.trim(),
    licensePlate: data.licensePlate,
    brand: data.brand,
    model: data.model,
    year: data.year,
    vin: data.vin,
    color: data.color,
    purchasePrice: data.purchasePrice,
    preparationCost,
    colorTag: data.colorTag,
    status: 'free',
    isActive: true,
  })
  
  // Нормализуем госномер
  if (dbCar.license_plate) {
    dbCar.license_plate = normalizeLicensePlate(dbCar.license_plate as string)
  }
  
  const { data: newCar, error: carError } = await getClient()
    .from('cars')
    .insert(dbCar)
    .select()
    .single()

  if (carError) throw new Error(carError.message)
  
  const car = mapCarFromDb(newCar)
  
  // Получаем ID категорий для страховки, шин и прочего
  const insuranceCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[0])
  const tiresCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[1])
  const otherCategory = await getExpenseCategoryByName(PREPARATION_CATEGORY_NAMES[2])
  
  // Создаём записи расходов если суммы > 0
  const today = getTodayISO()
  
  const insuranceAmount = data.insurance ?? 0
  const tiresAmount = data.tires ?? 0

  if (insuranceAmount > 0 && insuranceCategory) {
    await getClient()
      .from('car_records')
      .insert({
        car_id: car.id,
        record_date: today,
        rental_amount: 0,
        service_cost: 0,
        other_cost: insuranceAmount,
        expense_category_id: insuranceCategory.id,
        notes: PREPARATION_NOTES,
      })
  }

  if (tiresAmount > 0 && tiresCategory) {
    await getClient()
      .from('car_records')
      .insert({
        car_id: car.id,
        record_date: today,
        rental_amount: 0,
        service_cost: 0,
        other_cost: tiresAmount,
        expense_category_id: tiresCategory.id,
        notes: PREPARATION_NOTES,
      })
  }

  // Создаём записи "Прочее"
  if (otherCategory && data.otherExpenses) {
    for (const expense of data.otherExpenses) {
      if (expense.amount > 0 && expense.comment.trim()) {
        await getClient().from('car_records').insert({
          car_id: car.id,
          record_date: today,
          rental_amount: 0,
          service_cost: 0,
          other_cost: expense.amount,
          expense_category_id: otherCategory.id,
          notes: `${PREPARATION_NOTES} ${expense.comment}`,
        })
      }
    }
  }
  
  return car
}

// Загрузить фото машины в Storage
export async function uploadCarPhoto(file: File, carId: string): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${carId}/${Date.now()}.${fileExt}`
  
  const { error: uploadError } = await getClient().storage
    .from('cars-photos')
    .upload(fileName, file, {
      upsert: true,
      cacheControl: '3600',
    })
  
  if (uploadError) throw new Error(uploadError.message)
  
  const { data } = getClient().storage
    .from('cars-photos')
    .getPublicUrl(fileName)
  
  return data.publicUrl
}

// Удалить фото из Storage
export async function deleteCarPhoto(photoUrl: string): Promise<void> {
  // Извлекаем путь из URL
  const url = new URL(photoUrl)
  const pathParts = url.pathname.split('/storage/v1/object/public/cars-photos/')
  if (pathParts.length < 2) return
  
  const filePath = pathParts[1]
  
  const { error } = await getClient().storage
    .from('cars-photos')
    .remove([filePath])
  
  if (error) console.error('Ошибка удаления фото:', error.message)
}
