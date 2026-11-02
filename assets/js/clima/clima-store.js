/**
 * Store simples para gerenciamento de estado da Central do Clima
 * Padrão: estado reativo com subscribers
 */

import { fetchCurrentWeather, fetchForecast, fetchGeocoding, fetchReverseGeocoding, getUserLocation } from './clima-api.js';

// Estado inicial
const initialState = {
  // Localização
  location: null,           // { lat, lon, name, country, state }
  searchQuery: '',

  // Dados meteorológicos
  current: null,            // Dados do clima atual
  hourly: [],               // Array de previsões horárias (próximas 24h)
  daily: [],                // Array de previsões diárias (5 dias)

  // UI State
  loading: false,
  error: null,
  lastUpdated: null,
  usingCache: false,
  staleData: false,

  // Configurações
  units: 'metric',          // 'metric' | 'imperial'
  autoLocation: true        // Tentar geolocalização automática ao abrir
};

// Subscribers para reatividade
const subscribers = new Set();

const state = { ...initialState };

/**
 * Notifica todos os subscribers
 */
function notify() {
  subscribers.forEach(cb => cb(state));
}

/**
 * Subscreve a mudanças no estado
 * @param {Function} callback - Função chamada com novo estado
 * @returns {Function} - Função para cancelar subscrição
 */
export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Obtém estado atual (readonly)
 */
export function getState() {
  return { ...state };
}

/**
 * Atualiza estado parcial
 * @param {Object} partial - Estado parcial para mesclar
 */
function setState(partial) {
  Object.assign(state, partial);
  notify();
}

/**
 * Reseta estado para inicial
 */
export function resetState() {
  Object.assign(state, initialState);
  notify();
}

/**
 * Define erro e para loading
 * @param {string|null} error - Mensagem de erro ou null
 */
function setError(error) {
  setState({ error, loading: false });
}

/**
 * Inicia loading
 */
function setLoading(loading) {
  setState({ loading, error: null });
}

/**
 * Processa dados de clima atual da API
 */
function processCurrentWeather(data, timezoneOffset) {
  if (!data?.main) return null;

  return {
    temp: data.main.temp,
    feelsLike: data.main.feels_like,
    tempMin: data.main.temp_min,
    tempMax: data.main.temp_max,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    visibility: data.visibility,
    windSpeed: data.wind?.speed,
    windDeg: data.wind?.deg,
    windGust: data.wind?.gust,
    clouds: data.clouds?.all,
    weather: data.weather?.[0] ? {
      id: data.weather[0].id,
      main: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon
    } : null,
    sunrise: data.sys?.sunrise,
    sunset: data.sys?.sunset,
    timezoneOffset,
    dt: data.dt
  };
}

/**
 * Processa previsão horária (próximas 24-48h)
 */
function processHourlyForecast(data, timezoneOffset) {
  if (!data?.list?.length) return [];

  const now = Date.now() / 1000;
  const cutoff = now + 48 * 3600; // 48 horas

  return data.list
    .filter(item => item.dt > now && item.dt <= cutoff)
    .slice(0, 24) // Máximo 24 entradas
    .map(item => ({
      dt: item.dt,
      temp: item.main?.temp,
      feelsLike: item.main?.feels_like,
      humidity: item.main?.humidity,
      pressure: item.main?.pressure,
      windSpeed: item.wind?.speed,
      windDeg: item.wind?.deg,
      windGust: item.wind?.gust,
      clouds: item.clouds?.all,
      pop: item.pop, // Probability of precipitation
      precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0,
      weather: item.weather?.[0] ? {
        id: item.weather[0].id,
        main: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon
      } : null,
      timezoneOffset
    }));
}

/**
 * Processa previsão diária (agrupa por dia)
 */
function processDailyForecast(data, timezoneOffset) {
  if (!data?.list?.length) return [];

  const dailyMap = new Map();

  data.list.forEach(item => {
    const date = new Date((item.dt + timezoneOffset) * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, {
        date: dayKey,
        dt: item.dt,
        temps: [],
        humidity: [],
        pressure: [],
        windSpeeds: [],
        windDegs: [],
        pops: [],
        precipitation: 0,
        weatherCounts: new Map(),
        timezoneOffset
      });
    }

    const day = dailyMap.get(dayKey);
    day.temps.push(item.main?.temp);
    day.humidity.push(item.main?.humidity);
    day.pressure.push(item.main?.pressure);
    day.windSpeeds.push(item.wind?.speed);
    day.windDegs.push(item.wind?.deg);
    day.pops.push(item.pop || 0);
    day.precipitation += item.rain?.['3h'] || item.snow?.['3h'] || 0;

    const wId = item.weather?.[0]?.id;
    if (wId) {
      day.weatherCounts.set(wId, (day.weatherCounts.get(wId) || 0) + 1);
    }
  });

  // Converter para array e calcular médias
  return Array.from(dailyMap.values())
    .slice(0, 5) // 5 dias
    .map(day => {
      const mostCommonWeather = Array.from(day.weatherCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

      return {
        date: day.date,
        dt: day.dt,
        tempMin: Math.min(...day.temps.filter(t => t != null)),
        tempMax: Math.max(...day.temps.filter(t => t != null)),
        tempAvg: day.temps.reduce((a, b) => a + b, 0) / day.temps.length,
        humidityAvg: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        pressureAvg: Math.round(day.pressure.reduce((a, b) => a + b, 0) / day.pressure.length),
        windSpeedAvg: Math.round((day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length) * 10) / 10,
        windDegAvg: Math.round(day.windDegs.reduce((a, b) => a + b, 0) / day.windDegs.length),
        popMax: Math.max(...day.pops),
        precipitation: Math.round(day.precipitation * 10) / 10,
        weatherId: mostCommonWeather?.[0],
        timezoneOffset
      };
    });
}

/**
 * Carrega dados meteorológicos para coordenadas
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {boolean} forceRefresh - Força atualização
 */
export async function loadWeatherData(lat, lon, forceRefresh = false) {
  setLoading(true);

  try {
    // Busca clima atual e previsão em paralelo
    const [currentRes, forecastRes] = await Promise.all([
      fetchCurrentWeather(lat, lon, forceRefresh),
      fetchForecast(lat, lon, forceRefresh)
    ]);

    const timezoneOffset = currentRes.timezone_offset || forecastRes.city?.timezone || 0;

    const current = processCurrentWeather(currentRes, timezoneOffset);
    const hourly = processHourlyForecast(forecastRes, timezoneOffset);
    const daily = processDailyForecast(forecastRes, timezoneOffset);

    // Reverse geocoding para obter nome da localização se não tiver
    let locationName = state.location?.name;
    if (!locationName) {
      try {
        const reverse = await fetchReverseGeocoding(lat, lon);
        if (reverse?.[0]) {
          locationName = `${reverse[0].name}${reverse[0].state ? `, ${reverse[0].state}` : ''}${reverse[0].country ? `, ${reverse[0].country}` : ''}`;
        }
      } catch (e) {
        console.warn('Reverse geocoding falhou:', e.message);
      }
    }

    setState({
      current,
      hourly,
      daily,
      location: { lat, lon, name: locationName },
      lastUpdated: Date.now(),
      usingCache: currentRes.fromCache || forecastRes.fromCache,
      staleData: currentRes.stale || forecastRes.stale,
      loading: false,
      error: null
    });

  } catch (error) {
    console.error('Erro ao carregar clima:', error);
    setError(error.message || 'Erro ao carregar dados meteorológicos');
  }
}

/**
 * Busca cidade por nome e carrega clima
 * @param {string} query - Nome da cidade
 */
export async function searchAndLoadCity(query) {
  if (!query?.trim()) return;

  setState({ searchQuery: query.trim(), loading: true, error: null });

  try {
    const results = await fetchGeocoding(query.trim());

    if (!results?.length) {
      setError('Cidade não encontrada. Verifique o nome e tente novamente.');
      return;
    }

    // Usa o primeiro resultado
    const city = results[0];
    const lat = city.lat;
    const lon = city.lon;

    const locationName = `${city.name}${city.state ? `, ${city.state}` : ''}${city.country ? `, ${city.country}` : ''}`;

    setState({
      location: { lat, lon, name: locationName },
      searchQuery: ''
    });

    await loadWeatherData(lat, lon, true); // force refresh para nova cidade

  } catch (error) {
    console.error('Erro na busca:', error);
    setError(error.message || 'Erro ao buscar cidade');
  }
}

/**
 * Usa localização do usuário
 */
export async function useCurrentLocation() {
  setLoading(true);

  try {
    const { lat, lon } = await getUserLocation();

    setState({
      location: { lat, lon, name: 'Sua localização' }
    });

    await loadWeatherData(lat, lon, true);

  } catch (error) {
    console.warn('Geolocalização falhou, aguardando busca manual:', error.message);
    // Não seta erro - permite que o usuário use a busca manual
    setState({
      loading: false,
      error: null
    });
  }
}

/**
 * Atualiza dados atuais (refresh manual)
 */
export async function refreshWeather() {
  if (!state.location) return;
  await loadWeatherData(state.location.lat, state.location.lon, true);
}

/**
 * Define unidade de medida
 * @param {'metric'|'imperial'} units
 */
export function setUnits(units) {
  if (units === state.units) return;
  setState({ units });
  // Recarregar dados com nova unidade seria necessário se a API suportasse
  // Por enquanto apenas muda a formatação no frontend
}

/**
 * Obtém observações agronômicas baseadas nos dados atuais
 * @returns {Array<{type: string, message: string, severity: 'info'|'warning'|'alert'}>}
 */
export function getAgronomicInsights() {
  const insights = [];
  const { current, hourly, daily } = state;

  if (!current) return insights;

  // Chuva nas próximas 6 horas
  const next6Hours = hourly.slice(0, 6);
  const rainProbability = Math.max(...next6Hours.map(h => h.pop || 0));
  const totalRain = next6Hours.reduce((sum, h) => sum + (h.precipitation || 0), 0);

  if (rainProbability > 0.7) {
    insights.push({
      type: 'rain',
      severity: 'warning',
      icon: 'grain',
      title: 'Alta probabilidade de chuva',
      message: `Probabilidade de precipitação > 70% nas próximas 6 horas. Volume estimado: ${totalRain.toFixed(1)} mm. Planeje aplicações e colheita.`
    });
  } else if (rainProbability > 0.4) {
    insights.push({
      type: 'rain',
      severity: 'info',
      icon: 'grain',
      title: 'Possibilidade de chuva',
      message: `Probabilidade de precipitação ${Math.round(rainProbability * 100)}% nas próximas 6 horas. Acompanhe a evolução.`
    });
  }

  // Vento forte
  const maxWind = Math.max(current.windSpeed || 0, ...hourly.slice(0, 12).map(h => h.windSpeed || 0));
  if (maxWind > 15) { // > 15 km/h
    insights.push({
      type: 'wind',
      severity: maxWind > 25 ? 'alert' : 'warning',
      icon: 'air',
      title: 'Vento forte',
      message: `Vento até ${Math.round(maxWind)} km/h. Risco de deriva em pulverização. Evite aplicações aéreas.`
    });
  }

  // Amplitude térmica
  if (daily.length > 0) {
    const today = daily[0];
    const amplitude = today.tempMax - today.tempMin;
    if (amplitude > 15) {
      insights.push({
        type: 'temperature',
        severity: 'info',
        icon: 'thermostat',
        title: 'Amplitude térmica elevada',
        message: `Variação de ${Math.round(amplitude)}°C hoje (mín: ${Math.round(today.tempMin)}°C, máx: ${Math.round(today.tempMax)}°C). Atenção a estresse térmico em culturas sensíveis.`
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
      message: `Umidade em ${Math.round(current.humidity)}%. Condições favoráveis a incêndios e estresse hídrico. Irrigue se necessário.`
    });
  }

  // Umidade alta (doenças fúngicas)
  if (current.humidity > 85) {
    insights.push({
      type: 'humidity',
      severity: 'info',
      icon: 'water_drop',
      title: 'Umidade relativa alta',
      message: `Umidade em ${Math.round(current.humidity)}%. Condições favoráveis a doenças fúngicas. Monitore culturas suscetíveis.`
    });
  }

  // Pressão baixa (frente fria se aproximando)
  if (current.pressure && current.pressure < 1000) {
    insights.push({
      type: 'pressure',
      severity: 'info',
      icon: 'speed',
      title: 'Pressão atmosférica baixa',
      message: `Pressão em ${Math.round(current.pressure)} hPa. Pode indicar aproximação de frente fria ou instabilidade.`
    });
  }

  return insights;
}