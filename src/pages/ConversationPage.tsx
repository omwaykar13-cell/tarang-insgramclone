import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import type { Profile, Message, PostWithProfile, Streak, Call } from '../types'
import Avatar from '../components/Avatar'
import { BackIcon, SendIcon, PhoneIcon, PhoneOffIcon, FlameIcon, ShareIcon, PlayIcon } from '../components/Icons'
import { ensureConversation, bumpStreak } from '../components/ShareModal'
import '../styles/conversation.css'

export default function ConversationPage() {
  const { username } = useParams()
  const { profile } = useAuth()
  const nav = useNavigate()
  const [other, setOther] = useState<Profile | null>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [streak, setStreak] = useState<Streak | null>(null)
  const [call, setCall] = useState<Call | null>(null)
  const [callTimer, setCallTimer] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [myPosts, setMyPosts] = useState<PostWithProfile[]>([])
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)

  // Resolve the other user by username
  useEffect(() => {
    if (!username) return
    supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle()
      .then(({ data }) => {
        setOther(data as Profile | null)
      })
  }, [username])

  // Ensure conversation exists
  useEffect(() => {
    if (!profile || !other || other.id === profile.id) return
    ensureConversation(profile.id, other.id).then(setConvId).catch(() => setError('Could not open conversation'))
  }, [profile, other])

  const loadMessages = useCallback(async () => {
    if (!convId) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    const msgs = (data ?? []) as Message[]
    // hydrate shared posts
    const sharedIds = msgs.map((m) => m.shared_post_id).filter(Boolean) as string[]
    let postMap = new Map<string, PostWithProfile>()
    if (sharedIds.length > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('*, profile:profiles!posts_user_id_fkey(id, username, avatar_url, full_name, bio, is_private, created_at)')
        .in('id', sharedIds)
      ;(posts ?? []).forEach((p: any) => postMap.set(p.id, p))
    }
    setMessages(msgs.map((m) => ({ ...m, shared_post: m.shared_post_id ? postMap.get(m.shared_post_id) ?? null : null })))
  }, [convId])

  const loadStreak = useCallback(async () => {
    if (!convId) return
    const { data } = await supabase
      .from('streaks')
      .select('*')
      .eq('conversation_id', convId)
      .maybeSingle()
    setStreak(data as Streak | null)
  }, [convId])

  useEffect(() => {
    if (!convId) return
    loadMessages()
    loadStreak()
    const interval = setInterval(() => { loadMessages(); loadStreak() }, 4000)
    return () => clearInterval(interval)
  }, [convId, loadMessages, loadStreak])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!profile || !convId || !text.trim()) return
    const content = text.trim()
    setText('')
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: profile.id,
      content,
    })
    await bumpStreak(convId)
    loadMessages()
    loadStreak()
  }

  const loadMyPosts = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(id, username, avatar_url, full_name, bio, is_private, created_at)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setMyPosts((data as any) ?? [])
  }

  const sharePost = async (post: PostWithProfile) => {
    if (!profile || !convId) return
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: profile.id,
      shared_post_id: post.id,
    })
    await bumpStreak(convId)
    setShareOpen(false)
    loadMessages()
    loadStreak()
  }

  const startCall = async () => {
    if (!profile || !convId) return
    const { data } = await supabase
      .from('calls')
      .insert({ conversation_id: convId, caller_id: profile.id, status: 'ringing' })
      .select('*')
      .single()
    setCall(data as Call)
    setCallTimer(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => setCallTimer((t) => t + 1), 1000)
  }

  const endCall = async (status: 'ended' | 'declined') => {
    if (!call) return
    await supabase
      .from('calls')
      .update({ status, ended_at: new Date().toISOString() })
      .eq('id', call.id)
    setCall(null)
    if (timerRef.current) clearInterval(timerRef.current)
    setCallTimer(0)
  }

  if (!profile) return null

  if (!other) {
    return (
      <div className="conv">
        <div className="empty"><span className="spinner" /></div>
      </div>
    )
  }

  if (other.id === profile.id) {
    return (
      <div className="conv">
        <div className="empty"><h3>That's you</h3><p>You can't message yourself.</p></div>
      </div>
    )
  }

  return (
    <div className="conv">
      <header className="conv-head">
        <button className="icon-btn" onClick={() => nav('/messages')}><BackIcon size={22} /></button>
        <Link to={`/messages/${other.username}`} className="conv-head-user">
          <Avatar url={other.avatar_url} alt={other.username} size={40} ring />
          <div className="conv-head-meta">
            <span className="conv-head-name">{other.username}</span>
            {other.full_name && <span className="conv-head-sub">{other.full_name}</span>}
          </div>
        </Link>
        <div className="conv-head-actions">
          {streak && streak.count > 0 && (
            <span className="streak-pill" title="Chat streak">
              <FlameIcon size={16} /> {streak.count}
            </span>
          )}
          <button className="icon-btn call-btn" onClick={startCall} title="Call"><PhoneIcon size={20} /></button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="conv-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="conv-hint">
            <p>No messages yet. Say hi or share a post to start your streak with @{other.username}.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === profile.id
          return (
            <div className={`bubble-row ${mine ? 'mine' : ''}`} key={m.id}>
              {!mine && <Avatar url={other.avatar_url} alt={other.username} size={28} />}
              <div className={`bubble ${mine ? 'mine' : ''}`}>
                {m.shared_post && (
                  <Link to={`/messages/${m.shared_post.profile.username}`} className="shared-card">
                    <img src={m.shared_post.image_url} alt="" referrerPolicy="no-referrer" />
                    <div className="shared-meta">
                      <span className="shared-user">@{m.shared_post.profile.username}</span>
                      <span className="shared-kind">
                        {m.shared_post.media_kind === 'video' && <PlayIcon size={11} />} {m.shared_post.media_type}
                      </span>
                    </div>
                  </Link>
                )}
                {m.content && <p className="bubble-text">{m.content}</p>}
                <span className="bubble-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="conv-input-row">
        <button className="icon-btn share-toggle" onClick={() => { setShareOpen((v) => !v); loadMyPosts() }} title="Share a post">
          <ShareIcon size={20} />
        </button>
        <input
          className="conv-input"
          placeholder="Message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
        />
        <button className="icon-btn send-btn" onClick={send} disabled={!text.trim()}><SendIcon size={20} /></button>
      </div>

      {shareOpen && (
        <div className="share-tray">
          <div className="share-tray-head">Pick a post or reel to share</div>
          <div className="share-tray-grid">
            {myPosts.length === 0 && <p className="share-none">You have no posts to share yet.</p>}
            {myPosts.map((p) => (
              <button className="share-tray-tile" key={p.id} onClick={() => sharePost(p)}>
                <img src={p.image_url} alt="" referrerPolicy="no-referrer" />
                {p.media_kind === 'video' && <span className="tile-video"><PlayIcon size={14} /></span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {call && (
        <div className="call-overlay">
          <div className="call-card">
            <Avatar url={other.avatar_url} alt={other.username} size={96} ring />
            <h3>{other.username}</h3>
            <p className="call-status">
              {call.status === 'ringing' ? 'Ringing…' : 'In call'} · {fmt(callTimer)}
            </p>
            <div className="call-actions">
              <button className="call-btn-end" onClick={() => endCall('ended')}>
                <PhoneOffIcon size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
}
