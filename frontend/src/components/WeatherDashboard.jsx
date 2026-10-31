
/**
 * WeatherDashboard.jsx
 * Renders the full weather results panel after a successful API response.
 */

import RiskPanel from './RiskPanel';
import CacheBanner from './CacheBanner';
import ForecastStrip from './ForecastStrip';
import { assessRisk } from '../services/riskEngine';
import { cacheAge, isCacheStale } from '../services/weatherCache';

function buildSummary(weather) {
  const parts = [];

  if (weather.temperature !== null) {
    if (weather.temperature < 5) parts.push('very cold temperatures');
    else if (weather.temperature < 15) parts.push('cool temperatures');
    else if (weather.temperature < 28) parts.push('comfortable temperatures');
    else parts.push('warm to hot temperatures');
  }

  if (weather.windSpeed !== null) {
    if (weather.windSpeed > 50) parts.push('strong winds');
    else if (weather.windSpeed > 25) parts.push('moderate winds');
    else parts.push('light winds');
  }

  if (weather.precipitation !== null && weather.precipitation > 0) {
    parts.push(`${weather.precipitation} mm of precipitation`);
  }

  if (parts.length === 0) return 'Weather data retrieved successfully.';
  return `Current conditions show ${parts.join(', ')}.`;
}

function formatTimestamp(isoString) {
  if (!isoString) return null;

  try {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoString;
  }
}

export default function WeatherDashboard({ data, cacheInfo = null }) {
  const {
    location,
    weather,
    fetchedAt,
    mlRiskScore,
    mlRiskLabel,
    mlPredictionError,
  } = data;

  const observedAt = weather.observedAt
    ? formatTimestamp(weather.observedAt)
    : null;

  const displayedFetchedAt = cacheInfo?.cachedAt ?? fetchedAt;
  const fetchedFormatted = displayedFetchedAt
    ? formatTimestamp(displayedFetchedAt)
    : null;

  const summary = buildSummary(weather);
  const riskResult = assessRisk(weather);

  // Use ML prediction only for freshly fetched online weather.
  // Cached weather always uses the local risk engine.
  const useMLPrediction =
    !cacheInfo &&
    mlRiskScore !== null &&
    mlRiskScore !== undefined &&
    Number.isFinite(Number(mlRiskScore)) &&
    Boolean(mlRiskLabel);

  return (
    <section className="dashboard" id="weather">
      {cacheInfo && (
        <CacheBanner
          cachedAt={cacheInfo.cachedAt}
          isStale={isCacheStale(cacheInfo.cachedAt)}
          ageString={cacheAge(cacheInfo.cachedAt)}
        />
      )}

      <div className="dashboard-header">
        <div className="dashboard-location">
          <span className="location-pin" aria-hidden="true">📍</span>
          <div>
            <h2 className="dashboard-location-name">{location.name}</h2>
            <p className="dashboard-coords">
              {location.latitude}°N, {location.longitude}°E
            </p>
          </div>
        </div>

        <div className="dashboard-timestamps">
          {observedAt && (
            <span className="timestamp-badge">
              🕒 Observed: {observedAt}
            </span>
          )}

          {fetchedFormatted && (
            <span className="timestamp-badge secondary">
              ⬇ {cacheInfo ? 'Last saved' : 'Fetched'}: {fetchedFormatted}
            </span>
          )}
        </div>
      </div>

      <div className="weather-summary">
        <span className="summary-icon" aria-hidden="true">🌤️</span>
        <p className="summary-text">{summary}</p>
      </div>

      <RiskPanel
        riskResult={riskResult}
        mlRiskScore={mlRiskScore}
        mlRiskLabel={mlRiskLabel}
        mlPredictionError={mlPredictionError}
        useMLPrediction={useMLPrediction}
      />

      {Array.isArray(weather.forecast) && weather.forecast.length > 0 && (
        <ForecastStrip forecast={weather.forecast} />
      )}
    </section>
  );
}
