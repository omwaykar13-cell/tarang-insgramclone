import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import NewPostPage from './pages/NewPostPage'
import ProfilePage from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'
import ConversationPage from './pages/ConversationPage'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth">
        <span className="spinner" style={{ borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/new" element={<NewPostPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:username" element={<ConversationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
