import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import type { StoryGroup } from '../types'
import Avatar from './Avatar'
import { CloseIcon } from './Icons'

const DURATION = 5000

export default function StoryViewer({
  groups,
  startIndex,
  onClose,
  onViewed,
}: {
  groups: StoryGroup[]
  startIndex: number
  onClose: () => void
  onViewed: () => void
}) {
  const { profile } = useAuth()
  const [groupIdx, setGroupIdx] = useState(startIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const startRef = useRef<number>(Date.now())
  const elapsedRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const group = groups[groupIdx]
  const story = group?.stories[storyIdx]

  const recordView = useCallback(async (storyId: string) => {
    if (!profile || storyId === '') return
    const { data: existing } = await supabase
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('viewer_id', profile.id)
      .maybeSingle()
    if (!existing) {
      await supabase.from('story_views').insert({ story_id: storyId, viewer_id: profile.id })
    }
  }, [profile])

  const advance = useCallback(() => {
    setStoryIdx((sIdx) => {
      if (sIdx < (groups[groupIdx]?.stories.length ?? 0) - 1) {
        return sIdx + 1
      }
      // move to next group
      if (groupIdx < groups.length - 1) {
        setGroupIdx((g) => g + 1)
        return 0
      }
      onClose()
      return sIdx
    })
  }, [groupIdx, groups, onClose])

  // tick progress
  useEffect(() => {
    setProgress(0)
    elapsedRef.current = 0
    startRef.current = Date.now()
    if (!story) return

    const tick = () => {
      if (!paused) {
        const elapsed = elapsedRef.current + (Date.now() - startRef.current)
        const p = Math.min(1, elapsed / DURATION)
        setProgress(p)
        if (p >= 1) {
          advance()
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    if (story && !story.viewed && profile && story.user_id !== profile.id) {
      recordView(story.id).then(onViewed)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [groupIdx, storyIdx])

  const pause = () => {
    if (paused) return
    elapsedRef.current += Date.now() - startRef.current
    setPaused(true)
  }
  const resume = () => {
    if (!paused) return
    startRef.current = Date.now()
    setPaused(false)
  }

  const prev = () => {
    if (storyIdx > 0) {
      setStoryIdx((s) => s - 1)
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1)
      setStoryIdx((groups[groupIdx - 1]?.stories.length ?? 1) - 1)
    }
  }

  if (!group || !story) {
    onClose()
    return null
  }

  const isMine = group.profile.id === profile?.id

  return (
    <div className="story-viewer">
      <div className="story-progress">
        {group.stories.map((_, i) => (
          <div className="progress-track" key={i}>
            <div
              className="progress-fill"
              style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <header className="story-header">
        <div className="story-header-user">
          <Avatar url={group.profile.avatar_url} alt={group.profile.username} size={36} ring />
          <div>
            <span className="story-header-name">{group.profile.username}</span>
            <span className="story-header-time">{timeAgo(story.created_at)}</span>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}><CloseIcon size={26} /></button>
      </header>

      <div className="story-media"
        onMouseDown={pause}
        onMouseUp={resume}
        onTouchStart={pause}
        onTouchEnd={resume}>
        {story.media_kind === 'video' ? (
          <video src={story.image_url} autoPlay muted loop playsInline />
        ) : (
          <img src={story.image_url} alt={story.caption ?? 'story'} referrerPolicy="no-referrer" />
        )}
        {story.caption && <div className="story-caption">{story.caption}</div>}
      </div>

      <button className="nav-tap nav-left" onClick={prev} aria-label="Previous" />
      <button className="nav-tap nav-right" onClick={advance} aria-label="Next" />

      {isMine && (
        <div className="story-viewers">
          <span>{group.stories.length} {group.stories.length === 1 ? 'story' : 'stories'}</span>
        </div>
      )}
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}
