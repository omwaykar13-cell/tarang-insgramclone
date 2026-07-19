import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'
import Avatar from './Avatar'
import { HomeIcon, ExploreIcon, PlusIcon, MessageIcon, LogoutIcon } from './Icons'
import '../styles/sidebar.css'

export default function Sidebar() {
  const { profile } = useAuth()
  const nav = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    nav('/login')
  }

  const item = ({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/icon.svg" alt="Tarang" width={28} height={28} />
        <span className="gradient-text">Tarang</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={item} end><HomeIcon size={24} /> Home</NavLink>
        <NavLink to="/explore" className={item}><ExploreIcon size={24} /> Explore</NavLink>
        <NavLink to="/new" className={item}><PlusIcon size={24} /> Create</NavLink>
        <NavLink to="/messages" className={item}><MessageIcon size={24} /> Messages</NavLink>
        <NavLink to="/profile" className={item}>
          <Avatar url={profile?.avatar_url ?? null} alt={profile?.username ?? 'me'} size={24} />
          Profile
        </NavLink>
      </nav>
      <button className="nav-item logout" onClick={signOut}>
        <LogoutIcon size={22} /> Log out
      </button>
    </aside>
  )
}
