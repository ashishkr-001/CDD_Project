import React from 'react'

export default function FilterBar({
  filters,
  onChange,
  onReset,
  onUseLocation,
  activeCategory = 'parking',
}) {
  const set = (patch) => onChange({ ...filters, ...patch })

  const searchPlaceholder =
    activeCategory === 'parking'
      ? 'Search location, area or landmark...'
      : 'Search charging stations, area or landmark...'

  return (
    <div className={`filter-card theme-${activeCategory}`}>
      {/* Search Input Row */}
      <div className="search-bar-row">
        <div className="search-input-wrap">
          <span className="search-icon" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7.5" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </span>
          <input
            type="search"
            className="search-input"
            placeholder={searchPlaceholder}
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            aria-label="Search"
          />
        </div>
        <button type="button" className="btn-location" onClick={onUseLocation} title="Use current location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="7" />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
          </svg>
          <span>Use My Location</span>
        </button>
      </div>

      {/* Filter Row Controls */}
      <div className="filter-controls-row">
        {activeCategory === 'parking' ? (
          /* Parking Filters */
          <>
            <div className="filter-group">
              <span className="filter-group-label">Vehicle Type</span>
              <div className="pill-group">
                {['all', 'car', 'bike', 'van', 'covered'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`pill-btn ${filters.vehicleType === type ? 'active' : ''}`}
                    onClick={() => set({ vehicleType: type })}
                  >
                    {type === 'all'
                      ? 'All'
                      : type === 'covered'
                      ? 'Covered'
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Distance</span>
              <select
                className="filter-select"
                value={filters.maxDistanceKm}
                onChange={(e) => set({ maxDistanceKm: Number(e.target.value) })}
              >
                <option value={20}>All</option>
                <option value={2}>&lt; 2 km</option>
                <option value={5}>&lt; 5 km</option>
                <option value={10}>&lt; 10 km</option>
                <option value={20}>&lt; 20 km</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Price (₹/hr)</span>
              <select
                className="filter-select"
                value={filters.maxPrice}
                onChange={(e) => set({ maxPrice: Number(e.target.value) })}
              >
                <option value={200}>Any</option>
                <option value={30}>Up to ₹30</option>
                <option value={40}>Up to ₹40</option>
                <option value={50}>Up to ₹50</option>
                <option value={70}>Up to ₹70</option>
                <option value={100}>Up to ₹100</option>
              </select>
            </div>
          </>
        ) : (
          /* EV Charging Filters */
          <>
            <div className="filter-group">
              <span className="filter-group-label">Charger Type</span>
              <div className="pill-group">
                {['all', 'ac', 'dc'].map((cType) => (
                  <button
                    key={cType}
                    type="button"
                    className={`pill-btn ${filters.chargerType === cType ? 'active' : ''}`}
                    onClick={() => set({ chargerType: cType })}
                  >
                    {cType === 'all' ? 'All' : cType.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Connector Type</span>
              <select
                className="filter-select"
                value={filters.connectorType || 'all'}
                onChange={(e) => set({ connectorType: e.target.value })}
              >
                <option value="all">All</option>
                <option value="type2">Type 2</option>
                <option value="ccs2">CCS2</option>
                <option value="chademo">CHAdeMO</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Charging Power</span>
              <select
                className="filter-select"
                value={filters.minPower || 'any'}
                onChange={(e) => set({ minPower: e.target.value === 'any' ? 0 : Number(e.target.value) })}
              >
                <option value="any">Any</option>
                <option value={7}>7.4 kW+</option>
                <option value={11}>11 kW+</option>
                <option value={22}>22 kW Fast</option>
                <option value={50}>50 kW+ Rapid</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Distance</span>
              <select
                className="filter-select"
                value={filters.maxDistanceKm}
                onChange={(e) => set({ maxDistanceKm: Number(e.target.value) })}
              >
                <option value={20}>All</option>
                <option value={2}>&lt; 2 km</option>
                <option value={5}>&lt; 5 km</option>
                <option value={10}>&lt; 10 km</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Price (₹/kWh)</span>
              <select
                className="filter-select"
                value={filters.maxPrice}
                onChange={(e) => set({ maxPrice: Number(e.target.value) })}
              >
                <option value={200}>Any</option>
                <option value={15}>Up to ₹15</option>
                <option value={20}>Up to ₹20</option>
                <option value={25}>Up to ₹25</option>
                <option value={30}>Up to ₹30</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Owner Type</span>
              <div className="pill-group">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'public', label: 'Public' },
                  { id: 'private', label: 'Private Owners' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pill-btn ${(filters.ownerType || 'all') === item.id ? 'active' : ''}`}
                    onClick={() => set({ ownerType: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sort By Dropdown */}
        <div className="filter-group">
          <span className="filter-group-label">Sort By</span>
          <select
            className="filter-select"
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value })}
          >
            <option value="distance">Nearest</option>
            <option value="price">Cheapest</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {/* Available Now Switch */}
        <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
          <div
            className="toggle-wrap"
            onClick={() => set({ availableOnly: !filters.availableOnly })}
            role="switch"
            aria-checked={filters.availableOnly}
          >
            <div className={`switch ${filters.availableOnly ? 'on' : ''}`}>
              <div className="switch-dot" />
            </div>
            <span>Available Now</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="filter-actions">
          <button type="button" className="btn-apply" onClick={() => {}}>
            Apply Filters
          </button>
          <button type="button" className="btn-reset" onClick={onReset}>
            <span>↻</span>
            <span>Reset Filters</span>
          </button>
        </div>
      </div>
    </div>
  )
}
