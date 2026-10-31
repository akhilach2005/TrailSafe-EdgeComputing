
/**
 * LocationSelector.jsx
 * Dropdown of predefined trekking destinations + Current Location.
 */



const LOCATIONS = [
  { slug: 'current-location', label: '📍 Current Location' },
  { slug: 'tirumala', label: 'Tirumala, Andhra Pradesh' },
  { slug: 'araku-valley', label: 'Araku Valley, Andhra Pradesh' },
  { slug: 'nandi-hills', label: 'Nandi Hills, Karnataka' },
  { slug: 'ooty', label: 'Ooty, Tamil Nadu' },
  { slug: 'manali', label: 'Manali, Himachal Pradesh' },
  { slug: 'kudremukh', label: 'Kudremukh, Karnataka' },
  { slug: 'munnar', label: 'Munnar, Kerala' },
  { slug: 'kodaikanal', label: 'Kodaikanal, Tamil Nadu' },
  { slug: 'coorg', label: 'Coorg (Madikeri), Karnataka' },
  { slug: 'chikmagalur', label: 'Chikmagalur (Mullayanagiri), Karnataka' },
];


export default function LocationSelector({
  selectedLocation,
  onLocationChange,
  onAnalyze,
  isLoading,
}) {
  return (
    <section className="selector-section" id="destination">
      <div className="selector-card">
        <div className="selector-header">
          <span className="selector-icon">🗺️</span>
          <div>
            <h2 className="selector-title">Choose Your Trekking Destination</h2>
            <p className="selector-desc">
              Select a saved destination or use your current location for a more precise weather assessment.
            </p>
          </div>
        </div>

        <div className="selector-controls">
          <div className="select-wrapper">
            <select
              id="location-select"
              className="location-select"
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              disabled={isLoading}
              aria-label="Select trekking destination"
            >
              <option value="">— Select a destination —</option>
              {LOCATIONS.map((loc) => (
                <option key={loc.slug} value={loc.slug}>
                  {loc.label}
                </option>
              ))}
            </select>
            <span className="select-arrow">▾</span>
          </div>

          <button
            id="analyze-btn"
            className={`analyze-btn ${isLoading ? 'loading' : ''}`}
            onClick={onAnalyze}
            disabled={!selectedLocation || isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Fetching…
              </>
            ) : (
              <>
                <span aria-hidden="true">⛰️</span>
                Analyze Weather
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
