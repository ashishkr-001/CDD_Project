import { useEffect, useMemo, useState } from 'react'
import AddChargerForm from './AddChargerForm.jsx'
import PasswordInput from './components/PasswordInput.jsx'
import { API_BASE, apiRequest } from './api.js'
import './HostApp.css'

const STORAGE_KEY = 'spotshare.hostName'
const SHOW_BOOKINGS = 8

const money = (n) => `₹${Number(n || 0).toFixed(2).replace(/\.00$/, '')}`
const when = (iso) => String(iso).slice(0, 16).replace('T', ' ')
const cleanName = (text) => text.split(/\s+/).filter(Boolean).join(' ').slice(0, 80)

function readStoredName() {
  try {
    return cleanName(localStorage.getItem(STORAGE_KEY) || '')
  } catch {
    return ''
  }
}

function storeName(name) {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function useResource(path, token) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    setState((prev) => ({ ...prev, status: 'loading', error: '' }))
    apiRequest(path, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: '' }))
      .catch((err) => {
        if (err?.name !== 'AbortError') setState({ status: 'error', data: null, error: err.message })
      })
    return () => controller.abort()
  }, [path, token])
  return state
}

function Loading({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.85rem' }}>
      <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '8px' }} />
      <div>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '14px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{message}</span>
      <button type="button" className="btn-host-action" onClick={onRetry} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
        Try again
      </button>
    </div>
  )
}

const HOST_USERS_KEY = 'spotshare_registered_hosts'

const INITIAL_HOSTS = [
  { name: 'Ashish', email: 'ashish@gmail.com', password: 'password123' },
  { name: 'Demo Host', email: 'demohost@gmail.com', password: 'password123' },
]

function getStoredHosts() {
  try {
    const raw = localStorage.getItem(HOST_USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasAshish = parsed.some(
          (h) => h.name.toLowerCase() === 'ashish' || (h.email && h.email.toLowerCase() === 'ashish@gmail.com')
        )
        const list = [...parsed]
        if (!hasAshish) list.unshift(INITIAL_HOSTS[0])
        return list
      }
    }
  } catch {
    /* ignore */
  }
  return INITIAL_HOSTS
}

function saveStoredHosts(hosts) {
  try {
    localStorage.setItem(HOST_USERS_KEY, JSON.stringify(hosts))
  } catch {
    /* ignore */
  }
}

function IdentityGate({ onSubmit, onBack }) {
  const [tab, setTab] = useState('login')
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const [googleModalOpen, setGoogleModalOpen] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [showCustomEmail, setShowCustomEmail] = useState(false)

  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotHost, setForgotHost] = useState(null)
  const [forgotBusy, setForgotBusy] = useState(false)
  const [resetCodeInput, setResetCodeInput] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const switchTab = (nextTab) => {
    setTab(nextTab)
    setError('')
    setSuccess('')
  }

  const openForgotPassword = () => {
    setForgotIdentifier(loginName)
    setForgotHost(null)
    setForgotBusy(false)
    setResetCodeInput('')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setError('')
    setSuccess('')
    setTab('forgot')
  }

  const handleForgotLookup = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const identifier = cleanName(forgotIdentifier)
    if (!identifier) return setError('Please enter your host name or email address.')
    const hosts = getStoredHosts()
    const idLower = identifier.toLowerCase()
    const matched = hosts.find(
      (h) => h.name.toLowerCase() === idLower || (h.email && h.email.toLowerCase() === idLower)
    )
    if (!matched) {
      return setError(`No host account found for "${identifier}". Please verify or register a new host account.`)
    }
    if (!matched.email) {
      return setError('This host account does not have an email address saved.')
    }
    setForgotBusy(true)
    try {
      const res = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: matched.email, name: matched.name, role: 'host' },
      })
      setForgotHost(matched)
      setResetCodeInput('')
      setResetNewPassword('')
      setResetConfirmPassword('')
      setSuccess(res?.message || `Verification code sent to ${matched.email}. Check your Gmail inbox.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setForgotBusy(false)
    }
  }

  const handleResendCode = async () => {
    if (!forgotHost || forgotBusy) return
    setError('')
    setForgotBusy(true)
    try {
      const res = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotHost.email, name: forgotHost.name, role: 'host' },
      })
      setSuccess(res?.message || `New verification code sent to ${forgotHost.email}. Check your Gmail inbox.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setForgotBusy(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setError('')
    const code = resetCodeInput.trim()
    const nextPassword = resetNewPassword.trim()
    const confirm = resetConfirmPassword.trim()

    if (!/^\d{6}$/.test(code)) {
      return setError('Please enter the 6-digit verification code from your Gmail.')
    }
    if (nextPassword.length < 4) {
      return setError('New password must be at least 4 characters long.')
    }
    if (nextPassword !== confirm) {
      return setError('Passwords do not match. Please re-enter.')
    }

    setForgotBusy(true)
    try {
      await apiRequest('/api/auth/verify-reset-code', {
        method: 'POST',
        body: { email: forgotHost.email, code, role: 'host' },
      })
      const hosts = getStoredHosts()
      const updated = hosts.map((h) => {
        const sameEmail =
          forgotHost.email &&
          h.email &&
          h.email.toLowerCase() === forgotHost.email.toLowerCase()
        const sameName = h.name.toLowerCase() === forgotHost.name.toLowerCase()
        return sameEmail || sameName ? { ...h, password: nextPassword } : h
      })
      saveStoredHosts(updated)

      setLoginName(forgotHost.email || forgotHost.name)
      setLoginPassword('')
      setForgotHost(null)
      setResetCodeInput('')
      setResetNewPassword('')
      setResetConfirmPassword('')
      setTab('login')
      setSuccess('Password updated successfully! Sign in with your new password.')
    } catch (err) {
      setError(err.message)
    } finally {
      setForgotBusy(false)
    }
  }

  const handleLogin = (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const identifier = cleanName(loginName)
    const password = loginPassword.trim()

    if (!identifier) return setError('Please enter your host name or email address.')
    if (!password) return setError('Please enter your password.')

    const hosts = getStoredHosts()
    const idLower = identifier.toLowerCase()
    const matched = hosts.find(
      (h) => h.name.toLowerCase() === idLower || (h.email && h.email.toLowerCase() === idLower)
    )

    if (!matched) {
      return setError(`No host account found for "${identifier}". Please switch to "Register an account" to create your host account.`)
    }

    if (matched.password && matched.password !== password) {
      return setError('Incorrect password. Please verify and try again.')
    }

    onSubmit(matched.name)
  }

  const handleRegister = (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const name = cleanName(regName)
    const email = regEmail.trim().toLowerCase()
    const password = regPassword.trim()
    const confirm = regConfirm.trim()

    if (!name) return setError('Please enter a host or business name.')
    if (name.length < 2) return setError('Host name must be at least 2 characters long.')
    if (email && (!email.includes('@') || !email.includes('.'))) {
      return setError('Please enter a valid email address.')
    }
    if (!password) return setError('Please create a password.')
    if (password.length < 4) return setError('Password must be at least 4 characters long.')
    if (password !== confirm) return setError('Passwords do not match. Please re-enter.')

    const hosts = getStoredHosts()
    const nameExists = hosts.some((h) => h.name.toLowerCase() === name.toLowerCase())
    if (nameExists) {
      return setError(`An account with name "${name}" already exists. Please sign in instead.`)
    }
    if (email) {
      const emailExists = hosts.some((h) => h.email && h.email.toLowerCase() === email)
      if (emailExists) {
        return setError(`An account with email "${email}" already exists. Please sign in instead.`)
      }
    }

    const newHost = { name, email, password }
    const updated = [...hosts, newHost]
    saveStoredHosts(updated)

    onSubmit(newHost.name)
  }

  const handleGoogleSelect = (name, email) => {
    setGoogleModalOpen(false)
    setShowCustomEmail(false)
    setCustomEmail('')
    const hosts = getStoredHosts()
    const emailLower = email.toLowerCase()
    let matched = hosts.find(
      (h) => (h.email && h.email.toLowerCase() === emailLower) || h.name.toLowerCase() === name.toLowerCase()
    )
    if (!matched) {
      matched = { name, email: emailLower, password: 'google_oauth' }
      saveStoredHosts([...hosts, matched])
    }
    onSubmit(matched.name)
  }

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault()
    const email = customEmail.trim().toLowerCase()
    if (!email.includes('@') || !email.includes('.')) {
      alert('Please enter a valid email address (e.g. name@example.com)')
      return
    }
    const namePart = email.split('@')[0]
    const cleanNameStr = namePart.charAt(0).toUpperCase() + namePart.slice(1)
    handleGoogleSelect(cleanNameStr, email)
  }

  return (
    <div className="host-gate-wrapper">
      <div className="host-gate-card">
        <div className="gate-badge-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <h1>
          {tab === 'login'
            ? 'SpotShare Host Hub'
            : tab === 'register'
              ? 'Register Host Account'
              : 'Reset Host Password'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 20px' }}>
          {tab === 'login'
            ? 'Sign in to manage your private or commercial EV charging bays'
            : tab === 'register'
              ? 'Create your host profile to list and monetize EV charging stations'
              : 'Verify your host account to set a new password'}
        </p>

        {tab !== 'forgot' && (
          <>
            {/* Continue with Google / Email */}
            <button
              type="button"
              className="btn-google-signin"
              onClick={() => setGoogleModalOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="host-auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'left', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'left', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        {tab === 'login' ? (
          /* Host Login Form */
          <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Name or Email
              </label>
              <input
                type="text"
                className="host-input"
                value={loginName}
                maxLength={100}
                autoFocus
                onChange={(e) => { setLoginName(e.target.value); setError('') }}
                placeholder="Enter host name or email"
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="host-login-password" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                  Password
                </label>
                <button
                  type="button"
                  className="host-auth-link"
                  style={{ fontSize: '0.78rem', fontWeight: 600 }}
                  onClick={openForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                id="host-login-password"
                className="host-input"
                value={loginPassword}
                maxLength={100}
                onChange={(e) => { setLoginPassword(e.target.value); setError('') }}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-post-charger" style={{ marginTop: '4px' }}>
              Sign In to Host Dashboard →
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '6px 0 0' }}>
              New host?
              <button
                type="button"
                className="host-auth-link"
                onClick={() => switchTab('register')}
              >
                Register an account
              </button>
            </p>
          </form>
        ) : tab === 'register' ? (
          /* Host Register Form */
          <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Host / Business Name
              </label>
              <input
                type="text"
                className="host-input"
                value={regName}
                maxLength={80}
                autoFocus
                onChange={(e) => { setRegName(e.target.value); setError('') }}
                placeholder="e.g. GreenBay Mysore"
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                className="host-input"
                value={regEmail}
                maxLength={100}
                onChange={(e) => { setRegEmail(e.target.value); setError('') }}
                placeholder="e.g. host@example.com"
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label htmlFor="host-reg-password" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Create Password
              </label>
              <PasswordInput
                id="host-reg-password"
                className="host-input"
                value={regPassword}
                maxLength={100}
                onChange={(e) => { setRegPassword(e.target.value); setError('') }}
                placeholder="At least 4 characters"
                autoComplete="new-password"
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label htmlFor="host-reg-confirm" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Confirm Password
              </label>
              <PasswordInput
                id="host-reg-confirm"
                className="host-input"
                value={regConfirm}
                maxLength={100}
                onChange={(e) => { setRegConfirm(e.target.value); setError('') }}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn-post-charger" style={{ marginTop: '4px' }}>
              Register Host Account &amp; Enter →
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '6px 0 0' }}>
              Already registered?
              <button
                type="button"
                className="host-auth-link"
                onClick={() => switchTab('login')}
              >
                Sign in here
              </button>
            </p>
          </form>
        ) : !forgotHost ? (
          /* Host Forgot Password Step 1: Lookup */
          <form onSubmit={handleForgotLookup} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Host Name or Email
              </label>
              <input
                type="text"
                className="host-input"
                value={forgotIdentifier}
                maxLength={100}
                autoFocus
                onChange={(e) => { setForgotIdentifier(e.target.value); setError('') }}
                placeholder="Enter host name or email"
              />
            </div>

            <button type="submit" className="btn-post-charger" style={{ marginTop: '4px' }} disabled={forgotBusy}>
              {forgotBusy ? 'Sending code to email...' : 'Send Verification Code'}
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '6px 0 0' }}>
              Remember your password?
              <button
                type="button"
                className="host-auth-link"
                onClick={() => switchTab('login')}
              >
                Back to Sign In
              </button>
            </p>
          </form>
        ) : (
          /* Host Forgot Password Step 2: Verify Code & Set Password */
          <form onSubmit={handleResetPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="host-reset-code" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  className="host-auth-link"
                  style={{ fontSize: '0.78rem', fontWeight: 600 }}
                  onClick={handleResendCode}
                  disabled={forgotBusy}
                >
                  {forgotBusy ? 'Sending...' : 'Resend code'}
                </button>
              </div>
              <input
                id="host-reset-code"
                type="text"
                inputMode="numeric"
                className="host-input"
                value={resetCodeInput}
                maxLength={6}
                autoFocus
                onChange={(e) => { setResetCodeInput(e.target.value); setError('') }}
                placeholder="Enter 6-digit code"
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label htmlFor="host-reset-password" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                New Password
              </label>
              <PasswordInput
                id="host-reset-password"
                className="host-input"
                value={resetNewPassword}
                maxLength={100}
                onChange={(e) => { setResetNewPassword(e.target.value); setError('') }}
                placeholder="At least 4 characters"
                autoComplete="new-password"
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label htmlFor="host-reset-confirm" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <PasswordInput
                id="host-reset-confirm"
                className="host-input"
                value={resetConfirmPassword}
                maxLength={100}
                onChange={(e) => { setResetConfirmPassword(e.target.value); setError('') }}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn-post-charger" style={{ marginTop: '4px' }} disabled={forgotBusy}>
              {forgotBusy ? 'Verifying & updating...' : 'Update Host Password →'}
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '6px 0 0' }}>
              <button
                type="button"
                className="host-auth-link"
                style={{ marginLeft: 0 }}
                onClick={() => { setForgotHost(null); setError(''); setSuccess('') }}
              >
                Use a different account
              </button>
              {' · '}
              <button
                type="button"
                className="host-auth-link"
                onClick={() => switchTab('login')}
              >
                Back to Sign In
              </button>
            </p>
          </form>
        )}

        {/* Google / Email Account Selector Modal */}
        {googleModalOpen && (
          <div className="google-modal-overlay" onClick={() => setGoogleModalOpen(false)}>
            <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="google-modal-title">Sign in with Google</h3>
              </div>
              <p className="google-modal-subtitle">Choose an account to continue to SpotShare Host Hub</p>

              <button
                type="button"
                className="google-account-item"
                onClick={() => handleGoogleSelect('Ashish', 'ashish@gmail.com')}
              >
                <div className="google-avatar">A</div>
                <div className="google-account-info">
                  <span className="google-name">Ashish Kumar</span>
                  <span className="google-email">ashish@gmail.com</span>
                </div>
              </button>

              {!showCustomEmail ? (
                <button
                  type="button"
                  className="google-account-item"
                  onClick={() => setShowCustomEmail(true)}
                  style={{ borderStyle: 'dashed' }}
                >
                  <div className="google-avatar" style={{ background: '#f1f5f9', color: '#64748b' }}>+</div>
                  <div className="google-account-info">
                    <span className="google-name">Use another Email account</span>
                    <span className="google-email">Sign in with a different email</span>
                  </div>
                </button>
              ) : (
                <form onSubmit={handleCustomGoogleSubmit} className="google-custom-input-box">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Enter Email Address
                  </label>
                  <input
                    type="email"
                    className="host-input"
                    value={customEmail}
                    autoFocus
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="e.g. yourname@example.com"
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn-post-charger" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
                      Continue
                    </button>
                    <button
                      type="button"
                      className="btn-host-action"
                      onClick={() => setShowCustomEmail(false)}
                      style={{ padding: '8px 14px', fontSize: '0.84rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <button
                  type="button"
                  className="btn-host-action"
                  onClick={() => setGoogleModalOpen(false)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            className="btn-host-action btn-host-back"
            onClick={onBack ? onBack : () => { window.location.href = '/' }}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            ← Back to Customer Marketplace
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ ownerName, onLogout }) {
  const [token, setToken] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const refresh = () => setToken((n) => n + 1)
  const owner = encodeURIComponent(ownerName)
  const spots = useResource(`/api/spots?owner_name=${owner}&sort=name`, token)
  const bookings = useResource(`/api/bookings?owner_name=${owner}`, token)
  const insights = useResource(`/api/host/insights?owner_name=${owner}`, token)

  const isClosedSpot = (s) => s.is_active === false || s.status === 'closed'

  const perSpot = useMemo(() => {
    const totals = {}
    for (const b of bookings.data || []) {
      if (b.status === 'cancelled') continue
      const t = (totals[b.spot_id] ||= { count: 0, value: 0 })
      t.count += 1
      t.value += Number(b.total_price) || 0
    }
    return totals
  }, [bookings.data])

  const confirmedBookings = useMemo(() => {
    return (bookings.data || []).filter((b) => b.status === 'confirmed' || b.status === 'checked_in')
  }, [bookings.data])

  const totalConfirmedValue = useMemo(() => {
    return confirmedBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0)
  }, [confirmedBookings])

  const activeSpotsCount = useMemo(() => {
    return (spots.data || []).filter((s) => !isClosedSpot(s)).length
  }, [spots.data])

  const closedSpotsCount = useMemo(() => {
    return (spots.data || []).filter((s) => isClosedSpot(s)).length
  }, [spots.data])

  const totalCapacity = useMemo(() => {
    return (spots.data || [])
      .filter((s) => !isClosedSpot(s))
      .reduce((acc, s) => acc + (Number(s.capacity) || 1), 0)
  }, [spots.data])

  const totalAvailableBays = useMemo(() => {
    return (spots.data || [])
      .filter((s) => !isClosedSpot(s))
      .reduce((acc, s) => acc + Number(s.available_spaces ?? s.capacity ?? 1), 0)
  }, [spots.data])

  const createSpot = async (payload) => {
    const created = await apiRequest('/api/spots', { method: 'POST', body: payload })
    refresh()
    return created
  }

  const toggleSpotStatus = async (spot) => {
    const currentlyClosed = isClosedSpot(spot)
    if (!currentlyClosed) {
      const now = new Date()
      const activeForSpot = confirmedBookings.filter(
        (b) => b.spot_id === spot.id && (!b.end_time || new Date(b.end_time) > now)
      )
      if (
        activeForSpot.length > 0 &&
        !window.confirm(
          `"${spot.name}" currently has ${activeForSpot.length} active reservation(s).\n\nTurning off the station will pause new customer bookings while keeping existing reservations intact. Close station now?`
        )
      ) {
        return
      }
    }
    setTogglingId(spot.id)
    try {
      await apiRequest(`/api/spots/${encodeURIComponent(spot.id)}/status?owner_name=${owner}`, {
        method: 'PATCH',
        body: { is_active: currentlyClosed, owner_name: ownerName },
      })
      refresh()
    } catch (err) {
      alert(`Could not update station status: ${err.message}`)
    } finally {
      setTogglingId(null)
    }
  }

  const deleteSpot = async (spotId, spotName) => {
    const label = spotName || spotId
    if (!window.confirm(`Are you sure you want to remove "${label}"?\n\nThis will remove it from the customer marketplace and cancel any pending reservations on this spot.`)) {
      return
    }
    setDeletingId(spotId)
    try {
      await apiRequest(`/api/spots/${encodeURIComponent(spotId)}?owner_name=${owner}`, {
        method: 'DELETE',
      })
      refresh()
    } catch (err) {
      alert(`Could not remove charger: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const summary = insights.data?.summary
  const rows = bookings.data || []
  const shown = showAll ? rows : rows.slice(0, SHOW_BOOKINGS)

  return (
    <div className="host-app-container">
      {/* Host Topbar */}
      <header className="host-topbar">
        <div className="host-brand">
          <div className="host-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <h1>SpotShare Host Hub</h1>
            <p>EV Charging Network &amp; Station Management</p>
          </div>
        </div>

        <div className="host-top-actions">
          <span className="host-badge-pill">
            <span className="host-badge-dot" />
            Host: {ownerName}
          </span>
          <button
            type="button"
            className="btn-host-action"
            onClick={refresh}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className="btn-host-action btn-host-logout"
            onClick={onLogout}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="host-content-wrapper">
        {/* Top 4 Performance Metric Cards */}
        <div className="host-metrics-grid">
          <div className="host-stat-card">
            <div className="host-stat-icon icon-chargers">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="host-stat-info">
              <span className="host-stat-value">{summary?.total_listings ?? activeSpotsCount}</span>
              <span className="host-stat-label">
                Active Chargers{(summary?.closed_listings ?? closedSpotsCount) > 0 ? ` · ${summary?.closed_listings ?? closedSpotsCount} Closed` : ''}
              </span>
            </div>
          </div>

          <div className="host-stat-card">
            <div className="host-stat-icon icon-bookings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="host-stat-info">
              <span className="host-stat-value">{summary?.total_bookings ?? confirmedBookings.length}</span>
              <span className="host-stat-label">Active Bookings</span>
            </div>
          </div>

          <div className="host-stat-card">
            <div className="host-stat-icon icon-revenue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 3h12" />
                <path d="M6 8h12" />
                <path d="M6 13l8.5 8" />
                <path d="M6 13h3a4 4 0 0 0 0-8" />
              </svg>
            </div>
            <div className="host-stat-info">
              <span className="host-stat-value">{money(summary?.total_revenue ?? totalConfirmedValue)}</span>
              <span className="host-stat-label">Booked Value</span>
            </div>
          </div>

          <div className="host-stat-card">
            <div className="host-stat-icon icon-bays">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22v-5" />
                <path d="M9 8V2" />
                <path d="M15 2v6" />
                <path d="M18 8H6a2 2 0 0 0-2 2v3a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3a2 2 0 0 0-2-2Z" />
              </svg>
            </div>
            <div className="host-stat-info">
              <span className="host-stat-value">
                {totalCapacity > 0 ? `${totalAvailableBays} / ${totalCapacity}` : '0 Free'}
              </span>
              <span className="host-stat-label">Available Bays</span>
            </div>
          </div>
        </div>

        {/* Main Two-Column Grid */}
        <div className="host-main-grid">
          {/* Left Column: Post a New Charger */}
          <div>
            <AddChargerForm ownerName={ownerName} onCreate={createSpot} />
          </div>

          {/* Right Column: Your Chargers & Bookings */}
          <div>
            {/* Chargers Section */}
            <div className="host-panel">
              <div className="host-panel-header">
                <div>
                  <div className="host-panel-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <h2>Your EV Chargers ({spots.data?.length ?? 0})</h2>
                  </div>
                  <p className="host-panel-subtitle">Manage, temporarily close while away, or remove your listed charging stations</p>
                </div>
              </div>

              {spots.status === 'loading' && !spots.data && <Loading label="Loading your chargers..." />}
              {spots.status === 'error' && <ErrorBox message={spots.error} onRetry={refresh} />}

              {spots.data && spots.data.length === 0 && (
                <div className="host-empty-box">
                  <div className="host-empty-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#1e293b' }}>No Chargers Listed Yet</strong>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
                    Use the form on the left to publish your first EV charging bay to SpotShare.
                  </p>
                </div>
              )}

              {spots.data && spots.data.length > 0 && (
                <div className="host-chargers-list">
                  {spots.data.map((s) => {
                    const t = perSpot[s.id] || { count: 0, value: 0 }
                    const isDeleting = deletingId === s.id
                    const isToggling = togglingId === s.id
                    const isClosed = isClosedSpot(s)
                    const statusBadgeClass = isClosed
                      ? 'status-closed'
                      : s.status === 'available'
                        ? 'status-active'
                        : 'status-busy'
                    const statusLabel = isClosed
                      ? 'Closed / Offline'
                      : s.status === 'available'
                        ? 'Active / Online'
                        : s.status === 'occupied'
                          ? 'Occupied'
                          : 'Fully Reserved'
                    return (
                      <div key={s.id} className={`charger-item-card ${isClosed ? 'charger-item-closed' : ''}`}>
                        <div className="charger-card-top">
                          <div>
                            <div className="charger-card-title-group">
                              <span className="charger-card-name">{s.name}</span>
                              <span className={`charger-status-badge ${statusBadgeClass}`}>
                                <span className={isClosed ? 'host-badge-dot-closed' : 'host-badge-dot'} />
                                {statusLabel}
                              </span>
                            </div>
                            <div className="charger-address">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{s.address}</span>
                            </div>
                          </div>
                        </div>

                        {isClosed && (
                          <div className="charger-closed-banner">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                              <line x1="12" y1="2" x2="12" y2="12" />
                            </svg>
                            <span>
                              Station is temporarily closed (out of town / offline). New customer bookings are paused until you turn it back on.
                            </span>
                          </div>
                        )}

                        {/* Specs Pill Badges */}
                        <div className="charger-specs-row">
                          <span className="spec-badge spec-badge-power">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '4px' }}>
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            {s.charger_power_kw ? `${s.charger_power_kw} kW Fast Charger` : 'Standard EV Bay'}
                          </span>
                          <span className="spec-badge spec-badge-price">
                            ₹{Number(s.price_per_hour).toFixed(0)} / hr
                          </span>
                          <span className="spec-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '4px' }}>
                              <path d="M12 22v-5" />
                              <path d="M9 8V2" />
                              <path d="M15 2v6" />
                              <path d="M18 8H6a2 2 0 0 0-2 2v3a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3a2 2 0 0 0-2-2Z" />
                            </svg>
                            {isClosed
                              ? `Closed (${s.capacity} ${s.capacity === 1 ? 'bay' : 'bays'} paused)`
                              : `${s.available_spaces} of ${s.capacity} bays free`}
                          </span>
                          {s.amenities && s.amenities.length > 0 && (
                            <span className="spec-badge">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '4px' }}>
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              {s.amenities.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </div>

                        {/* Card Action Footer */}
                        <div className="charger-card-actions">
                          <span className="charger-stats-text">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '5px', verticalAlign: '-1px' }}>
                              <line x1="18" y1="20" x2="18" y2="10" />
                              <line x1="12" y1="20" x2="12" y2="4" />
                              <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            <strong>{t.count}</strong> customer booking(s) · <strong>{money(t.value)}</strong> earned
                          </span>

                          <div className="charger-action-buttons">
                            <button
                              type="button"
                              className={`btn-toggle-charger ${isClosed ? 'btn-reopen-charger' : 'btn-close-charger'}`}
                              onClick={() => toggleSpotStatus(s)}
                              disabled={isToggling || isDeleting}
                              title={
                                isClosed
                                  ? 'Turn this station back on so customers can book it again'
                                  : 'Temporarily close/turn off this station (e.g. while out of town) without removing it'
                              }
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                                <line x1="12" y1="2" x2="12" y2="12" />
                              </svg>
                              {isToggling
                                ? (isClosed ? 'Opening...' : 'Closing...')
                                : (isClosed ? 'Turn On / Reopen' : 'Turn Off / Close')}
                            </button>

                            <button
                              type="button"
                              className="btn-remove-charger"
                              onClick={() => deleteSpot(s.id, s.name)}
                              disabled={isDeleting || isToggling}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                              {isDeleting ? 'Removing...' : 'Remove Charger'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bookings Section */}
            <div className="host-panel">
              <div className="host-panel-header">
                <div>
                  <div className="host-panel-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <h2>Bookings on Your Chargers ({rows.length})</h2>
                  </div>
                  <p className="host-panel-subtitle">Live customer reservations on your listed stations</p>
                </div>
              </div>

              {bookings.status === 'loading' && !bookings.data && <Loading label="Loading customer bookings..." />}
              {bookings.status === 'error' && <ErrorBox message={bookings.error} onRetry={refresh} />}

              {bookings.data && rows.length === 0 && (
                <div className="host-empty-box">
                  <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                    No customer bookings yet. When drivers reserve your bays, they will appear here in real-time.
                  </span>
                </div>
              )}

              {rows.length > 0 && (
                <div>
                  {shown.map((b) => (
                    <div key={b.id} className={`host-booking-item ${b.status === 'cancelled' ? 'cancelled' : ''}`}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{b.customer_name || 'Customer'}</strong>
                        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                          {b.spot_name} · {when(b.start_time)} to {when(b.end_time)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '0.92rem', color: '#059669' }}>{money(b.total_price)}</strong>
                        <p style={{ fontSize: '0.74rem', color: b.status === 'cancelled' ? '#ef4444' : '#10b981', margin: '2px 0 0', textTransform: 'capitalize' }}>
                          {b.status}
                        </p>
                      </div>
                    </div>
                  ))}

                  {rows.length > SHOW_BOOKINGS && (
                    <button
                      type="button"
                      className="btn-host-action"
                      style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}
                      onClick={() => setShowAll((v) => !v)}
                    >
                      {showAll ? 'Show Fewer' : `Show All ${rows.length} Bookings`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function HostApp({ onBack }) {
  const [ownerName, setOwnerName] = useState(readStoredName)

  const handleLogout = () => {
    storeName('')
    setOwnerName('')
    if (onBack) {
      onBack()
    } else {
      window.location.href = '/'
    }
  }

  if (!ownerName) {
    return <IdentityGate onSubmit={(name) => { storeName(name); setOwnerName(name) }} onBack={onBack} />
  }
  return <Dashboard key={ownerName} ownerName={ownerName} onLogout={handleLogout} />
}
