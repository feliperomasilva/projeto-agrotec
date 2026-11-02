/**
 * Cliente API para OpenWeatherMap via serverless function
 * Implementa cache local (sessionStorage) e stale-while-revalidate
 */

// const API_BASE = '/.netlify/functions/weather'; // Netlify Functions
const API_BASE = '/api/weather'; // Para Vercel

// Chaves de cache
const CACHE_KEYS = {
  CURRENT: 'clima_current_',
  FORECAST: 'clima_forecast_',
  GEOCODE: 'clima_geocode_',
  REVERSE: 'clima_reverse_'
};

// TTLs em ms (devem coincidir com backend)
const TTL = {
  CURRENT: 10 * 60 * 1000,    // 10 min
  FORECAST: 60 * 60 * 1000,   // 1h
  GEOCODE: 24 * 60 * 60 * 1000 // 24h
};

/**
 * Gera chave de cache para coordenadas
 */
function getCoordKey(lat, lon) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/**
 * Verifica se cache é válido
 */
function isCacheValid(timestamp, ttl) {
  return Date.now() - timestamp < ttl;
}

/**
 * Obtém dados do cache
 */
function getFromCache(key) {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    const { data, timestamp } = JSON.parse(stored);
    return { data, timestamp };
  } catch (e) {
    return null;
  }
}

/**
 * Salva dados no cache
 */
function setCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // Cache cheio ou desabilitado - ignora silenciosamente
  }
}

/**
 * Faz requisição para a API com timeout e retry para cold start
 */
async function fetchAPI(endpoint, params, timeout = 20000, retries = 2) {
  const url = new URL(API_BASE, window.location.origin);
  url.searchParams.set('endpoint', endpoint);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(id);

      // Se for AbortError (timeout) ou erro de rede, tenta novamente
      const isRetryable = error.name === 'AbortError' ||
                          error instanceof TypeError || // network error
                          error.message.includes('Failed to fetch');

      if (isRetryable && attempt < retries) {
        // Backoff exponencial: 1s, 2s
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      if (error.name === 'AbortError') {
        throw new Error('Timeout na requisição. Tente novamente.');
      }
      throw error;
    }
  }
}

/**
 * Busca clima atual por coordenadas
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {boolean} forceRefresh - Força refresh ignorando cache
 * @returns {Promise<Object>}
 */
export async function fetchCurrentWeather(lat, lon, forceRefresh = false) {
  const coordKey = getCoordKey(lat, lon);
  const cacheKey = CACHE_KEYS.CURRENT + coordKey;

  // Verifica cache primeiro (stale-while-revalidate)
  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached && isCacheValid(cached.timestamp, TTL.CURRENT)) {
      return { ...cached.data, fromCache: true };
    }
  }

  try {
    const data = await fetchAPI('current', { lat: lat.toString(), lon: lon.toString() });
    setCache(cacheKey, data);
    return { ...data, fromCache: false };
  } catch (error) {
    // Fallback: retorna cache expirado se disponível
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.warn('Usando cache expirado para clima atual:', error.message);
      return { ...cached.data, fromCache: true, stale: true };
    }
    throw error;
  }
}

/**
 * Busca previsão 5 dias por coordenadas
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {boolean} forceRefresh - Força refresh ignorando cache
 * @returns {Promise<Object>}
 */
export async function fetchForecast(lat, lon, forceRefresh = false) {
  const coordKey = getCoordKey(lat, lon);
  const cacheKey = CACHE_KEYS.FORECAST + coordKey;

  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached && isCacheValid(cached.timestamp, TTL.FORECAST)) {
      return { ...cached.data, fromCache: true };
    }
  }

  try {
    const data = await fetchAPI('forecast', { lat: lat.toString(), lon: lon.toString() });
    setCache(cacheKey, data);
    return { ...data, fromCache: false };
  } catch (error) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.warn('Usando cache expirado para previsão:', error.message);
      return { ...cached.data, fromCache: true, stale: true };
    }
    throw error;
  }
}

/**
 * Busca coordenadas por nome de cidade (geocoding)
 * @param {string} query - Nome da cidade (ex: "São Paulo,BR")
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>}
 */
export async function fetchGeocoding(query, limit = 5) {
  const cacheKey = CACHE_KEYS.GEOCODE + query.toLowerCase();

  const cached = getFromCache(cacheKey);
  if (cached && isCacheValid(cached.timestamp, TTL.GEOCODE)) {
    return cached.data;
  }

  try {
    const data = await fetchAPI('geocode', { q: query, limit: limit.toString() });
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    const cached = getFromCache(cacheKey);
    if (cached) return cached.data;
    throw error;
  }
}

/**
 * Busca nome da cidade por coordenadas (reverse geocoding)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>}
 */
export async function fetchReverseGeocoding(lat, lon) {
  const coordKey = getCoordKey(lat, lon);
  const cacheKey = CACHE_KEYS.REVERSE + coordKey;

  const cached = getFromCache(cacheKey);
  if (cached && isCacheValid(cached.timestamp, TTL.GEOCODE)) {
    return cached.data;
  }

  try {
    const data = await fetchAPI('reverse', { lat: lat.toString(), lon: lon.toString() });
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    const cached = getFromCache(cacheKey);
    if (cached) return cached.data;
    throw error;
  }
}

/**
 * Obtém localização atual do usuário via Geolocation API
 * @returns {Promise<{lat: number, lon: number}>}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste navegador'));
      return;
    }

    // Primeira tentativa: alta precisão com timeout maior
    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      error => {
        // Fallback: baixa precisão (mais rápido)
        if (error.code === error.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            position => {
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude
              });
            },
            err => {
              let message;
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
              maximumAge: 10 * 60 * 1000 // 10 min cache
            }
          );
        } else {
          let message;
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
        maximumAge: 5 * 60 * 1000 // 5 min
      }
    );
  });
}

/**
 * Limpa todo o cache de clima
 */
export function clearClimaCache() {
  Object.values(CACHE_KEYS).forEach(prefix => {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    }
  });
}

/**
 * Obtém status do cache para debug
 */
export function getCacheStatus() {
  const status = { current: 0, forecast: 0, geocode: 0, reverse: 0 };
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(CACHE_KEYS.CURRENT)) status.current++;
    else if (key?.startsWith(CACHE_KEYS.FORECAST)) status.forecast++;
    else if (key?.startsWith(CACHE_KEYS.GEOCODE)) status.geocode++;
    else if (key?.startsWith(CACHE_KEYS.REVERSE)) status.reverse++;
  }
  return status;
}