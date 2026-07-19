import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import type { StoryGroup, StoryWithProfile } from '../types'
import Avatar from './Avatar'
import { PlusIcon } from './Icons'
import StoryViewer from './StoryViewer'
import StoryCreator from './StoryCreator'
import '../styles/stories.css'

export default function StoryBar() {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [viewIndex, setViewIndex] = useState<number | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('stories')
      .select('*, profile:profiles!stories_user_id_fkey(id, username, avatar_url, full_name, bio, is_private, created_at)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as any[]

    const meId = profile?.id
    const { data: myViews } = meId
      ? await supabase.from('story_views').select('story_id').eq('viewer_id', meId)
      : { data: [] as any[] }
    const viewedSet = new Set<string>((myViews ?? []).map((v) => v.story_id))

    const byUser = new Map<string, StoryWithProfile[]>()
    rows.forEach((r) => {
      const arr = byUser.get(r.user_id) ?? []
      arr.push({ ...r, profile: r.profile, viewed: viewedSet.has(r.id) })
      byUser.set(r.user_id, arr)
    })

    const gs: StoryGroup[] = []
    byUser.forEach((stories) => {
      if (stories.length === 0) return
      const sorted = stories.sort((a, b) => a.created_at.localeCompare(b.created_at))
      gs.push({
        profile: sorted[0].profile,
        stories: sorted,
        hasUnviewed: sorted.some((s) => !s.viewed),
      })
    })
    gs.sort((a, b) => {
      if (a.profile.id === meId) return -1
      if (b.profile.id === meId) return 1
      const aT = a.stories[a.stories.length - 1].created_at
      const bT = b.stories[b.stories.length - 1].created_at
      return bT.localeCompare(aT)
    })
    setGroups(gs)
  }

  useEffect(() => { load() }, [profile])

  const openViewer = (index: number) => setViewIndex(index)

  if (groups.length === 0 && !profile) return null

  return (
    <>
      <div className="story-bar">
        {profile && (
          <button className="story-item story-add" onClick={() => setViewIndex(-1)}>
            <div className="story-ring add-ring">
              <Avatar url={profile.avatar_url} alt={profile.username} size={56} />
              <span className="add-badge"><PlusIcon size={14} /></span>
            </div>
            <span className="story-label">Your story</span>
          </button>
        )}
        {groups.map((g, i) => (
          <button className="story-item" key={g.profile.id} onClick={() => openViewer(i)}>
            <div className={`story-ring ${g.hasUnviewed ? 'unviewed' : 'viewed'}`}>
              <Avatar url={g.profile.avatar_url} alt={g.profile.username} size={56} />
            </div>
            <span className="story-label">{g.profile.id === profile?.id ? 'Your story' : g.profile.username}</span>
          </button>
        ))}
      </div>

      {viewIndex !== null && viewIndex >= 0 && (
        <StoryViewer
          groups={groups}
          startIndex={viewIndex}
          onClose={() => setViewIndex(null)}
          onViewed={load}
        />
      )}
      {viewIndex === -1 && (
        <StoryCreator onClose={() => setViewIndex(null)} onCreated={load} />
      )}
    </>
  )
}
