
function weatherEmoji(code) {
  if (code == null) return '❓';
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '❓';
}

function formatHour(isoTime) {
  if (!isoTime) return '—';

  const match = isoTime.match(/T(\d{2}):\d{2}/);
  if (!match) return isoTime;

  const hour = Number(match[1]);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour} ${period}`;
}

function getRiskClass(category) {
  return `risk-${String(category || 'low').replaceAll(' ', '-').toLowerCase()}`;
}

function displayValue(value, unit = '') {
  return value == null ? '—' : `${value}${unit}`;
}

export default function ForecastStrip({ forecast }) {
  if (!Array.isArray(forecast) || forecast.length === 0) return null;

  return (
    <section className="forecast-strip" aria-label="Hourly risk forecast">
      <div className="forecast-header">
        <span className="forecast-icon" aria-hidden="true">🕐</span>
        <h4 className="forecast-title">
          Hourly Weather &amp; Risk Forecast
        </h4>
      </div>

      <div className="forecast-hours">
        {forecast.map((entry, idx) => {
          const score = entry.mlRiskScore;
          const category = entry.mlRiskLabel;
          const hasMLScore =
            score != null && Number.isFinite(Number(score)) && category;

          const isWet =
            entry.precipitation != null && Number(entry.precipitation) > 0;

          const isWorsening =
            (entry.weatherCode != null && entry.weatherCode >= 63) ||
            (entry.windSpeed != null && entry.windSpeed > 40) ||
            (entry.precipitation != null && entry.precipitation > 3);

          return (
            <article
              key={entry.time || idx}
              className={`forecast-hour ${isWorsening ? 'forecast-hour--warn' : ''}`}
              title={entry.weatherDescription || ''}
            >
              <span className="fh-time">{formatHour(entry.time)}</span>

              <span className="fh-icon" role="img" aria-label={entry.weatherDescription || 'Weather'}>
                {weatherEmoji(entry.weatherCode)}
              </span>

              <span className="fh-description">
                {entry.weatherDescription || 'Condition unavailable'}
              </span>

              <strong className={`fh-risk-score ${getRiskClass(category)}`}>
                {hasMLScore ? Number(score).toFixed(2) : '—'}
                <small>/100</small>
              </strong>

              <span className={`fh-risk-label ${getRiskClass(category)}`}>
                {hasMLScore ? category : 'Prediction unavailable'}
              </span>

              

              {isWorsening && (
                <span
                  className="fh-warn-dot"
                  title="Potentially worsening conditions"
                  aria-label="Potentially worsening conditions"
                >
                  ⚠️
                </span>
              )}

              {entry.mlPredictionError && (
                <small className="fh-error">
                  ML prediction unavailable
                </small>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
