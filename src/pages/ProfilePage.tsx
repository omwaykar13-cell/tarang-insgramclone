import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import type { PostWithProfile } from '../types'
import Avatar from '../components/Avatar'
import ShareModal from '../components/ShareModal'
import { PlayIcon, SettingsIcon, CloseIcon } from '../components/Icons'
import '../styles/profile.css'

const STOCK_AVATARS = [
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=200',
]

export default function ProfilePage() {
  const { profile } = useAuth()
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [editing, setEditing] = useState(false)
  const [sharePost, setSharePost] = useState<PostWithProfile | null>(null)
  const [form, setForm] = useState({ full_name: '', bio: '', avatar_url: '', is_private: false })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(id, username, avatar_url, full_name, bio, is_private, created_at)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setPosts((data as any) ?? [])

    const { count: followerCount } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('followee_id', profile.id)
    setFollowers(followerCount ?? 0)

    const { count: followingCount } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', profile.id)
    setFollowing(followingCount ?? 0)
  }

  useEffect(() => { load() }, [profile])

  const openEdit = () => {
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? '',
      bio: profile.bio ?? '',
      avatar_url: profile.avatar_url ?? '',
      is_private: profile.is_private,
    })
    setEditing(true)
  }

  const save = async () => {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: form.full_name.trim() || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      is_private: form.is_private,
    }).eq('id', profile.id)
    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  if (!profile) return null

  return (
    <div className="profile">
      <div className="profile-head">
        <Avatar url={profile.avatar_url} alt={profile.username} size={120} ring />
        <div className="profile-info">
          <div className="profile-name-row">
            <h2>{profile.username}</h2>
            <button className="btn btn-ghost" onClick={openEdit}><SettingsIcon size={16} /> Edit</button>
          </div>
          <div className="profile-stats">
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>{followers}</strong> followers</span>
            <span><strong>{following}</strong> following</span>
          </div>
          {profile.full_name && <p className="profile-fullname">{profile.full_name}</p>}
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          {profile.is_private && <span className="privacy-badge">Private</span>}
        </div>
      </div>

      <div className="profile-grid">
        {posts.length === 0 && <div className="empty"><h3>No posts yet</h3><p>Posts you create show up here.</p></div>}
        {posts.map((p) => (
          <button className="profile-tile" key={p.id} onClick={() => setSharePost(p)}>
            <img src={p.image_url} alt="" referrerPolicy="no-referrer" />
            {p.media_kind === 'video' && <span className="tile-video"><PlayIcon size={16} /></span>}
            <span className="tile-share">Share</span>
          </button>
        ))}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <header className="share-head">
              <h3>Edit profile</h3>
              <button className="icon-btn" onClick={() => setEditing(false)}><CloseIcon size={20} /></button>
            </header>
            <div className="edit-body">
              <div className="field">
                <label>Profile photo</label>
                <div className="avatar-preview">
                  <Avatar url={form.avatar_url} alt="preview" size={72} ring />
                  <input className="input" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="Paste an image URL" />
                </div>
                <div className="avatar-picks">
                  {STOCK_AVATARS.map((url) => (
                    <button type="button" key={url} className={`avatar-pick ${form.avatar_url === url ? 'selected' : ''}`} onClick={() => setForm((f) => ({ ...f, avatar_url: url }))}>
                      <img src={url} alt="avatar" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Full name</label>
                <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <label className="check-row">
                <input type="checkbox" checked={form.is_private} onChange={(e) => setForm({ ...form, is_private: e.target.checked })} />
                Private account
              </label>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} />}
    </div>
  )
}
