/**
 * Mapeamento de códigos de clima OpenWeatherMap para ícones Material Symbols
 * https://openweathermap.org/weather-conditions
 */

// Mapeamento principal: weather condition ID -> ícone Material Symbols
export const WEATHER_ICONS = {
  // Grupo 2xx: Tempestade
  200: 'thunderstorm',      // Trovoada com chuva leve
  201: 'thunderstorm',      // Trovoada com chuva
  202: 'thunderstorm',      // Trovoada com chuva forte
  210: 'thunderstorm',      // Trovoada leve
  211: 'thunderstorm',      // Trovoada
  212: 'thunderstorm',      // Trovoada forte
  221: 'thunderstorm',      // Trovoada irregular
  230: 'thunderstorm',      // Trovoada com garoa leve
  231: 'thunderstorm',      // Trovoada com garoa
  232: 'thunderstorm',      // Trovoada com garoa forte

  // Grupo 3xx: Garoa
  300: 'sprinkler',         // Garoa leve
  301: 'sprinkler',         // Garoa
  302: 'sprinkler',         // Garoa forte
  310: 'sprinkler',         // Chuva fraca com garoa
  311: 'sprinkler',         // Chuva com garoa
  312: 'sprinkler',         // Chuva forte com garoa
  313: 'sprinkler',         // Pancadas de garoa
  314: 'sprinkler',         // Pancadas fortes de garoa
  321: 'sprinkler',         // Pancadas de garoa

  // Grupo 5xx: Chuva
  500: 'rainy',             // Chuva leve
  501: 'rainy',             // Chuva moderada
  502: 'rainy',             // Chuva forte
  503: 'rainy',             // Chuva muito forte
  504: 'rainy',             // Chuva extrema
  511: 'ac_unit',           // Chuva congelante
  520: 'rainy',             // Pancadas de chuva leve
  521: 'rainy',             // Pancadas de chuva
  522: 'rainy',             // Pancadas de chuva forte
  531: 'rainy',             // Pancadas de chuva irregular

  // Grupo 6xx: Neve
  600: 'ac_unit',           // Neve leve
  601: 'ac_unit',           // Neve
  602: 'ac_unit',           // Neve forte
  611: 'ac_unit',           // Neve com chuva
  612: 'ac_unit',           // Pancadas de neve com chuva leve
  613: 'ac_unit',           // Pancadas de neve com chuva
  615: 'ac_unit',           // Chuva e neve leve
  616: 'ac_unit',           // Chuva e neve
  620: 'ac_unit',           // Pancadas de neve leve
  621: 'ac_unit',           // Pancadas de neve
  622: 'ac_unit',           // Pancadas de neve forte

  // Grupo 7xx: Atmosfera
  701: 'foggy',             // Neblina
  711: 'smog',              // Fumaça
  721: 'foggy',             // Névoa seca
  731: 'sandstorm',         // Redemoinhos de areia/pó
  741: 'foggy',             // Neblina densa
  751: 'sandstorm',         // Areia
  761: 'sandstorm',         // Pó
  762: 'volcano',           // Cinzas vulcânicas
  771: 'air',               // Rajadas
  781: 'tornado',           // Tornado

  // Grupo 800: Céu limpo
  800: 'wb_sunny',          // Céu limpo

  // Grupo 80x: Nuvens
  801: 'wb_cloudy',         // Poucas nuvens (11-25%)
  802: 'cloud',             // Nuvens dispersas (25-50%)
  803: 'cloud',             // Nuvens quebradas (50-85%)
  804: 'cloud'              // Nuvens encobertas (85-100%)
};

// Ícones para período do dia (dia/noite)
export const DAY_NIGHT_ICONS = {
  // Dia
  clear_day: 'wb_sunny',
  few_clouds_day: 'wb_cloudy',
  scattered_clouds_day: 'cloud',
  broken_clouds_day: 'cloud',
  overcast_day: 'cloud',

  // Noite
  clear_night: 'nights_stay',
  few_clouds_night: 'cloud_queue',
  scattered_clouds_night: 'cloud_queue',
  broken_clouds_night: 'cloud_queue',
  overcast_night: 'cloud_queue',

  // Chuva (funciona dia/noite)
  rain: 'rainy',
  drizzle: 'sprinkler',
  thunderstorm: 'thunderstorm',
  snow: 'ac_unit',
  mist: 'foggy',
  fog: 'foggy',
  haze: 'foggy',
  dust: 'sandstorm',
  sand: 'sandstorm',
  ash: 'volcano',
  squall: 'air',
  tornado: 'tornado'
};

/**
 * Obtém o ícone Material Symbols para um código de clima
 * @param {number} weatherId - ID da condição climática (OpenWeatherMap)
 * @param {boolean} isDay - Se é período diurno
 * @returns {string} Nome do ícone Material Symbols
 */
export function getWeatherIcon(weatherId, isDay = true) {
  // Verifica mapeamento direto primeiro
  if (WEATHER_ICONS[weatherId]) {
    return WEATHER_ICONS[weatherId];
  }

  // Fallback por grupo (primeiro dígito)
  const group = Math.floor(weatherId / 100);
  switch (group) {
    case 2: return 'thunderstorm';
    case 3: return 'sprinkler';
    case 5: return 'rainy';
    case 6: return 'ac_unit';
    case 7: return 'foggy';
    case 8:
      if (weatherId === 800) return isDay ? 'wb_sunny' : 'nights_stay';
      return 'cloud';
    default: return 'help';
  }
}

/**
 * Obtém o ícone para previsão horária (usa ícone do tempo + indicação dia/noite)
 * @param {number} weatherId - ID da condição climática
 * @param {number} dt - Timestamp da previsão
 * @param {number} timezoneOffset - Offset do timezone em segundos
 * @returns {string}
 */
export function getHourlyIcon(weatherId, dt, timezoneOffset) {
  const date = new Date((dt + timezoneOffset) * 1000);
  const hour = date.getUTCHours();
  const isDay = hour >= 6 && hour < 19; // 6h-19h = dia

  return getWeatherIcon(weatherId, isDay);
}

/**
 * Obtém classe CSS para cor do ícone baseada na condição
 * @param {number} weatherId - ID da condição climática
 * @returns {string} Classe CSS
 */
export function getWeatherIconClass(weatherId) {
  const group = Math.floor(weatherId / 100);
  switch (group) {
    case 2: return 'clima-icon--thunderstorm'; // Vermelho/laranja
    case 3: return 'clima-icon--drizzle';      // Azul claro
    case 5: return 'clima-icon--rain';         // Azul
    case 6: return 'clima-icon--snow';         // Azul gelo
    case 7: return 'clima-icon--atmosphere';   // Cinza
    case 8:
      if (weatherId === 800) return 'clima-icon--clear'; // Amarelo/laranja
      return 'clima-icon--clouds';           // Cinza claro
    default: return '';
  }
}

/**
 * Obtém descrição amigável da condição em português
 * @param {number} weatherId - ID da condição climática
 * @param {string} description - Descrição original da API
 * @returns {string}
 */
export function getWeatherDescription(weatherId, description) {
  // Se a API já retorna em pt_br, usar direto
  if (description && /[ãáàâéêíóôõúç]/i.test(description)) {
    return description.charAt(0).toUpperCase() + description.slice(1);
  }

  // Fallback manual para casos onde a API não retorna pt-BR
  const descriptions = {
    200: 'Trovoada com chuva leve',
    201: 'Trovoada com chuva',
    202: 'Trovoada com chuva forte',
    210: 'Trovoada leve',
    211: 'Trovoada',
    212: 'Trovoada forte',
    221: 'Trovoada irregular',
    230: 'Trovoada com garoa leve',
    231: 'Trovoada com garoa',
    232: 'Trovoada com garoa forte',
    300: 'Garoa leve',
    301: 'Garoa',
    302: 'Garoa forte',
    310: 'Chuva fraca com garoa',
    311: 'Chuva com garoa',
    312: 'Chuva forte com garoa',
    313: 'Pancadas de garoa',
    314: 'Pancadas fortes de garoa',
    321: 'Pancadas de garoa',
    500: 'Chuva leve',
    501: 'Chuva moderada',
    502: 'Chuva forte',
    503: 'Chuva muito forte',
    504: 'Chuva extrema',
    511: 'Chuva congelante',
    520: 'Pancadas de chuva leve',
    521: 'Pancadas de chuva',
    522: 'Pancadas de chuva forte',
    531: 'Pancadas de chuva irregular',
    600: 'Neve leve',
    601: 'Neve',
    602: 'Neve forte',
    611: 'Chuva e neve',
    612: 'Pancadas de chuva e neve leve',
    613: 'Pancadas de chuva e neve',
    615: 'Chuva e neve leve',
    616: 'Chuva e neve',
    620: 'Pancadas de neve leve',
    621: 'Pancadas de neve',
    622: 'Pancadas de neve forte',
    701: 'Neblina',
    711: 'Fumaça',
    721: 'Névoa seca',
    731: 'Redemoinhos de areia',
    741: 'Neblina densa',
    751: 'Areia',
    761: 'Pó',
    762: 'Cinzas vulcânicas',
    771: 'Rajadas de vento',
    781: 'Tornado',
    800: 'Céu limpo',
    801: 'Poucas nuvens',
    802: 'Nuvens dispersas',
    803: 'Nuvens quebradas',
    804: 'Nuvens encobertas'
  };

  return descriptions[weatherId] || (description ? description.charAt(0).toUpperCase() + description.slice(1) : 'Condição desconhecida');
}

/**
 * SVG inline para ícones customizados (fallback se Material Symbols não carregar)
 * Retorna string SVG
 */
export const CUSTOM_WEATHER_SVGS = {
  sunny: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  cloudy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H7a7 7 0 1 1 0-14h9a5 5 0 1 1 0 10h.5"/></svg>`,
  rainy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H7a7 7 0 1 1 0-14h9a5 5 0 1 1 0 10h.5"/><path d="M12 14v6M8 17v6M16 17v6"/></svg>`,
  storm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H7a7 7 0 1 1 0-14h9a5 5 0 1 1 0 10h.5"/><path d="M13 12l-2 5h4l-2 5"/></svg>`,
  snowy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H7a7 7 0 1 1 0-14h9a5 5 0 1 1 0 10h.5"/><path d="M10 16l-1 3M14 16l1 3M12 14v6"/></svg>`,
  foggy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h18M3 12h18M3 16h18"/></svg>`,
  night_clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  night_cloudy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><path d="M17.5 19H7a7 7 0 1 1 0-14h9a5 5 0 1 1 0 10h.5"/></svg>`
};

/**
 * Obtém SVG customizado para uma condição
 * @param {string} key - Chave do SVG
 * @returns {string}
 */
export function getCustomSVG(key) {
  return CUSTOM_WEATHER_SVGS[key] || CUSTOM_WEATHER_SVGS.cloudy;
}