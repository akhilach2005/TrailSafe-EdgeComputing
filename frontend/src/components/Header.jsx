/**
 * Header.jsx
 * Top navigation bar — logo, project name, and subtitle.
 */

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        {/* Mountain icon SVG */}
        <div className="logo">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 52L22 20L32 36L40 24L60 52H4Z"
              fill="url(#mountainGrad)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M38 24L45 16L60 52H30L38 24Z"
              fill="url(#mountainGrad2)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="14" r="5" fill="url(#sunGrad)" opacity="0.9" />
            <defs>
              <linearGradient id="mountainGrad" x1="4" y1="52" x2="32" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1e8449" />
                <stop offset="100%" stopColor="#52be80" />
              </linearGradient>
              <linearGradient id="mountainGrad2" x1="38" y1="52" x2="52" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1a5276" />
                <stop offset="100%" stopColor="#5dade2" />
              </linearGradient>
              <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f9e547" />
                <stop offset="100%" stopColor="#f39c12" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="header-text">
          <span className="header-brand">TrailSafe</span>
          <span className="header-subtitle">Hiking Risk Prediction System</span>
        </div>

        <nav className="header-nav">
          <a href="#destination" className="nav-link">Destinations</a>
          <a href="#weather" className="nav-link">Weather</a>
          <span className="nav-badge">Part 2</span>
        </nav>
      </div>
    </header>
  );
}
