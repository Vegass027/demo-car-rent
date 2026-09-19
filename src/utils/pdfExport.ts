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
export async function exportHtmlToPdf(html: string, filename: string): Promise<void> {
  // 1. Создаём offscreen-контейнер в текущей странице (не iframe — html2canvas
  //    не умеет корректно рендерить документ внутри iframe с srcdoc)
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -99999px;
    top: 0;
    width: ${A4_WIDTH_PX}px;
    background: white;
    z-index: -1;
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

    // Даём браузеру ещё немного времени на финальную отрисовку
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 3. html2canvas снимает контейнер
    const fullCanvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: A4_WIDTH_PX,
      logging: false,
    })

    // 4. Режем canvas на страницы A4 и собираем PDF
    const pdf = new jsPDF({
      unit: 'px',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    })

    const fullImgHeight = fullCanvas.height
    const fullImgWidth = fullCanvas.width
    const pagesCount = Math.ceil(fullImgHeight / A4_HEIGHT_PX)

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = fullImgWidth
    pageCanvas.height = A4_HEIGHT_PX
    const pageCtx = pageCanvas.getContext('2d')
    if (!pageCtx) throw new Error('canvas 2d context unavailable')

    for (let i = 0; i < pagesCount; i++) {
      const yOffset = i * A4_HEIGHT_PX
      const sliceHeight = Math.min(A4_HEIGHT_PX, fullImgHeight - yOffset)

      pageCtx.fillStyle = '#ffffff'
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      pageCtx.drawImage(
        fullCanvas,
        0,
        yOffset,
        fullImgWidth,
        sliceHeight,
        0,
        0,
        fullImgWidth,
        sliceHeight,
      )

      const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.92)

      if (i > 0) pdf.addPage()
      // Растягиваем по ширине A4, высота = пропорционально
      const sliceHeightInPdf = (sliceHeight * A4_WIDTH_PX) / fullImgWidth
      pdf.addImage(pageDataUrl, 'JPEG', 0, 0, A4_WIDTH_PX, sliceHeightInPdf)
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
