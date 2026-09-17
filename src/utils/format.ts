// Форматирование денег в рублях
export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)

// Форматирование денег для оси Y графиков (полные суммы с₽)
export const formatMoneyAxis = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
    notation: 'standard',
  }).format(amount)
}

// Краткое форматирование денег для тултипов графиков (50т, 100т, 1млн)
export const formatMoneyShort = (amount: number): string => {
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000
    return value % 1 === 0 ? `${value}млн` : `${value.toFixed(1)}млн`
  }
  if (amount >= 1_000) {
    const value = amount / 1_000
    return value % 1 === 0 ? `${value}т` : `${value.toFixed(1)}т`
  }
  return `${amount}`
}

// Форматирование денег для легенды (полная сумма)
export const formatMoneyLegend = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(amount)
}

// Форматирование даты
export const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString('ru-RU')

// Форматирование месяца
export const formatMonth = (month: string): string => {
  const [year, m] = month.split('-')
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ]
  return `${months[parseInt(m, 10) - 1]} ${year}`
}

/**
 * Форматирование даты в ISO-формат (YYYY-MM-DD) без UTC-сдвига
 * Использовать вместо new Date(...).toISOString().split('T')[0]
 *
 * Проблема: new Date(2026, 2, 8) создаёт 8 марта 00:00 по местному времени,
 * но .toISOString() конвертирует в UTC, что даёт 7 марта 21:00 UTC → "2026-03-07"
 */
export const formatDateISO = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/**
 * Получить ISO-дату сегодняшнего дня без UTC-сдвига
 */
export const getTodayISO = (): string => {
  const now = new Date()
  return formatDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/**
 * Конвертация числа в пропись на русском языке
 * Поддерживает числа от 0 до 999 999 999
 */
export const numberToWords = (num: number): string => {
  if (num === 0) return 'ноль'

  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
  const onesFem = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']

  const convertTriple = (n: number, isFemale: boolean): string => {
    let result = ''
    const h = Math.floor(n / 100)
    const t = Math.floor((n % 100) / 10)
    const o = n % 10

    if (h > 0) result += hundreds[h] + ' '
    if (t === 1) {
      result += teens[o] + ' '
    } else {
      if (t > 1) result += tens[t] + ' '
      if (o > 0) {
        result += (isFemale ? onesFem[o] : ones[o]) + ' '
      }
    }
    return result.trim()
  }

  const millions = Math.floor(num / 1000000)
  const thousands = Math.floor((num % 1000000) / 1000)
  const remainder = num % 1000

  let result = ''

  // Миллионы
  if (millions > 0) {
    const m = millions % 10
    const m10 = millions % 100
    result += convertTriple(millions, false) + ' '
    if (m10 >= 11 && m10 <= 14) {
      result += 'миллионов'
    } else if (m === 1) {
      result += 'миллион'
    } else if (m >= 2 && m <= 4) {
      result += 'миллиона'
    } else {
      result += 'миллионов'
    }
    result += ' '
  }

  // Тысячи
  if (thousands > 0) {
    const t = thousands % 10
    const t10 = thousands % 100
    result += convertTriple(thousands, true) + ' '
    if (t10 >= 11 && t10 <= 14) {
      result += 'тысяч'
    } else if (t === 1) {
      result += 'тысяча'
    } else if (t >= 2 && t <= 4) {
      result += 'тысячи'
    } else {
      result += 'тысяч'
    }
    result += ' '
  }

  // Остаток
  if (remainder > 0) {
    result += convertTriple(remainder, false)
  }

  return result.trim()
}

/**
 * Форматирование суммы для договора: число прописью с рублями
 * Пример: 3200 → "три тысячи двести"
 */
export const formatMoneyWords = (amount: number): string => {
  return numberToWords(Math.floor(amount))
}

/**
 * Склонение слова "день" в зависимости от числа
 * 1 день, 2 дня, 5 дней, 21 день, 22 дня, 25 дней
 */
export const formatDays = (count: number): string => {
  const lastTwo = count % 100
  const lastOne = count % 10
  
  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${count} календарных дней`
  }
  if (lastOne === 1) {
    return `${count} календарный день`
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return `${count} календарных дня`
  }
  return `${count} календарных дней`
}
