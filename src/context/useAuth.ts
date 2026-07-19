import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ session: null, profile: null, loading: true })

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    return data as Profile | null
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const profile = data.session ? await loadProfile(data.session.user.id) : null
      setState({ session: data.session, profile, loading: false })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      ;(async () => {
        const profile = session ? await loadProfile(session.user.id) : null
        if (mounted) setState({ session, profile, loading: false })
      })()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  return state
}
