/**
 * Vercel Serverless Function: Proxy para OpenWeatherMap API
 * Protege a API key e implementa cache + rate limiting
 * Deploy automático em /api/weather
 */

const CACHE = new Map();
const RATE_LIMIT = new Map();

// Configuração via variáveis de ambiente
const CONFIG = {
  API_KEY: process.env.OPENWEATHER_API_KEY,
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  GEO_URL: 'https://api.openweathermap.org/geo/1.0',
  CURRENT_TTL: parseInt(process.env.WEATHER_CURRENT_TTL) || 600000, // 10 min
  FORECAST_TTL: parseInt(process.env.WEATHER_FORECAST_TTL) || 3600000, // 1h
  RATE_LIMIT_WINDOW: 60000, // 1 min
  RATE_LIMIT_MAX: parseInt(process.env.WEATHER_RATE_LIMIT) || 30,
  DEFAULT_LANG: 'pt_br',
  DEFAULT_UNITS: 'metric'
};

function getClientIP(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.headers['cf-connecting-ip'] ||
         'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;

  if (!RATE_LIMIT.has(ip)) {
    RATE_LIMIT.set(ip, []);
  }

  const requests = RATE_LIMIT.get(ip).filter(ts => ts > windowStart);

  if (requests.length >= CONFIG.RATE_LIMIT_MAX) {
    const oldest = requests[0];
    const retryAfter = Math.ceil((oldest + CONFIG.RATE_LIMIT_WINDOW - now) / 1000);
    return { allowed: false, retryAfter };
  }

  requests.push(now);
  RATE_LIMIT.set(ip, requests);
  return { allowed: true };
}

function getCacheKey(endpoint, params) {
  return `${endpoint}:${JSON.stringify(params)}`;
}

function getFromCache(key, ttl) {
  const entry = CACHE.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > ttl) {
    CACHE.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key, data) {
  CACHE.set(key, { data, timestamp: Date.now() });
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function handleCurrentWeather(params) {
  const cacheKey = getCacheKey('weather', params);
  const cached = getFromCache(cacheKey, CONFIG.CURRENT_TTL);
  if (cached) return { ...cached, cached: true };

  const url = new URL(`${CONFIG.BASE_URL}/weather`);
  url.searchParams.set('appid', CONFIG.API_KEY);
  url.searchParams.set('lang', CONFIG.DEFAULT_LANG);
  url.searchParams.set('units', CONFIG.DEFAULT_UNITS);

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  setCache(cacheKey, data);
  return { ...data, cached: false };
}

async function handleForecast(params) {
  const cacheKey = getCacheKey('forecast', params);
  const cached = getFromCache(cacheKey, CONFIG.FORECAST_TTL);
  if (cached) return { ...cached, cached: true };

  const url = new URL(`${CONFIG.BASE_URL}/forecast`);
  url.searchParams.set('appid', CONFIG.API_KEY);
  url.searchParams.set('lang', CONFIG.DEFAULT_LANG);
  url.searchParams.set('units', CONFIG.DEFAULT_UNITS);

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  setCache(cacheKey, data);
  return { ...data, cached: false };
}

async function handleGeocoding(query, limit = 5) {
  const cacheKey = getCacheKey('geocode', { query, limit });
  const cached = getFromCache(cacheKey, 86400000); // 24h cache para geocoding
  if (cached) return cached;

  const url = new URL(`${CONFIG.GEO_URL}/direct`);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('appid', CONFIG.API_KEY);

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Geocoding HTTP ${response.status}`);
  }

  const data = await response.json();
  setCache(cacheKey, data);
  return data;
}

async function handleReverseGeocoding(lat, lon, limit = 1) {
  const cacheKey = getCacheKey('reverse', { lat, lon, limit });
  const cached = getFromCache(cacheKey, 86400000);
  if (cached) return cached;

  const url = new URL(`${CONFIG.GEO_URL}/reverse`);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('appid', CONFIG.API_KEY);

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Reverse geocoding HTTP ${response.status}`);
  }

  const data = await response.json();
  setCache(cacheKey, data);
  return data;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  // Verificar API key configurada
  if (!CONFIG.API_KEY) {
    console.error('OPENWEATHER_API_KEY não configurada');
    return res.status(500).json({ error: 'Serviço de clima não configurado. Contate o administrador.' });
  }

  // Rate limiting por IP
  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', rateCheck.retryAfter.toString());
    return res.status(429).json({
      error: 'Muitas requisições. Tente novamente em alguns segundos.',
      retryAfter: rateCheck.retryAfter
    });
  }

  const { endpoint, ...params } = req.query;

  try {
    let data;

    switch (endpoint) {
      case 'current':
        if (!params.lat || !params.lon) {
          return res.status(400).json({ error: 'Parâmetros lat e lon são obrigatórios para clima atual.' });
        }
        data = await handleCurrentWeather({ lat: params.lat, lon: params.lon });
        break;

      case 'forecast':
        if (!params.lat || !params.lon) {
          return res.status(400).json({ error: 'Parâmetros lat e lon são obrigatórios para previsão.' });
        }
        data = await handleForecast({ lat: params.lat, lon: params.lon });
        break;

      case 'geocode':
        if (!params.q) {
          return res.status(400).json({ error: 'Parâmetro q (query) é obrigatório para geocoding.' });
        }
        data = await handleGeocoding(params.q, parseInt(params.limit) || 5);
        break;

      case 'reverse':
        if (!params.lat || !params.lon) {
          return res.status(400).json({ error: 'Parâmetros lat e lon são obrigatórios para reverse geocoding.' });
        }
        data = await handleReverseGeocoding(parseFloat(params.lat), parseFloat(params.lon), parseInt(params.limit) || 1);
        break;

      default:
        return res.status(400).json({ error: 'Endpoint inválido. Use: current, forecast, geocode ou reverse.' });
    }

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.status(200).json(data);

  } catch (error) {
    console.error('Weather API Error:', error);

    // Erros específicos da OpenWeatherMap
    if (error.message.includes('401') || error.message.includes('Invalid API key')) {
      return res.status(500).json({ error: 'Erro de autenticação com o provedor de clima.' });
    }

    if (error.message.includes('404')) {
      return res.status(404).json({ error: 'Localização não encontrada.' });
    }

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return res.status(504).json({ error: 'Tempo de resposta excedido. Tente novamente.' });
    }

    return res.status(500).json({ error: 'Erro interno ao buscar dados meteorológicos.' });
  }
};