import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { PostWithProfile } from '../types'
import { supabase } from '../lib/supabase'
import Avatar from './Avatar'
import { HeartIcon, CommentIcon, ShareIcon, PlayIcon } from './Icons'
import '../styles/post.css'

export default function PostCard({
  post,
  onShare,
}: {
  post: PostWithProfile
  onShare?: (post: PostWithProfile) => void
}) {
  const [liked, setLiked] = useState(post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [ripples, setRipples] = useState<number[]>([])
  const rippleId = useRef(0)

  const toggleLike = async () => {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    if (next) {
      const id = ++rippleId.current
      setRipples((r) => [...r, id])
      setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 700)
    }
    try {
      if (next) {
        await supabase.from('likes').insert({ post_id: post.id })
      } else {
        await supabase.from('likes').delete().match({ post_id: post.id })
      }
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
    }
  }

  return (
    <article className="post-card">
      <header className="post-head">
        <Link to={`/messages/${post.profile.username}`} className="post-user">
          <Avatar url={post.profile.avatar_url} alt={post.profile.username} size={36} ring />
          <div className="post-user-meta">
            <span className="post-username">{post.profile.username}</span>
            {post.location && <span className="post-location">{post.location}</span>}
          </div>
        </Link>
      </header>

      <div className="post-image">
        {post.media_kind === 'video' ? (
          <video src={post.image_url} controls loop playsInline />
        ) : (
          <img src={post.image_url} alt={post.caption ?? 'post'} referrerPolicy="no-referrer" />
        )}
        {post.media_type === 'reel' && (
          <span className="reel-badge"><PlayIcon size={14} /> Reel</span>
        )}
      </div>

      <div className="post-actions">
        <button className={`act ${liked ? 'liked' : ''} ripple-host wave-bob`} onClick={toggleLike} aria-label="Like">
          <HeartIcon size={26} filled={liked} />
          {ripples.map((id) => (
            <span key={id} className="ripple-wave" />
          ))}
        </button>
        <button className="act" aria-label="Comment"><CommentIcon size={24} /></button>
        {onShare && (
          <button className="act" onClick={() => onShare(post)} aria-label="Share">
            <ShareIcon size={22} />
          </button>
        )}
      </div>

      <div className="post-meta">
        <strong>{likeCount}</strong> likes
        {post.caption && (
          <p className="post-caption">
            <Link to={`/messages/${post.profile.username}`} className="post-cap-user">{post.profile.username}</Link>{' '}
            {post.caption}
          </p>
        )}
      </div>
    </article>
  )
}
