// ============================================================
// ТИПЫ АВТОПАРК CRM
// Строго соответствуют структуре БД в Supabase
// snake_case в БД → camelCase в TypeScript
// ============================================================

// --- ПОЛЬЗОВАТЕЛИ ---

export type UserRole = 'owner' | 'manager'

export interface User {
  id: string
  username: string
  password: string
  fullName: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
}

// --- МАШИНЫ ---

export type CarStatus = 'rented' | 'free' | 'service' | 'inactive' | 'buyout' | 'bought'

export interface Car {
  id: string
  name: string
  licensePlate: string
  brand: string | null
  model: string | null
  year: number | null
  vin: string | null
  color: string | null // Реальный цвет авто (для договора)
  purchaseDate: string | null
  purchasePrice: number
  preparationCost: number
  dailyPrice: number // Цена аренды за сутки
  status: CarStatus
  colorTag: string
  photoUrl: string | null
  notes: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Вычисляемые поля для отображения на дашборде
export interface CarWithStats extends Car {
  monthRental?: number
  monthExpense?: number
  monthProfit?: number
  daysToService?: number | null
  // Поля для расчёта окупаемости
  totalInvestment?: number  // purchasePrice + preparationCost (без ТО)
  totalIncome?: number      // Сумма всех rental_amount
  totalExpense?: number     // Сумма всех service_cost + other_cost
  netProfit?: number        // totalIncome - totalExpense (чистая прибыль с учётом расходов)
  roiPercent?: number       // (netProfit / totalInvestment) × 100, макс 100
}

// --- КАТЕГОРИИ РАСХОДОВ ---

export interface ExpenseCategory {
  id: string
  name: string
  icon: string | null
  color: string
  isSystem: boolean
  createdAt: string
}

// --- ЗАПИСИ АРЕНДЫ И РАСХОДОВ ---

export type RecordType = 'normal' | 'booking' | 'buyout' | 'buyout_payment' | 'service'

export type BuyoutStatus = 'active' | 'closed_completed' | 'closed_cancelled'

export interface BuyoutData {
  termMonths: number
  monthlyPayment: number
  carPrice: number           // Стоимость авто (за сколько купили)
  profitPercent: number      // Процент прибыли арендодателя (например 30 = 30%)
  buyoutPrice?: number       // DEPRECATED: оставлено для обратной совместимости старых договоров
  contractCity: string
  deliveryAddress: string
  startTime: string
  stsSeries: string
  stsNumber: string
  stsDate: string
  relatives: RelativeContact[]
  driverLicenseSeries: string
  driverLicenseNumber: string
  buyoutRecordId?: string // ID основного договора выкупа (для buyout_payment)
  status?: BuyoutStatus   // Статус договора (default: 'active')
  depositReturned?: boolean       // Был ли возвращён залог при закрытии
  depositReturnedAmount?: number  // Сумма возвращённого залога
}

export interface CarRecord {
  id: string
  carId: string
  recordDate: string // ISO date: "2026-02-15"
  startDate: string | null // Дата начала аренды (для бронирований)
  endDate: string | null // Дата окончания аренды (для бронирований)
  rentalAmount: number
  serviceCost: number
  otherCost: number
  deposit: number // Залоговый депозит
  expenseCategoryId: string | null
  clientId: string | null // Ссылка на клиента (для повторных бронирований)
  renterName: string | null
  renterPhone: string | null // Телефон арендатора
  notes: string | null
  recordType: RecordType // Тип записи: normal, booking, buyout, service
  buyoutData: BuyoutData | null // Данные выкупа (JSONB)
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// Расширенная запись с данными машины (для журнала)
export interface CarRecordWithCar extends CarRecord {
  car: {
    id: string
    name: string
    licensePlate: string
    colorTag: string
  }
  expenseCategory?: ExpenseCategory | null
}

// --- ВЫВОДЫ ЗАРПЛАТЫ ---

export interface SalaryWithdrawal {
  id: string
  amount: number
  withdrawalDate: string
  recipientName: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
  // Новые поля для выплат по месяцам
  month: string | null           // За какой месяц (первый день: "2026-03-01")
  percent: number                // Процент от чистой прибыли (1-100)
  grossIncome: number            // Валовый доход за месяц (аренда)
  netProfit: number              // Чистая прибыль за месяц
  // Привязка к машине (nullable)
  carId: string | null          // ID машины. NULL = выплата по всем машинам
  carName?: string              // Название машины (для отображения в истории)
}

// --- ПЛАНОВЫЕ ТО ---

export type ServiceEventStatus = 'planned' | 'completed' | 'overdue' | 'cancelled'

export interface ServiceEvent {
  id: string
  carId: string
  categoryId: string | null
  serviceType: string
  plannedDate: string
  completedDate: string | null
  cost: number
  linkedRecordId: string | null
  status: ServiceEventStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

// --- КЛИЕНТЫ ---

// Клиент (хранится в БД)
export interface Client {
  id: string
  lastName: string              // Фамилия
  firstName: string             // Имя
  middleName: string | null     // Отчество
  fullName: string              // Полное ФИО (вычисляется БД)
  phone: string | null          // Телефон
  birthDate: string | null      // Дата рождения
  passportSeries: string | null // Серия паспорта
  passportNumber: string | null // Номер паспорта
  passportIssuedBy: string | null // Кем выдан
  passportIssueDate: string | null // Дата выдачи
  registrationAddress: string | null // Прописка
  driverLicenseSeries: string | null // Серия В/У
  driverLicenseNumber: string | null // Номер В/У
  notes: string | null          // Заметки
  createdAt: string
  updatedAt: string
}

// Данные для создания/редактирования клиента
export interface ClientFormData {
  lastName: string
  firstName: string
  middleName?: string
  phone?: string
  birthDate?: string
  passportSeries?: string
  passportNumber?: string
  passportIssuedBy?: string
  passportIssueDate?: string
  registrationAddress?: string
  driverLicenseSeries?: string
  driverLicenseNumber?: string
  notes?: string
}

// Результат поиска клиента (с релевантностью)
export interface ClientSearchResult extends Client {
  similarityScore: number // 0-1, чем выше — тем релевантнее
}

// Найденный дубликат клиента
export interface ClientDuplicate {
  id: string
  fullName: string
  phone: string | null
  similarityScore: number // 0-1, 1 = точное совпадение
}

// --- VIEW: monthly_stats ---

export interface MonthlyStats {
  carId: string
  carName: string
  colorTag: string
  month: string // ISO date: "2026-02-01T00:00:00Z"
  recordsCount: number
  rentedDays: number
  idleDays: number
  totalRental: number      // Для выкупа — только чистая прибыль (30%), для обычной — полная сумма
  totalService: number
  totalOther: number
  totalExpense: number
  totalProfit: number
  occupancyPercent: number
}

// --- ANALYTICS: СВОДКА ПО АВТОПАРКУ ЗА ПЕРИОД ---

export interface CarAnalyticsSummary {
  carId: string
  carName: string
  colorTag: string
  licensePlate: string
  carStatus: string           // status машины: free, rented, buyout, bought, service, inactive
  purchaseDate: string | null   // Дата покупки машины
  purchasePrice: number
  preparationCost: number
  totalInvestment: number   // purchasePrice + preparationCost
  totalRental: number      // Доход за период
  totalExpense: number     // Расход за период
  totalProfit: number     // Операционная прибыль (до выплат)
  totalSalary: number     // Сумма выплат партнёрам
  netProfit: number       // Чистая прибыль (после выплат)
  rentedDays: number      // Дней в аренде
  idleDays: number        // Дней простоя
  occupancyPercent: number // % занятости
  avgDailyIncome: number  // Средний доход/день
  roi: number             // ROI в % (netProfit / totalInvestment * 100)
}

// --- VIEW: cash_flow ---

export interface CashFlow {
  totalIncome: number
  totalExpense: number
  totalSalary: number
  balance: number
}

// --- ФОРМЫ ---

export interface RecordFormData {
  carId: string
  recordDate: string
  startDate?: string | null
  endDate?: string | null
  rentalAmount: number
  serviceCost: number
  otherCost: number
  deposit?: number
  expenseCategoryId?: string
  clientId?: string | null // Ссылка на клиента
  renterName?: string
  renterPhone?: string
  notes?: string
  recordType?: RecordType
  buyoutData?: BuyoutData | null
}

// Данные формы бронирования
export interface BookingFormData {
  carId: string
  startDate: string
  endDate: string
  dailyPrice: number
  renterName: string
  renterPhone?: string
  notes?: string
}

// Расход на подготовку (для "Прочее")
export interface PreparationExpense {
  id?: string           // ID записи (для редактирования, опционально)
  comment: string       // Наименование: "Покупка фары"
  amount: number        // Сумма: 5000
}

export interface CarFormData {
  name: string
  licensePlate: string
  brand?: string
  model?: string
  year?: number
  vin?: string
  color?: string // Реальный цвет авто (для договора)
  purchaseDate?: string
  purchasePrice: number
  insurance?: number // Страховка — часть расходов на подготовку (только при создании)
  tires?: number // Шины — часть расходов на подготовку (только при создании)
  preparationCost?: number // Общая сумма расходов на подготовку (при редактировании)
  otherExpenses?: PreparationExpense[] // Прочие расходы на подготовку с комментариями
  colorTag: string
  photoFile?: File // Для загрузки фото (не сохраняется в БД)
}

export interface SalaryFormData {
  amount: number
  withdrawalDate: string
  recipientName?: string
  notes?: string
  // Новые поля для выплат по месяцам
  month?: string           // За какой месяц (первый день: "2026-03-01")
  percent?: number         // Процент от чистой прибыли (1-100)
  grossIncome?: number     // Валовый доход за месяц (аренда)
  netProfit?: number       // Чистая прибыль за месяц
  // Привязка к машине
  carId?: string | null    // ID машины. NULL/undefined = по всем машинам
}

// Данные о прибыли за месяц (для UI)
export interface MonthlyProfitData {
  month: string              // "2026-03"
  grossIncome: number        // Валовый доход (аренда)
  totalExpense: number       // Расходы (без страховки и шин)
  netProfit: number          // Чистая прибыль
}

// --- ДЕТАЛИЗАЦИЯ ПОДГОТОВКИ ---

export interface CarPreparationDetail {
  carId: string
  carName: string
  colorTag: string
  licensePlate: string
  preparationCost: number
  insurance: number
  tires: number
  otherExpenses: Array<{ id: string; comment: string; amount: number }>
}

// --- UI СОСТОЯНИЯ ---

export interface MonthFilter {
  year: number
  month: number // 1-12
}

export type FinanceViewMode = 'months' | 'cars' | 'cash'

// --- Таймлайн занятости ---

export type DayType = 'rented' | 'idle' | 'expense' | 'empty'

export interface TimelineDay {
  date: string
  type: DayType
  rentalAmount: number
  expenseAmount: number
}

// --- ДАННЫЕ ДЛЯ ДОГОВОРА ---

// Данные клиента для генерации договора (НЕ сохраняются в БД)
export interface ContractClientData {
  fullName: string           // ФИО полностью
  birthDate: string          // Дата рождения
  phone: string              // Телефон
  passportSeries: string     // Серия паспорта
  passportNumber: string     // Номер паспорта
  passportIssuedBy: string   // Кем выдан
  passportIssueDate: string  // Дата выдачи
  registrationAddress: string// Прописка
  driverLicenseSeries?: string // Серия водительского удостоверения
  driverLicenseNumber?: string // Номер водительского удостоверения
}

// Телефон родственника для договора выкупа
export interface RelativeContact {
  phone: string              // Телефон родственника
  name: string               // Имя и кем является
}

// Данные для генерации договора
export interface ContractData {
  // Данные авто
  carBrand: string
  carModel: string
  carYear: number | null
  carColor: string
  carLicensePlate: string
  carVin: string
  carPrice: number  // Стоимость авто для акта приёма-передачи
  
  // Данные клиента (АРЕНДАТОР - берёт в аренду)
  client: ContractClientData
  
  // Данные аренды
  contractNumber: string
  contractDate: string
  startDate: string
  endDate: string
  dailyPrice: number
  totalAmount: number
  deposit: number // Залоговый депозит
  
  // Дополнительно
  deliveryPlace?: string
  returnPlace?: string
  
  // Данные владельца (АРЕНДОДАТЕЛЬ - сдаёт в аренду) - опционально для акта
  owner?: {
    fullName: string | null
    birthDate?: string | null
    passportSeries: string | null
    passportNumber: string | null
    passportIssuedBy: string | null
    passportIssueDate: string | null
    registrationAddress: string | null
    phone?: string | null
  }
}

// --- НАСТРОЙКИ КОМПАНИИ ---

// Данные компании (ООО) для договоров
export interface CompanySettings {
  id: string
  
  // Данные компании (Арендатор по договору - ООО)
  companyName: string
  legalAddress: string | null
  postalAddress: string | null
  inn: string | null
  kpp: string | null
  bankName: string | null
  checkingAccount: string | null
  correspondentAccount: string | null
  bik: string | null
  
  // Представитель компании (кто подписывает договоры)
  representativeName: string | null
  representativePosition: string | null
  representativeBasis: string | null
  
  // Данные владельца как физлица (Арендодатель по договору)
  ownerFullName: string | null
  ownerBirthDate: string | null
  ownerPassportSeries: string | null
  ownerPassportNumber: string | null
  ownerPassportIssuedBy: string | null
  ownerPassportIssueDate: string | null
  ownerRegistrationAddress: string | null
  ownerPostalAddress: string | null
  ownerPhone: string | null
  
  createdAt: string
  updatedAt: string
}

// Форма редактирования настроек компании
export interface CompanySettingsFormData {
  companyName: string
  legalAddress?: string
  postalAddress?: string
  inn?: string
  kpp?: string
  bankName?: string
  checkingAccount?: string
  correspondentAccount?: string
  bik?: string
  representativeName?: string
  representativePosition?: string
  representativeBasis?: string
  ownerFullName?: string
  ownerBirthDate?: string
  ownerPassportSeries?: string
  ownerPassportNumber?: string
  ownerPassportIssuedBy?: string
  ownerPassportIssueDate?: string
  ownerRegistrationAddress?: string
  ownerPostalAddress?: string
  ownerPhone?: string
}

// --- ИСТОРИЯ КЛИЕНТА ---

// Запись истории аренды клиента
export interface ClientHistoryEntry {
  recordId: string
  recordDate: string
  carId: string
  carName: string
  carColorTag: string
  licensePlate: string
  startDate: string | null
  endDate: string | null
  rentalAmount: number
  deposit: number
  notes: string | null
  recordType: RecordType
  buyoutData: BuyoutData | null
}

// Итоги по клиенту
export interface ClientSummary {
  totalRentals: number      // Количество аренд
  totalAmount: number       // Общая сумма аренды
  totalDays: number         // Всего дней аренды
  firstRentalDate: string   // Первая аренда
  lastRentalDate: string    // Последняя аренда
  carsUsed: string[]        // Какие машины арендовал
}

// --- ЛЕНТА СОБЫТИЙ (ЖУРНАЛ) ---

// Типы событий для ленты активности
export type ActivityEventType = 'rental' | 'expense' | 'booking' | 'booking_end' | 'deposit_taken' | 'deposit_returned' | 'buyout_payment'

// Событие для ленты активности
export interface ActivityEvent {
  id: string
  type: ActivityEventType
  timestamp: string              // ISO datetime создания события
  recordDate: string             // Дата записи (record_date)
  
  // Данные машины
  carId: string
  carName: string
  carColorTag: string
  licensePlate: string
  
  // Данные клиента/арендатора
  clientName?: string
  clientPhone?: string
  
  // Финансовые данные
  rentalAmount?: number
  expenseAmount?: number
  depositAmount?: number
  
  // Для бронирований
  startDate?: string
  endDate?: string
  daysCount?: number
  
  // Категория расхода
  expenseCategoryName?: string
  expenseCategoryColor?: string
  isPreparationCategory?: boolean  // Страховка или Шины — исключаются из итогов
  
  // Заметки
  notes?: string
  
  // ID записи для возможных действий
  recordId: string
}

// Группа событий по дате
export interface ActivityDayGroup {
  date: string                   // "2026-03-16"
  dateLabel: string              // "Понедельник, 16 марта"
  events: ActivityEvent[]
  
  // Итоги за день
  totalRental: number
  totalExpense: number
  totalProfit: number
}

// Итоги за период
export interface ActivityPeriodSummary {
  totalRental: number
  totalExpense: number
  totalProfit: number
  eventsCount: number
  rentalsCount: number
  expensesCount: number
  bookingsCount: number
}

// --- ДАННЫЕ ДЛЯ ПОЛНОГО ДОГОВОРА АРЕНДЫ ---

// Расширенные данные для полного договора аренды (включая данные компании)
export interface RentalContractData extends ContractData {
  // Данные компании (Арендатор - ООО)
  company: {
    name: string
    legalAddress: string | null
    postalAddress: string | null
    inn: string | null
    kpp: string | null
    bankName: string | null
    checkingAccount: string | null
    correspondentAccount: string | null
    bik: string | null
    representativeName: string | null
    representativePosition: string | null
    representativeBasis: string | null
  }
  
  // Данные владельца (Арендодатель - физлицо)
  owner: {
    fullName: string | null
    birthDate?: string | null
    passportSeries: string | null
    passportNumber: string | null
    passportIssuedBy: string | null
    passportIssueDate: string | null
    registrationAddress: string | null
    postalAddress: string | null
    phone: string | null
  }
}

// --- ДАННЫЕ ДЛЯ ДОГОВОРА АРЕНДЫ БЕЗ ВЫКУПА ---

export interface SimpleRentalContractData {
  // Данные авто
  carBrand: string
  carModel: string
  carYear: number | null
  carColor: string
  carLicensePlate: string
  carVin: string
  carStsSeries: string       // Серия СТС
  carStsNumber: string       // Номер СТС
  carStsDate: string         // Дата выдачи СТС

  // Данные клиента (АРЕНДАТОР)
  client: ContractClientData

  // Данные аренды
  contractNumber: string
  contractDate: string
  contractCity: string       // Город заключения договора
  startDate: string          // Дата начала аренды
  startTime: string         // Время начала (например "17:00")
  termDays: number            // Срок аренды в сутках (3 суток)
  dailyPrice: number          // Цена за сутки
  deposit: number             // Залоговый депозит
  deliveryAddress: string     // Адрес площадки приёма/передачи

  // Данные владельца (АРЕНДОДАТЕЛЬ)
  owner: {
    fullName: string | null
    birthDate?: string | null
    passportSeries: string | null
    passportNumber: string | null
    passportIssuedBy: string | null
    passportIssueDate: string | null
    registrationAddress: string | null
    phone: string | null
  }
}

// --- ДАННЫЕ ДЛЯ ДОГОВОРА ВЫКУПА ---

export interface BuyoutContractData {
  // Данные авто
  carBrand: string
  carModel: string
  carYear: number | null
  carColor: string
  carLicensePlate: string
  carVin: string
  carStsSeries: string       // Серия СТС
  carStsNumber: string       // Номер СТС
  carStsDate: string         // Дата выдачи СТС

  // Данные клиента (АРЕНДАТОР)
  client: ContractClientData

  // Данные аренды с выкупом
  contractNumber: string
  contractDate: string
  contractCity: string       // Город заключения договора
  startDate: string          // Дата начала
  startTime: string          // Время начала (например "10:00")
  termMonths: number         // Срок выкупа в месяцах
  monthlyPayment: number     // Арендная плата в месяц
  paymentDay: number         // Число месяца для оплаты
  buyoutPrice?: number       // Выкупная цена авто (вычисляется: carPrice * (1 + profitPercent/100))
  carPrice?: number          // Стоимость авто (за сколько купили)
  profitPercent?: number     // Процент прибыли арендодателя
  deposit: number            // Обеспечительный платеж
  deliveryAddress: string    // Адрес площадки приёма/передачи

  // Телефоны родственников
  relatives: RelativeContact[]

  // Данные владельца (АРЕНДОДАТЕЛЬ)
  owner: {
    fullName: string | null
    birthDate?: string | null
    passportSeries: string | null
    passportNumber: string | null
    passportIssuedBy: string | null
    passportIssueDate: string | null
    registrationAddress: string | null
    phone: string | null
  }
}
