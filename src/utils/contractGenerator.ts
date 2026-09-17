// ============================================================
// ГЕНЕРАТОР ДОГОВОРА АРЕНДЫ АВТО
// Создаёт DOCX файл на основе шаблона
// ============================================================

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
} from 'docx'
import { saveAs } from 'file-saver'
import type { ContractData, RentalContractData, BuyoutContractData, SimpleRentalContractData } from '@/types'
import { formatMoneyWords, formatDays } from '@/utils/format'

// Функция для загрузки картинки схемы авто
async function loadCarSchemaImage(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch('/shema-avto.png')
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    console.warn('Не удалось загрузить схему автомобиля')
    return null
  }
}

// Форматирование даты для договора (месяц в родительном падеже)
// Возвращает дату БЕЗ "г." на конце - добавляется в месте использования
function formatDateForContract(dateStr: string): string {
  if (!dateStr) return '____________'
  // Проверяем формат даты YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return '____________'
  }
  const date = new Date(dateStr + 'T12:00:00')
  // Проверяем валидность даты
  if (isNaN(date.getTime())) {
    return '____________'
  }
  const day = date.getDate()
  const monthsGenitive = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ]
  const month = monthsGenitive[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Форматирование даты кратко (поддерживает YYYY-MM-DD и дд.мм.гггг)
function formatDateShort(dateStr: string): string {
  if (!dateStr) return '____________'
  // Если уже в формате дд.мм.гггг — возвращаем как есть
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr
  // Иначе парсим как YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '____________'
  const date = new Date(dateStr + 'T12:00:00')
  if (isNaN(date.getTime())) return '____________'
  return date.toLocaleDateString('ru-RU')
}

// Генерация номера договора
export function generateContractNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `ККР-${day}${month}${year}-${random}`
}

// Создание ячейки таблицы с поддержкой процентных ширин для адаптивности на мобильных
function createCell(text: string, widthPercent?: number, bold = false): TableCell {
  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 22, bold })],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  })
}

// Создание строки с двумя парами ячеек (адаптивная ширина в процентах)
function createTwoColumnRow(label1: string, value1: string, label2: string, value2: string): TableRow {
  return new TableRow({
    children: [
      createCell(label1, 20),   // 20%
      createCell(value1, 30),   // 30%
      createCell(label2, 20),   // 20%
      createCell(value2, 30),   // 30%
    ],
  })
}

// ============================================================
// АКТ ПРИЁМА-ПЕРЕДАЧИ ТС
// ============================================================

export async function generateContractDocument(data: ContractData): Promise<void> {
  // Загружаем картинку схемы авто
  const schemaImage = await loadCarSchemaImage()

  // Формируем данные клиента для шапки (АРЕНДАТОР)
  // Даты рождения и паспорта в кратком формате (18.01.2000)
  const clientInfo = `${data.client.fullName}${data.client.birthDate ? `, ${formatDateShort(data.client.birthDate)} г.р.` : ''}, паспорт: ${data.client.passportSeries} ${data.client.passportNumber}${data.client.passportIssuedBy ? `, выдан: ${data.client.passportIssuedBy}` : ''}${data.client.passportIssueDate ? ` ${formatDateShort(data.client.passportIssueDate)}` : ''}${data.client.registrationAddress ? `, зарегистрирован: ${data.client.registrationAddress}` : ''}${data.client.phone ? `, тел.: ${data.client.phone}` : ''}`

  // Создаём документ
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 700,// 1.25 cm
              right: 500,  // 0.9 cm
              bottom: 700, // 1.25 cm
              left: 850,   // 1.5 cm
            },
          },
        },
        children: [
          // Шапка
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Приложение №1 к договору', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `№ ${data.contractNumber} от ${formatDateForContract(data.contractDate)}`,
                size: 22,
              }),
            ],
          }),
          new Paragraph({}),
          
          // Заголовок
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'АКТ ПРИЁМА – ПЕРЕДАЧИ ТРАНСПОРТНОГО СРЕДСТВА',
                size: 26,
                bold: true,
              }),
            ],
          }),
          new Paragraph({}),
          
          // Преамбула - Арендодатель (владелец из настроек)
          new Paragraph({
            children: [
              new TextRun({
                text: 'Гражданин РФ ',
                size: 22,
              }),
              new TextRun({
                text: data.owner?.fullName || '________________________',
                size: 22,
                bold: true,
              }),
              new TextRun({
                text: `${data.owner?.birthDate ? `, ${formatDateShort(data.owner.birthDate)} г.р.` : ''}, паспорт ${data.owner?.passportSeries || ''} ${data.owner?.passportNumber || ''}, выдан: ${data.owner?.passportIssuedBy || ''}${data.owner?.passportIssueDate ? ` ${formatDateShort(data.owner.passportIssueDate)}` : ''}, зарегистрирован: ${data.owner?.registrationAddress || ''}`,
                size: 22,
              }),
              new TextRun({
                text: ', именуемый в дальнейшем Арендодатель, с одной стороны, и ',
                size: 22,
              }),
            ],
          }),
          new Paragraph({}),
          
          // Арендатор (клиент)
          new Paragraph({
            children: [
              new TextRun({
                text: 'Гражданин РФ ',
                size: 22,
              }),
              new TextRun({
                text: clientInfo,
                size: 22,
                bold: true,
              }),
              new TextRun({
                text: ', именуемый(ая) в дальнейшем Арендатор, с другой стороны,',
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'вместе именуемые «Стороны», в соответствии с Договором аренды ТС без экипажа ',
                size: 22,
              }),
              new TextRun({
                text: `№ ${data.contractNumber} от ${formatDateForContract(data.contractDate)}`,
                size: 22,
                bold: true,
              }),
              new TextRun({
                text: ' подписали настоящий акт о нижеследующем:',
                size: 22,
              }),
            ],
          }),
          new Paragraph({}),
          
          // Пункт 1 - Данные ТС
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Арендодатель передал, а Арендатор принял следующее Транспортное средство (далее ТС):',
                size: 22,
                bold: true,
              }),
            ],
          }),
          new Paragraph({}),
          
          // Таблица с данными авто
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTwoColumnRow('Марка, модель:', `${data.carBrand} ${data.carModel}`, 'Год выпуска:', String(data.carYear || '')),
              createTwoColumnRow('Цвет:', data.carColor, 'Кузов (VIN):', data.carVin),
              createTwoColumnRow('Гос. рег. знак:', data.carLicensePlate, 'Двигатель:', '____________'),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: `Стоимость транспортного средства: ${data.carPrice ? data.carPrice.toLocaleString('ru-RU') : '_________________'} рублей`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          
          // Пункт 3 - Повреждения
          new Paragraph({
            children: [
              new TextRun({
                text: '3. На момент передачи транспортное средство имеет следующие повреждения кузова:',
                size: 22,
                bold: true,
              }),
            ],
          }),
          new Paragraph({}),
          
          // Картинка схемы авто
          ...(schemaImage
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: schemaImage,
                      transformation: {
                        width: 500,
                        height: 350,
                      },
                      type: 'png',
                    }),
                  ],
                }),
              ]
            : [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '[Схема автомобиля]',
                      size: 22,
                      italics: true,
                    }),
                  ],
                }),
              ]),
          new Paragraph({}),
          
          // Примечания
          new Paragraph({
            children: [new TextRun({ text: 'Примечания:', size: 22, bold: true })],
          }),
          ...Array(10).fill(null).map(() =>
            new Paragraph({
              children: [new TextRun({ text: '____________________________________________________________', size: 22 })],
            })
          ),
          new Paragraph({}),
          
          // Таблица показаний (адаптивная ширина в процентах)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Показания одометра (при сдаче):', 30),
                  createCell('________ км', 15),
                  createCell('Уровень топлива', 15),
                  createCell('E ☐ F ☐', 10),
                  createCell('Состояние кузова', 15),
                  createCell('чистый ☐ грязный ☐', 15),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Показания одометра (при возврате):', 30),
                  createCell('________ км', 15),
                  createCell('Уровень топлива', 15),
                  createCell('E ☐ F ☐', 10),
                  createCell('Состояние кузова', 15),
                  createCell('чистый ☐ грязный ☐', 15),
                ],
              }),
            ],
          }),
          new Paragraph({}),
          
          // Пункт 4 - Комплектность
          new Paragraph({
            children: [
              new TextRun({ text: '4. Комплектность и документы:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          
          // Таблица комплектности (адаптивная ширина в процентах)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell('Свидетельство о регистрации', 30),
                  createCell('☐', 5),
                  createCell('Омывательная жидкость', 30),
                  createCell('☐', 5),
                  createCell('Резина:', 15),
                  createCell('летняя ☐ зимняя ☐', 15),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Страховой полис ОСАГО', 30),
                  createCell('☐', 5),
                  createCell('Фары главного света', 30),
                  createCell('☐', 5),
                  createCell('Диски:', 15),
                  createCell('легкосплавные ☐ стальные ☐', 15),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Запасное колесо', 30),
                  createCell('☐', 5),
                  createCell('Стоп-сигнал', 30),
                  createCell('☐', 5),
                  createCell('Аптечка', 30),
                  createCell('☐', 5),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Балонный ключ', 30),
                  createCell('☐', 5),
                  createCell('Габариты', 30),
                  createCell('☐', 5),
                  createCell('Огнетушитель', 30),
                  createCell('☐', 5),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Домкрат', 30),
                  createCell('☐', 5),
                  createCell('Указатели поворота', 30),
                  createCell('☐', 5),
                  createCell('Знак аварийной остановки', 30),
                  createCell('☐', 5),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Навигатор', 30),
                  createCell('☐', 5),
                  createCell('Бустер', 30),
                  createCell('☐', 5),
                  createCell('Детское кресло', 30),
                  createCell('☐', 5),
                ],
              }),
            ],
          }),
          new Paragraph({}),
          
          // Дополнения
          new Paragraph({
            children: [new TextRun({ text: 'Дополнения:', size: 22, bold: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Место подачи автомобиля: ${data.deliveryPlace || '___________________________________________'}`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Дата и время подачи автомобиля: ${formatDateShort(data.startDate)}, _____:_____`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Место возврата автомобиля: ${data.returnPlace || '___________________________________________'}`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Дата и время возврата автомобиля: ${formatDateShort(data.endDate)}, _____:_____`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({}),
          
          // Подписи
          new Paragraph({
            children: [
              new TextRun({ text: 'ПЕРЕДАЛ (Арендодатель):', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${data.owner?.fullName || '________________________'} /____________________/`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: 'ПРИНЯЛ (Арендатор):', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${data.client.fullName} /____________________/`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: 'СДАЛ (вернул Арендатор):', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${data.client.fullName} /____________________/`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: 'ПРИНЯЛ (Арендодатель):', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${data.owner?.fullName || '________________________'} /____________________/`, size: 22 }),
            ],
          }),
        ],
      },
    ],
  })

  // Генерируем и скачиваем файл
  const blob = await Packer.toBlob(doc)
  const fileName = `Акт_${data.carLicensePlate}_${data.client.fullName.replace(/\s+/g, '_')}.docx`
  saveAs(blob, fileName)
}

// ============================================================
// ГЕНЕРАЦИЯ ПОЛНОГО ДОГОВОРА АРЕНДЫ АВТОМОБИЛЯ
// ============================================================

/**
 * Генерирует полный договор аренды автомобиля
 * АРЕНДОДАТЕЛЬ = владелец авто (из настроек Бухгалтерии) - СДАЁТ
 * АРЕНДАТОР = клиент (из формы бронирования) - БЕРЁТ в аренду
 */
export async function generateRentalContractDocument(data: RentalContractData): Promise<void> {
  // Расчёт количества дней аренды
  const startDate = new Date(data.startDate + 'T12:00:00')
  const endDate = new Date(data.endDate + 'T12:00:00')
  const rentalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Создаём документ
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 700,
              right: 500,
              bottom: 700,
              left: 850,
            },
          },
        },
        children: [
          // Шапка
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ДОГОВОР АРЕНДЫ АВТОМОБИЛЯ', size: 28, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `№ ${data.contractNumber}`, size: 24 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `от ${formatDateForContract(data.contractDate)}`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Преамбула - Арендодатель (владелец из настроек)
          new Paragraph({
            children: [
              new TextRun({ text: 'Гражданин РФ ', size: 22 }),
              new TextRun({ text: data.owner.fullName || '________________________', size: 22, bold: true }),
              new TextRun({
                text: `${data.owner.birthDate ? `, ${formatDateShort(data.owner.birthDate)} г.р.` : ''}, паспорт ${data.owner.passportSeries || ''} ${data.owner.passportNumber || ''}, выдан: ${data.owner.passportIssuedBy || ''}${data.owner.passportIssueDate ? ` ${formatDateShort(data.owner.passportIssueDate)}` : ''}, зарегистрирован: ${data.owner.registrationAddress || ''}`,
                size: 22
              }),
              new TextRun({ text: ', именуемый в дальнейшем «Арендодатель», с одной стороны, и', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Преамбула - Арендатор (клиент)
          new Paragraph({
            children: [
              new TextRun({ text: 'Гражданин РФ ', size: 22 }),
              new TextRun({ text: data.client.fullName || '________________________', size: 22, bold: true }),
              new TextRun({
                text: `${data.client.birthDate ? `, ${formatDateShort(data.client.birthDate)} г.р.` : ''}, паспорт ${data.client.passportSeries || ''} ${data.client.passportNumber || ''}, выдан: ${data.client.passportIssuedBy || ''}${data.client.passportIssueDate ? ` ${formatDateShort(data.client.passportIssueDate)}` : ''}, зарегистрирован: ${data.client.registrationAddress || ''}${data.client.phone ? `, тел.: ${data.client.phone}` : ''}`,
                size: 22
              }),
              new TextRun({ text: ', именуемый(ая) в дальнейшем «Арендатор», с другой стороны,', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'вместе именуемые «Стороны», заключили настоящий Договор о нижеследующем:', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 1. ПРЕДМЕТ ДОГОВОРА
          new Paragraph({
            children: [
              new TextRun({ text: '1. ПРЕДМЕТ ДОГОВОРА', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '1.1. Арендодатель обязуется предоставить Арендатору во временное владение и пользование транспортное средство (далее – «Автомобиль») за плату.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '1.2. Характеристики Автомобиля:', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Таблица характеристик авто
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTwoColumnRow('Марка, модель:', `${data.carBrand} ${data.carModel}`, 'Год выпуска:', String(data.carYear || '')),
              createTwoColumnRow('Цвет:', data.carColor, 'VIN:', data.carVin),
              createTwoColumnRow('Гос. рег. знак:', data.carLicensePlate, '', ''),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 2. СРОК АРЕНДЫ
          new Paragraph({
            children: [
              new TextRun({ text: '2. СРОК АРЕНДЫ', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: `2.1. Срок аренды Автомобиля: с ${formatDateForContract(data.startDate)} по ${formatDateForContract(data.endDate)} (включительно), всего ${formatDays(rentalDays)}.`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 3. АРЕНДНАЯ ПЛАТА
          new Paragraph({
            children: [
              new TextRun({ text: '3. АРЕНДНАЯ ПЛАТА', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: `3.1. Размер арендной платы составляет ${data.dailyPrice.toLocaleString('ru-RU')} (${formatMoneyWords(data.dailyPrice)}) рублей в сутки.`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: `3.2. Общая сумма арендной платы за весь срок аренды составляет ${data.totalAmount.toLocaleString('ru-RU')} (${formatMoneyWords(data.totalAmount)}) рублей.`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '3.3. Оплата производится Арендатором в порядке 100% предоплаты в момент подписания настоящего Договора.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Пункт 3.4 - Залоговый депозит (только если указан)
          ...(data.deposit > 0 ? [
            new Paragraph({
              children: [
                new TextRun({ text: `3.4. Залоговый депозит составляет ${data.deposit.toLocaleString('ru-RU')} (${formatMoneyWords(data.deposit)}) рублей. Депозит возвращается Арендатору при возврате Автомобиля в исправном состоянии с учётом нормального износа.`, size: 22 }),
              ],
            }),
            new Paragraph({}),
          ] : []),

          // РАЗДЕЛ 4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
          new Paragraph({
            children: [
              new TextRun({ text: '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '4.1. Арендодатель обязуется:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '4.1.1. Передать Арендатору Автомобиль в исправном состоянии, соответствующем его назначению, со всеми принадлежностями и документами.', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '4.1.2. Обеспечить техническое обслуживание и текущий ремонт Автомобиля.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '4.2. Арендатор обязуется:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '4.2.1. Использовать Автомобиль в соответствии с его назначением.', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '4.2.2. Своевременно вносить арендную плату.', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '4.2.3. Возвратить Автомобиль Арендодателю в исправном состоянии с учётом нормального износа.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 5. ОТВЕТСТВЕННОСТЬ СТОРОН
          new Paragraph({
            children: [
              new TextRun({ text: '5. ОТВЕТСТВЕННОСТЬ СТОРОН', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '5.1. Стороны несут ответственность за неисполнение или ненадлежащее исполнение своих обязательств по настоящему Договору в соответствии с действующим законодательством РФ.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 6. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ
          new Paragraph({
            children: [
              new TextRun({ text: '6. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '6.1. Все споры и разногласия, возникающие между Сторонами по настоящему Договору, разрешаются путём переговоров.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 7. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
          new Paragraph({
            children: [
              new TextRun({ text: '7. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: '7.1. Настоящий Договор вступает в силу с момента его подписания Сторонами.', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '7.2. Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 8. АДРЕСА И РЕКВИЗИТЫ СТОРОН
          new Paragraph({
            children: [
              new TextRun({ text: '8. АДРЕСА И РЕКВИЗИТЫ СТОРОН', size: 24, bold: true }),
            ],
          }),
          new Paragraph({}),

          // Арендодатель (владелец из настроек)
          new Paragraph({
            children: [
              new TextRun({ text: 'АРЕНДОДАТЕЛЬ:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ФИО: ${data.owner.fullName || '________________________'}`, size: 22 }),
            ],
          }),
          ...(data.owner.birthDate ? [
            new Paragraph({
              children: [
                new TextRun({ text: `Дата рождения: ${formatDateShort(data.owner.birthDate)}`, size: 22 }),
              ],
            }),
          ] : []),
          new Paragraph({
            children: [
              new TextRun({ text: `Паспорт: ${data.owner.passportSeries || ''} ${data.owner.passportNumber || ''}`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Выдан: ${data.owner.passportIssuedBy || ''}${data.owner.passportIssueDate ? ` ${formatDateShort(data.owner.passportIssueDate)}` : ''}`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Адрес регистрации: ${data.owner.registrationAddress || ''}`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Телефон: ${data.owner.phone || ''}`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Арендатор (клиент)
          new Paragraph({
            children: [
              new TextRun({ text: 'АРЕНДАТОР:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ФИО: ${data.client.fullName || '________________________'}`, size: 22 }),
            ],
          }),
          ...(data.client.birthDate ? [
            new Paragraph({
              children: [
                new TextRun({ text: `Дата рождения: ${formatDateShort(data.client.birthDate)}`, size: 22 }),
              ],
            }),
          ] : []),
          new Paragraph({
            children: [
              new TextRun({ text: `Паспорт: ${data.client.passportSeries || ''} ${data.client.passportNumber || ''}`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Выдан: ${data.client.passportIssuedBy || ''}${data.client.passportIssueDate ? ` ${formatDateShort(data.client.passportIssueDate)}` : ''}`, size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Адрес регистрации: ${data.client.registrationAddress || ''}`, size: 22 }),
            ],
          }),
          ...(data.client.phone ? [
            new Paragraph({
              children: [
                new TextRun({ text: `Телефон: ${data.client.phone}`, size: 22 }),
              ],
            }),
          ] : []),
          new Paragraph({}),

          // Подписи
          new Paragraph({
            children: [
              new TextRun({ text: 'ПОДПИСИ СТОРОН:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: 'АРЕНДОДАТЕЛЬ:', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${data.owner.fullName || '________________________'} ________________ /`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          new Paragraph({
            children: [
              new TextRun({ text: 'АРЕНДАТОР:', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${data.client.fullName || '________________________'} ________________ /`, size: 22 }),
            ],
          }),
        ],
      },
    ],
  })

  // Генерируем и скачиваем файл
  const blob = await Packer.toBlob(doc)
  const fileName = `Договор_${data.carLicensePlate}_${data.client.fullName.replace(/\s+/g, '_')}.docx`
  saveAs(blob, fileName)
}

// ============================================================
// АКТ ВЫПОЛНЕННЫХ РАБОТ ПО ДОГОВОРУ АРЕНДЫ
// ============================================================

export interface ServiceActData {
  // Номер акта
  actNumber: string
  actDate: string
  
  // Данные договора
  contractNumber: string
  contractDate: string
  
  // Исполнитель (владелец авто)
  executor: {
    fullName: string | null
    phone?: string | null
  }
  
  // Заказчик (клиент)
  customer: {
    fullName: string
    phone?: string
  }
  
  // Данные аренды
  startDate: string
  endDate: string
  dailyPrice: number
  totalAmount: number
  rentalDays: number
  
  // Данные авто (для наименования услуги)
  carName: string
  carLicensePlate: string
}

/**
 * Генерирует Акт выполненных работ по договору аренды
 * Используется для подтверждения оказания услуг аренды
 */
export async function generateServiceActDocument(data: ServiceActData): Promise<void> {
  // Создаём документ
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 700,
              right: 500,
              bottom: 700,
              left: 850,
            },
          },
        },
        children: [
          // Заголовок
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Акт № ${data.actNumber}`, size: 26, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'выполненных работ по договору аренды', size: 22 }),
            ],
          }),
          new Paragraph({}),
          
          // Дата договора
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `от «____» _________________ 20 __ г.`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          
          // Таблица услуг (адаптивная ширина в процентах)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Заголовок таблицы
              new TableRow({
                children: [
                  createCell('№', 5, true),
                  createCell('Наименование работы (услуги)', 40, true),
                  createCell('Ед. изм.', 10, true),
                  createCell('Количество', 12, true),
                  createCell('Цена', 15, true),
                  createCell('Сумма', 18, true),
                ],
              }),
              // Строка с услугой аренды
              new TableRow({
                children: [
                  createCell('1', 5),
                  createCell(`Аренда автомобиля ${data.carName} (${data.carLicensePlate}) с ${formatDateForContract(data.startDate)} по ${formatDateForContract(data.endDate)}`, 40),
                  createCell('сутки', 10),
                  createCell(String(data.rentalDays), 12),
                  createCell(data.dailyPrice.toLocaleString('ru-RU'), 15),
                  createCell(data.totalAmount.toLocaleString('ru-RU'), 18),
                ],
              }),
              // Пустые строки для дополнительных услуг
              new TableRow({
                children: [
                  createCell('2', 5),
                  createCell('', 40),
                  createCell('', 10),
                  createCell('', 12),
                  createCell('', 15),
                  createCell('', 18),
                ],
              }),
              new TableRow({
                children: [
                  createCell('3', 5),
                  createCell('', 40),
                  createCell('', 10),
                  createCell('', 12),
                  createCell('', 15),
                  createCell('', 18),
                ],
              }),
              new TableRow({
                children: [
                  createCell('4', 5),
                  createCell('', 40),
                  createCell('', 10),
                  createCell('', 12),
                  createCell('', 15),
                  createCell('', 18),
                ],
              }),
              new TableRow({
                children: [
                  createCell('5', 5),
                  createCell('', 40),
                  createCell('', 10),
                  createCell('', 12),
                  createCell('', 15),
                  createCell('', 18),
                ],
              }),
              // Итого
              new TableRow({
                children: [
                  createCell('', 5),
                  createCell('Итого:', 40, true),
                  createCell('', 10),
                  createCell('', 12),
                  createCell('', 15),
                  createCell(data.totalAmount.toLocaleString('ru-RU'), 18, true),
                ],
              }),
              // Без налога
              new TableRow({
                children: [
                  createCell('', 5),
                  createCell('Без налога (НДС):', 40),
                  createCell('', 10),
                  createCell('', 12),
                  createCell('', 15),
                  createCell('—', 18),
                ],
              }),
              // Всего с НДС
              new TableRow({
                children: [
                  createCell('', 5),
                  createCell('Всего (с учетом НДС):', 40, true),
                  createCell('', 10),
                  createCell('', 12),
                  createCell('', 15),
                  createCell(data.totalAmount.toLocaleString('ru-RU'), 18, true),
                ],
              }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({}),
          
          // Сумма прописью
          new Paragraph({
            children: [
              new TextRun({ text: `Всего оказано услуг на сумму: ${formatMoneyWords(data.totalAmount)} рублей, в т.ч. НДС – ${formatMoneyWords(data.totalAmount)} рублей.`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({}),
          
          // Подтверждение
          new Paragraph({
            children: [
              new TextRun({ text: 'Вышеперечисленные работы выполнены полностью и в срок. Заказчик претензий по объему, качеству и срокам выполнения работ претензий не имеет.', size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({}),
          new Paragraph({}),
          
          // Подписи - Исполнитель
          new Paragraph({
            children: [
              new TextRun({ text: 'Исполнитель ', size: 22 }),
              new TextRun({ text: '__________________________________________', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `(${data.executor.fullName || ''})`, size: 20, italics: true }),
            ],
          }),
          new Paragraph({}),
          
          // Подписи - Заказчик
          new Paragraph({
            children: [
              new TextRun({ text: 'Заказчик ', size: 22 }),
              new TextRun({ text: '__________________________________________', size: 22 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `(${data.customer.fullName})`, size: 20, italics: true }),
            ],
          }),
        ],
      },
    ],
  })

  // Генерируем и скачиваем файл
  const blob = await Packer.toBlob(doc)
  const fileName = `Акт_${data.actNumber}_${data.customer.fullName.replace(/\s+/g, '_')}.docx`
  saveAs(blob, fileName)
}

// ============================================================
// ГЕНЕРАЦИЯ ДОГОВОРА АРЕНДЫ С ПРАВОМ ВЫКУПА
// 3 документа в одном файле:
//   1. Договор аренды ТС без экипажа с правом выкупа
//   2. Приложение №1 — Дополнительное соглашение
//   3. Приложение №2 — Акт приёма-передачи ТС
// ============================================================

function formatMonthGenitive(month: number): string {
  const months = [
    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
  ]
  return months[month] || ''
}

export async function generateBuyoutContractDocument(data: BuyoutContractData): Promise<void> {
  // Валидируем дату начала — используем startDate (дату, которую указал пользователь)
  const startDateObj = new Date(data.startDate + 'T12:00:00')
  const hasValidStartDate = data.startDate && /^\d{4}-\d{2}-\d{2}$/.test(data.startDate) && !isNaN(startDateObj.getTime())
  const effectiveStartDate = hasValidStartDate ? startDateObj : new Date()

  const startDay = effectiveStartDate.getDate()
  const startMonth = formatMonthGenitive(effectiveStartDate.getMonth())
  const startYear = effectiveStartDate.getFullYear()

  // Дата договора = дата начала (которую указал пользователь)
  const contractDay = startDay
  const contractMonth = startMonth
  const contractYear = startYear

  // Число оплаты — день начала договора или из данных
  const paymentDay = data.paymentDay || startDay

  // Сумма прописью для выкупной цены
  const buyoutPriceWords = data.buyoutPrice ? formatMoneyWords(data.buyoutPrice) : ''

  // Родственники
  const relative1 = data.relatives?.[0] || { phone: '', name: '' }
  const relative2 = data.relatives?.[1] || { phone: '', name: '' }

  // Данные СТС
  const stsInfo = data.carStsSeries && data.carStsNumber
    ? `серии ${data.carStsSeries} № ${data.carStsNumber}${data.carStsDate ? ` выданного «${formatDateForContract(data.carStsDate)}»` : ''}`
    : 'серии ______ № ____________'

  const doc = new Document({
    sections: [
      // ============================================================
      // ЧАСТЬ 1: ДОГОВОР АРЕНДЫ ТС БЕЗ ЭКИПАЖА С ПРАВОМ ВЫКУПА
      // ============================================================
      {
        properties: {
          page: {
            margin: { top: 700, right: 500, bottom: 700, left: 850 },
          },
        },
        children: [
          // Заголовок
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ДОГОВОР АРЕНДЫ', size: 28, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `транспортного средства без экипажа c правом выкупа №${data.contractNumber}`, size: 24, bold: true }),
            ],
          }),

          // Город и дата
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `г. ${data.contractCity || '____________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `  ${contractDay} ${contractMonth}  ${contractYear}г.`, size: 22, bold: true })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({}),

          // Таблица сторон
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: 'С одной стороны, Арендодатель: ', size: 22, bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: 'С другой стороны, Арендатор: ', size: 22, bold: true })] })],
                  }),
                ],
              }),
              // ФИО
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Гр. ${data.owner.fullName || '________________________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Гр. ${data.client.fullName}`, size: 22 })] })],
                  }),
                ],
              }),
              // Паспорт / Дата рождения
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `паспорт: серия ${data.owner.passportSeries || '____'} № ${data.owner.passportNumber || '______'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: `Дата рождения: ${data.client.birthDate || '____________'}`, size: 22 })] }),
                      new Paragraph({ children: [new TextRun({ text: data.client.registrationAddress || '____________', size: 22 })] }),
                    ],
                  }),
                ],
              }),
              // Выдан / Паспорт + В/У
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Выдан: ${data.owner.passportIssuedBy || '____________'}${data.owner.passportIssueDate ? ` ${formatDateShort(data.owner.passportIssueDate)}` : ''}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: `Паспорт. ${data.client.passportSeries || '____'} серия : ${data.client.passportNumber || '______'}`, size: 22 })] }),
                      ...(data.client.driverLicenseSeries || data.client.driverLicenseNumber ? [
                        new Paragraph({ children: [new TextRun({ text: `В/У ${data.client.driverLicenseSeries || '____'} ${data.client.driverLicenseNumber || '______'}`, size: 22 })] }),
                      ] : []),
                    ],
                  }),
                ],
              }),
              // Адрес / Выдан
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Располагающийся по адресу: ${data.owner.registrationAddress || '____________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: `Выдан: ${data.client.passportIssuedBy || '____________'}`, size: 22 })] }),
                      new Paragraph({ children: [new TextRun({ text: data.client.passportIssueDate ? formatDateShort(data.client.passportIssueDate) : '____________', size: 22 })] }),
                    ],
                  }),
                ],
              }),
              // Телефон / Адрес
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Тел. ${data.owner.phone || '____________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Проживающий по адресу: ${data.client.registrationAddress || '____________'}`, size: 22 })] })],
                  }),
                ],
              }),
              // Пустая строка / Телефон
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: '-', size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Тел. ${data.client.phone || '____________'}`, size: 22 })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({}),

          // Преамбула
          new Paragraph({
            children: [
              new TextRun({ text: 'Совместно именуемые в дальнейшем «Стороны», заключили настоящий договор, в дальнейшем «', size: 22 }),
              new TextRun({ text: 'Договор', size: 22, bold: true }),
              new TextRun({ text: '», о нижеследующем:', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 1. ПРЕДМЕТ ДОГОВОРА
          new Paragraph({ children: [new TextRun({ text: '1. ПРЕДМЕТ ДОГОВОРА', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: '1.1. Арендодатель предоставляет Арендатору за плату во временное владение и пользование принадлежащий Арендодателю на основании свидетельства транспортного средства ', size: 22 }),
              new TextRun({ text: stsInfo, size: 22 }),
              new TextRun({ text: `, легковой автомобиль марки «${data.carBrand} ${data.carModel}», ${data.carYear || '____'} года изготовления, VIN ${data.carVin || '____________'}, кузов № ${data.carVin || '____________'} цвет ${data.carColor || '____________'} государственный регистрационный номер ${data.carLicensePlate} именуемый далее «Автомобиль», без оказания услуг по управлению им, его технической эксплуатации и обслуживанию.`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '1.2. Техническое состояние Автомобиля подтверждается действующим талоном о прохождении технического осмотра Автомобиля (технический осмотр не требуется если автомобиль не старше двух лет), осмотром и проверкой работоспособности двигателя и иного оборудования, установленного на Автомобиле. Автомобиль передается по акту приема-передачи транспортного средства, скрепляемому подписями сторон (Приложение № 2).', size: 22 })],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '1.3. Использование Автомобиля не должно противоречить его назначению.', size: 22 })],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: `1.4. Площадка для приёма и передачи транспорта расположена по адресу: ${data.deliveryAddress || '____________'}.`, size: 22 })],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 2. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЁТОВ
          new Paragraph({ children: [new TextRun({ text: '2. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЁТОВ', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '2.1. Размер арендной платы за пользованием автомобилем и порядок ее уплаты предусматривается дополнительным соглашением к настоящему Договору (Приложение 1).', size: 22 })],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: '2.2. Арендодатель вправе взымать штраф за просрочку платежа в установленный расчетный период до 18:00 ,в размере 5.000р за каждый день просрочки ,сумма задолженности не может достигать более 30.000 рублей.', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 3. ДАТА ЗАКЛЮЧЕНИЯ ДОГОВОРА
          new Paragraph({ children: [new TextRun({ text: '3. ДАТА ЗАКЛЮЧЕНИЯ ДОГОВОРА', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: `3.1. Настоящий Договор вступает в силу c ${data.startTime || '10 час(ов) 00 минут'} «${startDay}» ${startMonth} ${startYear}г. и действует в течении ${data.termMonths} месяцев В случае если за 2 (два) календарных дня до окончания срока действия договора ни одна из сторон не заявила о его расторжении (не направив уведомления, либо по телефону или смс), договор считается заключенным на неопределенный срок. В этом случае расторжение договора возможно в любое время по инициативе любой из сторон с предварительным уведомлением другой стороны за 2(два) календарных дня.`, size: 22 })],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
          new Paragraph({ children: [new TextRun({ text: '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '4.1. Арендодатель обязуется:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '4.1.1. В день вступления в силу настоящего Договора передать Арендатору Автомобиль, указанный в п.1.1 договора.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.1.2. Передать Арендатору документы, относящиеся к автомобилю и необходимые для нормальной эксплуатации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.1.3. Арендодатель вправе проверять сохранность, техническую исправность и комплектность Автомобиля и установленного на нем оборудования. Арендатор не вправе препятствовать проведению осмотра автомобилей.', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '4.2. Арендатор обязуется:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.1. Арендатор обязан осмотреть состояние и комплектацию автомобиля и принять его от Арендодателя, подписав акт приема-передачи автомобиля (Приложение № 2).', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.2. Арендатор обязуется использовать автомобиль в строгом соответствии с его назначением, соблюдать Правила дорожного движения, нести ответственность за соблюдение требований по профилактике и учету ДТП, содержать автомобиль в технически исправном состоянии, иметь при себе необходимые документы, требуемые сотрудниками ГИБДД. Арендатор обязуется строго соблюдать все требования по эксплуатации транспортного средства и условия, указанные в сервисной книжке этого автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.3. Своевременно оповещать Арендодателя и страховую компанию о ДТП. Получать необходимые документы в ГИБДД. Оформлять, получать и подавать все необходимые документы и заявления в Страховую компанию для получения возмещения Арендодателем. В случае невыполнения данных требований Арендатор несёт полную материальную ответственность за повреждения, полученные в результате ДТП.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.4. При повреждении, утрате автомобиля Арендатор обязуется незамедлительно известить об этом Арендодателя, а также уведомить о страховом случае страховую организацию в соответствии с договором страхования и законодательством.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.5. При ДТП, совершенном по вине Арендатора, в случаях, не относящихся к страховым случаям по договорам страхования арендуемых автомобилей (в том числе и алкогольного опьянения и др.), Арендатор обязуется произвести все предусмотренные законом и настоящим договором действия для возврата Арендодателю поврежденного автомобиля, и возместить в течение 14 дней убытки Арендодателю, либо выплатить Арендодателю стоимость автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.6. Обеспечить сохранность регистрационных и других необходимых для эксплуатации документов. В случае их утраты независимо от наличия вины Арендатора, Арендатор обязуется возместить расходы Арендодателю по их восстановлению.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.7. Арендатор обязуется возместить в полном объеме ущерб, причиненный третьим лицам, при эксплуатации автомобиля (ст. 648 ГК РФ). В случае предъявления третьими лицами требований о возмещении ущерба к Арендодателю, Арендатор обязан участвовать в судебных процессах по данному случаю, предоставить Арендатору все документы, связанные с причинением ущерба, возместить Арендодателю все расходы по судебным процессам.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.8. Оплачивать горюче-смазочные материалы, которыми будет заправляться Автомобиль в период его использования. При эксплуатации автомобиля использовать исключительно те горюче-смазочные материалы, которые указаны в сервисной книжке.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.9. По требованию Арендодателя, а также в случае досрочного расторжения договора, вернуть в этот же день автомобиль в том состоянии, в котором он был получен (с учетом нормативного износа) в комплектации, полученной от Арендодателя. Передача осуществляется в порядке, установленным настоящим договором. Факт передачи оформляется актом приема-передачи автомобиля (Приложение 1).', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.10. При возвращении автомобиля Арендодателю Арендатор обязан вернуть автомобиль в комплектации, в которой он передавался, заправленным и чистым. При возврате автомобиля с нарушением комплектности Арендатор уплачивает Арендодателю стоимость невозвращенного комплекта.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.11. Не вносить без согласия Арендодателя изменений и дополнений во внешний вид и конструкцию Автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.12. Не передавать управление Автомобилем третьим лицам без письменного разрешения Арендодателя. При передаче Автомобиля третьим лицам, с разрешения Арендодателя, стоимость проката увеличивается на 1000 рублей в сутки. При передаче Автомобиля третьим лицам без разрешения Арендодателя – штраф 50000 рублей и расторжение договора.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.13. Оплатить штраф(ы), полученный(ые) по его вине, в том числе вынесенный(ые) с помощью автоматических средств фото-видео фиксации, передав необходимую сумму денег Арендодателю не позднее 7 дней после фактического получения штрафа(ов).', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.16. По окончании периода использования Автомобиля вернуть его на то же место указанное пункте 1.4, откуда он его взял в начале использования, в противном случае оплатить Арендодателю все расходы по возврату автомобиля в исходное место и 10000 рублей, как компенсацию за потерю времени.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.17. Не курить в салоне Автомобиля, и исключить случаи курения пассажирами в данном Автомобиле. В случае обнаружения Арендодателем последствий курения в салоне, оплатить штраф в размере 10000 рублей.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.18. Вернуть автомобиль Арендодателю в чистом виде (проведя комплексную мойку на специализированной моечной станции) если автомобиль был передан Арендатору в чистом виде. Если автомобиль был передан Арендатору в не чистом виде, то Арендатор может не выполнять данный пункт.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.19. Устранить за свой счет любые повреждения в том числе произошедшие при ДТП, которые произошли по его вине или при отсутствии вины в результате действий третьих лиц (кроме случаев если личность третьих лиц известна и вина третьих лиц доказана соответствующим документом), не позднее 14 дней с момента ДТП, либо передав сумму денег на восстановление Автомобиля Арендодателю, по оценочной стоимости повреждений в организации, осуществляющей данные услуги.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.20. Передать копию своего паспорта и водительского удостоверения Арендодателю, либо отправить по электронной почте сканы документов.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.22. Ознакомиться с правилами эксплуатации автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.23. Поддерживать уровень бензина в баке не меньше четверти, если машина с газовым оборудованием.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.24. При эксплуатации не допускать превышение суточного пробега свыше 400 км.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.25. Эксплуатировать транспортное средство в пределах г.Ростова на Дону или его пригородах, но не далее 300 км.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.26. При возврате автомобиля уровень топлива в баке должен соответствовать уровню на момент передачи автомобиля Арендатору', size: 22 })] }),
          new Paragraph({}),

          // РАЗДЕЛ 5. ОТВЕТСТВЕННОСТЬ СТОРОН
          new Paragraph({ children: [new TextRun({ text: '5. ОТВЕТСТВЕННОСТЬ СТОРОН, ПОРЯДОК РАСТОРЖЕНИЯ ДОГОВОРА И РАССМОТРЕНИЯ СПОРОВ', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '5.1. В случае просрочки внесения арендной платы Арендатор уплачивает Арендодателю штраф- 1000 рублей за каждый день прострочки, ', size: 22 }), new TextRun({ text: 'на второй день договор расторгается, машина забирается.', size: 22, bold: true })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '5.2. В случае нарушения условий Арендатором по содержанию машины в чистом виде. Арендодатель предъявляет штраф- 5000 рублей за каждый выявленный случай.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.3. Нести ответственность за несоблюдение правил дорожного движения, правил благоустройства, действующих в месте эксплуатации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.4. Арендатор самостоятельно несёт гражданско-правовую ответственность за вред, причинённый автомобилям, третьим лицам, имуществу третьих лиц, а также возмещает вред, нанесённый здоровью третьих лиц.', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '5.5. Досрочное расторжение Договора допускается в следующих случаях:', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1. По инициативе Арендодателя:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1.1. если Арендатор использует Автомобиль не в соответствии с целями его предоставления;', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1.2. если Арендатор умышленно ухудшает состояние Автомобиля, либо не выполняет возложенную на него обязанность по надлежащему содержанию;', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1.3. Нарушает требования, указанные в приложении № 1 к настоящему договору.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.2. По инициативе Арендатора:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.2.1. при изменении его финансового положения, в результате чего он вынужден отказаться от аренды Автомобиля с предварительным уведомлением Арендодателя не менее чем за 7 дней до даты расторжения;', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.6. За неисполнение или ненадлежащее исполнение своих обязательств по настоящему Договору Стороны несут ответственность в соответствии с действующим законодательством Российской Федерации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.7. Любой спор, разногласие или претензия, вытекающие из или в связи с настоящим договором либо его нарушением, прекращением или недействительностью подлежат разрешению в Волгодонском районном суде города Волгодонска Ростовской Области, либо в Мировом суде города Волгодонска участок № 4, в зависимости от суммы иска.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.8. В случае досрочного расторжения настоящего договора взаиморасчеты между сторонами производятся не позднее дня передачи автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.9. При досрочном расторжении договора по инициативе Арендатора арендная плата и обеспечительный платеж не возвращается.', size: 22 })] }),
          new Paragraph({}),

          // РАЗДЕЛ 6. ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ
          new Paragraph({ children: [new TextRun({ text: '6. ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '6.1. Договор может быть изменен по письменному соглашению Сторон.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.2. Условия настоящего договора являются конфиденциальными и не подлежат разглашению третьим лицам без письменного согласия другой Стороны. Стороны обязуются соблюдать конфиденциальность в отношении всей информации, полученной в связи с реализацией настоящего Договора. Сторонам запрещается представлять каким-либо лицам в каком-либо порядке доступ к информации и документам, полученным ими в связи с реализацией настоящего Договора, если иное прямо не предусмотрено законодательством Российской Федерации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.3. Все приложения к настоящему договору имеют юридическую силу, если они составлены в письменной форме и подписаны обеими Сторонами.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.4. Стороны подтверждают, что отсутствуют обстоятельства, вынуждающие совершить настоящий договор на крайне невыгодных для себя условиях.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.5. Отношения сторон, не урегулированные настоящим договором, регламентируются действующим законодательством РФ.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.6. Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из сторон.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 7 — обеспечительный платеж
          new Paragraph({
            children: [
              new TextRun({ text: '7. Обеспечительный платеж', size: 22, bold: true }),
              new TextRun({ text: ' идет в счет погашения остаточного платежа от общей выкупной стоимости автомобиля по договору. При досрочном расторжении ', size: 22 }),
              new TextRun({ text: 'обеспечительный платеж', size: 22, bold: true }),
              new TextRun({ text: ' не возвращается, идет в счет погашения амортизируемая стоимость.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Приложения
          new Paragraph({ children: [new TextRun({ text: 'Приложения:', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '1. Приложение №1 дополнительное соглашение с условиями оплаты.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '2. Приложение № 2 Акт приема передачи', size: 22 })] }),
          new Paragraph({}),

          // Подписи
          new Paragraph({ children: [new TextRun({ text: '7. ПОДПИСИ СТОРОН', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: 'Арендодатель:                                                                Арендатор:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: `___________________/_____________________/        ___________________/____________________________/`, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: ' (подпись)                         (фамилия, инициалы)                      (подпись)                           (фамилия, инициалы)', size: 20 })],
          }),
        ],
      },

      // ============================================================
      // ЧАСТЬ 2: ПРИЛОЖЕНИЕ №1 — ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ
      // ============================================================
      {
        properties: {
          page: {
            margin: { top: 700, right: 500, bottom: 700, left: 850 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Приложение № 1 к', size: 24, bold: true }),
              new TextRun({ text: ' ДОГОВОРУ АРЕНДЫ', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'транспортного средства без экипажа', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'с последующим выкупом', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: ` от «${contractDay}» ${contractMonth} ${contractYear}г.`, size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Дополнительное соглашение', size: 26, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `г. ${data.contractCity || '____________'}`, size: 22 })],
          }),
          new Paragraph({}),

          // Пункт 1 — арендная плата
          new Paragraph({
            children: [
              new TextRun({ text: `1. Арендная плата за пользование Автомобилем по настоящему Договору составляет `, size: 22 }),
              new TextRun({ text: `${data.monthlyPayment.toLocaleString('ru-RU')}₽ рублей в месяц каждого ${paymentDay} числа`, size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),

          // Пункт 2 — обеспечительный платеж
          new Paragraph({
            children: [
              new TextRun({ text: '2. В день заключения договора с момента Арендатор оплачивает ', size: 22 }),
              new TextRun({ text: 'обеспечительный платеж', size: 22, bold: true }),
              new TextRun({ text: ` в размере ${data.deposit > 0 ? data.deposit.toLocaleString('ru-RU') : '____________'} руб.`, size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),

          // Пункт 3
          new Paragraph({ children: [new TextRun({ text: '3. В случае повреждения автомобиля, в результате ДТП по вине Арендатора, когда автомобиль временно не может использоваться по назначению, на период его ремонта, Арендатор также выплачивает Арендодателю сумму арендных платежей каждый день, указанную в дополнительном соглашении, пункт 1., до тех пор, пока автомобиль полностью будет восстановлен в прежнее состояние.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 4
          new Paragraph({ children: [new TextRun({ text: '4. Арендная плата за пользование автомобилем выплачивается вовремя каждый месяц, или по предоплате, до момента, когда выкупная цена будет полностью выплачена. Просрочка оплаты арендных платежей – штраф 10000 рублей/день.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 5
          new Paragraph({ children: [new TextRun({ text: '5. Если Арендатор намерен завершить пользование арендным автомобилем, он должен поставить в известность.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 6 — выкупная цена
          new Paragraph({
            children: [
              new TextRun({ text: `6. Выкупная цена Автомобиля на момент заключения договора составляет `, size: 22 }),
              new TextRun({ text: `${(data.buyoutPrice ?? 0).toLocaleString('ru-RU')} ${buyoutPriceWords} рублей`, size: 22, bold: true }),
              new TextRun({ text: `) . Срок выкупа автомобиля по настоящему договору составляет `, size: 22 }),
              new TextRun({ text: `${data.termMonths} `, size: 22, bold: true }),
              new TextRun({ text: 'месяцев.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Пункт 7.1
          new Paragraph({ children: [new TextRun({ text: '\t7.1. До истечения Договора, Арендатор вправе выкупить Автомобиль по остаточной цене. Остаточная цена определяется путем вычитания из выкупной цены, указанной в п.7 дополнительного соглашения, суммы произведенных ранее арендных платежей по настоящему Договору.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '\t7.2. Арендные платежи, произведенные Арендатором по настоящему Договору, не подлежат возврату в случае расторжения настоящего Договора.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 8
          new Paragraph({ children: [new TextRun({ text: '8. Право собственности на Автомобиль перейдет от Арендодателя к Арендатору после того, как:', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '\t8.1. Арендатор своевременно и в полном объеме оплатит арендные платежи.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '\t8.2. Арендатор оплатит всю стоимость выкупной цены Автомобиля в размере, указанном в п.7 дополнительного соглашения.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '\t8.3. Стороны настоящего Договора подпишут акт приема-передачи Автомобиля в собственность Арендатора.', size: 22 })] }),
          new Paragraph({}),

          // Пункты 9-22
          new Paragraph({ children: [new TextRun({ text: '9 При возникновении задолженности в сумме более 5000 (пяти тысяч) рублей, денежные средства, внесенные Арендатором не будут учитываются в выкупную стоимость, пока долг не будет погашен. Эти денежные средства будут учитываться как арендные платежи, при наличии задолженности Арендатора перед Арендодателем.', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '10. Арендатор обязан иметь приложение «Whatsapp,Max», вовремя отвечать на сообщения, всегда быть на связи.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '11. Арендатор обязан машину содержать в чистом виде. В машине не кушать. В машине не курить. Грязная машина - штраф 5000 рублей.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '12. Арендатор обязан ставить в известность, при поездке за город В случае не извещения штраф в размере 10000 (десять тысяч) рублей, и 10000 (десять тысяч) рублей за каждый день нахождения автомобиля за городом.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '13. Арендатор обязан не ставить автомобиль на зеленую зону. Штраф 5000.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '14. Арендатор обязан не превышать скоростной режим и ездить по правилам ПДД.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '15. Если на машине стоит Газ, то Арендатор обязан поддерживать уровень бензина в баке не меньше четверти. Штраф 500.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '16. Арендатор обязан не давать право управления транспортным средством третьим лицам.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '17. Штрафы оплачиваются в первую очередь с арендных платежей.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '18. Во время прохождения ТО автомобиля, независимо от времени, проведенным в сервисе, никаких скидок по арендной плате не предоставляется.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '19. Суточный пробег транспортного средства не должен превышать 400 (четыреста) километров в сутки.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '20. Настоящее дополнительное соглашение вступает в силу с момента его подписания.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '21. Настоящее соглашение составлено в 2-х (двух) экземплярах, имеющих равную юридическую силу.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '22. За личные вещи, оставленные в автомобиле, Арендодатель ответственности не несет.', size: 22 })] }),
          new Paragraph({}),

          // Родственники
          new Paragraph({ children: [new TextRun({ text: 'Арендатор сообщил два номера телефона своих родственников для связи с ним, в случае если связь с ним будет потеряна:', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: ` ${relative1.phone || '_____________________'} / ${relative1.name || '_______________________'}`, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '(номер телефона)                    (имя, кем является)', size: 20 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: ` ${relative2.phone || '_____________________'} / ${relative2.name || '_______________________'}`, size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '(номер телефона)                    (имя, кем является)', size: 20 })],
          }),
          new Paragraph({}),

          // Подписи приложения №1
          new Paragraph({
            children: [
              new TextRun({ text: 'Арендодатель:                                                               Арендатор:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '___________________/_____________________/        ___________________/_____________________/', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '(подпись)                           (фамилия, инициалы)                   (подпись)                            (фамилия, инициалы)', size: 20 })],
          }),
        ],
      },

      // ============================================================
      // ЧАСТЬ 3: ПРИЛОЖЕНИЕ №2 — АКТ ПРИЁМА-ПЕРЕДАЧИ ТС
      // ============================================================
      {
        properties: {
          page: {
            margin: { top: 700, right: 500, bottom: 700, left: 850 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Приложение № 2', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: ' к ', size: 22 }),
              new TextRun({ text: 'ДОГОВОРУ АРЕНДЫ', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'транспортного средства без экипажа', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `№ ${data.contractNumber} от «${contractDay}» ${contractMonth} ${contractYear}г.`, size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'АКТ', size: 28, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'приема-передачи транспортного средства', size: 24, bold: true })],
          }),
          new Paragraph({}),

          // Преамбула акта
          new Paragraph({
            children: [
              new TextRun({ text: `Гр. ${data.owner.fullName || '________________________'} именуемый в дальнейшем «`, size: 22 }),
              new TextRun({ text: 'Арендодатель', size: 22, bold: true }),
              new TextRun({ text: '», с одной стороны, и гр. ', size: 22 }),
              new TextRun({ text: data.client.fullName, size: 22 }),
              new TextRun({ text: '   именуемый в дальнейшем «', size: 22 }),
              new TextRun({ text: 'Арендатор', size: 22, bold: true }),
              new TextRun({ text: '», с другой стороны, составили настоящий Акт.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Пункт 1 — данные авто
          new Paragraph({
            children: [
              new TextRun({ text: `1.  Арендодатель передал, а Арендатор принял легковой автомобиль ${stsInfo}, легковой автомобиль марки «${data.carBrand} ${data.carModel}», ${data.carYear || '____'} года изготовления , VIN ${data.carVin || '____________'}, кузов № ${data.carVin || '____________'}, цвет ${data.carColor || '____________'}, государственный регистрационный номер ${data.carLicensePlate} именуемый далее . Автомобиль укомплектован полностью.`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Пункт 3
          new Paragraph({ children: [new TextRun({ text: '3. При приеме автомобиля Арендатору переданы следующие документы: свидетельство о регистрации, страховой полис по ОСАГО.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 4
          new Paragraph({ children: [new TextRun({ text: '4. Арендодатель предоставил Арендатору в полном объеме необходимую информацию об автомобиле в соответствии с руководством по эксплуатации.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 5
          new Paragraph({ children: [new TextRun({ text: '5. Настоящий акт составлен и подписан в двух экземплярах, имеющих равную юридическую силу, и хранится по одному у каждой из сторон.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 6
          new Paragraph({ children: [new TextRun({ text: '6. Настоящий акт является неотъемлемой частью договора аренды.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 7
          new Paragraph({ children: [new TextRun({ text: '7. При передачи автомобиля использовались средства фото и видео фиксации.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 8
          new Paragraph({
            children: [new TextRun({ text: '8.Автомобиль сдается чистый и заправленный, мойка 2500₽ заправка +500₽ по чеку', size: 22, bold: true })],
          }),
          new Paragraph({}),

          // Подписи акта
          new Paragraph({
            children: [
              new TextRun({ text: 'Арендодатель:                                                                Арендатор:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '___________________/_____________________/        ___________________/____________________________/', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: ' (подпись)                         (фамилия, инициалы)                      (подпись)                           (фамилия, инициалы)', size: 20 })],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `Договор_выкуп_${data.carLicensePlate}_${data.client.fullName.replace(/\s+/g, '_')}.docx`
  saveAs(blob, fileName)
}

// ============================================================
// ГЕНЕРАЦИЯ ДОГОВОРА АРЕНДЫ БЕЗ ВЫКУПА
// 3 документа в одном файле:
//   1. Договор аренды ТС без экипажа
//   2. Приложение №1 — Дополнительное соглашение (условия оплаты)
//   3. Приложение №2 — Акт приёма-передачи ТС
// ============================================================

export async function generateSimpleRentalContractDocument(data: SimpleRentalContractData): Promise<void> {
  // Валидируем дату начала
  const startDateObj = new Date(data.startDate + 'T12:00:00')
  const hasValidStartDate = data.startDate && /^\d{4}-\d{2}-\d{2}$/.test(data.startDate) && !isNaN(startDateObj.getTime())
  const effectiveStartDate = hasValidStartDate ? startDateObj : new Date()

  const startDay = effectiveStartDate.getDate()
  const startMonth = formatMonthGenitive(effectiveStartDate.getMonth())
  const startYear = effectiveStartDate.getFullYear()

  // Дата договора = дата начала
  const contractDay = startDay
  const contractMonth = startMonth
  const contractYear = startYear

  // Данные СТС
  const stsInfo = data.carStsSeries && data.carStsNumber
    ? `серии ${data.carStsSeries} № ${data.carStsNumber}${data.carStsDate ? ` выданного «${formatDateForContract(data.carStsDate)}»` : ''}`
    : 'серии ______ № ____________'

  const doc = new Document({
    sections: [
      // ============================================================
      // ЧАСТЬ 1: ДОГОВОР АРЕНДЫ ТС БЕЗ ЭКИПАЖА
      // ============================================================
      {
        properties: {
          page: {
            margin: { top: 700, right: 500, bottom: 700, left: 850 },
          },
        },
        children: [
          // Заголовок
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ДОГОВОР АРЕНДЫ', size: 28, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `транспортного средства без экипажа №${data.contractNumber}`, size: 24, bold: true }),
            ],
          }),

          // Город и дата
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `г. ${data.contractCity || '____________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `  ${contractDay} ${contractMonth}  ${contractYear}г.`, size: 22, bold: true })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({}),

          // Таблица сторон
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: 'С одной стороны, Арендодатель: ', size: 22, bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: 'С другой стороны, Арендатор: ', size: 22, bold: true })] })],
                  }),
                ],
              }),
              // ФИО
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Гр. ${data.owner.fullName || '________________________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Гр. ${data.client.fullName}`, size: 22 })] })],
                  }),
                ],
              }),
              // Паспорт / Дата рождения
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `паспорт: серия ${data.owner.passportSeries || '____'} № ${data.owner.passportNumber || '______'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: `Дата рождения: ${data.client.birthDate || '____________'}`, size: 22 })] }),
                      new Paragraph({ children: [new TextRun({ text: data.client.registrationAddress || '____________', size: 22 })] }),
                    ],
                  }),
                ],
              }),
              // Выдан / Паспорт + В/У
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Выдан: ${data.owner.passportIssuedBy || '____________'}${data.owner.passportIssueDate ? ` ${formatDateShort(data.owner.passportIssueDate)}` : ''}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: `Паспорт. ${data.client.passportSeries || '____'} серия : ${data.client.passportNumber || '______'}`, size: 22 })] }),
                      ...(data.client.driverLicenseSeries || data.client.driverLicenseNumber ? [
                        new Paragraph({ children: [new TextRun({ text: `В/У ${data.client.driverLicenseSeries || '____'} ${data.client.driverLicenseNumber || '______'}`, size: 22 })] }),
                      ] : []),
                    ],
                  }),
                ],
              }),
              // Адрес / Выдан
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Располагающийся по адресу: ${data.owner.registrationAddress || '____________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: `Выдан: ${data.client.passportIssuedBy || '____________'}`, size: 22 })] }),
                      new Paragraph({ children: [new TextRun({ text: data.client.passportIssueDate ? formatDateShort(data.client.passportIssueDate) : '____________', size: 22 })] }),
                    ],
                  }),
                ],
              }),
              // Телефон / Адрес
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Тел. ${data.owner.phone || '____________'}`, size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Проживающий по адресу: ${data.client.registrationAddress || '____________'}`, size: 22 })] })],
                  }),
                ],
              }),
              // Пустая строка / Телефон
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: '-', size: 22 })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [new Paragraph({ children: [new TextRun({ text: `Тел. ${data.client.phone || '____________'}`, size: 22 })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({}),

          // Преамбула
          new Paragraph({
            children: [
              new TextRun({ text: 'Совместно именуемые в дальнейшем «Стороны», заключили настоящий договор, в дальнейшем «', size: 22 }),
              new TextRun({ text: 'Договор', size: 22, bold: true }),
              new TextRun({ text: '», о нижеследующем:', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 1. ПРЕДМЕТ ДОГОВОРА
          new Paragraph({ children: [new TextRun({ text: '1. ПРЕДМЕТ ДОГОВОРА', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: '1.1. Арендодатель предоставляет Арендатору за плату во временное владение и пользование принадлежащий Арендодателю на основании свидетельства транспортного средства ', size: 22 }),
              new TextRun({ text: stsInfo, size: 22 }),
              new TextRun({ text: `, легковой автомобиль марки «${data.carBrand} ${data.carModel}», ${data.carYear || '____'} года изготовления, VIN ${data.carVin || '____________'}, кузов № ${data.carVin || '____________'} цвет ${data.carColor || '____________'} государственный регистрационный номер ${data.carLicensePlate} именуемый далее «Автомобиль», без оказания услуг по управлению им, его технической эксплуатации и обслуживанию.`, size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '1.2. Техническое состояние Автомобиля подтверждается действующим талоном о прохождении технического осмотра Автомобиля (технический осмотр не требуется если автомобиль не старше двух лет), осмотром и проверкой работоспособности двигателя и иного оборудования, установленного на Автомобиле. Автомобиль передается по акту приема-передачи транспортного средства, скрепляемому подписями сторон (Приложение № 2).', size: 22 })],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '1.3. Использование Автомобиля не должно противоречить его назначению.', size: 22 })],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: `1.4. Площадка для приёма и передачи транспорта расположена по адресу: ${data.deliveryAddress || '____________'}.`, size: 22 })],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 2. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЁТОВ
          new Paragraph({ children: [new TextRun({ text: '2. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЁТОВ', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '2.1. Размер арендной платы за пользованием автомобилем и порядок ее уплаты предусматривается дополнительным соглашением к настоящему Договору (Приложение 1).', size: 22 })],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: '2.2. Арендодатель вправе поднять арендную плату в период срока действия договора в одностороннем порядке. Арендатор вправе отказаться и расторгнуть договор.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 3. ДАТА ЗАКЛЮЧЕНИЯ ДОГОВОРА
          new Paragraph({ children: [new TextRun({ text: '3. ДАТА ЗАКЛЮЧЕНИЯ ДОГОВОРА', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: `3.1. Настоящий Договор вступает в силу c ${data.startTime || '17 час(ов) 00минут'} «${startDay}» ${startMonth} ${startYear}г. и действует в течении ${data.termDays} суток ,В случае если за одни сутки  до окончания срока действия договора ни одна из сторон не заявила о его расторжении (не направив уведомления, либо по телефону или смс), договор считается заключенным на неопределенный срок. В этом случае расторжение договора возможно в любое время по инициативе любой из сторон с предварительным уведомлением другой стороны за одни  сутки .`, size: 22 })],
          }),
          new Paragraph({}),

          // РАЗДЕЛ 4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
          new Paragraph({ children: [new TextRun({ text: '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '4.1. Арендодатель обязуется:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '4.1.1. В день вступления в силу настоящего Договора передать Арендатору Автомобиль, указанный в п.1.1 договора.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.1.2. Передать Арендатору документы, относящиеся к автомобилю и необходимые для нормальной эксплуатации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.1.3. Арендодатель вправе проверять сохранность, техническую исправность и комплектность Автомобиля и установленного на нем оборудования. Арендатор не вправе препятствовать проведению осмотра автомобилей.', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '4.2. Арендатор обязуется:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.1. Арендатор обязан осмотреть состояние и комплектацию автомобиля и принять его от Арендодателя, подписав акт приема-передачи автомобиля (Приложение № 2).', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.2. Арендатор обязуется использовать автомобиль в строгом соответствии с его назначением, соблюдать Правила дорожного движения, нести ответственность за соблюдение требований по профилактике и учету ДТП, содержать автомобиль в технически исправном состоянии, иметь при себе необходимые документы, требуемые сотрудниками ГИБДД. Арендатор обязуется строго соблюдать все требования по эксплуатации транспортного средства и условия, указанные в сервисной книжке этого автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.3. Своевременно оповещать Арендодателя и страховую компанию о ДТП. Получать необходимые документы в ГИБДД. Оформлять, получать и подавать все необходимые документы и заявления в Страховую компанию для получения возмещения Арендодателем. В случае невыполнения данных требований Арендатор несёт полную материальную ответственность за повреждения, полученные в результате ДТП.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.4. При повреждении, утрате автомобиля Арендатор обязуется незамедлительно известить об этом Арендодателя, а также уведомить о страховом случае страховую организацию в соответствии с договором страхования и законодательством.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.5. При ДТП, совершенном по вине Арендатора, в случаях, не относящихся к страховым случаям по договорам страхования арендуемых автомобилей (в том числе и алкогольного опьянения и др.), Арендатор обязуется произвести все предусмотренные законом и настоящим договором действия для возврата Арендодателю поврежденного автомобиля, и возместить в течение 14 дней убытки Арендодателю, либо выплатить Арендодателю стоимость автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.6. Обеспечить сохранность регистрационных и других необходимых для эксплуатации документов. В случае их утраты независимо от наличия вины Арендатора, Арендатор обязуется возместить расходы Арендодателю по их восстановлению.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.7. Арендатор обязуется возместить в полном объеме ущерб, причиненный третьим лицам, при эксплуатации автомобиля (ст. 648 ГК РФ). В случае предъявления третьими лицами требований о возмещении ущерба к Арендодателю, Арендатор обязан участвовать в судебных процессах по данному случаю, предоставить Арендатору все документы, связанные с причинением ущерба, возместить Арендодателю все расходы по судебным процессам.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.8. Оплачивать горюче-смазочные материалы, которыми будет заправляться Автомобиль в период его использования. При эксплуатации автомобиля использовать исключительно те горюче-смазочные материалы, которые указаны в сервисной книжке.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.9. По требованию Арендодателя, а также в случае досрочного расторжения договора, вернуть в этот же день автомобиль в том состоянии, в котором он был получен (с учетом нормативного износа) в комплектации, полученной от Арендодателя. Передача осуществляется в порядке, установленным настоящим договором. Факт передачи оформляется актом приема-передачи автомобиля (Приложение 1).', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.10. При возвращении автомобиля Арендодателю Арендатор обязан вернуть автомобиль в комплектации, в которой он передавался. При возврате автомобиля с нарушением комплектности Арендатор уплачивает Арендодателю стоимость невозвращенного комплекта.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.11. Не вносить без согласия Арендодателя изменений и дополнений во внешний вид и конструкцию Автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.12. Не передавать управление Автомобилем третьим лицам без письменного разрешения Арендодателя. При передаче Автомобиля третьим лицам, с разрешения Арендодателя, стоимость проката увеличивается на 10000 рублей в сутки. При передаче Автомобиля третьим лицам без разрешения Арендодателя – штраф 50000 рублей и расторжение договора.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.13. Оплатить штраф(ы), полученный(ые) по его вине, в том числе вынесенный(ые) с помощью автоматических средств фото-видео фиксации, передав необходимую сумму денег Арендодателю не позднее 7 дней после фактического получения штрафа(ов).', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.16. По окончании периода использования Автомобиля вернуть его на то же место указанное пункте 1.4, откуда он его взял в начале использования, в противном случае оплатить Арендодателю все расходы по возврату автомобиля в исходное место и 10000 рублей, как компенсацию за потерю времени.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.17. Не курить в салоне Автомобиля, и исключить случаи курения пассажирами в данном Автомобиле. В случае обнаружения Арендодателем последствий курения в салоне, оплатить штраф в размере 10000 рублей.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.18. Вернуть автомобиль Арендодателю в чистом виде (проведя комплексную мойку на специализированной моечной станции) если автомобиль был передан Арендатору в чистом виде. Если автомобиль был передан Арендатору в не чистом виде, то Арендатор может не выполнять данный пункт.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.19. Устранить за свой счет любые повреждения в том числе произошедшие при ДТП, которые произошли по его вине или при отсутствии вины в результате действий третьих лиц (кроме случаев если личность третьих лиц известна и вина третьих лиц доказана соответствующим документом), не позднее 14 дней с момента ДТП, либо передав сумму денег на восстановление Автомобиля Арендодателю, по оценочной стоимости повреждений в организации, осуществляющей данные услуги.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.20. Передать копию своего паспорта и водительского удостоверения Арендодателю, либо отправить по электронной почте сканы документов.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.22. Ознакомиться с правилами эксплуатации автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.23. Поддерживать уровень бензина в баке не меньше четверти, если машина с газовым оборудованием.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.24. При эксплуатации не допускать превышение суточного пробега свыше 400 км.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.25. Эксплуатировать транспортное средство в пределах Ростова на Дону  или его пригородах, но не далее 200 км и границ  Ростовской области, допускается согласования по телефону смс с подтверждением обратной связи.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '4.2.26. При возврате автомобиля уровень топлива в баке должен соответствовать уровню на момент передачи автомобиля Арендатору.', size: 22 })] }),
          new Paragraph({}),

          // РАЗДЕЛ 5. ОТВЕТСТВЕННОСТЬ СТОРОН
          new Paragraph({ children: [new TextRun({ text: '5. ОТВЕТСТВЕННОСТЬ СТОРОН, ПОРЯДОК РАСТОРЖЕНИЯ ДОГОВОРА И РАССМОТРЕНИЯ СПОРОВ', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '5.1. В случае просрочки внесения арендной платы Арендатор уплачивает Арендодателю штраф- 5000 рублей за каждый день прострочки, на второй день договор расторгается, машина забирается.', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '5.2. В случае нарушения условий Арендатором по содержанию машины в чистом виде. Арендодатель предъявляет штраф- 5000 рублей за каждый выявленный случай.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.3. Нести ответственность за несоблюдение правил дорожного движения, правил благоустройства, действующих в месте эксплуатации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.4. Арендатор самостоятельно несёт гражданско-правовую ответственность за вред, причинённый автомобилям, третьим лицам, имуществу третьих лиц, а также возмещает вред, нанесённый здоровью третьих лиц.', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '5.5. Досрочное расторжение Договора допускается в следующих случаях:', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1. По инициативе Арендодателя:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1.1. если Арендатор использует Автомобиль не в соответствии с целями его предоставления;', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1.2. если Арендатор умышленно ухудшает состояние Автомобиля, либо не выполняет возложенную на него обязанность по надлежащему содержанию;', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.1.3. Нарушает требования, указанные в приложении № 1 к настоящему договору.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.2. По инициативе Арендатора:', size: 22, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: '5.5.2.1. при изменении его финансового положения, в результате чего он вынужден отказаться от аренды Автомобиля с предварительным уведомлением Арендодателя не менее чем за 7 дней до даты расторжения;', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.6. За неисполнение или ненадлежащее исполнение своих обязательств по настоящему Договору Стороны несут ответственность в соответствии с действующим законодательством Российской Федерации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.7. Любой спор, разногласие или претензия, вытекающие из или в связи с настоящим договором либо его нарушением, прекращением или недействительностью подлежат разрешению в Волгодонском районном суде города Волгодонска Ростовской Области, либо в Мировом суде города Волгодонска участок № 4, в зависимости от суммы иска.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.8. В случае досрочного расторжения настоящего договора взаиморасчеты между сторонами производятся не позднее дня передачи автомобиля.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '5.9. При досрочном расторжении договора по инициативе Арендатора арендная плата и обеспечительный платеж не возвращается.', size: 22 })] }),
          new Paragraph({}),

          // РАЗДЕЛ 6. ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ
          new Paragraph({ children: [new TextRun({ text: '6. ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '6.1. Договор может быть изменен по письменному соглашению Сторон.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.2. Условия настоящего договора являются конфиденциальными и не подлежат разглашению третьим лицам без письменного согласия другой Стороны. Стороны обязуются соблюдать конфиденциальность в отношении всей информации, полученной в связи с реализацией настоящего Договора. Сторонам запрещается представлять каким-либо лицам в каком-либо порядке доступ к информации и документам, полученным ими в связи с реализацией настоящего Договора, если иное прямо не предусмотрено законодательством Российской Федерации.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.3. Все приложения к настоящему договору имеют юридическую силу, если они составлены в письменной форме и подписаны обеими Сторонами.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.4. Стороны подтверждают, что отсутствуют обстоятельства, вынуждающие совершить настоящий договор на крайне невыгодных для себя условиях.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.5. Отношения сторон, не урегулированные настоящим договором, регламентируются действующим законодательством РФ.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '6.6. Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из сторон.', size: 22 })] }),
          new Paragraph({}),

          // РАЗДЕЛ 7. ОБЕСПЕЧИТЕЛЬНЫЙ ПЛАТЕЖ
          new Paragraph({
            children: [
              new TextRun({ text: '7. Обеспечительный платеж', size: 22, bold: true }),
              new TextRun({ text: ' идет в счет погашения крайних двух дней договора, а также штрафов ПДД и выявленных нарушений условий договора. При досрочном расторжении обеспечительный платеж не возвращается.', size: 22 }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: 'Возврат обеспечительного платежа осуществляется в период от 14 до 21 суток.', size: 22 })] }),
          new Paragraph({}),

          // Приложения
          new Paragraph({ children: [new TextRun({ text: 'Приложения:', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '1. Приложение №1 дополнительное соглашение с условиями оплаты.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '2. Приложение № 2 Акт приема передачи', size: 22 })] }),
          new Paragraph({}),

          // Подписи
          new Paragraph({ children: [new TextRun({ text: '7. ПОДПИСИ СТОРОН', size: 24, bold: true })] }),
          new Paragraph({}),
          new Paragraph({
            children: [
              new TextRun({ text: 'Арендодатель:                                                                Арендатор:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '___________________/_____________________/        ___________________/____________________________/', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: ' (подпись)                         (фамилия, инициалы)                      (подпись)                           (фамилия, инициалы)', size: 20 })],
          }),
        ],
      },

      // ============================================================
      // ЧАСТЬ 2: ПРИЛОЖЕНИЕ №1 — ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ
      // ============================================================
      {
        properties: {
          page: {
            margin: { top: 700, right: 500, bottom: 700, left: 850 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Приложение № 1 к', size: 24, bold: true }),
              new TextRun({ text: ' ДОГОВОРУ АРЕНДЫ', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'транспортного средства без экипажа', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: ` от «${contractDay}» ${contractMonth} ${contractYear}г.`, size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Дополнительное соглашение', size: 26, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `г. ${data.contractCity || '____________'}`, size: 22 })],
          }),
          new Paragraph({}),

          // Пункт 1 — арендная плата
          new Paragraph({
            children: [
              new TextRun({ text: `1. Арендная плата за пользование Автомобилем по настоящему Договору составляет ${data.dailyPrice.toLocaleString('ru-RU')} рублей в день.`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Пункт 2 — обеспечительный платеж
          new Paragraph({
            children: [
              new TextRun({ text: '2. В день заключения договора с момента Арендатор оплачивает ', size: 22 }),
              new TextRun({ text: 'обеспечительный платеж', size: 22, bold: true }),
              new TextRun({ text: ` в ${data.deposit > 0 ? data.deposit.toLocaleString('ru-RU') : '____________'} размере руб.`, size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),

          // Пункт 3
          new Paragraph({ children: [new TextRun({ text: '3. В случае повреждения автомобиля, в результате ДТП по вине Арендатора, когда автомобиль временно не может использоваться по назначению, на период его ремонта, Арендатор также выплачивает Арендодателю сумму арендных платежей каждый день, указанную в дополнительном соглашении, пункт 1., до тех пор, пока автомобиль полностью будет восстановлен в прежнее состояние.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 4
          new Paragraph({ children: [new TextRun({ text: '4. Арендная плата за пользование автомобилем выплачивается вовремя каждый день, или по предоплате. Просрочка оплаты арендных платежей – штраф 5000 рублей/день.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 5
          new Paragraph({ children: [new TextRun({ text: '5. Если Арендатор намерен завершить пользование арендным автомобилем, он должен поставить в известность.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 9
          new Paragraph({ children: [new TextRun({ text: '9 При возникновении задолженности в сумме более 5000 (пяти тысяч) рублей, денежные средства, внесенные Арендатором не будут учитываются в выкупную стоимость, пока долг не будет погашен. Эти денежные средства будут учитываться как арендные платежи, при наличии задолженности Арендатора перед Арендодателем.', size: 22 })] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: '10. Арендатор обязан иметь приложение «Whatsapp», вовремя отвечать на сообщения, всегда быть на связи.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '11. Арендатор обязан машину содержать в чистом виде. В машине не кушать. В машине не курить. Грязная машина - штраф 5000 рублей.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '12. Арендатор обязан ставить в известность, при поездке за город В случае не извещения штраф в размере 10000 (десять тысяч) рублей, и 10000 (десять тысяч) рублей за каждый день нахождения автомобиля за городом.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '13. Арендатор обязан не ставить автомобиль на зеленую зону. Штраф 5000.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '14. Арендатор обязан не превышать скоростной режим и ездить по правилам ПДД.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '15. Если на машине стоит Газ, то Арендатор обязан поддерживать уровень бензина в баке не меньше четверти. Штраф 500.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '16. Арендатор обязан не давать право управления транспортным средством третьим лицам.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '17. Штрафы оплачиваются в первую очередь с арендных платежей.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '18. Во время прохождения ТО автомобиля, независимо от времени, проведенным в сервисе, никаких скидок по арендной плате не предоставляется.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '19. Суточный пробег транспортного средства не должен превышать 400  километров в сутки.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '20. Настоящее дополнительное соглашение вступает в силу с момента его подписания.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '21. Настоящее соглашение составлено в 2-х (двух) экземплярах, имеющих равную юридическую силу.', size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: '22. За личные вещи, оставленные в автомобиле, Арендодатель ответственности не несет.', size: 22 })] }),
          new Paragraph({}),

          // Подписи приложения №1
          new Paragraph({
            children: [
              new TextRun({ text: 'Арендодатель:                                                               Арендатор:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '___________________/_____________________/        ___________________/_____________________/', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: '(подпись)                           (фамилия, инициалы)                   (подпись)                            (фамилия, инициалы)', size: 20 })],
          }),
        ],
      },

      // ============================================================
      // ЧАСТЬ 3: ПРИЛОЖЕНИЕ №2 — АКТ ПРИЁМА-ПЕРЕДАЧИ ТС
      // ============================================================
      {
        properties: {
          page: {
            margin: { top: 700, right: 500, bottom: 700, left: 850 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Приложение № 2', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: ' к ', size: 22 }),
              new TextRun({ text: 'ДОГОВОРУ АРЕНДЫ', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'транспортного средства без экипажа', size: 24, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `№ ${data.contractNumber} от «${contractDay}» ${contractMonth} ${contractYear}г.`, size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'АКТ', size: 28, bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'приема-передачи транспортного средства', size: 24, bold: true })],
          }),
          new Paragraph({}),

          // Город и дата
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `г. ${data.contractCity || '____________'} «${contractDay}» ${contractMonth} ${contractYear}г.`, size: 22 })],
          }),
          new Paragraph({}),

          // Преамбула акта
          new Paragraph({
            children: [
              new TextRun({ text: `Гр. ${data.owner.fullName || '________________________'} именуемый в дальнейшем «`, size: 22 }),
              new TextRun({ text: 'Арендодатель', size: 22, bold: true }),
              new TextRun({ text: '», с одной стороны, и гр. ', size: 22 }),
              new TextRun({ text: data.client.fullName, size: 22 }),
              new TextRun({ text: '   именуемый в дальнейшем «', size: 22 }),
              new TextRun({ text: 'Арендатор', size: 22, bold: true }),
              new TextRun({ text: '», с другой стороны, составили настоящий Акт.', size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Пункт 1 — данные авто
          new Paragraph({
            children: [
              new TextRun({ text: `1.  Арендодатель передал, а Арендатор принял легковой автомобиль ${stsInfo}, легковой автомобиль марки «${data.carBrand} ${data.carModel}», ${data.carYear || '____'} года изготовления , VIN ${data.carVin || '____________'}, кузов № ${data.carVin || '____________'}, цвет ${data.carColor || '____________'}, государственный регистрационный номер ${data.carLicensePlate} именуемый далее . Автомобиль укомплектован полностью.`, size: 22 }),
            ],
          }),
          new Paragraph({}),

          // Пункт 3
          new Paragraph({ children: [new TextRun({ text: '3. При приеме автомобиля Арендатору переданы следующие документы: свидетельство о регистрации, страховой полис по ОСАГО.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 4
          new Paragraph({ children: [new TextRun({ text: '4. Арендодатель предоставил Арендатору в полном объеме необходимую информацию об автомобиле в соответствии с руководством по эксплуатации.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 5
          new Paragraph({ children: [new TextRun({ text: '5. Настоящий акт составлен и подписан в двух экземплярах, имеющих равную юридическую силу, и хранится по одному у каждой из сторон.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 6
          new Paragraph({ children: [new TextRun({ text: '6. Настоящий акт является неотъемлемой частью договора аренды.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 7
          new Paragraph({ children: [new TextRun({ text: '7. При передачи  автомобиля использовались средства фото и видео фиксации.', size: 22 })] }),
          new Paragraph({}),

          // Пункт 8
          new Paragraph({
            children: [new TextRun({ text: '8.Автомобиль сдается чистый и заправленный, мойка 2500₽ заправка +500₽ по чеку', size: 22, bold: true })],
          }),
          new Paragraph({}),

          // Подписи акта
          new Paragraph({
            children: [
              new TextRun({ text: 'Арендодатель:                                                                Арендатор:', size: 22, bold: true }),
            ],
          }),
          new Paragraph({}),
          new Paragraph({
            children: [new TextRun({ text: '___________________/_____________________/        ___________________/____________________________/', size: 22 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: ' (подпись)                         (фамилия, инициалы)                      (подпись)                           (фамилия, инициалы)', size: 20 })],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `Договор_аренда_${data.carLicensePlate}_${data.client.fullName.replace(/\s+/g, '_')}.docx`
  saveAs(blob, fileName)
}
