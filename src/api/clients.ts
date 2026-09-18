// ============================================================
// API: КЛИЕНТЫ
// Все запросы к таблице clients
// snake_case из БД → camelCase в приложении
// ============================================================

import { supabase } from '@/lib/api-client'
import type { Client, ClientFormData, ContractClientData, ClientHistoryEntry, ClientSummary, BuyoutData } from '@/types'

// Маппинг полей из snake_case в camelCase
function mapClientFromDb(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    lastName: row.last_name as string,
    firstName: row.first_name as string,
    middleName: row.middle_name as string | null,
    fullName: row.full_name as string,
    phone: row.phone as string | null,
    birthDate: row.birth_date as string | null,
    passportSeries: row.passport_series as string | null,
    passportNumber: row.passport_number as string | null,
    passportIssuedBy: row.passport_issued_by as string | null,
    passportIssueDate: row.passport_issue_date as string | null,
    registrationAddress: row.registration_address as string | null,
    driverLicenseSeries: row.driver_license_series as string | null,
    driverLicenseNumber: row.driver_license_number as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Маппинг в snake_case для БД
function parseDateToIso(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  // DD.MM.YYYY → YYYY-MM-DD
  const parts = dateStr.split('.')
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
  }
  // Уже в ISO или другом формате — возвращаем как есть
  return dateStr
}

function mapClientToDb(client: ClientFormData): Record<string, unknown> {
  return {
    last_name: client.lastName,
    first_name: client.firstName,
    middle_name: client.middleName || null,
    phone: client.phone || null,
    birth_date: parseDateToIso(client.birthDate),
    passport_series: client.passportSeries || null,
    passport_number: client.passportNumber || null,
    passport_issued_by: client.passportIssuedBy || null,
    passport_issue_date: parseDateToIso(client.passportIssueDate),
    registration_address: client.registrationAddress || null,
    driver_license_series: client.driverLicenseSeries || null,
    driver_license_number: client.driverLicenseNumber || null,
    notes: client.notes || null,
  }
}

// ============================================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================================

// Получить клиента по ID
export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data ? mapClientFromDb(data) : null
}

// Создать нового клиента (с проверкой дублей)
export async function createClient(client: ClientFormData): Promise<Client> {
  // Проверяем есть ли уже клиент с таким ФИО или телефоном
  const conditions: string[] = []
  
  if (client.lastName && client.firstName) {
    conditions.push(`and(last_name.ilike.${client.lastName},first_name.ilike.${client.firstName})`)
  }
  if (client.phone) {
    conditions.push(`phone.eq.${client.phone}`)
  }
  
  if (conditions.length > 0) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .or(conditions.join(','))
      .limit(1)
    
    if (existing && existing.length > 0) {
      // Клиент уже существует — возвращаем его
      return getClient(existing[0].id) as Promise<Client>
    }
  }

  // Создаём нового
  const { data, error } = await supabase
    .from('clients')
    .insert(mapClientToDb(client))
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapClientFromDb(data)
}

// Обновить клиента
export async function updateClient(id: string, client: ClientFormData): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(mapClientToDb(client))
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapClientFromDb(data)
}

// Удалить клиента
export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ============================================================
// ПОИСК - ПРОСТО ПО ФИО ИЛИ ТЕЛЕФОНУ
// ============================================================

// Нормализация телефона — возвращает только цифры
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// Поиск клиентов по ФИО или телефону
export async function searchClients(query: string): Promise<Client[]> {
  if (!query || query.length < 2) return []

  // Проверяем — это телефон или ФИО?
  const isPhoneQuery = /\d/.test(query)
  
  if (isPhoneQuery) {
    // Поиск по телефону
    const digits = normalizePhone(query)
    if (digits.length < 4) return []  // Минимум 4 цифры для поиска

    // Генерируем варианты поиска с разными форматами записи в БД
    const searchVariants: string[] = []

    // Если начинается с 8 — ищем разные варианты с +7
    if (digits.startsWith('8')) {
      const without8 = digits.slice(1)  // "8900..." → "900..."
      searchVariants.push(`%${'+7' + without8}%`)        // +7900 (без пробела)
      searchVariants.push(`%${'+7 ' + without8}%`)       // +7 900 (с пробелом)
      searchVariants.push(`%${'+7(' + without8}%`)       // +7(900 (со скобкой)
      searchVariants.push(`%${'+7 (' + without8}%`)      // +7 (900 (с пробелом и скобкой)
      searchVariants.push(`%${'(' + without8}%`)         // (900 (только скобка)
      searchVariants.push(`%${'(' + without8.slice(0, 3) + ')' + without8.slice(3)}%`) // (900)123 (полный формат)
    }
    // Если начинается с 7 — ищем и с 8
    if (digits.startsWith('7')) {
      const without7 = digits.slice(1)
      searchVariants.push(`%${'8' + without7}%`)         // 8900 (без +7)
      searchVariants.push(`%${'+' + digits}%`)           // +7900
      searchVariants.push(`%${'8 ' + without7}%`)        // 8 900 (с пробелом)
    }
    // Всегда ищем по введённым цифрам
    searchVariants.push(`%${digits}%`)

    // Ищем по всем вариантам через OR
    const orConditions = searchVariants.map(v => `phone.ilike.${v}`).join(',')

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(orConditions)
      .order('last_name')
      .limit(20)

    if (error) throw new Error(error.message)
    return (data || []).map(mapClientFromDb)
  }
  
  // Поиск по ФИО — разбиваем на отдельные слова и ищем по каждому
  const queryWords = query.trim().split(/\s+/).filter(word => word.length >= 2)
  
  if (queryWords.length === 0) return []
  
  // Создаем OR-условия для каждого слова
  const orConditions = queryWords.map(word => `full_name.ilike.%${word}%`).join(',')
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .or(orConditions)
    .order('last_name')
    .limit(20)

  if (error) throw new Error(error.message)
  return (data || []).map(mapClientFromDb)
}

// Получить последних клиентов
export async function getRecentClients(limit: number = 10): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data || []).map(mapClientFromDb)
}

// ============================================================
// КОНВЕРТАЦИЯ ДЛЯ ФОРМ
// ============================================================

// Создать ClientFormData из ContractClientData (для сохранения клиента из формы договора)
export function contractDataToClientFormData(contract: ContractClientData): ClientFormData {
  // Парсим ФИО на компоненты
  const nameParts = (contract.fullName || '').trim().split(/\s+/)
  const lastName = nameParts[0] || ''
  const firstName = nameParts[1] || ''
  const middleName = nameParts.slice(2).join(' ') || undefined

  // Валидация: обязательны минимум фамилия и имя
  if (!lastName || !firstName) {
    throw new Error('ФИО должно содержать минимум фамилию и имя')
  }

  return {
    lastName,
    firstName,
    middleName,
    phone: contract.phone || undefined,
    birthDate: contract.birthDate || undefined,
    passportSeries: contract.passportSeries || undefined,
    passportNumber: contract.passportNumber || undefined,
    passportIssuedBy: contract.passportIssuedBy || undefined,
    passportIssueDate: contract.passportIssueDate || undefined,
    registrationAddress: contract.registrationAddress || undefined,
    driverLicenseSeries: contract.driverLicenseSeries || undefined,
    driverLicenseNumber: contract.driverLicenseNumber || undefined,
  }
}

// Форматирование даты из ISO (YYYY-MM-DD) в DD.MM.YYYY
// Используется при загрузке данных клиента из БД
function formatDateFromIso(isoDate: string | null): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  const [year, month, day] = parts
  return `${day}.${month}.${year}`
}

// Создать ContractClientData из Client (для автозаполнения формы договора)
export function clientToContractData(client: Client): ContractClientData {
  return {
    fullName: client.fullName,
    phone: client.phone || '',
    birthDate: formatDateFromIso(client.birthDate),
    passportSeries: client.passportSeries || '',
    passportNumber: client.passportNumber || '',
    passportIssuedBy: client.passportIssuedBy || '',
    passportIssueDate: formatDateFromIso(client.passportIssueDate),
    registrationAddress: client.registrationAddress || '',
    driverLicenseSeries: client.driverLicenseSeries || '',
    driverLicenseNumber: client.driverLicenseNumber || '',
  }
}

// ============================================================
// ИСТОРИЯ АРЕНД КЛИЕНТА
// ============================================================

// Получить историю аренд клиента
export async function getClientHistory(clientId: string): Promise<{
  entries: ClientHistoryEntry[]
  summary: ClientSummary
}> {
  // Запрашиваем все записи клиента с данными машин
  const { data, error } = await supabase
    .from('car_records')
    .select(`
      id,
      record_date,
      start_date,
      end_date,
      rental_amount,
      deposit,
      notes,
      record_type,
      buyout_data,
      car_id,
      cars!inner (
        id,
        name,
        color_tag,
        license_plate
      )
    `)
    .eq('client_id', clientId)
    .gt('rental_amount', 0)
    .order('record_date', { ascending: false })

  if (error) throw new Error(error.message)

  // Маппим результаты
  const entries: ClientHistoryEntry[] = (data || []).map((row) => {
    const car = row.cars as unknown as { 
      name: string
      color_tag: string
      license_plate: string 
    }
    return {
      recordId: row.id,
      recordDate: row.record_date,
      carId: row.car_id,
      carName: car.name,
      carColorTag: car.color_tag,
      licensePlate: car.license_plate,
      startDate: row.start_date,
      endDate: row.end_date,
      rentalAmount: row.rental_amount || 0,
      deposit: row.deposit || 0,
      notes: row.notes,
      recordType: (row.record_type as ClientHistoryEntry['recordType']) || 'booking',
      buyoutData: (row.buyout_data as BuyoutData | null) || null,
    }
  })

  // Вычисляем итоги
  const summary: ClientSummary = {
    totalRentals: entries.length,
    totalAmount: entries.reduce((sum, e) => sum + e.rentalAmount, 0),
    totalDays: entries.reduce((sum, e) => {
      if (e.startDate && e.endDate) {
        const start = new Date(e.startDate)
        const end = new Date(e.endDate)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        return sum + (days > 0 ? days : 0)
      }
      return sum
    }, 0),
    firstRentalDate: entries.length > 0 ? entries[entries.length - 1].recordDate : '',
    lastRentalDate: entries.length > 0 ? entries[0].recordDate : '',
    carsUsed: [...new Set(entries.map(e => e.carName))],
  }

  return { entries, summary }
}
