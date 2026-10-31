
/**
 * RiskPanel.jsx
 * Displays ML-predicted risk online and locally calculated risk offline.
 */

const categoryDetails = {
  Low: {
    color: '#2ecc71',
    emoji: '🟢',
  },
  Moderate: {
    color: '#f1c40f',
    emoji: '🟡',
  },
  High: {
    color: '#e67e22',
    emoji: '🟠',
  },
  'Very High': {
    color: '#e74c3c',
    emoji: '🔴',
  },
};

function getRecommendation(category) {
  switch (category) {
    case 'Low':
      return 'Conditions appear relatively favorable. Stay hydrated and remain aware of changing weather.';
    case 'Moderate':
      return 'Exercise caution while hiking. Monitor weather conditions and carry essential supplies.';
    case 'High':
      return 'Risk is elevated. Consider postponing your hike or choosing a safer route.';
    case 'Very High':
      return 'Conditions may be unsuitable for hiking. Avoid starting your hike until conditions improve.';
    default:
      return 'Stay alert and check the latest weather conditions before hiking.';
  }
}

export default function RiskPanel({
  riskResult,
  mlRiskScore,
  mlRiskLabel,
  mlPredictionError,
  useMLPrediction = false,
}) {
  if (!riskResult && !useMLPrediction) return null;

  const isML = useMLPrediction;

  const score = isML
    ? Number(mlRiskScore)
    : riskResult?.score;

  const category = isML
    ? mlRiskLabel
    : riskResult?.category;

  const categoryMeta = isML
    ? categoryDetails[category]
    : riskResult?.categoryMeta;

  const available = isML || riskResult?.available;

  const primaryFactor = riskResult?.primaryFactor;
  const recommendation = isML
    ? getRecommendation(category)
    : riskResult?.recommendation;

  const breakdown = isML
    ? []
    : (riskResult?.breakdown ?? []);

  const dataIssues = riskResult?.dataIssues ?? [];

  const categoryClass = category
    ? category.replaceAll(' ', '-').toLowerCase()
    : '';

  const circumference = Math.PI * 30;
  const offset = circumference - ((score ?? 0) / 100) * circumference;

  return (
    <div className="risk-panel" id="risk-panel" aria-label="Hiking Risk Assessment">
      <div className="risk-panel-header">
        <span className="risk-panel-icon" aria-hidden="true">
          {isML ? '🤖' : '⚡'}
        </span>
        <div>
          <h3 className="risk-panel-title">
            {isML ? 'ML Risk Prediction' : 'Edge Risk Assessment'}
          </h3>
          <p className="risk-panel-subtitle">
            {isML
              ? 'Predicted by Decision Tree Regression model'
              : 'Calculated locally from the available weather data'}
          </p>
        </div>
      </div>

      {available ? (
        <div className="risk-main">
          <div className="risk-gauge-wrap" aria-hidden="true">
            <svg className="risk-gauge" viewBox="0 0 80 50">
              <path
                d="M 10 45 A 30 30 0 0 1 70 45"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 10 45 A 30 30 0 0 1 70 45"
                fill="none"
                stroke={categoryMeta?.color ?? '#999'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{
                  transition: 'stroke-dashoffset 1s ease, stroke 0.4s ease',
                }}
              />
              <text
                x="40"
                y="42"
                textAnchor="middle"
                fill={categoryMeta?.color ?? '#fff'}
                fontSize="13"
                fontWeight="800"
                fontFamily="Outfit, sans-serif"
              >
                {Number(score).toFixed(2)}
              </text>
            </svg>
            <span className="gauge-label">/ 100</span>
          </div>

          <div className="risk-info">
            <div className={`risk-category-badge risk-${categoryClass}`}>
              <span aria-hidden="true">{categoryMeta?.emoji}</span>
              <span>{category}</span>
            </div>

            {!isML && (
              <p className="risk-primary-factor">
                <span className="risk-factor-label">Primary factor:</span>{' '}
                <strong>{primaryFactor}</strong>
              </p>
            )}

            <div className="risk-recommendation">
              <span className="rec-icon" aria-hidden="true">💡</span>
              <p className="rec-text">{recommendation}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="risk-unavailable" role="status">
          <strong>Risk estimate unavailable</strong>
          <p>{recommendation}</p>
          {dataIssues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}

      {breakdown.length > 0 && (
        <div className="risk-breakdown">
          <h4 className="breakdown-title">Score Breakdown</h4>
          <div className="breakdown-rows">
            {breakdown.map((factor) => (
              <div key={factor.label} className="breakdown-row">
                <span className="breakdown-label">{factor.label}</span>
                <span className="breakdown-value">
                  {factor.available ? factor.value : 'Unavailable'}
                </span>
                <div className="breakdown-bar-track">
                  <div
                    className="breakdown-bar-fill"
                    style={{
                      width: `${Math.min(100, (factor.points / 40) * 100)}%`,
                      background: factor.points >= 20
                        ? '#e74c3c'
                        : factor.points >= 10
                        ? '#f39c12'
                        : factor.points > 0
                        ? '#f9e547'
                        : 'rgba(255,255,255,0.1)',
                    }}
                  />
                </div>
                <span className="breakdown-pts">
                  {factor.available ? `${factor.points} pts` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isML && (
        <p className="risk-edge-note">
          Score predicted by the trained DecisionTreeRegressor model.
        </p>
      )}

      {!isML && (
        <p className="risk-edge-note">
          Risk is calculated locally on this device using the available weather data.
        </p>
      )}

      {!isML && mlPredictionError && !riskResult?.available && (
        <p className="risk-edge-note">
          ML prediction unavailable: {mlPredictionError}
        </p>
      )}
    </div>
  );
}
