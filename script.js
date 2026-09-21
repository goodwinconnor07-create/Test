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
const citySearchEl = document.getElementById("city-search");
const suggestionsEl = document.getElementById("suggestions");
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

let suggestionResults = [];
let activeSuggestionIndex = -1;
let suggestionRequestToken = 0;
let suggestionRenderedToken = 0;
let selectedLocation = null;
let selectedLocationText = "";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) return;
  hideSuggestions();

  if (selectedLocation && city === selectedLocationText) {
    await loadWeatherForLocation(selectedLocation);
  } else {
    await fetchWeather(city);
  }
});

input.addEventListener("input", () => {
  const query = input.value.trim();

  if (query.length < 2) {
    suggestionRenderedToken = ++suggestionRequestToken;
    hideSuggestions();
    return;
  }

  fetchSuggestions(query);
});

input.addEventListener("keydown", (e) => {
  if (suggestionsEl.classList.contains("hidden") || suggestionResults.length === 0) {
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActiveSuggestion((activeSuggestionIndex + 1) % suggestionResults.length);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setActiveSuggestion(
      (activeSuggestionIndex - 1 + suggestionResults.length) % suggestionResults.length
    );
  } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
    e.preventDefault();
    selectSuggestion(suggestionResults[activeSuggestionIndex]);
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

document.addEventListener("click", (e) => {
  if (!citySearchEl.contains(e.target)) {
    hideSuggestions();
  }
});

async function fetchSuggestions(query) {
  const token = ++suggestionRequestToken;

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
    );
    // A response for an older keystroke arriving after a newer one is already
    // showing would only replace good results with stale ones, so skip it.
    if (!res.ok || token < suggestionRenderedToken) return;
    const data = await res.json();
    if (token < suggestionRenderedToken) return;
    suggestionRenderedToken = token;
    renderSuggestions(data.results || []);
  } catch {
    // A failed suggestion request is fine; the Search button still works.
  }
}

function renderSuggestions(results) {
  suggestionResults = results;
  activeSuggestionIndex = -1;
  suggestionsEl.innerHTML = "";

  if (results.length === 0) {
    hideSuggestions();
    return;
  }

  results.forEach((result) => {
    const li = document.createElement("li");
    li.className = "suggestion-item";
    li.setAttribute("role", "option");

    const main = document.createElement("div");
    main.className = "suggestion-main";
    main.textContent = result.name;

    const sub = document.createElement("div");
    sub.className = "suggestion-sub";
    sub.textContent = [result.admin1, result.country].filter(Boolean).join(", ");

    li.appendChild(main);
    li.appendChild(sub);
    li.addEventListener("click", () => selectSuggestion(result));
    suggestionsEl.appendChild(li);
  });

  suggestionsEl.classList.remove("hidden");
}

function setActiveSuggestion(index) {
  activeSuggestionIndex = index;
  [...suggestionsEl.children].forEach((item, i) => {
    item.classList.toggle("active", i === index);
    if (i === index) item.scrollIntoView({ block: "nearest" });
  });
}

function hideSuggestions() {
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
  suggestionResults = [];
  activeSuggestionIndex = -1;
}

function selectSuggestion(result) {
  const displayText = [result.name, result.admin1, result.country]
    .filter(Boolean)
    .join(", ");
  input.value = displayText;
  selectedLocation = result;
  selectedLocationText = displayText;
  hideSuggestions();
  input.focus();
}

async function fetchWeather(city) {
  setStatus("");
  progressBarEl.classList.remove("hidden");
  resultEl.classList.add("hidden");

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
      progressBarEl.classList.add("hidden");
      return;
    }

    await loadWeatherForLocation(geoData.results[0]);
  } catch (err) {
    setStatus(err.message || "Something went wrong. Please try again.", true);
    progressBarEl.classList.add("hidden");
  }
}

async function loadWeatherForLocation(location) {
  const { latitude, longitude, name, admin1, country } = location;
  progressBarEl.classList.remove("hidden");
  resultEl.classList.add("hidden");
  cityImageEl.classList.add("hidden");
  cityImageEl.src = "";

  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code`
    );
    if (!weatherRes.ok) throw new Error("Could not reach weather service.");
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    const locationParts = [name, admin1, country].filter(Boolean);
    locationEl.textContent = locationParts.join(", ");
    await loadCityImage(name, admin1);
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

async function loadCityImage(name, admin1) {
  const titlesToTry = admin1 ? [`${name}, ${admin1}`, name] : [name];

  for (const title of titlesToTry) {
    const imageUrl = await fetchWikipediaThumbnail(title);
    if (imageUrl) {
      cityImageEl.src = imageUrl;
      cityImageEl.alt = name;
      cityImageEl.classList.remove("hidden");
      return;
    }
  }
}

async function fetchWikipediaThumbnail(title) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.thumbnail && data.thumbnail.source) || null;
  } catch {
    return null;
  }
}
