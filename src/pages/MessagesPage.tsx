import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import type { Profile, Message } from '../types'
import Avatar from '../components/Avatar'
import { SearchIcon, MessageIcon } from '../components/Icons'
import '../styles/messages.css'

type ConvRow = {
  id: string
  user_a: string
  user_b: string
}

export default function MessagesPage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [convs, setConvs] = useState<{ id: string; other: Profile; last?: Message | null }[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])

  const load = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('conversations')
      .select('id, user_a, user_b')
      .or(`user_a.eq.${profile.id},user_b.eq.${profile.id}`)
      .order('id', { ascending: false })
    const rows = (data ?? []) as ConvRow[]
    const otherIds = Array.from(new Set(rows.flatMap((r) => [r.user_a, r.user_b]).filter((id) => id !== profile.id)))
    if (otherIds.length === 0) { setConvs([]); return }
    const { data: profs } = await supabase.from('profiles').select('*').in('id', otherIds)
    const profMap = new Map<string, Profile>((profs ?? []).map((p) => [p.id, p as Profile]))

    const enriched = (await Promise.all(rows.map(async (r) => {
      const otherId = r.user_a === profile.id ? r.user_b : r.user_a
      const other = profMap.get(otherId)
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', r.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return { id: r.id, other, last: lastMsg as Message | null }
    }))).filter((c): c is { id: string; other: Profile; last: Message | null } => !!c.other)

    enriched.sort((a, b) => {
      const at = a.last?.created_at ?? ''
      const bt = b.last?.created_at ?? ''
      return bt.localeCompare(at)
    })
    setConvs(enriched)
  }

  useEffect(() => { load() }, [profile])

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim().toLowerCase()
      if (q.length < 1) { setResults([]); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `${q}%`)
        .neq('id', profile?.id ?? '')
        .limit(6)
      setResults((data as Profile[]) ?? [])
    }, 180)
    return () => clearTimeout(t)
  }, [query, profile])

  const startWith = (p: Profile) => {
    nav(`/messages/${p.username}`)
  }

  return (
    <div className="messages">
      <h2 className="page-title gradient-text">Messages</h2>
      <div className="msg-search">
        <SearchIcon size={18} />
        <input className="msg-input" placeholder="Search by username to start a chat…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {query.trim() && (
        <div className="msg-results">
          {results.length === 0 && <p className="share-none">No users found.</p>}
          {results.map((p) => (
            <button className="msg-result" key={p.id} onClick={() => startWith(p)}>
              <Avatar url={p.avatar_url} alt={p.username} size={40} />
              <div className="share-result-meta">
                <span className="share-result-name">{p.username}</span>
                {p.full_name && <span className="share-result-sub">{p.full_name}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="conv-list">
        {convs.length === 0 && !query.trim() && (
          <div className="empty">
            <MessageIcon size={36} />
            <h3>No conversations yet</h3>
            <p>Search a username above to start chatting.</p>
          </div>
        )}
        {convs.map((c) => (
          <Link to={`/messages/${c.other.username}`} className="conv-row" key={c.id}>
            <Avatar url={c.other.avatar_url} alt={c.other.username} size={48} ring />
            <div className="conv-meta">
              <span className="conv-name">{c.other.username}</span>
              <span className="conv-last">
                {c.last?.content ?? (c.last?.shared_post_id ? 'Shared a post' : 'Say hi 👋')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
