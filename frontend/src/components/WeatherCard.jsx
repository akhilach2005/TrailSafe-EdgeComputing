/**
 * WeatherCard.jsx
 * A single metric card displaying one weather parameter.
 *
 * Props:
 *   icon    {string}  - Emoji icon for the parameter
 *   label   {string}  - Display label (e.g. "Temperature")
 *   value   {number|null} - Numeric value; null renders a dash
 *   unit    {string}  - Unit string (e.g. "°C", "%", "mm", "km/h")
 *   color   {string}  - CSS custom property name for the card accent color
 */

export default function WeatherCard({ icon, label, value, unit, color }) {
  const displayValue = value !== null && value !== undefined ? value : '—';

  return (
    <div className="weather-card" style={{ '--card-accent': `var(${color})` }}>
      <div className="card-icon-wrap">
        <span className="card-icon" role="img" aria-label={label}>
          {icon}
        </span>
      </div>
      <div className="card-body">
        <span className="card-label">{label}</span>
        <div className="card-value-row">
          <span className="card-value">{displayValue}</span>
          {value !== null && value !== undefined && (
            <span className="card-unit">{unit}</span>
          )}
        </div>
      </div>
      {/* Decorative glow dot */}
      <div className="card-glow" aria-hidden="true" />
    </div>
  );
}
