/**
 * Central do Clima - Módulo Principal
 * Inicialização, integração com SPA router, ciclo de vida da view
 */

import { initClimaUI, destroyClimaUI } from './clima-ui.js';
import { loadWeatherData, searchAndLoadCity, useCurrentLocation, refreshWeather, subscribe, getState, resetState } from './clima-store.js';
import { clearClimaCache } from './clima-api.js';

let climaInitialized = false;
let currentViewContainer = null;
let unsubscribeStore = null;

/**
 * Inicializa o módulo Clima
 * Deve ser chamado quando a view #clima é ativada
 * @param {HTMLElement} container - Elemento da view #view-clima
 */
export function initClima(container) {
  try {
    console.log('[Clima] initClima called', { container: container?.id, climaInitialized, currentViewContainer: currentViewContainer?.id });

    if (climaInitialized && currentViewContainer === container) {
      // Já inicializado nesta view, apenas atualiza se necessário
      const state = getState();
      if (state.location && !state.current) {
        loadWeatherData(state.location.lat, state.location.lon);
      }
      return;
    }

    // Limpa estado anterior se trocou de view
    if (currentViewContainer && currentViewContainer !== container) {
      destroyClima();
    }

    currentViewContainer = container;

    // Garante que o container existe e é visível
    if (!container) {
      console.error('[Clima] Container não encontrado');
      return;
    }

    // Força renderização imediata
    console.log('[Clima] Calling initClimaUI');
    initClimaUI(container);

    // Subscreve a eventos globais
    bindGlobalEvents();

    // Se já tem localização salva, carrega dados
    const state = getState();
    if (state.location) {
      loadWeatherData(state.location.lat, state.location.lon);
    } else if (state.autoLocation) {
      // Tenta geolocalização automática
      useCurrentLocation().catch(() => {
        // Silencioso - usuário pode usar busca manual
      });
    }

    climaInitialized = true;

    // Anuncia entrada na view para acessibilidade
    announceViewEntry();

    console.log('[Clima] initClima completed successfully');
  } catch (error) {
    console.error('[Clima] Erro em initClima:', error);
    // Tenta mostrar erro na UI
    if (container) {
      container.innerHTML = `
        <section class="section clima-error-section">
          <div class="clima-error" style="text-align:center;padding:48px 24px;color:var(--muted);">
            <span class="material-symbols-rounded" style="font-size:3rem;display:block;margin-bottom:16px;color:#ff2d55;">error</span>
            <p>Erro ao inicializar Central do Clima</p>
            <button class="btn btn-primary" onclick="window.onClimaViewEnter(document.getElementById('view-clima'))" style="margin-top:16px;">
              <span class="material-symbols-rounded">refresh</span> Tentar novamente
            </button>
          </div>
        </section>
      `;
    }
  }
}

/**
 * Destrói o módulo Clima (ao sair da view)
 */
export function destroyClima() {
  destroyClimaUI();
  unbindGlobalEvents();
  climaInitialized = false;
  currentViewContainer = null;
}

/**
 * Bind eventos globais (busca, retry, seleção de cidade)
 */
function bindGlobalEvents() {
  // Evento de retry global
  window.addEventListener('clima:retry', handleRetry);

  // Evento de seleção de cidade via sugestão
  window.addEventListener('clima:select-city', handleSelectCity);

  // Evento de mudança de unidade (futuro)
  window.addEventListener('clima:change-units', handleChangeUnits);
}

/**
 * Unbind eventos globais
 */
function unbindGlobalEvents() {
  window.removeEventListener('clima:retry', handleRetry);
  window.removeEventListener('clima:select-city', handleSelectCity);
  window.removeEventListener('clima:change-units', handleChangeUnits);
}

/**
 * Handler para retry
 */
function handleRetry() {
  const state = getState();
  if (state.location) {
    loadWeatherData(state.location.lat, state.location.lon, true);
  }
}

/**
 * Handler para seleção de cidade
 */
function handleSelectCity(e) {
  const { lat, lon, name } = e.detail;
  searchAndLoadCity(name).catch(err => {
    console.error('Erro ao carregar cidade selecionada:', err);
  });
}

/**
 * Handler para mudança de unidades
 */
function handleChangeUnits(e) {
  const { units } = e.detail;
  // Implementar se necessário
}

/**
 * Anuncia entrada na view para leitores de tela
 */
function announceViewEntry() {
  const liveRegion = document.getElementById('clima-live-region');
  if (liveRegion) {
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion.textContent = 'Central do Clima carregada. Use a busca ou o botão de localização para consultar o clima.';
    }, 500);
  }
}

/**
 * Função chamada pelo router SPA quando a view é ativada
 * Exportada para ser chamada do main.js
 */
export function onClimaViewEnter(viewElement) {
  const container = viewElement || document.getElementById('view-clima');
  if (container) {
    initClima(container);
  }
}

/**
 * Função chamada pelo router SPA quando a view é desativada
 */
export function onClimaViewLeave() {
  destroyClima();
}

// Expor no window para o router SPA acessar
window.onClimaViewEnter = onClimaViewEnter;
window.onClimaViewLeave = onClimaViewLeave;

/**
 * Prefetch de dados ao hover no nav-link (integração com warmupViews do main.js)
 */
export function prefetchClimaData() {
  const state = getState();
  if (state.location && !state.current) {
    loadWeatherData(state.location.lat, state.location.lon).catch(() => {});
  }
}

/**
 * Limpa cache de clima (útil para logout ou reset)
 */
export function clearClimaData() {
  clearClimaCache();
  resetState();
  if (currentViewContainer) {
    initClima(currentViewContainer);
  }
}

// Auto-inicialização se a view já estiver ativa no carregamento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

function autoInit() {
  // Verifica se estamos na view clima
  const isClimaView = document.body.dataset.view === 'clima' ||
                      location.hash === '#clima' ||
                      document.getElementById('view-clima')?.classList.contains('is-active-view');

  if (isClimaView) {
    const container = document.getElementById('view-clima');
    if (container) {
      initClima(container);
    }
  }
}

// Exporta store para debug
export { getState, subscribe } from './clima-store.js';