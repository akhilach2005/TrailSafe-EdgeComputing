/**
 * CacheBanner.jsx
 * Displayed when weather results are served from localStorage cache
 * rather than a live network fetch.
 *
 * Props:
 *   cachedAt   {string}  - ISO 8601 timestamp when the data was cached
 *   isStale    {boolean} - True if data is older than STALE_AFTER_HOURS
 *   ageString  {string}  - Human-readable age, e.g. "2 hours ago"
 */

export default function CacheBanner({ cachedAt, isStale, ageString }) {
  // Format the absolute timestamp for the tooltip
  let absoluteTime = '';
  try {
    absoluteTime = new Date(cachedAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    absoluteTime = cachedAt ?? '';
  }

  return (
    <div
      className={`cache-banner ${isStale ? 'cache-banner--stale' : ''}`}
      role="status"
      aria-live="polite"
      title={`Data cached at: ${absoluteTime}`}
    >
      <span className="cache-banner-icon" aria-hidden="true">
        {isStale ? '⚠️' : '📦'}
      </span>
      <div className="cache-banner-text">
        <strong>
          {isStale ? 'Stale cached data' : 'Using cached weather data'}
        </strong>
        {' — '}
        {isStale
          ? `Last updated ${ageString}. Data may no longer reflect current conditions.`
          : `Fetched ${ageString}. Backend was unreachable; showing last saved result.`}
      </div>
      {isStale && (
        <span className="cache-banner-badge">Stale</span>
      )}
    </div>
  );
}
