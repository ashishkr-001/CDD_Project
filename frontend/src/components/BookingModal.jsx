import { useEffect, useMemo, useState } from 'react'

function pad(n) {
  return String(n).padStart(2, '0')
}

// Local time formatted for <input type="datetime-local">: YYYY-MM-DDTHH:mm
function toLocalInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Naive local ISO 8601 with seconds, as the API expects: YYYY-MM-DDTHH:mm:00
const toApiTime = (v) => (v.length === 16 ? `${v}:00` : v)

// Default start is right now so booking begins immediately and updates space availability
function defaultStart() {
  const d = new Date()
  d.setSeconds(0, 0)
  return d
}

export default function BookingModal({
  spot,
  currentUser = null,
  onClose,
  onViewBookings,
  onBook,
  formatMoney,
  formatDateTime,
}) {
  const start0 = useMemo(defaultStart, [])
  const vehicles = spot.vehicle_types?.length ? spot.vehicle_types : ['car']
  const isClosed = spot.is_active === false || spot.status === 'closed'

  const [name, setName] = useState(currentUser?.name || 'Demo User')
  const [start, setStart] = useState(toLocalInput(start0))
  const [end, setEnd] = useState(toLocalInput(new Date(start0.getTime() + 2 * 3600000)))
  const [vehicle, setVehicle] = useState(
    currentUser?.vehicle && vehicles.includes(currentUser.vehicle)
      ? currentUser.vehicle
      : vehicles[0]
  )
  const [needsEv, setNeedsEv] = useState(Boolean(spot.ev_charging))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name)
    }
  }, [currentUser])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hours = (new Date(end) - new Date(start)) / 3600000
  const validRange = Number.isFinite(hours) && hours > 0
  const estimate = validRange
    ? Math.round(hours * spot.price_per_hour * 100) / 100
    : null

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (isClosed) return setError('This station is temporarily closed by the host.')
    const bookingCustomer = (currentUser?.name || name).trim()
    if (!bookingCustomer) return setError('Please enter your name.')
    if (!validRange) return setError('End time must be after the start time.')
    setBusy(true)
    try {
      const created = await onBook({
        spot_id: spot.id,
        customer_name: bookingCustomer,
        start_time: toApiTime(start),
        end_time: toApiTime(end),
        vehicle_type: vehicle,
        requires_ev_charging: needsEv,
      })
      setBooking(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {booking ? (
          <div className="confirmation-modal-wrap">
            {/* Green Checkmark Icon */}
            <div className="confirm-icon-ring" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 id="booking-title" className="confirm-heading">
              Booking Confirmed!
            </h2>
            <p className="confirm-sub">
              Your reservation has been placed successfully.
            </p>

            {/* Digital Voucher Receipt */}
            <div className="confirm-receipt">
              <div className="receipt-spot-header">
                <img
                  src={spot.image_url || `/images/spots/${spot.id}.jpg`}
                  alt={spot.name}
                  className="receipt-spot-mini-img"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = spot.ev_charging
                      ? 'https://images.unsplash.com/photo-1751553822302-b8d5934a76b5?auto=format&fit=crop&w=600&h=400&q=80'
                      : 'https://images.unsplash.com/photo-1619026457031-dafc4b5300a5?auto=format&fit=crop&w=600&h=400&q=80'
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="receipt-spot-name">
                    {spot.name}
                  </h3>
                  <p className="receipt-spot-address">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {spot.address}
                  </p>
                </div>
                <span className="receipt-status-pill">
                  <span className="status-dot green" />
                  <span>Confirmed</span>
                </span>
              </div>

              <div className="receipt-divider" />

              <div className="receipt-grid">
                <div className="receipt-col">
                  <span className="receipt-label">Booking ID</span>
                  <span className="receipt-badge-id">{booking.id}</span>
                </div>
                <div className="receipt-col">
                  <span className="receipt-label">Account</span>
                  <span className="receipt-value">{booking.customerName || currentUser?.name || 'Customer'}</span>
                </div>
                <div className="receipt-col">
                  <span className="receipt-label">Vehicle</span>
                  <span className="receipt-value capitalize">{booking.vehicleType || vehicle}</span>
                </div>
                <div className="receipt-col">
                  <span className="receipt-label">Duration</span>
                  <span className="receipt-value">{booking.duration}</span>
                </div>

                <div className="receipt-col">
                  <span className="receipt-label">Check-in</span>
                  <span className="receipt-value">{formatDateTime(booking.start)}</span>
                </div>
                <div className="receipt-col">
                  <span className="receipt-label">Check-out</span>
                  <span className="receipt-value">{formatDateTime(booking.end)}</span>
                </div>

                <div className="receipt-col">
                  <span className="receipt-label">EV Charging</span>
                  <span className="receipt-value">{needsEv ? 'Included' : 'No'}</span>
                </div>
              </div>

              <div className="receipt-footer">
                <span className="receipt-total-label">Total Amount</span>
                <span className="receipt-total-value">{formatMoney(booking.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="confirm-actions">
              {onViewBookings && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onViewBookings}
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>View in My Bookings</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-confirm-done"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="booking-modal-header-card">
              <img
                src={spot.image_url || `/images/spots/${spot.id}.jpg`}
                alt={spot.name}
                className="booking-modal-spot-img"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = spot.ev_charging
                    ? 'https://images.unsplash.com/photo-1751553822302-b8d5934a76b5?auto=format&fit=crop&w=600&h=400&q=80'
                    : 'https://images.unsplash.com/photo-1619026457031-dafc4b5300a5?auto=format&fit=crop&w=600&h=400&q=80'
                }}
              />
              <div className="booking-modal-spot-details">
                <h2 id="booking-title" style={{ paddingRight: '28px', marginBottom: '2px', fontSize: '1.25rem' }}>
                  Book {spot.name}
                </h2>
                <p className="muted small" style={{ margin: 0 }}>
                  {spot.address} · {formatMoney(spot.price_per_hour)}/hr
                </p>
              </div>
            </div>

            <label className="field">
              <span>Account name</span>
              <input
                value={currentUser?.name || name}
                onChange={(e) => setName(e.target.value)}
                readOnly={Boolean(currentUser?.name)}
                style={
                  currentUser?.name
                    ? { backgroundColor: 'var(--bg-muted, #f8fafc)', cursor: 'default' }
                    : {}
                }
                title={currentUser?.name ? 'Reservation is tied to your logged-in account' : ''}
                required
              />
            </label>

            <div className="two-col">
              <label className="field">
                <span>Start</span>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>End</span>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Vehicle type</span>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className={`check ${spot.ev_charging ? '' : 'disabled'}`}>
              <input
                type="checkbox"
                checked={needsEv}
                disabled={!spot.ev_charging}
                onChange={(e) => setNeedsEv(e.target.checked)}
              />
              <span>I need EV charging</span>
              {!spot.ev_charging && (
                <em className="muted small"> (not available here)</em>
              )}
            </label>

            <div className="estimate-box">
              <span>Estimated total:</span>
              <strong>{estimate != null ? formatMoney(estimate) : '—'}</strong>
            </div>
            <p className="booking-guarantee-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Instant spot reservation • Free cancellation anytime in My Bookings</span>
            </p>

            {isClosed && (
              <p className="alert alert-error" role="alert">
                This station is temporarily closed by the host and is not accepting bookings right now.
              </p>
            )}

            {error && (
              <p className="alert alert-error" role="alert">
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy || isClosed}>
                {busy ? 'Booking…' : isClosed ? 'Station Closed' : 'Confirm booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
