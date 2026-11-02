/**
 * Utilitários de formatação para dados meteorológicos
 * Unidades: métricas (Celsius, km/h, hPa, mm, km)
 */

/**
 * Formata temperatura em Celsius
 * @param {number} temp - Temperatura em Celsius
 * @param {boolean} showUnit - Se deve mostrar o símbolo °C
 * @returns {string}
 */
export function formatTemperature(temp, showUnit = true) {
  if (temp === null || temp === undefined || isNaN(temp)) return '--';
  const rounded = Math.round(temp);
  return showUnit ? `${rounded}°C` : `${rounded}°`;
}

/**
 * Formata velocidade do vento de m/s para km/h
 * @param {number} speed - Velocidade em m/s
 * @returns {string}
 */
export function formatWindSpeed(speed) {
  if (speed === null || speed === undefined || isNaN(speed)) return '--';
  const kmh = Math.round(speed * 3.6);
  return `${kmh} km/h`;
}

/**
 * Converte graus em direção cardinal
 * @param {number} degrees - Direção em graus (0-360)
 * @returns {string} - Direção abreviada (N, NE, E, SE, S, SO, O, NO)
 */
export function formatWindDirection(degrees) {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return '--';

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Formata pressão atmosférica
 * @param {number} pressure - Pressão em hPa
 * @returns {string}
 */
export function formatPressure(pressure) {
  if (pressure === null || pressure === undefined || isNaN(pressure)) return '--';
  return `${Math.round(pressure)} hPa`;
}

/**
 * Formata umidade relativa
 * @param {number} humidity - Umidade em %
 * @returns {string}
 */
export function formatHumidity(humidity) {
  if (humidity === null || humidity === undefined || isNaN(humidity)) return '--';
  return `${Math.round(humidity)}%`;
}

/**
 * Formata visibilidade de metros para km
 * @param {number} visibility - Visibilidade em metros
 * @returns {string}
 */
export function formatVisibility(visibility) {
  if (visibility === null || visibility === undefined || isNaN(visibility)) return '--';
  const km = (visibility / 1000).toFixed(1);
  return `${km} km`;
}

/**
 * Formata precipitação em mm
 * @param {number} precipitation - Precipitação em mm
 * @returns {string}
 */
export function formatPrecipitation(precipitation) {
  if (precipitation === null || precipitation === undefined || isNaN(precipitation) || precipitation === 0) {
    return '0 mm';
  }
  return `${precipitation.toFixed(1)} mm`;
}

/**
 * Formata probabilidade de precipitação
 * @param {number} pop - Probabilidade (0-1)
 * @returns {string}
 */
export function formatPrecipitationProbability(pop) {
  if (pop === null || pop === undefined || isNaN(pop)) return '--';
  return `${Math.round(pop * 100)}%`;
}

/**
 * Converte timestamp UTC + offset para horário local formatado
 * @param {number} timestamp - Timestamp Unix (segundos)
 * @param {number} timezoneOffset - Offset do timezone em segundos
 * @param {boolean} short - Se deve usar formato curto (HH:mm)
 * @returns {string}
 */
export function formatLocalTime(timestamp, timezoneOffset, short = true) {
  if (!timestamp || !timezoneOffset) return '--:--';

  const date = new Date((timestamp + timezoneOffset) * 1000);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  return short ? `${hours}:${minutes}` : `${hours}:${minutes} (local)`;
}

/**
 * Formata data para exibição (ex: "Hoje", "Amanhã", "Seg, 15 Jan")
 * @param {number} timestamp - Timestamp Unix (segundos)
 * @param {number} timezoneOffset - Offset do timezone em segundos
 * @returns {string}
 */
export function formatDate(timestamp, timezoneOffset) {
  if (!timestamp) return '--';

  const date = new Date((timestamp + timezoneOffset) * 1000);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays === -1) return 'Ontem';

  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  return date.toLocaleDateString('pt-BR', options);
}

/**
 * Formata data completa para acessibilidade
 * @param {number} timestamp - Timestamp Unix (segundos)
 * @param {number} timezoneOffset - Offset do timezone em segundos
 * @returns {string}
 */
export function formatFullDate(timestamp, timezoneOffset) {
  if (!timestamp) return '';
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Calcula amplitude térmica
 * @param {number} min - Temp mínima
 * @param {number} max - Temp máxima
 * @returns {number}
 */
export function calculateThermalAmplitude(min, max) {
  if (min === null || max === null || min === undefined || max === undefined) return 0;
  return Math.round(max - min);
}

/**
 * Gera label de acessibilidade para card de clima
 * @param {Object} data - Dados do clima
 * @returns {string}
 */
export function generateAriaLabel(data) {
  const parts = [];
  if (data.city) parts.push(data.city);
  if (data.temp !== undefined) parts.push(`${Math.round(data.temp)} graus Celsius`);
  if (data.description) parts.push(data.description);
  if (data.humidity !== undefined) parts.push(`Umidade ${Math.round(data.humidity)} por cento`);
  if (data.windSpeed !== undefined) parts.push(`Vento ${Math.round(data.windSpeed * 3.6)} quilômetros por hora`);
  return parts.join(', ');
}

/**
 * Debounce function
 * @param {Function} fn - Função a executar
 * @param {number} delay - Delay em ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Função a executar
 * @param {number} limit - Limite em ms
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Verifica se está online
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Formata coordenadas para exibição
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string}
 */
export function formatCoordinates(lat, lon) {
  if (lat === undefined || lon === undefined) return '';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'L' : 'O';
  return `${Math.abs(lat).toFixed(2)}°${latDir} ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}