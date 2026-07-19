import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import type { PostWithProfile, Profile } from '../types'
import PostCard from '../components/PostCard'
import Avatar from '../components/Avatar'
import { RefreshIcon } from '../components/Icons'
import ShareModal from '../components/ShareModal'
import StoryBar from '../components/StoryBar'
import '../styles/feed.css'

export default function HomePage() {
  const { profile } = useAuth()
  const [posts, setPosts] = useState<PostWithProfile[] | null>(null)
  const [suggested, setSuggested] = useState<Profile[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [waveKey, setWaveKey] = useState(0)
  const [sharePost, setSharePost] = useState<PostWithProfile | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    const { data: follows } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', profile.id)
    const followeeIds = (follows ?? []).map((f) => f.followee_id)
    const ids = Array.from(new Set([...followeeIds, profile.id]))

    let q = supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(id, username, avatar_url, full_name, bio, is_private, created_at)')
      .order('created_at', { ascending: false })
      .limit(20)
    if (ids.length > 0) q = q.in('user_id', ids)

    const { data } = await q
    const enriched = await enrichMeta(data ?? [])
    setPosts(enriched)

    const { data: profs } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', profile.id)
      .limit(12)
    const remaining = (profs ?? []).filter((p) => !followeeIds.includes(p.id))
    setSuggested(remaining.slice(0, 5))
  }, [profile])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    setWaveKey((k) => k + 1)
    await load()
    setTimeout(() => setRefreshing(false), 900)
  }

  const follow = async (id: string) => {
    if (!profile) return
    await supabase.from('follows').insert({ follower_id: profile.id, followee_id: id })
    setSuggested((s) => s.filter((p) => p.id !== id))
  }

  if (!profile) return null

  return (
    <div className="feed">
      {waveKey > 0 && <div key={waveKey} className="sweep-wave" />}
      <div className="feed-topbar">
        <h2 className="feed-title gradient-text">Feed</h2>
        <button className={`feed-refresh ${refreshing ? 'spinning' : ''}`} onClick={onRefresh} aria-label="Refresh feed" title="Refresh feed">
          <RefreshIcon size={20} />
        </button>
      </div>

      <div className="feed-layout">
        <div className="feed-posts">
          <StoryBar />
          {posts === null ? (
            <div className="empty"><span className="spinner" /></div>
          ) : posts.length === 0 ? (
            <div className="empty">
              <h3>No posts yet</h3>
              <p>Follow people or create a post to see it here.</p>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} onShare={setSharePost} />)
          )}
        </div>

        <aside className="feed-side">
          <div className="side-card">
            <h4>Suggested for you</h4>
            {suggested.length === 0 ? (
              <p className="side-empty">You're all caught up.</p>
            ) : (
              suggested.map((p) => (
                <div className="suggest-row" key={p.id}>
                  <Avatar url={p.avatar_url} alt={p.username} size={36} />
                  <div className="suggest-meta">
                    <span className="suggest-name">{p.username}</span>
                    {p.full_name && <span className="suggest-sub">{p.full_name}</span>}
                  </div>
                  <button className="btn btn-accent suggest-btn" onClick={() => follow(p.id)}>Follow</button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} />}
    </div>
  )
}

async function enrichMeta(rows: any[]): Promise<PostWithProfile[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const { data: likes } = await supabase
    .from('likes')
    .select('post_id, user_id')
    .in('post_id', ids)
  const { data: comments } = await supabase
    .from('comments')
    .select('post_id')
    .in('post_id', ids)

  const likeMap = new Map<string, { count: number; users: string[] }>()
  ;(likes ?? []).forEach((l: any) => {
    const e = likeMap.get(l.post_id) ?? { count: 0, users: [] as string[] }
    e.count += 1
    e.users.push(l.user_id)
    likeMap.set(l.post_id, e)
  })
  const commentMap = new Map<string, number>()
  ;(comments ?? []).forEach((c: any) => {
    commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1)
  })

  const meId = (await supabase.auth.getUser()).data.user?.id

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    image_url: r.image_url,
    caption: r.caption,
    location: r.location,
    created_at: r.created_at,
    media_type: r.media_type,
    media_kind: r.media_kind,
    profile: r.profile,
    like_count: likeMap.get(r.id)?.count ?? 0,
    comment_count: commentMap.get(r.id) ?? 0,
    liked_by_me: meId ? (likeMap.get(r.id)?.users.includes(meId) ?? false) : false,
  }))
}
