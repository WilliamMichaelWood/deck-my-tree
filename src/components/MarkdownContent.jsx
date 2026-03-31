function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

function parseTableRow(line) {
  return line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
}

function isTableSeparator(line) {
  return /^\|?[\s\-|:]+\|?$/.test(line) && line.includes('-')
}

export default function MarkdownContent({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i++; continue }

    // Table: look for a pipe-delimited block (header | separator | rows)
    if (line.trim().startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      // Find separator row
      const sepIdx = tableLines.findIndex(isTableSeparator)
      if (sepIdx > 0) {
        const headers = parseTableRow(tableLines[0])
        const bodyRows = tableLines.slice(sepIdx + 1).filter(l => !isTableSeparator(l))
        elements.push(
          <div key={`tbl-${i}`} className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>{headers.map((h, hi) => <th key={hi}>{renderInline(h)}</th>)}</tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {parseTableRow(row).map((cell, ci) => <td key={ci}>{renderInline(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      } else {
        // Malformed table — render each line as a paragraph
        tableLines.forEach((tl, ti) => {
          elements.push(<p key={`tp-${i}-${ti}`} className="md-p">{renderInline(tl)}</p>)
        })
      }
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="md-h4">{line.slice(4)}</h4>)
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="md-h3">{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="md-h2">{line.slice(2)}</h2>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="md-ul">{items}</ul>)
      continue
    } else if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="md-ol">{items}</ol>)
      continue
    } else {
      elements.push(<p key={i} className="md-p">{renderInline(line)}</p>)
    }
    i++
  }

  return <div className="markdown">{elements}</div>
}
