/**
 * Renderização da UI da Central do Clima
 * Componentes: busca, clima atual, previsão horária, previsão diária, insights agronômicos
 */

import { getState, subscribe, refreshWeather, searchAndLoadCity, useCurrentLocation, getAgronomicInsights } from './clima-store.js';
import { formatTemperature, formatWindSpeed, formatWindDirection, formatHumidity, formatPressure, formatVisibility, formatLocalTime, formatDate, formatPrecipitation, formatPrecipitationProbability, formatCoordinates, generateAriaLabel, debounce, isOnline } from './clima-utils.js';
import { getWeatherIcon, getWeatherDescription, getHourlyIcon, getWeatherIconClass, getCustomSVG } from './clima-icons.js';

let unsubscribe = null;
let searchDebounce = null;
let searchAbortController = null;

/**
 * Inicializa a UI
 * @param {HTMLElement} container - Container raiz da view clima
 */
export function initClimaUI(container) {
  if (!container) return;

  // Render inicial
  render(container);

  // Subscreve a mudanças de estado
  unsubscribe = subscribe(state => updateUI(container, state));

  // Event listeners
  bindEvents(container);

  // Observa elementos .revelar criados dinamicamente
  // Necessário porque o reveal system do main.js roda ANTES da UI ser renderizada
  observeReveals(container);
}

/**
 * Observa elementos .revelar no container para animar entrada
 * Replica a lógica de observarReveals do main.js para elementos criados dinamicamente
 */
function observeReveals(container) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealReduzido = prefersReducedMotion || !('IntersectionObserver' in window);

  const els = container.querySelectorAll('.revelar:not(.ativo)');

  if (revealReduzido) {
    els.forEach(el => {
      el.classList.add('ativo');
      el.style.transitionDelay = '0s';
    });
    return;
  }

  // Cria observer local se não existir global
  if (!window.__climaRevealObserver) {
    window.__climaRevealObserver = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          revelarElemento(entrada.target);
          window.__climaRevealObserver.unobserve(entrada.target);
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.12 });
  }

  els.forEach(el => window.__climaRevealObserver.observe(el));
}

/**
 * Revela um elemento (adiciona classe ativo com animação)
 */
function revelarElemento(el) {
  el.style.willChange = 'opacity, transform';
  el.classList.add('ativo');
  setTimeout(() => {
    el.style.willChange = 'auto';
    el.classList.add('reveal-done');
  }, 1200);
}

/**
 * Limpa event listeners e subscrição
 */
export function destroyClimaUI() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  searchAbortController?.abort();
}

/**
 * Renderiza estrutura HTML inicial
 */
function render(container) {
  container.innerHTML = `
    <section class="hero clima-hero" aria-label="Central do Clima" data-bg="bg-clima">
      <div class="hero-content">
        <p class="clima-eyebrow"><svg class="clima-eyebrow-icon" aria-hidden="true"><use href="#icon-cloud-hero"></use></svg> Central do Clima</p>
        <h1 class="hero-title hero-title-grande" tabindex="-1">Condições meteorológicas em tempo real para decisões no campo</h1>
        <p class="hero-copy">Consulte temperatura, umidade, vento, precipitação e previsão para planejar suas atividades agrícolas.</p>
      </div>
    </section>

    <section class="section clima-search-section revelar" aria-labelledby="clima-search-title">
      <div class="section-header">
        <span class="section-badge clima-badge">Localização</span>
        <h2 id="clima-search-title">Onde você está?</h2>
      </div>
      <div class="clima-search-wrapper">
        <div class="clima-search-box">
          <label for="clima-city-search" class="sr-only">Buscar cidade</label>
          <span class="material-symbols-rounded search-icon" aria-hidden="true">search</span>
          <input
            type="search"
            id="clima-city-search"
            class="clima-search-input"
            placeholder="Digite uma cidade (ex: São Paulo, BR)..."
            autocomplete="off"
            aria-describedby="clima-search-hint"
            aria-expanded="false"
            aria-controls="clima-suggestions"
          >
          <button type="button" class="btn btn-secondary clima-location-btn" id="clima-location-btn" aria-label="Usar minha localização atual">
            <span class="material-symbols-rounded" aria-hidden="true">my_location</span>
            <span>Minha localização</span>
          </button>
        </div>
        <div id="clima-suggestions" class="clima-suggestions" role="listbox" aria-label="Sugestões de cidades" hidden></div>
        <p id="clima-search-hint" class="clima-search-hint">Pressione Enter para buscar ou selecione uma sugestão</p>
        <div class="clima-current-location" id="clima-current-location" aria-live="polite" hidden></div>
      </div>
    </section>

    <section class="section clima-current-section revelar" aria-labelledby="clima-current-title">
      <div class="section-header">
        <span class="section-badge clima-badge">Agora</span>
        <h2 id="clima-current-title">Clima Atual</h2>
      </div>
      <div class="clima-current-wrapper" id="clima-current-wrapper">
        <!-- Renderizado dinamicamente -->
      </div>
    </section>

    <section class="section clima-hourly-section revelar" aria-labelledby="clima-hourly-title">
      <div class="section-header">
        <span class="section-badge clima-badge">Próximas Horas</span>
        <h2 id="clima-hourly-title">Previsão Horária</h2>
      </div>
      <div class="clima-hourly-wrapper">
        <div class="clima-hourly-scroll" id="clima-hourly-scroll" role="region" aria-label="Previsão para as próximas 24 horas" tabindex="0">
          <div class="clima-hourly-track" id="clima-hourly-track">
            <!-- Cards horários renderizados dinamicamente -->
          </div>
        </div>
        <div class="clima-scroll-indicator" id="clima-scroll-indicator" aria-hidden="true">
          <span class="material-symbols-rounded">chevron_right</span>
        </div>
      </div>
    </section>

    <section class="section clima-daily-section revelar" aria-labelledby="clima-daily-title">
      <div class="section-header">
        <span class="section-badge clima-badge">Próximos Dias</span>
        <h2 id="clima-daily-title">Previsão 5 Dias</h2>
      </div>
      <div class="clima-daily-grid" id="clima-daily-grid" role="list" aria-label="Previsão para os próximos 5 dias">
        <!-- Cards diários renderizados dinamicamente -->
      </div>
    </section>

    <section class="section clima-insights-section revelar" aria-labelledby="clima-insights-title">
      <div class="section-header">
        <span class="section-badge clima-badge">Insights</span>
        <h2 id="clima-insights-title">Observações para o Campo</h2>
      </div>
      <div class="clima-insights-grid" id="clima-insights-grid" role="list" aria-label="Observações agronômicas baseadas nos dados meteorológicos">
        <!-- Insights renderizados dinamicamente -->
      </div>
      <p class="clima-disclaimer" id="clima-disclaimer">
        <span class="material-symbols-rounded" aria-hidden="true">info</span>
        <strong>Nota:</strong> Estas são informações meteorológicas baseadas em dados da OpenWeatherMap, não recomendações técnicas agronômicas.
        Para decisões de manejo, consulte sempre um engenheiro agrônomo ou técnico habilitado.
      </p>
    </section>

    <!-- Live region para anúncios de atualização -->
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="clima-live-region"></div>
  `;
}

/**
 * Atualiza UI baseada no estado
 */
function updateUI(container, state) {
  updateCurrentLocationDisplay(container, state);
  updateCurrentWeather(container, state);
  updateHourlyForecast(container, state);
  updateDailyForecast(container, state);
  updateInsights(container, state);
  updateLoadingState(container, state);
  updateErrorState(container, state);
  updateEmptyState(container, state);
}

/**
 * Atualiza exibição da localização atual
 */
function updateCurrentLocationDisplay(container, state) {
  const locationEl = container.querySelector('#clima-current-location');
  const searchInput = container.querySelector('#clima-city-search');

  if (!locationEl) return;

  if (state.location) {
    const updatedText = state.lastUpdated
      ? ` · Atualizado há ${getRelativeTime(state.lastUpdated)}`
      : '';
    const staleText = state.staleData ? ' (dados desatualizados)' : '';
    const cacheText = state.usingCache ? ' (cache)' : '';

    locationEl.hidden = false;
    locationEl.innerHTML = `
      <span class="material-symbols-rounded" aria-hidden="true">location_on</span>
      <span>${state.location.name}${updatedText}${staleText}${cacheText}</span>
      ${state.usingCache || state.staleData ? `<button type="button" class="clima-refresh-btn" aria-label="Atualizar dados" title="Atualizar dados"><span class="material-symbols-rounded">refresh</span></button>` : ''}
    `;

    // Atualiza placeholder do input
    if (searchInput && !searchInput.matches(':focus')) {
      searchInput.placeholder = state.location.name;
    }
  } else {
    locationEl.hidden = true;
  }
}

/**
 * Atualiza card de clima atual
 */
function updateCurrentWeather(container, state) {
  const wrapper = container.querySelector('#clima-current-wrapper');
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

  const c = state.current;
  const weather = c.weather;
  const icon = weather ? getWeatherIcon(weather.id, isDayTime(c.dt, c.timezoneOffset)) : 'help';
  const description = weather ? getWeatherDescription(weather.id, weather.description) : 'Indisponível';
  const iconClass = weather ? getWeatherIconClass(weather.id) : '';

  wrapper.innerHTML = `
    <article class="clima-current-card has-glow" aria-label="${generateAriaLabel({ ...c, city: state.location?.name, description })}">
      <div class="clima-current-main">
        <div class="clima-current-location">
          <span class="material-symbols-rounded" aria-hidden="true">location_on</span>
          <span>${state.location?.name || 'Localização desconhecida'}</span>
        </div>
        <div class="clima-current-temp">
          <span class="clima-temp-value">${formatTemperature(c.temp)}</span>
          <span class="clima-feels-like">Sensação ${formatTemperature(c.feelsLike, false)}</span>
        </div>
        <div class="clima-current-condition">
          <span class="material-symbols-rounded clima-current-icon ${iconClass}" aria-hidden="true">${icon}</span>
          <span>${description}</span>
        </div>
      </div>

      <div class="clima-current-details" role="list" aria-label="Detalhes meteorológicos">
        <div class="clima-detail-item" role="listitem">
          <span class="material-symbols-rounded" aria-hidden="true">water_drop</span>
          <div class="clima-detail-content">
            <span class="clima-detail-value">${formatHumidity(c.humidity)}</span>
            <span class="clima-detail-label">Umidade</span>
          </div>
        </div>
        <div class="clima-detail-item" role="listitem">
          <span class="material-symbols-rounded" aria-hidden="true">air</span>
          <div class="clima-detail-content">
            <span class="clima-detail-value">${formatWindSpeed(c.windSpeed)}</span>
            <span class="clima-detail-label">Vento ${formatWindDirection(c.windDeg)}</span>
          </div>
        </div>
        <div class="clima-detail-item" role="listitem">
          <span class="material-symbols-rounded" aria-hidden="true">speed</span>
          <div class="clima-detail-content">
            <span class="clima-detail-value">${formatPressure(c.pressure)}</span>
            <span class="clima-detail-label">Pressão</span>
          </div>
        </div>
        <div class="clima-detail-item" role="listitem">
          <span class="material-symbols-rounded" aria-hidden="true">visibility</span>
          <div class="clima-detail-content">
            <span class="clima-detail-value">${formatVisibility(c.visibility)}</span>
            <span class="clima-detail-label">Visibilidade</span>
          </div>
        </div>
        <div class="clima-detail-item" role="listitem">
          <span class="material-symbols-rounded" aria-hidden="true">wb_sunny</span>
          <div class="clima-detail-content">
            <span class="clima-detail-value">${formatLocalTime(c.sunrise, c.timezoneOffset)}</span>
            <span class="clima-detail-label">Nascer</span>
          </div>
        </div>
        <div class="clima-detail-item" role="listitem">
          <span class="material-symbols-rounded" aria-hidden="true">nights_stay</span>
          <div class="clima-detail-content">
            <span class="clima-detail-value">${formatLocalTime(c.sunset, c.timezoneOffset)}</span>
            <span class="clima-detail-label">Pôr do sol</span>
          </div>
        </div>
      </div>

      <div class="clima-current-meta">
        <span class="clima-coordinates">${formatCoordinates(c.lat, c.lon)}</span>
        <span class="clima-timezone">UTC${c.timezoneOffset >= 0 ? '+' : ''}${Math.round(c.timezoneOffset / 3600)}</span>
        <button type="button" class="clima-refresh-btn" aria-label="Atualizar dados" title="Atualizar agora">
          <span class="material-symbols-rounded">refresh</span>
        </button>
      </div>
    </article>
  `;

  // Re-bind refresh button
  wrapper.querySelector('.clima-refresh-btn')?.addEventListener('click', () => refreshWeather());
}

/**
 * Atualiza previsão horária
 */
function updateHourlyForecast(container, state) {
  const track = container.querySelector('#clima-hourly-track');
  const scrollContainer = container.querySelector('#clima-hourly-scroll');
  const indicator = container.querySelector('#clima-scroll-indicator');
  if (!track) return;

  if (state.loading && !state.hourly.length) {
    track.innerHTML = Array(6).fill(0).map(() => renderHourlySkeleton()).join('');
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

  track.innerHTML = state.hourly.map((hour, index) => renderHourlyCard(hour, index)).join('');
}

/**
 * Atualiza previsão diária
 */
function updateDailyForecast(container, state) {
  const grid = container.querySelector('#clima-daily-grid');
  if (!grid) return;

  if (state.loading && !state.daily.length) {
    grid.innerHTML = Array(5).fill(0).map(() => renderDailySkeleton()).join('');
    return;
  }

  if (!state.daily.length) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = state.daily.map((day, index) => renderDailyCard(day, index)).join('');
}

/**
 * Atualiza insights agronômicos
 */
function updateInsights(container, state) {
  const grid = container.querySelector('#clima-insights-grid');
  const disclaimer = container.querySelector('#clima-disclaimer');
  if (!grid) return;

  const insights = getAgronomicInsights();

  if (!insights.length) {
    grid.innerHTML = `
      <div class="clima-insight-empty">
        <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
        <p>Nenhuma observação especial no momento. Condições dentro da normalidade.</p>
      </div>
    `;
    if (disclaimer) disclaimer.hidden = true;
    return;
  }

  if (disclaimer) disclaimer.hidden = false;

  grid.innerHTML = insights.map(insight => renderInsightCard(insight)).join('');
}

/**
 * Atualiza estado de loading
 */
function updateLoadingState(container, state) {
  const locationBtn = container.querySelector('#clima-location-btn');
  if (locationBtn) {
    locationBtn.disabled = state.loading;
    if (state.loading && !locationBtn.querySelector('.clima-loading-spinner')) {
      locationBtn.innerHTML = `
        <span class="material-symbols-rounded clima-loading-spinner" aria-hidden="true">refresh</span>
        <span>Localizando...</span>
      `;
    } else if (!state.loading) {
      locationBtn.innerHTML = `
        <span class="material-symbols-rounded" aria-hidden="true">my_location</span>
        <span>Minha localização</span>
      `;
    }
  }
}

/**
 * Atualiza estado de erro
 */
function updateErrorState(container, state) {
  if (state.error) {
    announceToScreenReader(state.error);
  }
}

/**
 * Atualiza estado vazio
 */
function updateEmptyState(container, state) {
  // Handled in individual sections
}

/**
 * Bind event listeners
 */
function bindEvents(container) {
  // Botão de localização atual
  const locationBtn = container.querySelector('#clima-location-btn');
  locationBtn?.addEventListener('click', () => useCurrentLocation());

  // Busca de cidade
  const searchInput = container.querySelector('#clima-city-search');
  const suggestions = container.querySelector('#clima-suggestions');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) showSuggestions(searchInput.value.trim());
    });
    searchInput.addEventListener('blur', () => {
      // Delay para permitir clique nas sugestões
      setTimeout(() => hideSuggestions(), 200);
    });
  }

  // Fechar sugestões ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.clima-search-box') && !e.target.closest('.clima-suggestions')) {
      hideSuggestions();
    }
  });

  // Scroll indicator para horário
  const scrollContainer = container.querySelector('#clima-hourly-scroll');
  const track = container.querySelector('#clima-hourly-track');
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', () => {
      const indicator = container.querySelector('#clima-scroll-indicator');
      if (indicator) {
        const atEnd = scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 10;
        indicator.hidden = atEnd;
      }

      // Esconde/ mostra temperatures baseado na posição do scroll
      if (track) {
        const temps = track.querySelectorAll('.clima-hourly-temp');
        temps.forEach((temp, index) => {
          const card = temp.closest('.clima-hourly-card');
          if (card) {
            const cardRect = card.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            const isVisible = cardRect.right > containerRect.left && cardRect.left < containerRect.right;
            const isNearEnd = scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 50;

            // Esconde se não está visível OU se está no final
            if (!isVisible || isNearEnd) {
              temp.classList.add('hidden');
            } else {
              temp.classList.remove('hidden');
            }
          }
        });
      }
    });
  }

  // Click nas temperaturas horárias para scroll suave
  if (track) {
    track.addEventListener('click', (e) => {
      const temp = e.target.closest('.clima-hourly-temp');
      if (temp) {
        const card = temp.closest('.clima-hourly-card');
        if (card) {
          const cardRect = card.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const isLastCard = card === track.lastElementChild;

          if (isLastCard) {
            // Se clicar no último card, vai para o final
            scrollContainer.scrollTo({
              left: scrollContainer.scrollWidth,
              behavior: 'smooth'
            });
          } else {
            // Scroll para centralizar o card clicado
            const scrollLeft = card.offsetLeft - (scrollContainer.clientWidth / 2) + (card.offsetWidth / 2);
            scrollContainer.scrollTo({
              left: Math.max(0, scrollLeft),
              behavior: 'smooth'
            });
          }
        }
      }
    });
  }
}

/**
 * Handle search input
 */
async function handleSearchInput(e) {
  const query = e.target.value.trim();
  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  searchAbortController?.abort();
  searchAbortController = new AbortController();

  try {
    const { fetchGeocoding } = await import('./clima-api.js');
    const results = await fetchGeocoding(query);
    showSuggestions(query, results);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.warn('Erro na busca de sugestões:', error);
    }
  }
}

/**
 * Handle search keydown
 */
function handleSearchKeydown(e) {
  const suggestions = document.querySelector('#clima-suggestions');
  const items = suggestions?.querySelectorAll('[role="option"]');

  if (e.key === 'Enter') {
    e.preventDefault();
    const selected = suggestions?.querySelector('[role="option"][aria-selected="true"]') || items?.[0];
    if (selected) {
      selected.click();
    } else if (e.target.value.trim()) {
      searchAndLoadCity(e.target.value.trim());
    }
    hideSuggestions();
  } else if (e.key === 'ArrowDown' && items?.length) {
    e.preventDefault();
    const current = suggestions.querySelector('[aria-selected="true"]');
    const index = current ? Array.from(items).indexOf(current) : -1;
    const next = items[Math.min(index + 1, items.length - 1)];
    if (next) {
      items.forEach(i => i.setAttribute('aria-selected', 'false'));
      next.setAttribute('aria-selected', 'true');
      next.focus();
    }
  } else if (e.key === 'ArrowUp' && items?.length) {
    e.preventDefault();
    const current = suggestions.querySelector('[aria-selected="true"]');
    const index = current ? Array.from(items).indexOf(current) : 0;
    const prev = items[Math.max(index - 1, 0)];
    if (prev) {
      items.forEach(i => i.setAttribute('aria-selected', 'false'));
      prev.setAttribute('aria-selected', 'true');
      prev.focus();
    }
  } else if (e.key === 'Escape') {
    hideSuggestions();
    e.target.blur();
  }
}

/**
 * Mostra sugestões de cidades
 */
function showSuggestions(query, results = null) {
  const suggestions = document.querySelector('#clima-suggestions');
  const input = document.querySelector('#clima-city-search');
  if (!suggestions || !input) return;

  if (results) {
    if (!results.length) {
      suggestions.innerHTML = '<div class="clima-suggestion-item" role="option" aria-selected="false">Nenhuma cidade encontrada</div>';
    } else {
      suggestions.innerHTML = results.map((city, index) => `
        <button type="button" class="clima-suggestion-item" role="option" aria-selected="${index === 0}" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}${city.state ? `, ${city.state}` : ''}${city.country ? `, ${city.country}` : ''}">
          <span class="material-symbols-rounded" aria-hidden="true">location_city</span>
          <span>${city.name}${city.state ? `, ${city.state}` : ''}${city.country ? `, ${city.country}` : ''}</span>
        </button>
      `).join('');

      // Bind click events
      suggestions.querySelectorAll('.clima-suggestion-item[data-lat]').forEach(btn => {
        btn.addEventListener('click', () => {
          const lat = parseFloat(btn.dataset.lat);
          const lon = parseFloat(btn.dataset.lon);
          const name = btn.dataset.name;
          selectCity(lat, lon, name);
        });
      });
    }
  }

  suggestions.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

/**
 * Esconde sugestões
 */
function hideSuggestions() {
  const suggestions = document.querySelector('#clima-suggestions');
  const input = document.querySelector('#clima-city-search');
  if (suggestions) suggestions.hidden = true;
  if (input) input.setAttribute('aria-expanded', 'false');
}

/**
 * Seleciona cidade da sugestão
 */
function selectCity(lat, lon, name) {
  hideSuggestions();
  const input = document.querySelector('#clima-city-search');
  if (input) input.value = '';

  // Atualiza store diretamente via evento customizado
  window.dispatchEvent(new CustomEvent('clima:select-city', { detail: { lat, lon, name } }));
}

/**
 * Verifica se é dia baseado no timestamp
 */
function isDayTime(dt, offset) {
  const date = new Date((dt + offset) * 1000);
  const hour = date.getUTCHours();
  return hour >= 6 && hour < 19;
}

/**
 * Retorna tempo relativo (ex: "5 min", "2h")
 */
function getRelativeTime(timestamp) {
  const diff = Math.round((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}min`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

/**
 * Anuncia para leitores de tela
 */
function announceToScreenReader(message) {
  const liveRegion = document.getElementById('clima-live-region');
  if (liveRegion) {
    liveRegion.textContent = '';
    setTimeout(() => liveRegion.textContent = message, 100);
  }
}

// ===== Render Functions =====

function renderCurrentSkeleton() {
  return `
    <article class="clima-current-card skeleton">
      <div class="clima-current-main">
        <div class="skeleton-line skeleton-short"></div>
        <div class="skeleton-line skeleton-temp"></div>
        <div class="skeleton-line skeleton-medium"></div>
      </div>
      <div class="clima-current-details">
        ${Array(6).fill(0).map(() => `
          <div class="clima-detail-item skeleton">
            <div class="skeleton-circle"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-short"></div>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderHourlySkeleton() {
  return `
    <article class="clima-hourly-card skeleton">
      <div class="skeleton-line skeleton-short"></div>
      <div class="skeleton-circle skeleton-icon"></div>
      <div class="skeleton-line skeleton-temp"></div>
      <div class="skeleton-line skeleton-short"></div>
    </article>
  `;
}

function renderDailySkeleton() {
  return `
    <article class="clima-daily-card skeleton">
      <div class="skeleton-line skeleton-short"></div>
      <div class="skeleton-circle skeleton-icon"></div>
      <div class="skeleton-line skeleton-temp"></div>
      <div class="skeleton-line skeleton-short"></div>
      <div class="skeleton-line skeleton-short"></div>
    </article>
  `;
}

function renderError(message, context = '') {
  return `
    <div class="clima-error" role="alert">
      <span class="material-symbols-rounded" aria-hidden="true">error</span>
      <p>${message}</p>
      <button type="button" class="btn btn-primary" onclick="window.dispatchEvent(new CustomEvent('clima:retry'))">
        <span class="material-symbols-rounded" aria-hidden="true">refresh</span>
        Tentar novamente
      </button>
    </div>
  `;
}

function renderEmptyState(message) {
  return `
    <div class="clima-empty">
      <span class="material-symbols-rounded" aria-hidden="true">cloud_off</span>
      <p>${message}</p>
    </div>
  `;
}

function renderHourlyCard(hour, index) {
  const date = new Date((hour.dt + hour.timezoneOffset) * 1000);
  const time = date.getUTCHours().toString().padStart(2, '0') + 'h';
  const icon = getHourlyIcon(hour.weather?.id || 800, hour.dt, hour.timezoneOffset);
  const iconClass = hour.weather ? getWeatherIconClass(hour.weather.id) : '';
  const description = hour.weather ? getWeatherDescription(hour.weather.id, hour.weather.description) : '';
  const pop = formatPrecipitationProbability(hour.pop);
  const precip = hour.precipitation > 0 ? formatPrecipitation(hour.precipitation) : null;

  return `
    <article class="clima-hourly-card has-glow" role="listitem" aria-label="${time}: ${formatTemperature(hour.temp)}, ${description}${pop ? `, chuva ${pop}` : ''}">
      <time class="clima-hourly-time" datetime="${date.toISOString()}">${time}</time>
      <span class="material-symbols-rounded clima-hourly-icon ${iconClass}" aria-hidden="true">${icon}</span>
      <span class="clima-hourly-temp">${formatTemperature(hour.temp)}</span>
      ${pop && pop !== '0%' ? `<span class="clima-hourly-pop" title="Probabilidade de precipitação">${pop}</span>` : ''}
      ${precip ? `<span class="clima-hourly-precip" title="Volume de chuva">${precip}</span>` : ''}
      <span class="clima-hourly-wind" title="Vento">${formatWindSpeed(hour.windSpeed)}</span>
    </article>
  `;
}

function renderDailyCard(day, index) {
  const date = new Date(day.dt * 1000); // day.dt já tem offset aplicado no processamento
  const icon = day.weatherId ? getWeatherIcon(day.weatherId, true) : 'help';
  const iconClass = day.weatherId ? getWeatherIconClass(day.weatherId) : '';
  const description = day.weatherId ? getWeatherDescription(day.weatherId, '') : '';
  const pop = formatPrecipitationProbability(day.popMax);
  const precip = day.precipitation > 0 ? formatPrecipitation(day.precipitation) : null;

  return `
    <article class="clima-daily-card has-glow" role="listitem" aria-label="${formatDate(day.dt, day.timezoneOffset)}: mínima ${formatTemperature(day.tempMin, false)}, máxima ${formatTemperature(day.tempMax, false)}, ${description}${pop ? `, chuva ${pop}` : ''}">
      <div class="clima-daily-main">
        <time class="clima-daily-date" datetime="${day.date}">${formatDate(day.dt, day.timezoneOffset)}</time>
        <span class="material-symbols-rounded clima-daily-icon ${iconClass}" aria-hidden="true">${icon}</span>
        <div class="clima-daily-temps">
          <span class="clima-daily-max">${formatTemperature(day.tempMax)}</span>
          <span class="clima-daily-min">${formatTemperature(day.tempMin)}</span>
        </div>
        <span class="clima-daily-condition">${description}</span>
      </div>
      <div class="clima-daily-details">
        ${pop && pop !== '0%' ? `<span class="clima-daily-pop" title="Probabilidade de chuva"><span class="material-symbols-rounded" aria-hidden="true">grain</span>${pop}</span>` : ''}
        ${precip ? `<span class="clima-daily-precip" title="Volume de chuva"><span class="material-symbols-rounded" aria-hidden="true">water_drop</span>${precip}</span>` : ''}
        <span class="clima-daily-wind" title="Vento médio"><span class="material-symbols-rounded" aria-hidden="true">air</span>${formatWindSpeed(day.windSpeedAvg)}</span>
        <span class="clima-daily-humidity" title="Umidade média"><span class="material-symbols-rounded" aria-hidden="true">water_drop</span>${day.humidityAvg}%</span>
      </div>
    </article>
  `;
}

function renderInsightCard(insight) {
  const severityClasses = {
    info: 'clima-insight--info',
    warning: 'clima-insight--warning',
    alert: 'clima-insight--alert'
  };

  const severityIcons = {
    info: 'info',
    warning: 'warning_amber',
    alert: 'error'
  };

  return `
    <article class="clima-insight-card has-glow ${severityClasses[insight.severity]}" role="listitem">
      <div class="clima-insight-icon">
        <span class="material-symbols-rounded" aria-hidden="true">${severityIcons[insight.severity]}</span>
      </div>
      <div class="clima-insight-content">
        <h3 class="clima-insight-title">${insight.title}</h3>
        <p class="clima-insight-message">${insight.message}</p>
      </div>
    </article>
  `;
}