// ============================================================
// PDF-экспорт из HTML для мобильных
// Используется вместо openHtmlDocument + браузерной печати.
// На iOS Safari открывает нативный PDF-viewer — никаких
// footer'ов с blob-URL в шапке страниц.
// ============================================================

import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// A4 при 96 DPI: 794 × 1123 px
const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123

/**
 * Конвертирует HTML-строку в PDF и открывает его в новой вкладке.
 * Делит документ на страницы по <div class="page-break"></div> —
 * они уже проставлены между частями договоров (Договор / Прил.1 / Прил.2).
 */
export async function exportHtmlToPdf(html: string, filename: string): Promise<void> {
  // 1. Создаём offscreen-контейнер в текущей странице
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -99999px;
    top: 0;
    width: ${A4_WIDTH_PX}px;
    background: white;
  `
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    // 2. Ждём пока все <img> загрузятся
    const imgs = Array.from(container.querySelectorAll('img'))
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve()
            } else {
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }
          }),
      ),
    )
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 3. Разбиваем документ на страницы по <div class="page-break">
    //    Каждая страница — отдельный контейнер фиксированной высоты A4.
    //    Если разделителей нет — единая страница по размеру контента.
    const body = container.querySelector('body') || container
    const pageBreakEls = Array.from(body.querySelectorAll('.page-break'))

    const pages: HTMLElement[] = []

    if (pageBreakEls.length > 0) {
      // Строим страницы между разделителями
      const makePage = () => {
        const page = document.createElement('div')
        page.style.cssText = `
          width: ${A4_WIDTH_PX}px;
          min-height: ${A4_HEIGHT_PX}px;
          background: white;
          padding: 0;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        `
        return page
      }

      const firstPage = makePage()
      body.insertBefore(firstPage, body.firstChild)
      pages.push(firstPage)

      pageBreakEls.forEach((br) => {
        // Переносим page-break сам по себе в скрытый helper, чтобы не
        // попадал в рендер. Сами элементы до br попадают в текущую страницу.
        const nextPage = makePage()
        // Все узлы после br до следующего br (или конца) — в следующую страницу
        let cursor: ChildNode | null = br.nextSibling
        while (cursor) {
          const next: ChildNode | null = cursor.nextSibling
          nextPage.appendChild(cursor)
          cursor = next
        }
        // br удалим — он больше не нужен
        br.remove()
        body.appendChild(nextPage)
        pages.push(nextPage)
      })
    } else {
      const single = document.createElement('div')
      single.style.cssText = `
        width: ${A4_WIDTH_PX}px;
        min-height: ${A4_HEIGHT_PX}px;
        background: white;
      `
      single.innerHTML = container.innerHTML
      container.innerHTML = ''
      container.appendChild(single)
      pages.push(single)
    }

    // 4. Снимаем каждую страницу отдельно
    const pdf = new jsPDF({
      unit: 'px',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    })

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i]
      const canvas = await html2canvas(pageEl, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: A4_WIDTH_PX,
        logging: false,
      })

      const pageDataUrl = canvas.toDataURL('image/jpeg', 0.92)

      if (i > 0) pdf.addPage()
      // Помещаем в A4 с сохранением пропорций
      const imgWidth = A4_WIDTH_PX
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(pageDataUrl, 'JPEG', 0, 0, imgWidth, imgHeight)
    }

    // 5. Отдаём пользователю — iOS Safari открывает нативный PDF-viewer
    const pdfBlob = pdf.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } finally {
    container.remove()
  }
}
