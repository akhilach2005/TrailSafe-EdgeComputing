/**
 * weatherCache.js
 * localStorage-based per-destination weather cache.
 *
 * Cache key format : trailsafe_cache_v1_<slug>
 * Cache entry shape:
 * {
 *   version  : 1,
 *   slug     : string,
 *   data     : Object,   // full API response from the backend
 *   cachedAt : string,   // ISO 8601 timestamp of when data was saved
 * }
 *
 * Design decisions:
 *  - Each destination gets its own key so switching locations never mixes data.
 *  - Version field allows future migrations without crashes.
 *  - All reads are wrapped in try/catch so corrupted entries never crash the app.
 *  - Staleness is a display concern only; cached data is always returned to the
 *    caller — the UI component decides whether to show a stale-data warning.
 */

const CACHE_PREFIX = 'trailsafe_cache_v1_';
const CACHE_VERSION = 1;

// After this many hours without a refresh, data is considered stale.
export const STALE_AFTER_HOURS = 6;

/**
 * Builds the localStorage key for a given location slug.
 * @param {string} slug  e.g. "tirumala"
 */
function cacheKey(slug) {
  return `${CACHE_PREFIX}${slug}`;
}

/**
 * Saves a full API response to the cache for a given slug.
 * Silently fails if localStorage is unavailable (e.g. private browsing quota).
 *
 * @param {string} slug  - Location slug
 * @param {Object} data  - Full JSON response from GET /api/weather
 */
export function saveToCache(slug, data) {
  if (!slug || !isUsableWeatherResponse(slug, data)) return;

  const entry = {
    version: CACHE_VERSION,
    slug,
    data,
    cachedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(cacheKey(slug), JSON.stringify(entry));
  } catch (err) {
    // localStorage may throw when storage quota is exceeded or in private mode
    console.warn('[WeatherCache] Could not write to localStorage:', err.message);
  }
}

/**
 * Loads a cached weather entry for a given slug.
 * Returns null if no valid entry exists.
 *
 * @param {string} slug  - Location slug
 * @returns {{ data: Object, cachedAt: string } | null}
 */
export function loadFromCache(slug) {
  if (!slug) return null;

  let raw;
  try {
    raw = localStorage.getItem(cacheKey(slug));
  } catch {
    return null; // localStorage not accessible
  }

  if (!raw) return null;

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch {
    // Corrupted JSON — remove it and return null
    try { localStorage.removeItem(cacheKey(slug)); } catch { /* ignore */ }
    return null;
  }

  // Basic structural validation
  if (
    !entry ||
    entry.version !== CACHE_VERSION ||
    entry.slug !== slug ||
    !isUsableWeatherResponse(slug, entry.data) ||
    typeof entry.cachedAt !== 'string' ||
    !Number.isFinite(Date.parse(entry.cachedAt))
  ) {
    return null;
  }

  return { data: entry.data, cachedAt: entry.cachedAt };
}

function isUsableWeatherResponse(slug, data) {
  if (
    !data ||
    data.location?.slug !== slug ||
    !Number.isFinite(data.location?.latitude) ||
    !Number.isFinite(data.location?.longitude) ||
    !data.weather ||
    typeof data.weather !== 'object'
  ) {
    return false;
  }

  const { temperature, humidity, precipitation, windSpeed } = data.weather;
  const validCurrentWeather = (
    Number.isFinite(temperature) &&
    temperature >= -100 &&
    temperature <= 100 &&
    Number.isFinite(humidity) &&
    humidity >= 0 &&
    humidity <= 100 &&
    Number.isFinite(precipitation) &&
    precipitation >= 0 &&
    Number.isFinite(windSpeed) &&
    windSpeed >= 0
  );

  const forecast = data.weather.forecast;
  const validForecast = forecast === undefined || (
    Array.isArray(forecast) &&
    forecast.every((entry) => entry && typeof entry === 'object')
  );
  const isValidWeatherCode = (code) => Number.isInteger(code) && code >= 0 && code <= 99;
  const hasWeatherCode = isValidWeatherCode(data.weather.weatherCode) ||
    (Array.isArray(forecast) && forecast.some((entry) => isValidWeatherCode(entry.weatherCode)));

  return validCurrentWeather && validForecast && hasWeatherCode;
}

/**
 * Returns true if a cache entry is older than STALE_AFTER_HOURS.
 *
 * @param {string} cachedAt  - ISO 8601 timestamp from the cache entry
 * @param {number} [maxAgeHours]  - Override the default staleness threshold
 */
export function isCacheStale(cachedAt, maxAgeHours = STALE_AFTER_HOURS) {
  if (!cachedAt) return true;
  try {
    const cachedMs = new Date(cachedAt).getTime();
    if (!Number.isFinite(cachedMs)) return true;
    const nowMs = Date.now();
    const ageHours = (nowMs - cachedMs) / (1000 * 60 * 60);
    return ageHours > maxAgeHours;
  } catch {
    return true;
  }
}

/**
 * Returns a human-readable age string for a cachedAt timestamp.
 * e.g. "2 hours ago", "45 minutes ago", "3 days ago"
 *
 * @param {string} cachedAt  - ISO 8601 timestamp
 */
export function cacheAge(cachedAt) {
  if (!cachedAt) return 'unknown time';
  try {
    const diffMs = Date.now() - new Date(cachedAt).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return 'unknown time';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)  return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } catch {
    return 'unknown time';
  }
}
