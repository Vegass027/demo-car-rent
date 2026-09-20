// ============================================================
// Прокси-функция PDFShift
// Принимает HTML от клиента, отправляет в PDFShift, возвращает PDF.
// Актуальная авторизация: X-API-Key (см. docs.pdfshift.io).
// ============================================================

interface RequestBody {
  html?: string
  filename?: string
}

export default async function handler(
  req: { method?: string; body?: RequestBody },
  res: {
    status: (code: number) => { json: (body: unknown) => void; send: (body: unknown) => void }
    setHeader: (key: string, value: string) => void
  },
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { html, filename } = req.body || {}

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'html is required' })
  }

  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) {
    console.error('PDFSHIFT_API_KEY is not set in environment')
    return res.status(500).json({ error: 'Server misconfigured: PDFSHIFT_API_KEY missing' })
  }

  const sandbox = process.env.PDFSHIFT_SANDBOX === 'true'

  try {
    const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        source: html,
        sandbox,
        // В шаблонах уже есть @page { size: A4; margin: 1.5cm } —
        // PDFShift уважает его через use_print: true
        use_print: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PDFShift error:', response.status, errorText)
      return res.status(502).json({
        error: 'PDF generation failed',
        status: response.status,
        details: errorText,
      })
    }

    const pdfBuffer = await response.arrayBuffer()
    const safeFilename = (filename || 'document.pdf').replace(/[^\wа-яА-ЯёЁ.\-]/g, '_')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(Buffer.from(pdfBuffer))
  } catch (err) {
    console.error('PDF proxy error:', err)
    return res.status(500).json({ error: 'Internal error generating PDF' })
  }
}
