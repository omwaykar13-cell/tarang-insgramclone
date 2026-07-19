import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/auth.css'

export default function SignupPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')
    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters (letters, numbers, _, .)')
      setBusy(false)
      return
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUser)
      .maybeSingle()
    if (existing) {
      setError('That username is taken')
      setBusy(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) {
      setError(error?.message ?? 'Sign up failed')
      setBusy(false)
      return
    }

    const { error: profileErr } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: cleanUser,
      full_name: fullName.trim() || null,
      birthday: birthday || null,
    })
    if (profileErr) {
      setError(profileErr.message)
      setBusy(false)
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
        <p className="auth-sub">Join the wave</p>
        <form onSubmit={submit}>
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <input className="input" placeholder="Username" value={username}
              onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="field">
            <input className="input" placeholder="Full name (optional)" value={fullName}
              onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label>Birthday</label>
            <input className="input" type="date" value={birthday}
              onChange={(e) => setBirthday(e.target.value)} />
          </div>
          <div className="field">
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <input className="input" type="password" placeholder="Password (min 6)" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary auth-btn" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
