export function exportToCsv (filename, rows) {
  if (!rows || rows.length === 0) return
  const keys = Object.keys(rows[0])
  const escape = (value) => {
    const string = value === null || value === undefined ? '' : String(value)
    return `"${string.replace(/"/g, '""')}"`
  }
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
