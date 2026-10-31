
const axios = require('axios');
const express = require('express');
const router = express.Router();

const LOCATIONS = require('../config/locations');
const { fetchCurrentWeather } = require('../services/weatherService');

async function predictRisk(hour) {
  if (
    !hour ||
    hour.temperature == null ||
    hour.humidity == null ||
    hour.windSpeed == null ||
    hour.uvIndex == null ||
    hour.visibility == null ||
    hour.weatherType == null
  ) {
    return {
      mlRiskScore: null,
      mlRiskLabel: null,
      mlPredictionError: 'Required weather inputs are unavailable.',
    };
  }

  try {
    const mlApiUrl = process.env.ML_API_URL || 'http://127.0.0.1:5001';

    const response = await axios.post(
      `${mlApiUrl}/predict`,
      {
        Temperature: hour.temperature,
        Humidity: hour.humidity,
        'Wind Speed': hour.windSpeed,
        'UV Index': hour.uvIndex,
        'Visibility (km)': hour.visibility,
        'Weather Type': hour.weatherType,
      },
      { timeout: 5000 }
    );

    return {
      mlRiskScore: response.data.risk_score,
      mlRiskLabel: response.data.risk_label,
      mlPredictionError: null,
    };
  } catch (err) {
    console.error('[ML Prediction] Failed:', err.message);

    return {
      mlRiskScore: null,
      mlRiskLabel: null,
      mlPredictionError: 'ML prediction service is unavailable.',
    };
  }
}

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'TrailSafe backend is running.',
    timestamp: new Date().toISOString(),
  });
});

router.get('/weather', async (req, res) => {
  const { location: locationSlug, latitude, longitude } = req.query;

  let location;

  // GPS mode: both coordinates must be supplied together.
  if (latitude !== undefined || longitude !== undefined) {
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Both latitude and longitude are required.',
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return res.status(400).json({
        error: 'Invalid coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.',
      });
    }

    location = {
      slug: 'current-location',
      name: 'Current Location',
      latitude: lat,
      longitude: lon,
    };
  } else {
    if (!locationSlug) {
      return res.status(400).json({
        error: 'Provide a saved location or both latitude and longitude.',
        example: '/api/weather?location=tirumala',
      });
    }

    location = LOCATIONS[locationSlug.toLowerCase()];

    if (!location) {
      return res.status(404).json({
        error: `Unknown location: "${locationSlug}".`,
        validLocations: Object.keys(LOCATIONS),
      });
    }
  }

  try {
    const weather = await fetchCurrentWeather(
      location.latitude,
      location.longitude
    );

    const forecastWithML = await Promise.all(
      (weather.forecast || []).map(async (hour) => ({
        ...hour,
        ...(await predictRisk(hour)),
      }))
    );

    const currentPrediction = forecastWithML[0] || {
      mlRiskScore: null,
      mlRiskLabel: null,
      mlPredictionError: 'Forecast data is unavailable.',
    };

    return res.json({
      location: {
        slug: location.slug,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      weather: {
        ...weather,
        forecast: forecastWithML,
      },
      mlRiskScore: currentPrediction.mlRiskScore,
      mlRiskLabel: currentPrediction.mlRiskLabel,
      mlPredictionError: currentPrediction.mlPredictionError,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[WeatherRoute] Failed:', err.message);

    if (err.response) {
      return res.status(502).json({
        error: 'Weather provider returned an error. Please try again later.',
        detail: err.response.data?.reason ?? err.message,
      });
    }

    return res.status(503).json({
      error: 'Unable to reach the weather provider. Please check your connection and try again.',
    });
  }
});

module.exports = router;
