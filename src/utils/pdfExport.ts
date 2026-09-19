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
 * HTML целиком (включая <head>/<style>) грузится в iframe через srcdoc —
 * стили документа физически изолированы и не влияют на родительский UI.
 * Документ снимается одним canvas (без обрезки), потом нарезается на A4-полосы.
 */
export async function exportHtmlToPdf(html: string, filename: string): Promise<void> {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: ${A4_WIDTH_PX}px;
    height: 0;
    border: 0;
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  `
  document.body.appendChild(iframe)

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve()
      iframe.onerror = () => reject(new Error('iframe load failed'))
      iframe.srcdoc = html
    })

    const doc = iframe.contentDocument
    if (!doc) throw new Error('iframe document unavailable')

    // Ждём все картинки внутри документа (схема авто и т.п.)
    await Promise.all(
      Array.from(doc.images).map(
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

    // Высоту iframe подгоняем под РЕАЛЬНУЮ высоту контента — никакого overflow:hidden
    const contentHeight = doc.documentElement.scrollHeight
    iframe.style.height = `${contentHeight}px`

    // Один снимок всего документа целиком
    const canvas = await html2canvas(doc.body, {
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      height: contentHeight,
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    // Нарезаем canvas на страницы A4 — DOM больше не трогаем
    const pdf = new jsPDF({
      unit: 'px',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    })

    // pageHeightPx в координатах canvas: A4_HEIGHT_PX * (canvasWidth / A4_WIDTH_PX)
    // т.к. canvas масштабирован в scale раз (1.5), его ширина = A4_WIDTH_PX * 1.5
    const pageHeightPx = A4_HEIGHT_PX * (canvas.width / A4_WIDTH_PX)
    const totalPages = Math.ceil(canvas.height / pageHeightPx)

    for (let i = 0; i < totalPages; i++) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight

      const ctx = pageCanvas.getContext('2d')
      if (!ctx) continue
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(
        canvas,
        0,
        i * pageHeightPx,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      )

      if (i > 0) pdf.addPage()
      const sliceHeightInPdf = (sliceHeight / canvas.width) * A4_WIDTH_PX
      pdf.addImage(
        pageCanvas.toDataURL('image/jpeg', 0.92),
        'JPEG',
        0,
        0,
        A4_WIDTH_PX,
        sliceHeightInPdf,
      )
    }

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
    iframe.remove()
  }
}
