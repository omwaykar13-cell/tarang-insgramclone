import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import type { PostWithProfile, Profile } from '../types'
import Avatar from './Avatar'
import { CloseIcon, SearchIcon, SendIcon } from './Icons'
import '../styles/share.css'

export default function ShareModal({
  post,
  onClose,
}: {
  post: PostWithProfile
  onClose: () => void
}) {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim().toLowerCase()
      if (q.length < 1) { setResults([]); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `${q}%`)
        .neq('id', profile?.id ?? '')
        .limit(8)
      setResults((data as Profile[]) ?? [])
    }, 180)
    return () => clearTimeout(t)
  }, [query, profile])

  const send = async () => {
    if (!profile || !selected) return
    setSending(true)
    setError('')
    try {
      const convId = await ensureConversation(profile.id, selected.id)
      await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: profile.id,
        content: note.trim() || null,
        shared_post_id: post.id,
      })
      await bumpStreak(convId)
      setDone(true)
      setTimeout(onClose, 900)
    } catch (e: any) {
      setError(e.message ?? 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <header className="share-head">
          <h3>Share</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><CloseIcon size={20} /></button>
        </header>

        {done ? (
          <div className="share-done">
            <div className="share-done-check">✓</div>
            <p>Sent to @{selected?.username}</p>
          </div>
        ) : (
          <>
            <div className="share-preview">
              <img src={post.image_url} alt="" referrerPolicy="no-referrer" />
              <div className="share-preview-meta">
                <span className="share-preview-user">@{post.profile.username}</span>
                <span className="share-preview-type">{post.media_type}</span>
              </div>
            </div>

            {!selected ? (
              <>
                <div className="share-search">
                  <SearchIcon size={18} />
                  <input
                    className="share-input"
                    placeholder="Search by username…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="share-results">
                  {results.length === 0 && query.length > 0 && (
                    <p className="share-none">No users found.</p>
                  )}
                  {results.map((p) => (
                    <button className="share-result" key={p.id} onClick={() => setSelected(p)}>
                      <Avatar url={p.avatar_url} alt={p.username} size={40} />
                      <div className="share-result-meta">
                        <span className="share-result-name">{p.username}</span>
                        {p.full_name && <span className="share-result-sub">{p.full_name}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="share-picked">
                  <Avatar url={selected.avatar_url} alt={selected.username} size={40} ring />
                  <div className="share-picked-meta">
                    <span className="share-picked-name">{selected.username}</span>
                    {selected.full_name && <span className="share-picked-sub">{selected.full_name}</span>}
                  </div>
                  <button className="link-btn" onClick={() => setSelected(null)}>Change</button>
                </div>
                <textarea
                  className="input share-note"
                  placeholder="Add a note (optional)"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && <div className="error-banner">{error}</div>}
                <button className="btn btn-primary share-send" onClick={send} disabled={sending}>
                  {sending ? <span className="spinner" /> : <><SendIcon size={18} /> Send</>}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export async function ensureConversation(a: string, b: string): Promise<string> {
  const [userA, userB] = a < b ? [a, b] : [b, a]
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle()
  if (existing) return existing.id
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_a: userA, user_b: userB })
    .select('id')
    .single()
  if (error || !data) throw new Error('Could not open conversation')
  return data.id
}

export async function bumpStreak(conversationId: string) {
  const { data: s } = await supabase
    .from('streaks')
    .select('*')
    .eq('conversation_id', conversationId)
    .maybeSingle()

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  if (!s) {
    await supabase.from('streaks').insert({
      conversation_id: conversationId,
      count: 1,
      last_activity_at: now.toISOString(),
      last_bumped_at: today,
    })
    return
  }

  const last = new Date(s.last_activity_at)
  const hoursSince = (now.getTime() - last.getTime()) / 36e5
  const lastBumped = s.last_bumped_at

  let nextCount = s.count
  if (lastBumped === today) {
    // same day — keep count
  } else if (hoursSince > 24) {
    nextCount = 1 // streak broken
  } else {
    nextCount = s.count + 1 // new day within 24h
  }

  await supabase
    .from('streaks')
    .update({
      count: nextCount,
      last_activity_at: now.toISOString(),
      last_bumped_at: today,
    })
    .eq('id', s.id)
}
