import SpotShareLogo from './SpotShareLogo.jsx'

/** Shared floating navigation header for Customer Login and Host Hub auth views. */
export default function AuthTopBar({ mode = 'customer', onSwitchMode, onBackToHome }) {
  const handleHome = onBackToHome || (() => { window.location.href = '/' })

  return (
    <header className="auth-nav-shell">
      <nav className="auth-nav" aria-label="Authentication navigation">
        <button
          type="button"
          className="auth-nav-brand"
          onClick={handleHome}
        >
          <SpotShareLogo size={34} category={mode === 'host' ? 'ev' : 'parking'} />
          <span>
            <span className="brand-text-spot">Spot</span>
            <span className="brand-text-share">Share</span>
          </span>
        </button>

        <div className="auth-nav-actions">
          {onSwitchMode && (
            <button
              type="button"
              className={mode === 'host' ? 'btn-auth-switch-customer' : 'btn-auth-switch-host'}
              onClick={onSwitchMode}
            >
              {mode === 'host' ? 'Customer Login' : 'Host Hub'}
            </button>
          )}
          <button
            type="button"
            className="btn-auth-back-home"
            onClick={handleHome}
          >
            &larr; Back to Home
          </button>
        </div>
      </nav>
    </header>
  )
}

