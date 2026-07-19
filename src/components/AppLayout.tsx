import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BirthdayBanner from './BirthdayBanner'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
      <BirthdayBanner />
    </div>
  )
}
