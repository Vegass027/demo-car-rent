// ============================================================
// PAGE: DASHBOARD (ПУЛЬТ)
// Главная страница с финансовым обзором
// ============================================================

import { useMemo, useState } from 'react'
import { Wallet, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PieChart as PieChartIcon, RefreshCw } from 'lucide-react'
import { Card } from '@/components/retroui/Card'
import { Progress } from '@/components/retroui/Progress'
import { AreaChart } from '@/components/retroui/charts/AreaChart'
import { PieChart } from '@/components/retroui/charts/PieChart'
import { BarChart } from '@/components/retroui/charts/BarChart'
import { Select } from '@/components/retroui/Select'
import { PageContainer } from '@/components/features/AppLayout'
import { useMonthSummary, useYearlyStats } from '@/hooks/useFinance'
import { useCars, useCarsWithStats } from '@/hooks/useCars'
import { useExpensesByCategory } from '@/hooks/useRecords'
import { formatMoney, formatMoneyLegend, formatMoneyAxis } from '@/utils/format'
import { useAppStore } from '@/store/useAppStore'
import { Loader } from '@/components/retroui/Loader'
import { MONTHS_RU } from '@/constants'

// Тип для фильтра периода расходов
type ExpensePeriod = 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'

export function Dashboard() {
  // Получаем выбранный месяц из store
  const { selectedMonth, setSelectedMonth } = useAppStore()
  
  // Парсим месяц (формат "2026-03")
  const [year, month] = selectedMonth.split('-').map(Number)
  
  // Локальный стейт для фильтров расходов
  const [expenseCarId, setExpenseCarId] = useState<string>('all') // 'all' = все машины
  const [expensePeriod, setExpensePeriod] = useState<ExpensePeriod>('all') // 'all' = всё время
  
  // Запросы
  const { data: monthSummary, isLoading: summaryLoading } = useMonthSummary(year, month)
  const { data: yearlyStats, isLoading: yearlyLoading } = useYearlyStats(year)
  const { data: cars } = useCars()
  
  // Машины со статистикой для расчёта окупаемости автопарка (берем данные за всё время)
  const { data: carsWithStats, isLoading: carsWithStatsLoading } = useCarsWithStats(year, month)
  
  // Запрос расходов по категориям
  const { data: expensesByCategory, isLoading: expensesLoading } = useExpensesByCategory({
    carId: expenseCarId === 'all' ? undefined : expenseCarId,
    year: expensePeriod === 'all' ? undefined : year,
    month: expensePeriod === 'all' ? undefined : parseInt(expensePeriod, 10),
  })
  
  // Агрегируем данные по месяцам для графика
  const chartData = useMemo(() => {
    if (!yearlyStats || yearlyStats.length === 0) return []
    
    // Группируем по месяцам и суммируем прибыль
    const monthlyTotals: Record<string, { profit: number; rental: number; expense: number }> = {}
    
    for (const stat of yearlyStats) {
      // Извлекаем месяц из строки "2026-02-01T00:00:00Z"
      const monthKey = stat.month.substring(0, 7) // "2026-02"
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { profit: 0, rental: 0, expense: 0 }
      }
      monthlyTotals[monthKey].profit += stat.totalProfit
      monthlyTotals[monthKey].rental += stat.totalRental
      monthlyTotals[monthKey].expense += stat.totalExpense
    }
    
    // Преобразуем в массив для графика, сортируем по месяцу
    return Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, totals]) => {
        const monthNum = parseInt(monthKey.split('-')[1], 10) - 1
        return {
          month: MONTHS_RU[monthNum].substring(0, 3), // "Янв", "Фев" и т.д.
          profit: totals.profit,
          rental: totals.rental,
          expense: totals.expense,
        }
      })
  }, [yearlyStats])
  
  // Данные для PieChart (все машины)
  const pieChartData = useMemo(() => {
    if (!expensesByCategory || expenseCarId !== 'all') return []
    
    return expensesByCategory.map(item => ({
      name: item.categoryName,
      value: item.totalAmount,
      color: item.categoryColor,
    }))
  }, [expensesByCategory, expenseCarId])
  
  // Данные для BarChart (конкретная машина)
  const barChartData = useMemo(() => {
    if (!expensesByCategory || expenseCarId === 'all') return []
    
    return expensesByCategory.map(item => ({
      category: item.categoryName.length > 10
        ? item.categoryName.substring(0, 10) + '...'
        : item.categoryName,
      amount: item.totalAmount,
      color: item.categoryColor,
    }))
  }, [expensesByCategory, expenseCarId])
  
  // Цвета для PieChart
  const pieChartColors = useMemo(() => {
    if (!expensesByCategory) return []
    return expensesByCategory.map(item => item.categoryColor)
  }, [expensesByCategory])
  
  // Активные машины для селекта
  const activeCars = useMemo(() => {
    return (cars || []).filter(c => c.isActive)
  }, [cars])

  // СВОДКА ОКУПАЕМОСТИ: расчёт для всего автопарка
  const portfolioBuyout = useMemo(() => {
    if (!carsWithStats || carsWithStats.length === 0) {
      return null
    }

    // Суммируем по ВСЕМ машинам (включая неактивные)
    // Используем уже посчитанные поля из CarWithStats
    let totalInvestment = 0
    let totalNetProfit = 0

    for (const car of carsWithStats) {
      // totalInvestment уже посчитан в API как purchasePrice + preparationCost
      totalInvestment += car.totalInvestment ?? 0

      // netProfit уже посчитан в API как totalIncome - totalExpense
      totalNetProfit += car.netProfit ?? 0
    }

    // Процент окупаемости (реальный, без ограничения 100%)
    const roiPercent = totalInvestment > 0
      ? Math.round((totalNetProfit / totalInvestment) * 100)
      : 0

    // Сколько уже отбилось
    const recoveredAmount = Math.max(0, totalNetProfit)

    // До полной окупаемости
    const remainingToRecover = Math.max(0, totalInvestment - totalNetProfit)

    return {
      totalInvestment,
      totalNetProfit,
      roiPercent,
      recoveredAmount,
      remainingToRecover,
      carCount: carsWithStats.length,
    }
  }, [carsWithStats])

  // Переключение месяца
  const handlePrevMonth = () => {
    const date = new Date(year, month - 2)
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
  }

  const handleNextMonth = () => {
    const date = new Date(year, month)
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
  }

  return (
    <PageContainer className="space-y-6">
      {/* БЛОК 1: Выбранный месяц */}
      <Card className="p-4 md:p-6 w-full">
        {/* Заголовок с переключателем месяца */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">МЕСЯЦ</h2>
          </div>
          
          {/* Переключатель месяца */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-accent rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <span className="font-semibold min-w-[120px] text-center text-sm">
              {MONTHS_RU[month - 1]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-accent rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
        
        {/* Итоги месяца с локальным лоадером */}
        {summaryLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size="md" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryItem
              icon={<TrendingUp className="w-4 h-4" />}
              label="Выручка"
              value={monthSummary?.totalRental || 0}
              type="income"
            />
            <SummaryItem
              icon={<TrendingDown className="w-4 h-4" />}
              label="Расходы"
              value={monthSummary?.totalExpense || 0}
              type="expense"
            />
            <SummaryItem
              icon={<Wallet className="w-4 h-4" />}
              label="Прибыль"
              value={monthSummary?.totalProfit || 0}
              type={(monthSummary?.totalProfit || 0) >= 0 ? 'profit' : 'loss'}
            />
          </div>
        )}
      </Card>

      {/* БЛОК 2: Динамика прибыли по месяцам */}
      <Card className="p-4 md:p-6 w-full">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">ДИНАМИКА ПРИБЫЛИ</h2>
          <span className="text-sm text-muted-foreground ml-2">{year}</span>
        </div>
        
        {yearlyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size="md" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mb-2 opacity-50" />
            <p>Нет данных за {year} год</p>
          </div>
        ) : (
          <AreaChart
            data={chartData}
            index="month"
            indexLabel="Месяц"
            categories={['profit']}
            categoryLabels={{ profit: 'Прибыль' }}
            strokeColors={['#22C55E']}
            fillColors={['#22C55E']}
            valueFormatter={formatMoneyAxis}
            showGrid={true}
            fill="gradient"
            className="h-64"
            showYAxis={false}
          />
        )}
      </Card>

      {/* БЛОК 2.5: Сводка окупаемости автопарка */}
      <Card className="p-4 md:p-6 w-full">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">СВОДКА ОКУПАЕМОСТИ</h2>
        </div>

        {carsWithStatsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size="md" />
          </div>
        ) : !portfolioBuyout ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="w-12 h-12 mb-2 opacity-50" />
            <p>Нет данных для расчёта</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Общая сумма инвестиций */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Всего инвестировано:</span>
              <span className="text-xl font-bold">
                {formatMoney(portfolioBuyout.totalInvestment)}
              </span>
            </div>

            {/* Прогресс бар */}
            <div className="space-y-2">
              <div className="relative">
                <Progress
                  value={Math.min(100, portfolioBuyout.roiPercent)}
                  className="h-6"
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                  {portfolioBuyout.roiPercent}% {portfolioBuyout.roiPercent > 100 && '✓'}
                </div>
              </div>

              {/* Что показываем под прогресс-баром */}
              {portfolioBuyout.roiPercent >= 100 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600 font-medium">✓ Окупилось:</span>
                  <span className="text-green-600 font-bold">
                    {formatMoney(portfolioBuyout.recoveredAmount)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">До полной окупаемости:</span>
                  <span className="font-medium">
                    {formatMoney(portfolioBuyout.remainingToRecover)}
                  </span>
                </div>
              )}
            </div>

            {/* Статистика */}
            <div className="pt-2 border-t space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Машин в автопарке:</span>
                <span className="font-medium">{portfolioBuyout.carCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Всего заработано (чистыми):</span>
                <span className={`font-medium ${portfolioBuyout.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(portfolioBuyout.totalNetProfit)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* БЛОК 3: Структура расходов */}
      <Card className="p-4 md:p-6 w-full">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">СТРУКТУРА РАСХОДОВ</h2>
          </div>
          
          {/* Фильтры в ретро-стиле */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Фильтр по машине */}
            <div>
              <label className="block text-sm font-medium mb-2">Машина</label>
              <Select
                value={expenseCarId}
                onValueChange={setExpenseCarId}
              >
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Выберите машину" />
                </Select.Trigger>
                <Select.Content position="popper" side="bottom">
                  <Select.Item value="all">Все машины</Select.Item>
                  {activeCars.map(car => (
                    <Select.Item key={car.id} value={car.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: car.colorTag }}
                        />
                        {car.name}
                      </div>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            
            {/* Фильтр по периоду */}
            <div>
              <label className="block text-sm font-medium mb-2">Период</label>
              <Select
                value={expensePeriod}
                onValueChange={(value) => setExpensePeriod(value as ExpensePeriod)}
              >
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Выберите период" />
                </Select.Trigger>
                <Select.Content position="popper" side="bottom">
                  <Select.Item value="all">Всё время</Select.Item>
                  {MONTHS_RU.map((monthName, index) => (
                    <Select.Item key={index + 1} value={String(index + 1) as ExpensePeriod}>
                      {monthName} {year}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
        </div>
        
        {expensesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size="md" />
          </div>
        ) : !expensesByCategory || expensesByCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <PieChartIcon className="w-12 h-12 mb-2 opacity-50" />
            <p>Нет данных о расходах</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 mt-4">
            {/* График */}
            <div className="flex-1 flex justify-center">
              {expenseCarId === 'all' ? (
                // PieChart для всех машин
                <PieChart
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  colors={pieChartColors}
                  valueFormatter={formatMoneyAxis}
                  innerRadius={40}
                  outerRadius={80}
                  className="h-64"
                />
              ) : (
                // BarChart для конкретной машины
                <BarChart
                  data={barChartData}
                  index="category"
                  indexLabel="Категория"
                  categories={['amount']}
                  categoryLabels={{ amount: 'Расход' }}
                  strokeColors={['#EF4444']}
                  fillColors={['#EF4444']}
                  valueFormatter={formatMoneyAxis}
                  showGrid={true}
                  className="h-64"
                />
              )}
            </div>
            
            {/* Легенда - показываем ВСЕ категории */}
            <div className="lg:w-72 flex flex-col justify-center">
              <div className="space-y-2">
                {expensesByCategory.map((item, index) => (
                  <div key={item.categoryId || index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.categoryColor }}
                      />
                      <span className="truncate">{item.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                      <span>{item.percent}%</span>
                      <span className="text-muted-foreground/50">|</span>
                      <span className="font-mono">{formatMoneyLegend(item.totalAmount)}</span>
                    </div>
                  </div>
                ))}
                
                {/* Итого */}
                <div className="pt-2 mt-2 border-t flex items-center justify-between font-semibold text-sm">
                  <span>Итого</span>
                  <span>{formatMoney(expensesByCategory.reduce((sum, item) => sum + item.totalAmount, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}

// Компонент для отображения итоговой суммы
interface SummaryItemProps {
  label: string
  value: number
  type: 'income' | 'expense' | 'profit' | 'loss' | 'balance'
  icon?: React.ReactNode
}

function SummaryItem({ label, value, type, icon }: SummaryItemProps) {
  const colorClass = {
    income: 'text-green-600',
    expense: 'text-red-600',
    profit: 'text-green-600',
    loss: 'text-red-600',
    balance: '',
  }[type]

  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className={colorClass}>{icon}</span>}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl md:text-2xl font-bold ${colorClass}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}
