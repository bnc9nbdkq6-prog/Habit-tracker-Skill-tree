'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const F = "'JetBrains Mono', monospace"

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handle = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else onLogin()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setSuccess('Account aangemaakt. Check je e-mail om te bevestigen.')
      }
    } finally { setLoading(false) }
  }

  const iSt = {
    width: '100%', background: 'none', border: 'none',
    borderBottom: '1px solid #252525', color: '#efefef',
    fontFamily: F, fontSize: '14px', padding: '8px 0',
    outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <div style={{ width: '100%', maxWidth: '340px', padding: '0 28px' }}>
        <div style={{ fontSize: '9px', color: '#333', letterSpacing: '.25em', textTransform: 'uppercase', marginBottom: '52px', textAlign: 'center' }}>
          Mijn Systeem
        </div>

        <div style={{ fontSize: '9px', color: '#464646', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '28px' }}>
          {mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '9px', color: '#464646', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '4px' }}>E-mail</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            style={iSt} autoFocus />
        </div>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '9px', color: '#464646', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Wachtwoord</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            style={iSt} />
        </div>

        {error && <div style={{ fontSize: '10px', color: '#e05555', marginBottom: '14px', letterSpacing: '.04em' }}>{error}</div>}
        {success && <div style={{ fontSize: '10px', color: '#55a86e', marginBottom: '14px', lineHeight: '1.6', letterSpacing: '.04em' }}>{success}</div>}

        <button onClick={handle} disabled={loading}
          style={{ width: '100%', padding: '11px', background: '#4f8ef7', border: 'none', borderRadius: '2px', color: '#fff', fontFamily: F, fontSize: '11px', cursor: loading ? 'default' : 'pointer', letterSpacing: '.1em', opacity: loading ? 0.6 : 1, marginBottom: '16px' }}>
          {loading ? '...' : mode === 'login' ? 'Inloggen' : 'Aanmaken'}
        </button>

        <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
          style={{ background: 'none', border: 'none', color: '#464646', fontFamily: F, fontSize: '10px', cursor: 'pointer', letterSpacing: '.06em', padding: 0 }}>
          {mode === 'login' ? 'Nog geen account? Aanmaken →' : '← Terug naar inloggen'}
        </button>
      </div>
    </div>
  )
}
