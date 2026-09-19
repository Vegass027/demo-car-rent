// ============================================================
// HTML ГЕНЕРАТОР ДОГОВОРОВ И АКТОВ
// Создаёт HTML-документ для просмотра на мобильных (Safari iOS / Android)
// Сохраняет все данные, рамки таблиц, layout — гарантированно рендерится
// одинаково в любом современном браузере. Поддерживает печать в PDF через
// системный диалог печати браузера.
// ============================================================

import { formatMoneyWords } from '@/utils/format'

// Типы ослаблены до any для совместимости с существующими типами (ContractData и др. могут не иметь всех полей)

// ============================================================
// ОБЩИЕ ХЕЛПЕРЫ
// ============================================================

function esc(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDateShort(dateStr: string): string {
  if (!dateStr) return '____________'
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return dateStr || '____________'
  return `${m[3]}.${m[2]}.${m[1]}`
}

function fmtDateLong(dateStr: string): string {
  if (!dateStr) return '____________'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return dateStr || '____________'
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`
}

function fmtMoney(n: number | undefined): string {
  if (!n) return '____________'
  return n.toLocaleString('ru-RU')
}

async function loadCarSchemaAsBase64(): Promise<string | null> {
  try {
    const response = await fetch('/shema-avto.png')
    if (!response.ok) return null
    const blob = await response.blob()
    // FileReader.readAsDataURL — нативный API, надёжно работает на iOS Safari
    // с большими файлами (в отличие от btoa() который падает на 700KB+).
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const idx = result.indexOf(',')
        resolve(idx >= 0 ? result.slice(idx + 1) : result)
      }
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    }) || null
  } catch {
    return null
  }
}



// ============================================================
// ОБЩАЯ HTML-ОБОЛОЧКА СО СТИЛЯМИ
// ============================================================

const CSS = `
  @page { size: A4; margin: 1.5cm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', 'Liberation Serif', Times, serif;
    font-size: 11pt;
    line-height: 1.35;
    color: #000;
    margin: 0;
    padding: 24px;
    max-width: 820px;
    margin-left: auto;
    margin-right: auto;
    background: #fff;
  }
  h1, h2, h3, h4 { margin: 14px 0 8px; font-weight: bold; }
  h1 { font-size: 14pt; text-align: center; text-transform: uppercase; }
  h2 { font-size: 12pt; text-transform: uppercase; page-break-after: avoid; }
  h3 { font-size: 11pt; }
  p { margin: 6px 0; text-align: justify; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .mt { margin-top: 14px; }
  .mb { margin-bottom: 14px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    table-layout: fixed;  /* КРИТИЧНО: фиксированный layout колонок */
    word-wrap: break-word;
    overflow-wrap: break-word;
    page-break-inside: auto;
  }
  tr { page-break-inside: avoid; }
  td {
    border: 1px solid #000;
    padding: 4px 6px;
    vertical-align: top;
    font-size: 10pt;
    word-break: break-word;
  }
  .label { width: 28%; }
  .value { width: 22%; }
  .row-label { font-weight: bold; }
  ul { margin: 6px 0; padding-left: 24px; }
  li { margin: 3px 0; }
  .signature {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    page-break-inside: avoid;
    page-break-before: auto;
  }
  .signature > div { flex: 1; }
  .signature .line {
    border-top: 1px solid #000;
    margin-top: 24px;
    padding-top: 4px;
    font-size: 9pt;
    text-align: center;
  }
  .empty { color: #999; }
  .no-break { page-break-inside: avoid; }
  .page-break { page-break-before: always; }
  @media print {
    /* Убираем поля страницы — тогда браузеру негде рисовать свой
       header/footer с URL (blob:https://...), и они просто не печатаются.
       Свои отступы переносим на body, чтобы текст не упирался в край. */
    @page { margin: 0; }
    body { padding: 1.5cm; margin: 0; }
    .no-print { display: none !important; }
  }
  @media screen and (max-width: 600px) {
    body { padding: 12px; font-size: 10.5pt; }
    td { padding: 3px 4px; font-size: 9.5pt; }
  }
`

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function wrapHtml(title: string, body: string): string {
  // title используется ниже в `<title>${esc(title)}</title>` но TS ругается из-за rule
  // подавляем только для параметра — используем ниже
  const t = title
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(t)}</title>
  <style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>`
}

// Открывает HTML в полноэкранном iframe (внутри текущей страницы).
// Без blob URL — URL страницы не меняется, в шапке печати ничего лишнего.
// Закрывается по ESC или клику вне документа.
export function openHtmlDocument(html: string): void {
  const existing = document.getElementById('html-doc-overlay-root')
  if (existing) existing.remove()

  const root = document.createElement('div')
  root.id = 'html-doc-overlay-root'
  root.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: white; z-index: 2147483647;
  `

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: white;'
  // srcdoc НЕ создаёт blob URL — URL страницы остаётся прежним
  iframe.srcdoc = html

  // Закрытие по ESC
  const close = () => root.remove()
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close()
      document.removeEventListener('keydown', escHandler)
    }
  }
  document.addEventListener('keydown', escHandler)

  // ESC изнутри iframe (у iframe свой document)
  iframe.addEventListener('load', () => {
    try {
      const innerDoc = iframe.contentDocument
      if (innerDoc) {
        innerDoc.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape') close()
        })
      }
    } catch {
      // cross-origin — игнорируем
    }
  })

  root.appendChild(iframe)
  document.body.appendChild(root)

  // Фокус на iframe чтобы ESC работал
  setTimeout(() => iframe.focus(), 50)
}

// ============================================================
// 1. АКТ ПРИЁМА-ПЕРЕДАЧИ ТРАНСПОРТНОГО СРЕДСТВА
// ============================================================

export async function generateContractDocumentHTML(data: any): Promise<string> {
  const owner = data.owner
  const c = data.client

  const clientInfo = `${c.fullName}${c.birthDate ? `, ${fmtDateShort(c.birthDate)} г.р.` : ''}, паспорт: ${c.passportSeries || ''} ${c.passportNumber || ''}${c.passportIssuedBy ? `, выдан: ${c.passportIssuedBy}` : ''}${c.passportIssueDate ? ` ${fmtDateShort(c.passportIssueDate)}` : ''}${c.registrationAddress ? `, зарегистрирован: ${c.registrationAddress}` : ''}${c.phone ? `, тел.: ${c.phone}` : ''}`

  const ownerBlock = `Гражданин РФ <b>${esc(owner?.fullName || '________________________')}</b>${owner?.birthDate ? `, ${esc(fmtDateShort(owner.birthDate))} г.р.` : ''}, паспорт ${esc(owner?.passportSeries || '')} ${esc(owner?.passportNumber || '')}, выдан: ${esc(owner?.passportIssuedBy || '')}${owner?.passportIssueDate ? ` ${esc(fmtDateShort(owner.passportIssueDate))}` : ''}, зарегистрирован: ${esc(owner?.registrationAddress || '')}, именуемый в дальнейшем <b>Арендодатель</b>, с одной стороны, и `
  const clientBlock = `Гражданин РФ <b>${esc(clientInfo)}</b>, именуемый(ая) в дальнейшем <b>Арендатор</b>, с другой стороны,`

  const deliveryPlace = data.deliveryPlace || '___________________________________________'
  const returnPlace = data.returnPlace || '___________________________________________'
  const carPrice = data.carPrice || 0

  // Загружаем схему автомобиля для встраивания
  const schemaBase64 = await loadCarSchemaAsBase64()
  const schemaImg = schemaBase64
    ? `<p class="center"><img src="data:image/png;base64,${schemaBase64}" style="max-width:500px; width:100%; height:auto;" alt="Схема автомобиля" /></p>`
    : `<p class="center"><i>[Схема автомобиля]</i></p>`

  const body = `
<p class="center">Приложение №1 к договору № ${esc(data.contractNumber)} от ${esc(fmtDateLong(data.contractDate))}</p>

<h1>АКТ ПРИЁМА – ПЕРЕДАЧИ ТРАНСПОРТНОГО СРЕДСТВА</h1>

<p>${ownerBlock}${clientBlock}</p>

<p>вместе именуемые «Стороны», в соответствии с Договором аренды ТС без экипажа <b>№ ${esc(data.contractNumber)} от ${esc(fmtDateLong(data.contractDate))}</b> подписали настоящий акт о нижеследующем:</p>

<p><b>1. Арендодатель передал, а Арендатор принял следующее Транспортное средство (далее ТС):</b></p>

<table>
  <tr>
    <td class="row-label">Марка, модель:</td>
    <td>${esc(data.carBrand)} ${esc(data.carModel)}</td>
    <td class="row-label">Год выпуска:</td>
    <td>${esc(data.carYear || '')}</td>
  </tr>
  <tr>
    <td class="row-label">Цвет:</td>
    <td>${esc(data.carColor)}</td>
    <td class="row-label">Кузов (VIN):</td>
    <td>${esc(data.carVin)}</td>
  </tr>
  <tr>
    <td class="row-label">Гос. рег. знак:</td>
    <td>${esc(data.carLicensePlate)}</td>
    <td class="row-label">Двигатель:</td>
    <td>____________</td>
  </tr>
</table>

<p>Стоимость транспортного средства: ${fmtMoney(carPrice)} рублей</p>

<p><b>3. На момент передачи транспортное средство имеет следующие повреждения кузова:</b></p>
${schemaImg}

<p><b>Примечания:</b></p>
${Array(10).fill('<p>____________________________________________________________</p>').join('\n')}

<table>
  <tr>
    <td style="width:30%">Показания одометра (при сдаче):</td>
    <td style="width:15%">________ км</td>
    <td style="width:15%">Уровень топлива</td>
    <td style="width:10%">E ☐ F ☐</td>
    <td style="width:15%">Состояние кузова</td>
    <td style="width:15%">чистый ☐ грязный ☐</td>
  </tr>
  <tr>
    <td>Показания одометра (при возврате):</td>
    <td>________ км</td>
    <td>Уровень топлива</td>
    <td>E ☐ F ☐</td>
    <td>Состояние кузова</td>
    <td>чистый ☐ грязный ☐</td>
  </tr>
</table>

<p><b>4. Комплектность и документы:</b></p>

<table>
  <tr>
    <td style="width:30%">Свидетельство о регистрации</td>
    <td style="width:5%; text-align:center;">☐</td>
    <td style="width:30%">Омывательная жидкость</td>
    <td style="width:5%; text-align:center;">☐</td>
    <td style="width:15%">Резина:</td>
    <td style="width:15%">летняя ☐ зимняя ☐</td>
  </tr>
  <tr>
    <td>Страховой полис ОСАГО</td>
    <td style="text-align:center;">☐</td>
    <td>Фары главного света</td>
    <td style="text-align:center;">☐</td>
    <td>Диски:</td>
    <td>легкосплавные ☐ стальные ☐</td>
  </tr>
  <tr>
    <td>Запасное колесо</td>
    <td style="text-align:center;">☐</td>
    <td>Стоп-сигнал</td>
    <td style="text-align:center;">☐</td>
    <td>Аптечка</td>
    <td style="text-align:center;">☐</td>
  </tr>
  <tr>
    <td>Балонный ключ</td>
    <td style="text-align:center;">☐</td>
    <td>Габариты</td>
    <td style="text-align:center;">☐</td>
    <td>Огнетушитель</td>
    <td style="text-align:center;">☐</td>
  </tr>
  <tr>
    <td>Домкрат</td>
    <td style="text-align:center;">☐</td>
    <td>Указатели поворота</td>
    <td style="text-align:center;">☐</td>
    <td>Знак аварийной остановки</td>
    <td style="text-align:center;">☐</td>
  </tr>
  <tr>
    <td>Навигатор</td>
    <td style="text-align:center;">☐</td>
    <td>Бустер</td>
    <td style="text-align:center;">☐</td>
    <td>Детское кресло</td>
    <td style="text-align:center;">☐</td>
  </tr>
</table>

<p><b>Дополнения:</b></p>
<p>Место подачи автомобиля: ${esc(deliveryPlace)}</p>
<p>Дата и время подачи автомобиля: ${esc(fmtDateShort(data.startDate))}, _____:_____</p>
<p>Место возврата автомобиля: ${esc(returnPlace)}</p>
<p>Дата и время возврата автомобиля: ${esc(fmtDateShort(data.endDate))}, _____:_____</p>

<div class="page-break"></div>

<p><b>ПЕРЕДАЛ (Арендодатель):</b></p>
<p>${esc(owner?.fullName || '________________________')} /____________________/</p>
<p><b>ПРИНЯЛ (Арендатор):</b></p>
<p>${esc(c.fullName)} /____________________/</p>
<p><b>СДАЛ (вернул Арендатор):</b></p>
<p>${esc(c.fullName)} /____________________/</p>
<p><b>ПРИНЯЛ (Арендодатель):</b></p>
<p>${esc(owner?.fullName || '________________________')} /____________________/</p>
`

  return wrapHtml(`Акт № ${data.contractNumber}`, body)
}

// ============================================================
// 2. ДОГОВОР АРЕНДЫ БЕЗ ВЫКУПА
// ============================================================

export function generateSimpleRentalContractDocumentHTML(
  data: any,
): string {
  const owner = data.owner
  const c = data.client

  const stsInfo =
    data.carStsSeries && data.carStsNumber
      ? `серии ${data.carStsSeries} № ${data.carStsNumber}${data.carStsDate ? ` выданного «${fmtDateLong(data.carStsDate)}»` : ''}`
      : 'серии ______ № ____________'

  const startDate = data.startDate ? new Date(data.startDate + 'T12:00:00') : new Date()
  const startDay = startDate.getDate()
  const startMonthLong = fmtDateLong(data.startDate).split(' ')[1] || ''
  const startYear = startDate.getFullYear()
  const termDays = data.termDays || 0

  const body = `
<p class="center"><b>ДОГОВОР АРЕНДЫ</b></p>
<p class="center">транспортного средства без экипажа №${esc(data.contractNumber)}</p>

<table class="noborder">
  <tr>
    <td style="width:50%; border:none;">г. ${esc(data.contractCity || '____________')}</td>
    <td style="width:50%; border:none; text-align:right;"><b>${startDay} ${startMonthLong}  ${startYear}г.</b></td>
  </tr>
</table>

<table class="noborder">
  <tr>
    <td style="width:50%; border:none;"><b>С одной стороны, Арендодатель:</b></td>
    <td style="width:50%; border:none;"><b>С другой стороны, Арендатор:</b></td>
  </tr>
  <tr>
    <td style="border:none;">Гр. ${esc(owner?.fullName || '________________________')}</td>
    <td style="border:none;">Гр. ${esc(c.fullName)}</td>
  </tr>
  <tr>
    <td style="border:none;">паспорт: серия ${esc(owner?.passportSeries || '____')} № ${esc(owner?.passportNumber || '______')}</td>
    <td style="border:none;">
      Дата рождения: ${esc(c.birthDate || '____________')}<br>
      ${esc(c.registrationAddress || '____________')}
    </td>
  </tr>
  <tr>
    <td style="border:none;">Выдан: ${esc(owner?.passportIssuedBy || '____________')}${owner?.passportIssueDate ? ` ${esc(fmtDateShort(owner.passportIssueDate))}` : ''}</td>
    <td style="border:none;">
      Паспорт. ${esc(c.passportSeries || '____')} серия : ${esc(c.passportNumber || '______')}<br>
      ${c.driverLicenseSeries || c.driverLicenseNumber ? `В/У ${esc(c.driverLicenseSeries || '____')} ${esc(c.driverLicenseNumber || '______')}` : ''}
    </td>
  </tr>
  <tr>
    <td style="border:none;">Располагающийся по адресу: ${esc(owner?.registrationAddress || '____________')}</td>
    <td style="border:none;">
      Выдан: ${esc(c.passportIssuedBy || '____________')}<br>
      ${c.passportIssueDate ? esc(fmtDateShort(c.passportIssueDate)) : '____________'}
    </td>
  </tr>
  <tr>
    <td style="border:none;">Тел. ${esc(owner?.phone || '____________')}</td>
    <td style="border:none;">Проживающий по адресу: ${esc(c.registrationAddress || '____________')}</td>
  </tr>
  <tr>
    <td style="border:none;">-</td>
    <td style="border:none;">Тел. ${esc(c.phone || '____________')}</td>
  </tr>
</table>

<p>Совместно именуемые в дальнейшем «Стороны», заключили настоящий договор, в дальнейшем «<b>Договор</b>», о нижеследующем:</p>

<p><b>1. ПРЕДМЕТ ДОГОВОРА</b></p>
<p>1.1. Арендодатель предоставляет Арендатору за плату во временное владение и пользование принадлежащий Арендодателю на основании свидетельства транспортного средства ${esc(stsInfo)}, легковой автомобиль марки «${esc(data.carBrand)} ${esc(data.carModel)}», ${esc(data.carYear || '____')} года изготовления, VIN ${esc(data.carVin || '____________')}, кузов № ${esc(data.carVin || '____________')} цвет ${esc(data.carColor || '____________')} государственный регистрационный номер ${esc(data.carLicensePlate)} именуемый далее «Автомобиль», без оказания услуг по управлению им, его технической эксплуатации и обслуживанию.</p>
<p>1.2. Техническое состояние Автомобиля подтверждается действующим талоном о прохождении технического осмотра Автомобиля (технический осмотр не требуется если автомобиль не старше двух лет), осмотром и проверкой работоспособности двигателя и иного оборудования, установленного на Автомобиле. Автомобиль передается по акту приема-передачи транспортного средства, скрепляемому подписями сторон (Приложение № 2).</p>
<p>1.3. Использование Автомобиля не должно противоречить его назначению.</p>
<p>1.4. Площадка для приёма и передачи транспорта расположена по адресу: ${esc(data.deliveryAddress || '____________')}.</p>

<div class="page-break"></div>

<p><b>2. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЁТОВ</b></p>
<p>2.1. Размер арендной платы за пользованием автомобилем и порядок ее уплаты предусматривается дополнительным соглашением к настоящему Договору (Приложение 1).</p>
<p>2.2. Арендодатель вправе поднять арендную плату в период срока действия договора в одностороннем порядке. Арендатор вправе отказаться и расторгнуть договор.</p>

<p><b>3. ДАТА ЗАКЛЮЧЕНИЯ ДОГОВОРА</b></p>
<p>3.1. Настоящий Договор вступает в силу c ${esc(data.startTime || '17 час(ов) 00минут')} «${startDay}» ${startMonthLong} ${startYear}г. и действует в течении ${termDays} суток, В случае если за одни сутки до окончания срока действия договора ни одна из сторон не заявила о его расторжении (не направив уведомления, либо по телефону или смс), договор считается заключенным на неопределенный срок. В этом случае расторжение договора возможно в любое время по инициативе любой из сторон с предварительным уведомлением другой стороны за одни сутки.</p>

<p><b>4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</b></p>
<p>4.1. Арендодатель обязуется:</p>
<p>4.1.1. В день вступления в силу настоящего Договора передать Арендатору Автомобиль, указанный в п.1.1 договора.</p>
<p>4.1.2. Передать Арендатору документы, относящиеся к автомобилю и необходимые для нормальной эксплуатации.</p>
<p>4.1.3. Арендодатель вправе проверять сохранность, техническую исправность и комплектность Автомобиля и установленного на нем оборудования. Арендатор не вправе препятствовать проведению осмотра автомобилей.</p>
<p>4.2. Арендатор обязуется:</p>
<p>4.2.1. Арендатор обязан осмотреть состояние и комплектацию автомобиля и принять его от Арендодателя, подписав акт приема-передачи автомобиля (Приложение № 2).</p>
<p>4.2.2. Арендатор обязуется использовать автомобиль в строгом соответствии с его назначением, соблюдать Правила дорожного движения, нести ответственность за соблюдение требований по профилактике и учету ДТП, содержать автомобиль в технически исправном состоянии, иметь при себе необходимые документы, требуемые сотрудниками ГИБДД. Арендатор обязуется строго соблюдать все требования по эксплуатации транспортного средства и условия, указанные в сервисной книжке этого автомобиля.</p>
<p>4.2.3. Своевременно оповещать Арендодателя и страховую компанию о ДТП. Получать необходимые документы в ГИБДД. Оформлять, получать и подавать все необходимые документы и заявления в Страховую компанию для получения возмещения Арендодателем. В случае невыполнения данных требований Арендатор несёт полную материальную ответственность за повреждения, полученные в результате ДТП.</p>
<p>4.2.4. При повреждении, утрате автомобиля Арендатор обязуется незамедлительно известить об этом Арендодателя, а также уведомить о страховом случае страховую организацию в соответствии с договором страхования и законодательством.</p>
<p>4.2.5. При ДТП, совершенном по вине Арендатора, в случаях, не относящихся к страховым случаям по договорам страхования арендуемых автомобилей (в том числе и алкогольного опьянения и др.), Арендатор обязуется произвести все предусмотренные законом и настоящим договором действия для возврата Арендодателю поврежденного автомобиля, и возместить в течение 14 дней убытки Арендодателю, либо выплатить Арендодателю стоимость автомобиля.</p>
<p>4.2.6. Обеспечить сохранность регистрационных и других необходимых для эксплуатации документов. В случае их утраты независимо от наличия вины Арендатора, Арендатор обязуется возместить расходы Арендодателю по их восстановлению.</p>
<p>4.2.7. Арендатор обязуется возместить в полном объеме ущерб, причиненный третьим лицам, при эксплуатации автомобиля (ст. 648 ГК РФ). В случае предъявления третьими лицами требований о возмещении ущерба к Арендодателю, Арендатор обязан участвовать в судебных процессах по данному случаю, предоставить Арендатору все документы, связанные с причинением ущерба, возместить Арендодателю все расходы по судебным процессам.</p>
<p>4.2.8. Оплачивать горюче-смазочные материалы, которыми будет заправляться Автомобиль в период его использования. При эксплуатации автомобиля использовать исключительно те горюче-смазочные материалы, которые указаны в сервисной книжке.</p>
<p>4.2.9. По требованию Арендодателя, а также в случае досрочного расторжения договора, вернуть в этот же день автомобиль в том состоянии, в котором он был получен (с учетом нормативного износа) в комплектации, полученной от Арендодателя. Передача осуществляется в порядке, установленным настоящим договором. Факт передачи оформляется актом приема-передачи автомобиля (Приложение 1).</p>
<p>4.2.10. При возвращении автомобиля Арендодателю Арендатор обязан вернуть автомобиль в комплектации, в которой он передавался. При возврате автомобиля с нарушением комплектности Арендатор уплачивает Арендодателю стоимость невозвращенного комплекта.</p>
<p>4.2.11. Не вносить без согласия Арендодателя изменений и дополнений во внешний вид и конструкцию Автомобиля.</p>
<p>4.2.12. Не передавать управление Автомобилем третьим лицам без письменного разрешения Арендодателя. При передаче Автомобиля третьим лицам, с разрешения Арендодателя, стоимость проката увеличивается на 10000 рублей в сутки. При передаче Автомобиля третьим лицам без разрешения Арендодателя – штраф 50000 рублей и расторжение договора.</p>
<p>4.2.13. Оплатить штраф(ы), полученный(ые) по его вине, в том числе вынесенный(ые) с помощью автоматических средств фото-видео фиксации, передав необходимую сумму денег Арендодателю не позднее 7 дней после фактического получения штрафа(ов).</p>
<p>4.2.16. По окончании периода использования Автомобиля вернуть его на то же место указанное пункте 1.4, откуда он его взял в начале использования, в противном случае оплатить Арендодателю все расходы по возврату автомобиля в исходное место и 10000 рублей, как компенсацию за потерю времени.</p>
<p>4.2.17. Не курить в салоне Автомобиля, и исключить случаи курения пассажирами в данном Автомобиле. В случае обнаружения Арендодателем последствий курения в салоне, оплатить штраф в размере 10000 рублей.</p>
<p>4.2.18. Вернуть автомобиль Арендодателю в чистом виде (проведя комплексную мойку на специализированной моечной станции) если автомобиль был передан Арендатору в чистом виде. Если автомобиль был передан Арендатору в не чистом виде, то Арендатор может не выполнять данный пункт.</p>
<p>4.2.19. Устранить за свой счет любые повреждения в том числе произошедшие при ДТП, которые произошли по его вине или при отсутствии вины в результате действий третьих лиц (кроме случаев если личность третьих лиц известна и вина третьих лиц доказана соответствующим документом), не позднее 14 дней с момента ДТП, либо передав сумму денег на восстановление Автомобиля Арендодателю, по оценочной стоимости повреждений в организации, осуществляющей данные услуги.</p>
<p>4.2.20. Передать копию своего паспорта и водительского удостоверения Арендодателю, либо отправить по электронной почте сканы документов.</p>
<p>4.2.22. Ознакомиться с правилами эксплуатации автомобиля.</p>
<p>4.2.23. Поддерживать уровень бензина в баке не меньше четверти, если машина с газовым оборудованием.</p>
<p>4.2.24. При эксплуатации не допускать превышение суточного пробега свыше 400 км.</p>
<p>4.2.25. Эксплуатировать транспортное средство в пределах Ростова на Дону или его пригородах, но не далее 200 км и границ Ростовской области, допускается согласования по телефону смс с подтверждением обратной связи.</p>
<p>4.2.26. При возврате автомобиля уровень топлива в баке должен соответствовать уровню на момент передачи автомобиля Арендатору.</p>

<div class="page-break"></div>

<p><b>5. ОТВЕТСТВЕННОСТЬ СТОРОН, ПОРЯДОК РАСТОРЖЕНИЯ ДОГОВОРА И РАССМОТРЕНИЯ СПОРОВ</b></p>
<p>5.1. В случае просрочки внесения арендной платы Арендатор уплачивает Арендодателю штраф — 5000 рублей за каждый день просрочки, на второй день договор расторгается, машина забирается.</p>
<p>5.2. В случае нарушения условий Арендатором по содержанию машины в чистом виде Арендодатель предъявляет штраф — 5000 рублей за каждый выявленный случай.</p>
<p>5.3. Нести ответственность за несоблюдение правил дорожного движения, правил благоустройства, действующих в месте эксплуатации.</p>
<p>5.4. Арендатор самостоятельно несёт гражданско-правовую ответственность за вред, причинённый автомобилям, третьим лицам, имуществу третьих лиц, а также возмещает вред, нанесённый здоровью третьих лиц.</p>
<p>5.5. Досрочное расторжение Договора допускается в следующих случаях:</p>
<p>5.5.1. По инициативе Арендодателя:</p>
<p>5.5.1.1. если Арендатор использует Автомобиль не в соответствии с целями его предоставления;</p>
<p>5.5.1.2. если Арендатор умышленно ухудшает состояние Автомобиля, либо не выполняет возложенную на него обязанность по надлежащему содержанию;</p>
<p>5.5.1.3. Нарушает требования, указанные в приложении № 1 к настоящему договору.</p>
<p>5.5.2. По инициативе Арендатора:</p>
<p>5.5.2.1. при изменении его финансового положения, в результате чего он вынужден отказаться от аренды Автомобиля с предварительным уведомлением Арендодателя не менее чем за 7 дней до даты расторжения;</p>
<p>5.6. За неисполнение или ненадлежащее исполнение своих обязательств по настоящему Договору Стороны несут ответственность в соответствии с действующим законодательством Российской Федерации.</p>
<p>5.7. Любой спор, разногласие или претензия, вытекающие из или в связи с настоящим договором либо его нарушением, прекращением или недействительностью подлежат разрешению в Волгодонском районном суде города Волгодонска Ростовской Области, либо в Мировом суде города Волгодонска участок № 4, в зависимости от суммы иска.</p>
<p>5.8. В случае досрочного расторжения настоящего договора взаиморасчеты между сторонами производятся не позднее дня передачи автомобиля.</p>
<p>5.9. При досрочном расторжении договора по инициативе Арендатора арендная плата и обеспечительный платеж не возвращается.</p>

<p><b>6. ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ</b></p>
<p>6.1. Договор может быть изменен по письменному соглашению Сторон.</p>
<p>6.2. Условия настоящего договора являются конфиденциальными и не подлежат разглашению третьим лицам без письменного согласия другой Стороны. Стороны обязуются соблюдать конфиденциальность в отношении всей информации, полученной в связи с реализацией настоящего Договора. Сторонам запрещается представлять каким-либо лицам в каком-либо порядке доступ к информации и документам, полученным ими в связи с реализацией настоящего Договора, если иное прямо не предусмотрено законодательством Российской Федерации.</p>
<p>6.3. Все приложения к настоящему договору имеют юридическую силу, если они составлены в письменной форме и подписаны обеими Сторонами.</p>
<p>6.4. Стороны подтверждают, что отсутствуют обстоятельства, вынуждающие совершить настоящий договор на крайне невыгодных для себя условиях.</p>
<p>6.5. Отношения сторон, не урегулированные настоящим договором, регламентируются действующим законодательством РФ.</p>
<p>6.6. Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из сторон.</p>

<p><b>7. Обеспечительный платеж</b> идет в счет погашения крайних двух дней договора, а также штрафов ПДД и выявленных нарушений условий договора. При досрочном расторжении обеспечительный платеж не возвращается.</p>
<p>Возврат обеспечительного платежа осуществляется в период от 14 до 21 суток.</p>

<p><b>Приложения:</b></p>
<p>1. Приложение №1 дополнительное соглашение с условиями оплаты.</p>
<p>2. Приложение № 2 Акт приема передачи</p>

<div class="page-break"></div>

<p class="center"><b>7. ПОДПИСИ СТОРОН</b></p>
<p class="center"><b>Арендодатель:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Арендатор:</b></p>
<p class="center">___________________/_____________________/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;___________________/____________________________/</p>
<p class="center" style="font-size: 9pt;">(подпись)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(фамилия, инициалы)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(подпись)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(фамилия, инициалы)</p>

<div class="page-break"></div>

<p class="center bold" style="font-size:13pt;">Приложение № 1 к ДОГОВОРУ АРЕНДЫ</p>
<p class="center bold" style="font-size:13pt;">транспортного средства без экипажа</p>
<p class="center bold">от «${startDay}» ${startMonthLong} ${startYear}г.</p>

<p class="center bold" style="font-size:14pt; margin-top:20px;">Дополнительное соглашение</p>
<p>г. ${esc(data.contractCity || '____________')}</p>

<p><b>1.</b> Арендная плата за пользование Автомобилем по настоящему Договору составляет ${data.dailyPrice ? data.dailyPrice.toLocaleString('ru-RU') : '____________'} рублей в день.</p>

<p><b>2.</b> В день заключения договора с момента Арендатор оплачивает <span class="bold">обеспечительный платеж</span> в ${data.deposit > 0 ? data.deposit.toLocaleString('ru-RU') : '____________'} размере руб.</p>

<p><b>3.</b> В случае повреждения автомобиля, в результате ДТП по вине Арендатора, когда автомобиль временно не может использоваться по назначению, на период его ремонта, Арендатор также выплачивает Арендодателю сумму арендных платежей каждый день, указанную в дополнительном соглашении, пункт 1., до тех пор, пока автомобиль полностью будет восстановлен в прежнее состояние.</p>

<p><b>4.</b> Арендная плата за пользование автомобилем выплачивается вовремя каждый день, или по предоплате. Просрочка оплаты арендных платежей – штраф 5000 рублей/день.</p>

<p><b>5.</b> Если Арендатор намерен завершить пользование арендным автомобилем, он должен поставить в известность.</p>

<p><b>9</b> При возникновении задолженности в сумме более 5000 (пяти тысяч) рублей, денежные средства, внесенные Арендатором не будут учитываются в выкупную стоимость, пока долг не будет погашен. Эти денежные средства будут учитываться как арендные платежи, при наличии задолженности Арендатора перед Арендодателем.</p>

<p><b>10.</b> Арендатор обязан иметь приложение «Whatsapp», вовремя отвечать на сообщения, всегда быть на связи.</p>
<p><b>11.</b> Арендатор обязан машину содержать в чистом виде. В машине не кушать. В машине не курить. Грязная машина - штраф 5000 рублей.</p>
<p><b>12.</b> Арендатор обязан ставить в известность, при поездке за город. В случае не извещения штраф в размере 10000 (десять тысяч) рублей, и 10000 (десять тысяч) рублей за каждый день нахождения автомобиля за городом.</p>
<p><b>13.</b> Арендатор обязан не ставить автомобиль на зеленую зону. Штраф 5000.</p>
<p><b>14.</b> Арендатор обязан не превышать скоростной режим и ездить по правилам ПДД.</p>
<p><b>15.</b> Если на машине стоит Газ, то Арендатор обязан поддерживать уровень бензина в баке не меньше четверти. Штраф 500.</p>
<p><b>16.</b> Арендатор обязан не давать право управления транспортным средством третьим лицам.</p>
<p><b>17.</b> Штрафы оплачиваются в первую очередь с арендных платежей.</p>
<p><b>18.</b> Во время прохождения ТО автомобиля, независимо от времени, проведенным в сервисе, никаких скидок по арендной плате не предоставляется.</p>
<p><b>19.</b> Суточный пробег транспортного средства не должен превышать 400 километров в сутки.</p>
<p><b>20.</b> Настоящее дополнительное соглашение вступает в силу с момента его подписания.</p>
<p><b>21.</b> Настоящее соглашение составлено в 2-х (двух) экземплярах, имеющих равную юридическую силу.</p>
<p><b>22.</b> За личные вещи, оставленные в автомобиле, Арендодатель ответственности не несет.</p>

<p class="bold">Арендодатель: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Арендатор:</p>
<p class="center">___________________/_____________________/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ___________________/_____________________/</p>
<p class="center" style="font-size:9pt;">(подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы)</p>

<div class="page-break"></div>

<p class="center bold" style="font-size:13pt;">Приложение № 2</p>
<p class="center bold" style="font-size:13pt;">к ДОГОВОРУ АРЕНДЫ</p>
<p class="center bold" style="font-size:13pt;">транспортного средства без экипажа</p>
<p class="center bold">№ ${esc(data.contractNumber)} от «${startDay}» ${startMonthLong} ${startYear}г.</p>

<p class="center bold" style="font-size:15pt; margin-top:20px;">АКТ</p>
<p class="center bold" style="font-size:13pt;">приема-передачи транспортного средства</p>

<p style="text-align:right;">г. ${esc(data.contractCity || '____________')} «${startDay}» ${startMonthLong} ${startYear}г.</p>

<p>Гр. ${esc(owner?.fullName || '________________________')} именуемый в дальнейшем «<b>Арендодатель</b>», с одной стороны, и гр. ${esc(c.fullName)} именуемый в дальнейшем «<b>Арендатор</b>», с другой стороны, составили настоящий Акт.</p>

<p><b>1.</b> Арендодатель передал, а Арендатор принял легковой автомобиль ${esc(stsInfo)}, легковой автомобиль марки «${esc(data.carBrand)} ${esc(data.carModel)}», ${esc(data.carYear || '____')} года изготовления, VIN ${esc(data.carVin || '____________')}, кузов № ${esc(data.carVin || '____________')}, цвет ${esc(data.carColor || '____________')}, государственный регистрационный номер ${esc(data.carLicensePlate)} именуемый далее. Автомобиль укомплектован полностью.</p>

<p><b>3.</b> При приеме автомобиля Арендатору переданы следующие документы: свидетельство о регистрации, страховой полис по ОСАГО.</p>

<p><b>4.</b> Арендодатель предоставил Арендатору в полном объеме необходимую информацию об автомобиле в соответствии с руководством по эксплуатации.</p>

<p><b>5.</b> Настоящий акт составлен и подписан в двух экземплярах, имеющих равную юридическую силу, и хранится по одному у каждой из сторон.</p>

<p><b>6.</b> Настоящий акт является неотъемлемой частью договора аренды.</p>

<p><b>7.</b> При передачи автомобиля использовались средства фото и видео фиксации.</p>

<p><b>8.</b> <span class="bold">Автомобиль сдается чистый и заправленный, мойка 2500₽ заправка +500₽ по чеку</span></p>

<p class="bold">Арендодатель: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Арендатор:</p>
<p class="center">___________________/_____________________/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ___________________/____________________________/</p>
<p class="center" style="font-size:9pt;">(подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы)</p>
`

  return wrapHtml(`Договор аренды № ${data.contractNumber}`, body)
}

// ============================================================
// 3. АКТ ВЫПОЛНЕННЫХ РАБОТ (ТО)
// ============================================================

interface ServiceActHTMLData {
  actNumber: string
  contractNumber: string
  contractDate: string
  carName: string
  carLicensePlate: string
  carVin?: string
  startDate: string
  endDate: string
  rentalDays: number
  dailyPrice: number
  totalAmount: number
  executor: { fullName?: string }
  customer: { fullName?: string }
  totalAmountWords?: string
}

export function generateServiceActDocumentHTML(data: ServiceActHTMLData): string {
  const totalFmt = fmtMoney(data.totalAmount)
  const totalWords = data.totalAmountWords || ''

  const body = `
<p class="center"><b>Акт № ${esc(data.actNumber)}</b></p>
<p class="center">выполненных работ по договору аренды</p>

<p class="center">от «____» _________________ 20 __ г.</p>

<table>
  <tr>
    <td class="bold center" style="width:5%">№</td>
    <td class="bold" style="width:40%">Наименование работы (услуги)</td>
    <td class="bold center" style="width:10%">Ед. изм.</td>
    <td class="bold center" style="width:12%">Количество</td>
    <td class="bold center" style="width:15%">Цена</td>
    <td class="bold center" style="width:18%">Сумма</td>
  </tr>
  <tr>
    <td class="center">1</td>
    <td>Аренда автомобиля ${esc(data.carName)} (${esc(data.carLicensePlate)}) с ${esc(fmtDateLong(data.startDate))} по ${esc(fmtDateLong(data.endDate))}</td>
    <td class="center">сутки</td>
    <td class="center">${esc(String(data.rentalDays || 0))}</td>
    <td class="center">${fmtMoney(data.dailyPrice)}</td>
    <td class="center">${totalFmt}</td>
  </tr>
  ${[2, 3, 4, 5].map(n => `
  <tr>
    <td class="center">${n}</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>`).join('')}
  <tr>
    <td></td>
    <td class="bold">Итого:</td>
    <td></td>
    <td></td>
    <td></td>
    <td class="bold">${totalFmt}</td>
  </tr>
  <tr>
    <td></td>
    <td>Без налога (НДС):</td>
    <td></td>
    <td></td>
    <td></td>
    <td>—</td>
  </tr>
  <tr>
    <td></td>
    <td class="bold">Всего (с учетом НДС):</td>
    <td></td>
    <td></td>
    <td></td>
    <td class="bold">${totalFmt}</td>
  </tr>
</table>

<p>Всего оказано услуг на сумму: ${esc(totalWords)} рублей, в т.ч. НДС – ${esc(totalWords)} рублей.</p>

<p>Вышеперечисленные работы выполнены полностью и в срок. Заказчик претензий по объему, качеству и срокам выполнения работ претензий не имеет.</p>

<div class="page-break"></div>

<p>Исполнитель ______________________________________</p>
<p style="font-size:9pt;"><i>(${esc(data.executor.fullName || '')})</i></p>
<p>Заказчик ______________________________________</p>
<p style="font-size:9pt;"><i>(${esc(data.customer.fullName || '')})</i></p>
`

  return wrapHtml(`Акт № ${data.actNumber}`, body)
}

// ============================================================
// 4. ДОГОВОР ВЫКУПА
// ============================================================

export function generateBuyoutContractDocumentHTML(data: any): string {
  const owner = data.owner
  const c = data.client
  // Данные могут приходить как напрямую (data.termMonths), так и обёрнутые в data.buyoutData
  const bd = data.buyoutData || ({} as any)
  const termMonths = data.termMonths ?? bd.termMonths ?? 12
  const monthlyPayment = data.monthlyPayment ?? bd.monthlyPayment ?? 0
  const carPrice = data.carPrice ?? bd.carPrice ?? 0
  const profitPercent = data.profitPercent ?? bd.profitPercent ?? 30
  const buyoutPrice = data.buyoutPrice ?? bd.buyoutPrice ?? Math.round(carPrice * (1 + profitPercent / 100))
  const contractCity = data.contractCity ?? bd.contractCity ?? ''
  const deliveryAddress = data.deliveryAddress ?? bd.deliveryAddress ?? ''
  const stsSeries = data.carStsSeries ?? bd.stsSeries ?? ''
  const stsNumber = data.carStsNumber ?? bd.stsNumber ?? ''
  const stsDate = data.carStsDate ?? bd.stsDate ?? ''
  const startTime = data.startTime ?? bd.startTime ?? '10 час(ов) 00 минут'
  const paymentDay = data.paymentDay ?? new Date(data.startDate || data.contractDate || new Date().toISOString()).getDate()
  const relatives = Array.isArray(data.relatives) ? data.relatives : (Array.isArray(bd.relatives) ? bd.relatives : [])
  const relative1 = relatives[0] || { phone: '', name: '' }
  const relative2 = relatives[1] || { phone: '', name: '' }
  const driverLicenseSeries = c.driverLicenseSeries ?? bd.driverLicenseSeries ?? ''
  const driverLicenseNumber = c.driverLicenseNumber ?? bd.driverLicenseNumber ?? ''
  const deposit = data.deposit ?? 0

  // Дата начала договора
  const startDateObj = new Date((data.startDate || data.contractDate || new Date().toISOString().split('T')[0]) + 'T12:00:00')
  const startDay = startDateObj.getDate()
  const startMonth = ['Января','Февраля','Марта','Апреля','Мая','Июня','Июля','Августа','Сентября','Октября','Ноября','Декабря'][startDateObj.getMonth()] || ''
  const startYear = startDateObj.getFullYear()

  // Данные СТС
  const stsInfo = (stsSeries && stsNumber)
    ? `серии ${esc(stsSeries)} № ${esc(stsNumber)}${stsDate ? ` выданного «${esc(fmtDateShort(stsDate))}»` : ''}`
    : 'серии ______ № ____________'

  const buyoutPriceWords = buyoutPrice ? formatMoneyWords(buyoutPrice) : ''

  // ============================================================
  // ЧАСТЬ 1: ДОГОВОР АРЕНДЫ ТС С ПРАВОМ ВЫКУПА
  // ============================================================
  const part1 = `
<p class="center bold" style="font-size:14pt;">ДОГОВОР АРЕНДЫ</p>
<p class="center bold" style="font-size:13pt;">транспортного средства без экипажа c правом выкупа №${esc(data.contractNumber)}</p>

<p>
  <table style="border:none;">
    <tr style="border:none;">
      <td style="border:none; width:50%;">г. ${esc(contractCity || '____________')}</td>
      <td style="border:none; width:50%; text-align:right;" class="bold">${startDay} ${startMonth} ${startYear}г.</td>
    </tr>
  </table>
</p>

<table style="border:none;">
  <tr style="border:none;">
    <td style="border:none; width:50%;" class="bold">С одной стороны, Арендодатель:</td>
    <td style="border:none; width:50%;" class="bold">С другой стороны, Арендатор:</td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;">Гр. ${esc(owner?.fullName || '________________________')}</td>
    <td style="border:none;">Гр. ${esc(c.fullName)}</td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;">паспорт: серия ${esc(owner?.passportSeries || '____')} № ${esc(owner?.passportNumber || '______')}</td>
    <td style="border:none;">
      Дата рождения: ${esc(c.birthDate || '____________')}<br>
      ${esc(c.registrationAddress || '____________')}
    </td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;">Выдан: ${esc(owner?.passportIssuedBy || '____________')}${owner?.passportIssueDate ? ` ${esc(fmtDateShort(owner.passportIssueDate))}` : ''}</td>
    <td style="border:none;">
      Паспорт. ${esc(c.passportSeries || '____')} серия : ${esc(c.passportNumber || '______')}<br>
      ${(driverLicenseSeries || driverLicenseNumber) ? `В/У ${esc(driverLicenseSeries || '____')} ${esc(driverLicenseNumber || '______')}` : ''}
    </td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;">Располагающийся по адресу: ${esc(owner?.registrationAddress || '____________')}</td>
    <td style="border:none;">
      Выдан: ${esc(c.passportIssuedBy || '____________')}<br>
      ${esc(c.passportIssueDate ? fmtDateShort(c.passportIssueDate) : '____________')}
    </td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;">Тел. ${esc(owner?.phone || '____________')}</td>
    <td style="border:none;">Проживающий по адресу: ${esc(c.registrationAddress || '____________')}</td>
  </tr>
  <tr style="border:none;">
    <td style="border:none;">-</td>
    <td style="border:none;">Тел. ${esc(c.phone || '____________')}</td>
  </tr>
</table>

<p>Совместно именуемые в дальнейшем «Стороны», заключили настоящий договор, в дальнейшем «<b>Договор</b>», о нижеследующем:</p>

<h2>1. ПРЕДМЕТ ДОГОВОРА</h2>

<p><b>1.1.</b> Арендодатель предоставляет Арендатору за плату во временное владение и пользование принадлежащий Арендодателю на основании свидетельства транспортного средства ${stsInfo}, легковой автомобиль марки «${esc(data.carBrand)} ${esc(data.carModel)}», ${esc(data.carYear || '____')} года изготовления, VIN ${esc(data.carVin || '____________')}, кузов № ${esc(data.carVin || '____________')} цвет ${esc(data.carColor || '____________')} государственный регистрационный номер ${esc(data.carLicensePlate)} именуемый далее «Автомобиль», без оказания услуг по управлению им, его технической эксплуатации и обслуживанию.</p>

<p><b>1.2.</b> Техническое состояние Автомобиля подтверждается действующим талоном о прохождении технического осмотра Автомобиля (технический осмотр не требуется если автомобиль не старше двух лет), осмотром и проверкой работоспособности двигателя и иного оборудования, установленного на Автомобиле. Автомобиль передается по акту приема-передачи транспортного средства, скрепляемому подписями сторон (Приложение № 2).</p>

<p><b>1.3.</b> Использование Автомобиля не должно противоречить его назначению.</p>

<p><b>1.4.</b> Площадка для приёма и передачи транспорта расположена по адресу: ${esc(deliveryAddress || '____________')}.</p>

<h2>2. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЁТОВ</h2>

<p><b>2.1.</b> Размер арендной платы за пользованием автомобилем и порядок ее уплаты предусматривается дополнительным соглашением к настоящему Договору (Приложение 1).</p>

<p><b>2.2.</b> <span class="bold">Арендодатель вправе взымать штраф за просрочку платежа в установленный расчетный период до 18:00, в размере 5.000р за каждый день просрочки, сумма задолженности не может достигать более 30.000 рублей.</span></p>

<h2>3. ДАТА ЗАКЛЮЧЕНИЯ ДОГОВОРА</h2>

<p><b>3.1.</b> Настоящий Договор вступает в силу c ${esc(startTime)} «${startDay}» ${startMonth} ${startYear}г. и действует в течении ${esc(String(termMonths))} месяцев. В случае если за 2 (два) календарных дня до окончания срока действия договора ни одна из сторон не заявила о его расторжении (не направив уведомления, либо по телефону или смс), договор считается заключенным на неопределенный срок. В этом случае расторжение договора возможно в любое время по инициативе любой из сторон с предварительным уведомлением другой стороны за 2(два) календарных дня.</p>

<h2>4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>

<p><b>4.1. Арендодатель обязуется:</b></p>
<p><b>4.1.1.</b> В день вступления в силу настоящего Договора передать Арендатору Автомобиль, указанный в п.1.1 договора.</p>
<p><b>4.1.2.</b> Передать Арендатору документы, относящиеся к автомобилю и необходимые для нормальной эксплуатации.</p>
<p><b>4.1.3.</b> Арендодатель вправе проверять сохранность, техническую исправность и комплектность Автомобиля и установленного на нем оборудования. Арендатор не вправе препятствовать проведению осмотра автомобилей.</p>

<p><b>4.2. Арендатор обязуется:</b></p>
<p><b>4.2.1.</b> Арендатор обязан осмотреть состояние и комплектацию автомобиля и принять его от Арендодателя, подписав акт приема-передачи автомобиля (Приложение № 2).</p>
<p><b>4.2.2.</b> Арендатор обязуется использовать автомобиль в строгом соответствии с его назначением, соблюдать Правила дорожного движения, нести ответственность за соблюдение требований по профилактике и учету ДТП, содержать автомобиль в технически исправном состоянии, иметь при себе необходимые документы, требуемые сотрудниками ГИБДД. Арендатор обязуется строго соблюдать все требования по эксплуатации транспортного средства и условия, указанные в сервисной книжке этого автомобиля.</p>
<p><b>4.2.3.</b> Своевременно оповещать Арендодателя и страховую компанию о ДТП. Получать необходимые документы в ГИБДД. Оформлять, получать и подавать все необходимые документы и заявления в Страховую компанию для получения возмещения Арендодателем. В случае невыполнения данных требований Арендатор несёт полную материальную ответственность за повреждения, полученные в результате ДТП.</p>
<p><b>4.2.4.</b> При повреждении, утрате автомобиля Арендатор обязуется незамедлительно известить об этом Арендодателя, а также уведомить о страховом случае страховую организацию в соответствии с договором страхования и законодательством.</p>
<p><b>4.2.5.</b> При ДТП, совершенном по вине Арендатора, в случаях, не относящихся к страховым случаям по договорам страхования арендуемых автомобилей (в том числе и алкогольного опьянения и др.), Арендатор обязуется произвести все предусмотренные законом и настоящим договором действия для возврата Арендодателю поврежденного автомобиля, и возместить в течение 14 дней убытки Арендодателю, либо выплатить Арендодателю стоимость автомобиля.</p>
<p><b>4.2.6.</b> Обеспечить сохранность регистрационных и других необходимых для эксплуатации документов. В случае их утраты независимо от наличия вины Арендатора, Арендатор обязуется возместить расходы Арендодателю по их восстановлению.</p>
<p><b>4.2.7.</b> Арендатор обязуется возместить в полном объеме ущерб, причиненный третьим лицам, при эксплуатации автомобиля (ст. 648 ГК РФ). В случае предъявления третьими лицами требований о возмещении ущерба к Арендодателю, Арендатор обязан участвовать в судебных процессах по данному случаю, предоставить Арендатору все документы, связанные с причинением ущерба, возместить Арендодателю все расходы по судебным процессам.</p>
<p><b>4.2.8.</b> Оплачивать горюче-смазочные материалы, которыми будет заправляться Автомобиль в период его использования. При эксплуатации автомобиля использовать исключительно те горюче-смазочные материалы, которые указаны в сервисной книжке.</p>
<p><b>4.2.9.</b> По требованию Арендодателя, а также в случае досрочного расторжения договора, вернуть в этот же день автомобиль в том состоянии, в котором он был получен (с учетом нормативного износа) в комплектации, полученной от Арендодателя. Передача осуществляется в порядке, установленным настоящим договором. Факт передачи оформляется актом приема-передачи автомобиля (Приложение 1).</p>
<p><b>4.2.10.</b> При возвращении автомобиля Арендодателю Арендатор обязан вернуть автомобиль в комплектации, в которой он передавался, заправленным и чистым. При возврате автомобиля с нарушением комплектности Арендатор уплачивает Арендодателю стоимость невозвращенного комплекта.</p>
<p><b>4.2.11.</b> Не вносить без согласия Арендодателя изменений и дополнений во внешний вид и конструкцию Автомобиля.</p>
<p><b>4.2.12.</b> Не передавать управление Автомобилем третьим лицам без письменного разрешения Арендодателя. При передаче Автомобиля третьим лицам, с разрешения Арендодателя, стоимость проката увеличивается на 1000 рублей в сутки. При передаче Автомобиля третьим лицам без разрешения Арендодателя – штраф 50000 рублей и расторжение договора.</p>
<p><b>4.2.13.</b> Оплатить штраф(ы), полученный(ые) по его вине, в том числе вынесенный(ые) с помощью автоматических средств фото-видео фиксации, передав необходимую сумму денег Арендодателю не позднее 7 дней после фактического получения штрафа(ов).</p>
<p><b>4.2.16.</b> По окончании периода использования Автомобиля вернуть его на то же место указанное пункте 1.4, откуда он его взял в начале использования, в противном случае оплатить Арендодателю все расходы по возврату автомобиля в исходное место и 10000 рублей, как компенсацию за потерю времени.</p>
<p><b>4.2.17.</b> Не курить в салоне Автомобиля, и исключить случаи курения пассажирами в данном Автомобиле. В случае обнаружения Арендодателем последствий курения в салоне, оплатить штраф в размере 10000 рублей.</p>
<p><b>4.2.18.</b> Вернуть автомобиль Арендодателю в чистом виде (проведя комплексную мойку на специализированной моечной станции) если автомобиль был передан Арендатору в чистом виде. Если автомобиль был передан Арендатору в не чистом виде, то Арендатор может не выполнять данный пункт.</p>
<p><b>4.2.19.</b> Устранить за свой счет любые повреждения в том числе произошедшие при ДТП, которые произошли по его вине или при отсутствии вины в результате действий третьих лиц (кроме случаев если личность третьих лиц известна и вина третьих лиц доказана соответствующим документом), не позднее 14 дней с момента ДТП, либо передав сумму денег на восстановление Автомобиля Арендодателю, по оценочной стоимости повреждений в организации, осуществляющей данные услуги.</p>
<p><b>4.2.20.</b> Передать копию своего паспорта и водительского удостоверения Арендодателю, либо отправить по электронной почте сканы документов.</p>
<p><b>4.2.22.</b> Ознакомиться с правилами эксплуатации автомобиля.</p>
<p><b>4.2.23.</b> Поддерживать уровень бензина в баке не меньше четверти, если машина с газовым оборудованием.</p>
<p><b>4.2.24.</b> При эксплуатации не допускать превышение суточного пробега свыше 400 км.</p>
<p><b>4.2.25.</b> Эксплуатировать транспортное средство в пределах г.Ростова на Дону или его пригородах, но не далее 300 км.</p>
<p><b>4.2.26.</b> При возврате автомобиля уровень топлива в баке должен соответствовать уровню на момент передачи автомобиля Арендатору.</p>

<h2>5. ОТВЕТСТВЕННОСТЬ СТОРОН, ПОРЯДОК РАСТОРЖЕНИЯ ДОГОВОРА И РАССМОТРЕНИЯ СПОРОВ</h2>

<p><b>5.1.</b> В случае просрочки внесения арендной платы Арендатор уплачивает Арендодателю штраф - 1000 рублей за каждый день прострочки, <span class="bold">на второй день договор расторгается, машина забирается.</span></p>
<p><b>5.2.</b> В случае нарушения условий Арендатором по содержанию машины в чистом виде. Арендодатель предъявляет штраф - 5000 рублей за каждый выявленный случай.</p>
<p><b>5.3.</b> Нести ответственность за несоблюдение правил дорожного движения, правил благоустройства, действующих в месте эксплуатации.</p>
<p><b>5.4.</b> Арендатор самостоятельно несёт гражданско-правовую ответственность за вред, причинённый автомобилям, третьим лицам, имуществу третьих лиц, а также возмещает вред, нанесённый здоровью третьих лиц.</p>

<p><b>5.5. Досрочное расторжение Договора допускается в следующих случаях:</b></p>
<p><b>5.5.1. По инициативе Арендодателя:</b></p>
<p><b>5.5.1.1.</b> если Арендатор использует Автомобиль не в соответствии с целями его предоставления;</p>
<p><b>5.5.1.2.</b> если Арендатор умышленно ухудшает состояние Автомобиля, либо не выполняет возложенную на него обязанность по надлежащему содержанию;</p>
<p><b>5.5.1.3.</b> Нарушает требования, указанные в приложении № 1 к настоящему договору.</p>
<p><b>5.5.2. По инициативе Арендатора:</b></p>
<p><b>5.5.2.1.</b> при изменении его финансового положения, в результате чего он вынужден отказаться от аренды Автомобиля с предварительным уведомлением Арендодателя не менее чем за 7 дней до даты расторжения;</p>
<p><b>5.6.</b> За неисполнение или ненадлежащее исполнение своих обязательств по настоящему Договору Стороны несут ответственность в соответствии с действующим законодательством Российской Федерации.</p>
<p><b>5.7.</b> Любой спор, разногласие или претензия, вытекающие из или в связи с настоящим договором либо его нарушением, прекращением или недействительностью подлежат разрешению в Волгодонском районном суде города Волгодонска Ростовской Области, либо в Мировом суде города Волгодонска участок № 4, в зависимости от суммы иска.</p>
<p><b>5.8.</b> В случае досрочного расторжения настоящего договора взаиморасчеты между сторонами производятся не позднее дня передачи автомобиля.</p>
<p><b>5.9.</b> При досрочном расторжении договора по инициативе Арендатора арендная плата и обеспечительный платеж не возвращается.</p>

<h2>6. ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ</h2>

<p><b>6.1.</b> Договор может быть изменен по письменному соглашению Сторон.</p>
<p><b>6.2.</b> Условия настоящего договора являются конфиденциальными и не подлежат разглашению третьим лицам без письменного согласия другой Стороны. Стороны обязуются соблюдать конфиденциальность в отношении всей информации, полученной в связи с реализацией настоящего Договора. Сторонам запрещается представлять каким-либо лицам в каком-либо порядке доступ к информации и документам, полученным ими в связи с реализацией настоящего Договора, если иное прямо не предусмотрено законодательством Российской Федерации.</p>
<p><b>6.3.</b> Все приложения к настоящему договору имеют юридическую силу, если они составлены в письменной форме и подписаны обеими Сторонами.</p>
<p><b>6.4.</b> Стороны подтверждают, что отсутствуют обстоятельства, вынуждающие совершить настоящий договор на крайне невыгодных для себя условиях.</p>
<p><b>6.5.</b> Отношения сторон, не урегулированные настоящим договором, регламентируются действующим законодательством РФ.</p>
<p><b>6.6.</b> Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из сторон.</p>

<p><b>7. Обеспечительный платеж</b> идет в счет погашения остаточного платежа от общей выкупной стоимости автомобиля по договору. При досрочном расторжении <b>обеспечительный платеж</b> не возвращается, идет в счет погашения амортизируемая стоимость.</p>

<p><b>Приложения:</b><br>
1. Приложение №1 дополнительное соглашение с условиями оплаты.<br>
2. Приложение № 2 Акт приема передачи</p>

<h2>7. ПОДПИСИ СТОРОН</h2>

<p class="bold">Арендодатель: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Арендатор:</p>
<p class="center">___________________/_____________________/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ___________________/____________________________/</p>
<p class="center" style="font-size:9pt;">(подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы)</p>
`

  // ============================================================
  // ЧАСТЬ 2: ПРИЛОЖЕНИЕ №1 — ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ
  // ============================================================
  const part2 = `
<div class="page-break"></div>

<p class="center bold" style="font-size:13pt;">Приложение № 1 к ДОГОВОРУ АРЕНДЫ</p>
<p class="center bold" style="font-size:13pt;">транспортного средства без экипажа</p>
<p class="center bold" style="font-size:13pt;">с последующим выкупом</p>
<p class="center bold">от «${startDay}» ${startMonth} ${startYear}г.</p>

<p class="center bold" style="font-size:14pt; margin-top:20px;">Дополнительное соглашение</p>
<p>г. ${esc(contractCity || '____________')}</p>

<p><b>1.</b> Арендная плата за пользование Автомобилем по настоящему Договору составляет <span class="bold">${monthlyPayment ? monthlyPayment.toLocaleString('ru-RU') : '____________'}₽ рублей в месяц каждого ${paymentDay} числа</span></p>

<p><b>2.</b> В день заключения договора с момента Арендатор оплачивает <span class="bold">обеспечительный платеж</span> в размере <span class="bold">${deposit ? deposit.toLocaleString('ru-RU') : '____________'} руб.</span></p>

<p><b>3.</b> В случае повреждения автомобиля, в результате ДТП по вине Арендатора, когда автомобиль временно не может использоваться по назначению, на период его ремонта, Арендатор также выплачивает Арендодателю сумму арендных платежей каждый день, указанную в дополнительном соглашении, пункт 1., до тех пор, пока автомобиль полностью будет восстановлен в прежнее состояние.</p>

<p><b>4.</b> Арендная плата за пользование автомобилем выплачивается вовремя каждый месяц, или по предоплате, до момента, когда выкупная цена будет полностью выплачена. Просрочка оплаты арендных платежей – штраф 10000 рублей/день.</p>

<p><b>5.</b> Если Арендатор намерен завершить пользование арендным автомобилем, он должен поставить в известность.</p>

<p><b>6.</b> Выкупная цена Автомобиля на момент заключения договора составляет <span class="bold">${buyoutPrice ? buyoutPrice.toLocaleString('ru-RU') : '____________'} ${esc(buyoutPriceWords)} рублей</span>). Срок выкупа автомобиля по настоящему договору составляет <span class="bold">${esc(String(termMonths))}</span> месяцев.</p>

<p><b>&nbsp;&nbsp;7.1.</b> До истечения Договора, Арендатор вправе выкупить Автомобиль по остаточной цене. Остаточная цена определяется путем вычитания из выкупной цены, указанной в п.7 дополнительного соглашения, суммы произведенных ранее арендных платежей по настоящему Договору.</p>
<p><b>&nbsp;&nbsp;7.2.</b> Арендные платежи, произведенные Арендатором по настоящему Договору, не подлежат возврату в случае расторжения настоящего Договора.</p>

<p><b>8.</b> Право собственности на Автомобиль перейдет от Арендодателя к Арендатору после того, как:</p>
<p><b>&nbsp;&nbsp;8.1.</b> Арендатор своевременно и в полном объеме оплатит арендные платежи.</p>
<p><b>&nbsp;&nbsp;8.2.</b> Арендатор оплатит всю стоимость выкупной цены Автомобиля в размере, указанном в п.7 дополнительного соглашения.</p>
<p><b>&nbsp;&nbsp;8.3.</b> Стороны настоящего Договора подпишут акт приема-передачи Автомобиля в собственность Арендатора.</p>

<p><b>9.</b> При возникновении задолженности в сумме более 5000 (пяти тысяч) рублей, денежные средства, внесенные Арендатором не будут учитывается в выкупную стоимость, пока долг не будет погашен. Эти денежные средства будут учитываться как арендные платежи, при наличии задолженности Арендатора перед Арендодателем.</p>

<p><b>10.</b> Арендатор обязан иметь приложение «Whatsapp,Max», вовремя отвечать на сообщения, всегда быть на связи.</p>
<p><b>11.</b> Арендатор обязан машину содержать в чистом виде. В машине не кушать. В машине не курить. Грязная машина - штраф 5000 рублей.</p>
<p><b>12.</b> Арендатор обязан ставить в известность, при поездке за город. В случае не извещения штраф в размере 10000 (десять тысяч) рублей, и 10000 (десять тысяч) рублей за каждый день нахождения автомобиля за городом.</p>
<p><b>13.</b> Арендатор обязан не ставить автомобиль на зеленую зону. Штраф 5000.</p>
<p><b>14.</b> Арендатор обязан не превышать скоростной режим и ездить по правилам ПДД.</p>
<p><b>15.</b> Если на машине стоит Газ, то Арендатор обязан поддерживать уровень бензина в баке не меньше четверти. Штраф 500.</p>
<p><b>16.</b> Арендатор обязан не давать право управления транспортным средством третьим лицам.</p>
<p><b>17.</b> Штрафы оплачиваются в первую очередь с арендных платежей.</p>
<p><b>18.</b> Во время прохождения ТО автомобиля, независимо от времени, проведенным в сервисе, никаких скидок по арендной плате не предоставляется.</p>
<p><b>19.</b> Суточный пробег транспортного средства не должен превышать 400 (четыреста) километров в сутки.</p>
<p><b>20.</b> Настоящее дополнительное соглашение вступает в силу с момента его подписания.</p>
<p><b>21.</b> Настоящее соглашение составлено в 2-х (двух) экземплярах, имеющих равную юридическую силу.</p>
<p><b>22.</b> За личные вещи, оставленные в автомобиле, Арендодатель ответственности не несет.</p>

<p>Арендатор сообщил два номера телефона своих родственников для связи с ним, в случае если связь с ним будет потеряна:</p>

<p class="center">${esc(relative1.phone || '_____________________')} / ${esc(relative1.name || '_______________________')}</p>
<p class="center" style="font-size:9pt;">(номер телефона) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (имя, кем является)</p>
<p class="center">${esc(relative2.phone || '_____________________')} / ${esc(relative2.name || '_______________________')}</p>
<p class="center" style="font-size:9pt;">(номер телефона) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (имя, кем является)</p>

<p class="bold">Арендодатель: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Арендатор:</p>
<p class="center">___________________/_____________________/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ___________________/_____________________/</p>
<p class="center" style="font-size:9pt;">(подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы)</p>
`

  // ============================================================
  // ЧАСТЬ 3: ПРИЛОЖЕНИЕ №2 — АКТ ПРИЁМА-ПЕРЕДАЧИ ТС
  // ============================================================
  const part3 = `
<div class="page-break"></div>

<p class="center bold" style="font-size:13pt;">Приложение № 2</p>
<p class="center bold" style="font-size:13pt;">к ДОГОВОРУ АРЕНДЫ</p>
<p class="center bold" style="font-size:13pt;">транспортного средства без экипажа</p>
<p class="center bold">№ ${esc(data.contractNumber)} от «${startDay}» ${startMonth} ${startYear}г.</p>

<p class="center bold" style="font-size:15pt; margin-top:20px;">АКТ</p>
<p class="center bold" style="font-size:13pt;">приема-передачи транспортного средства</p>

<p>Гр. ${esc(owner?.fullName || '________________________')} именуемый в дальнейшем «<b>Арендодатель</b>», с одной стороны, и гр. ${esc(c.fullName)} именуемый в дальнейшем «<b>Арендатор</b>», с другой стороны, составили настоящий Акт.</p>

<p><b>1.</b> Арендодатель передал, а Арендатор принял легковой автомобиль ${stsInfo}, легковой автомобиль марки «${esc(data.carBrand)} ${esc(data.carModel)}», ${esc(data.carYear || '____')} года изготовления, VIN ${esc(data.carVin || '____________')}, кузов № ${esc(data.carVin || '____________')}, цвет ${esc(data.carColor || '____________')}, государственный регистрационный номер ${esc(data.carLicensePlate)} именуемый далее. Автомобиль укомплектован полностью.</p>

<p><b>3.</b> При приеме автомобиля Арендатору переданы следующие документы: свидетельство о регистрации, страховой полис по ОСАГО.</p>

<p><b>4.</b> Арендодатель предоставил Арендатору в полном объеме необходимую информацию об автомобиле в соответствии с руководством по эксплуатации.</p>

<p><b>5.</b> Настоящий акт составлен и подписан в двух экземплярах, имеющих равную юридическую силу, и хранится по одному у каждой из сторон.</p>

<p><b>6.</b> Настоящий акт является неотъемлемой частью договора аренды.</p>

<p><b>7.</b> При передачи автомобиля использовались средства фото и видео фиксации.</p>

<p><b>8.</b> <span class="bold">Автомобиль сдается чистый и заправленный, мойка 2500₽ заправка +500₽ по чеку</span></p>

<p class="bold">Арендодатель: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Арендатор:</p>
<p class="center">___________________/_____________________/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ___________________/____________________________/</p>
<p class="center" style="font-size:9pt;">(подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (подпись) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (фамилия, инициалы)</p>
`

  return wrapHtml(`Договор выкупа № ${data.contractNumber}`, part1 + part2 + part3)
}
