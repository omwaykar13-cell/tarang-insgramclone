import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import { PlayIcon } from '../components/Icons'
import '../styles/newpost.css'

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

export default function NewPostPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [mediaType, setMediaType] = useState<'post' | 'reel'>('post')
  const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!imageUrl.trim()) { setError('Pick or paste a media URL'); return }
    setError('')
    setBusy(true)
    const { error } = await supabase.from('posts').insert({
      user_id: profile.id,
      image_url: imageUrl.trim(),
      caption: caption.trim() || null,
      location: location.trim() || null,
      media_type: mediaType,
      media_kind: mediaKind,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    nav('/')
  }

  return (
    <div className="newpost">
      <h2 className="page-title gradient-text">Create</h2>
      <form onSubmit={submit} className="newpost-form">
        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label>Type</label>
          <div className="seg">
            <button type="button" className={mediaType === 'post' ? 'seg-on' : ''} onClick={() => setMediaType('post')}>Post</button>
            <button type="button" className={mediaType === 'reel' ? 'seg-on' : ''} onClick={() => setMediaType('reel')}>Reel</button>
          </div>
        </div>

        <div className="field">
          <label>Media kind</label>
          <div className="seg">
            <button type="button" className={mediaKind === 'image' ? 'seg-on' : ''} onClick={() => setMediaKind('image')}>Image</button>
            <button type="button" className={mediaKind === 'video' ? 'seg-on' : ''} onClick={() => setMediaKind('video')}>Video</button>
          </div>
        </div>

        <div className="field">
          <label>{mediaKind === 'image' ? 'Pick a stock photo' : 'Pick a stock video'}</label>
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
          <label>Caption</label>
          <textarea className="input" rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption…" />
        </div>

        <div className="field">
          <label>Location (optional)</label>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where was this?" />
        </div>

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : `Share ${mediaType}`}
        </button>
      </form>
    </div>
  )
}
