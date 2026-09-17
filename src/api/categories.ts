// ============================================================
// API: КАТЕГОРИИ РАСХОДОВ
// Справочник категорий для расходов
// ============================================================

import { getClient } from '@/lib/api-client'
import type { ExpenseCategory } from '@/types'

function mapCategoryFromDb(row: Record<string, unknown>): ExpenseCategory {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string | null,
    color: row.color as string,
    isSystem: row.is_system as boolean,
    createdAt: row.created_at as string,
  }
}

// Получить все категории
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await getClient()
    .from('expense_categories')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return (data || []).map(mapCategoryFromDb)
}

// Получить категорию по ID
export async function getExpenseCategoryById(id: string): Promise<ExpenseCategory | null> {
  const { data, error } = await getClient()
    .from('expense_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data ? mapCategoryFromDb(data) : null
}

// Получить категорию по названию
export async function getExpenseCategoryByName(name: string): Promise<ExpenseCategory | null> {
  const { data, error } = await getClient()
    .from('expense_categories')
    .select('*')
    .eq('name', name)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data ? mapCategoryFromDb(data) : null
}
