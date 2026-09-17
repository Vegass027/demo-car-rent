// ============================================================
// API: COMPANY SETTINGS
// Настройки компании для генерации договоров
// ============================================================

import { getClient } from '@/lib/api-client'
import type { CompanySettings, CompanySettingsFormData } from '@/types'

// Константный ID для единственной записи настроек
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

// Маппинг: snake_case (БД) → camelCase (TS)
function mapSettingsFromDb(data: Record<string, unknown>): CompanySettings {
  return {
    id: data.id as string,
    companyName: data.company_name as string,
    legalAddress: data.legal_address as string | null,
    postalAddress: data.postal_address as string | null,
    inn: data.inn as string | null,
    kpp: data.kpp as string | null,
    bankName: data.bank_name as string | null,
    checkingAccount: data.checking_account as string | null,
    correspondentAccount: data.correspondent_account as string | null,
    bik: data.bik as string | null,
    representativeName: data.representative_name as string | null,
    representativePosition: data.representative_position as string | null,
    representativeBasis: data.representative_basis as string | null,
    ownerFullName: data.owner_full_name as string | null,
    ownerBirthDate: data.owner_birth_date as string | null,
    ownerPassportSeries: data.owner_passport_series as string | null,
    ownerPassportNumber: data.owner_passport_number as string | null,
    ownerPassportIssuedBy: data.owner_passport_issued_by as string | null,
    ownerPassportIssueDate: data.owner_passport_issue_date as string | null,
    ownerRegistrationAddress: data.owner_registration_address as string | null,
    ownerPostalAddress: data.owner_postal_address as string | null,
    ownerPhone: data.owner_phone as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

// Маппинг: camelCase (TS) → snake_case (БД)
function mapSettingsToDb(data: Partial<CompanySettingsFormData>): Record<string, unknown> {
  return {
    company_name: data.companyName,
    legal_address: data.legalAddress,
    postal_address: data.postalAddress,
    inn: data.inn,
    kpp: data.kpp,
    bank_name: data.bankName,
    checking_account: data.checkingAccount,
    correspondent_account: data.correspondentAccount,
    bik: data.bik,
    representative_name: data.representativeName,
    representative_position: data.representativePosition,
    representative_basis: data.representativeBasis,
    owner_full_name: data.ownerFullName,
    owner_birth_date: data.ownerBirthDate,
    owner_passport_series: data.ownerPassportSeries,
    owner_passport_number: data.ownerPassportNumber,
    owner_passport_issued_by: data.ownerPassportIssuedBy,
    owner_passport_issue_date: data.ownerPassportIssueDate,
    owner_registration_address: data.ownerRegistrationAddress,
    owner_postal_address: data.ownerPostalAddress,
    owner_phone: data.ownerPhone,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Получить настройки компании
 */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await getClient()
    .from('company_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .maybeSingle()

  if (error) throw new Error(error.message)

  // Записи нет — создаём
  if (!data) {
    const { data: newData, error: createError } = await getClient()
      .from('company_settings')
      .insert({ id: SETTINGS_ID })
      .select()
      .maybeSingle()

    if (createError) throw new Error(createError.message)
    if (!newData) throw new Error('Failed to create settings')
    return mapSettingsFromDb(newData)
  }

  return mapSettingsFromDb(data)
}

/**
 * Обновить настройки компании
 */
export async function updateCompanySettings(data: CompanySettingsFormData): Promise<CompanySettings> {
  const dbData = mapSettingsToDb(data)
  
  const { data: result, error } = await getClient()
    .from('company_settings')
    .update(dbData)
    .eq('id', SETTINGS_ID)
    .select()
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!result) throw new Error('Settings not found')
  return mapSettingsFromDb(result)
}
