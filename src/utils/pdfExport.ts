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

    // Нарезаем canvas на страницы A4 — DOM больше не трогаем.
    // hotfixes: ['px_scaling'] — фикс известного бага jsPDF, который при
    // unit:'px' + format:'a4' считал страницу ~446×631 вместо 794×1123.
    const pdf = new jsPDF({
      unit: 'px',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
      hotfixes: ['px_scaling'],
    })

    // Естественные границы страниц — координаты .page-break в документе.
    // В обычном (не print) рендере page-break-before:always НЕ действует,
    // но сам div всё равно есть — берём его координаты как точки разрыва.
    const scale = 1.5
    const bodyTop = doc.body.getBoundingClientRect().top
    const naturalBreaksCanvasPx = Array.from(
      doc.querySelectorAll<HTMLElement>('.page-break'),
    )
      .map((el) => (el.getBoundingClientRect().top - bodyTop) * scale)
      .filter((y) => y > 0 && y < canvas.height)

    // Атомы — реальные строки текста на экране, независимо от того,
    // в каком теге они лежат. getClientRects() возвращает точные
    // прямоугольники каждой визуально отрисованной строки.
    interface Rect { top: number; bottom: number }
    const collectLineRects = (root: HTMLElement, _bodyTop: number, _scale: number): Rect[] => {
      const rects: Rect[] = []
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node: Node) =>
          node.textContent && node.textContent.trim().length > 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      })
      let node: Node | null
      while ((node = walker.nextNode())) {
        const range = doc.createRange()
        range.selectNodeContents(node)
        for (const r of Array.from(range.getClientRects())) {
          if (r.height === 0) continue
          rects.push({
            top: (r.top - bodyTop) * scale,
            bottom: (r.bottom - bodyTop) * scale,
          })
        }
      }
      // Картинки — тоже нельзя резать пополам
      Array.from(root.querySelectorAll('img')).forEach((img) => {
        const r = img.getBoundingClientRect()
        rects.push({
          top: (r.top - bodyTop) * scale,
          bottom: (r.bottom - bodyTop) * scale,
        })
      })
      return rects
    }

    const atoms: Rect[] = collectLineRects(doc.body, bodyTop, scale)

    const pageHeightCanvasPx = A4_HEIGHT_PX * scale

    // Если сегмент между forced-breaks выше одной A4-страницы, режем
    // его не поровну, а по ближайшей нижней границе атома — между строк,
    // а не через букву.
    const buildPageBoundaries = (
      totalHeight: number,
      forcedBreaks: number[],
      atomRects: Rect[],
      maxPageHeight: number,
    ): number[] => {
      const forced = Array.from(new Set([0, ...forcedBreaks, totalHeight])).sort(
        (a, b) => a - b,
      )
      const boundaries: number[] = [0]

      for (let i = 1; i < forced.length; i++) {
        let cursor = forced[i - 1]
        const segmentEnd = forced[i]

        while (segmentEnd - cursor > maxPageHeight) {
          const idealCut = cursor + maxPageHeight
          const candidates = atomRects.filter(
            (a) => a.top >= cursor && a.bottom <= idealCut,
          )
          let cut = candidates.length
            ? candidates[candidates.length - 1].bottom
            : idealCut
          if (cut <= cursor) cut = idealCut
          boundaries.push(cut)
          cursor = cut
        }
        boundaries.push(segmentEnd)
      }

      return boundaries
    }

    const boundaries = buildPageBoundaries(
      canvas.height,
      naturalBreaksCanvasPx,
      atoms,
      pageHeightCanvasPx,
    )

    for (let i = 0; i < boundaries.length - 1; i++) {
      const y0 = boundaries[i]
      const sliceHeight = boundaries[i + 1] - y0
      if (sliceHeight <= 0) continue

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
        y0,
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
