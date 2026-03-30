import { useState, useRef } from 'react'
import { streamChat } from '../lib/stream'
import MarkdownContent from './MarkdownContent'

const PROMPT = `You are a personal holiday stylist. Study this specific photo carefully before responding — look at the actual tree shape (full/sparse/narrow/wide), the real colors already on the tree, the existing ornaments and decorations visible, the tree type (real/artificial, needle type), and the lighting conditions in the room.

Give exactly 5 bullet points about THIS tree — not a generic tree. Each bullet must reference something you can actually see in the image: name specific colors, describe the actual shape, call out existing ornaments by what they look like, note the real gaps or problem areas visible. If the tree already has decorations, your advice should build on or contrast with what is already there.

Write like a stylist texting a friend — casual, direct, 1–2 complete sentences per bullet. No headers. No generic advice that could apply to any tree. Every sentence must be complete.`

export default function TreeAdvisor() {
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const processFile = (file) => {
    if (!file?.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, or WebP).')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setImage({ preview: reader.result, base64: reader.result.split(',')[1], mediaType: file.type })
      setResult('')
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleAnalyze = async () => {
    if (!image) return
    setLoading(true)
    setResult('')
    setError('')

    try {
      await streamChat({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
        maxTokens: 1000,
        onText: (text) => setResult(prev => prev + text),
      })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>🌲 Tree Advisor</h2>
        <p>Upload a photo of your Christmas tree and your stylist will craft a personalized decoration plan — complete with ornament counts and clock-position placement guidance.</p>
      </div>

      <div
        className={`upload-zone${dragging ? ' drag-over' : ''}${image ? ' has-image' : ''}`}
        onClick={() => !image && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {image ? (
          <img src={image.preview} alt="Your tree" className="tree-preview" />
        ) : (
          <div className="upload-prompt">
            <span className="upload-icon">📸</span>
            <p>Drop your tree photo here or <span className="upload-link">click to browse</span></p>
            <span className="upload-hint">JPG · PNG · WebP</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => processFile(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>

      {image && (
        <div className="action-row">
          <button className="btn-secondary" onClick={() => { setImage(null); setResult('') }}>
            Remove Photo
          </button>
          <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? <><span className="spin">✦</span> Analyzing…</> : '✨ Analyze My Tree'}
          </button>
        </div>
      )}

      {error && <div className="error-card">⚠️ {error}</div>}

      {(result || loading) && (
        <div className="result-card">
          <div className="result-header">
            <span>🎄 Your Personalized Decoration Plan</span>
            {loading && <span className="streaming-badge">Generating…</span>}
          </div>
          <div className="result-body">
            <MarkdownContent text={result} />
            {loading && <span className="cursor">▌</span>}
          </div>
        </div>
      )}
    </div>
  )
}
