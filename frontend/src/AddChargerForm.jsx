import { useState } from 'react'

const VEHICLES = [
  {
    id: 'car',
    label: 'Cars',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    )
  },
  {
    id: 'bike',
    label: 'Bikes',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L9 9h3l3.5 4.5h3.5" />
      </svg>
    )
  },
  {
    id: 'van',
    label: 'Vans',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    )
  }
]

const POPULAR_AMENITIES = ['Type 2', 'CCS2', 'Fast DC', 'CCTV', 'Security 24/7', 'Covered', 'Restrooms']

const EMPTY = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  price_per_hour: '',
  charger_power_kw: '',
  capacity: '1',
  vehicle_types: ['car'],
  amenities: '',
}

const toNumber = (text) => (String(text).trim() === '' ? NaN : Number(text))

export function validate(v) {
  const e = {}
  if (!v.name.trim()) e.name = 'Give your charger a name.'
  else if (v.name.trim().length > 100) e.name = 'Use at most 100 characters.'
  if (!v.address.trim()) e.address = 'Add the address customers should drive to.'
  const lat = toNumber(v.latitude)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) e.latitude = 'Latitude must be between -90 and 90.'
  const lng = toNumber(v.longitude)
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) e.longitude = 'Longitude must be between -180 and 180.'
  const price = toNumber(v.price_per_hour)
  if (!Number.isFinite(price) || price < 0) e.price_per_hour = 'Enter a price (₹) per hour.'
  const kw = toNumber(v.charger_power_kw)
  if (!Number.isFinite(kw) || kw <= 0) e.charger_power_kw = 'Enter charger output (kW).'
  const cap = toNumber(v.capacity)
  if (!Number.isInteger(cap) || cap < 1) e.capacity = 'Must be at least 1 bay.'
  if (v.vehicle_types.length === 0) e.vehicle_types = 'Pick at least one vehicle type.'
  return e
}

export function buildPayload(v, ownerName) {
  return {
    name: v.name.trim(),
    address: v.address.trim(),
    latitude: Number(v.latitude),
    longitude: Number(v.longitude),
    price_per_hour: Number(v.price_per_hour),
    vehicle_types: v.vehicle_types,
    ev_charging: true,
    charger_power_kw: Number(v.charger_power_kw),
    capacity: Number(v.capacity),
    amenities: v.amenities.split(',').map((a) => a.trim()).filter(Boolean).slice(0, 10),
    owner_name: ownerName,
  }
}

export default function AddChargerForm({ ownerName, onCreate }) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  const set = (patch) => {
    setValues((prev) => ({ ...prev, ...patch }))
    setSuccess('')
  }

  const toggleVehicle = (type) =>
    set({
      vehicle_types: values.vehicle_types.includes(type)
        ? values.vehicle_types.filter((t) => t !== type)
        : [...values.vehicle_types, type],
    })

  const addAmenity = (tag) => {
    const list = values.amenities.split(',').map((s) => s.trim()).filter(Boolean)
    if (!list.includes(tag)) {
      list.push(tag)
      set({ amenities: list.join(', ') })
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported in this browser. Please type coordinates.')
      return
    }
    setLocating(true)
    setFormError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          latitude: pos.coords.latitude.toFixed(5),
          longitude: pos.coords.longitude.toFixed(5),
        })
        setLocating(false)
      },
      () => {
        setFormError('Could not retrieve your location. Please enter coordinates manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setSuccess('')
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const created = await onCreate(buildPayload(values, ownerName))
      setSuccess(`Station "${created.name}" published successfully! Customers can now book it.`)
      setValues(EMPTY)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="host-panel">
      <div className="host-panel-header">
        <div>
          <div className="host-panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <h2>Post a New Charger</h2>
          </div>
          <p className="host-panel-subtitle">
            Listing as <strong>{ownerName}</strong>. Live on the customer app instantly.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="host-form" noValidate>
        <div className="host-field">
          <label className="host-label">Charger Station Name</label>
          <input
            type="text"
            className="host-input"
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. GreenHome Fast EV Bay"
            maxLength={100}
          />
          {errors.name && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.name}</small>}
        </div>

        <div className="host-field">
          <label className="host-label">Address &amp; Landmark</label>
          <input
            type="text"
            className="host-input"
            value={values.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="e.g. #42, 2nd Main, Vijayanagar, Mysore"
          />
          {errors.address && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.address}</small>}
        </div>

        <div>
          <div className="host-pair-row">
            <div className="host-field">
              <label className="host-label">Latitude</label>
              <input
                type="text"
                className="host-input"
                inputMode="decimal"
                value={values.latitude}
                onChange={(e) => set({ latitude: e.target.value })}
                placeholder="e.g. 12.3330"
              />
              {errors.latitude && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.latitude}</small>}
            </div>
            <div className="host-field">
              <label className="host-label">Longitude</label>
              <input
                type="text"
                className="host-input"
                inputMode="decimal"
                value={values.longitude}
                onChange={(e) => set({ longitude: e.target.value })}
                placeholder="e.g. 76.6160"
              />
              {errors.longitude && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.longitude}</small>}
            </div>
          </div>
          <button
            type="button"
            className="btn-gps-locate"
            onClick={useMyLocation}
            disabled={locating}
            style={{ marginTop: '8px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            {locating ? 'Detecting GPS...' : 'Auto-detect My Location'}
          </button>
        </div>

        <div className="host-pair-row">
          <div className="host-field">
            <label className="host-label">Rate (₹ / hour)</label>
            <input
              type="text"
              className="host-input"
              inputMode="decimal"
              value={values.price_per_hour}
              onChange={(e) => set({ price_per_hour: e.target.value })}
              placeholder="e.g. 20"
            />
            {errors.price_per_hour && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.price_per_hour}</small>}
          </div>

          <div className="host-field">
            <label className="host-label">Charger Power (kW)</label>
            <input
              type="text"
              className="host-input"
              inputMode="decimal"
              value={values.charger_power_kw}
              onChange={(e) => set({ charger_power_kw: e.target.value })}
              placeholder="e.g. 7.4 or 22"
            />
            {errors.charger_power_kw && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.charger_power_kw}</small>}
          </div>
        </div>

        <div className="host-field">
          <label className="host-label">Number of Charging Bays</label>
          <input
            type="number"
            min="1"
            max="50"
            className="host-input"
            value={values.capacity}
            onChange={(e) => set({ capacity: e.target.value })}
          />
          {errors.capacity && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.capacity}</small>}
        </div>

        <div className="host-field">
          <label className="host-label">Compatible Vehicles</label>
          <div className="host-vehicles-chips">
            {VEHICLES.map((v) => {
              const active = values.vehicle_types.includes(v.id)
              return (
                <button
                  type="button"
                  key={v.id}
                  className={`vehicle-chip-btn ${active ? 'active' : ''}`}
                  onClick={() => toggleVehicle(v.id)}
                >
                  <span>{v.icon}</span>
                  <span>{v.label}</span>
                </button>
              )
            })}
          </div>
          {errors.vehicle_types && <small style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.vehicle_types}</small>}
        </div>

        <div className="host-field">
          <label className="host-label">Amenities</label>
          <input
            type="text"
            className="host-input"
            value={values.amenities}
            onChange={(e) => set({ amenities: e.target.value })}
            placeholder="e.g. Type 2, CCS2, CCTV, Security Guard"
          />
          <div className="amenities-suggestions">
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '4px', alignSelf: 'center' }}>Add:</span>
            {POPULAR_AMENITIES.map((tag) => (
              <button
                type="button"
                key={tag}
                className="amenity-pill-tag"
                onClick={() => addAmenity(tag)}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {formError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
            {formError}
          </div>
        )}

        {success && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
            {success}
          </div>
        )}

        <button type="submit" className="btn-post-charger" disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {busy ? 'Publishing Charger...' : 'Publish EV Charger'}
        </button>
      </form>
    </div>
  )
}
