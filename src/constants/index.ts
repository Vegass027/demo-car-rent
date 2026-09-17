// ============================================================
// КОНСТАНТЫ АВТОПАРК CRM
// Все строки, цвета и конфигурации в одном месте
// ============================================================

import type { CarStatus } from '@/types'

// --- СТАТУСЫ МАШИН ---

export const CAR_STATUS_LABELS: Record<CarStatus, string> = {
  rented: 'Сдана',
  free: 'Свободна',
  service: 'На ТО',
  inactive: 'Неактивна',
  buyout: 'Выкуп',
  bought: 'Выкуплена',
}

export const CAR_STATUS_COLORS: Record<CarStatus, string> = {
  rented: '#22C55E',   // green-500
  free: '#9CA3AF',     // gray-400
  service: '#F97316',  // orange-500
  inactive: '#EF4444', // red-500
  buyout: '#8B5CF6',   // violet-500
  bought: '#06B6D4',   // cyan-500
}

// Полная конфигурация статусов для UI
export const CAR_STATUS_CONFIG: Record<CarStatus, {
  label: string
  color: string
  dotClass: string
  bgClass: string
  textClass: string
  borderClass: string
}> = {
  rented: {
    label: 'Сдана',
    color: '#22C55E',
    dotClass: 'bg-green-500',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-500',
  },
  free: {
    label: 'Свободна',
    color: '#9CA3AF',
    dotClass: 'bg-gray-400',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-400',
  },
  service: {
    label: 'На ТО',
    color: '#F97316',
    dotClass: 'bg-orange-500',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-500',
  },
  inactive: {
    label: 'Неактивна',
    color: '#EF4444',
    dotClass: 'bg-red-500',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-500',
  },
  buyout: {
    label: 'Выкуп',
    color: '#8B5CF6',
    dotClass: 'bg-violet-500',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-500',
  },
  bought: {
    label: 'Выкуплена',
    color: '#06B6D4',
    dotClass: 'bg-cyan-500',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-700',
    borderClass: 'border-cyan-500',
  },
}

// --- МЕСЯЦЫ ---

export const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export const MONTHS_RU_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

// --- ЦВЕТА МЕТОК ---

export const CAR_COLOR_TAGS = [
  { value: '#3B82F6', label: 'Синий', tailwind: 'bg-blue-500' },
  { value: '#22C55E', label: 'Зелёный', tailwind: 'bg-green-500' },
  { value: '#EAB308', label: 'Жёлтый', tailwind: 'bg-yellow-500' },
  { value: '#EF4444', label: 'Красный', tailwind: 'bg-red-500' },
  { value: '#A855F7', label: 'Фиолетовый', tailwind: 'bg-purple-500' },
  { value: '#F97316', label: 'Оранжевый', tailwind: 'bg-orange-500' },
  { value: '#06B6D4', label: 'Бирюзовый', tailwind: 'bg-cyan-500' },
  { value: '#EC4899', label: 'Розовый', tailwind: 'bg-pink-500' },
]

// --- ТИПЫ ДНЕЙ НА ТАЙМЛАЙНЕ ---

export const TIMELINE_DAY_CONFIG = {
  rented: {
    label: 'Сдана',
    bgClass: 'bg-green-200',
    textClass: 'text-green-800',
  },
  idle: {
    label: 'ТО',
    bgClass: 'bg-purple-400',
    textClass: 'text-white',
  },
  expense: {
    label: 'Расход',
    bgClass: 'bg-purple-400',
    textClass: 'text-white',
  },
  empty: {
    label: 'Свободно',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-400',
  },
}

// --- РОЛИ ПОЛЬЗОВАТЕЛЕЙ ---

export const USER_ROLE_LABELS = {
  owner: 'Владелец',
  manager: 'Менеджер',
}

// --- НАВИГАЦИЯ ---

export const NAV_ITEMS = [
  { path: '/', label: 'Пульт', icon: '🏠' },
  { path: '/cars', label: 'Машины', icon: '🚗' },
  { path: '/journal', label: 'Журнал', icon: '📋' },
  { path: '/finance', label: 'Финансы', icon: '💰' },
]

// --- ФОРМАТЫ ---

export const DATE_FORMAT = 'dd.MM.yyyy'
export const DATE_FORMAT_ISO = 'yyyy-MM-dd'
export const CURRENCY = 'RUB'
export const LOCALE = 'ru-RU'

// --- КАТЕГОРИИ РАСХОДОВ НА ПОДГОТОВКУ ---

// Названия категорий, которые влияют на preparation_cost машины
export const PREPARATION_CATEGORY_NAMES = ['Страховка', 'Шины', 'Прочее'] as const

// Заметка для первичных расходов при создании машины
export const PREPARATION_NOTES = 'Первичная подготовка к запуску авто'
