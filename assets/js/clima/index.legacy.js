/**
 * Central do Clima - Legacy Fallback (No ES Modules)
 * Versão simplificada para navegadores sem suporte a ES Modules
 * Inclui todo o código necessário em um único arquivo IIFE
 */

(function() {
  'use strict';

  // ===== UTILS =====
  function formatTemperature(temp, showUnit = true) {
    if (temp == null) return '--';
    const rounded = Math.round(temp);
    return showUnit ? rounded + '°C' : rounded + '°';
  }

  function formatWindSpeed(speed) {
    if (speed == null) return '--';
    return Math.round(speed * 3.6) + ' km/h';
  }

  function formatWindDirection(deg) {
    if (deg == null) return '';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const idx = Math.round(deg / 45) % 8;
    return dirs[idx];
  }

  function formatHumidity(humidity) {
    if (humidity == null) return '--';
    return Math.round(humidity) + '%';
  }

  function formatPressure(pressure) {
    if (pressure == null) return '--';
    return Math.round(pressure) + ' hPa';
  }

  function formatVisibility(visibility) {
    if (visibility == null) return '--';
    return visibility >= 10000 ? '10+ km' : Math.round(visibility / 1000) + ' km';
  }

  function formatLocalTime(timestamp, offset) {
    if (!timestamp) return '--';
    const date = new Date((timestamp + offset) * 1000);
    return date.getUTCHours().toString().padStart(2, '0') + ':' +
           date.getUTCMinutes().toString().padStart(2, '0');
  }

  function formatDate(timestamp, offset) {
    if (!timestamp) return '--';
    const date = new Date((timestamp + offset) * 1000);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getUTCDay()];
  }

  function formatPrecipitation(precip) {
    if (!precip) return '--';
    return precip.toFixed(1) + ' mm';
  }

  function formatPrecipitationProbability(pop) {
    if (pop == null) return '0%';
    return Math.round(pop * 100) + '%';
  }

  function formatCoordinates(lat, lon) {
    if (lat == null || lon == null) return '';
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'O';
    return Math.abs(lat).toFixed(2) + '°' + latDir + ' ' +
           Math.abs(lon).toFixed(2) + '°' + lonDir;
  }

  function generateAriaLabel(data) {
    var parts = [];
    if (data.city) parts.push(data.city);
    if (data.temp != null) parts.push(formatTemperature(data.temp, false) + ' graus');
    if (data.description) parts.push(data.description);
    return parts.join(', ');
  }

  function debounce(fn, delay) {
    var timeoutId;
    return function() {
      var args = arguments;
      var ctx = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(function() {
        fn.apply(ctx, args);
      }, delay);
    };
  }

  function isOnline() {
    return navigator.onLine;
  }

  // ===== ICONS =====
  function getWeatherIcon(weatherId, isDay) {
    if (!weatherId) return 'help';
    var id = weatherId;
    // Clear sky
    if (id === 800) return isDay ? 'wb_sunny' : 'nights_stay';
    // Clouds
    if (id >= 801 && id <= 804) return 'wb_cloudy';
    // Rain/Drizzle
    if (id >= 300 && id <= 531) return 'grain';
    // Thunderstorm
    if (id >= 200 && id <= 232) return 'thunderstorm';
    // Snow
    if (id >= 600 && id <= 622) return 'ac_unit';
    // Atmosphere
    if (id >= 701 && id <= 781) return 'foggy';
    return 'cloud';
  }

  function getWeatherDescription(weatherId, fallback) {
    var descriptions = {
      200: 'Tempestade com chuva leve',
      201: 'Tempestade com chuva',
      202: 'Tempestade com chuva forte',
      210: 'Tempestade leve',
      211: 'Tempestade',
      212: 'Tempestade forte',
      221: 'Tempestade irregular',
      230: 'Tempestade com garoa leve',
      231: 'Tempestade com garoa',
      232: 'Tempestade com garoa forte',
      300: 'Garoa leve',
      301: 'Garoa',
      302: 'Garoa forte',
      310: 'Chuva garoa leve',
      311: 'Chuva garoa',
      312: 'Chuva garoa forte',
      313: 'Chuva e garoa',
      314: 'Chuva garoa intensa',
      321: 'Garoa',
      500: 'Chuva leve',
      501: 'Chuva moderada',
      502: 'Chuva forte',
      503: 'Chuva muito forte',
      504: 'Chuva extrema',
      511: 'Chuva gelada',
      520: 'Pancadas de chuva leves',
      521: 'Pancadas de chuva',
      522: 'Pancadas de chuva fortes',
      531: 'Pancadas de chuva irregulares',
      600: 'Neve leve',
      601: 'Neve',
      602: 'Neve forte',
      611: 'Chuva gelada',
      612: 'Chuva e neve leve',
      613: 'Chuva e neve',
      615: 'Chuva e neve leve',
      616: 'Chuva e neve',
      620: 'Pancadas de neve leves',
      621: 'Pancadas de neve',
      622: 'Pancadas de neve fortes',
      701: 'Névoa',
      711: 'Fumaça',
      721: 'Névoa seca',
      731: 'Redemoinhos de areia/pó',
      741: 'Nevoeiro',
      751: 'Areia',
      761: 'Pó',
      762: 'Cinzas vulcânicas',
      771: 'Rajadas de vento',
      781: 'Tornado',
      800: 'Céu limpo',
      801: 'Poucas nuvens',
      802: 'Nuvens dispersas',
      803: 'Nuvens quebradas',
      804: 'Nuvens cobertas'
    };
    return descriptions[weatherId] || fallback || 'Condição desconhecida';
  }

  function getWeatherIconClass(weatherId) {
    if (!weatherId) return '';
    var id = weatherId;
    if (id === 800) return 'clima-icon--clear';
    if (id >= 801 && id <= 804) return 'clima-icon--clouds';
    if (id >= 300 && id <= 531) return 'clima-icon--rain';
    if (id >= 200 && id <= 232) return 'clima-icon--thunderstorm';
    if (id >= 600 && id <= 622) return 'clima-icon--snow';
    if (id >= 701 && id <= 781) return 'clima-icon--atmosphere';
    return '';
  }

  // ===== STORE =====
  var initialState = {
    location: null,
    searchQuery: '',
    current: null,
    hourly: [],
    daily: [],
    loading: false,
    error: null,
    lastUpdated: null,
    usingCache: false,
    staleData: false,
    units: 'metric',
    autoLocation: true
  };

  var subscribers = [];
  var state = Object.assign({}, initialState);

  function notify() {
    subscribers.forEach(function(cb) { cb(state); });
  }

  window.climaSubscribe = function(callback) {
    subscribers.push(callback);
    return function() {
      var idx = subscribers.indexOf(callback);
      if (idx > -1) subscribers.splice(idx, 1);
    };
  };

  window.getClimaState = function() {
    return Object.assign({}, state);
  };

  function setState(partial) {
    Object.assign(state, partial);
    notify();
  }

  function setError(error) {
    setState({ error: error, loading: false });
  }

  function setLoading(loading) {
    setState({ loading: loading, error: null });
  }

  // ===== API =====
  var API_BASE = '/api/weather';
  var CACHE_KEYS = {
    CURRENT: 'clima_current_',
    FORECAST: 'clima_forecast_',
    GEOCODE: 'clima_geocode_',
    REVERSE: 'clima_reverse_'
  };
  var TTL = {
    CURRENT: 10 * 60 * 1000,
    FORECAST: 60 * 60 * 1000,
    GEOCODE: 24 * 60 * 60 * 1000
  };

  function getCoordKey(lat, lon) {
    return lat.toFixed(4) + ',' + lon.toFixed(4);
  }

  function isCacheValid(timestamp, ttl) {
    return Date.now() - timestamp < ttl;
  }

  function getFromCache(key) {
    try {
      var stored = sessionStorage.getItem(key);
      if (!stored) return null;
      var parsed = JSON.parse(stored);
      return { data: parsed.data, timestamp: parsed.timestamp };
    } catch (e) {
      return null;
    }
  }

  function setCache(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() }));
    } catch (e) {}
  }

  function fetchAPI(endpoint, params, timeout, retries) {
    timeout = timeout || 20000;
    retries = retries || 2;
    var url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('endpoint', endpoint);
    Object.keys(params).forEach(function(k) {
      url.searchParams.set(k, params[k]);
    });

    var attempt = 0;
    function tryFetch() {
      return new Promise(function(resolve, reject) {
        var controller = new AbortController();
        var id = setTimeout(function() { controller.abort(); }, timeout);

        fetch(url, { signal: controller.signal })
          .then(function(response) {
            clearTimeout(id);
            if (!response.ok) {
              return response.json().catch(function() { return {}; })
                .then(function(error) {
                  throw new Error(error.error || 'HTTP ' + response.status);
                });
            }
            return response.json();
          })
          .then(resolve)
          .catch(function(error) {
            clearTimeout(id);
            var isRetryable = error.name === 'AbortError' ||
                              error instanceof TypeError ||
                              error.message.includes('Failed to fetch');

            if (isRetryable && attempt < retries) {
              attempt++;
              setTimeout(tryFetch, 1000 * attempt).then(resolve, reject);
            } else {
              if (error.name === 'AbortError') {
                reject(new Error('Timeout na requisição. Tente novamente.'));
              } else {
                reject(error);
              }
            }
          });
      });
    }
    return tryFetch();
  }

  function fetchCurrentWeather(lat, lon, forceRefresh) {
    var coordKey = getCoordKey(lat, lon);
    var cacheKey = CACHE_KEYS.CURRENT + coordKey;

    if (!forceRefresh) {
      var cached = getFromCache(cacheKey);
      if (cached && isCacheValid(cached.timestamp, TTL.CURRENT)) {
        return Promise.resolve(Object.assign({}, cached.data, { fromCache: true }));
      }
    }

    return fetchAPI('current', { lat: lat.toString(), lon: lon.toString() })
      .then(function(data) {
        setCache(cacheKey, data);
        return Object.assign({}, data, { fromCache: false });
      })
      .catch(function(error) {
        var cached = getFromCache(cacheKey);
        if (cached) {
          console.warn('Usando cache expirado para clima atual:', error.message);
          return Object.assign({}, cached.data, { fromCache: true, stale: true });
        }
        throw error;
      });
  }

  function fetchForecast(lat, lon, forceRefresh) {
    var coordKey = getCoordKey(lat, lon);
    var cacheKey = CACHE_KEYS.FORECAST + coordKey;

    if (!forceRefresh) {
      var cached = getFromCache(cacheKey);
      if (cached && isCacheValid(cached.timestamp, TTL.FORECAST)) {
        return Promise.resolve(Object.assign({}, cached.data, { fromCache: true }));
      }
    }

    return fetchAPI('forecast', { lat: lat.toString(), lon: lon.toString() })
      .then(function(data) {
        setCache(cacheKey, data);
        return Object.assign({}, data, { fromCache: false });
      })
      .catch(function(error) {
        var cached = getFromCache(cacheKey);
        if (cached) {
          console.warn('Usando cache expirado para previsão:', error.message);
          return Object.assign({}, cached.data, { fromCache: true, stale: true });
        }
        throw error;
      });
  }

  function fetchGeocoding(query, limit) {
    limit = limit || 5;
    var cacheKey = CACHE_KEYS.GEOCODE + query.toLowerCase();

    var cached = getFromCache(cacheKey);
    if (cached && isCacheValid(cached.timestamp, TTL.GEOCODE)) {
      return Promise.resolve(cached.data);
    }

    return fetchAPI('geocode', { q: query, limit: limit.toString() })
      .then(function(data) {
        setCache(cacheKey, data);
        return data;
      })
      .catch(function(error) {
        var cached = getFromCache(cacheKey);
        if (cached) return cached.data;
        throw error;
      });
  }

  function fetchReverseGeocoding(lat, lon) {
    var coordKey = getCoordKey(lat, lon);
    var cacheKey = CACHE_KEYS.REVERSE + coordKey;

    var cached = getFromCache(cacheKey);
    if (cached && isCacheValid(cached.timestamp, TTL.GEOCODE)) {
      return Promise.resolve(cached.data);
    }

    return fetchAPI('reverse', { lat: lat.toString(), lon: lon.toString() })
      .then(function(data) {
        setCache(cacheKey, data);
        return data;
      })
      .catch(function(error) {
        var cached = getFromCache(cacheKey);
        if (cached) return cached.data;
        throw error;
      });
  }

  function getUserLocation() {
    return new Promise(function(resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada neste navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function(position) {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        function(error) {
          if (error.code === error.TIMEOUT) {
            navigator.geolocation.getCurrentPosition(
              function(position) {
                resolve({
                  lat: position.coords.latitude,
                  lon: position.coords.longitude
                });
              },
              function(err) {
                var message;
                switch (err.code) {
                  case err.PERMISSION_DENIED:
                    message = 'Permissão de localização negada. Use a busca manual.';
                    break;
                  case err.POSITION_UNAVAILABLE:
                    message = 'Localização indisponível. Tente novamente.';
                    break;
                  case err.TIMEOUT:
                    message = 'Tempo esgotado ao obter localização. Use a busca manual.';
                    break;
                  default:
                    message = 'Erro ao obter localização. Use a busca manual.';
                }
                reject(new Error(message));
              },
              {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 10 * 60 * 1000
              }
            );
          } else {
            var message;
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = 'Permissão de localização negada. Use a busca manual.';
                break;
              case error.POSITION_UNAVAILABLE:
                message = 'Localização indisponível. Tente novamente.';
                break;
              case error.TIMEOUT:
                message = 'Tempo esgotado ao obter localização. Use a busca manual.';
                break;
              default:
                message = 'Erro ao obter localização. Use a busca manual.';
            }
            reject(new Error(message));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5 * 60 * 1000
        }
      );
    });
  }

  function clearClimaCache() {
    Object.keys(CACHE_KEYS).forEach(function(prefix) {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var key = sessionStorage.key(i);
        if (key && key.indexOf(prefix) === 0) {
          sessionStorage.removeItem(key);
        }
      }
    });
  }

  // ===== PROCESSING =====
  function processCurrentWeather(data, timezoneOffset) {
    if (!data || !data.main) return null;

    return {
      temp: data.main.temp,
      feelsLike: data.main.feels_like,
      tempMin: data.main.temp_min,
      tempMax: data.main.temp_max,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: data.visibility,
      windSpeed: data.wind ? data.wind.speed : null,
      windDeg: data.wind ? data.wind.deg : null,
      windGust: data.wind ? data.wind.gust : null,
      clouds: data.clouds ? data.clouds.all : null,
      weather: data.weather && data.weather[0] ? {
        id: data.weather[0].id,
        main: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon
      } : null,
      sunrise: data.sys ? data.sys.sunrise : null,
      sunset: data.sys ? data.sys.sunset : null,
      timezoneOffset: timezoneOffset,
      dt: data.dt,
      lat: data.coord ? data.coord.lat : null,
      lon: data.coord ? data.coord.lon : null
    };
  }

  function processHourlyForecast(data, timezoneOffset) {
    if (!data || !data.list || !data.list.length) return [];

    var now = Date.now() / 1000;
    var cutoff = now + 48 * 3600;

    return data.list
      .filter(function(item) { return item.dt > now && item.dt <= cutoff; })
      .slice(0, 24)
      .map(function(item) {
        return {
          dt: item.dt,
          temp: item.main ? item.main.temp : null,
          feelsLike: item.main ? item.main.feels_like : null,
          humidity: item.main ? item.main.humidity : null,
          pressure: item.main ? item.main.pressure : null,
          windSpeed: item.wind ? item.wind.speed : null,
          windDeg: item.wind ? item.wind.deg : null,
          windGust: item.wind ? item.wind.gust : null,
          clouds: item.clouds ? item.clouds.all : null,
          pop: item.pop || 0,
          precipitation: (item.rain && item.rain['3h']) || (item.snow && item.snow['3h']) || 0,
          weather: item.weather && item.weather[0] ? {
            id: item.weather[0].id,
            main: item.weather[0].main,
            description: item.weather[0].description,
            icon: item.weather[0].icon
          } : null,
          timezoneOffset: timezoneOffset
        };
      });
  }

  function processDailyForecast(data, timezoneOffset) {
    if (!data || !data.list || !data.list.length) return [];

    var dailyMap = {};

    data.list.forEach(function(item) {
      var date = new Date((item.dt + timezoneOffset) * 1000);
      var dayKey = date.toISOString().split('T')[0];

      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = {
          date: dayKey,
          dt: item.dt,
          temps: [],
          humidity: [],
          pressure: [],
          windSpeeds: [],
          windDegs: [],
          pops: [],
          precipitation: 0,
          weatherCounts: {},
          timezoneOffset: timezoneOffset
        };
      }

      var day = dailyMap[dayKey];
      if (item.main) {
        if (item.main.temp != null) day.temps.push(item.main.temp);
        if (item.main.humidity != null) day.humidity.push(item.main.humidity);
        if (item.main.pressure != null) day.pressure.push(item.main.pressure);
      }
      if (item.wind) {
        if (item.wind.speed != null) day.windSpeeds.push(item.wind.speed);
        if (item.wind.deg != null) day.windDegs.push(item.wind.deg);
      }
      day.pops.push(item.pop || 0);
      day.precipitation += (item.rain && item.rain['3h']) || (item.snow && item.snow['3h']) || 0;

      var wId = item.weather && item.weather[0] ? item.weather[0].id : null;
      if (wId) {
        day.weatherCounts[wId] = (day.weatherCounts[wId] || 0) + 1;
      }
    });

    return Object.keys(dailyMap)
      .sort()
      .slice(0, 5)
      .map(function(key) {
        var day = dailyMap[key];
        var weatherEntries = Object.keys(day.weatherCounts).map(function(k) {
          return [parseInt(k, 10), day.weatherCounts[k]];
        });
        weatherEntries.sort(function(a, b) { return b[1] - a[1]; });
        var mostCommonWeather = weatherEntries[0] ? weatherEntries[0][0] : null;

        return {
          date: day.date,
          dt: day.dt,
          tempMin: day.temps.length ? Math.min.apply(null, day.temps) : null,
          tempMax: day.temps.length ? Math.max.apply(null, day.temps) : null,
          tempAvg: day.temps.length ? day.temps.reduce(function(a, b) { return a + b; }, 0) / day.temps.length : null,
          humidityAvg: day.humidity.length ? Math.round(day.humidity.reduce(function(a, b) { return a + b; }, 0) / day.humidity.length) : null,
          pressureAvg: day.pressure.length ? Math.round(day.pressure.reduce(function(a, b) { return a + b; }, 0) / day.pressure.length) : null,
          windSpeedAvg: day.windSpeeds.length ? Math.round((day.windSpeeds.reduce(function(a, b) { return a + b; }, 0) / day.windSpeeds.length) * 10) / 10 : null,
          windDegAvg: day.windDegs.length ? Math.round(day.windDegs.reduce(function(a, b) { return a + b; }, 0) / day.windDegs.length) : null,
          popMax: day.pops.length ? Math.max.apply(null, day.pops) : 0,
          precipitation: Math.round(day.precipitation * 10) / 10,
          weatherId: mostCommonWeather,
          timezoneOffset: timezoneOffset
        };
      });
  }

  // ===== AGRONOMIC INSIGHTS =====
  function getAgronomicInsights() {
    var insights = [];
    var current = state.current;
    var hourly = state.hourly;
    var daily = state.daily;

    if (!current) return insights;

    // Chuva nas próximas 6 horas
    var next6Hours = hourly.slice(0, 6);
    var rainProbability = Math.max.apply(null, next6Hours.map(function(h) { return h.pop || 0; }));
    var totalRain = next6Hours.reduce(function(sum, h) { return sum + (h.precipitation || 0); }, 0);

    if (rainProbability > 0.7) {
      insights.push({
        type: 'rain',
        severity: 'warning',
        icon: 'grain',
        title: 'Alta probabilidade de chuva',
        message: 'Probabilidade de precipitação > 70% nas próximas 6 horas. Volume estimado: ' + totalRain.toFixed(1) + ' mm. Planeje aplicações e colheita.'
      });
    } else if (rainProbability > 0.4) {
      insights.push({
        type: 'rain',
        severity: 'info',
        icon: 'grain',
        title: 'Possibilidade de chuva',
        message: 'Probabilidade de precipitação ' + Math.round(rainProbability * 100) + '% nas próximas 6 horas. Acompanhe a evolução.'
      });
    }

    // Vento forte
    var maxWind = Math.max(current.windSpeed || 0, Math.max.apply(null, hourly.slice(0, 12).map(function(h) { return h.windSpeed || 0; })));
    if (maxWind > 15) {
      insights.push({
        type: 'wind',
        severity: maxWind > 25 ? 'alert' : 'warning',
        icon: 'air',
        title: 'Vento forte',
        message: 'Vento até ' + Math.round(maxWind) + ' km/h. Risco de deriva em pulverização. Evite aplicações aéreas.'
      });
    }

    // Amplitude térmica
    if (daily.length > 0) {
      var today = daily[0];
      var amplitude = today.tempMax - today.tempMin;
      if (amplitude > 15) {
        insights.push({
          type: 'temperature',
          severity: 'info',
          icon: 'thermostat',
          title: 'Amplitude térmica elevada',
          message: 'Variação de ' + Math.round(amplitude) + '°C hoje (mín: ' + Math.round(today.tempMin) + '°C, máx: ' + Math.round(today.tempMax) + '°C). Atenção a estresse térmico em culturas sensíveis.'
        });
      }
    }

    // Umidade baixa
    if (current.humidity < 30) {
      insights.push({
        type: 'humidity',
        severity: 'warning',
        icon: 'water_drop',
        title: 'Umidade relativa baixa',
        message: 'Umidade em ' + Math.round(current.humidity) + '%. Condições favoráveis a incêndios e estresse hídrico. Irrigue se necessário.'
      });
    }

    // Umidade alta (doenças fúngicas)
    if (current.humidity > 85) {
      insights.push({
        type: 'humidity',
        severity: 'info',
        icon: 'water_drop',
        title: 'Umidade relativa alta',
        message: 'Umidade em ' + Math.round(current.humidity) + '%. Condições favoráveis a doenças fúngicas. Monitore culturas suscetíveis.'
      });
    }

    // Pressão baixa (frente fria se aproximando)
    if (current.pressure && current.pressure < 1000) {
      insights.push({
        type: 'pressure',
        severity: 'info',
        icon: 'speed',
        title: 'Pressão atmosférica baixa',
        message: 'Pressão em ' + Math.round(current.pressure) + ' hPa. Pode indicar aproximação de frente fria ou instabilidade.'
      });
    }

    return insights;
  }

  // ===== PUBLIC API =====
  window.loadWeatherData = function(lat, lon, forceRefresh) {
    setLoading(true);

    Promise.all([
      fetchCurrentWeather(lat, lon, forceRefresh),
      fetchForecast(lat, lon, forceRefresh)
    ]).then(function(results) {
      var currentRes = results[0];
      var forecastRes = results[1];

      var timezoneOffset = currentRes.timezone_offset || (forecastRes.city && forecastRes.city.timezone) || 0;

      var current = processCurrentWeather(currentRes, timezoneOffset);
      var hourly = processHourlyForecast(forecastRes, timezoneOffset);
      var daily = processDailyForecast(forecastRes, timezoneOffset);

      var locationName = state.location && state.location.name;
      if (!locationName) {
        fetchReverseGeocoding(lat, lon).then(function(reverse) {
          if (reverse && reverse[0]) {
            locationName = reverse[0].name + (reverse[0].state ? ', ' + reverse[0].state : '') + (reverse[0].country ? ', ' + reverse[0].country : '');
            setState({
              current: current,
              hourly: hourly,
              daily: daily,
              location: { lat: lat, lon: lon, name: locationName },
              lastUpdated: Date.now(),
              usingCache: currentRes.fromCache || forecastRes.fromCache,
              staleData: currentRes.stale || forecastRes.stale,
              loading: false,
              error: null
            });
          } else {
            finishLoad(current, hourly, daily, timezoneOffset, currentRes, forecastRes, null);
          }
        }).catch(function() {
          finishLoad(current, hourly, daily, timezoneOffset, currentRes, forecastRes, null);
        });
      } else {
        finishLoad(current, hourly, daily, timezoneOffset, currentRes, forecastRes, locationName);
      }
    }).catch(function(error) {
      console.error('Erro ao carregar clima:', error);
      setError(error.message || 'Erro ao carregar dados meteorológicos');
    });
  };

  function finishLoad(current, hourly, daily, timezoneOffset, currentRes, forecastRes, locationName) {
    setState({
      current: current,
      hourly: hourly,
      daily: daily,
      location: locationName ? { lat: state.location.lat, lon: state.location.lon, name: locationName } : state.location,
      lastUpdated: Date.now(),
      usingCache: currentRes.fromCache || forecastRes.fromCache,
      staleData: currentRes.stale || forecastRes.stale,
      loading: false,
      error: null
    });
  }

  window.searchAndLoadCity = function(query) {
    if (!query || !query.trim()) return;

    setState({ searchQuery: query.trim(), loading: true, error: null });

    fetchGeocoding(query.trim())
      .then(function(results) {
        if (!results || !results.length) {
          setError('Cidade não encontrada. Verifique o nome e tente novamente.');
          return;
        }

        var city = results[0];
        var lat = city.lat;
        var lon = city.lon;
        var locationName = city.name + (city.state ? ', ' + city.state : '') + (city.country ? ', ' + city.country : '');

        setState({
          location: { lat: lat, lon: lon, name: locationName },
          searchQuery: ''
        });

        loadWeatherData(lat, lon, true);
      })
      .catch(function(error) {
        console.error('Erro na busca:', error);
        setError(error.message || 'Erro ao buscar cidade');
      });
  };

  window.useCurrentLocation = function() {
    setLoading(true);

    getUserLocation()
      .then(function(coords) {
        setState({
          location: { lat: coords.lat, lon: coords.lon, name: 'Sua localização' }
        });
        loadWeatherData(coords.lat, coords.lon, true);
      })
      .catch(function(error) {
        console.warn('Geolocalização falhou:', error.message);
        setState({ loading: false, error: null });
      });
  };

  window.refreshWeather = function() {
    if (!state.location) return;
    loadWeatherData(state.location.lat, state.location.lon, true);
  };

  window.setClimaUnits = function(units) {
    if (units === state.units) return;
    setState({ units: units });
  };

  window.getAgronomicInsights = getAgronomicInsights;
  window.clearClimaData = function() {
    clearClimaCache();
    Object.assign(state, initialState);
    notify();
    if (window.currentViewContainer) {
      initClimaUI(window.currentViewContainer);
    }
  };

  // ===== UI =====
  var unsubscribe = null;
  var searchAbortController = null;

  window.initClimaUI = function(container) {
    if (!container) return;

    render(container);
    unsubscribe = window.climaSubscribe(function(newState) {
      updateUI(container, newState);
    });
    bindEvents(container);

    // Observa elementos .revelar criados dinamicamente
    // Necessário porque o reveal system do main.js roda ANTES da UI ser renderizada
    observeReveals(container);
  };

  /**
   * Observa elementos .revelar no container para animar entrada
   * Replica a lógica de observarReveals do main.js para elementos criados dinamicamente
   */
  function observeReveals(container) {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var revealReduzido = prefersReducedMotion || !('IntersectionObserver' in window);

    var els = container.querySelectorAll('.revelar:not(.ativo)');

    if (revealReduzido) {
      Array.prototype.forEach.call(els, function(el) {
        el.classList.add('ativo');
        el.style.transitionDelay = '0s';
      });
      return;
    }

    // Cria observer local se não existir global
    if (!window.__climaRevealObserver) {
      window.__climaRevealObserver = new IntersectionObserver(function(entradas) {
        entradas.forEach(function(entrada) {
          if (entrada.isIntersecting) {
            revelarElemento(entrada.target);
            window.__climaRevealObserver.unobserve(entrada.target);
          }
        });
      }, { root: null, rootMargin: '0px', threshold: 0.12 });
    }

    Array.prototype.forEach.call(els, function(el) {
      window.__climaRevealObserver.observe(el);
    });
  }

  /**
   * Revela um elemento (adiciona classe ativo com animação)
   */
  function revelarElemento(el) {
    el.style.willChange = 'opacity, transform';
    el.classList.add('ativo');
    setTimeout(function() {
      el.style.willChange = 'auto';
      el.classList.add('reveal-done');
    }, 1200);
  }

  window.destroyClimaUI = function() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (searchAbortController) {
      searchAbortController.abort();
    }
  };

  function render(container) {
    container.innerHTML = '\
      <section class="hero clima-hero" aria-label="Central do Clima" data-bg="bg-clima">\
        <div class="hero-content">\
          <p class="clima-eyebrow"><svg class="clima-eyebrow-icon" aria-hidden="true"><use href="#icon-cloud-hero"></use></svg> Central do Clima</p>\
          <h1 class="hero-title hero-title-grande" tabindex="-1">Condições meteorológicas em tempo real para decisões no campo</h1>\
          <p class="hero-copy">Consulte temperatura, umidade, vento, precipitação e previsão para planejar suas atividades agrícolas.</p>\
        </div>\
      </section>\
\
      <section class="section clima-search-section revelar" aria-labelledby="clima-search-title">\
        <div class="section-header">\
          <span class="section-badge clima-badge">Localização</span>\
          <h2 id="clima-search-title">Onde você está?</h2>\
        </div>\
        <div class="clima-search-wrapper">\
          <div class="clima-search-box">\
            <label for="clima-city-search" class="sr-only">Buscar cidade</label>\
            <span class="material-symbols-rounded search-icon" aria-hidden="true">search</span>\
            <input\
              type="search"\
              id="clima-city-search"\
              class="clima-search-input"\
              placeholder="Digite uma cidade (ex: São Paulo, BR)..."\
              autocomplete="off"\
              aria-describedby="clima-search-hint"\
              aria-expanded="false"\
              aria-controls="clima-suggestions"\
            >\
            <button type="button" class="btn btn-secondary clima-location-btn" id="clima-location-btn" aria-label="Usar minha localização atual">\
              <span class="material-symbols-rounded" aria-hidden="true">my_location</span>\
              <span>Minha localização</span>\
            </button>\
          </div>\
          <div id="clima-suggestions" class="clima-suggestions" role="listbox" aria-label="Sugestões de cidades" hidden></div>\
          <p id="clima-search-hint" class="clima-search-hint">Pressione Enter para buscar ou selecione uma sugestão</p>\
          <div class="clima-current-location" id="clima-current-location" aria-live="polite" hidden></div>\
        </div>\
      </section>\
\
      <section class="section clima-current-section revelar" aria-labelledby="clima-current-title">\
        <div class="section-header">\
          <span class="section-badge clima-badge">Agora</span>\
          <h2 id="clima-current-title">Clima Atual</h2>\
        </div>\
        <div class="clima-current-wrapper" id="clima-current-wrapper">\
          <!-- Renderizado dinamicamente -->\
        </div>\
      </section>\
\
      <section class="section clima-hourly-section revelar" aria-labelledby="clima-hourly-title">\
        <div class="section-header">\
          <span class="section-badge clima-badge">Próximas Horas</span>\
          <h2 id="clima-hourly-title">Previsão Horária</h2>\
        </div>\
        <div class="clima-hourly-wrapper">\
          <div class="clima-hourly-scroll" id="clima-hourly-scroll" role="region" aria-label="Previsão para as próximas 24 horas" tabindex="0">\
            <div class="clima-hourly-track" id="clima-hourly-track">\
              <!-- Cards horários renderizados dinamicamente -->\
            </div>\
          </div>\
          <div class="clima-scroll-indicator" id="clima-scroll-indicator" aria-hidden="true">\
            <span class="material-symbols-rounded">chevron_right</span>\
          </div>\
        </div>\
      </section>\
\
      <section class="section clima-daily-section revelar" aria-labelledby="clima-daily-title">\
        <div class="section-header">\
          <span class="section-badge clima-badge">Próximos Dias</span>\
          <h2 id="clima-daily-title">Previsão 5 Dias</h2>\
        </div>\
        <div class="clima-daily-grid" id="clima-daily-grid" role="list" aria-label="Previsão para os próximos 5 dias">\
          <!-- Cards diários renderizados dinamicamente -->\
        </div>\
      </section>\
\
      <section class="section clima-insights-section revelar" aria-labelledby="clima-insights-title">\
        <div class="section-header">\
          <span class="section-badge clima-badge">Insights</span>\
          <h2 id="clima-insights-title">Observações para o Campo</h2>\
        </div>\
        <div class="clima-insights-grid" id="clima-insights-grid" role="list" aria-label="Observações agronômicas baseadas nos dados meteorológicos">\
          <!-- Insights renderizados dinamicamente -->\
        </div>\
        <p class="clima-disclaimer" id="clima-disclaimer">\
          <span class="material-symbols-rounded" aria-hidden="true">info</span>\
          <strong>Nota:</strong> Estas são informações meteorológicas baseadas em dados da OpenWeatherMap, não recomendações técnicas agronômicas.\
          Para decisões de manejo, consulte sempre um engenheiro agrônomo ou técnico habilitado.\
        </p>\
      </section>\
\
      <!-- Live region para anúncios de atualização -->\
      <div aria-live="polite" aria-atomic="true" class="sr-only" id="clima-live-region"></div>\
    ';
  }

  function updateUI(container, state) {
    updateCurrentLocationDisplay(container, state);
    updateCurrentWeather(container, state);
    updateHourlyForecast(container, state);
    updateDailyForecast(container, state);
    updateInsights(container, state);
    updateLoadingState(container, state);
    updateErrorState(container, state);
  }

  function updateCurrentLocationDisplay(container, state) {
    var locationEl = container.querySelector('#clima-current-location');
    var searchInput = container.querySelector('#clima-city-search');

    if (!locationEl) return;

    if (state.location) {
      var updatedText = state.lastUpdated
        ? ' · Atualizado há ' + getRelativeTime(state.lastUpdated)
        : '';
      var staleText = state.staleData ? ' (dados desatualizados)' : '';
      var cacheText = state.usingCache ? ' (cache)' : '';

      locationEl.hidden = false;
      locationEl.innerHTML = '\
        <span class="material-symbols-rounded" aria-hidden="true">location_on</span>\
        <span>' + state.location.name + updatedText + staleText + cacheText + '</span>\
        ' + (state.usingCache || state.staleData ? '<button type="button" class="clima-refresh-btn" aria-label="Atualizar dados" title="Atualizar dados"><span class="material-symbols-rounded">refresh</span></button>' : '') + '\
      ';

      if (searchInput && !searchInput.matches(':focus')) {
        searchInput.placeholder = state.location.name;
      }
    } else {
      locationEl.hidden = true;
    }
  }

  function updateCurrentWeather(container, state) {
    var wrapper = container.querySelector('#clima-current-wrapper');
    if (!wrapper) return;

    if (state.loading && !state.current) {
      wrapper.innerHTML = renderCurrentSkeleton();
      return;
    }

    if (state.error && !state.current) {
      wrapper.innerHTML = renderError(state.error, 'current');
      return;
    }

    if (!state.current) {
      wrapper.innerHTML = renderEmptyState('Busque uma cidade ou use sua localização para ver o clima atual.');
      return;
    }

    var c = state.current;
    var weather = c.weather;
    var isDay = isDayTime(c.dt, c.timezoneOffset);
    var icon = weather ? getWeatherIcon(weather.id, isDay) : 'help';
    var description = weather ? getWeatherDescription(weather.id, weather.description) : 'Indisponível';
    var iconClass = weather ? getWeatherIconClass(weather.id) : '';

    wrapper.innerHTML = '\
      <article class="clima-current-card has-glow" aria-label="' + generateAriaLabel({ city: state.location ? state.location.name : '', temp: c.temp, description: description }) + '">\
        <div class="clima-current-main">\
          <div class="clima-current-location">\
            <span class="material-symbols-rounded" aria-hidden="true">location_on</span>\
            <span>' + (state.location ? state.location.name : 'Localização desconhecida') + '</span>\
          </div>\
          <div class="clima-current-temp">\
            <span class="clima-temp-value">' + formatTemperature(c.temp) + '</span>\
            <span class="clima-feels-like">Sensação ' + formatTemperature(c.feelsLike, false) + '</span>\
          </div>\
          <div class="clima-current-condition">\
            <span class="material-symbols-rounded clima-current-icon ' + iconClass + '" aria-hidden="true">' + icon + '</span>\
            <span>' + description + '</span>\
          </div>\
        </div>\
\
        <div class="clima-current-details" role="list" aria-label="Detalhes meteorológicos">\
          <div class="clima-detail-item" role="listitem">\
            <span class="material-symbols-rounded" aria-hidden="true">water_drop</span>\
            <div class="clima-detail-content">\
              <span class="clima-detail-value">' + formatHumidity(c.humidity) + '</span>\
              <span class="clima-detail-label">Umidade</span>\
            </div>\
          </div>\
          <div class="clima-detail-item" role="listitem">\
            <span class="material-symbols-rounded" aria-hidden="true">air</span>\
            <div class="clima-detail-content">\
              <span class="clima-detail-value">' + formatWindSpeed(c.windSpeed) + '</span>\
              <span class="clima-detail-label">Vento ' + formatWindDirection(c.windDeg) + '</span>\
            </div>\
          </div>\
          <div class="clima-detail-item" role="listitem">\
            <span class="material-symbols-rounded" aria-hidden="true">speed</span>\
            <div class="clima-detail-content">\
              <span class="clima-detail-value">' + formatPressure(c.pressure) + '</span>\
              <span class="clima-detail-label">Pressão</span>\
            </div>\
          </div>\
          <div class="clima-detail-item" role="listitem">\
            <span class="material-symbols-rounded" aria-hidden="true">visibility</span>\
            <div class="clima-detail-content">\
              <span class="clima-detail-value">' + formatVisibility(c.visibility) + '</span>\
              <span class="clima-detail-label">Visibilidade</span>\
            </div>\
          </div>\
          <div class="clima-detail-item" role="listitem">\
            <span class="material-symbols-rounded" aria-hidden="true">wb_sunny</span>\
            <div class="clima-detail-content">\
              <span class="clima-detail-value">' + formatLocalTime(c.sunrise, c.timezoneOffset) + '</span>\
              <span class="clima-detail-label">Nascer</span>\
            </div>\
          </div>\
          <div class="clima-detail-item" role="listitem">\
            <span class="material-symbols-rounded" aria-hidden="true">nights_stay</span>\
            <div class="clima-detail-content">\
              <span class="clima-detail-value">' + formatLocalTime(c.sunset, c.timezoneOffset) + '</span>\
              <span class="clima-detail-label">Pôr do sol</span>\
            </div>\
          </div>\
        </div>\
\
        <div class="clima-current-meta">\
          <span class="clima-coordinates">' + formatCoordinates(c.lat, c.lon) + '</span>\
          <span class="clima-timezone">UTC' + (c.timezoneOffset >= 0 ? '+' : '') + Math.round(c.timezoneOffset / 3600) + '</span>\
          <button type="button" class="clima-refresh-btn" aria-label="Atualizar dados" title="Atualizar agora">\
            <span class="material-symbols-rounded">refresh</span>\
          </button>\
        </div>\
      </article>\
    ';

    var refreshBtn = wrapper.querySelector('.clima-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() { window.refreshWeather(); });
    }
  }

  function updateHourlyForecast(container, state) {
    var track = container.querySelector('#clima-hourly-track');
    var scrollContainer = container.querySelector('#clima-hourly-scroll');
    var indicator = container.querySelector('#clima-scroll-indicator');
    if (!track) return;

    if (state.loading && !state.hourly.length) {
      track.innerHTML = Array(6).fill(0).map(function() { return renderHourlySkeleton(); }).join('');
      return;
    }

    if (!state.hourly.length) {
      track.innerHTML = '';
      if (scrollContainer) scrollContainer.hidden = true;
      if (indicator) indicator.hidden = true;
      return;
    }

    if (scrollContainer) scrollContainer.hidden = false;
    if (indicator) indicator.hidden = false;

    track.innerHTML = state.hourly.map(function(hour, index) { return renderHourlyCard(hour, index); }).join('');
  }

  function updateDailyForecast(container, state) {
    var grid = container.querySelector('#clima-daily-grid');
    if (!grid) return;

    if (state.loading && !state.daily.length) {
      grid.innerHTML = Array(5).fill(0).map(function() { return renderDailySkeleton(); }).join('');
      return;
    }

    if (!state.daily.length) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = state.daily.map(function(day, index) { return renderDailyCard(day, index); }).join('');
  }

  function updateInsights(container, state) {
    var grid = container.querySelector('#clima-insights-grid');
    var disclaimer = container.querySelector('#clima-disclaimer');
    if (!grid) return;

    var insights = getAgronomicInsights();

    if (!insights.length) {
      grid.innerHTML = '\
        <div class="clima-insight-empty">\
          <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>\
          <p>Nenhuma observação especial no momento. Condições dentro da normalidade.</p>\
        </div>\
      ';
      if (disclaimer) disclaimer.hidden = true;
      return;
    }

    if (disclaimer) disclaimer.hidden = false;

    grid.innerHTML = insights.map(function(insight) { return renderInsightCard(insight); }).join('');
  }

  function updateLoadingState(container, state) {
    var locationBtn = container.querySelector('#clima-location-btn');
    if (locationBtn) {
      locationBtn.disabled = state.loading;
      if (state.loading && !locationBtn.querySelector('.clima-loading-spinner')) {
        locationBtn.innerHTML = '\
          <span class="material-symbols-rounded clima-loading-spinner" aria-hidden="true">refresh</span>\
          <span>Localizando...</span>\
        ';
      } else if (!state.loading) {
        locationBtn.innerHTML = '\
          <span class="material-symbols-rounded" aria-hidden="true">my_location</span>\
          <span>Minha localização</span>\
        ';
      }
    }
  }

  function updateErrorState(container, state) {
    if (state.error) {
      announceToScreenReader(state.error);
    }
  }

  function bindEvents(container) {
    var locationBtn = container.querySelector('#clima-location-btn');
    if (locationBtn) {
      locationBtn.addEventListener('click', function() { window.useCurrentLocation(); });
    }

    var searchInput = container.querySelector('#clima-city-search');
    var suggestions = container.querySelector('#clima-suggestions');

    if (searchInput) {
      searchInput.addEventListener('input', debounce(handleSearchInput, 300));
      searchInput.addEventListener('keydown', handleSearchKeydown);
      searchInput.addEventListener('focus', function() {
        if (searchInput.value.trim()) showSuggestions(searchInput.value.trim());
      });
      searchInput.addEventListener('blur', function() {
        setTimeout(function() { hideSuggestions(); }, 200);
      });
    }

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.clima-search-box') && !e.target.closest('.clima-suggestions')) {
        hideSuggestions();
      }
    });

    var scrollContainer = container.querySelector('#clima-hourly-scroll');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', function() {
        var indicator = container.querySelector('#clima-scroll-indicator');
        if (indicator) {
          var atEnd = scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 10;
          indicator.hidden = atEnd;
        }
      });
    }
  }

  function handleSearchInput(e) {
    var query = e.target.value.trim();
    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    if (searchAbortController) searchAbortController.abort();
    searchAbortController = new AbortController();

    fetchGeocoding(query)
      .then(function(results) {
        showSuggestions(query, results);
      })
      .catch(function(error) {
        if (error.name !== 'AbortError') {
          console.warn('Erro na busca de sugestões:', error);
        }
      });
  }

  function handleSearchKeydown(e) {
    var suggestions = document.querySelector('#clima-suggestions');
    var items = suggestions ? suggestions.querySelectorAll('[role="option"]') : null;

    if (e.key === 'Enter') {
      e.preventDefault();
      var selected = suggestions ? suggestions.querySelector('[role="option"][aria-selected="true"]') : null;
      if (!selected && items && items.length) selected = items[0];
      if (selected) {
        selected.click();
      } else if (e.target.value.trim()) {
        window.searchAndLoadCity(e.target.value.trim());
      }
      hideSuggestions();
    } else if (e.key === 'ArrowDown' && items && items.length) {
      e.preventDefault();
      var current = suggestions.querySelector('[aria-selected="true"]');
      var index = current ? Array.prototype.indexOf.call(items, current) : -1;
      var next = items[Math.min(index + 1, items.length - 1)];
      if (next) {
        Array.prototype.forEach.call(items, function(i) { i.setAttribute('aria-selected', 'false'); });
        next.setAttribute('aria-selected', 'true');
        next.focus();
      }
    } else if (e.key === 'ArrowUp' && items && items.length) {
      e.preventDefault();
      var current = suggestions.querySelector('[aria-selected="true"]');
      var index = current ? Array.prototype.indexOf.call(items, current) : 0;
      var prev = items[Math.max(index - 1, 0)];
      if (prev) {
        Array.prototype.forEach.call(items, function(i) { i.setAttribute('aria-selected', 'false'); });
        prev.setAttribute('aria-selected', 'true');
        prev.focus();
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
      e.target.blur();
    }
  }

  function showSuggestions(query, results) {
    var suggestions = document.querySelector('#clima-suggestions');
    var input = document.querySelector('#clima-city-search');
    if (!suggestions || !input) return;

    if (results) {
      if (!results.length) {
        suggestions.innerHTML = '<div class="clima-suggestion-item" role="option" aria-selected="false">Nenhuma cidade encontrada</div>';
      } else {
        suggestions.innerHTML = results.map(function(city, index) {
          return '\
            <button type="button" class="clima-suggestion-item" role="option" aria-selected="' + (index === 0) + '" data-lat="' + city.lat + '" data-lon="' + city.lon + '" data-name="' + city.name + (city.state ? ', ' + city.state : '') + (city.country ? ', ' + city.country : '') + '">\
              <span class="material-symbols-rounded" aria-hidden="true">location_city</span>\
              <span>' + city.name + (city.state ? ', ' + city.state : '') + (city.country ? ', ' + city.country : '') + '</span>\
            </button>\
          ';
        }).join('');

        suggestions.querySelectorAll('.clima-suggestion-item[data-lat]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var lat = parseFloat(btn.dataset.lat);
            var lon = parseFloat(btn.dataset.lon);
            var name = btn.dataset.name;
            selectCity(lat, lon, name);
          });
        });
      }
    }

    suggestions.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function hideSuggestions() {
    var suggestions = document.querySelector('#clima-suggestions');
    var input = document.querySelector('#clima-city-search');
    if (suggestions) suggestions.hidden = true;
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function selectCity(lat, lon, name) {
    hideSuggestions();
    var input = document.querySelector('#clima-city-search');
    if (input) input.value = '';

    window.dispatchEvent(new CustomEvent('clima:select-city', { detail: { lat: lat, lon: lon, name: name } }));
  }

  function isDayTime(dt, offset) {
    var date = new Date((dt + offset) * 1000);
    var hour = date.getUTCHours();
    return hour >= 6 && hour < 19;
  }

  function getRelativeTime(timestamp) {
    var diff = Math.round((Date.now() - timestamp) / 1000);
    if (diff < 60) return diff + 's';
    if (diff < 3600) return Math.round(diff / 60) + 'min';
    if (diff < 86400) return Math.round(diff / 3600) + 'h';
    return Math.round(diff / 86400) + 'd';
  }

  function announceToScreenReader(message) {
    var liveRegion = document.getElementById('clima-live-region');
    if (liveRegion) {
      liveRegion.textContent = '';
      setTimeout(function() { liveRegion.textContent = message; }, 100);
    }
  }

  // ===== RENDER HELPERS =====
  function renderCurrentSkeleton() {
    return '\
      <article class="clima-current-card skeleton">\
        <div class="clima-current-main">\
          <div class="skeleton-line skeleton-short"></div>\
          <div class="skeleton-line skeleton-temp"></div>\
          <div class="skeleton-line skeleton-medium"></div>\
        </div>\
        <div class="clima-current-details">\
          ' + Array(6).fill(0).map(function() { return '\
            <div class="clima-detail-item skeleton">\
              <div class="skeleton-circle"></div>\
              <div class="skeleton-line"></div>\
              <div class="skeleton-line skeleton-short"></div>\
            </div>\
          '; }).join('') + '\
        </div>\
      </article>\
    ';
  }

  function renderHourlySkeleton() {
    return '\
      <article class="clima-hourly-card skeleton">\
        <div class="skeleton-line skeleton-short"></div>\
        <div class="skeleton-circle skeleton-icon"></div>\
        <div class="skeleton-line skeleton-temp"></div>\
        <div class="skeleton-line skeleton-short"></div>\
      </article>\
    ';
  }

  function renderDailySkeleton() {
    return '\
      <article class="clima-daily-card skeleton">\
        <div class="skeleton-line skeleton-short"></div>\
        <div class="skeleton-circle skeleton-icon"></div>\
        <div class="skeleton-line skeleton-temp"></div>\
        <div class="skeleton-line skeleton-short"></div>\
        <div class="skeleton-line skeleton-short"></div>\
      </article>\
    ';
  }

  function renderError(message, context) {
    return '\
      <div class="clima-error" role="alert">\
        <span class="material-symbols-rounded" aria-hidden="true">error</span>\
        <p>' + message + '</p>\
        <button type="button" class="btn btn-primary" onclick="window.dispatchEvent(new CustomEvent(\'clima:retry\'))">\
          <span class="material-symbols-rounded" aria-hidden="true">refresh</span>\
          Tentar novamente\
        </button>\
      </div>\
    ';
  }

  function renderEmptyState(message) {
    return '\
      <div class="clima-empty">\
        <span class="material-symbols-rounded" aria-hidden="true">cloud_off</span>\
        <p>' + message + '</p>\
      </div>\
    ';
  }

  function renderHourlyCard(hour, index) {
    var date = new Date((hour.dt + hour.timezoneOffset) * 1000);
    var time = date.getUTCHours().toString().padStart(2, '0') + 'h';
    var icon = getHourlyIcon(hour.weather ? hour.weather.id : 800, hour.dt, hour.timezoneOffset);
    var iconClass = hour.weather ? getWeatherIconClass(hour.weather.id) : '';
    var description = hour.weather ? getWeatherDescription(hour.weather.id, hour.weather.description) : '';
    var pop = formatPrecipitationProbability(hour.pop);
    var precip = hour.precipitation > 0 ? formatPrecipitation(hour.precipitation) : null;

    return '\
      <article class="clima-hourly-card has-glow" role="listitem" aria-label="' + time + ': ' + formatTemperature(hour.temp) + ', ' + description + (pop ? ', chuva ' + pop : '') + '">\
        <time class="clima-hourly-time" datetime="' + date.toISOString() + '">' + time + '</time>\
        <span class="material-symbols-rounded clima-hourly-icon ' + iconClass + '" aria-hidden="true">' + icon + '</span>\
        <span class="clima-hourly-temp">' + formatTemperature(hour.temp) + '</span>\
        ' + (pop && pop !== '0%' ? '<span class="clima-hourly-pop" title="Probabilidade de precipitação">' + pop + '</span>' : '') + '\
        ' + (precip ? '<span class="clima-hourly-precip" title="Volume de chuva">' + precip + '</span>' : '') + '\
        <span class="clima-hourly-wind" title="Vento">' + formatWindSpeed(hour.windSpeed) + '</span>\
      </article>\
    ';
  }

  function renderDailyCard(day, index) {
    var date = new Date(day.dt * 1000);
    var icon = day.weatherId ? getWeatherIcon(day.weatherId, true) : 'help';
    var iconClass = day.weatherId ? getWeatherIconClass(day.weatherId) : '';
    var description = day.weatherId ? getWeatherDescription(day.weatherId, '') : '';
    var pop = formatPrecipitationProbability(day.popMax);
    var precip = day.precipitation > 0 ? formatPrecipitation(day.precipitation) : null;

    return '\
      <article class="clima-daily-card has-glow" role="listitem" aria-label="' + formatDate(day.dt, day.timezoneOffset) + ': mínima ' + formatTemperature(day.tempMin, false) + ', máxima ' + formatTemperature(day.tempMax, false) + ', ' + description + (pop ? ', chuva ' + pop : '') + '">\
        <time class="clima-daily-date" datetime="' + day.date + '">' + formatDate(day.dt, day.timezoneOffset) + '</time>\
        <span class="material-symbols-rounded clima-daily-icon ' + iconClass + '" aria-hidden="true">' + icon + '</span>\
        <div class="clima-daily-temps">\
          <span class="clima-daily-max">' + formatTemperature(day.tempMax) + '</span>\
          <span class="clima-daily-min">' + formatTemperature(day.tempMin) + '</span>\
        </div>\
        <span class="clima-daily-condition">' + description + '</span>\
        <div class="clima-daily-details">\
          ' + (pop && pop !== '0%' ? '<span class="clima-daily-pop" title="Probabilidade de chuva"><span class="material-symbols-rounded" aria-hidden="true">grain</span>' + pop + '</span>' : '') + '\
          ' + (precip ? '<span class="clima-daily-precip" title="Volume de chuva"><span class="material-symbols-rounded" aria-hidden="true">water_drop</span>' + precip + '</span>' : '') + '\
          <span class="clima-daily-wind" title="Vento médio"><span class="material-symbols-rounded" aria-hidden="true">air</span>' + formatWindSpeed(day.windSpeedAvg) + '</span>\
          <span class="clima-daily-humidity" title="Umidade média"><span class="material-symbols-rounded" aria-hidden="true">water_drop</span>' + day.humidityAvg + '%</span>\
        </div>\
      </article>\
    ';
  }

  function renderInsightCard(insight) {
    var severityClasses = {
      info: 'clima-insight--info',
      warning: 'clima-insight--warning',
      alert: 'clima-insight--alert'
    };

    var severityIcons = {
      info: 'info',
      warning: 'warning_amber',
      alert: 'error'
    };

    return '\
      <article class="clima-insight-card has-glow ' + (severityClasses[insight.severity] || '') + '" role="listitem">\
        <div class="clima-insight-icon">\
          <span class="material-symbols-rounded" aria-hidden="true">' + (severityIcons[insight.severity] || 'info') + '</span>\
        </div>\
        <div class="clima-insight-content">\
          <h3 class="clima-insight-title">' + insight.title + '</h3>\
          <p class="clima-insight-message">' + insight.message + '</p>\
        </div>\
      </article>\
    ';
  }

  function getHourlyIcon(weatherId, dt, timezoneOffset) {
    var isDay = isDayTime(dt, timezoneOffset);
    return getWeatherIcon(weatherId, isDay);
  }

  // ===== GLOBAL EVENTS =====
  function handleRetry() {
    var state = window.getClimaState();
    if (state.location) {
      window.loadWeatherData(state.location.lat, state.location.lon, true);
    }
  }

  function handleSelectCity(e) {
    var detail = e.detail;
    window.searchAndLoadCity(detail.name).catch(function(err) {
      console.error('Erro ao carregar cidade selecionada:', err);
    });
  }

  window.addEventListener('clima:retry', handleRetry);
  window.addEventListener('clima:select-city', handleSelectCity);

  // Expor funções no window para o router SPA
  window.onClimaViewEnter = function(viewElement) {
    var container = viewElement || document.getElementById('view-clima');
    if (container) {
      window.currentViewContainer = container;
      window.initClimaUI(container);
    }
  };

  window.onClimaViewLeave = function() {
    window.destroyClimaUI();
    window.currentViewContainer = null;
  };

  // Auto-inicialização se a view já estiver ativa no carregamento
  function autoInit() {
    var isClimaView = document.body.dataset.view === 'clima' ||
                      location.hash === '#clima' ||
                      (document.getElementById('view-clima') && document.getElementById('view-clima').classList.contains('is-active-view'));

    if (isClimaView) {
      var container = document.getElementById('view-clima');
      if (container) {
        window.currentViewContainer = container;
        window.initClimaUI(container);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();