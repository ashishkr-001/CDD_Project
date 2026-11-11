import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FilterBar from './components/FilterBar.jsx'
import SpotCard, { isPrivateEvSpot } from './components/SpotCard.jsx'
import BookingModal from './components/BookingModal.jsx'
import ParkingMap from './components/ParkingMap.jsx'
import SmartInsights from './components/SmartInsights.jsx'
import SpotShareLogo from './components/SpotShareLogo.jsx'
import PasswordInput from './components/PasswordInput.jsx'
import AuthTopBar from './components/AuthTopBar.jsx'
import HostApp from './HostApp.jsx'
import LandingPage from './components/LandingPage.jsx'

/* Timezone convention: all timestamps are naive local time (Asia/Kolkata),
   ISO 8601 without offset, e.g. 2026-10-29T10:00:00. Intervals are [start, end). */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000')

const DEFAULT_LOCATION = {
  latitude: 12.2958,
  longitude: 76.6394,
  label: 'Mysuru, Karnataka',
}

const DEFAULT_FILTERS = {
  query: '',
  maxDistanceKm: 20,
  maxPrice: 200,
  availableOnly: false,
  vehicleType: 'all',
  chargerType: 'all',
  connectorType: 'all',
  ownerType: 'all',
  minPower: 0,
  sort: 'distance',
}

const FALLBACK_SPOTS = [
  // 8 Parking Spaces (matching user's screenshot)
  {
    id: 'spot101',
    name: 'City Centre Parking',
    address: 'Devaraja Market, Mysuru',
    latitude: 12.3085,
    longitude: 76.6527,
    price_per_hour: 30,
    vehicle_types: ['car', 'bike', 'van'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 15,
    available_spaces: 15,
    status: 'available',
    rating: 4.6,
    amenities: ['Covered', 'CCTV', 'Security 24/7'],
    image_url: '/images/spots/spot101.jpg',
  },
  {
    id: 'spot102',
    name: 'Palace North Gate Parking',
    address: 'Mysuru Palace, Mysuru',
    latitude: 12.3068,
    longitude: 76.6540,
    price_per_hour: 35,
    vehicle_types: ['car', 'bike', 'van'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 20,
    available_spaces: 20,
    status: 'available',
    rating: 4.4,
    amenities: ['Open', 'Security 24/7', 'CCTV'],
    image_url: '/images/spots/spot102.jpg',
  },
  {
    id: 'spot103',
    name: 'Railway Station Parking',
    address: 'Station Road, Mysuru',
    latitude: 12.3135,
    longitude: 76.6428,
    price_per_hour: 20,
    vehicle_types: ['car', 'bike'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 30,
    available_spaces: 30,
    status: 'available',
    rating: 4.3,
    amenities: ['Covered', 'CCTV', 'Lighting'],
    image_url: '/images/spots/spot103.jpg',
  },
  {
    id: 'spot104',
    name: 'Devaraja Market Lot',
    address: 'Sayyaji Rao Rd, Mysuru',
    latitude: 12.3095,
    longitude: 76.6515,
    price_per_hour: 25,
    vehicle_types: ['car', 'bike'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 10,
    available_spaces: 10,
    status: 'available',
    rating: 4.1,
    amenities: ['CCTV', 'Attendant'],
    image_url: '/images/spots/spot104.jpg',
  },
  {
    id: 'spot105',
    name: 'Zoo Visitors Multi-Level Lot',
    address: 'Zoo Road, Mysuru',
    latitude: 12.3010,
    longitude: 76.6652,
    price_per_hour: 30,
    vehicle_types: ['car', 'bike', 'van'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 35,
    available_spaces: 35,
    status: 'available',
    rating: 4.5,
    amenities: ['Covered', 'Lighting', 'Restrooms'],
    image_url: '/images/spots/spot105.jpg',
  },
  {
    id: 'spot106',
    name: 'Chamundi Hill Base Lot',
    address: 'Hill base, Mysuru',
    latitude: 12.2755,
    longitude: 76.6690,
    price_per_hour: 20,
    vehicle_types: ['car', 'bike'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 25,
    available_spaces: 25,
    status: 'available',
    rating: 4.2,
    amenities: ['Open', 'Lighting', 'Security Guard'],
    image_url: '/images/spots/spot106.jpg',
  },
  {
    id: 'spot107',
    name: 'Gokulam Shared Driveway',
    address: 'Gokulam, Mysuru',
    latitude: 12.3215,
    longitude: 76.6340,
    price_per_hour: 25,
    vehicle_types: ['car', 'bike'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 4,
    available_spaces: 4,
    status: 'available',
    rating: 4.7,
    amenities: ['Covered', 'CCTV'],
    image_url: '/images/spots/spot107.jpg',
  },
  {
    id: 'spot108',
    name: 'Old Town Micro Lot',
    address: 'Old Town, Mysuru',
    latitude: 12.3040,
    longitude: 76.6490,
    price_per_hour: 35,
    vehicle_types: ['car'],
    ev_charging: false,
    charger_power_kw: null,
    capacity: 6,
    available_spaces: 5,
    status: 'available',
    rating: 4.0,
    amenities: ['CCTV', 'Security 24/7'],
    image_url: '/images/spots/spot108.jpg',
  },

  // 8 EV Charging Hubs (matching user's screenshot)
  {
    id: 'spot201',
    name: 'GreenHome EV Charger',
    address: 'Vijayanagar, Mysuru',
    latitude: 12.3330,
    longitude: 76.6160,
    price_per_hour: 15,
    vehicle_types: ['car', 'bike'],
    ev_charging: true,
    charger_power_kw: 7.4,
    capacity: 2,
    available_spaces: 1,
    status: 'available',
    rating: 4.8,
    amenities: ['AC 7.4 kW', 'Type 2', 'Home Charger', 'Private'],
    image_url: '/images/spots/spot201.jpg',
  },
  {
    id: 'spot202',
    name: 'Palace Road EV Hub',
    address: 'Mysuru Palace, Mysuru',
    latitude: 12.3050,
    longitude: 76.6550,
    price_per_hour: 22,
    vehicle_types: ['car'],
    ev_charging: true,
    charger_power_kw: 22,
    capacity: 4,
    available_spaces: 2,
    status: 'available',
    rating: 4.3,
    amenities: ['AC 22 kW', 'DC 50 kW', 'Type 2', 'CCS2'],
    image_url: '/images/spots/spot202.jpg',
  },
  {
    id: 'spot203',
    name: 'Tata Power Charging Station',
    address: 'Sayyaji Rao Rd, Mysuru',
    latitude: 12.3120,
    longitude: 76.6490,
    price_per_hour: 18,
    vehicle_types: ['car'],
    ev_charging: true,
    charger_power_kw: 22,
    capacity: 4,
    available_spaces: 3,
    status: 'available',
    rating: 4.6,
    amenities: ['AC 22 kW', 'DC 50 kW', 'Type 2', 'CCS2'],
    image_url: '/images/spots/spot203.jpg',
  },
  {
    id: 'spot204',
    name: 'Hebbal Tech Park EV Bays',
    address: 'Hebbal, Mysuru',
    latitude: 12.3520,
    longitude: 76.6180,
    price_per_hour: 16,
    vehicle_types: ['car'],
    ev_charging: true,
    charger_power_kw: 11,
    capacity: 6,
    available_spaces: 6,
    status: 'available',
    rating: 4.5,
    amenities: ['AC 11 kW', 'Type 2', 'CCTV', 'Security guard'],
    image_url: '/images/spots/spot204.jpg',
  },
  {
    id: 'spot205',
    name: 'Vijayanagar Fast Charge Point',
    address: 'Vijayanagar 2nd Stage, Mysuru',
    latitude: 12.3360,
    longitude: 76.6140,
    price_per_hour: 20,
    vehicle_types: ['car', 'bike'],
    ev_charging: true,
    charger_power_kw: 22,
    capacity: 4,
    available_spaces: 4,
    status: 'available',
    rating: 4.7,
    amenities: ['AC 22 kW', 'DC 50 kW', 'Type 2', 'CCS2', 'Private Owner'],
    image_url: '/images/spots/spot205.jpg',
  },
  {
    id: 'spot206',
    name: 'Zeon Charging Station',
    address: 'Bangalore-Mysuru Expy, Mysuru',
    latitude: 12.3480,
    longitude: 76.6620,
    price_per_hour: 21,
    vehicle_types: ['car'],
    ev_charging: true,
    charger_power_kw: 50,
    capacity: 6,
    available_spaces: 5,
    status: 'available',
    rating: 4.4,
    amenities: ['DC 50 kW', 'CCS2', 'Lighting', 'Restrooms'],
    image_url: '/images/spots/spot206.jpg',
  },
  {
    id: 'spot207',
    name: 'Jain Community EV Plaza',
    address: 'Jayalakshmipuram, Mysuru',
    latitude: 12.3190,
    longitude: 76.6320,
    price_per_hour: 14,
    vehicle_types: ['car', 'bike'],
    ev_charging: true,
    charger_power_kw: 7.4,
    capacity: 2,
    available_spaces: 2,
    status: 'available',
    rating: 4.9,
    amenities: ['AC 7.4 kW', 'Type 2', 'Home Charger', 'Private'],
    image_url: '/images/spots/spot207.jpg',
  },
  {
    id: 'spot208',
    name: 'KRS Road EV QuickCharge',
    address: 'KRS Road, Mysuru',
    latitude: 12.3380,
    longitude: 76.6310,
    price_per_hour: 19,
    vehicle_types: ['car'],
    ev_charging: true,
    charger_power_kw: 22,
    capacity: 4,
    available_spaces: 3,
    status: 'available',
    rating: 4.2,
    amenities: ['AC 22 kW', 'DC 50 kW', 'Type 2', 'CCS2'],
    image_url: '/images/spots/spot208.jpg',
  },
]

// Initial demo credentials
const INITIAL_REGISTERED_USERS = [
  {
    name: 'Ashish Kumar',
    email: 'ashish@example.com',
    password: 'password123',
    vehicle: 'car',
  },
]

function getStoredUsers() {
  try {
    const raw = localStorage.getItem('spotshare_registered_users')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter((u) => u.email !== 'aryan@example.com')
        const hasAshish = filtered.some((u) => u.email === 'ashish@example.com')
        if (!hasAshish) {
          filtered.unshift(INITIAL_REGISTERED_USERS[0])
        }
        return filtered
      }
    }
  } catch {
    /* ignore */
  }
  return INITIAL_REGISTERED_USERS
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem('spotshare_registered_users', JSON.stringify(users))
  } catch {
    /* ignore */
  }
}

/* ---------- helpers ---------- */

function extractError(data, status) {
  const d = data?.detail ?? data?.message
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    return d.map((e) => `${(e.loc || []).slice(1).join('.')}: ${e.msg}`).join('; ')
  }
  return `Request failed (HTTP ${status})`
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error(`Cannot reach the server at ${API_BASE}. Is the backend running?`)
  }
  if (res.status === 204) return null
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(extractError(data, res.status))
  return data
}

const asList = (data, key) =>
  Array.isArray(data) ? data : data?.[key] ?? data?.items ?? []

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `₹${Number(n).toFixed(2).replace(/\.00$/, '')}`
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeBooking(b) {
  const start = b.start_time
  const end = b.end_time
  let hours = b.duration_hours ?? (typeof b.duration === 'number' ? b.duration : null)
  if (hours == null && start && end) {
    const ms = new Date(end) - new Date(start)
    if (!Number.isNaN(ms)) hours = ms / 3600000
  }
  return {
    id: b.id ?? b.booking_id,
    spotId: b.spot_id,
    spotName: b.spot_name,
    customerName: b.customer_name ?? b.customerName ?? '',
    start,
    end,
    duration:
      hours != null
        ? `${+Number(hours).toFixed(2)} h`
        : typeof b.duration === 'string'
          ? b.duration
          : '—',
    total: b.total_price ?? b.total,
    status: b.status ?? 'confirmed',
    createdAt: b.created_at,
    cancelledAt: b.cancelled_at,
    vehicleType: b.vehicle_type,
    requiresEv: b.requires_ev_charging,
    emailSent: b.email_sent ?? null,
    emailStatus: b.email_status ?? null,
  }
}

/* ---------- Auth Screen (White / Light Theme) ---------- */

function AuthScreen({ onLogin, initialTab = 'login', onBackToHome = null, isExiting = false }) {
  const [tab, setTab] = useState(initialTab || 'login')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regVehicle, setRegVehicle] = useState('car')

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [googleModalOpen, setGoogleModalOpen] = useState(false)
  const [showCustomEmail, setShowCustomEmail] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [googleError, setGoogleError] = useState('')

  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotAccount, setForgotAccount] = useState(null)
  const [forgotBusy, setForgotBusy] = useState(false)
  const [resetCodeInput, setResetCodeInput] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  const handleRegister = (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const name = regName.trim()
    const email = regEmail.trim().toLowerCase()
    const password = regPassword.trim()
    const confirm = regConfirm.trim()

    if (!name) return setError('Please enter your full name.')
    if (!email || !email.includes('@')) return setError('Please enter a valid email address.')
    if (password.length < 4) return setError('Password must be at least 4 characters long.')
    if (password !== confirm) return setError('Passwords do not match. Please re-enter.')

    const users = getStoredUsers()
    const exists = users.find(
      (u) => u.email.toLowerCase() === email || u.name.toLowerCase() === name.toLowerCase()
    )

    if (exists) {
      setError('An account with this email/name already exists. Please login.')
      return
    }

    const newUser = { name, email, password, vehicle: regVehicle }
    saveStoredUsers([...users, newUser])

    setSuccessMsg('Account registered successfully! Please sign in with your credentials below.')
    setLoginIdentifier(email)
    setLoginPassword(password)
    setRegConfirm('')
    setTab('login')
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const identifier = loginIdentifier.trim().toLowerCase()
    const password = loginPassword.trim()

    if (!identifier) return setError('Please enter your email or name.')
    if (!password) return setError('Please enter your password.')

    const users = getStoredUsers()
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        u.name.toLowerCase() === identifier
    )

    if (!user) {
      setError('No account found with this email/name. Please register first.')
      return
    }

    if (user.password && user.password !== password) {
      setError('Incorrect password. Please verify and try again.')
      return
    }

    onLogin(user)
  }

  const handleDemoLogin = (demo) => {
    const users = getStoredUsers()
    let user = users.find((u) => u.email === demo.email)
    if (!user) {
      user = demo
      saveStoredUsers([...users, user])
    }
    onLogin(user)
  }

  const handleGoogleSelect = (name, email) => {
    setGoogleModalOpen(false)
    setShowCustomEmail(false)
    setCustomEmail('')
    setGoogleError('')
    const users = getStoredUsers()
    const emailLower = email.toLowerCase()
    let matched = users.find(
      (u) => (u.email && u.email.toLowerCase() === emailLower) || u.name.toLowerCase() === name.toLowerCase()
    )
    if (!matched) {
      matched = { name, email: emailLower, password: 'google_oauth', vehicle: 'car' }
      saveStoredUsers([...users, matched])
    }
    onLogin(matched)
  }

  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault()
    setGoogleError('')
    const email = customEmail.trim().toLowerCase()
    if (!email.includes('@') || !email.includes('.')) {
      setGoogleError('Please enter a valid email address (e.g. name@example.com).')
      return
    }
    const namePart = email.split('@')[0]
    const cleanNameStr =
      namePart
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Customer'
    handleGoogleSelect(cleanNameStr, email)
  }

  const closeGoogleModal = () => {
    setGoogleModalOpen(false)
    setShowCustomEmail(false)
    setCustomEmail('')
    setGoogleError('')
  }

  const openForgotPassword = () => {
    setForgotIdentifier(loginIdentifier)
    setForgotAccount(null)
    setForgotBusy(false)
    setResetCodeInput('')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setError('')
    setSuccessMsg('')
    setTab('forgot')
  }

  const handleForgotLookup = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    const identifier = forgotIdentifier.trim().toLowerCase()
    if (!identifier) {
      return setError('Please enter your registered email or name.')
    }
    const users = getStoredUsers()
    const matched = users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === identifier) ||
        u.name.toLowerCase() === identifier
    )
    if (!matched) {
      return setError(`No account found for "${forgotIdentifier.trim()}". Please verify or register an account.`)
    }
    if (!matched.email) {
      return setError('This account does not have an email address saved.')
    }
    setForgotBusy(true)
    try {
      const res = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: matched.email, name: matched.name, role: 'customer' },
      })
      setForgotAccount(matched)
      setResetCodeInput('')
      setResetNewPassword('')
      setResetConfirmPassword('')
      setSuccessMsg(res?.message || `Verification code sent to ${matched.email}. Check your Gmail inbox.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setForgotBusy(false)
    }
  }

  const handleResendCode = async () => {
    if (!forgotAccount || forgotBusy) return
    setError('')
    setForgotBusy(true)
    try {
      const res = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotAccount.email, name: forgotAccount.name, role: 'customer' },
      })
      setSuccessMsg(res?.message || `New verification code sent to ${forgotAccount.email}. Check your Gmail inbox.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setForgotBusy(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
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
        body: { email: forgotAccount.email, code, role: 'customer' },
      })
      const users = getStoredUsers()
      const updated = users.map((u) => {
        const sameEmail =
          forgotAccount.email &&
          u.email &&
          u.email.toLowerCase() === forgotAccount.email.toLowerCase()
        const sameName = u.name.toLowerCase() === forgotAccount.name.toLowerCase()
        return sameEmail || sameName ? { ...u, password: nextPassword } : u
      })
      saveStoredUsers(updated)

      setLoginIdentifier(forgotAccount.email || forgotAccount.name)
      setLoginPassword('')
      setForgotAccount(null)
      setResetCodeInput('')
      setResetNewPassword('')
      setResetConfirmPassword('')
      setTab('login')
      setSuccessMsg('Password updated successfully! Sign in with your new password.')
    } catch (err) {
      setError(err.message)
    } finally {
      setForgotBusy(false)
    }
  }

  useEffect(() => {
    if (!googleModalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeGoogleModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [googleModalOpen])

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab])

  if (tab === 'host') {
    return (
      <HostApp
        onBack={() => setTab('login')}
        onBackToHome={onBackToHome}
        isExiting={isExiting}
      />
    )
  }

  return (
    <div className={`auth-page-shell ${isExiting ? 'is-leaving' : ''}`}>
      <AuthTopBar
        mode="customer"
        onSwitchMode={() => { setTab('host'); setError(''); setSuccessMsg('') }}
        onBackToHome={onBackToHome}
      />
      <div className="auth-wrap">
        <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrap">
            <SpotShareLogo size={52} category="parking" />
          </div>
          <h2>
            <span className="brand-text-spot">Spot</span>
            <span className="brand-text-share">Share</span>
          </h2>
          <p className="muted small">Mysuru Parking &amp; EV Charging Marketplace</p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' || tab === 'register' || tab === 'forgot' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccessMsg('') }}
          >
            Customer Login
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'host' ? 'active' : ''}`}
            style={{ color: '#059669', fontWeight: 'bold' }}
            onClick={() => { setTab('host') }}
          >
            Host / Owner
          </button>
        </div>

        {tab !== 'forgot' && (
          <>
            {/* Continue with Google */}
            <button
              type="button"
              className="auth-google-btn"
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

            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        {successMsg && <p className="alert alert-success" role="status">{successMsg}</p>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} noValidate>
            <label className="field">
              <span>Registered Email or Name</span>
              <input
                type="text"
                placeholder="Enter your email or name"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />
            </label>
            <div className="field">
              <div className="auth-field-row">
                <label htmlFor="customer-login-password">Password</label>
                <button
                  type="button"
                  className="customer-auth-link"
                  style={{ fontSize: '0.78rem', fontWeight: 600 }}
                  onClick={openForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                id="customer-login-password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="alert alert-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Sign In
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '12px 0 0', textAlign: 'center' }}>
              New customer?
              <button
                type="button"
                className="customer-auth-link"
                onClick={() => { setTab('register'); setError(''); setSuccessMsg('') }}
              >
                Register an account
              </button>
            </p>
          </form>
        ) : tab === 'register' ? (
          <form onSubmit={handleRegister} noValidate>
            <label className="field">
              <span>Full Name</span>
              <input
                type="text"
                placeholder="Enter your full name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Email Address</span>
              <input
                type="email"
                placeholder="e.g. name@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Primary Vehicle</span>
              <select value={regVehicle} onChange={(e) => setRegVehicle(e.target.value)}>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
              </select>
            </label>
            <div className="field">
              <label htmlFor="customer-reg-password">Password</label>
              <PasswordInput
                id="customer-reg-password"
                placeholder="At least 4 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label htmlFor="customer-reg-confirm">Confirm Password</label>
              <PasswordInput
                id="customer-reg-confirm"
                placeholder="Re-enter password"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="alert alert-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Create Account
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '12px 0 0', textAlign: 'center' }}>
              Already registered?
              <button
                type="button"
                className="customer-auth-link"
                onClick={() => { setTab('login'); setError(''); setSuccessMsg('') }}
              >
                Sign in here
              </button>
            </p>
          </form>
        ) : !forgotAccount ? (
          <form onSubmit={handleForgotLookup} noValidate>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.02rem', color: '#0f172a' }}>Reset Password</h3>
            <p className="muted small" style={{ margin: '0 0 14px' }}>
              Enter your registered email or name to generate a verification code.
            </p>
            <label className="field">
              <span>Registered Email or Name</span>
              <input
                type="text"
                placeholder="Enter your registered email or name"
                value={forgotIdentifier}
                autoFocus
                onChange={(e) => { setForgotIdentifier(e.target.value); setError('') }}
                required
              />
            </label>

            {error && <p className="alert alert-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={forgotBusy}>
              {forgotBusy ? 'Sending code to email…' : 'Send Verification Code'}
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '12px 0 0', textAlign: 'center' }}>
              Remember your password?
              <button
                type="button"
                className="customer-auth-link"
                onClick={() => { setTab('login'); setError(''); setSuccessMsg('') }}
              >
                Back to Sign In
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} noValidate>
            <div className="field">
              <div className="auth-field-row">
                <label htmlFor="customer-reset-code">6-Digit Verification Code</label>
                <button
                  type="button"
                  className="customer-auth-link"
                  style={{ fontSize: '0.78rem', fontWeight: 600 }}
                  onClick={handleResendCode}
                  disabled={forgotBusy}
                >
                  {forgotBusy ? 'Sending…' : 'Resend code'}
                </button>
              </div>
              <input
                id="customer-reset-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={resetCodeInput}
                autoFocus
                onChange={(e) => { setResetCodeInput(e.target.value); setError('') }}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="customer-reset-password">New Password</label>
              <PasswordInput
                id="customer-reset-password"
                placeholder="At least 4 characters"
                value={resetNewPassword}
                onChange={(e) => { setResetNewPassword(e.target.value); setError('') }}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="field">
              <label htmlFor="customer-reset-confirm">Confirm New Password</label>
              <PasswordInput
                id="customer-reset-confirm"
                placeholder="Re-enter new password"
                value={resetConfirmPassword}
                onChange={(e) => { setResetConfirmPassword(e.target.value); setError('') }}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="alert alert-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={forgotBusy}>
              {forgotBusy ? 'Verifying & updating…' : 'Update Password'}
            </button>

            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '12px 0 0', textAlign: 'center' }}>
              <button
                type="button"
                className="customer-auth-link"
                onClick={() => { setForgotAccount(null); setError(''); setSuccessMsg('') }}
              >
                Use a different account
              </button>
              {' · '}
              <button
                type="button"
                className="customer-auth-link"
                onClick={() => { setTab('login'); setError(''); setSuccessMsg('') }}
              >
                Back to Sign In
              </button>
            </p>
          </form>
        )}

        {tab === 'login' && (
          <div className="demo-chips" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                handleDemoLogin({
                  name: 'Ashish Kumar',
                  email: 'ashish@example.com',
                  password: 'password123',
                  vehicle: 'car',
                })
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Quick Demo Sign-In: Ashish Kumar
            </button>
          </div>
        )}

        {/* Google Account Selector Modal */}
        {googleModalOpen && (
          <div className="auth-google-modal-overlay" onClick={closeGoogleModal}>
            <div className="auth-google-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="customer-google-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 id="customer-google-title" className="auth-google-modal-title">Sign in with Google</h3>
              </div>
              <p className="auth-google-modal-subtitle">Choose an account to continue to SpotShare</p>

              <button
                type="button"
                className="auth-google-account-item"
                onClick={() => handleGoogleSelect('Ashish Kumar', 'ashish@example.com')}
              >
                <div className="auth-google-avatar">A</div>
                <div className="auth-google-account-info">
                  <span className="auth-google-name">Ashish Kumar</span>
                  <span className="auth-google-email">ashish@example.com</span>
                </div>
              </button>

              {!showCustomEmail ? (
                <button
                  type="button"
                  className="auth-google-account-item"
                  onClick={() => { setShowCustomEmail(true); setGoogleError('') }}
                  style={{ borderStyle: 'dashed' }}
                >
                  <div className="auth-google-avatar" style={{ background: '#f1f5f9', color: '#64748b' }}>+</div>
                  <div className="auth-google-account-info">
                    <span className="auth-google-name">Use another Email account</span>
                    <span className="auth-google-email">Sign in with a different email</span>
                  </div>
                </button>
              ) : (
                <form onSubmit={handleCustomGoogleSubmit} className="auth-google-custom-box" noValidate>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Enter Email Address
                  </label>
                  <input
                    type="email"
                    className="auth-google-input"
                    value={customEmail}
                    autoFocus
                    onChange={(e) => { setCustomEmail(e.target.value); setGoogleError('') }}
                    placeholder="e.g. yourname@example.com"
                  />
                  {googleError && (
                    <p className="alert alert-error" role="alert" style={{ margin: '0 0 8px' }}>
                      {googleError}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.84rem', flex: 1 }}>
                      Continue
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => { setShowCustomEmail(false); setGoogleError('') }}
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
                  className="btn btn-ghost"
                  onClick={closeGoogleModal}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

/* ---------- Main App Component ---------- */

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      // Clear legacy persistent storage so fresh visits start on Login screen
      localStorage.removeItem('spotshare_user')
      const saved = sessionStorage.getItem('spotshare_user')
      if (saved) {
        const u = JSON.parse(saved)
        if (u && u.name) return u
      }
      return null
    } catch {
      return null
    }
  })

  // Ensure any stale persistent localStorage user is cleared
  useEffect(() => {
    try {
      localStorage.removeItem('spotshare_user')
    } catch {
      /* ignore */
    }
  }, [])

  const [authIntent, setAuthIntent] = useState(() =>
    typeof window !== 'undefined' && window.location.pathname === '/login' ? 'login' : null
  )
  const [transitionPhase, setTransitionPhase] = useState(null)
  const transitionTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [])

  const runPageTransition = useCallback((phase, commit) => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      commit()
      return
    }
    setTransitionPhase(phase)
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null
      commit()
      setTransitionPhase(null)
    }, 180)
  }, [])

  const [activeCategory, setActiveCategory] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('ev')) {
      return 'ev'
    }
    return 'parking'
  })

  // 'explore' | 'bookings' | 'favorites' | 'profile'
  const [activeNav, setActiveNav] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname
      if (p.includes('booking')) return 'bookings'
      if (p.includes('fav')) return 'favorites'
      if (p.includes('profile')) return 'profile'
      if (p.includes('parking')) return 'explore'
      if (p.includes('ev')) return 'explore'
    }
    return 'explore'
  })

  // 'list' | 'map'
  const [viewModeTab, setViewModeTab] = useState('list')

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [bookingTab, setBookingTab] = useState('active') // 'active' | 'history'

  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('spotshare_favs')
      return raw ? JSON.parse(raw) : ['spot101', 'spot102']
    } catch {
      return []
    }
  })

  const [spots, setSpots] = useState(FALLBACK_SPOTS)
  const [bookings, setBookings] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [apiOk, setApiOk] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [selectedId, setSelectedId] = useState(null)
  const [modalSpot, setModalSpot] = useState(null)
  const [toast, setToast] = useState(null)

  const navigateTo = (nav, category = activeCategory) => {
    setActiveNav(nav)
    if (category) setActiveCategory(category)
    setSidebarOpen(false)
    let path = '/parking'
    if (nav === 'explore') {
      path = category === 'ev' ? '/ev-charging' : '/parking'
    } else if (nav === 'bookings') {
      path = '/bookings'
    } else if (nav === 'favorites') {
      path = '/favorites'
    } else if (nav === 'profile') {
      path = '/profile'
    }
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const syncFromPath = () => {
      if (typeof window === 'undefined') return
      const p = window.location.pathname
      if (p.includes('ev')) {
        setActiveCategory('ev')
        setActiveNav('explore')
      } else if (p.includes('parking')) {
        setActiveCategory('parking')
        setActiveNav('explore')
      } else if (p.includes('booking')) {
        setActiveNav('bookings')
      } else if (p.includes('fav')) {
        setActiveNav('favorites')
      } else if (p.includes('profile')) {
        setActiveNav('profile')
      } else {
        setActiveCategory('parking')
        setActiveNav('explore')
      }
    }
    syncFromPath()
    window.addEventListener('popstate', syncFromPath)
    return () => window.removeEventListener('popstate', syncFromPath)
  }, [])

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind })
    window.clearTimeout(showToast.t)
    showToast.t = window.setTimeout(() => setToast(null), 4000)
  }, [])

  const loadSpots = useCallback(async (silent = false) => {
    if (!silent) setLoadState('loading')
    try {
      const data = await apiRequest('/api/spots')
      const items = asList(data, 'spots')
      if (items.length > 0) {
        setSpots(items)
      } else {
        setSpots(FALLBACK_SPOTS)
      }
      setLoadState('ready')
      setLoadError('')
    } catch (e) {
      setSpots(FALLBACK_SPOTS)
      setLoadState('ready')
      setLoadError('')
    }
  }, [])

  const loadBookings = useCallback(async () => {
    if (!currentUser) {
      setBookings([])
      return
    }
    try {
      const q = encodeURIComponent((currentUser.name || currentUser.email || '').trim())
      const data = await apiRequest(`/api/bookings?customer_name=${q}`)
      setBookings(asList(data, 'bookings').map(normalizeBooking))
    } catch (e) {
      showToast(`Could not load bookings: ${e.message}`, 'error')
    }
  }, [currentUser, showToast])

  useEffect(() => {
    loadSpots()
    apiRequest('/api/health')
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [loadSpots])

  useEffect(() => {
    loadSpots(true)
    loadBookings()
  }, [currentUser, loadSpots, loadBookings])

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        localStorage.setItem('spotshare_favs', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const handleLogin = (user) => {
    try {
      sessionStorage.setItem('spotshare_user', JSON.stringify(user))
      localStorage.removeItem('spotshare_user')
    } catch {
      /* ignore */
    }
    runPageTransition('leaving-auth', () => {
      setCurrentUser(user)
      navigateTo('explore', 'parking')
      if (typeof window !== 'undefined') window.scrollTo(0, 0)
    })
  }

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('spotshare_user')
      localStorage.removeItem('spotshare_user')
    } catch {
      /* ignore */
    }
    runPageTransition('leaving-app', () => {
      setCurrentUser(null)
      setBookings([])
      setAuthIntent(null)
      if (typeof window !== 'undefined') window.scrollTo(0, 0)
    })
  }

  const spotsById = useMemo(
    () => Object.fromEntries(spots.map((s) => [s.id, s])),
    [spots]
  )

  // STRICT category filtering based on Parking vs EV Charging
  const visibleSpots = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const withDistance = spots.map((s) => ({
      spot: s,
      distanceKm: haversineKm(location.latitude, location.longitude, s.latitude, s.longitude),
    }))

    const filtered = withDistance.filter(({ spot, distanceKm }) => {
      // 1. Strict Category Isolation:
      if (activeCategory === 'parking' && spot.ev_charging) return false
      if (activeCategory === 'ev' && !spot.ev_charging) return false

      // 2. Favorites only if in favorites view
      if (activeNav === 'favorites' && !favorites.includes(spot.id)) return false

      // 3. Search text
      if (q && !`${spot.name} ${spot.address}`.toLowerCase().includes(q)) return false

      // 4. Sliders (Max distance 20km, Max price 200)
      if (filters.maxDistanceKm < 20 && distanceKm > filters.maxDistanceKm) return false
      if (filters.maxPrice < 200 && spot.price_per_hour > filters.maxPrice) return false

      // 5. Availability
      if (filters.availableOnly && !(spot.status === 'available' && spot.available_spaces > 0)) {
        return false
      }

      // 6. Vehicle / Charger type
      if (activeCategory === 'parking') {
        if (filters.vehicleType === 'covered') {
          const isCovered =
            (spot.amenities || []).some((a) => a.toLowerCase().includes('covered')) ||
            spot.name.toLowerCase().includes('covered') ||
            spot.name.toLowerCase().includes('multi')
          if (!isCovered) return false
        } else if (
          filters.vehicleType !== 'all' &&
          !(spot.vehicle_types || []).includes(filters.vehicleType)
        ) {
          return false
        }
      } else {
        // EV filtering
        if (filters.chargerType === 'ac' && (spot.charger_power_kw || 0) > 22) return false
        if (filters.chargerType === 'dc' && (spot.charger_power_kw || 0) < 22) return false

        if (filters.minPower > 0 && (spot.charger_power_kw || 0) < filters.minPower) {
          return false
        }

        const isPrivate = isPrivateEvSpot(spot)

        if (filters.ownerType === 'private' && !isPrivate) return false
        if (filters.ownerType === 'public' && isPrivate) return false

        if (filters.connectorType && filters.connectorType !== 'all') {
          const am = (spot.amenities || []).join(' ').toLowerCase()
          if (filters.connectorType === 'ccs2' && !am.includes('ccs2') && (spot.charger_power_kw || 0) < 20) return false
          if (filters.connectorType === 'type2' && !am.includes('type 2') && !am.includes('type2') && (spot.charger_power_kw || 0) > 22) return false
          if (filters.connectorType === 'chademo' && !am.includes('chademo')) return false
        }
      }

      return true
    })

    const sorters = {
      distance: (a, b) => a.distanceKm - b.distanceKm,
      price: (a, b) => a.spot.price_per_hour - b.spot.price_per_hour,
      rating: (a, b) => (b.spot.rating ?? 0) - (a.spot.rating ?? 0),
    }
    return filtered.sort(sorters[filters.sort] || sorters.distance)
  }, [spots, filters, location, activeCategory, activeNav, favorites])

  const categoryTotalCount = useMemo(() => {
    if (activeCategory === 'parking') return spots.filter((s) => !s.ev_charging).length
    if (activeCategory === 'ev') return spots.filter((s) => s.ev_charging).length
    return spots.length
  }, [spots, activeCategory])

  // Filter bookings strictly for the logged-in user
  const userBookings = useMemo(() => {
    if (!currentUser) return []
    const uName = (currentUser.name || '').trim().toLowerCase()
    const uEmail = (currentUser.email || '').trim().toLowerCase()

    let localIds = []
    try {
      const key = `spotshare_bookings_${uEmail || uName}`
      const stored = localStorage.getItem(key)
      if (stored) localIds = JSON.parse(stored)
    } catch {
      /* ignore */
    }

    return bookings.filter((b) => {
      if (localIds.includes(b.id)) return true
      const c = (b.customerName || '').trim().toLowerCase()
      if (!c) return false
      return c === uName || c === uEmail
    })
  }, [bookings, currentUser])

  // Active bookings for this account (not cancelled)
  const activeBookings = useMemo(
    () => userBookings.filter((b) => b.status !== 'cancelled'),
    [userBookings]
  )

  // Full history for this account sorted with newest on top
  const historyBookings = useMemo(
    () => [...userBookings].sort((a, b) => new Date(b.createdAt || b.start) - new Date(a.createdAt || a.start)),
    [userBookings]
  )

  const selectSpot = useCallback((id) => {
    setSelectedId(id)
    requestAnimationFrame(() =>
      document
        .getElementById(`spot-card-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    )
  }, [])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported in this browser.', 'error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: 'Mysuru (Current Location)',
        }),
      () => showToast('Using Mysuru, Karnataka as reference point.', 'error'),
      { timeout: 8000 }
    )
  }

  const handleBook = async (payload) => {
    const bookingPayload = {
      ...payload,
      customer_name: (currentUser?.name || payload.customer_name || 'Customer').trim(),
      customer_email:
        payload.customer_email !== undefined
          ? payload.customer_email || undefined
          : currentUser?.email || undefined,
    }
    const created = await apiRequest('/api/bookings', { method: 'POST', body: bookingPayload })

    // Track booking ID locally for this user
    if (currentUser && created?.id) {
      try {
        const key = `spotshare_bookings_${(currentUser.email || currentUser.name).toLowerCase()}`
        const existing = JSON.parse(localStorage.getItem(key) || '[]')
        if (!existing.includes(created.id)) {
          localStorage.setItem(key, JSON.stringify([...existing, created.id]))
        }
      } catch {
        /* ignore */
      }
    }

    await Promise.all([loadSpots(true), loadBookings()])
    showToast(created?.email_sent ? 'Booking confirmed! Confirmation sent to your email.' : 'Booking confirmed!')
    return normalizeBooking(created)
  }

  // Cancel booking: removes from active, keeps audit log in history for this account only
  const handleCancel = async (id) => {
    try {
      await apiRequest(`/api/bookings/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'cancelled', cancelledAt: new Date().toISOString() } : b))
      )
      await Promise.all([loadSpots(true), loadBookings()])
      showToast('Booking cancelled.')
    } catch (e) {
      showToast(`Cancel failed: ${e.message}`, 'error')
    }
  }

  const handleClearAllBookings = async () => {
    if (!window.confirm('Are you sure you want to remove all active and past bookings?')) return
    try {
      if (currentUser?.email || currentUser?.name) {
        const key = `spotshare_bookings_${(currentUser.email || currentUser.name).toLowerCase()}`
        localStorage.removeItem(key)
      }
      await apiRequest(`/api/bookings/clear-all?customer_name=${encodeURIComponent(currentUser?.name || '')}`, {
        method: 'DELETE',
      })
      setBookings([])
      await Promise.all([loadSpots(true), loadBookings()])
      showToast('All bookings removed successfully.', 'success')
    } catch (e) {
      showToast(`Could not clear bookings: ${e.message}`, 'error')
    }
  }

  if (!currentUser) {
    if (!authIntent) {
      return (
        <LandingPage
          spots={spots}
          isLeaving={transitionPhase === 'leaving-home'}
          onOpenAuth={(intent) => {
            runPageTransition('leaving-home', () => {
              setAuthIntent(intent || 'login')
              if (typeof window !== 'undefined') window.scrollTo(0, 0)
            })
          }}
        />
      )
    }
    return (
      <AuthScreen
        key={authIntent}
        initialTab={authIntent}
        isExiting={transitionPhase === 'leaving-auth'}
        onBackToHome={() => {
          runPageTransition('leaving-auth', () => {
            setAuthIntent(null)
            if (typeof window !== 'undefined') window.scrollTo(0, 0)
          })
        }}
        onLogin={handleLogin}
      />
    )
  }

  const themeClass = activeCategory === 'parking' ? 'theme-parking' : 'theme-ev'

  return (
    <div className={`app ${themeClass} ${transitionPhase === 'leaving-app' ? 'is-leaving' : 'is-entering'}`}>
      {/* Topbar with 3-line hamburger menu */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          <div
            className="brand"
            onClick={() => navigateTo('explore', 'parking')}
          >
            <div className={`brand-mark ${activeCategory === 'ev' ? 'ev-mark' : ''}`}>
              <SpotShareLogo size={36} category={activeCategory} />
            </div>
            <div className="brand-title">
              <h1>
                <span className="brand-text-spot">Spot</span>
                <span className={`brand-text-share ${activeCategory === 'ev' ? 'ev' : ''}`}>Share</span>
              </h1>
            </div>
          </div>
        </div>

        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className="user-profile-btn"
            onClick={() => navigateTo('profile')}
            title="View Profile"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{currentUser.name}</span>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            onClick={handleLogout}
            title="Log Out"
            style={{
              padding: '6px 12px',
              fontSize: '0.82rem',
              borderRadius: '20px',
              color: '#dc2626',
              borderColor: '#fecaca',
              background: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Sliding Drawer Backdrop Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Main App Shell with Sliding Sidebar */}
      <div className="app-shell">
        {/* Sliding Navigation Sidebar (Opened with 3 lines, NO icons) */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-drawer-header">
            <span className="sidebar-drawer-title">
              <span className="brand-text-spot">Spot</span>
              <span className={`brand-text-share ${activeCategory === 'ev' ? 'ev' : ''}`}>Share</span>
            </span>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="sidebar-nav-list">
            <button
              type="button"
              className={`nav-item ${activeNav === 'explore' && activeCategory === 'parking' ? 'active parking' : ''}`}
              onClick={() => navigateTo('explore', 'parking')}
            >
              <div className="nav-item-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <span>Parking</span>
              </div>
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'explore' && activeCategory === 'ev' ? 'active ev' : ''}`}
              onClick={() => navigateTo('explore', 'ev')}
            >
              <div className="nav-item-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span>EV Charging</span>
              </div>
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'bookings' ? 'active bookings' : ''}`}
              onClick={() => navigateTo('bookings')}
            >
              <div className="nav-item-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="8" y1="14" x2="8.01" y2="14" strokeWidth="3" />
                  <line x1="12" y1="14" x2="12.01" y2="14" strokeWidth="3" />
                  <line x1="16" y1="14" x2="16.01" y2="14" strokeWidth="3" />
                </svg>
                <span>My Bookings</span>
              </div>
              {activeBookings.length > 0 && (
                <span className="nav-badge">{activeBookings.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'favorites' ? 'active bookings' : ''}`}
              onClick={() => navigateTo('favorites')}
            >
              <div className="nav-item-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>Favorites</span>
              </div>
              {favorites.length > 0 && (
                <span className="nav-badge" style={{ background: '#ec4899' }}>{favorites.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'profile' ? 'active bookings' : ''}`}
              onClick={() => navigateTo('profile')}
            >
              <div className="nav-item-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Profile</span>
              </div>
            </button>
          </nav>

          <div className="sidebar-bottom">
            <button
              type="button"
              className="nav-item nav-logout"
              onClick={() => {
                setSidebarOpen(false)
                handleLogout()
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Logout</span>
              </div>
            </button>
          </div>
        </aside>

        {/* Center / Right Content Area */}
        <main className="main-content">
          {activeNav === 'explore' || activeNav === 'favorites' ? (
            <>
              {/* White Filter Card */}
              <FilterBar
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(DEFAULT_FILTERS)}
                onUseLocation={useMyLocation}
                activeCategory={activeCategory}
              />

              {/* View Switcher Bar matching screenshot */}
              <div className="view-bar">
                <div className="view-pills">
                  <button
                    type="button"
                    className={`view-pill-btn ${viewModeTab === 'list' ? `active ${activeCategory}` : ''}`}
                    onClick={() => setViewModeTab('list')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
                    </svg>
                    <span>List View</span>
                  </button>
                  <button
                    type="button"
                    className={`view-pill-btn ${viewModeTab === 'map' ? `active ${activeCategory}` : ''}`}
                    onClick={() => setViewModeTab('map')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                      <line x1="8" y1="2" x2="8" y2="18" />
                      <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                    <span>Map View</span>
                  </button>
                </div>

                <span className="results-count-text">
                  {visibleSpots.length}{' '}
                  {activeCategory === 'parking' ? 'parking spaces' : 'charging stations'} found
                </span>
              </div>

              {/* Content: List View or Map View */}
              {viewModeTab === 'list' ? (
                <div className="spot-card-list">
                  {loadState === 'loading' && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
                      <p className="muted">Loading spots…</p>
                    </div>
                  )}

                  {loadState === 'error' && (
                    <div className="alert alert-error">
                      <strong>Cannot connect to server.</strong> {loadError}
                      <button className="btn btn-primary btn-sm" style={{ marginLeft: '10px' }} onClick={() => loadSpots()}>
                        Retry
                      </button>
                    </div>
                  )}

                  {loadState === 'ready' && visibleSpots.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '16px' }}>
                      <h3>No {activeCategory === 'parking' ? 'parking spaces' : 'charging stations'} found</h3>
                      <p className="muted small" style={{ margin: '8px 0 16px' }}>
                        Try adjusting your search or resetting filters.
                      </p>
                      <button className="btn btn-ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
                        Reset Filters
                      </button>
                    </div>
                  )}

                  {loadState === 'ready' &&
                    visibleSpots.map(({ spot, distanceKm }) => (
                      <SpotCard
                        key={spot.id}
                        spot={spot}
                        distanceKm={distanceKm}
                        selected={spot.id === selectedId}
                        onSelect={() => selectSpot(spot.id)}
                        onBook={() => setModalSpot(spot)}
                        activeCategory={activeCategory}
                        isFavorite={favorites.includes(spot.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                </div>
              ) : (
                <div className="map-view-container">
                  <ParkingMap
                    spots={visibleSpots.map((v) => v.spot)}
                    selectedSpotId={selectedId}
                    onSelectSpot={selectSpot}
                    onBookSpot={(spot) => setModalSpot(spot)}
                    userLocation={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }}
                  />
                </div>
              )}
            </>
          ) : activeNav === 'bookings' ? (
            /* My Bookings & History View */
            <div className="bookings-view-container">
              <div className="bookings-header-bar">
                <div>
                  <h2>My Bookings &amp; History</h2>
                  <p className="muted small">Manage reservations and check past activity</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="booking-tabs" role="tablist">
                    <button
                      type="button"
                      className={`b-tab-btn ${bookingTab === 'active' ? 'active' : ''}`}
                      onClick={() => setBookingTab('active')}
                    >
                      Active Bookings ({activeBookings.length})
                    </button>
                    <button
                      type="button"
                      className={`b-tab-btn ${bookingTab === 'history' ? 'active' : ''}`}
                      onClick={() => setBookingTab('history')}
                    >
                      Booking History ({historyBookings.length})
                    </button>
                  </div>
                  {userBookings.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleClearAllBookings}
                      style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fff', fontSize: '0.8rem', padding: '6px 12px', cursor: 'pointer' }}
                      title="Clear all active bookings and history"
                    >
                      Remove All
                    </button>
                  )}
                </div>
              </div>

              {bookingTab === 'active' ? (
                activeBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '16px' }}>
                    <h3>No active bookings</h3>
                    <p className="muted small" style={{ margin: '8px 0 16px' }}>
                      Pick a spot from the marketplace and reserve a space.
                    </p>
                    <button className="btn btn-primary" onClick={() => setActiveNav('explore')}>
                      Browse Spaces
                    </button>
                  </div>
                ) : (
                  <div>
                    {activeBookings.map((b) => (
                      <div key={b.id} className="booking-item-card">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong>{spotsById[b.spotId]?.name ?? b.spotName ?? b.spotId}</strong>
                            <span className="booking-account-tag">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              {b.customerName || currentUser.name}
                            </span>
                            <span className="receipt-badge-id" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{b.id}</span>
                          </div>
                          <div className="muted small" style={{ marginTop: '2px' }}>
                            {formatDateTime(b.start)} → {formatDateTime(b.end)} ({b.duration})
                          </div>
                          <div className="small" style={{ marginTop: '2px' }}>
                            Total: <strong>{formatMoney(b.total)}</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancel(b.id)}
                        >
                          Cancel Booking
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* History Tab with Booked & Cancelled timestamps */
                historyBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '16px' }}>
                    <p className="muted small">No booking history recorded yet for this account.</p>
                  </div>
                ) : (
                  <div>
                    {historyBookings.map((b) => {
                      const isCancelled = b.status === 'cancelled'
                      return (
                        <div key={b.id} className="history-card">
                          <div className="history-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong>{spotsById[b.spotId]?.name ?? b.spotName ?? b.spotId}</strong>
                              <span className="booking-account-tag">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                                {b.customerName || currentUser.name}
                              </span>
                              <span className="receipt-badge-id" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{b.id}</span>
                            </div>
                          </div>
                          <div className="small muted">
                            Slot: {formatDateTime(b.start)} → {formatDateTime(b.end)} ({b.duration})
                          </div>
                          <div className="small" style={{ marginTop: '2px' }}>
                            Amount: <strong>{formatMoney(b.total)}</strong>
                          </div>
                          <div className="history-timeline">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              <span><strong>Booked on:</strong> {formatDateTime(b.createdAt || b.start)}</span>
                            </div>
                            {isCancelled && (
                              <div style={{ color: 'var(--bad)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span><strong>Cancelled on:</strong> {formatDateTime(b.cancelledAt || new Date().toISOString())}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          ) : activeNav === 'host' ? (
            <HostApp onBack={() => navigateTo('explore')} />
          ) : (
            /* Profile View */
            <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '28px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h2>Customer Profile</h2>
              <p className="muted small" style={{ marginBottom: '20px' }}>Your registered SpotShare credentials</p>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div><strong>Full Name:</strong> {currentUser.name}</div>
                <div><strong>Email Address:</strong> {currentUser.email}</div>
                <div><strong>Preferred Vehicle:</strong> {currentUser.vehicle}</div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Booking Modal */}
      {modalSpot && (
        <BookingModal
          spot={modalSpot}
          currentUser={currentUser}
          onClose={() => setModalSpot(null)}
          onViewBookings={() => {
            setModalSpot(null)
            navigateTo('bookings')
          }}
          onBook={handleBook}
          formatMoney={formatMoney}
          formatDateTime={formatDateTime}
        />
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  )
}