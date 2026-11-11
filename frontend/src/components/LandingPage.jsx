import { useEffect, useMemo, useRef, useState } from 'react'
import SpotShareLogo from './SpotShareLogo.jsx'
import './LandingPage.css'

const TAGLINE_WORDS = (
  'Know your spot is waiting before you start the engine. ' +
  'SpotShare lets Mysuru vehicle owners book live parking bays and EV chargers ahead of time.'
).split(' ')

const DRIVER_STEPS = [
  {
    num: '01',
    title: 'Search nearby bays or chargers',
    detail:
      'Filter live locations across Mysuru by distance, vehicle type, AC or DC charger output, connector type, and hourly rate.',
  },
  {
    num: '02',
    title: 'Reserve your exact time window',
    detail:
      'Pick your arrival and departure times from 30 minutes up to 24 hours with instant conflict checks and clear price estimates.',
  },
  {
    num: '03',
    title: 'Navigate directly and check in',
    detail:
      'Launch Google Maps GPS directions right from your spot card or map drawer, and manage or cancel bookings anytime.',
  },
]

const HOST_STEPS = [
  {
    num: '01',
    title: 'Publish your EV bay in minutes',
    detail:
      'Enter your station address or auto detect GPS coordinates, set your hourly price, kW power rating, bay count, and amenities.',
  },
  {
    num: '02',
    title: 'Pause anytime when out of town',
    detail:
      'Use Turn Off / Close to pause new bookings temporarily while preserving your listing details, rating, and booking history.',
  },
  {
    num: '03',
    title: 'Monitor live bookings and earnings',
    detail:
      'View active reservations, 6 hour bay utilization, and total booked revenue from one dedicated Host Hub dashboard.',
  },
]

const FAQS = [
  {
    q: 'How long can I book a parking spot or EV charger for?',
    a: 'You can reserve any open bay from 30 minutes up to 24 hours. SpotShare checks live availability for your chosen arrival and departure times and shows the total estimated cost before you confirm.',
  },
  {
    q: 'Which vehicle types and EV chargers are supported?',
    a: 'Parking hubs support cars, bikes, and vans, with filters for covered spaces and 24/7 CCTV. EV listings cover home AC chargers (7.4 kW and 11 kW Type 2) as well as commercial fast AC and DC stations (22 kW and 50 kW CCS2).',
  },
  {
    q: 'Can I cancel a reservation if my plans change?',
    a: 'Yes. Confirmed bookings that have not started or checked in can be cancelled anytime from My Bookings, freeing up the bay immediately for other vehicle owners.',
  },
  {
    q: 'How do I get directions to my booked spot or charger?',
    a: 'Every spot card, interactive map pin, and booking confirmation voucher includes a one tap Google Maps link that opens turn by turn GPS directions straight to the location.',
  },
  {
    q: 'Can I reserve a spot in advance, or only for right now?',
    a: 'You can do both. Book an open bay immediately for a current trip, or schedule your arrival and departure times ahead of time so a space is waiting when you arrive.',
  },
  {
    q: 'Are the parking spaces and chargers safe and monitored?',
    a: 'Yes. Every listing shows verified site amenities upfront, such as covered bays, 24/7 security, CCTV cameras, and lighting, so you can choose a spot you trust before booking.',
  },
]

function TaglineRevealSection() {
  const sectionRef = useRef(null)
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      setActiveCount(TAGLINE_WORDS.length)
      return
    }

    let rafId = 0
    const updateProgress = () => {
      rafId = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const start = vh * 0.85
      const end = vh * 0.25
      const raw = (start - rect.top) / Math.max(1, start - end)
      const clamped = Math.max(0, Math.min(1, raw))
      const count = Math.round(clamped * TAGLINE_WORDS.length)
      setActiveCount((prev) => (count > prev ? count : prev))
    }

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateProgress)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          updateProgress()
          window.addEventListener('scroll', onScroll, { passive: true })
        }
      },
      { threshold: 0.05 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    updateProgress()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <section ref={sectionRef} className="landing-tagline-section" aria-label="SpotShare mission">
      <div className="landing-container landing-tagline-wrap">
        <p className="landing-tagline-text">
          {TAGLINE_WORDS.map((word, idx) => (
            <span
              key={`${word}-${idx}`}
              className={`tagline-word ${idx < activeCount ? 'is-revealed' : ''}`}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

export default function LandingPage({ spots = [], onOpenAuth, isLeaving = false }) {
  const [previewCategory, setPreviewCategory] = useState('ev')
  const [flowRole, setFlowRole] = useState('driver')
  const [openFaqIdx, setOpenFaqIdx] = useState(-1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const els = document.querySelectorAll('.landing-reveal')
    if (!els.length) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileMenuOpen])

  const parkingSpots = useMemo(() => spots.filter((s) => !s.ev_charging), [spots])
  const evSpots = useMemo(() => spots.filter((s) => s.ev_charging), [spots])

  const previewList = useMemo(
    () => (previewCategory === 'ev' ? evSpots : parkingSpots),
    [previewCategory, evSpots, parkingSpots]
  )

  const rateRange = useMemo(() => {
    const prices = spots
      .map((s) => Number(s.price_per_hour))
      .filter((n) => Number.isFinite(n) && n >= 0)
    if (!prices.length) return '₹14–₹35'
    const min = Math.round(Math.min(...prices))
    const max = Math.round(Math.max(...prices))
    return min === max ? `₹${min}` : `₹${min}–₹${max}`
  }, [spots])

  const scrollToSection = (id) => {
    setMobileMenuOpen(false)
    const target = document.getElementById(id)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`landing-page ${isLeaving ? 'is-leaving' : 'is-entering'}`}>
      <a href="#landing-main" className="landing-skip-link">
        Skip to content
      </a>

      {/* Sticky Compact Navigation Bar */}
      <header className="landing-nav-shell">
        <nav className="landing-nav" aria-label="Primary navigation">
          <a
            href="#top"
            className="landing-brand"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <SpotShareLogo size={34} category="parking" />
            <span className="landing-brand-text">
              <span className="brand-text-spot">Spot</span>
              <span className="brand-text-share">Share</span>
            </span>
          </a>

          <div className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('features')}>
              Features
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('how-it-works')}>
              How it works
            </button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('faq')}>
              FAQ
            </button>
          </div>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn-landing-host"
              onClick={() => onOpenAuth('host')}
            >
              Host Hub
            </button>
            <button
              type="button"
              className="btn-landing-login"
              onClick={() => onOpenAuth('login')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Login</span>
            </button>

            <button
              type="button"
              className="landing-mobile-toggle"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Full-height Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="landing-mobile-panel" role="dialog" aria-label="Mobile navigation">
            <div className="landing-mobile-links">
              <button type="button" style={{ '--stagger': '0ms' }} onClick={() => scrollToSection('features')}>
                Features
              </button>
              <button type="button" style={{ '--stagger': '60ms' }} onClick={() => scrollToSection('how-it-works')}>
                How it works
              </button>
              <button type="button" style={{ '--stagger': '120ms' }} onClick={() => scrollToSection('faq')}>
                FAQ
              </button>
            </div>
            <div className="landing-mobile-ctas">
              <button
                type="button"
                className="btn-landing-login"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('login') }}
              >
                Login as Customer or Host
              </button>
              <button
                type="button"
                className="btn-landing-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('host') }}
              >
                Open Host Hub Login
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="landing-main">
        {/* Hero Section */}
        <section id="top" className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-eyebrow">
                <span className="landing-live-dot" aria-hidden="true" />
                <span>{spots.length || 16} verified parking &amp; EV locations across Mysuru</span>
              </div>

              <h1 className="landing-hero-title">
                Find nearby parking
                <br />
                and EV chargers in seconds
              </h1>

              <p className="landing-hero-sub">
                Compare real time bay availability, kW charging output, and transparent hourly rates before you drive, or share your home EV charger when your driveway is free.
              </p>

              <div className="landing-hero-actions">
                <button
                  type="button"
                  className="btn-landing-primary"
                  onClick={() => onOpenAuth('login')}
                >
                  <span>Reserve a spot</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="btn-landing-secondary"
                  onClick={() => onOpenAuth('host')}
                >
                  List your EV charger
                </button>
              </div>

              <div className="landing-proof-strip">
                <span className="landing-proof-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Instant time window locking
                </span>
                <span className="landing-proof-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Free cancellation before arrival
                </span>
              </div>
            </div>

            {/* Interactive Marketplace Preview Card */}
            <div className="landing-preview-card" aria-label="Live marketplace preview">
              <div className="preview-card-header">
                <div>
                  <span className="preview-kicker">Live Availability Preview</span>
                  <h2 className="preview-heading">Mysuru</h2>
                </div>
                <div className="preview-tabs" role="tablist" aria-label="Preview category">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewCategory === 'ev'}
                    className={`preview-tab ${previewCategory === 'ev' ? 'active ev' : ''}`}
                    onClick={() => setPreviewCategory('ev')}
                  >
                    EV Charging ({evSpots.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewCategory === 'parking'}
                    className={`preview-tab ${previewCategory === 'parking' ? 'active parking' : ''}`}
                    onClick={() => setPreviewCategory('parking')}
                  >
                    Parking ({parkingSpots.length})
                  </button>
                </div>
              </div>

              <div className="preview-spots-list">
                {previewList.map((spot) => {
                  const isClosed = spot.is_active === false || spot.status === 'closed'
                  const free = isClosed ? 0 : Math.max(0, spot.available_spaces ?? 0)
                  return (
                    <div
                      key={spot.id}
                      className="preview-spot-row"
                      onClick={() => onOpenAuth('login')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onOpenAuth('login')
                        }
                      }}
                    >
                      <img
                        src={spot.image_url || `/images/spots/${spot.id}.jpg`}
                        alt={spot.name}
                        className="preview-spot-img"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = spot.ev_charging
                            ? 'https://images.unsplash.com/photo-1751553822302-b8d5934a76b5?auto=format&fit=crop&w=300&h=200&q=80'
                            : 'https://images.unsplash.com/photo-1619026457031-dafc4b5300a5?auto=format&fit=crop&w=300&h=200&q=80'
                        }}
                      />
                      <div className="preview-spot-meta">
                        <div className="preview-spot-title">{spot.name}</div>
                        <div className="preview-spot-sub">{spot.address}</div>
                        <div className="preview-spot-chips">
                          {spot.ev_charging && spot.charger_power_kw && (
                            <span className="preview-chip preview-chip-ev">
                              {spot.charger_power_kw} kW
                            </span>
                          )}
                          <span className={`preview-chip ${isClosed ? 'preview-chip-closed' : free > 0 ? 'preview-chip-ok' : 'preview-chip-full'}`}>
                            {isClosed ? 'Closed' : free > 0 ? `${free} bays open` : 'Occupied'}
                          </span>
                        </div>
                      </div>
                      <div className="preview-spot-price">
                        <strong>₹{Number(spot.price_per_hour).toFixed(0)}</strong>
                        <span>{spot.ev_charging ? '/kWh' : '/hr'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="preview-card-footer">
                <span className="preview-footer-note">
                  Select any spot above to reserve your time window
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Project Proof / Key Metrics Strip */}
        <section className="landing-stats-band landing-reveal">
          <div className="landing-container landing-stats-grid">
            <div className="landing-stat-box">
              <span className="landing-stat-num">{parkingSpots.length || 8}</span>
              <span className="landing-stat-label">Mysuru parking lots</span>
            </div>
            <div className="landing-stat-box">
              <span className="landing-stat-num">{evSpots.length || 8}</span>
              <span className="landing-stat-label">AC &amp; DC EV stations</span>
            </div>
            <div className="landing-stat-box">
              <span className="landing-stat-num">{rateRange}</span>
              <span className="landing-stat-label">Hourly parking &amp; EV rates</span>
            </div>
            <div className="landing-stat-box">
              <span className="landing-stat-num">30m–24h</span>
              <span className="landing-stat-label">Flexible booking windows</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="landing-section landing-reveal">
          <div className="landing-container">
            <div className="landing-section-head">
              <span className="landing-section-kicker">Platform Capabilities</span>
              <h2 className="landing-section-title">Everything vehicle owners and charger hosts need</h2>
            </div>

            <div className="landing-features-grid">
              <article className="landing-feature-card">
                <div className="feature-icon-box icon-blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3>Live Time Window Availability</h3>
                <p>
                  Reservations validate exact start and end intervals inside atomic database transactions so overlapping bookings never slip through.
                </p>
              </article>

              <article className="landing-feature-card">
                <div className="feature-icon-box icon-emerald">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3>Smart EV &amp; Parking Filters</h3>
                <p>
                  Narrow down stations by AC or DC charger type, Type 2 or CCS2 connector, minimum kW rating, vehicle size, distance, and hourly price.
                </p>
              </article>

              <article className="landing-feature-card">
                <div className="feature-icon-box icon-blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                </div>
                <h3>Interactive Map &amp; GPS Routing</h3>
                <p>
                  Explore OpenStreetMap pins color coded by availability and EV readiness, then launch Google Maps turn by turn directions in one tap.
                </p>
              </article>

              <article className="landing-feature-card">
                <div className="feature-icon-box icon-emerald">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <h3>Instant Vouchers &amp; Easy Cancellation</h3>
                <p>
                  Receive a digital confirmation voucher right after booking, track active bays in My Bookings, and cancel anytime before arrival.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Mandatory Word-by-Word Tagline Reveal */}
        <TaglineRevealSection />

        {/* How It Works (Drivers / Hosts Switcher) */}
        <section id="how-it-works" className="landing-section landing-section-alt landing-reveal">
          <div className="landing-container">
            <div className="landing-section-head landing-section-head-wide">
              <span className="landing-section-kicker">How SpotShare Works</span>
              <h2 className="landing-section-title">Park, charge, or host in three simple steps</h2>
              <div className="landing-role-switch" role="tablist" aria-label="Workflow role">
                <button
                  type="button"
                  role="tab"
                  aria-selected={flowRole === 'driver'}
                  className={`role-switch-btn ${flowRole === 'driver' ? 'active' : ''}`}
                  onClick={() => setFlowRole('driver')}
                >
                  For Vehicle Owners
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={flowRole === 'host'}
                  className={`role-switch-btn ${flowRole === 'host' ? 'active host' : ''}`}
                  onClick={() => setFlowRole('host')}
                >
                  For Charger Hosts
                </button>
              </div>
            </div>

            <div className="landing-steps-grid">
              {(flowRole === 'driver' ? DRIVER_STEPS : HOST_STEPS).map((step) => (
                <div key={step.num} className="landing-step-card">
                  <span className={`step-num-pill ${flowRole === 'host' ? 'host' : ''}`}>{step.num}</span>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Host Hub Showcase */}
        <section id="for-hosts" className="landing-section landing-reveal">
          <div className="landing-container landing-host-wrap">
            <div className="landing-section-head">
              <span className="landing-section-kicker kicker-emerald">SpotShare Host Hub</span>
              <h2 className="landing-section-title">
                Built for private charger owners and commercial lots
              </h2>
              <p className="landing-section-sub">
                Publish your EV charging station with GPS detection, monitor bookings and revenue in real time, and pause availability whenever you travel without deleting your station.
              </p>
            </div>

            <div className="landing-host-card">
              <ul className="landing-host-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>One click Turn Off / Close keeps your listing and history safe while away</span>
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Monitor active bookings, booked value, and available bays from one dashboard</span>
                </li>
              </ul>

              <div className="landing-host-cta-row">
                <button
                  type="button"
                  className="btn-landing-host-cta"
                  onClick={() => onOpenAuth('host')}
                >
                  <span>Open Host Login</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="landing-section landing-section-alt landing-reveal">
          <div className="landing-container landing-faq-wrap">
            <div className="landing-section-head">
              <h2 className="landing-section-title">Frequently asked questions</h2>
            </div>

            <div className="landing-faq-list">
              {FAQS.map((item, idx) => {
                const isOpen = openFaqIdx === idx
                return (
                  <div key={item.q} className={`landing-faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="landing-faq-trigger"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                    >
                      <span>{item.q}</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="faq-chevron"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && <p className="landing-faq-answer">{item.a}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SpotShareLogo size={28} category="parking" />
              <span className="landing-brand-text" style={{ fontSize: '1.05rem' }}>
                <span className="brand-text-spot">Spot</span>
                <span className="brand-text-share">Share</span>
              </span>
            </div>
            <p className="landing-footer-note">
              Find, compare, and reserve verified parking bays and EV chargers across Mysuru.
            </p>
          </div>

          <div className="landing-footer-meta">
            <span className="landing-footer-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Mysuru, Karnataka</span>
            </span>
            <button
              type="button"
              className="landing-footer-top-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <span>Back to top</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

