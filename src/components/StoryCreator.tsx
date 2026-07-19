import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import { CloseIcon, PlayIcon } from './Icons'

const STOCK_IMAGES = [
  'https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/36717/animals-parrot-guyana.jpg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/340835/pexels-photo-340835.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/235607/pexels-photo-235607.jpeg?auto=compress&cs=tinysrgb&w=800',
]
const STOCK_VIDEOS = [
  'https://cdn.pixabay.com/video/2022/10/30/136434-767014692_large.mp4',
  'https://cdn.pixabay.com/video/2023/08/07/175234-854706358_large.mp4',
]

export default function StoryCreator({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth()
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!profile) return
    if (!imageUrl.trim()) { setError('Pick or paste a media URL'); return }
    setBusy(true)
    setError('')
    const { error } = await supabase.from('stories').insert({
      user_id: profile.id,
      image_url: imageUrl.trim(),
      media_kind: mediaKind,
      caption: caption.trim() || null,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    onCreated()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="story-creator" onClick={(e) => e.stopPropagation()}>
        <header className="share-head">
          <h3>Add to your story</h3>
          <button className="icon-btn" onClick={onClose}><CloseIcon size={20} /></button>
        </header>
        <div className="edit-body">
          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label>Media kind</label>
            <div className="seg">
              <button type="button" className={mediaKind === 'image' ? 'seg-on' : ''} onClick={() => setMediaKind('image')}>Image</button>
              <button type="button" className={mediaKind === 'video' ? 'seg-on' : ''} onClick={() => setMediaKind('video')}>Video</button>
            </div>
          </div>

          <div className="field">
            <label>Pick a stock {mediaKind}</label>
            <div className="stock-grid">
              {(mediaKind === 'image' ? STOCK_IMAGES : STOCK_VIDEOS).map((url) => (
                <button type="button" key={url} className={`stock-tile ${imageUrl === url ? 'on' : ''}`} onClick={() => setImageUrl(url)}>
                  {mediaKind === 'image'
                    ? <img src={url} alt="" referrerPolicy="no-referrer" />
                    : <span className="stock-video"><PlayIcon size={18} /> Video</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Or paste a URL</label>
            <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div className="field">
            <label>Caption (optional)</label>
            <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption…" />
          </div>

          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Add to story'}
          </button>
          <p className="story-expiry-note">Stories disappear after 24 hours.</p>
        </div>
      </div>
    </div>
  )
}
