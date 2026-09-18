// ============================================================
// PAGE: FINANCE (ФИНАНСЫ)
// Аналитика, графики и управление кассой
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Car, Banknote, History, Trash2, Building2, User, CreditCard, FileText, Users, Search, TrendingUp, CalendarDays, X, Shield, Pencil, Check, MessageCircle, Copy, KeyRound, ChevronDown, Wrench, Eye, EyeOff, Wallet, Layers } from 'lucide-react'
import { Dialog } from '@/components/retroui/Dialog'
import { Card } from '@/components/retroui/Card'
import { CarComparisonTable } from '@/components/features/CarComparisonTable'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { Textarea } from '@/components/retroui/Textarea'
import { Accordion } from '@/components/retroui/Accordion'
import { Select } from '@/components/retroui/Select'
import { PageContainer } from '@/components/features/AppLayout'
import { useCashFlow, useYearlyStats, useSalaryWithdrawals, useCreateSalaryWithdrawal, useMonthlyProfit, useDeleteSalaryWithdrawal, useAllTimeCarStats, useCarStatsByPeriod } from '@/hooks/useFinance'
import { useCars, useCarPreparation } from '@/hooks/useCars'
import { useClientSearch, useClientHistory, useUpdateClient } from '@/hooks/useClients'
import { useAppStore } from '@/store/useAppStore'
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings'
import { formatMoney, formatDate } from '@/utils/format'
import { calcBuyoutTotalSum, calcBuyoutProfitShare } from '@/utils/calc'
import { generateContractDocument, generateSimpleRentalContractDocument, generateServiceActDocument, generateBuyoutContractDocument, generateContractNumber } from '@/utils/contractGenerator'
import { MONTHS_RU } from '@/constants'
import { Loader } from '@/components/retroui/Loader'
import { ChangePasswordModal } from '@/components/features/ChangePasswordModal'
import { useBuyoutContracts, useCreateBuyoutPayment, useUpdateBuyoutContractStatus, useUpdateBuyoutContractDates, useDeleteBuyoutPayment, useUpdateBuyoutContractParams } from '@/hooks/useRecords'
import { updateCarStatus } from '@/api/cars'
import { updateBuyoutContractDeposit } from '@/api/records'
import { clientToContractData } from '@/api/clients'
import type { MonthlyStats, SalaryFormData, CompanySettingsFormData, Client, ClientHistoryEntry, Car as CarType, CompanySettings, BuyoutStatus } from '@/types'
import type { BuyoutContractWithDetails } from '@/api/records'

type ViewMode = 'cash' | 'bycar' | 'clients' | 'buyout' | 'requisites' | 'analytics'

export function Finance() {
  const [viewMode, setViewMode] = useState<ViewMode>('cash')
  
  const { selectedMonth } = useAppStore()
  const [year] = selectedMonth.split('-').map(Number)
  
  // Запросы
  const { data: cashFlow, isLoading: cashLoading } = useCashFlow()
  const { data: salaryWithdrawals, isLoading: salaryLoading } = useSalaryWithdrawals()

  const isLoading = cashLoading || salaryLoading

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader size="lg" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6">
      {/* Переключатель вида */}
      <nav className="flex flex-wrap gap-2">
        <ViewTab
          active={viewMode === 'cash'}
          onClick={() => setViewMode('cash')}
        >
          💵 Касса
        </ViewTab>
        <ViewTab
          active={viewMode === 'bycar'}
          onClick={() => setViewMode('bycar')}
        >
          📊 По машинам
        </ViewTab>
        <ViewTab
          active={viewMode === 'clients'}
          onClick={() => setViewMode('clients')}
        >
          🚗 Выкуп
        </ViewTab>
        <ViewTab
          active={viewMode === 'buyout'}
          onClick={() => setViewMode('buyout')}
        >
          👥 Клиенты
        </ViewTab>
        <ViewTab
          active={viewMode === 'requisites'}
          onClick={() => setViewMode('requisites')}
        >
          🏢 Мои реквизиты
        </ViewTab>
        <ViewTab
          active={viewMode === 'analytics'}
          onClick={() => setViewMode('analytics')}
        >
          📈 Аналитика
        </ViewTab>
      </nav>

      {/* Контент в зависимости от вида */}
      {viewMode === 'cash' && (
        <CashView
          cashFlow={cashFlow}
          salaryWithdrawals={salaryWithdrawals}
        />
      )}

      {viewMode === 'bycar' && (
        <CarsView year={year} />
      )}

      {viewMode === 'clients' && (
        <BuyoutView />
      )}

      {viewMode === 'buyout' && (
        <ClientsView />
      )}

      {viewMode === 'requisites' && (
        <AccountingView />
      )}

      {viewMode === 'analytics' && (
        <AnalyticsView />
      )}
    </PageContainer>
  )
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

// Таб переключения вида
interface ViewTabProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function ViewTab({ active, onClick, children }: ViewTabProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

// Карточка статистики
interface StatCardProps {
  label: string
  value: number
  type: 'income' | 'expense' | 'profit' | 'balance' | 'salary'
}

function StatCard({ label, value, type }: StatCardProps) {
  const colorClass = {
    income: 'text-green-600',
    expense: 'text-red-600',
    profit: value >= 0 ? 'text-green-600' : 'text-red-600',
    balance: '',
    salary: 'text-orange-600',
  }[type]

  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className={`text-xl md:text-2xl font-bold ${colorClass}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}

// Тип для режима выбора периода
type PeriodMode = 'month' | 'all' | 'range'

// ============================================================
// VIEW: ПО МАШИНАМ
// ============================================================

interface CarsViewProps {
  year: number
}

function CarsView({ year }: CarsViewProps) {
  // Получаем список машин
  const { data: cars } = useCars()
  // Загружаем данные за весь год
  const { data: yearlyStats } = useYearlyStats(year)
  
  // Локальное состояние для фильтров
  const [selectedCarId, setSelectedCarId] = useState<string>('all')
  
  // Режим выбора периода: 'month' (один месяц), 'all' (всё время), 'range' (диапазон)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  
  // Выбранный месяц (для режима 'month')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  
  // Диапазон месяцев (для режима 'range')
  const [rangeStartMonth, setRangeStartMonth] = useState<number>(1)
  const [rangeEndMonth, setRangeEndMonth] = useState<number>(12)

  // Фильтруем данные по выбранным фильтрам
  const filteredStats = yearlyStats?.filter((stat) => {
    const monthNum = parseInt(stat.month.split('-')[1], 10)
    const carMatch = selectedCarId === 'all' || stat.carId === selectedCarId
    
    // Фильтр по периоду в зависимости от режима
    let periodMatch = true
    if (periodMode === 'month') {
      periodMatch = stat.month.startsWith(`${year}-${String(selectedMonth).padStart(2, '0')}`)
    } else if (periodMode === 'range') {
      periodMatch = monthNum >= rangeStartMonth && monthNum <= rangeEndMonth
    }
    // При 'all' periodMatch = true (без фильтра)
    
    return carMatch && periodMatch
  })

  // Сортируем по прибыли
  const sortedStats = [...(filteredStats || [])].sort((a, b) => b.totalProfit - a.totalProfit)

  // Подсчёт итогов
  const totalRental = sortedStats.reduce((sum, s) => sum + s.totalRental, 0)
  const totalExpense = sortedStats.reduce((sum, s) => sum + s.totalExpense, 0)
  const totalProfit = sortedStats.reduce((sum, s) => sum + s.totalProfit, 0)

  return (
    <div className="space-y-6">
      <section>
        <Accordion type="single" collapsible className="w-full">
          <Accordion.Item value="cars">
            <Accordion.Header className="text-lg font-bold">
              ПО МАШИНАМ
            </Accordion.Header>
            <Accordion.Content>
              {/* Фильтры */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Селект машины */}
                <div>
                  <label className="block text-sm font-medium mb-2">Выберите машину</label>
                  <Select
                    value={selectedCarId}
                    onValueChange={setSelectedCarId}
                  >
                    <Select.Trigger className="w-full">
                      <Select.Value placeholder="Выберите машину" />
                    </Select.Trigger>
                    <Select.Content position="popper" side="bottom">
                      <Select.Item value="all">Все машины</Select.Item>
                      {cars?.map((car) => (
                        <Select.Item key={car.id} value={car.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: car.colorTag }}
                            />
                            {car.name} — {car.licensePlate}
                          </div>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                {/* Селект режима периода */}
                <div>
                  <label className="block text-sm font-medium mb-2">Период</label>
                  <Select
                    value={periodMode}
                    onValueChange={(value: PeriodMode) => setPeriodMode(value)}
                  >
                    <Select.Trigger className="w-full">
                      <Select.Value placeholder="Выберите период" />
                    </Select.Trigger>
                    <Select.Content position="popper" side="bottom">
                      <Select.Item value="month">Один месяц</Select.Item>
                      <Select.Item value="all">Все время</Select.Item>
                      <Select.Item value="range">Диапазон</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
              </div>

              {/* Дополнительные фильтры периода */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Фильтр месяца — только для режима "Один месяц" */}
                {periodMode === 'month' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Выберите месяц</label>
                    <Select
                      value={String(selectedMonth)}
                      onValueChange={(value) => setSelectedMonth(Number(value))}
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value placeholder="Выберите месяц" />
                      </Select.Trigger>
                      <Select.Content position="popper" side="bottom">
                        {MONTHS_RU.map((monthName, index) => (
                          <Select.Item key={index + 1} value={String(index + 1)}>
                            {monthName} {year}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                )}

                {/* Фильтры диапазона — только для режима "Диапазон" */}
                {periodMode === 'range' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">С месяца</label>
                      <Select
                        value={String(rangeStartMonth)}
                        onValueChange={(value) => setRangeStartMonth(Number(value))}
                      >
                        <Select.Trigger className="w-full">
                          <Select.Value placeholder="Начало" />
                        </Select.Trigger>
                        <Select.Content position="popper" side="bottom">
                          {MONTHS_RU.map((monthName, index) => (
                            <Select.Item key={index + 1} value={String(index + 1)}>
                              {monthName} {year}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">По месяц</label>
                      <Select
                        value={String(rangeEndMonth)}
                        onValueChange={(value) => setRangeEndMonth(Number(value))}
                      >
                        <Select.Trigger className="w-full">
                          <Select.Value placeholder="Конец" />
                        </Select.Trigger>
                        <Select.Content position="popper" side="bottom">
                          {MONTHS_RU.map((monthName, index) => (
                            <Select.Item key={index + 1} value={String(index + 1)}>
                              {monthName} {year}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {/* Итоги за выбранный период */}
              <div className="p-4 bg-muted/30 rounded-lg mb-4">
                {/* Заголовок в зелёной полосе как в журнале */}
                <div className="flex items-center justify-center sm:justify-start text-sm py-1.5 px-3 rounded bg-green-50 mb-3">
                  <h3 className="text-base">
                    {periodMode === 'all' && (
                      <span className="font-black">ВСЁ ВРЕМЯ</span>
                    )}
                    {periodMode === 'month' && (
                      <>
                        <span className="font-black">{MONTHS_RU[selectedMonth - 1]}</span>{' '}
                        <span className="font-black">{year}</span>
                      </>
                    )}
                    {periodMode === 'range' && (
                      <>
                        <span className="font-black">{MONTHS_RU[rangeStartMonth - 1]}</span>
                        <span className="font-normal"> — </span>
                        <span className="font-black">{MONTHS_RU[rangeEndMonth - 1]}</span>
                        <span className="font-normal"> {year}</span>
                      </>
                    )}
                    {selectedCarId !== 'all' && (
                      <span className="font-normal text-muted-foreground ml-2">• {cars?.find(c => c.id === selectedCarId)?.name}</span>
                    )}
                  </h3>
                </div>
                {/* На мобильных — колонкой по центру, на ПК — в строку */}
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:justify-start text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Доход:</span>
                    <span className="font-medium text-green-600">+{formatMoney(totalRental)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Расход:</span>
                    <span className="font-medium text-red-600">-{formatMoney(totalExpense)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Прибыль:</span>
                    <span className={`font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMoney(totalProfit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Список машин — показываем только когда выбраны "Все машины" */}
              {selectedCarId === 'all' && (
                sortedStats.length > 0 ? (
                  <div className="space-y-3">
                    {sortedStats.map((stat, index) => (
                      <CarStatRow
                        key={`${stat.carId}-${stat.month}`}
                        rank={index + 1}
                        stat={stat}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Нет данных за выбранный период
                    </p>
                  </div>
                )
              )}

              {/* Помесячная разбивка по выбранной машине — только для режима "Все время" */}
              {selectedCarId !== 'all' && periodMode === 'all' && (
                <CarMonthlyBreakdown
                  carId={selectedCarId}
                  carName={cars?.find(c => c.id === selectedCarId)?.name || ''}
                  monthlyData={sortedStats.filter(s => s.carId === selectedCarId)}
                />
              )}
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </section>

      {/* Статистика по выкупу */}
      <BuyoutCarsStats />

      {/* Сводка по стоимости подготовки */}
      <section>
        <Accordion type="single" collapsible className="w-full">
          <Accordion.Item value="preparation">
            <Accordion.Header className="text-lg font-bold">
              СТОИМОСТЬ ПОДГОТОВКИ АВТОПАРКА
            </Accordion.Header>
            <Accordion.Content>
              <PreparationSummary cars={cars || []} />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </section>
    </div>
  )
}

// ============================================================
// COMPONENT: СВОДКА СТОИМОСТИ ПОДГОТОВКИ
// ============================================================

interface PreparationSummaryProps {
  cars: CarType[]
}

function PreparationSummary({ cars }: PreparationSummaryProps) {
  const totalPreparation = cars.reduce((sum, car) => sum + car.preparationCost, 0)

  if (cars.length === 0) {
    return (
      <div className="text-center py-8">
        <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Нет машин в автопарке</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Общая сумма */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-center sm:justify-start text-sm py-1.5 px-3 rounded bg-blue-50 mb-3">
          <h3 className="text-base font-black">ИТОГО по всем машинам</h3>
        </div>
        <p className="text-xl md:text-2xl font-bold text-blue-600 text-center sm:text-left">
          {formatMoney(totalPreparation)}
        </p>
        <p className="text-sm text-muted-foreground mt-1 text-center sm:text-left">
          {cars.length} {cars.length === 1 ? 'машина' : cars.length < 5 ? 'машины' : 'машин'} в автопарке
        </p>
      </div>

      {/* Список машин с детализацией */}
      <div className="space-y-2">
        {cars
          .slice()
          .sort((a, b) => b.preparationCost - a.preparationCost)
          .map((car) => (
            <PreparationCarRow key={car.id} car={car} />
          ))}
      </div>
    </div>
  )
}

// Строка машины с раскрывающейся детализацией
interface PreparationCarRowProps {
  car: CarType
}

function PreparationCarRow({ car }: PreparationCarRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: detail, isLoading } = useCarPreparation(isExpanded ? car.id : null)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Заголовок — кликабельный */}
      <button
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: car.colorTag }}
          />
          <div>
            <span className="font-medium">{car.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{car.licensePlate}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-bold ${car.preparationCost > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
            {car.preparationCost > 0 ? formatMoney(car.preparationCost) : '—'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Детализация при раскрытии */}
      {isExpanded && (
        <div className="border-t border-border p-3 sm:p-4 bg-muted/10">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader size="md" />
            </div>
          ) : detail ? (
            <div className="space-y-2">
              {/* Страховка */}
              {detail.insurance > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Страховка</span>
                  <span className="font-medium">{formatMoney(detail.insurance)}</span>
                </div>
              )}

              {/* Шины */}
              {detail.tires > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Шины</span>
                  <span className="font-medium">{formatMoney(detail.tires)}</span>
                </div>
              )}

              {/* Прочие расходы */}
              {detail.otherExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{expense.comment || 'Прочее'}</span>
                  <span className="font-medium">{formatMoney(expense.amount)}</span>
                </div>
              ))}

              {/* Если нет детализации */}
              {detail.insurance === 0 && detail.tires === 0 && detail.otherExpenses.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Нет детализации расходов</p>
              )}

              {/* Итого по машине */}
              {car.preparationCost > 0 && (
                <div className="flex items-center justify-between text-sm font-semibold pt-2 mt-2 border-t border-border/50">
                  <span>Итого</span>
                  <span className="text-blue-600">{formatMoney(car.preparationCost)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Ошибка загрузки данных</p>
          )}
        </div>
      )}
    </div>
  )
}

// Строка статистики машины
interface CarStatRowProps {
  rank: number
  stat: MonthlyStats
}

function CarStatRow({ rank, stat }: CarStatRowProps) {
  return (
    <div className="relative flex flex-col items-center p-4 bg-muted/30 rounded-lg gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Ранг — в левом углу на мобильных, слева на ПК */}
      <span className="absolute top-4 left-4 text-lg font-bold text-muted-foreground sm:static sm:w-8">#{rank}</span>
      {/* Название машины — по центру на мобильных */}
      <div className="flex items-center gap-2 sm:ml-0">
        <span
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: stat.colorTag }}
        />
        <span className="font-medium">{stat.carName}</span>
      </div>
      {/* Доход/Расход/Прибыль — колонкой по центру на мобильных, в строку на ПК */}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Доход:</span>
          <span className="font-medium text-green-600">+{formatMoney(stat.totalRental)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Расход:</span>
          <span className="font-medium text-red-600">-{formatMoney(stat.totalExpense)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Прибыль:</span>
          <span className={`font-bold ${stat.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatMoney(stat.totalProfit)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// COMPONENT: ПОМЕСЯЧНАЯ РАЗБИВКА ПО МАШИНЕ
// ================================================================

interface CarMonthlyBreakdownProps {
  carId: string
  carName: string
  monthlyData: MonthlyStats[]
}

function CarMonthlyBreakdown({ carName, monthlyData }: CarMonthlyBreakdownProps) {
  // Сортируем по месяцу
  const sortedData = [...monthlyData].sort((a, b) => a.month.localeCompare(b.month))

  if (sortedData.length === 0) {
    return null
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Заголовок */}
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: monthlyData[0]?.colorTag || '#888' }}
        />
        <h4 className="font-medium">{carName}</h4>
      </div>

      {/* Таблица помесячно */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Месяц</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Доход</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Расход</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Прибыль</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((stat) => {
              // Парсим месяц для красивого отображения
              const [year, month] = stat.month.split('-')
              const monthIndex = parseInt(month, 10) - 1
              const monthName = MONTHS_RU[monthIndex]?.slice(0, 3) || month
              const yearShort = year.slice(2) // "2026" → "26"

              return (
                <tr key={stat.month} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2 px-2">
                    <span className="font-medium">{monthName}</span>
                    <span className="text-muted-foreground ml-1">{yearShort}</span>
                  </td>
                  <td className="text-right py-2 px-2 text-green-600">
                    +{formatMoney(stat.totalRental)}
                  </td>
                  <td className="text-right py-2 px-2 text-red-600">
                    -{formatMoney(stat.totalExpense)}
                  </td>
                  <td className={`text-right py-2 px-2 font-medium ${stat.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMoney(stat.totalProfit)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENT: СТАТИСТИКА ВЫКУПА ПО МАШИНАМ
// ============================================================

function BuyoutCarsStats() {
  const { data: contracts, isLoading } = useBuyoutContracts()
  const { data: cars } = useCars()

  // Только активные договоры
  const activeContracts = (contracts || []).filter(
    c => (c.record.buyoutData?.status || 'active') === 'active'
  )

  if (isLoading) {
    return (
      <section>
        <Accordion type="single" collapsible className="w-full">
          <Accordion.Item value="buyout-stats">
            <Accordion.Header className="text-lg font-bold">
              🚗 СТАТИСТИКА ВЫКУПА
            </Accordion.Header>
            <Accordion.Content>
              <div className="flex justify-center py-8">
                <Loader size="md" />
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </section>
    )
  }

  if (activeContracts.length === 0) return null

  // Итоги по всем активным договорам
  const totalCarPrice = activeContracts.reduce((sum, c) => sum + (c.record.buyoutData?.carPrice || 0), 0)
  const totalPaid = activeContracts.reduce((sum, c) => sum + c.totalPaid, 0)
  const totalExpected = activeContracts.reduce((sum, c) => {
    const bd = c.record.buyoutData
    return sum + (bd ? calcBuyoutTotalSum(bd.carPrice || 0, bd.profitPercent || 0) : 0)
  }, 0)
  const totalRemaining = totalExpected - totalPaid
  const totalProfit = activeContracts.reduce((sum, c) => {
    const bd = c.record.buyoutData
    if (!bd) return sum
    return sum + Math.round((bd.carPrice || 0) * (bd.profitPercent || 0) / 100)
  }, 0)
  const earnedProfit = activeContracts.reduce((sum, c) => {
    const bd = c.record.buyoutData
    if (!bd || !bd.profitPercent) return sum
    return sum + calcBuyoutProfitShare(c.totalPaid, bd.profitPercent)
  }, 0)

  return (
    <section>
      <Accordion type="single" collapsible className="w-full">
        <Accordion.Item value="buyout-stats">
          <Accordion.Header className="text-lg font-bold">
            🚗 СТАТИСТИКА ВЫКУПА ({activeContracts.length} {activeContracts.length === 1 ? 'договор' : activeContracts.length < 5 ? 'договора' : 'договоров'})
          </Accordion.Header>
          <Accordion.Content>
            <div className="space-y-4">
              {/* Общая сводка */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center sm:justify-start text-sm py-1.5 px-3 rounded bg-orange-50 mb-3">
                  <h3 className="text-base font-black">ИТОГО ПО АКТИВНЫМ ДОГОВОРАМ</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Стоимость авто</p>
                    <p className="font-bold text-blue-600">{formatMoney(totalCarPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Общая сумма</p>
                    <p className="font-bold">{formatMoney(totalExpected)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Получено</p>
                    <p className="font-bold text-green-600">{formatMoney(totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Остаток</p>
                    <p className="font-bold">{formatMoney(totalRemaining)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ожидаемая прибыль</p>
                    <p className="font-bold text-green-600">+{formatMoney(totalProfit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Заработано прибыли</p>
                    <p className="font-bold text-green-600">+{formatMoney(earnedProfit)}</p>
                  </div>
                </div>
              </div>

              {/* Детализация по каждому договору */}
              <div className="space-y-2">
                {activeContracts.map((contract) => {
                  const bd = contract.record.buyoutData
                  if (!bd) return null

                  const car = cars?.find(c => c.id === contract.record.carId)
                  const totalSum = calcBuyoutTotalSum(bd.carPrice || 0, bd.profitPercent || 0)
                  const profit = Math.round((bd.carPrice || 0) * (bd.profitPercent || 0) / 100)
                  const earned = calcBuyoutProfitShare(contract.totalPaid, bd.profitPercent || 0)
                  const progress = totalSum > 0 ? Math.round((contract.totalPaid / totalSum) * 100) : 0

                  return (
                    <div key={contract.record.id} className="border border-border rounded-lg overflow-hidden">
                      <div className="p-3 sm:p-4">
                        {/* Заголовок — машина */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: contract.record.car.colorTag }}
                            />
                            <span className="font-medium">{contract.record.car.name}</span>
                            <span className="text-xs text-muted-foreground">{contract.record.car.licensePlate}</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                              Активен
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{contract.record.renterName || 'Клиент'}</p>
                          </div>
                        </div>

                        {/* Параметры */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          <div className="p-2 bg-muted/20 rounded text-center">
                            <p className="text-xs text-muted-foreground">Стоимость {car?.name ? `(${car.name})` : ''}</p>
                            <p className="font-bold text-sm text-blue-600">
                              {formatMoney(bd.carPrice || 0)}
                              <span className="text-green-600 text-xs ml-1">
                                | {formatMoney(bd.monthlyPayment)}
                              </span>
                            </p>
                          </div>
                          <div className="p-2 bg-muted/20 rounded text-center">
                            <p className="text-xs text-muted-foreground">Прибыль ({bd.profitPercent || 0}%)</p>
                            <p className="font-bold text-sm text-green-600">+{formatMoney(profit)}</p>
                          </div>
                          <div className="p-2 bg-muted/20 rounded text-center">
                            <p className="text-xs text-muted-foreground">Платёж/мес</p>
                            <p className="font-bold text-sm">{formatMoney(bd.monthlyPayment)}</p>
                          </div>
                          <div className="p-2 bg-muted/20 rounded text-center">
                            <p className="text-xs text-muted-foreground">Срок</p>
                            <p className="font-bold text-sm">{bd.termMonths} мес.</p>
                          </div>
                        </div>

                        {/* Прогресс */}
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            Оплачено: {formatMoney(contract.totalPaid)} из {formatMoney(totalSum)}
                          </span>
                          <span className="font-bold">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>

                        {/* Заработано */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Заработано прибыли: <span className="font-medium text-green-600">+{formatMoney(earned)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Остаток: {formatMoney(totalSum - contract.totalPaid)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </section>
  )
}

// ============================================================
// VIEW: КАССА
// ============================================================

interface CashViewProps {
  cashFlow?: { balance: number; totalIncome: number; totalExpense: number; totalSalary: number }
  salaryWithdrawals?: { 
    id: string
    amount: number
    withdrawalDate: string
    recipientName: string | null
    notes: string | null
    month: string | null
    percent: number
    grossIncome: number
    netProfit: number
    carId: string | null
    carName?: string
  }[]
}

function CashView({ cashFlow, salaryWithdrawals }: CashViewProps) {
  return (
    <div className="space-y-6">
      {/* Баланс кассы */}
      <section>
        <Card className="p-4 md:p-6 w-full">
          <div className="flex items-center gap-2 mb-6">
            <Banknote className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">КАССА ЗА ВСЕ ВРЕМЯ</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Баланс" value={cashFlow?.balance || 0} type="balance" />
            <StatCard label="Доходы" value={cashFlow?.totalIncome || 0} type="income" />
            <StatCard label="Расходы" value={cashFlow?.totalExpense || 0} type="expense" />
            <StatCard label="Зарплата" value={cashFlow?.totalSalary || 0} type="salary" />
          </div>
        </Card>
      </section>

      {/* Аккордеоны для действий */}
      <section className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {/* Вывести зарплату — новая версия без модалки */}
          <Accordion.Item value="salary">
            <Accordion.Header className="text-lg font-bold">
              ВЫПЛАТЫ ЗА МЕСЯЦ
            </Accordion.Header>
            <Accordion.Content>
              <PayoutForm salaryWithdrawals={salaryWithdrawals} />
            </Accordion.Content>
          </Accordion.Item>

          {/* История выплат */}
          <Accordion.Item value="history">
            <Accordion.Header className="text-lg font-bold">
              ИСТОРИЯ ВЫПЛАТ
            </Accordion.Header>
            <Accordion.Content>
              <PayoutHistory withdrawals={salaryWithdrawals} />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </section>
    </div>
  )
}

// ============================================================
// COMPONENT: ФОРМА ВЫПЛАТЫ
// ============================================================

interface PayoutFormProps {
  salaryWithdrawals?: CashViewProps['salaryWithdrawals']
}

function PayoutForm({ salaryWithdrawals }: PayoutFormProps) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // Выбранный месяц для выплаты
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedYear] = useState<number>(currentYear)
  
  // Выбранная машина (null = все машины)
  const [selectedCarId, setSelectedCarId] = useState<string>('all')
  
  // Процент выплаты
  const [percent, setPercent] = useState<string>('20')
  
  // Получаем список машин
  const { data: cars } = useCars()
  
  // Загружаем прибыль за выбранный месяц (с фильтром по машине)
  const carIdFilter = selectedCarId === 'all' ? null : selectedCarId
  const { data: profitData, isLoading } = useMonthlyProfit(selectedYear, selectedMonth, carIdFilter)
  const createSalary = useCreateSalaryWithdrawal()
  
  // Проверяем, была ли уже выплата за этот месяц (с учётом машины)
  // Сравниваем только по году-месяцу (первые 7 символов), т.к. DATE может вернуться с timezone
  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const monthPrefix = monthStr.substring(0, 7) // "2026-03"
  
  // Расчёт суммы выплаты
  // Учитываем ВСЕ уже сделанные выплаты за этот месяц и машину
  const existingPayoutsForMonth = salaryWithdrawals?.filter(w => 
    w.month && w.month.startsWith(monthPrefix) && 
    (carIdFilter === null ? w.carId === null : w.carId === carIdFilter)
  ) || []
  const totalAlreadyPaid = existingPayoutsForMonth.reduce((sum, w) => sum + w.amount, 0)
  
  const netProfit = profitData?.netProfit || 0
  const percentValue = parseInt(percent) || 0
  // Оставшаяся сумма для выплаты = чистая прибыль - уже выплаченное
  const remainingProfit = Math.max(0, netProfit - totalAlreadyPaid)
  const payoutAmount = Math.round(remainingProfit * percentValue / 100)
  
  // Название выбранной машины
  const selectedCarName = selectedCarId === 'all' 
    ? 'Все машины' 
    : cars?.find(c => c.id === selectedCarId)?.name || 'Машина'
  
  const handlePayout = async () => {
    if (!profitData || payoutAmount <= 0) return
    
    const data: SalaryFormData = {
      amount: payoutAmount,
      withdrawalDate: new Date().toISOString().split('T')[0],
      month: monthStr,
      percent: percentValue,
      grossIncome: profitData.grossIncome,
      netProfit: remainingProfit, // Сохраняем сумму ДО выплаты, чтобы в истории показывать правильно
      carId: selectedCarId === 'all' ? null : selectedCarId,
    }

    try {
      await createSalary.mutateAsync({ data, carName: selectedCarName })
    } catch (error) {
      console.error('Ошибка выплаты:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Выбор машины и месяца в одном ряду на больших экранах */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Выбор машины */}
        <div>
          <label className="block text-sm font-medium mb-2">Машина</label>
          <Select
            value={selectedCarId}
            onValueChange={setSelectedCarId}
          >
            <Select.Trigger className="w-full">
              <Select.Value placeholder="Выберите машину" />
            </Select.Trigger>
            <Select.Content position="popper" side="bottom">
              <Select.Item value="all">Все машины</Select.Item>
              {cars?.map((car) => (
                <Select.Item key={car.id} value={car.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: car.colorTag }}
                    />
                    {car.name} — {car.licensePlate}
                  </div>
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {/* Выбор месяца */}
        <div>
          <label className="block text-sm font-medium mb-2">Месяц</label>
          <Select
            value={String(selectedMonth)}
            onValueChange={(value) => setSelectedMonth(Number(value))}
          >
            <Select.Trigger className="w-full">
              <Select.Value placeholder="Выберите месяц" />
            </Select.Trigger>
            <Select.Content position="popper" side="bottom">
              {MONTHS_RU.map((monthName, index) => (
                <Select.Item key={index + 1} value={String(index + 1)}>
                  {monthName} {selectedYear}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      {/* Информация о прибыли */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader size="md" />
        </div>
      ) : profitData && (
        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          {/* Заголовок с названием машины */}
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{selectedCarName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Валовый доход:</span>
            <span className="font-medium text-green-600">+{formatMoney(profitData.grossIncome)}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-muted-foreground">
              <span className="sm:hidden">Расходы:<br />(без страховки/шин)</span>
              <span className="hidden sm:inline">Расходы (без страховки/шин):</span>
            </span>
            <span className="font-medium text-red-600">-{formatMoney(profitData.totalExpense)}</span>
          </div>
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Чистая прибыль:</span>
              <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(netProfit)}
              </span>
            </div>
            {totalAlreadyPaid > 0 && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">Уже выплачено:</span>
                <span className="text-sm text-orange-600">−{formatMoney(totalAlreadyPaid)}</span>
              </div>
            )}
            {totalAlreadyPaid > 0 && (
              <div className="flex justify-between items-center mt-1">
                <span className="font-medium">Остаток:</span>
                <span className={`font-bold text-lg ${remainingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(remainingProfit)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Процент выплаты */}
      <div>
        <label className="block text-sm font-medium mb-2">Процент выплаты</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            max="100"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="w-24"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </div>

      {/* Сумма к выплате */}
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Сумма к выплате:</span>
          <span className="font-bold text-xl text-green-600">
            {formatMoney(payoutAmount)}
          </span>
        </div>
        {netProfit > 0 && percentValue > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {totalAlreadyPaid > 0 && (
              <span className="line-through mr-1">{formatMoney(netProfit)}</span>
            )}
            {totalAlreadyPaid > 0 && (
              <span className="mr-1">{formatMoney(remainingProfit)}</span>
            )}
            {totalAlreadyPaid > 0 && <span className="mr-1">(−{formatMoney(totalAlreadyPaid)})</span>}
            {totalAlreadyPaid > 0 && <span className="mr-1">×</span>}
            {formatMoney(totalAlreadyPaid > 0 ? remainingProfit : netProfit)} × {percentValue}% = {formatMoney(payoutAmount)}
          </p>
        )}
      </div>

      {/* Кнопки */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setPercent('20')
            setSelectedMonth(currentMonth)
            setSelectedCarId('all')
          }}
        >
          Сбросить
        </Button>
        <Button
          className="flex-1"
          onClick={handlePayout}
          disabled={payoutAmount <= 0 || createSalary.isPending}
        >
          {createSalary.isPending ? 'Выплата...' : 'Вывести'}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENT: ИСТОРИЯ ВЫПЛАТ
// ============================================================

interface PayoutHistoryProps {
  withdrawals?: CashViewProps['salaryWithdrawals']
}

function PayoutHistory({ withdrawals }: PayoutHistoryProps) {
  const { data: cars } = useCars()
  const deleteSalary = useDeleteSalaryWithdrawal()

  // Фильтр по машине
  const [filterCarId, setFilterCarId] = useState<string>('all')

  // Состояние модалки подтверждения удаления
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    index: number
    amount: number
    date: string
  } | null>(null)

  if (!withdrawals || withdrawals.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          История выплат пуста
        </p>
      </div>
    )
  }

  // Фильтруем только выплаты с месяцем (новый формат)
  const payouts = withdrawals.filter(w => w.month)

  // Фильтруем по машине
  const filteredPayouts =
    filterCarId === 'all'
      ? payouts
      : filterCarId === '__global__'
        ? payouts.filter(w => w.carId === null)
        : payouts.filter(w => w.carId === filterCarId)

  // Получить информацию о машине по carId
  const getCar = (carId: string | null) => {
    if (!carId || !cars) return null
    return cars.find(c => c.id === carId) || null
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteSalary.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch (error) {
      console.error('Ошибка удаления:', error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Фильтр по машине */}
      <div className="flex items-center gap-2">
        <Select
          value={filterCarId}
          onValueChange={setFilterCarId}
        >
          <Select.Trigger className="w-full sm:w-64">
            <Select.Value placeholder="Все машины" />
          </Select.Trigger>
          <Select.Content position="popper" side="bottom">
            <Select.Item value="all">Все машины</Select.Item>
            <Select.Item value="__global__">
              <span className="flex items-center gap-2">
                <Layers className="w-3 h-3" />
                Только общие (за все машины)
              </span>
            </Select.Item>
            {cars?.map((car) => (
              <Select.Item key={car.id} value={car.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: car.colorTag }}
                  />
                  {car.name} — {car.licensePlate}
                </div>
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        {filterCarId !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterCarId('all')}
          >
            Сбросить
          </Button>
        )}
      </div>

      {/* Список выплат */}
      {filteredPayouts.length > 0 ? (
        <div className="space-y-2">
          {filteredPayouts.map((payout, index) => {
            const remaining = payout.netProfit - payout.amount
            const car = getCar(payout.carId)
            const isGlobal = payout.carId === null

            return (
              <div
                key={payout.id}
                className={`bg-white border rounded-lg overflow-hidden ${
                  isGlobal ? 'border-purple-200' : 'border-border'
                }`}
              >
                {/* Ряд 1: Шапка — тип выплаты + дата + удалить */}
                <div
                   className={`flex items-center gap-2 px-3 py-2 border-b ${
                     isGlobal
                       ? 'bg-purple-50 border-purple-100'
                       : 'bg-green-50 border-green-100'
                   }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isGlobal
                        ? 'bg-purple-200 text-purple-800'
                        : 'bg-green-200 text-green-800'
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-bold text-sm">ВЫПЛАТА</span>
                  <span className="text-xs text-muted-foreground tabular-nums">от {new Date(payout.withdrawalDate).toLocaleDateString('ru-RU')}</span>
                  <span className="text-muted-foreground/40 select-none">|</span>
                  <span className="text-xs text-muted-foreground/60">#{index + 1}</span>
                  <span className="flex-1" />
                  <button
                    onClick={() =>
                      setConfirmDelete({
                        id: payout.id,
                        index: index + 1,
                        amount: payout.amount,
                        date: new Date(payout.withdrawalDate).toLocaleDateString('ru-RU'),
                      })
                    }
                    className="p-1 text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                    title="Удалить выплату"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Тело: машина, расчёт, остаток */}
                <div className="px-3 py-2.5 text-sm">
                  {/* Машина или "За все машины" */}
                  <div className="mb-2">
                    {isGlobal ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                        <Layers className="w-3 h-3" />
                        За все машины
                      </span>
                    ) : car ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: car.colorTag }}
                        />
                        <span className="font-medium">{car.name}</span>
                        <span className="text-muted-foreground">({car.licensePlate})</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Расчёт */}
                  <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="font-medium text-foreground tabular-nums">
                      {formatMoney(payout.netProfit)}
                    </span>
                    <span className="text-muted-foreground">−</span>
                    <span className="font-medium text-foreground tabular-nums">{payout.percent}%</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-bold text-green-600 text-base tabular-nums">
                      {formatMoney(payout.amount)}
                    </span>
                  </div>

                  {/* Остаток */}
                  <div className="mt-1.5 text-xs">
                    <span className="text-muted-foreground">Остаток: </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        remaining > 0 ? 'text-orange-600' : 'text-muted-foreground'
                      }`}
                    >
                      {formatMoney(remaining)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-center py-4 text-muted-foreground">
          Нет выплат за выбранный период
        </p>
      )}


      {/* Модалка подтверждения удаления */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <Dialog.Content className="max-w-sm">
          <Dialog.Header className="text-center">Удалить выплату?</Dialog.Header>
          <div className="space-y-3 px-4 py-3 text-sm">
            <p className="text-center text-muted-foreground">
              Выплата #{confirmDelete?.index} на сумму{' '}
              <span className="font-bold text-foreground">
                {confirmDelete && formatMoney(confirmDelete.amount)}
              </span>{' '}
              от <span className="font-medium text-foreground">{confirmDelete?.date}</span> будет удалена.
            </p>
            <p className="text-xs text-muted-foreground text-center border-t border-border pt-3">
              Статистика автопарка (доходы, остатки, ROI) пересчитается автоматически.
              Это не отменяет саму выплату задним числом.
            </p>
          </div>
          <div className="flex gap-2 p-4 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="flex-1"
              disabled={deleteSalary.isPending}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={deleteSalary.isPending}
            >
              {deleteSalary.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog>
    </div>
  )
}

// ============================================================
// VIEW: БУХГАЛТЕРИЯ
// ============================================================

// Схема валидации
const companySettingsSchema = z.object({
  // Данные компании (ООО)
  companyName: z.string().min(1, 'Название компании обязательно'),
  legalAddress: z.string().optional(),
  postalAddress: z.string().optional(),
  inn: z.string().optional(),
  kpp: z.string().optional(),
  bankName: z.string().optional(),
  checkingAccount: z.string().optional(),
  correspondentAccount: z.string().optional(),
  bik: z.string().optional(),
  
  // Представитель компании
  representativeName: z.string().optional(),
  representativePosition: z.string().optional(),
  representativeBasis: z.string().optional(),
  
  // Данные владельца (физлицо)
  ownerFullName: z.string().optional(),
  ownerBirthDate: z.string().optional(),
  ownerPassportSeries: z.string().optional(),
  ownerPassportNumber: z.string().optional(),
  ownerPassportIssuedBy: z.string().optional(),
  ownerPassportIssueDate: z.string().optional(),
  ownerRegistrationAddress: z.string().optional(),
  ownerPostalAddress: z.string().optional(),
  ownerPhone: z.string().optional(),
})

function AccountingView() {
  const { data: settings, isLoading, isError } = useCompanySettings()
  const { mutate: saveSettings, isPending } = useUpdateCompanySettings()
  const [showChangePassword, setShowChangePassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: '',
      legalAddress: '',
      postalAddress: '',
      inn: '',
      kpp: '',
      bankName: '',
      checkingAccount: '',
      correspondentAccount: '',
      bik: '',
      representativeName: '',
      representativePosition: '',
      representativeBasis: '',
      ownerFullName: '',
      ownerBirthDate: '',
      ownerPassportSeries: '',
      ownerPassportNumber: '',
      ownerPassportIssuedBy: '',
      ownerPassportIssueDate: '',
      ownerRegistrationAddress: '',
      ownerPostalAddress: '',
      ownerPhone: '',
    },
  })

  // Заполняем форму данными из БД при загрузке
  useEffect(() => {
    if (settings) {
      reset({
        companyName: settings.companyName || '',
        legalAddress: settings.legalAddress || '',
        postalAddress: settings.postalAddress || '',
        inn: settings.inn || '',
        kpp: settings.kpp || '',
        bankName: settings.bankName || '',
        checkingAccount: settings.checkingAccount || '',
        correspondentAccount: settings.correspondentAccount || '',
        bik: settings.bik || '',
        representativeName: settings.representativeName || '',
        representativePosition: settings.representativePosition || '',
        representativeBasis: settings.representativeBasis || '',
        ownerFullName: settings.ownerFullName || '',
        ownerBirthDate: settings.ownerBirthDate || '',
        ownerPassportSeries: settings.ownerPassportSeries || '',
        ownerPassportNumber: settings.ownerPassportNumber || '',
        ownerPassportIssuedBy: settings.ownerPassportIssuedBy || '',
        ownerPassportIssueDate: settings.ownerPassportIssueDate || '',
        ownerRegistrationAddress: settings.ownerRegistrationAddress || '',
        ownerPostalAddress: settings.ownerPostalAddress || '',
        ownerPhone: settings.ownerPhone || '',
      })
    }
  }, [settings, reset])

  const onSubmit = (data: CompanySettingsFormData) => {
    saveSettings(data, {
      onSuccess: () => {
        toast.success('Настройки сохранены')
      },
      onError: (error) => {
        toast.error(`Ошибка сохранения: ${error.message}`)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-500">
        Ошибка загрузки настроек
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Данные компании (ООО) - Арендатор */}
        <Section
          icon={<Building2 className="w-5 h-5" />}
          title="Данные компании (Арендатор)"
          description="Информация о компании для договоров"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Название компании"
              required
              error={errors.companyName?.message}
              {...register('companyName')}
            />
            <FormField
              label="ИНН"
              {...register('inn')}
            />
            <FormField
              label="КПП"
              {...register('kpp')}
            />
            <div className="md:col-span-2">
              <FormField
                label="Юридический адрес"
                {...register('legalAddress')}
              />
            </div>
            <div className="md:col-span-2">
              <FormField
                label="Почтовый адрес"
                {...register('postalAddress')}
              />
            </div>
          </div>
        </Section>

        {/* Банковские реквизиты */}
        <Section
          icon={<CreditCard className="w-5 h-5" />}
          title="Банковские реквизиты"
          description="Реквизиты для счетов и договоров"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormField
                label="Название банка"
                {...register('bankName')}
              />
            </div>
            <FormField
              label="Расчётный счёт"
              {...register('checkingAccount')}
            />
            <FormField
              label="Корр. счёт"
              {...register('correspondentAccount')}
            />
            <FormField
              label="БИК"
              {...register('bik')}
            />
          </div>
        </Section>

        {/* Представитель компании */}
        <Section
          icon={<FileText className="w-5 h-5" />}
          title="Представитель компании"
          description="Данные подписанта договоров от компании"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="ФИО представителя"
              {...register('representativeName')}
            />
            <FormField
              label="Должность"
              {...register('representativePosition')}
            />
            <div className="md:col-span-2">
              <FormField
                label="Действует на основании"
                placeholder="Устава"
                {...register('representativeBasis')}
              />
            </div>
          </div>
        </Section>

        {/* Данные владельца (физлицо) - Арендодатель */}
        <Section
          icon={<User className="w-5 h-5" />}
          title="Данные владельца (Арендодатель)"
          description="Данные собственника автопарка для договоров"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormField
                label="ФИО владельца"
                {...register('ownerFullName')}
              />
            </div>
            <FormField
              label="Дата рождения"
              type="date"
              {...register('ownerBirthDate')}
            />
            <FormField
              label="Телефон"
              type="tel"
              {...register('ownerPhone')}
            />
            <FormField
              label="Серия паспорта"
              placeholder="1234"
              {...register('ownerPassportSeries')}
            />
            <FormField
              label="Номер паспорта"
              placeholder="567890"
              {...register('ownerPassportNumber')}
            />
            <div className="md:col-span-2">
              <FormField
                label="Кем выдан"
                {...register('ownerPassportIssuedBy')}
              />
            </div>
            <FormField
              label="Дата выдачи"
              type="date"
              {...register('ownerPassportIssueDate')}
            />
            <div className="md:col-span-2">
              <FormField
                label="Адрес регистрации"
                {...register('ownerRegistrationAddress')}
              />
            </div>
            <div className="md:col-span-2">
              <FormField
                label="Почтовый адрес"
                {...register('ownerPostalAddress')}
              />
            </div>
          </div>
        </Section>

        {/* Кнопки */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || isPending}
          >
            Отменить
          </Button>
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </div>
      </form>

      {/* Смена пароля */}
      <div className="border-2 border-border bg-card p-4 md:p-6 rounded-none mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-primary">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-head text-lg">Безопасность</h2>
            <p className="text-sm text-muted-foreground">Смена пароля для входа</p>
          </div>
        </div>
        {/* Кнопка смены пароля — скрыта в демо */}
        {false && (
          <Button
            variant="outline"
            onClick={() => setShowChangePassword(true)}
          >
            Сменить пароль
          </Button>
        )}
      </div>

      {/* Модалка смены пароля — скрыта в демо */}
      {false && (
        <ChangePasswordModal
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  )
}

// Вспомогательные компоненты для AccountingView

interface SectionProps {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}

function Section({ icon, title, description, children }: SectionProps) {
  return (
    <div className="border-2 border-border bg-card p-4 md:p-6 rounded-none">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-primary">{icon}</div>
        <div>
          <h2 className="font-head text-lg">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

function FormField({ label, error, className = '', ...props }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <Input
        className={`${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ============================================================
// VIEW: КЛИЕНТЫ
// ============================================================

function ClientsView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [ownerNotes, setOwnerNotes] = useState('')
  const [originalNotes, setOriginalNotes] = useState('') // Исходное значение при редактировании
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null) // Какое поле скопировано
  
  // Поиск клиентов
  const { data: searchResults, isLoading: searchLoading } = useClientSearch(searchQuery)
  
  // История выбранного клиента
  const { data: clientHistory, isLoading: historyLoading } = useClientHistory(selectedClient?.id || null)
  
  // Обновление клиента
  const updateClientMutation = useUpdateClient()
  
  // Данные компании для генерации документов
  const { data: companySettings } = useCompanySettings()
  
  // Список машин для генерации документов
  const { data: cars } = useCars()
  
  // Синхронизируем ownerNotes с выбранным клиентом
  useEffect(() => {
    if (selectedClient) {
      setOwnerNotes(selectedClient.notes || '')
    } else {
      setOwnerNotes('')
    }
    setIsEditingNotes(false)
  }, [selectedClient])
  
  // Обработчик выбора клиента
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client)
    setSearchQuery('')
    setIsDropdownOpen(false)
  }
  
  // Сброс выбора
  const handleClearSelection = () => {
    setSelectedClient(null)
    setSearchQuery('')
    setOwnerNotes('')
    setIsEditingNotes(false)
    setCopiedField(null)
  }
  
  // Копирование в буфер обмена
  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2000) // Сброс через 2 сек
    } catch (error) {
      console.error('Ошибка копирования:', error)
    }
  }
  
  // Начать редактирование заметок
  const handleStartEditNotes = () => {
    const currentNotes = selectedClient?.notes || ''
    setOriginalNotes(currentNotes) // Сохраняем исходное значение
    setOwnerNotes(currentNotes)
    setIsEditingNotes(true)
  }
  
  // Отменить редактирование заметок
  const handleCancelEditNotes = () => {
    setOwnerNotes(originalNotes) // Восстанавливаем исходное значение
    setIsEditingNotes(false)
  }
  
  // Сохранить заметки
  const handleSaveNotes = async () => {
    if (!selectedClient) return
    
    try {
      await updateClientMutation.mutateAsync({
        id: selectedClient.id,
        data: {
          lastName: selectedClient.lastName,
          firstName: selectedClient.firstName,
          middleName: selectedClient.middleName || undefined,
          phone: selectedClient.phone || undefined,
          birthDate: selectedClient.birthDate || undefined,
          passportSeries: selectedClient.passportSeries || undefined,
          passportNumber: selectedClient.passportNumber || undefined,
          passportIssuedBy: selectedClient.passportIssuedBy || undefined,
          passportIssueDate: selectedClient.passportIssueDate || undefined,
          registrationAddress: selectedClient.registrationAddress || undefined,
          notes: ownerNotes || undefined,
        },
      })
      toast.success('Комментарий сохранён')
      setIsEditingNotes(false)
    } catch (error) {
      toast.error('Ошибка сохранения')
      console.error(error)
    }
  }
  
  // Вычисляем сводку по клиенту — используем summary из API если есть
  const summary = useMemo(() => {
    if (!clientHistory) return null
    // API возвращает { entries, summary }, используем готовую summary
    return clientHistory.summary
  }, [clientHistory])
  
  // Записи истории
  const historyEntries = clientHistory?.entries ?? []
  
  return (
    <div className="space-y-6">
      {/* Поиск клиентов */}
      <section>
        <Card className="p-4 md:p-6 w-full">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">ПОИСК КЛИЕНТОВ</h2>
          </div>
          
          {/* Поле поиска */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по телефону или ФИО"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="pl-10"
                />
              </div>
              {selectedClient && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                >
                  <X className="w-4 h-4 mr-1" />
                  Сбросить
                </Button>
              )}
            </div>
            
            {/* Выпадающий список результатов */}
            {isDropdownOpen && searchQuery.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center">
                    <Loader size="sm" />
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map((client) => (
                      <button
                        key={client.id}
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                        onClick={() => handleSelectClient(client)}
                      >
                        <div className="font-medium">{client.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.phone}
                          {client.passportNumber && (
                            <span className="ml-2">• Паспорт: {client.passportNumber}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Клиенты не найдены
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Выбранный клиент */}
          {selectedClient && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{selectedClient.fullName}</h3>
                      <button
                        onClick={() => handleCopy(selectedClient.fullName, 'name')}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Копировать ФИО"
                      >
                        {copiedField === 'name' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">{selectedClient.phone}</p>
                      <button
                        onClick={() => handleCopy(selectedClient.phone || '', 'phone')}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Копировать телефон"
                      >
                        {copiedField === 'phone' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {selectedClient.passportNumber && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Паспорт: {selectedClient.passportNumber}
                        {selectedClient.passportIssuedBy && (
                          <span className="ml-2">• Выдан: {selectedClient.passportIssuedBy}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* О клиенте */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-black" />
                    <p className="text-sm font-medium text-black">О клиенте</p>
                  </div>
                  {!isEditingNotes && (
                    <button
                      onClick={handleStartEditNotes}
                      className="p-1 text-purple-500 hover:text-purple-600 transition-colors"
                      title="Редактировать комментарий"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={ownerNotes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOwnerNotes(e.target.value)}
                      placeholder="Добавьте комментарий о клиенте..."
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditNotes}
                        disabled={updateClientMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={updateClientMutation.isPending}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm ${ownerNotes ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                    {ownerNotes || 'Нет комментария'}
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      </section>
      
      {/* Сводка по клиенту */}
      {summary && (
        <section>
          <Card className="p-4 md:p-6 w-full">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">СТАТИСТИКА КЛИЕНТА</h2>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Всего аренд</p>
                <p className="text-xl md:text-2xl font-bold">{summary.totalRentals}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Всего дней</p>
                <p className="text-xl md:text-2xl font-bold">{summary.totalDays}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Общая сумма</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">
                  {formatMoney(summary.totalAmount)}
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Машин</p>
                <p className="text-xl md:text-2xl font-bold">{summary.carsUsed.length}</p>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Первая аренда:</span>{' '}
                {formatDate(summary.firstRentalDate)}
              </div>
              <div>
                <span className="font-medium">Последняя аренда:</span>{' '}
                {formatDate(summary.lastRentalDate)}
              </div>
            </div>
            
            {/* Список машин */}
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Арендованные машины:</p>
              <div className="flex flex-wrap gap-2">
                {summary.carsUsed.map((carName) => (
                  <span
                    key={carName}
                    className="px-2 py-1 bg-muted/50 rounded text-sm"
                  >
                    {carName}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </section>
      )}
      
      {/* История аренд клиента */}
      {selectedClient && (
        <section>
          <Card className="p-4 md:p-6 w-full">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">ИСТОРИЯ АРЕНД</h2>
            </div>
            
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader size="lg" />
              </div>
            ) : historyEntries.length > 0 ? (
              <div className="space-y-4">
                {historyEntries.map((record) => (
                  <ClientHistoryRow 
                    key={record.recordId} 
                    record={record} 
                    client={selectedClient}
                    companySettings={companySettings}
                    cars={cars || []}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  История аренд пуста
                </p>
              </div>
            )}
          </Card>
        </section>
      )}
      
    </div>
  )
}

// ============================================================
// COMPONENT: СТРОКА ИСТОРИИ АРЕНДЫ КЛИЕНТА
// ============================================================

interface ClientHistoryRowProps {
  record: ClientHistoryEntry
  client: Client | null
  companySettings: CompanySettings | null | undefined
  cars: CarType[]
}

function ClientHistoryRow({ record, client, companySettings, cars }: ClientHistoryRowProps) {
  // Состояние для отслеживания генерации документов
  const [isGeneratingContract, setIsGeneratingContract] = useState(false)
  const [isGeneratingFullContract, setIsGeneratingFullContract] = useState(false)
  const [isGeneratingServiceAct, setIsGeneratingServiceAct] = useState(false)
  const [isGeneratingBuyout, setIsGeneratingBuyout] = useState(false)
  
  const isBuyout = record.recordType === 'buyout'
  const isBuyoutPayment = record.recordType === 'buyout_payment'
  
  // Получаем машину по ID
  const car = cars.find(c => c.id === record.carId)
  
  // Вычисляем кол-во дней и цену за сутки
  const daysCount = useMemo(() => {
    if (!record.startDate || !record.endDate) return 0
    const start = new Date(record.startDate + 'T12:00:00')
    const end = new Date(record.endDate + 'T12:00:00')
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }, [record.startDate, record.endDate])
  
  const dailyPrice = daysCount > 0 ? record.rentalAmount / daysCount : 0
  
  // Форматирование дат: 2.03 - 5.03.26
  const formatBookingDates = () => {
    if (!record.startDate || !record.endDate) return null
    
    const start = new Date(record.startDate + 'T12:00:00')
    const end = new Date(record.endDate + 'T12:00:00')
    
    const startStr = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })
    const endStr = end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: '2-digit' })
    
    return `${startStr} - ${endStr}`
  }
  
  const bookingDates = formatBookingDates()
  
  // Генерация акта приёма-передачи
  const handleGenerateContract = async () => {
    if (!car) {
      alert('Машина не найдена')
      return
    }
    
    if (!client) {
      alert('Данные клиента не найдены')
      return
    }
    
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    setIsGeneratingContract(true)
    try {
      await generateContractDocument({
        // Данные авто
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carPrice: car.purchasePrice || 0,
        
        // Данные клиента
        client: {
          fullName: client.fullName,
          birthDate: client.birthDate || '',
          phone: client.phone || '',
          passportSeries: client.passportSeries || '',
          passportNumber: client.passportNumber || '',
          passportIssuedBy: client.passportIssuedBy || '',
          passportIssueDate: client.passportIssueDate || '',
          registrationAddress: client.registrationAddress || '',
        },
        
        // Данные аренды
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        startDate: record.startDate || record.recordDate,
        endDate: record.endDate || record.recordDate,
        dailyPrice: dailyPrice,
        totalAmount: record.rentalAmount,
        deposit: record.deposit || 0,
        
        // Данные владельца
        owner: {
          fullName: companySettings.ownerFullName || '',
          birthDate: companySettings.ownerBirthDate || '',
          passportSeries: companySettings.ownerPassportSeries || '',
          passportNumber: companySettings.ownerPassportNumber || '',
          passportIssuedBy: companySettings.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings.ownerPassportIssueDate || '',
          registrationAddress: companySettings.ownerRegistrationAddress || '',
          phone: companySettings.ownerPhone || '',
        },
      })
    } catch (error) {
      console.error('Ошибка генерации акта:', error)
      alert('Ошибка при генерации акта')
    } finally {
      setIsGeneratingContract(false)
    }
  }
  
  // Генерация полного договора аренды
  const handleGenerateFullContract = async () => {
    if (!car) {
      alert('Машина не найдена')
      return
    }
    
    if (!client) {
      alert('Данные клиента не найдены')
      return
    }
    
    if (!companySettings) {
      alert('Сначала заполните данные компании в разделе "Бухгалтерия"')
      return
    }
    
    if (!companySettings.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    setIsGeneratingFullContract(true)
    try {
      await generateSimpleRentalContractDocument({
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carStsSeries: '',
        carStsNumber: '',
        carStsDate: '',
        client: {
          fullName: client.fullName,
          birthDate: client.birthDate || '',
          phone: client.phone || '',
          passportSeries: client.passportSeries || '',
          passportNumber: client.passportNumber || '',
          passportIssuedBy: client.passportIssuedBy || '',
          passportIssueDate: client.passportIssueDate || '',
          registrationAddress: client.registrationAddress || '',
        },
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        contractCity: 'Волгодонск',
        startDate: record.startDate || record.recordDate,
        startTime: '17 час(ов) 00 минут',
        termDays: daysCount,
        dailyPrice: dailyPrice,
        deposit: record.deposit || 0,
        deliveryAddress: '',
        owner: {
          fullName: companySettings.ownerFullName || '',
          birthDate: companySettings.ownerBirthDate || '',
          passportSeries: companySettings.ownerPassportSeries || '',
          passportNumber: companySettings.ownerPassportNumber || '',
          passportIssuedBy: companySettings.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings.ownerPassportIssueDate || '',
          registrationAddress: companySettings.ownerRegistrationAddress || '',
          phone: companySettings.ownerPhone || '',
        },
      })
    } catch (error) {
      console.error('Ошибка генерации договора:', error)
      alert('Ошибка при генерации договора')
    } finally {
      setIsGeneratingFullContract(false)
    }
  }
  
  // Генерация акта выполненных работ
  const handleGenerateServiceAct = async () => {
    if (!car) {
      alert('Машина не найдена')
      return
    }
    
    if (!client) {
      alert('Данные клиента не найдены')
      return
    }
    
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    setIsGeneratingServiceAct(true)
    try {
      await generateServiceActDocument({
        // Номер акта
        actNumber: generateContractNumber().replace('ККР-', 'А-'),
        actDate: record.recordDate,
        
        // Данные договора
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        
        // Исполнитель (владелец)
        executor: {
          fullName: companySettings.ownerFullName || '',
          phone: companySettings.ownerPhone || '',
        },
        
        // Заказчик (клиент)
        customer: {
          fullName: client.fullName,
          phone: client.phone || undefined,
        },
        
        // Данные аренды
        startDate: record.startDate || record.recordDate,
        endDate: record.endDate || record.recordDate,
        dailyPrice: dailyPrice,
        totalAmount: record.rentalAmount,
        rentalDays: daysCount,
        
        // Данные авто
        carName: car.name,
        carLicensePlate: car.licensePlate,
      })
    } catch (error) {
      console.error('Ошибка генерации акта:', error)
      alert('Ошибка при генерации акта')
    } finally {
      setIsGeneratingServiceAct(false)
    }
  }
  
  // Генерация договора выкупа
  const handleGenerateBuyoutContract = async () => {
    if (!car) {
      alert('Машина не найдена')
      return
    }
    
    if (!client) {
      alert('Данные клиента не найдены')
      return
    }
    
    if (!companySettings?.ownerFullName) {
      alert('В настройках не указаны данные собственника. Заполните их в разделе "Бухгалтерия"')
      return
    }
    
    if (!record.buyoutData) {
      alert('Данные договора выкупа не найдены')
      return
    }
    
    setIsGeneratingBuyout(true)
    try {
      const bd = record.buyoutData
      await generateBuyoutContractDocument({
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carStsSeries: bd.stsSeries || '',
        carStsNumber: bd.stsNumber || '',
        carStsDate: bd.stsDate || '',
        client: {
          fullName: client.fullName,
          birthDate: client.birthDate || '',
          phone: client.phone || '',
          passportSeries: client.passportSeries || '',
          passportNumber: client.passportNumber || '',
          passportIssuedBy: client.passportIssuedBy || '',
          passportIssueDate: client.passportIssueDate || '',
          registrationAddress: client.registrationAddress || '',
          driverLicenseSeries: bd.driverLicenseSeries || client.driverLicenseSeries || '',
          driverLicenseNumber: bd.driverLicenseNumber || client.driverLicenseNumber || '',
        },
        owner: {
          fullName: companySettings.ownerFullName || '',
          birthDate: companySettings.ownerBirthDate || '',
          passportSeries: companySettings.ownerPassportSeries || '',
          passportNumber: companySettings.ownerPassportNumber || '',
          passportIssuedBy: companySettings.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings.ownerPassportIssueDate || '',
          registrationAddress: companySettings.ownerRegistrationAddress || '',
          phone: companySettings.ownerPhone || '',
        },
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        contractCity: bd.contractCity || '',
        startDate: record.startDate || record.recordDate,
        paymentDay: record.startDate ? new Date(record.startDate + 'T12:00:00').getDate() : new Date().getDate(),
        termMonths: bd.termMonths,
        monthlyPayment: bd.monthlyPayment,
        buyoutPrice: bd.buyoutPrice || calcBuyoutTotalSum(bd.carPrice || 0, bd.profitPercent || 0),
        deposit: record.deposit || 0,
        deliveryAddress: bd.deliveryAddress || '',
        startTime: bd.startTime || '',
        relatives: bd.relatives || [],
      })
    } catch (error) {
      console.error('Ошибка генерации договора выкупа:', error)
      alert('Ошибка при генерации договора выкупа')
    } finally {
      setIsGeneratingBuyout(false)
    }
  }
  
  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      {/* Заголовок с датой записи */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm sm:text-base">
            {formatDate(record.recordDate)}
          </p>
          {isBuyout && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
              🚗 Выкуп
            </span>
          )}
          {isBuyoutPayment && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
              💰 Выкуп
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-bold text-lg text-green-600">
            {formatMoney(record.rentalAmount)}
          </span>
          {isBuyout && record.buyoutData && (
            <p className="text-xs text-muted-foreground">
              {record.buyoutData.termMonths} мес. × {formatMoney(record.buyoutData.monthlyPayment)}/мес.
            </p>
          )}
        </div>
      </div>
      
      {/* Информация о машине */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-green-50">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: record.carColorTag }}
            />
            <span className="font-semibold">{record.carName}</span>
            <span className="text-muted-foreground text-xs">
              {record.licensePlate}
            </span>
          </div>
        </div>
        
        {/* Даты бронирования */}
        {bookingDates && (
          <div className="ml-5 mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span>{bookingDates}</span>
          </div>
        )}
        
        {/* Залог */}
        {record.deposit > 0 && (
          <div className="ml-5 mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Залог: {formatMoney(record.deposit)}
          </div>
        )}
        
        {/* Заметки */}
        {record.notes && (
          <div className="ml-5 mt-2 text-xs text-muted-foreground italic">
            {record.notes}
          </div>
        )}
      </div>
      
      {/* Кнопки генерации документов */}
      {isBuyout ? (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-orange-500 text-orange-700 hover:bg-orange-100"
            onClick={handleGenerateBuyoutContract}
            disabled={isGeneratingBuyout}
          >
            {isGeneratingBuyout ? '⏳ Генерация...' : '📄 Печать договора выкупа'}
          </Button>
        </div>
      ) : bookingDates && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-blue-500 text-blue-700 hover:bg-blue-100"
            onClick={handleGenerateFullContract}
            disabled={isGeneratingContract || isGeneratingFullContract || isGeneratingServiceAct}
          >
            {isGeneratingFullContract ? '⏳ Генерация...' : '📄 Печать договора аренды'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-green-500 text-green-700 hover:bg-green-100"
            onClick={handleGenerateContract}
            disabled={isGeneratingContract || isGeneratingFullContract || isGeneratingServiceAct}
          >
            {isGeneratingContract ? '⏳ Генерация...' : '📋 Печать акта приёма-передачи'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-purple-500 text-purple-700 hover:bg-purple-100"
            onClick={handleGenerateServiceAct}
            disabled={isGeneratingContract || isGeneratingFullContract || isGeneratingServiceAct}
          >
            {isGeneratingServiceAct ? '⏳ Генерация...' : '📝 Печать акта выполненных работ'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// VIEW: ВЫКУП
// ============================================================

function BuyoutView() {
  const { data: contracts, isLoading } = useBuyoutContracts()
  const { data: companySettings } = useCompanySettings()
  const { data: cars } = useCars()
  const createPayment = useCreateBuyoutPayment()
  
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    contractId: string | null
    carId: string | null
    monthlyPayment: number
    carName: string
  }>({ isOpen: false, contractId: null, carId: null, monthlyPayment: 0, carName: '' })
  
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [hideClosed, setHideClosed] = useState(false)
  
  // Фильтрация договоров — скрываем закрытые при необходимости
  const allContracts = contracts || []
  const visibleContracts = hideClosed
    ? allContracts.filter(c => (c.record.buyoutData?.status || 'active') === 'active')
    : allContracts
  const closedCount = allContracts.filter(c => (c.record.buyoutData?.status || 'active') !== 'active').length
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    )
  }
  
  if (!visibleContracts || visibleContracts.length === 0) {
    return (
      <div className="text-center py-20">
        <Car className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold mb-2">Нет договоров выкупа</h3>
        <p className="text-muted-foreground">
          {hideClosed
            ? `Скрыты ${closedCount} закрытых договоров. Покажите их кнопкой «Показать закрытые»`
            : 'Договоры выкупа создаются из карточки машины — кнопка «🚗 Выкуп»'}
        </p>
        {hideClosed && (
          <Button variant="outline" className="mt-4" onClick={() => setHideClosed(false)}>
            Показать все ({closedCount} закрытых)
          </Button>
        )}
      </div>
    )
  }
  
  // Разделяем на активные и закрытые — фильтрация по статусу
  
  const handleOpenPayment = (contractId: string, carId: string, monthlyPayment: number, carName: string) => {
    setPaymentAmount(String(monthlyPayment))
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentNotes('')
    setPaymentModal({ isOpen: true, contractId, carId, monthlyPayment, carName })
  }
  
  const handleSubmitPayment = async () => {
    if (!paymentModal.contractId || !paymentModal.carId) return
    const amount = Number(paymentAmount) || 0
    if (amount <= 0) return
    
    try {
      await createPayment.mutateAsync({
        buyoutRecordId: paymentModal.contractId,
        carId: paymentModal.carId,
        amount,
        paymentDate,
        notes: paymentNotes || undefined,
      })
      toast.success('Платёж внесён')
      setPaymentModal({ isOpen: false, contractId: null, carId: null, monthlyPayment: 0, carName: '' })
    } catch (error) {
      toast.error('Ошибка внесения платежа')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Список договоров — в аккордеоне */}
      <section>
        <Accordion type="multiple" className="w-full space-y-2">
          {/* Заголовок с кнопкой скрытия */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">
              {hideClosed ? `Показаны только активные (скрыто ${closedCount} закрытых)` : `Всего договоров: ${allContracts.length}`}
            </span>
            {closedCount > 0 && (
              <button
                onClick={() => setHideClosed(!hideClosed)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title={hideClosed ? 'Показать закрытые договоры' : 'Скрыть закрытые договоры'}
              >
                {hideClosed ? (
                  <><Eye className="w-4 h-4" /> Показать закрытые</>
                ) : (
                  <><EyeOff className="w-4 h-4" /> Скрыть закрытые</>
                )}
              </button>
            )}
          </div>
          {visibleContracts.map((contract) => (
            <BuyoutContractCard
              key={contract.record.id}
              contract={contract}
              companySettings={companySettings}
              cars={cars || []}
              onOpenPayment={handleOpenPayment}
            />
          ))}
        </Accordion>
      </section>
      
      {/* Модалка платежа */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border-2 border-border p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">💰 Внести платёж</h3>
              <button
                onClick={() => setPaymentModal({ isOpen: false, contractId: null, carId: null, monthlyPayment: 0, carName: '' })}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {paymentModal.carName} • Платёж/мес: {formatMoney(paymentModal.monthlyPayment)}
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Сумма платежа (₽)</label>
                <Input
                  type="text"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Дата платежа</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Примечание</label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPaymentModal({ isOpen: false, contractId: null, carId: null, monthlyPayment: 0, carName: '' })}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitPayment}
                disabled={createPayment.isPending || !paymentAmount || Number(paymentAmount) <= 0}
              >
                {createPayment.isPending ? 'Внесение...' : 'Внести'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// COMPONENT: КАРТОЧКА ДОГОВОРА ВЫКУПА
// ============================================================

interface BuyoutContractCardProps {
  contract: BuyoutContractWithDetails
  companySettings: CompanySettings | null | undefined
  cars: CarType[]
  onOpenPayment: (contractId: string, carId: string, monthlyPayment: number, carName: string) => void
}

function BuyoutContractCard({ contract, companySettings, cars, onOpenPayment }: BuyoutContractCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPayments, setShowPayments] = useState(false)
  const [isEditingDates, setIsEditingDates] = useState(false)
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [isEditingParams, setIsEditingParams] = useState(false)
  const [editTermMonths, setEditTermMonths] = useState('')
  const [editCarPrice, setEditCarPrice] = useState('')
  const [editProfitPercent, setEditProfitPercent] = useState('')
  
  const updateStatus = useUpdateBuyoutContractStatus()
  const updateDates = useUpdateBuyoutContractDates()
  const deletePayment = useDeleteBuyoutPayment()
  const updateParams = useUpdateBuyoutContractParams()
  
  const { record, payments, totalPaid, paymentsCount, client } = contract
  const bd = record.buyoutData
  if (!bd) return null
  
  const contractStatus: BuyoutStatus = bd.status || 'active'
  const isClosed = contractStatus !== 'active'
  
  const totalExpected = calcBuyoutTotalSum(bd.carPrice || 0, bd.profitPercent || 0)
  const progressPercent = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0
  
  const startDate = record.startDate ? new Date(record.startDate + 'T12:00:00') : null
  const endDate = record.endDate ? new Date(record.endDate + 'T12:00:00') : null

  // P1.5: Расчёт просрочки — сколько месяцев не оплачено с учётом даты начала
  const overdueMonths = useMemo(() => {
    if (isClosed || !startDate) return 0
    const now = new Date()
    const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
    const expectedPayments = Math.min(monthsPassed, bd.termMonths)
    const actualPayments = paymentsCount
    return Math.max(0, expectedPayments - actualPayments)
  }, [isClosed, startDate, bd.termMonths, paymentsCount])
  
  const formatPeriod = () => {
    if (!startDate || !endDate) return ''
    const s = startDate.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
    const e = endDate.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
    return `${s} — ${e}`
  }
  
  const handleGenerate = async () => {
    if (!companySettings?.ownerFullName) {
      alert('Заполните данные собственника в разделе "Бухгалтерия"')
      return
    }
    
    const car = cars.find((c: any) => c.id === record.carId)
    if (!car) {
      alert('Машина не найдена')
      return
    }
    
    setIsGenerating(true)
    try {
      const clientData = client
        ? {
            ...clientToContractData(client),
            driverLicenseSeries: bd.driverLicenseSeries || client.driverLicenseSeries || '',
            driverLicenseNumber: bd.driverLicenseNumber || client.driverLicenseNumber || '',
          }
        : {
            fullName: record.renterName || '',
            birthDate: '',
            phone: record.renterPhone || '',
            passportSeries: '',
            passportNumber: '',
            passportIssuedBy: '',
            passportIssueDate: '',
            registrationAddress: '',
            driverLicenseSeries: bd.driverLicenseSeries || '',
            driverLicenseNumber: bd.driverLicenseNumber || '',
          }

      await generateBuyoutContractDocument({
        carBrand: car.brand || '',
        carModel: car.model || '',
        carYear: car.year,
        carColor: car.color || '',
        carLicensePlate: car.licensePlate,
        carVin: car.vin || '',
        carStsSeries: bd.stsSeries || '',
        carStsNumber: bd.stsNumber || '',
        carStsDate: bd.stsDate || '',
        client: clientData,
        owner: {
          fullName: companySettings.ownerFullName || '',
          birthDate: companySettings.ownerBirthDate || '',
          passportSeries: companySettings.ownerPassportSeries || '',
          passportNumber: companySettings.ownerPassportNumber || '',
          passportIssuedBy: companySettings.ownerPassportIssuedBy || '',
          passportIssueDate: companySettings.ownerPassportIssueDate || '',
          registrationAddress: companySettings.ownerRegistrationAddress || '',
          phone: companySettings.ownerPhone || '',
        },
        contractNumber: generateContractNumber(),
        contractDate: record.recordDate,
        contractCity: bd.contractCity || '',
        startDate: record.startDate || record.recordDate,
        paymentDay: startDate ? startDate.getDate() : new Date().getDate(),
        termMonths: bd.termMonths,
        monthlyPayment: bd.monthlyPayment,
        buyoutPrice: bd.buyoutPrice || calcBuyoutTotalSum(bd.carPrice || 0, bd.profitPercent || 0),
        deposit: record.deposit || 0,
        deliveryAddress: bd.deliveryAddress || '',
        startTime: bd.startTime || '',
        relatives: bd.relatives || [],
      })
    } catch (error) {
      alert('Ошибка генерации договора')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleClose = async (status: BuyoutStatus) => {
    const statusText = status === 'closed_completed'
      ? 'отметить договор как выкупленный (машина переходит клиенту)'
      : 'расторгнуть договор (машина возвращается в автопарк)'
    if (!confirm(`Вы уверены, что хотите ${statusText}?`)) return
    
    // P2.9: Учёт залога при закрытии
    const deposit = record.deposit || 0
    let depositReturned = false
    if (deposit > 0) {
      const depositMsg = status === 'closed_completed'
        ? `Залог ${formatMoney(deposit)} — вернуть клиенту при выкупе?`
        : `Залог ${formatMoney(deposit)} — вернуть клиенту при расторжении?\n\nОК = вернуть залог\nОтмена = залог удержан`
      depositReturned = confirm(depositMsg)
    }
    
    try {
      await updateStatus.mutateAsync({ recordId: record.id, status })
      // Сохраняем информацию о залоге через API-слой
      if (deposit > 0) {
        await updateBuyoutContractDeposit(record.id, depositReturned, depositReturned ? deposit : 0)
      }
    } catch {
      toast.error('Ошибка изменения статуса')
      return
    }
    
    if (status === 'closed_completed') {
      try {
        await updateCarStatus(record.carId, 'bought')
      } catch {
        // Не критично
      }
    } else if (status === 'closed_cancelled') {
      try {
        await updateCarStatus(record.carId, 'free')
      } catch {
        // Не критично
      }
    }
    toast.success(status === 'closed_completed' ? 'Договор завершён' : 'Договор закрыт досрочно')
  }
  
  const handleStartEditDates = () => {
    setEditStartDate(record.startDate || '')
    setEditEndDate(record.endDate || '')
    setIsEditingDates(true)
  }
  
  const handleSaveDates = async () => {
    if (!editStartDate || !editEndDate) return
    try {
      await updateDates.mutateAsync({
        recordId: record.id,
        startDate: editStartDate,
        endDate: editEndDate,
      })
      toast.success('Даты обновлены')
      setIsEditingDates(false)
    } catch (error) {
      toast.error('Ошибка обновления дат')
    }
  }
  
  // P2.7: Редактирование параметров договора
  const handleStartEditParams = () => {
    setEditTermMonths(String(bd.termMonths))
    setEditCarPrice(String(bd.carPrice || 0))
    setEditProfitPercent(String(bd.profitPercent || 0))
    setIsEditingParams(true)
  }
  
  const handleSaveParams = async () => {
    const termMonths = Number(editTermMonths)
    const carPrice = Number(editCarPrice)
    const profitPercent = Number(editProfitPercent)
    if (!termMonths || !carPrice || !profitPercent) {
      toast.error('Заполните все параметры')
      return
    }
    const totalBuyoutSum = calcBuyoutTotalSum(carPrice, profitPercent)
    const monthlyPayment = Math.round(totalBuyoutSum / termMonths)
    try {
      const currentStart = record.startDate || ''
      let currentEnd = record.endDate || ''
      if (startDate && termMonths !== bd.termMonths) {
        const newEnd = new Date(startDate)
        newEnd.setMonth(newEnd.getMonth() + termMonths)
        currentEnd = newEnd.toISOString().split('T')[0]
      }
      await updateParams.mutateAsync({
        recordId: record.id,
        termMonths,
        monthlyPayment,
        buyoutPrice: totalBuyoutSum,
        carPrice,
        profitPercent,
        startDate: currentStart,
        endDate: currentEnd,
      })
      toast.success('Параметры обновлены')
      setIsEditingParams(false)
    } catch {
      toast.error('Ошибка обновления параметров')
    }
  }
  
  const statusBadge = isClosed ? (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
      contractStatus === 'closed_completed'
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700'
    }`}>
      {contractStatus === 'closed_completed' ? '✅ Завершён' : '❌ Закрыт'}
    </span>
  ) : (
    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
      Активен
    </span>
  )
  
  // P2.9: Информация о залоге для закрытых договоров
  const depositInfo = isClosed && record.deposit > 0 ? (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
      bd.depositReturned
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600'
    }`}>
      {bd.depositReturned ? `💰 Залог ${formatMoney(record.deposit)} возвращён` : `💰 Залог ${formatMoney(record.deposit)} удержан`}
    </span>
  ) : null
  
  return (
    <Accordion.Item value={record.id} className={`border-2 bg-background rounded text-foreground shadow-md hover:shadow-sm data-[state=open]:shadow-sm transition-all overflow-hidden ${isClosed ? 'opacity-70' : ''}`}>
      <Accordion.Header>
        <span
          className="flex flex-1 items-start justify-between px-4 py-3 font-head cursor-pointer focus:outline-hidden gap-2 flex-wrap [&[data-state=open]>svg]:rotate-180"
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex-shrink-0"
              style={{ backgroundColor: record.car.colorTag }}
            />
            <span className="font-bold text-sm sm:text-base">{record.car.name}</span>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{record.car.licensePlate}</span>
            {statusBadge}
            {depositInfo}
          </div>
          <div className="flex items-center gap-2 text-left sm:text-right flex-wrap">
            <span className="font-medium text-xs sm:text-sm">{record.renterName || 'Клиент'}</span>
            {record.renterPhone && (
              <span className="text-xs sm:text-sm text-muted-foreground">{record.renterPhone}</span>
            )}
          </div>
        </span>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden font-body bg-white text-gray-700 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="px-4 pt-3 pb-4 space-y-4">
      
      {/* Параметры договора — просмотр или редактирование */}
      {isEditingParams ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-muted/20 rounded-lg">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Срок (мес.)</label>
            <Input
              type="number"
              min="1"
              value={editTermMonths}
              onChange={(e) => setEditTermMonths(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Стоимость авто (₽)</label>
            <Input
              type="number"
              min="0"
              value={editCarPrice}
              onChange={(e) => setEditCarPrice(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">% прибыли</label>
            <Input
              type="number"
              min="1"
              max="500"
              step="5"
              value={editProfitPercent}
              onChange={(e) => setEditProfitPercent(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex items-end gap-1">
            {Number(editCarPrice) > 0 && Number(editProfitPercent) > 0 && Number(editTermMonths) > 0 && (
              <div className="text-xs text-muted-foreground whitespace-nowrap mr-1">
                {formatMoney(calcBuyoutTotalSum(Number(editCarPrice), Number(editProfitPercent)) / Number(editTermMonths))}/мес
              </div>
            )}
            <Button size="sm" onClick={handleSaveParams} disabled={updateParams.isPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditingParams(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-2 bg-muted/30 rounded text-center">
            <p className="text-xs text-muted-foreground">Срок</p>
            <p className="font-bold">{bd.termMonths} мес.</p>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <p className="text-xs text-muted-foreground">Платёж/мес</p>
            <p className="font-bold text-green-600">{formatMoney(bd.monthlyPayment)}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <p className="text-xs text-muted-foreground">Стоимость авто</p>
            <p className="font-bold text-blue-600">{formatMoney(bd.carPrice || 0)}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <p className="text-xs text-muted-foreground">Прибыль ({bd.profitPercent || 0}%)</p>
            <p className="font-bold text-green-600">+{formatMoney(bd.carPrice && bd.profitPercent ? Math.round(bd.carPrice * bd.profitPercent / 100) : 0)}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded text-center">
            <p className="text-xs text-muted-foreground">Залог</p>
            <p className="font-bold">{formatMoney(record.deposit || 0)}</p>
          </div>
          {!isClosed && (
            <button
              onClick={handleStartEditParams}
              className="col-span-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Изменить параметры
            </button>
          )}
        </div>
      )}
      
      {/* Период — просмотр или редактирование */}
      {isEditingDates ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 p-2 bg-muted/20 rounded">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">С:</label>
            <Input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">По:</label>
            <Input
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSaveDates} disabled={updateDates.isPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditingDates(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          {formatPeriod() && (
            <p className="text-sm text-muted-foreground">📅 {formatPeriod()}</p>
          )}
          {!isClosed && (
            <button
              onClick={handleStartEditDates}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Редактировать даты"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      
      {/* Прогресс */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>Оплачено: {formatMoney(totalPaid)} из {formatMoney(totalExpected)}</span>
          <span className="font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${overdueMonths > 0 ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            {paymentsCount} {paymentsCount === 1 ? 'платёж' : paymentsCount < 5 ? 'платежа' : 'платежей'}
            {' • '}Остаток: {formatMoney(totalExpected - totalPaid)}
          </p>
          {overdueMonths > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
              🔴 Просрочка: {overdueMonths} {overdueMonths === 1 ? 'мес.' : overdueMonths < 5 ? 'мес.' : 'мес.'}
            </span>
          )}
        </div>
      </div>
      
      {/* P2.8: График платежей — помесячный timeline */}
      {!isClosed && startDate && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">График платежей:</p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: bd.termMonths }, (_, i) => {
              const monthDate = new Date(startDate)
              monthDate.setMonth(monthDate.getMonth() + i)
              const monthStr = monthDate.toLocaleDateString('ru-RU', { month: 'short' })
              
              const currentDate = new Date()
              
              // Месяц считается просроченным (красным) только если:
              // - Это строго предыдущий месяц (до текущего) и не оплачен
              // - Текущий месяц НЕ должен быть красным, даже если мы в нём и платёж ещё не поступил
              const isOverdue = (() => {
                if (monthDate.getFullYear() < currentDate.getFullYear()) return true
                if (monthDate.getFullYear() > currentDate.getFullYear()) return false
                return monthDate.getMonth() < currentDate.getMonth()
              })()
              
              // Определяем, оплачен ли месяц — по дате последнего платежа
              const lastPaymentDate = payments.length > 0
                ? new Date(Math.max(...payments.map(p => new Date(p.recordDate + 'T12:00:00').getTime())))
                : null
              const isPaid = lastPaymentDate
                ? (() => {
                    const monthStart = new Date(monthDate)
                    return lastPaymentDate >= monthStart
                  })()
                : false
              
              let bgColor = 'bg-gray-200 text-gray-500' // будущий
              if (isPaid) {
                bgColor = 'bg-green-500 text-white' // оплачен
              } else if (isOverdue) {
                bgColor = 'bg-red-400 text-white' // просрочен
              }
              
              return (
                <div
                  key={i}
                  className={`px-2 py-1 rounded text-xs font-medium ${bgColor}`}
                  title={`${monthStr} ${monthDate.getFullYear()} — ${isPaid ? 'Оплачен' : isOverdue ? 'Просрочен' : 'Ожидается'}`}
                >
                  {monthStr}
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Кнопки */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-orange-500 text-orange-700 hover:bg-orange-100"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '⏳ Генерация...' : '📄 Печать договора'}
        </Button>
        {!isClosed && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onOpenPayment(record.id, record.carId, bd.monthlyPayment, record.car.name)}
          >
            💰 Внести платёж
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPayments(!showPayments)}
        >
          {showPayments ? 'Скрыть' : '📋'} {paymentsCount > 0 ? `(${paymentsCount})` : ''}
        </Button>
      </div>
      
      {/* Управление статусом — только для активных */}
      {!isClosed && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-green-500 text-green-700 hover:bg-green-100"
            onClick={() => handleClose('closed_completed')}
            disabled={updateStatus.isPending}
          >
            ✅ Выкуплен
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-red-500 text-red-700 hover:bg-red-100"
            onClick={() => handleClose('closed_cancelled')}
            disabled={updateStatus.isPending}
          >
            ❌ Расторгнуть
          </Button>
        </div>
      )}
      
      {/* История платежей */}
      {showPayments && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">История платежей:</h4>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Платежей ещё не было</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDate(p.recordDate)}</span>
                    {p.notes && (
                      <span className="text-muted-foreground">• {p.notes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600">+{formatMoney(p.rentalAmount)}</span>
                    <button
                      onClick={async () => {
                        if (!confirm(`Удалить платёж ${formatMoney(p.rentalAmount)} от ${formatDate(p.recordDate)}?`)) return
                        try {
                          await deletePayment.mutateAsync(p.id)
                          toast.success('Платёж удалён')
                        } catch {
                          toast.error('Ошибка удаления платежа')
                        }
                      }}
                      className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Удалить платёж"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  )
}

// ============================================================
// VIEW: АНАЛИТИКА ПО МАШИНАМ
// ============================================================

function AnalyticsView() {
  const [periodMode, setPeriodMode] = useState<'all' | 'range'>('all')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`)
  const [endDate, setEndDate] = useState<string>(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)

  // Обработчик смены режима периода - сбрасываем даты на дефолтные
  const handlePeriodModeChange = (mode: 'all' | 'range') => {
    setPeriodMode(mode)
    if (mode === 'range') {
      // При переключении на диапазон ставим дефолтные значения
      setStartDate(`${currentYear}-01-01`)
      setEndDate(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
    }
  }

  // Загружаем данные
  const { data: allTimeStats, isLoading: allTimeLoading } = useAllTimeCarStats()
  const { data: rangeStats, isLoading: rangeLoading } = useCarStatsByPeriod(startDate, endDate)

  const isLoading = periodMode === 'all' ? allTimeLoading : rangeLoading
  const carStats = periodMode === 'all' ? allTimeStats : rangeStats

  // Подсчёт итогов
  const totals = useMemo(() => {
    if (!carStats || carStats.length === 0) return null
    return {
      totalRental: carStats.reduce((sum, c) => sum + c.totalRental, 0),
      totalExpense: carStats.reduce((sum, c) => sum + c.totalExpense, 0),
      totalProfit: carStats.reduce((sum, c) => sum + c.totalProfit, 0),
      totalSalary: carStats.reduce((sum, c) => sum + c.totalSalary, 0),
      netProfit: carStats.reduce((sum, c) => sum + c.netProfit, 0),
      totalInvestment: carStats.reduce((sum, c) => sum + c.totalInvestment, 0),
      totalRentedDays: carStats.reduce((sum, c) => sum + c.rentedDays, 0),
    }
  }, [carStats])

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">СРАВНЕНИЕ АВТОМОБИЛЕЙ</h2>
      </div>

      {/* Выбор периода */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Период:</span>
            <Select
              value={periodMode}
              onValueChange={handlePeriodModeChange}
            >
              <Select.Trigger className="w-40">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">За всё время</Select.Item>
                <Select.Item value="range">Выбрать период</Select.Item>
              </Select.Content>
            </Select>
          </div>

          {periodMode === 'range' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">С:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">По:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Итоги */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Общий доход</p>
            <p className="text-xl font-bold text-green-600">{formatMoney(totals.totalRental)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Общий расход</p>
            <p className="text-xl font-bold text-red-600">{formatMoney(totals.totalExpense)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Операционная</p>
            <p className={`text-xl font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(totals.totalProfit)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Выплачено</p>
            <p className="text-xl font-bold text-orange-600">{formatMoney(totals.totalSalary)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Чистая прибыль</p>
            <p className={`text-xl font-bold ${totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(totals.netProfit)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Инвестиции</p>
            <p className="text-xl font-bold text-blue-600">{formatMoney(totals.totalInvestment)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Дней аренды</p>
            <p className="text-xl font-bold">{totals.totalRentedDays}</p>
          </Card>
        </div>
      )}

      {/* Таблица сравнения */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : carStats && carStats.length > 0 ? (
        <CarComparisonTable data={carStats} />
      ) : (
        <Card className="p-8 text-center">
          <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {periodMode === 'all'
              ? 'Нет данных для анализа'
              : 'Нет данных за выбранный период. Проверьте даты.'}
          </p>
        </Card>
      )}
    </div>
  )
}
