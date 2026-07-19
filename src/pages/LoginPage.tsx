import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/auth.css'

export default function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    nav('/')
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/icon.svg" alt="Tarang" width={56} height={56} />
        </div>
        <h1 className="gradient-text">Tarang</h1>
        <p className="auth-sub">Share your wave</p>
        <form onSubmit={submit}>
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <input className="input" type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary auth-btn" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : 'Log in'}
          </button>
        </form>
        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
