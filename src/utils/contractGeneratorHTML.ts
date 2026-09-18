// ============================================================
// HTML ГЕНЕРАТОР ДОГОВОРОВ И АКТОВ
// Создаёт HTML-документ для просмотра на мобильных (Safari iOS / Android)
// Сохраняет все данные, рамки таблиц, layout — гарантированно рендерится
// одинаково в любом современном браузере. Поддерживает печать в PDF через
// системный диалог печати браузера.
// ============================================================

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

function fmtDays(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  let word = 'дней'
  if (abs >= 11 && abs <= 14) word = 'дней'
  else if (last === 1) word = 'день'
  else if (last >= 2 && last <= 4) word = 'дня'
  return `${n} ${word}`
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
  h2 { font-size: 12pt; text-transform: uppercase; }
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
  }
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
  .signature {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    page-break-inside: avoid;
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
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
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

// Вспомогательная: открыть HTML в новой вкладке (Safari iOS / Android / Desktop)
export function openHtmlDocument(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // Освобождаем URL через минуту (когда вкладка уже загрузилась)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ============================================================
// 1. АКТ ПРИЁМА-ПЕРЕДАЧИ ТРАНСПОРТНОГО СРЕДСТВА
// ============================================================

export function generateContractDocumentHTML(data: any): string {
  const owner = data.owner
  const c = data.client

  const ownerBlock = owner
    ? `Гражданин РФ <b>${esc(owner.fullName)}</b>${owner.birthDate ? `, ${esc(fmtDateShort(owner.birthDate))} г.р.` : ''}, паспорт ${esc(owner.passportSeries)} ${esc(owner.passportNumber)}, выдан: ${esc(owner.passportIssuedBy || '')}${owner.passportIssueDate ? ` ${esc(fmtDateShort(owner.passportIssueDate))}` : ''}, зарегистрирован: ${esc(owner.registrationAddress || '')}, именуемый в дальнейшем <b>Арендодатель</b>, с одной стороны, и `
    : `Гражданин РФ <b>________________</b>, именуемый в дальнейшем <b>Арендодатель</b>, с одной стороны, и `

  const clientBlock = `Гражданин РФ <b>${esc(c.fullName)}</b>${c.birthDate ? `, ${esc(fmtDateShort(c.birthDate))} г.р.` : ''}, паспорт ${esc(c.passportSeries)} ${esc(c.passportNumber)}${c.passportIssuedBy ? `, выдан: ${esc(c.passportIssuedBy)}` : ''}${c.passportIssueDate ? ` ${esc(fmtDateShort(c.passportIssueDate))}` : ''}${c.registrationAddress ? `, зарегистрирован: ${esc(c.registrationAddress)}` : ''}${c.phone ? `, тел.: ${esc(c.phone)}` : ''}, именуемый(ая) в дальнейшем <b>Арендатор</b>, с другой стороны,`

  const body = `
<p class="center">Приложение №1 к договору № ${esc(data.contractNumber)} от ${esc(fmtDateLong(data.contractDate))}</p>

<h1>АКТ ПРИЁМА – ПЕРЕДАЧИ ТРАНСПОРТНОГО СРЕДСТВА</h1>

<p>${ownerBlock}${clientBlock} составили настоящий Акт о нижеследующем:</p>

<h3>1. Арендодатель передаёт, а Арендатор принимает в пользование следующее транспортное средство:</h3>

<table>
  <tr>
    <td class="label row-label">Марка, модель:</td>
    <td class="value">${esc(data.carBrand)} ${esc(data.carModel)}</td>
    <td class="label row-label">Год выпуска:</td>
    <td class="value">${esc(data.carYear)}</td>
  </tr>
  <tr>
    <td class="label row-label">Цвет:</td>
    <td class="value">${esc(data.carColor)}</td>
    <td class="label row-label">Кузов (VIN):</td>
    <td class="value">${esc(data.carVin)}</td>
  </tr>
  <tr>
    <td class="label row-label">Гос. рег. знак:</td>
    <td class="value">${esc(data.carLicensePlate)}</td>
    <td class="label row-label">Двигатель:</td>
    <td class="value">____________</td>
  </tr>
</table>

<p><b>Стоимость транспортного средства:</b> ${fmtMoney(data.carPrice)} рублей.</p>

<h3>2. На момент передачи транспортное средство имеет следующие повреждения кузова:</h3>
<p>${esc(data.carDamages || 'Не указаны.')} ${data.hasScratches ? 'Имеются незначительные царапины и потёртости, не влияющие на эксплуатацию.' : ''}</p>

<h3>3. Транспортное средство передано в комплекте:</h3>
<ul>
  <li>Свидетельство о регистрации ТС — <b>${esc(data.stsSeries || '')} ${esc(data.stsNumber || '')}</b></li>
  <li>Ключ зажигания — <b>${data.keysCount || 1} шт.</b></li>
  ${data.carBattery ? `<li>Аккумуляторная батарея — в наличии</li>` : ''}
  ${data.carTires ? `<li>Шины — ${esc(data.carTires)}</li>` : ''}
</ul>

<h3>4. Состояние транспортного средства на момент передачи:</h3>
<p><b>Пробег:</b> ${fmtMoney(data.carMileage)} км.<br>
<b>Уровень топлива:</b> ${esc(data.fuelLevel || 'не указан')}</p>

<h3>5. Арендатор не имеет претензий к Арендодателю по техническому и внешнему состоянию транспортного средства.</h3>

<h3>6. Настоящий Акт составлен в 2-х экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из сторон.</h3>

<div class="signature">
  <div>
    <b>Арендодатель:</b><br>
    ${esc(owner?.fullName || '________________________')}
    <div class="line">подпись</div>
  </div>
  <div>
    <b>Арендатор:</b><br>
    ${esc(c.fullName)}
    <div class="line">подпись</div>
  </div>
</div>
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
  const rentalDays = data.rentalDays || 0
  const totalAmount = (data.dailyPrice || 0) * rentalDays
  const deposit = data.deposit || 0

  const ownerBlock = owner
    ? `<b>${esc(owner.fullName)}</b>${owner.birthDate ? `, ${esc(fmtDateShort(owner.birthDate))} г.р.` : ''}, паспорт ${esc(owner.passportSeries)} ${esc(owner.passportNumber)}, зарегистрирован: ${esc(owner.registrationAddress || '')}, тел.: ${esc(owner.phone || '')}, именуемый в дальнейшем <b>Арендодатель</b>`
    : `<b>________________________</b>, именуемый в дальнейшем <b>Арендодатель</b>`

  const clientBlock = `<b>${esc(c.fullName)}</b>${c.birthDate ? `, ${esc(fmtDateShort(c.birthDate))} г.р.` : ''}, паспорт ${esc(c.passportSeries)} ${esc(c.passportNumber)}, водительское удостоверение ${esc(c.driverLicenseSeries || '')} ${esc(c.driverLicenseNumber || '')}, зарегистрирован: ${esc(c.registrationAddress || '')}, тел.: ${esc(c.phone || '')}, именуемый(ая) в дальнейшем <b>Арендатор</b>`

  const body = `
<p class="center">г. ${esc(data.contractCity || '____________')} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «____» ____________ ${new Date().getFullYear()} г.</p>

<h1>ДОГОВОР АРЕНДЫ ТРАНСПОРТНОГО СРЕДСТВА<br>№ ${esc(data.contractNumber)}</h1>

<p>${ownerBlock}, с одной стороны, и ${clientBlock}, с другой стороны, заключили настоящий Договор о нижеследующем:</p>

<h2>1. ПРЕДМЕТ ДОГОВОРА</h2>

<p><b>1.1.</b> Арендодатель передаёт во временное владение и пользование, а Арендатор принимает следующее транспортное средство:</p>

<table>
  <tr>
    <td class="label row-label">Марка, модель:</td>
    <td class="value">${esc(data.carBrand)} ${esc(data.carModel)}</td>
    <td class="label row-label">Год выпуска:</td>
    <td class="value">${esc(data.carYear)}</td>
  </tr>
  <tr>
    <td class="label row-label">Цвет:</td>
    <td class="value">${esc(data.carColor)}</td>
    <td class="label row-label">VIN:</td>
    <td class="value">${esc(data.carVin)}</td>
  </tr>
  <tr>
    <td class="label row-label">Гос. рег. знак:</td>
    <td class="value">${esc(data.carLicensePlate)}</td>
    <td class="label row-label">Пробег:</td>
    <td class="value">${fmtMoney(data.carMileage)} км</td>
  </tr>
</table>

<p><b>1.2.</b> Стоимость транспортного средства: <b>${fmtMoney(data.carPrice)} руб.</b></p>

<h2>2. СРОК АРЕНДЫ</h2>

<p><b>2.1.</b> Срок аренды: с <b>${esc(fmtDateLong(data.startDate))}</b> по <b>${esc(fmtDateLong(data.endDate))}</b> (включительно), всего ${fmtDays(rentalDays)}.</p>

<h2>3. АРЕНДНАЯ ПЛАТА И ПОРЯДОК РАСЧЁТОВ</h2>

<p><b>3.1.</b> Стоимость аренды: <b>${fmtMoney(data.dailyPrice)} руб./сутки</b>.</p>

<p><b>3.2.</b> Общая стоимость аренды за весь период: <b>${fmtMoney(totalAmount)} (${fmtMoney(totalAmount)})</b> рублей.</p>

<p><b>3.3.</b> Залог: <b>${fmtMoney(deposit)} руб.</b> (возвращается Арендатору по окончании срока аренды при отсутствии повреждений).</p>

<p><b>3.4.</b> Арендная плата вносится Арендатором при подписании настоящего Договора.</p>

<h2>4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>

<h3>Арендодатель обязуется:</h3>
<ul>
  <li>Передать Арендатору технически исправное транспортное средство в чистом виде;</li>
  <li>Не препятствовать Арендатору в использовании транспортного средства в течение срока аренды;</li>
  <li>Возвратить залог в полном объёме при надлежащем исполнении Арендатором обязательств.</li>
</ul>

<h3>Арендатор обязуется:</h3>
<ul>
  <li>Использовать транспортное средство по прямому назначению;</li>
  <li>Не передавать транспортное средство третьим лицам без письменного согласия Арендодателя;</li>
  <li>Возвратить транспортное средство в технически исправном состоянии по окончании срока аренды;</li>
  <li>Возместить ущерб при повреждении транспортного средства по его вине.</li>
</ul>

<h2>5. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>

<p><b>5.1.</b> За нарушение сроков оплаты Арендатор уплачивает пеню в размере 0,1% от суммы задолженности за каждый день просрочки.</p>

<p><b>5.2.</b> Стороны освобождаются от ответственности за неисполнение обязательств вследствие обстоятельств непреодолимой силы.</p>

<h2>6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h2>

<p><b>6.1.</b> Договор вступает в силу с момента его подписания обеими сторонами и действует до полного исполнения обязательств.</p>

<p><b>6.2.</b> Все изменения и дополнения к настоящему Договору действительны при условии их оформления в письменном виде и подписания обеими сторонами.</p>

<p><b>6.3.</b> Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.</p>

<div class="signature">
  <div>
    <b>Арендодатель:</b><br>
    ${esc(owner?.fullName || '________________________')}
    <div class="line">подпись</div>
  </div>
  <div>
    <b>Арендатор:</b><br>
    ${esc(c.fullName)}
    <div class="line">подпись</div>
  </div>
</div>
`

  return wrapHtml(`Договор аренды № ${data.contractNumber}`, body)
}

// ============================================================
// 3. АКТ ВЫПОЛНЕННЫХ РАБОТ (ТО)
// ============================================================

interface ServiceActHTMLData {
  contractNumber: string
  contractDate: string
  carName: string
  carLicensePlate: string
  carVin?: string
  ownerFullName?: string
  works: Array<{ name: string; price: number }>
  totalAmount: number
  notes?: string
}

export function generateServiceActDocumentHTML(data: ServiceActHTMLData): string {
  const workRows = data.works
    .map(
      (w, i) => `
      <tr>
        <td style="width:5%">${i + 1}</td>
        <td>${esc(w.name)}</td>
        <td style="width:20%; text-align:right;">${fmtMoney(w.price)}</td>
      </tr>`,
    )
    .join('')

  const body = `
<p class="center">г. ____________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «____» ____________ ${new Date().getFullYear()} г.</p>

<h1>АКТ № ${esc(data.contractNumber)}<br>выполненных работ по договору аренды</h1>

<p>от «____» ____________ ${new Date().getFullYear()} г.</p>

<h3>Заказчик:</h3>
<p><b>${esc(data.ownerFullName || '________________________')}</b></p>

<h3>Транспортное средство:</h3>
<table>
  <tr>
    <td class="label row-label">Марка, модель:</td>
    <td class="value">${esc(data.carName)}</td>
    <td class="label row-label">Гос. рег. знак:</td>
    <td class="value">${esc(data.carLicensePlate)}</td>
  </tr>
  ${data.carVin ? `<tr><td class="label row-label">VIN:</td><td colspan="3">${esc(data.carVin)}</td></tr>` : ''}
</table>

<h3>Перечень выполненных работ:</h3>

<table>
  <tr style="background:#f5f5f5">
    <th style="width:5%; text-align:left;">№</th>
    <th style="text-align:left;">Наименование работы</th>
    <th style="width:20%; text-align:right;">Стоимость (руб.)</th>
  </tr>
  ${workRows}
  <tr>
    <td colspan="2" class="bold" style="text-align:right;">ИТОГО:</td>
    <td class="bold" style="text-align:right;">${fmtMoney(data.totalAmount)}</td>
  </tr>
</table>

${data.notes ? `<h3>Примечания:</h3><p>${esc(data.notes)}</p>` : ''}

<p>Работы выполнены в полном объёме и в установленный срок. Заказчик претензий по объёму, качеству и срокам выполнения работ не имеет.</p>

<div class="signature">
  <div>
    <b>Исполнитель:</b>
    <div class="line">подпись</div>
  </div>
  <div>
    <b>Заказчик:</b><br>
    ${esc(data.ownerFullName || '________________________')}
    <div class="line">подпись</div>
  </div>
</div>
`

  return wrapHtml(`Акт № ${data.contractNumber}`, body)
}

// ============================================================
// 4. ДОГОВОР ВЫКУПА
// ============================================================

export function generateBuyoutContractDocumentHTML(data: any): string {
  const owner = data.owner
  const c = data.client
  const bd = data.buyoutData || ({} as any)
  const termMonths = bd.termMonths ?? 12
  const monthlyPayment = bd.monthlyPayment ?? 0
  const carPrice = bd.carPrice ?? data.carPrice ?? 0
  const profitPercent = bd.profitPercent ?? 30
  const buyoutPrice = bd.buyoutPrice ?? Math.round(carPrice * (1 + profitPercent / 100))
  const deliveryAddress = bd.deliveryAddress ?? ''
  const stsSeries = bd.stsSeries ?? ''
  const stsNumber = bd.stsNumber ?? ''
  const startTime = bd.startTime ?? '10:00'
  const relatives = Array.isArray(bd.relatives) ? bd.relatives : []
  const driverLicenseSeries = bd.driverLicenseSeries ?? ''
  const driverLicenseNumber = bd.driverLicenseNumber ?? ''
  const depositReturned = bd.depositReturned ?? false
  const depositReturnedAmount = bd.depositReturnedAmount ?? 0

  const ownerBlock = owner
    ? `<b>${esc(owner.fullName)}</b>${owner.birthDate ? `, ${esc(fmtDateShort(owner.birthDate))} г.р.` : ''}, паспорт ${esc(owner.passportSeries)} ${esc(owner.passportNumber)}, зарегистрирован: ${esc(owner.registrationAddress || '')}, тел.: ${esc(owner.phone || '')}, именуемый в дальнейшем <b>Арендодатель</b>`
    : `<b>________________________</b>, именуемый в дальнейшем <b>Арендодатель</b>`

  const relativesBlock = relatives
    .map(
      (r: { name?: string; phone?: string }) =>
        `<li>${esc(r.name || '')} — ${esc(r.phone || '')}</li>`,
    )
    .join('')

  const body = `
<p class="center">г. ${esc(bd.contractCity || '____________')} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «____» ____________ ${new Date().getFullYear()} г.</p>

<h1>ДОГОВОР АРЕНДЫ С ПРАВОМ ВЫКУПА<br>ТРАНСПОРТНОГО СРЕДСТВА<br>№ ${esc(data.contractNumber)}</h1>

<p>${ownerBlock}, с одной стороны, и <b>${esc(c.fullName)}</b>${c.birthDate ? `, ${esc(fmtDateShort(c.birthDate))} г.р.` : ''}, паспорт ${esc(c.passportSeries)} ${esc(c.passportNumber)}${driverLicenseSeries ? `, водительское удостоверение ${esc(driverLicenseSeries)} ${esc(driverLicenseNumber)}` : ''}${c.registrationAddress ? `, зарегистрирован: ${esc(c.registrationAddress)}` : ''}, тел.: ${esc(c.phone || '')}, именуемый(ая) в дальнейшем <b>Арендатор</b>, с другой стороны, заключили настоящий Договор о нижеследующем:</p>

<h2>1. ПРЕДМЕТ ДОГОВОРА</h2>

<p><b>1.1.</b> Арендодатель передаёт Арендатору во временное владение и пользование с правом последующего выкупа следующее транспортное средство:</p>

<table>
  <tr>
    <td class="label row-label">Марка, модель:</td>
    <td class="value">${esc(data.carBrand)} ${esc(data.carModel)}</td>
    <td class="label row-label">Год выпуска:</td>
    <td class="value">${esc(data.carYear)}</td>
  </tr>
  <tr>
    <td class="label row-label">Цвет:</td>
    <td class="value">${esc(data.carColor)}</td>
    <td class="label row-label">VIN:</td>
    <td class="value">${esc(data.carVin)}</td>
  </tr>
  <tr>
    <td class="label row-label">Гос. рег. знак:</td>
    <td class="value">${esc(data.carLicensePlate)}</td>
    <td class="label row-label">СТС:</td>
    <td class="value">${esc(stsSeries)} ${esc(stsNumber)}</td>
  </tr>
</table>

<p><b>1.2.</b> Стоимость Автомобиля: <b>${fmtMoney(carPrice)} руб.</b></p>

<p><b>1.3.</b> Арендатор принимает на себя обязательство выкупить Автомобиль по истечении срока аренды по выкупной цене.</p>

<h2>2. СРОК АРЕНДЫ И ВЫКУПНАЯ ЦЕНА</h2>

<p><b>2.1.</b> Срок аренды: <b>${termMonths} месяцев</b> с момента передачи Автомобиля.</p>

<p><b>2.2.</b> Выкупная цена Автомобиля: <b>${fmtMoney(buyoutPrice)} руб.</b> (${profitPercent}% от стоимости Автомобиля).</p>

<p><b>2.3.</b> Ежемесячный платёж: <b>${fmtMoney(monthlyPayment)} руб.</b></p>

<h2>3. ПОРЯДОК ПЕРЕДАЧИ</h2>

<p><b>3.1.</b> Автомобиль передаётся Арендатору по адресу: <b>${esc(deliveryAddress || '____________')}</b>, в <b>${esc(startTime)}</b> часов дня.</p>

<h2>4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>

<h3>Арендодатель обязуется:</h3>
<ul>
  <li>Передать Автомобиль в технически исправном состоянии;</li>
  <li>Не препятствовать Арендатору в пользовании Автомобилем;</li>
  <li>Оформить переход права собственности после выплаты выкупной цены.</li>
</ul>

<h3>Арендатор обязуется:</h3>
<ul>
  <li>Вносить ежемесячные платежи в установленные сроки;</li>
  <li>Использовать Автомобиль по прямому назначению;</li>
  <li>Не передавать Автомобиль третьим лицам без письменного согласия Арендодателя;</li>
  <li>Возвратить Автомобиль в случае отказа от выкупа.</li>
</ul>

${relativesBlock ? `<h3>Контактные лица Арендатора:</h3><ul>${relativesBlock}</ul>` : ''}

<h2>5. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>

<p><b>5.1.</b> За нарушение сроков оплаты Арендатор уплачивает пеню в размере 0,1% от суммы задолженности за каждый день просрочки.</p>

<p><b>5.2.</b> В случае отказа Арендатора от выкупа Автомобиля ранее окончания срока аренды залог не возвращается.</p>

${depositReturned ? `<p><b>5.3.</b> Залог возвращён Арендатору в размере ${fmtMoney(depositReturnedAmount)} руб. при подписании настоящего Договора.</p>` : ''}

<h2>6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h2>

<p><b>6.1.</b> Договор вступает в силу с момента его подписания обеими сторонами и действует до полного исполнения обязательств.</p>

<p><b>6.2.</b> Настоящий Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.</p>

<div class="signature">
  <div>
    <b>Арендодатель:</b><br>
    ${esc(owner?.fullName || '________________________')}
    <div class="line">подпись</div>
  </div>
  <div>
    <b>Арендатор:</b><br>
    ${esc(c.fullName)}
    <div class="line">подпись</div>
  </div>
</div>
`

  return wrapHtml(`Договор выкупа № ${data.contractNumber}`, body)
}
