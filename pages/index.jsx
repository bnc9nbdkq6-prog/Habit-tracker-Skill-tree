'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import LoginPage from '../components/LoginPage'
import dynamic from 'next/dynamic'

// Load AppCore without SSR (it uses browser APIs)
const AppCore = dynamic(() => import('../AppCore'), { ssr: false })

export default function Home() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Still checking auth
  if (session === undefined) {
    return (
      <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#4f8ef7', animation: 'pulse 1s infinite' }} />
      </div>
    )
  }

  // Not logged in
  if (!session) {
    return <LoginPage onLogin={() => {}} />
  }

  // Logged in — show the app
  return <AppCore />
}
