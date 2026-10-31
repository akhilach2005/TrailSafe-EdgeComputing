
/**
 * App.jsx
 * Root component for TrailSafe.
 */

import { useState } from 'react';
import Header from './components/Header';
import LocationSelector from './components/LocationSelector';
import WeatherDashboard from './components/WeatherDashboard';
import { fetchWeather } from './services/weatherApi';
import { assessRisk } from './services/riskEngine';
import { loadFromCache, saveToCache } from './services/weatherCache';

const CURRENT_LOCATION = 'current-location';

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error('Your browser does not support location services. Please choose a saved destination.')
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let message;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission was denied. Allow location access in your browser settings or choose a saved destination.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Your current location could not be determined. Please try again or choose a saved destination.';
            break;
          case error.TIMEOUT:
            message = 'Getting your location took too long. Please try again.';
            break;
          default:
            message = 'Unable to retrieve your current location.';
        }

        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

export default function App() {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [status, setStatus] = useState('idle');
  const [weatherData, setWeatherData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  async function handleAnalyze() {
    if (!selectedLocation) return;

    setStatus('loading');
    setWeatherData(null);
    setErrorMessage(null);
    setCacheInfo(null);

    const isCurrentLocation = selectedLocation === CURRENT_LOCATION;

    try {
      let data;

      if (isCurrentLocation) {
        // Ask the browser for the device's current coordinates.
        const coordinates = await getCurrentPosition();

        // Send the coordinates to the backend.
        data = await fetchWeather(coordinates);
      } else {
        // Existing predefined destination flow.
        data = await fetchWeather(selectedLocation);
      }

      setWeatherData(data);

      // Cache only predefined destinations.
      // GPS results must not be reused for a different location.
      if (!isCurrentLocation) {
        saveToCache(selectedLocation, data);
      }

      setStatus('success');
    } catch (err) {
      // Do not use another location's cached weather for GPS requests.
      if (!isCurrentLocation) {
        const cachedEntry = loadFromCache(selectedLocation);
        const cachedRisk =
          cachedEntry && assessRisk(cachedEntry.data.weather);

        if (cachedEntry && cachedRisk?.available) {
          setWeatherData(cachedEntry.data);
          setCacheInfo({ cachedAt: cachedEntry.cachedAt });
          setStatus('success');
          return;
        }
      }

      const reason = err.message || 'An unexpected error occurred.';
      setErrorMessage(
        isCurrentLocation
          ? reason
          : `${reason} No valid saved weather is available for this destination.`
      );
      setStatus('error');
    }
  }

  function handleRetry() {
    handleAnalyze();
  }

  return (
    <div className="app">
      <Header />

      <section className="hero" aria-label="Hero">
        <div className="hero-overlay" />

        <div className="hero-mountains" aria-hidden="true">
          <div className="mountain m1" />
          <div className="mountain m2" />
          <div className="mountain m3" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">🏔️ Live Weather Intelligence</div>
          <h1 className="hero-headline">Know Before You Go.</h1>
          <p className="hero-desc">
            Assess weather conditions at your trekking destination before heading into the mountains.
            Real-time data. No guesswork.
          </p>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">11</span>
              <span className="stat-label">Location Options</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">7</span>
              <span className="stat-label">Weather Parameters</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">Live</span>
              <span className="stat-label">Open-Meteo Data</span>
            </div>
          </div>
        </div>

        <div className="particles" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`particle p${i}`} />
          ))}
        </div>
      </section>

      <main className="main-content">
        <LocationSelector
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          onAnalyze={handleAnalyze}
          isLoading={status === 'loading'}
        />

        {status === 'loading' && (
          <div className="state-panel loading-panel" role="status" aria-live="polite">
            <div className="spinner-ring" aria-hidden="true" />
            <p className="state-title">
              {selectedLocation === CURRENT_LOCATION
                ? 'Getting Your Location & Weather…'
                : 'Fetching Live Weather…'}
            </p>
            <p className="state-sub">
              {selectedLocation === CURRENT_LOCATION
                ? 'Requesting device location and contacting Open-Meteo'
                : 'Contacting Open-Meteo weather service'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-panel error-panel" role="alert">
            <span className="state-icon" aria-hidden="true">⚠️</span>
            <p className="state-title">Could Not Retrieve Weather</p>
            <p className="state-sub">{errorMessage}</p>
            <button
              id="retry-btn"
              className="retry-btn"
              onClick={handleRetry}
              disabled={!selectedLocation}
            >
              🔄 Try Again
            </button>
          </div>
        )}

        {status === 'idle' && (
          <div className="state-panel idle-panel" aria-live="polite">
            <span className="state-icon" aria-hidden="true">⛰️</span>
            <p className="state-title">Select a Destination Above</p>
            <p className="state-sub">
              Choose a trekking location or Current Location, then click{' '}
              <strong>Analyze Weather</strong> to see live conditions.
            </p>
          </div>
        )}

        {status === 'success' && weatherData && (
          <WeatherDashboard data={weatherData} cacheInfo={cacheInfo} />
        )}
      </main>

      <footer className="footer">
        <p>
          TrailSafe &mdash; Edge-based hiking weather assessment &nbsp;|&nbsp; Weather data by{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">
            Open-Meteo
          </a>
          &nbsp;(free &amp; open-source)
        </p>
        <p className="footer-note">
          Risk is assessed from weather conditions. Always use official forecasts and trail guidance.
        </p>
      </footer>
    </div>
  );
}
