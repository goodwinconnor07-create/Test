const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const progressBarEl = document.getElementById("progress-bar");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const cityImageEl = document.getElementById("city-image");
const locationEl = document.getElementById("location");
const temperatureEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) return;
  await fetchWeather(city);
});

async function fetchWeather(city) {
  setStatus("");
  progressBarEl.classList.remove("hidden");
  resultEl.classList.add("hidden");
  cityImageEl.classList.add("hidden");
  cityImageEl.src = "";

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) throw new Error("Could not reach geocoding service.");
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      setStatus(`No location found for "${city}".`, true);
      return;
    }

    const { latitude, longitude, name, admin1, country } = geoData.results[0];

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code`
    );
    if (!weatherRes.ok) throw new Error("Could not reach weather service.");
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    const locationParts = [name, admin1, country].filter(Boolean);
    locationEl.textContent = locationParts.join(", ");
    await loadCityImage(name);
    temperatureEl.textContent = `${Math.round(current.temperature_2m)}°C`;
    conditionEl.textContent =
      WEATHER_CODES[current.weather_code] || "Unknown conditions";
    feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°C`;
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    setStatus("");
    resultEl.classList.remove("hidden");
  } catch (err) {
    setStatus(err.message || "Something went wrong. Please try again.", true);
  } finally {
    progressBarEl.classList.add("hidden");
  }
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function loadCityImage(name) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    );
    if (!res.ok) return;
    const data = await res.json();
    const imageUrl = data.thumbnail && data.thumbnail.source;
    if (!imageUrl) return;

    cityImageEl.src = imageUrl;
    cityImageEl.alt = name;
    cityImageEl.classList.remove("hidden");
  } catch {
    // No image is fine, the layout works without one.
  }
}
