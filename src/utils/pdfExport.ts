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
 * На мобильных устройствах пользователь получает готовый PDF.
 */
export async function exportHtmlToPdf(html: string, _filename: string): Promise<void> {
  // 1. Создаём offscreen iframe с фиксированной шириной A4
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `
    position: fixed;
    top: -10000px;
    left: 0;
    width: ${A4_WIDTH_PX}px;
    height: auto;
    min-height: 100px;
    border: none;
    background: white;
    visibility: hidden;
  `
  document.body.appendChild(iframe)

  try {
    // 2. Ждём загрузки документа в iframe
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve()
      iframe.onerror = () => reject(new Error('iframe load failed'))
      iframe.srcdoc = html
      // На случай если srcdoc не вызвал onload
      setTimeout(() => resolve(), 1500)
    })

    const doc = iframe.contentDocument
    if (!doc) throw new Error('iframe document unavailable')
    const body = doc.body
    if (!body) throw new Error('iframe body unavailable')

    // Даём браузеру время отрисовать (шрифты, изображения)
    await new Promise(resolve => setTimeout(resolve, 200))

    // 3. html2canvas снимает весь body
    const fullCanvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: A4_WIDTH_PX,
      width: body.scrollWidth,
      height: body.scrollHeight,
    })

    // 4. Режем canvas на страницы A4 и собираем PDF
    const pdf = new jsPDF({
      unit: 'px',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    })

    const pageHeightPx = A4_HEIGHT_PX
    const fullImgHeight = fullCanvas.height
    const fullImgWidth = fullCanvas.width

    // Сколько раз помещается страница по вертикали
    const pagesCount = Math.ceil(fullImgHeight / pageHeightPx)

    // Создаём offscreen canvas для каждой страницы и копируем нужный фрагмент
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = fullImgWidth
    pageCanvas.height = pageHeightPx
    const pageCtx = pageCanvas.getContext('2d')
    if (!pageCtx) throw new Error('canvas 2d context unavailable')

    for (let i = 0; i < pagesCount; i++) {
      const yOffset = i * pageHeightPx
      const sliceHeight = Math.min(pageHeightPx, fullImgHeight - yOffset)

      // Очищаем и копируем нужный фрагмент
      pageCtx.fillStyle = '#ffffff'
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      pageCtx.drawImage(
        fullCanvas,
        0, yOffset, fullImgWidth, sliceHeight,
        0, 0, fullImgWidth, sliceHeight,
      )

      const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.92)

      if (i > 0) pdf.addPage()
      pdf.addImage(pageDataUrl, 'JPEG', 0, 0, A4_WIDTH_PX, sliceHeight)
    }

    // 5. Отдаём пользователю через нативный PDF-viewer
    const pdfBlob = pdf.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } finally {
    iframe.remove()
  }
}
