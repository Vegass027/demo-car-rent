// ============================================================
// COMPONENT: Таблица сравнения машин по аналитике
// Позволяет сравнивать машины по доходам, прибыли, ROI и др.
// ============================================================

import { useState, useMemo } from 'react'
import { Table } from '@/components/retroui'
import { Accordion } from '@/components/retroui/Accordion'
import { formatMoney } from '@/utils/format'
import type { CarAnalyticsSummary } from '@/types'

type SortField = keyof CarAnalyticsSummary
type SortDirection = 'asc' | 'desc'

interface CarComparisonTableProps {
  data: CarAnalyticsSummary[]
  periodLabel?: string
}

export function CarComparisonTable({ data, periodLabel }: CarComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('netProfit')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      }
      return 0
    })
  }, [data, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleRowClick = (carId: string) => {
    // Навигация на страницу машины
    window.location.href = `/cars/${carId}`
  }

  // Вычисляем максимумы для сравнительных значков
  const maxProfit = Math.max(...data.map(d => d.netProfit || 0), 0)
  const maxOccupancy = Math.max(...data.map(d => d.occupancyPercent || 0), 0)
  const maxRoi = Math.max(...data.map(d => d.roi || 0), 0)
  const maxDailyIncome = Math.max(...data.map(d => d.avgDailyIncome || 0), 0)
  const now = new Date()
  const showComparativeBadges = data.length > 1

  // Функция для получения значков машины
  const getCarBadges = (car: CarAnalyticsSummary) => {
    const badges: Array<{ label: string; icon: string; color: string }> = []

    // Сравнительные значки — только если больше одной машины
    if (showComparativeBadges) {
      if ((car.netProfit || 0) === maxProfit && maxProfit > 0)
        badges.push({ label: 'Лидер', icon: '🏆', color: 'bg-yellow-100 text-yellow-800' })
      if (car.occupancyPercent === maxOccupancy && maxOccupancy > 0)
        badges.push({ label: 'Самая активная', icon: '⚡', color: 'bg-blue-100 text-blue-800' })
      if ((car.roi || 0) === maxRoi && maxRoi > 0)
        badges.push({ label: 'Лучший ROI', icon: '💰', color: 'bg-green-100 text-green-800' })
      if (car.avgDailyIncome === maxDailyIncome && maxDailyIncome > 0)
        badges.push({ label: 'Доходная', icon: '📈', color: 'bg-purple-100 text-purple-800' })
    }

    // Абсолютные значки — могут быть у нескольких машин
    if ((car.netProfit || 0) >= (car.totalInvestment || 0) && (car.totalInvestment || 0) > 0)
      badges.push({ label: 'Окупилась', icon: '🔄', color: 'bg-emerald-100 text-emerald-800' })

    if (car.purchaseDate) {
      const purchaseDateObj = new Date(car.purchaseDate)
      const daysSincePurchase = (now.getTime() - purchaseDateObj.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSincePurchase < 90)
        badges.push({ label: 'Новая', icon: '🆕', color: 'bg-sky-100 text-sky-800' })
    }

    if ((car.netProfit || 0) < 0)
      badges.push({ label: 'Убыточная', icon: '🔴', color: 'bg-red-100 text-red-800' })

    // Статусы выкупа
    if (car.carStatus === 'buyout')
      badges.push({ label: 'На выкупе', icon: '📋', color: 'bg-blue-100 text-blue-800' })
    if (car.carStatus === 'bought')
      badges.push({ label: 'Выкуплена', icon: '✅', color: 'bg-green-100 text-green-800' })

    return badges
  }

  // Вычисляем лучшие/худшие значения для подсветки
  const bestValues = useMemo(() => ({
    netProfit: Math.max(...data.map(d => d.netProfit || 0)),
    roi: Math.max(...data.map(d => d.roi || 0)),
    occupancyPercent: Math.max(...data.map(d => d.occupancyPercent || 0)),
    avgDailyIncome: Math.max(...data.map(d => d.avgDailyIncome || 0)),
    totalRental: Math.max(...data.map(d => d.totalRental || 0)),
  }), [data])

  const getCellStyle = (field: SortField, value: number | string): string => {
    if (typeof value !== 'number') return ''
    
    switch (field) {
      case 'netProfit':
        return value === bestValues.netProfit
          ? 'bg-green-100 dark:bg-green-900/30 font-semibold'
          : ''
      case 'roi':
        return value === bestValues.roi
          ? 'bg-green-100 dark:bg-green-900/30 font-semibold'
          : ''
      case 'occupancyPercent':
        return value === bestValues.occupancyPercent
          ? 'bg-green-100 dark:bg-green-900/30 font-semibold'
          : ''
      case 'avgDailyIncome':
        return value === bestValues.avgDailyIncome
          ? 'bg-green-100 dark:bg-green-900/30 font-semibold'
          : ''
      case 'totalRental':
        return value === bestValues.totalRental
          ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold'
          : ''
      default:
        return ''
    }
  }

  const SortIndicator = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-xs opacity-70">
      {sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
    </span>
  )

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Нет данных для отображения
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {periodLabel && (
        <div className="text-sm text-muted-foreground font-medium">
          Период: {periodLabel}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row className="hover:bg-transparent">
              <Table.Head 
                className="cursor-pointer select-none min-w-[150px]" 
                onClick={() => handleSort('carName')}
              >
                Автомобиль <SortIndicator field="carName" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[90px]" onClick={() => handleSort('licensePlate')}>
                Гос. номер <SortIndicator field="licensePlate" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[100px]" onClick={() => handleSort('totalRental')}>
                Доход ₽ <SortIndicator field="totalRental" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[100px]" onClick={() => handleSort('totalExpense')}>
                Расход ₽ <SortIndicator field="totalExpense" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[110px]" onClick={() => handleSort('netProfit')}>
                Чистая ₽ <SortIndicator field="netProfit" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[80px]" onClick={() => handleSort('rentedDays')}>
                Дни <SortIndicator field="rentedDays" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[90px]" onClick={() => handleSort('occupancyPercent')}>
                Занятость % <SortIndicator field="occupancyPercent" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[100px]" onClick={() => handleSort('avgDailyIncome')}>
                Средн. ₽/день <SortIndicator field="avgDailyIncome" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[80px]" onClick={() => handleSort('roi')}>
                ROI % <SortIndicator field="roi" />
              </Table.Head>
              <Table.Head className="text-right cursor-pointer select-none min-w-[120px]" onClick={() => handleSort('totalInvestment')}>
                Инвестиции ₽ <SortIndicator field="totalInvestment" />
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedData.map((car) => (
              <Table.Row 
                key={car.carId}
                className="cursor-pointer"
                onClick={() => handleRowClick(car.carId)}
              >
                <Table.Cell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: car.colorTag }}
                      />
                      <span className="truncate">{car.carName}</span>
                    </div>
                    {(() => {
                      const badges = getCarBadges(car)
                      if (badges.length === 0) return null
                      return (
                        <div className="flex flex-wrap gap-1">
                          {badges.map(badge => (
                            <span
                              key={badge.label}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
                            >
                              {badge.icon} {badge.label}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-right font-mono text-sm">
                  {car.licensePlate || '—'}
                </Table.Cell>
                <Table.Cell className={`text-right font-semibold ${getCellStyle('totalRental', car.totalRental)}`}>
                  {formatMoney(car.totalRental)}
                </Table.Cell>
                <Table.Cell className="text-right text-red-500">
                  {formatMoney(car.totalExpense)}
                </Table.Cell>
                <Table.Cell className={`text-right ${getCellStyle('netProfit', car.netProfit || 0)}`}>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatMoney(car.totalProfit || 0)}
                    </span>
                    {(car.totalSalary || 0) > 0 && (
                      <span className="text-xs text-orange-500">
                        −{formatMoney(car.totalSalary || 0)}
                      </span>
                    )}
                    <span className={`font-semibold ${(car.netProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatMoney(car.netProfit || 0)}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell className="text-right">
                  {car.rentedDays}
                </Table.Cell>
                <Table.Cell className={`text-right ${getCellStyle('occupancyPercent', car.occupancyPercent)}`}>
                  <div className="flex items-center justify-end gap-2">
                    <span>{car.occupancyPercent}%</span>
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${car.occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className={`text-right font-medium ${getCellStyle('avgDailyIncome', car.avgDailyIncome)}`}>
                  {formatMoney(car.avgDailyIncome)}
                </Table.Cell>
                <Table.Cell className={`text-right font-bold ${getCellStyle('roi', car.roi)}`}>
                  {car.roi >= 0 ? (
                    <span className="text-green-600 dark:text-green-400">
                      {car.roi}%
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      {car.roi}%
                    </span>
                  )}
                </Table.Cell>
                <Table.Cell className="text-right text-muted-foreground">
                  {formatMoney(car.totalInvestment)}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      {/* Итоговая строка */}
      <div className="bg-muted/50 rounded-lg p-3 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Всего машин: </span>
          <span className="font-semibold">{data.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Общий доход: </span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatMoney(data.reduce((sum, d) => sum + d.totalRental, 0))}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Операционная прибыль: </span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatMoney(data.reduce((sum, d) => sum + (d.totalProfit || 0), 0))}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Выплачено: </span>
          <span className="font-semibold text-orange-500">
            {formatMoney(data.reduce((sum, d) => sum + (d.totalSalary || 0), 0))}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Чистая прибыль: </span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatMoney(data.reduce((sum, d) => sum + (d.netProfit || 0), 0))}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Средняя занятость: </span>
          <span className="font-semibold">
            {Math.round(data.reduce((sum, d) => sum + d.occupancyPercent, 0) / data.length)}%
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Лучший ROI: </span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {bestValues.roi}%
          </span>
        </div>
      </div>

      {/* FAQ для владельца */}
      <AnalyticsFAQ />
    </div>
  )
}

// ============================================================
// COMPONENT: FAQ ДЛЯ ВЛАДЕЛЬЦА
// ============================================================

function AnalyticsFAQ() {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        📚 Справка по колонкам
      </h3>
      
      <Accordion type="single" collapsible className="w-full">
        <Accordion.Item value="income">
          <Accordion.Header className="text-base font-medium">
            Доход ₽ — что это и как считается?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Доход</strong> — это сумма всех денег, полученных от аренды машины за выбранный период.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула:</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  Доход = Все платежи по аренде (без выкупа)
                </code>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="font-medium text-green-700 dark:text-green-400 mb-1">✓ Включается:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Оплата за каждый день аренды</li>
                  <li>Платежи по договорам выкупа (только доля прибыли, не полная сумма)</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">✗ Не включается:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Залоговые депозиты (возвращаются клиенту)</li>
                  <li>Стоимость самой машины при выкупе</li>
                </ul>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="expense">
          <Accordion.Header className="text-base font-medium">
            Расход ₽ — что входит?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Расход</strong> — это все затраты на обслуживание машины.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула:</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  Расход = Расходы на ТО + Прочие расходы (кроме страховки и шин)
                </code>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="font-medium text-green-700 dark:text-green-400 mb-1">✓ Включается:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Плановое ТО (замена масла, ремонт)</li>
                  <li>Штрафы, эвакуация, парковка</li>
                  <li>Мелкий ремонт без категории</li>
                  <li>Первичная подготовка (не входит в инвестиции)</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">✗ Не включается:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Страховка (ОСАГО, КАСКО) — это инвестиция</li>
                  <li>Шины — это инвестиция</li>
                </ul>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                💡 Страховка и шины не считаются расходом, потому что это разовые инвестиции в машину, которые возвращаются через амортизацию.
              </p>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="profit">
          <Accordion.Header className="text-base font-medium">
            Чистая ₽ — как считается?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Чистая прибыль</strong> — это реальный заработок после всех расходов и выплат партнёрам.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула:</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  Чистая = Операционная прибыль − Выплаты партнёрам
                </code>
                <p className="text-xs">где Операционная прибыль = Доход − Расходы</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Пример расчёта:</p>
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
                  <div>Доход: 90 000 ₽</div>
                  <div>− Расходы: 15 000 ₽</div>
                  <div>________________</div>
                  <div className="font-bold">Операционная прибыль: 75 000 ₽</div>
                  <div className="mt-2">− Выплаты партнёрам: 15 000 ₽</div>
                  <div>________________</div>
                  <div className="font-bold text-green-600">Чистая прибыль: 60 000 ₽</div>
                </div>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="days">
          <Accordion.Header className="text-base font-medium">
            Дни — как считаются?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Дни</strong> — это количество дней, когда машина была в аренде (сдавалась клиенту).
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула:</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  Дни = ceil(Дата окончания − Дата начала)
                </code>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="font-medium text-green-700 dark:text-green-400 mb-1">✓ Считаются:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Обычная аренда (тип записи "normal")</li>
                  <li>Бронирование (тип записи "booking")</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">✗ Не считаются:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Договоры выкупа — там другие даты</li>
                  <li>Записи без дат начала/конца</li>
                </ul>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">⚠️ Важно:</p>
                <p>Если запись есть, а даты не указаны — такой период не учитывается. Убедитесь, что в журнале указаны даты аренды.</p>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="occupancy">
          <Accordion.Header className="text-base font-medium">
            Занятость % — что это?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Занятость</strong> — процент дней, когда машина была в аренде, от общего срока владения.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула:</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  Занятость = Дни в аренде ÷ Всего дней владения × 100
                </code>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Как определяются "Всего дней владения":</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Если указана дата покупки</strong> — с даты покупки до сегодня</li>
                  <li><strong>Если дата покупки не указана</strong> — с даты первой записи в журнале</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Пример:</p>
                <p>Машина куплена 1 января. Сегодня 1 апреля. Владение = 91 день. Из них сдавалась 60 дней.</p>
                <p className="mt-2 font-mono">60 ÷ 91 × 100 = <strong>66%</strong></p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">⚠️ Важно:</p>
                <p>В этом разделе (Сравнение машин) занятость считается по календарным дням. В месячной аналитике (графики, журнал) занятость может отличаться — там она считается по количеству записей с доходом относительно общего числа записей. Это разные показатели.</p>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="avg-daily">
          <Accordion.Header className="text-base font-medium">
            Средн. ₽/день — как считается?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Средний доход в день</strong> — сколько в среднем зарабатывает машина за каждый день аренды.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула:</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  Средн. ₽/день = Общий доход ÷ Дни в аренде
                </code>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Пример:</p>
                <p>Машина заработала 90 000 ₽ за 30 дней аренды.</p>
                <p className="mt-2 font-mono">90 000 ÷ 30 = <strong>3 000 ₽/день</strong></p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">⚠️ Обратите внимание:</p>
                <p>Если дней аренды = 0, показывает 0 (делить на ноль нельзя).</p>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="roi">
          <Accordion.Header className="text-base font-medium">
            ROI % — что это и как считается?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">ROI (Return on Investment)</strong> — возврат на инвестиции. Показывает, насколько эффективно вложены деньги в машину.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула (за всё время):</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  ROI = Чистая прибыль ÷ Инвестиции ÷ Срок владения (лет) × 100
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Применяется в сводке "Сравнение машин" (за всё время).
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула (за выбранный период):</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  ROI = Чистая прибыль ÷ Инвестиции × 100
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Без деления на годы. Применяется при выборе конкретного месяца или периода.
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Что входит в "Инвестиции":</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Цена покупки авто</li>
                  <li>Расходы на подготовку (страховка, шины, прочее)</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Пример:</p>
                <div className="text-xs font-mono space-y-1">
                  <div>Цена покупки: 1 500 000 ₽</div>
                  <div>+ Подготовка: 100 000 ₽</div>
                  <div>________________</div>
                  <div>Инвестиции: 1 600 000 ₽</div>
                  <div className="mt-2">Чистая прибыль: 400 000 ₽</div>
                  <div>Срок владения: 1.5 года</div>
                  <div>________________</div>
                  <div>400 000 ÷ 1 600 000 ÷ 1.5 × 100 = <strong>16.7%</strong></div>
                </div>
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                💡 Чем выше ROI — тем выгоднее инвестиция. Для авто нормальный показатель 10-20% годовых.
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="investment">
          <Accordion.Header className="text-base font-medium">
            Инвестиции ₽ — что входит?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Инвестиции</strong> — это общая сумма денег, вложенная в машину с момента покупки.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">Формула:</p>
                <code className="block bg-muted px-2 py-1 rounded text-xs">
                  Инвестиции = Цена покупки + Подготовка
                </code>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="font-medium text-green-700 dark:text-green-400 mb-1">✓ Включается:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Цена авто по договору купли-продажи</li>
                  <li>Первичная страховка (ОСАГО, КАСКО)</li>
                  <li>Комплект шин</li>
                  <li>Любые другие расходы при запуске машины</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">✗ Не включается:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Расходы на ТО (текущее обслуживание) — это расходы периода</li>
                  <li>Штрафы, парковки — это расходы периода</li>
                </ul>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="badges">
          <Accordion.Header className="text-base font-medium">
            Что означают значки рядом с названием машины?
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
                  <span>🏆</span>
                  <span><strong>Лидер</strong> — машина с максимальной чистой прибылью</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                  <span>⚡</span>
                  <span><strong>Самая активная</strong> — машина с максимальной занятостью</span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                  <span>💰</span>
                  <span><strong>Лучший ROI</strong> — машина с лучшим возвратом инвестиций</span>
                </div>
                <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                  <span>📈</span>
                  <span><strong>Доходная</strong> — машина с максимальным средним доходом в день</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                  <span>🔄</span>
                  <span><strong>Окупилась</strong> — чистая прибыль ≥ сумме инвестиций</span>
                </div>
                <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg p-2">
                  <span>🆕</span>
                  <span><strong>Новая</strong> — с даты покупки прошло менее 90 дней</span>
                </div>
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                  <span>🔴</span>
                  <span><strong>Убыточная</strong> — чистая прибыль отрицательная</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                  <span>📋</span>
                  <span><strong>На выкупе</strong> — машина в процессе выкупа клиентом</span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                  <span>✅</span>
                  <span><strong>Выкуплена</strong> — машина полностью выкуплена</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Сравнительные значки (Лидер, Самая активная и т.д.) показываются только если в таблице больше одной машины.
              </p>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  )
}
