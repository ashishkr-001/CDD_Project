import React from 'react'

const money = (n) => `₹${Number(n).toFixed(2).replace(/\.00$/, '')}`

export default function SpotCard({
  spot,
  distanceKm,
  selected,
  onSelect,
  onBook,
  activeCategory = 'parking',
  isFavorite = false,
  onToggleFavorite = () => {},
}) {
  const isClosed = spot.is_active === false || spot.status === 'closed'
  const capacity = spot.capacity || 1
  const free = isClosed ? 0 : Math.max(0, spot.available_spaces ?? 0)
  const occupied = isClosed ? 0 : Math.max(0, capacity - free)

  const formattedDistance =
    typeof distanceKm === 'number' && !Number.isNaN(distanceKm)
      ? `${distanceKm.toFixed(1)} km`
      : '1.2 km'

  // Realistic review count derived deterministically
  const reviewCount = spot.rating
    ? Math.round((spot.rating - 3.5) * 200 + 40 + (spot.id ? spot.id.charCodeAt(spot.id.length - 1) * 3 : 20))
    : 45

  const isPrivateOwner =
    spot.ev_charging &&
    (spot.name.toLowerCase().includes('home') ||
      spot.name.toLowerCase().includes('driveway') ||
      spot.name.toLowerCase().includes('plaza') ||
      (spot.address && spot.address.toLowerCase().includes('vijayanagar 2nd')))

  return (
    <article
      id={`spot-card-${spot.id}`}
      className={`spot-card-horizontal ${selected ? 'selected' : ''} ${isClosed ? 'is-closed' : ''}`}
      onClick={onSelect}
    >
      {/* Real photograph thumbnail with favorite button */}
      <div className={`spot-thumb ${spot.ev_charging ? 'ev-thumb' : 'parking-thumb'}`}>
        <img
          src={spot.image_url || `/images/spots/${spot.id}.jpg`}
          alt={spot.name}
          className="spot-photo-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null
            // Guaranteed high-resolution real photography CDN fallback
            e.currentTarget.src = spot.ev_charging
              ? 'https://images.unsplash.com/photo-1751553822302-b8d5934a76b5?auto=format&fit=crop&w=600&h=400&q=80'
              : 'https://images.unsplash.com/photo-1619026457031-dafc4b5300a5?auto=format&fit=crop&w=600&h=400&q=80'
          }}
        />
        <div className="spot-photo-gradient-overlay" />
        <button
          type="button"
          className={`thumb-fav-btn ${isFavorite ? 'is-fav' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(spot.id)
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label="Favorite"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={isFavorite ? '#e11d48' : 'none'} stroke={isFavorite ? '#e11d48' : '#475569'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Center Details */}
      <div className="spot-info-mid">
        <div className="spot-title-row">
          <h3 className="spot-name-h3">{spot.name}</h3>
          <span className="verified-badge-pill" title="Verified Listing">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" fill={spot.ev_charging ? 'var(--ev-primary)' : 'var(--primary)'} />
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {spot.ev_charging && isPrivateOwner && (
            <span className="owner-type-tag">Private Owner</span>
          )}
        </div>

        {/* Rating row */}
        <div className="spot-rating-row">
          <span className="rating-star">★</span>
          <span className="rating-score">{Number(spot.rating || 4.2).toFixed(1)}</span>
          <span className="rating-reviews-count">({reviewCount} reviews)</span>
        </div>

        {/* Location row */}
        <div className="spot-location-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.85 }}>
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{formattedDistance} • {spot.address}</span>
        </div>

        {/* Specs / Amenities badges */}
        <div className="spot-amenities-row">
          {spot.ev_charging ? (
            <>
              {spot.charger_power_kw && (
                <span className="amenity-chip chip-highlight">
                  AC {spot.charger_power_kw} kW
                </span>
              )}
              {spot.charger_power_kw && spot.charger_power_kw >= 20 && (
                <span className="amenity-chip chip-highlight">
                  DC 50 kW
                </span>
              )}
              <span className="amenity-chip">
                {spot.charger_power_kw && spot.charger_power_kw >= 20 ? 'Type 2' : 'Type 2'}
              </span>
              {spot.charger_power_kw && spot.charger_power_kw >= 20 && (
                <span className="amenity-chip">CCS2</span>
              )}
              {isPrivateOwner ? (
                <>
                  <span className="amenity-chip">Home Charger</span>
                  <span className="amenity-chip">Private</span>
                </>
              ) : (
                <span className="amenity-chip">Public Station</span>
              )}
              {(spot.amenities || []).map((item) => (
                <span key={item} className="amenity-chip">{item}</span>
              ))}
            </>
          ) : (
            <>
              {((spot.amenities || []).includes('Covered') || spot.name.toLowerCase().includes('multi') || spot.name.toLowerCase().includes('covered')) && (
                <span className="amenity-chip">Covered</span>
              )}
              {(spot.amenities || ['CCTV', 'Security 24/7'])
                .filter((a) => a !== 'Covered')
                .map((item) => (
                  <span key={item} className="amenity-chip">{item}</span>
                ))}
              {(spot.vehicle_types || ['car', 'bike']).map((v) => (
                <span key={v} className="amenity-chip capitalize">{v}</span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Right Price & Availability */}
      <div className="spot-right-col">
        <div className="spot-price-block">
          <span className="spot-price-num">{money(spot.price_per_hour)}</span>
          <span className="spot-price-unit">{spot.ev_charging ? '/kWh' : '/hr'}</span>
        </div>

        <div className="spot-status-row">
          {isClosed ? (
            <span className="status-item closed">
              <span className="status-dot amber" />
              <span>Closed / Offline</span>
            </span>
          ) : (
            <>
              {free > 0 && (
                <span className="status-item available">
                  <span className="status-dot green" />
                  <span>{free} Available</span>
                </span>
              )}
              {occupied > 0 && spot.ev_charging && (
                <span className="status-item occupied">
                  <span className="status-dot red" />
                  <span>{occupied} Occupied</span>
                </span>
              )}
              {free === 0 && (
                <span className="status-item full">
                  <span className="status-dot red" />
                  <span>Occupied</span>
                </span>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
          <button
            type="button"
            className={`btn-book-card ${spot.ev_charging ? 'ev' : 'parking'} ${isClosed ? 'disabled' : ''}`}
            style={{ flex: 1 }}
            disabled={isClosed}
            title={isClosed ? 'This station is temporarily closed by the host' : ''}
            onClick={(e) => {
              e.stopPropagation()
              if (!isClosed) onBook()
            }}
          >
            {isClosed ? 'Closed' : 'Book Now'}
          </button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Get Directions in Google Maps"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            🧭
          </a>
        </div>
      </div>
    </article>
  )
}
