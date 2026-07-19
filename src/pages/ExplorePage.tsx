import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PostWithProfile } from '../types'
import { SearchIcon, PlayIcon } from '../components/Icons'
import ShareModal from '../components/ShareModal'
import '../styles/explore.css'

export default function ExplorePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [query, setQuery] = useState('')
  const [sharePost, setSharePost] = useState<PostWithProfile | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(id, username, avatar_url, full_name, bio, is_private, created_at)')
      .order('created_at', { ascending: false })
      .limit(60)
    setPosts((data as any) ?? [])
  }

  useEffect(() => { load() }, [])

  const filtered = query.trim()
    ? posts.filter((p) => (p.caption ?? '').toLowerCase().includes(query.toLowerCase()) || p.profile.username.toLowerCase().includes(query.toLowerCase()))
    : posts

  return (
    <div className="explore">
      <h2 className="page-title gradient-text">Explore</h2>
      <div className="explore-search">
        <SearchIcon size={18} />
        <input className="explore-input" placeholder="Search posts, captions, usernames…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="explore-grid">
        {filtered.map((p) => (
          <button className="explore-tile" key={p.id} onClick={() => setSharePost(p)}>
            <img src={p.image_url} alt="" referrerPolicy="no-referrer" />
            {p.media_kind === 'video' && <span className="tile-video"><PlayIcon size={16} /></span>}
            <span className="tile-share">Share</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty"><h3>Nothing here</h3><p>Try a different search.</p></div>}
      {sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} />}
    </div>
  )
}
