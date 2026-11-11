import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function ParkingMap({
  spots = [],
  selectedSpotId = null,
  onSelectSpot = () => {},
  onBookSpot = () => {},
  userLocation = null,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const [activeSpot, setActiveSpot] = useState(null)

  // Sync activeSpot with selectedSpotId prop
  useEffect(() => {
    if (selectedSpotId) {
      const match = spots.find((s) => s.id === selectedSpotId)
      if (match) setActiveSpot(match)
    }
  }, [selectedSpotId, spots])

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    const initialLat = userLocation?.latitude || 12.3085
    const initialLng = userLocation?.longitude || 76.6527

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    })

    // OpenStreetMap standard tile layer with dark styling (100% free, no API key needed)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      className: 'dark-tiles',
    }).addTo(map)

    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Update Markers when spots or selectedSpotId change
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup) return

    markersGroup.clearLayers()

    // Add User Location Marker
    if (userLocation?.latitude && userLocation?.longitude) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            position: relative;
            width: 22px;
            height: 22px;
            background: #38bdf8;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 16px #38bdf8;
          ">
            <span style="
              position: absolute;
              top: -6px;
              left: -6px;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: rgba(56, 189, 248, 0.45);
              animation: pulse 2s infinite ease-out;
            "></span>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userIcon,
        zIndexOffset: 1000,
      })
        .bindPopup(
          `<div style="color: #0f172a; font-family: inherit; font-size: 13px; font-weight: 700; padding: 4px;">📍 You are here (Current Location)</div>`
        )
        .addTo(markersGroup)
    }

    const bounds = []

    spots.forEach((spot) => {
      const isSelected = (activeSpot?.id || selectedSpotId) === spot.id
      const isClosed = spot.is_active === false || spot.status === 'closed'
      const isOccupied = !isClosed && (spot.status === 'occupied' || spot.available_spaces === 0)
      const isEV = spot.ev_charging

      const bgColor = isClosed
        ? '#64748b'
        : isOccupied
        ? '#ef4444'
        : isEV
        ? '#10b981'
        : '#6366f1'

      const borderStyle = isSelected
        ? '3px solid #facc15; box-shadow: 0 0 20px rgba(250, 204, 21, 1); transform: scale(1.15);'
        : '2px solid rgba(255,255,255,0.9); box-shadow: 0 4px 12px rgba(0,0,0,0.6);'

      const markerHtml = `
        <div style="
          background: ${bgColor};
          color: #ffffff;
          padding: 5px 10px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 700;
          font-family: system-ui, -apple-system, sans-serif;
          white-space: nowrap;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          ${borderStyle}
          transition: all 0.2s ease;
        ">
          ${isEV ? '⚡ ' : ''}${isClosed ? 'Closed' : `₹${spot.price_per_hour}/${isEV ? 'kWh' : 'h'}`}
        </div>
      `

      const customIcon = L.divIcon({
        className: 'custom-spot-marker',
        html: markerHtml,
        iconSize: [70, 28],
        iconAnchor: [35, 14],
      })

      const marker = L.marker([spot.latitude, spot.longitude], {
        icon: customIcon,
        title: spot.name,
      })

      // Marker click: sets active spot state and pan to it
      marker.on('click', () => {
        setActiveSpot(spot)
        onSelectSpot(spot.id)
        map.panTo([spot.latitude, spot.longitude], { animate: true, duration: 0.5 })
      })

      marker.addTo(markersGroup)
      bounds.push([spot.latitude, spot.longitude])
    })

    // Auto-fit bounds on initial load
    if (bounds.length > 1 && !activeSpot) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [spots, selectedSpotId, activeSpot, userLocation, onSelectSpot])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '520px', position: 'relative' }}>
      {/* The Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '520px',
          borderRadius: 'inherit',
        }}
      />

      {/* Floating Selected Spot Drawer / Action Card directly on top of the map */}
      {activeSpot && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            maxWidth: '360px',
            width: 'calc(100% - 32px)',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '16px 18px',
            zIndex: 1000,
            boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
            color: '#f8fafc',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  {activeSpot.name}
                </h3>
                {activeSpot.ev_charging && (
                  <span
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    ⚡ EV Station
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                {activeSpot.address}
              </p>
            </div>
            <button
              onClick={() => setActiveSpot(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              title="Close card"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '12px 0 16px',
              padding: '10px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                ₹{activeSpot.price_per_hour}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '3px' }}>
                /{activeSpot.ev_charging ? 'kWh' : 'hr'}
              </span>
            </div>

            {(() => {
              const activeClosed = activeSpot.is_active === false || activeSpot.status === 'closed'
              const activeOccupied = !activeClosed && (activeSpot.status === 'occupied' || activeSpot.available_spaces === 0)
              return (
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '8px',
                    background: activeClosed
                      ? 'rgba(245, 158, 11, 0.2)'
                      : activeOccupied
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(16, 185, 129, 0.2)',
                    color: activeClosed
                      ? '#fbbf24'
                      : activeOccupied
                      ? '#f87171'
                      : '#34d399',
                  }}
                >
                  {activeClosed
                    ? 'Temporarily Closed'
                    : activeOccupied
                    ? 'Fully Occupied'
                    : `${activeSpot.available_spaces ?? activeSpot.capacity} spaces available`}
                </span>
              )
            })()}
          </div>

          {activeSpot.ev_charging && activeSpot.charger_power_kw && (
            <div
              style={{
                fontSize: '0.78rem',
                color: '#34d399',
                fontWeight: 600,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ⚡ Fast Charger: {activeSpot.charger_power_kw} kW power rating
            </div>
          )}

          {/* Action Buttons: Book Now + Get Directions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(() => {
              const activeClosed = activeSpot.is_active === false || activeSpot.status === 'closed'
              const activeOccupied = !activeClosed && (activeSpot.status === 'occupied' || activeSpot.available_spaces === 0)
              const disabled = activeClosed || activeOccupied
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (!disabled) onBookSpot(activeSpot)
                  }}
                  disabled={disabled}
                  style={{
                    padding: '10px 14px',
                    background: disabled
                      ? '#475569'
                      : activeSpot.ev_charging
                      ? '#10b981'
                      : '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {activeClosed ? 'Station Closed' : activeOccupied ? 'Fully Occupied' : '📅 Book Now'}
                </button>
              )
            })()}

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeSpot.latitude},${activeSpot.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 14px',
                background: '#0284c7',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              }}
            >
              🧭 Directions
            </a>
          </div>
        </div>
      )}

      {/* Floating Legend Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          color: '#e2e8f0',
          display: 'flex',
          gap: '12px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1' }}></span> Regular
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> EV Ready
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span> Occupied
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b' }}></span> Closed
        </span>
      </div>
    </div>
  )
}
