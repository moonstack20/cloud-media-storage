import { useState, useEffect } from 'react'
import mammoth from 'mammoth'
import * as tagsApi from '../api/tags'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export default function PreviewModal({ file, onClose }) {
  const [preview, setPreview] = useState(null)
  const [docxHtml, setDocxHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setDocxHtml('')

    tagsApi.getPreview(file.id)
      .then(async (res) => {
        if (cancelled) return
        setPreview(res.data)

        if (res.data.previewable && res.data.mime_type === DOCX_MIME) {
          const fileRes = await fetch(res.data.preview_url)
          const arrayBuffer = await fileRes.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer })
          if (!cancelled) setDocxHtml(result.value)
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load preview.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [file.id])

  return (
    <div className="fixed inset-0 bg-[#1B2A41]/60 flex items-center justify-center z-50 px-6">
      <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-start p-6 border-b border-[#1B2A41]/10">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Preview</p>
            <h2 className="font-[var(--font-display)] text-xl text-[#1B2A41] truncate max-w-lg">{file.file_name}</h2>
          </div>
          <button onClick={onClose} className="text-[#1B2A41]/50 hover:text-[#1B2A41] text-xl leading-none">x</button>
        </div>

        <div className="p-6 overflow-auto flex-1 flex items-center justify-center">
          {loading && (
            <p className="font-mono text-sm text-[#1B2A41]/50">Loading preview...</p>
          )}

          {error && (
            <p className="text-[#A63D40] text-sm">{error}</p>
          )}

          {preview && !preview.previewable && (
            <div className="text-center">
              <p className="text-[#1B2A41]/60 mb-2">This file type can't be previewed.</p>
              <p className="font-mono text-xs text-[#1B2A41]/40">{preview.mime_type || 'Unknown type'}</p>
            </div>
          )}

          {preview && preview.previewable && preview.mime_type && preview.mime_type.startsWith('image/') && (
            <img
              src={preview.preview_url}
              alt={file.file_name}
              className="max-w-full max-h-[65vh] object-contain rounded-sm"
            />
          )}

          {preview && preview.previewable && preview.mime_type === 'application/pdf' && (
            <iframe
              src={preview.preview_url}
              title={file.file_name}
              className="w-full h-[65vh] border-0"
            />
          )}

          {preview && preview.previewable && preview.mime_type === DOCX_MIME && (
            docxHtml ? (
              <div
                className="w-full max-h-[65vh] overflow-y-auto text-left text-[#1B2A41] prose prose-sm bg-white p-6 rounded-sm"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            ) : (
              <p className="font-mono text-sm text-[#1B2A41]/50">Rendering document...</p>
            )
          )}
        </div>
      </div>
    </div>
  )
}
