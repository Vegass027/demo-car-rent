// ============================================================
// PDF-экспорт через прокси /api/generate-pdf → PDFShift
// На iOS Safari открывает нативный PDF-viewer, никакого blob-footer.
// ============================================================

/**
 * Отправляет HTML на серверную прокси-функцию, получает PDF
 * и открывает его в новой вкладке.
 */
export async function exportHtmlToPdf(html: string, filename: string): Promise<void> {
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename }),
  })

  if (!response.ok) {
    let details = ''
    try {
      const err = await response.json()
      details = err.details || err.error || ''
    } catch {
      details = await response.text().catch(() => '')
    }
    throw new Error(`PDF generation failed (${response.status}): ${details || 'server error'}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
