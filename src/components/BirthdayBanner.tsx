import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { CloseIcon } from './Icons'
import '../styles/birthday.css'

const SEEN_KEY = 'bday-seen-'

export default function BirthdayBanner() {
  const { profile } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!profile || !profile.birthday) return
    const today = new Date()
    const [m, d] = profile.birthday.slice(5).split('-').map(Number)
    const isBirthday = today.getMonth() + 1 === m && today.getDate() === d
    if (!isBirthday) return
    const key = SEEN_KEY + profile.id + '-' + today.toISOString().slice(0, 10)
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setShow(true)
  }, [profile])

  if (!show || !profile) return null

  const name = profile.full_name?.trim() || profile.username

  return (
    <div className="bday-overlay" role="dialog" aria-label="Birthday wish">
      <div className="bday-card">
        <button className="bday-close" onClick={() => setShow(false)} aria-label="Close">
          <CloseIcon size={20} />
        </button>

        <div className="bday-confetti" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="confetti-piece" style={{ '--i': i } as any} />
          ))}
        </div>

        <div className="bday-cake" aria-hidden="true">
          <span className="candle" />
          <span className="cake-top" />
          <span className="cake-mid" />
          <span className="cake-base" />
        </div>

        <h1 className="bday-title">Happy Birthday, {name}!</h1>
        <p className="bday-message">
          Wishing you a day filled with laughter, love, and unforgettable moments.
          May this year bring you closer to everything you've been dreaming of.
        </p>
        <p className="bday-precious">
          Thank you for making the world more precious with your presence.
        </p>

        <div className="bday-owner">
          <div className="bday-owner-mark">A note from the founder</div>
          <p>
            "{name}, on your special day I want you to know how grateful we are
            that you're part of our community. Your presence here makes it
            brighter, warmer, and more alive. Here's to you, to the joy you
            carry, and to another wonderful trip around the sun."
          </p>
          <span className="bday-owner-sig">— Tarang, Founder of Lumagram</span>
        </div>

        <button className="btn btn-primary bday-cta" onClick={() => setShow(false)}>
          Celebrate
        </button>
      </div>
    </div>
  )
}
