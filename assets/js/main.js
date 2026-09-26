/* O estado "sem JS" só é removido após o roteador pronto (evita ponto único de falha).
   Em CSS, .no-js .revelar e .no-js .view mantêm o conteúdo visível caso o JS falhe. */

document.addEventListener("DOMContentLoaded", () => {
    const prefereReduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollSuave = prefereReduzirMovimento ? 'auto' : 'smooth';

    // SPA: o navegador nunca deve restaurar a posição de rolagem da página anterior.
    if ('scrollRestoration' in history) {
        try { history.scrollRestoration = 'manual'; } catch (e) {}
    }

    /* ============================================================
       SISTEMA DE REVEAL — anima a entrada das views
       riscos/educacao/dicas/alternativas re-animam TODA vez que abrem
       ============================================================ */
    const REANIMAR_VIEWS = new Set(['riscos', 'educacao', 'dicas', 'alternativas']);
    const revealReduzido = prefereReduzirMovimento || !('IntersectionObserver' in window);

    function revelarElemento(el) {
        el.style.willChange = 'opacity, transform';
        el.classList.add('ativo');
        setTimeout(() => {
            el.style.willChange = 'auto';
            // Entrada concluída: remove o stagger para o hover/magnético
            // dos cards 2+ responderem na hora (pareciam "mortos").
            el.classList.add('reveal-done');
        }, 1200);
    }

    const observadorReveal = revealReduzido ? null : new IntersectionObserver((entradas) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                revelarElemento(entrada.target);
                observadorReveal.unobserve(entrada.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.12 });

    function observarReveals(raiz) {
        const els = (raiz || document).querySelectorAll('.revelar:not(.ativo)');
        if (revealReduzido || !observadorReveal) {
            els.forEach(el => {
                el.classList.add('ativo');
                el.style.transitionDelay = '0s';
            });
            return;
        }
        els.forEach(el => observadorReveal.observe(el));
    }

    // Reseta a animação de entrada de uma view para tocar de novo.
    // Chamada a cada troca de view nas 4 páginas de conteúdo.
    function reiniciarRevealsDaView(viewEl) {
        if (!viewEl || revealReduzido || !observadorReveal) return;
        viewEl.querySelectorAll('.revelar').forEach(el => {
            try { observadorReveal.unobserve(el); } catch (e) {}
            el.classList.remove('ativo', 'reveal-done');
            el.style.willChange = '';
        });
        // Reflow: garante que a remoção da classe seja pintada antes
        // de re-observar, senão a transição não reinicia.
        void viewEl.offsetHeight;
        observarReveals(viewEl);
    }

    // Toda troca de view começa no topo — sem herdar a rolagem da página anterior.
    // Usa rolagem 'instant' (objeto) para ignorar o `scroll-behavior: smooth` global;
    // a forma `scrollTo(0, 0)` herdaria o smooth e "viajaria" pelo conteúdo antigo.
    // Reafirma no próximo frame porque ScrollTrigger.refresh/imagens podem deslocar a rolagem.
    function rolarParaTopoInstantaneo() {
        const root = document.documentElement;
        const corpo = document.body;
        const prevRoot = root.style.scrollBehavior;
        const prevBody = corpo ? corpo.style.scrollBehavior : '';
        root.style.scrollBehavior = 'auto';
        if (corpo) corpo.style.scrollBehavior = 'auto';
        try {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } catch (e) {
            window.scrollTo(0, 0);
        }
        root.scrollTop = 0;
        if (corpo) corpo.scrollTop = 0;
        requestAnimationFrame(() => {
            try {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            } catch (e2) {
                window.scrollTo(0, 0);
            }
            root.scrollTop = 0;
            if (corpo) corpo.scrollTop = 0;
            root.style.scrollBehavior = prevRoot;
            if (corpo) corpo.style.scrollBehavior = prevBody;
        });
    }

    /* ============================================================
       ROTEADOR SPA — troca de "página" via hash, com transição suave
       ============================================================ */
    const VIEWS = ['home', 'tela', 'riscos', 'educacao', 'dicas', 'alternativas', 'sos'];

    const TITULOS = {
        home: 'Cultivar o Amanhã | AgroConsciência',
        tela: 'Início | AgroConsciência',
        riscos: 'Riscos dos Agrotóxicos | AgroConsciência',
        educacao: 'Educação Ambiental | AgroConsciência',
        dicas: 'Dicas de Uso Consciente | AgroConsciência',
        alternativas: 'Alternativas Sustentáveis | AgroConsciência',
        sos: 'SOS Emergência | AgroConsciência'
    };

    const viewsCache = new Map(VIEWS.map(v => [v, document.getElementById(`view-${v}`)]));
    let viewAtiva = document.querySelector('.view.is-active-view') || null;
    const navLinksCache = Array.from(document.querySelectorAll('.nav-link'));
    const linkPorView = new Map(navLinksCache.map(l => [(l.getAttribute('href') || '').slice(1), l]));
    const mobileMenuCache = document.querySelector('[data-mobile-menu]');
    const menuToggleCache = document.querySelector('[data-menu-toggle]');
    let linkAtivoAtual = null;

    function hidratarIframes(viewEl) {
        if (!viewEl) return;
        viewEl.querySelectorAll('iframe[data-src]:not([src])').forEach(iframe => {
            iframe.setAttribute('src', iframe.getAttribute('data-src'));
        });
    }

    function mostrarView(nome, ancoraId) {
        const alvo = viewsCache.get(nome);
        if (!alvo) return;

        const trocouDeView = viewAtiva !== alvo;
        if (trocouDeView) {
            if (viewAtiva) viewAtiva.classList.remove('is-active-view');
            alvo.classList.add('is-active-view');
            viewAtiva = alvo;
            // riscos/educacao/dicas/alternativas: re-tocam a animação de entrada a cada visita
            if (REANIMAR_VIEWS.has(nome)) reiniciarRevealsDaView(alvo);
        }
        hidratarIframes(alvo);

        document.body.dataset.view = nome;
        const novoTitulo = TITULOS[nome] || TITULOS.home;
        if (document.title !== novoTitulo) document.title = novoTitulo;

        const linkAtivo = linkPorView.get(nome) || null;
        if (linkAtivoAtual !== linkAtivo) {
            if (linkAtivoAtual) linkAtivoAtual.classList.remove('is-active');
            if (linkAtivo) linkAtivo.classList.add('is-active');
            linkAtivoAtual = linkAtivo;
        }

        if (mobileMenuCache && mobileMenuCache.classList.contains('is-open')) {
            mobileMenuCache.classList.remove('is-open');
            if (menuToggleCache) {
                menuToggleCache.setAttribute('aria-expanded', 'false');
                menuToggleCache.focus({ preventScroll: true });
            }
        }

        // Background sob demanda da view ativa (C4). Home usa canvas próprio — sem download.
        // 1+5 LUXO/CINEMÁTICO: além de carregar, ATIVA o bg correspondente.
        // Sem isso o bg-XYZ baixava mas nunca ganhava .active (ficava opacity:0)
        // e os headers das 4 páginas perdiam a foto após removermos o bg local.
        const bgPorView = { home: 'bg-home', tela: 'bg-tela', riscos: 'bg-riscos', educacao: 'bg-educacao', dicas: 'bg-dicas', alternativas: 'bg-alternativas' };
        const bgId = bgPorView[nome];
        if (bgId) {
            try { if (typeof carregarBg === 'function') carregarBg(bgId); } catch (e) {}
            try {
                document.querySelectorAll('.bg-image').forEach(img => {
                    img.classList.toggle('active', img.id === bgId);
                });
            } catch (e2) {}
        } else if (nome === 'sos') {
            // SOS esconde o container via CSS; limpa .active para não vazar foto ao sair
            try { document.querySelectorAll('.bg-image.active').forEach(img => img.classList.remove('active')); } catch (e3) {}
        }

        // Acessibilidade SPA: troca de view sempre começa no topo + move o foco ao h1
        if (trocouDeView && !ancoraId) {
            rolarParaTopoInstantaneo();
            const titulo = alvo.querySelector('h1');
            if (titulo) {
                if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1');
                titulo.focus({ preventScroll: true });
            }
        }

        if (!ancoraId) {
            // Mesma view re-clicada (ex.: já estou em #riscos e clico em Riscos):
            // também volta ao topo. Na troca de view o topo já foi aplicado acima.
            if (!trocouDeView) rolarParaTopoInstantaneo();
            return;
        }
        const destino = document.getElementById(ancoraId);
        if (destino) {
            requestAnimationFrame(() => {
                destino.scrollIntoView({ behavior: prefereReduzirMovimento ? 'auto' : 'smooth', block: 'start' });
            });
        } else {
            window.scrollTo(0, 0);
        }
    }

    function rotear() {
        const hash = location.hash.replace('#', '');
        if (!hash) { mostrarView('home'); return; }
        if (VIEWS.includes(hash)) { mostrarView(hash); return; }
        const destino = document.getElementById(hash);
        const viewPai = destino ? destino.closest('.view') : null;
        if (destino && viewPai) {
            mostrarView(viewPai.id.replace('view-', ''), hash);
            return;
        }
    }

    window.addEventListener('hashchange', rotear);
    rotear();
    // Iframes só hidratam na ativação da view (lazy real). Nada de hidratação no boot.
    if (viewAtiva) hidratarIframes(viewAtiva);
    // JS pronto: remove estado sem-JS após o roteador (evita ponto único de falha).
    document.documentElement.classList.remove('no-js');

    /* ============================================================
       BACKGROUNDS SOB DEMANDA — só a view ativa baixa a foto
       ============================================================ */
    function carregarBg(id) {
        const el = document.getElementById(id);
        if (!el || el.dataset.bgLoaded) return;
        const src = el.getAttribute('data-bg-src');
        if (!src) return;
        el.style.backgroundImage = `url('${src}')`;
        el.dataset.bgLoaded = '1';
    }

    /* ============================================================
       WARM-UP 4 VIEWS — prefetch de imagem sob demanda (sem iframe)
       Lazy real: nunca hidrata YouTube no idle/hover
       ============================================================ */
    (function warmupViews() {
        const aquecidas = new Set();
        function aquecer(nome) {
            if (aquecidas.has(nome)) return;
            aquecidas.add(nome);
            const view = viewsCache.get(nome);
            if (!view) return;
            // Prefetch leve: só a primeira imagem da view futura
            const img = view.querySelector('img[srcset], img[src]');
            if (img) {
                const url = (img.currentSrc || img.src || '').split(' ')[0];
                if (url && !document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
                    const l = document.createElement('link');
                    l.rel = 'prefetch'; l.as = 'image'; l.href = url;
                    document.head.appendChild(l);
                }
            }
            // Pré-carrega o background da view futura (sem exibir)
            const bgMap = { riscos: 'bg-riscos', educacao: 'bg-educacao', dicas: 'bg-dicas', alternativas: 'bg-alternativas' };
            if (bgMap[nome]) carregarBg(bgMap[nome]);
        }
        document.querySelectorAll('.nav-link').forEach(link => {
            const nome = (link.getAttribute('href') || '').slice(1);
            if (!VIEWS.includes(nome)) return;
            link.addEventListener('pointerenter', () => aquecer(nome), { passive: true });
            link.addEventListener('focus', () => aquecer(nome), { passive: true });
        });
        // Sem prefetch em massa no idle: preserva dados móveis e o lazy dos iframes.
    })();

    /* ============================================================
       REVEAL INICIAL — observa os reveals existentes.
       A re-animação das 4 views de conteúdo é feita por
       reiniciarRevealsDaView() a cada troca de view (acima).
       ============================================================ */
    observarReveals(document);

   /* ============================================================
   SLIDING NUMBERS — Vanilla JS
   Adaptado do componente React SlidingNumber
   ============================================================ */

(function initSlidingNumbers() {
    'use strict';

    const containers = document.querySelectorAll('[data-sliding-number]');
    if (!containers.length) return;

    const instances = new Map();
    const homeInstances = [];

    function buildSlidingNumber(container) {
        const target = parseInt(container.dataset.target, 10) || 0;
        const suffix = container.dataset.suffix || '';
        const duration = parseInt(container.dataset.duration, 10) || 1400;
        const stagger = parseFloat(container.dataset.stagger) || 80;

        container.innerHTML = '';
        container.classList.add('sliding-number');
        container.style.opacity = '0';

        const targetStr = String(target);
        const digits = [];

        for (let i = 0; i < targetStr.length; i++) {
            const digitWrap = document.createElement('div');
            digitWrap.className = 'sliding-digit';

            const track = document.createElement('div');
            track.className = 'sliding-digit-track';

            for (let n = 0; n <= 9; n++) {
                const span = document.createElement('span');
                span.textContent = n;
                track.appendChild(span);
            }

            digitWrap.appendChild(track);
            container.appendChild(digitWrap);
            digits.push({ track, index: i });
        }

        if (suffix) {
            const suffixEl = document.createElement('span');
            suffixEl.className = 'sliding-suffix';
            suffixEl.textContent = suffix;
            container.appendChild(suffixEl);
        }

        container.offsetHeight;
        container.style.opacity = '1';

        return { target, suffix, duration, stagger, digits, targetStr, container };
    }

    function animateInstance(instance) {
        const { targetStr, digits, duration, stagger } = instance;
        digits.forEach(({ track, index }) => {
            const digitVal = parseInt(targetStr[index], 10);
            track.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${index * stagger}ms`;
            track.offsetHeight;
            track.style.transform = `translateY(-${digitVal}em)`;
        });
    }

    function resetInstance(instance) {
        instance.digits.forEach(({ track }) => {
            track.style.transition = 'none';
            track.style.transform = 'translateY(0)';
            track.offsetHeight;
            track.style.transition = '';
        });
    }

    containers.forEach(container => {
        const instance = buildSlidingNumber(container);
        instances.set(container, instance);
        if (container.closest('#view-home .home-hero')) homeInstances.push(instance);

        if (prefereReduzirMovimento) {
            container.innerHTML = instance.target + instance.suffix;
            container.style.opacity = '1';
        }
    });

    if (homeInstances.length) {
        const inHomeHero = (el) => !!(el && el.closest && el.closest('#view-home .home-hero'));
        window.__slidingHome = {
            animate() { homeInstances.forEach(animateInstance); },
            reset() { homeInstances.forEach(resetInstance); },
            isHome(el) { return inHomeHero(el); }
        };
    }

    if (!prefereReduzirMovimento) {
        const isHomeHero = (el) => !!(el && el.closest && el.closest('#view-home .home-hero'));
        const animados = new WeakSet();
        const slidingObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const instance = instances.get(entry.target);
                if (!instance) return;
                if (isHomeHero(entry.target)) return;
                // #tela e demais views: anima uma vez, sem reset (evita piscar 00%)
                if (entry.isIntersecting && !animados.has(entry.target)) {
                    animados.add(entry.target);
                    animateInstance(instance);
                    slidingObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });
        containers.forEach(container => slidingObs.observe(container));
    }
})();

    /* ============================================================
       GLOW NO MOUSE + EFEITO MAGNÉTICO — Event Delegation Otimizado
       Reduz de múltiplos listeners (50+) para 1-2 globais com closest()
       ============================================================ */
    if (!prefereReduzirMovimento && window.matchMedia('(hover: hover)').matches) {
        const seletorGlow = '.card, .metric-card, .alt-card, .step-card, .pillar-card, .data-card, .alert-card, .faq-item';
        // Sem efeito magnético nos .metric-card (75%/90%): o translate mexia nos dígitos do sliding-number
        const seletorMagnetico = '.card, .alert-card, .data-card, .pillar-card, .step-card, .alt-card';
        document.querySelectorAll('.metric-card').forEach(el => { el.style.translate = ''; });

        // Magnético com listeners por card (mouseenter/move/leave): o modelo
        // anterior com delegation global + lastMag travava no primeiro card —
        // a troca de alvo e o mouseout limpavam o translate do card novo.
        document.querySelectorAll(seletorMagnetico).forEach((card) => {
            if (card.dataset.magInit) return;
            if (card.closest('#view-sos') || card.closest('#view-home .home-hero')) return;
            card.dataset.magInit = '1';
            const forca = 0.015;
            const maxDesloc = 3;
            function garantirTransicao() {
                if (card.dataset.magSuave) return;
                card.dataset.magSuave = '1';
                const base = (card.style.transition || '').trim().replace(/,?\s*translate[^,;]*/g, '').replace(/^,|,$/g, '').trim();
                card.style.transition = (base ? base + ', ' : '') + 'translate 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
            }
            card.addEventListener('mouseenter', () => { garantirTransicao(); }, { passive: true });
            card.addEventListener('mousemove', (e) => {
                garantirTransicao();
                const rect = card.getBoundingClientRect();
                const x = Math.max(-maxDesloc, Math.min(maxDesloc, (e.clientX - rect.left - rect.width / 2) * forca));
                const y = Math.max(-maxDesloc, Math.min(maxDesloc, (e.clientY - rect.top - rect.height / 2) * forca));
                card.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
            }, { passive: true });
            card.addEventListener('mouseleave', () => {
                card.style.translate = '';
            }, { passive: true });
        });

        let pendingEvent = null;
        let glowRaf = 0;

        function flushGlow() {
            glowRaf = 0;
            const e = pendingEvent;
            pendingEvent = null;
            if (!e || !(e.target instanceof Element)) return;
            const card = e.target.closest(seletorGlow);
            if (card && !card.closest('#view-home')) {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                card.style.setProperty('--my', `${e.clientY - rect.top}px`);
            }
        }

        // Glow segue só com delegation de leitura (sem escrita de translate)
        document.body.addEventListener('mousemove', (e) => {
            pendingEvent = e;
            if (!glowRaf) glowRaf = requestAnimationFrame(flushGlow);
        }, { passive: true });
    }

    /* ============================================================
       MENU MÓVEL
       ============================================================ */
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const mobileMenu = document.querySelector('[data-mobile-menu]');

    const fecharMenu = (devolverFoco) => {
        if (!mobileMenu || !menuToggle) return;
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menu');
        mobileMenu.classList.remove('is-open');
        if (devolverFoco) menuToggle.focus({ preventScroll: true });
    };

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', String(!expanded));
            menuToggle.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
            mobileMenu.classList.toggle('is-open', !expanded);
            if (!expanded) {
                const primeiro = mobileMenu.querySelector('a');
                if (primeiro) primeiro.focus({ preventScroll: true });
            }
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => fecharMenu(false));
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mobileMenu.classList.contains('is-open')) fecharMenu(true);
        });
    }

    /* Efeito magnético agora usa event delegation otimizado (linha 220-262) */

    const footerTopBtn = document.getElementById('footer-scroll-top');
    if (footerTopBtn) {
        footerTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: scrollSuave });
        });
    }

    /* ============================================================
       #TELA MOTION — fundo inicial, prefetch, stagger e scrub
       ============================================================ */
    (function telaMotion() {
        const viewTela = document.getElementById('view-tela');
        if (!viewTela) return;

        // Garante fundo ativo ao entrar direto em #tela (sem flash preto)
        function garantirFundoTela() {
            if (document.body.dataset.view !== 'tela') return;
            const bgTela = document.getElementById('bg-tela');
            if (!bgTela) return;
            const algumaAtiva = document.querySelector('.bg-image.active');
            if (!algumaAtiva || !viewTela.contains(document.querySelector('[data-bg].active'))) {
                document.querySelectorAll('.bg-image').forEach(img => {
                    img.classList.toggle('active', img === bgTela);
                });
            }
        }

        // Prefetch dos backgrounds da #tela sob demanda (usa data-bg-src, nunca força download)
        function prefetchTela() {
            ['tela', 'riscos', 'educacao', 'dicas', 'alternativas'].forEach(id => {
                const el = document.getElementById('bg-' + id);
                if (!el) return;
                const url = el.getAttribute('data-bg-src') || (el.getAttribute('style') || '').match(/url\('([^']+)'\)/)?.[1];
                if (!url) return;
                if (!document.querySelector(`link[rel="prefetch"][href="${url}"]`)) {
                    const l = document.createElement('link');
                    l.rel = 'prefetch'; l.as = 'image'; l.href = url;
                    document.head.appendChild(l);
                }
            });
        }

        // Sem prefetch em massa: só após interação real com a #tela
        viewTela.addEventListener('pointerenter', prefetchTela, { once: true, passive: true });
        window.addEventListener('hashchange', () => setTimeout(garantirFundoTela, 60), { passive: true });
        garantirFundoTela();

        if (prefereReduzirMovimento || !window.gsap || !window.ScrollTrigger) return;
        try {
            gsap.registerPlugin(ScrollTrigger);
            const hero = viewTela.querySelector('.tela-hero');
            const titulo = viewTela.querySelector('[data-tela-title]');
            const cards = viewTela.querySelectorAll('#tela-dicas .card, #tela-alternativas .card');
            const ctx = gsap.context(() => {
                if (titulo) {
                    gsap.to(titulo, {
                        y: -40,
                        opacity: 0.25,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: hero,
                            start: 'top top',
                            end: 'bottom 30%',
                            scrub: 0.6
                        }
                    });
                }
                if (cards.length) {
                    ScrollTrigger.batch(cards, {
                        start: 'top 88%',
                        once: true,
                        onEnter: (batch) => gsap.fromTo(batch,
                            { y: 26, opacity: 0 },
                            { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true })
                    });
                }
            }, viewTela);
            window.addEventListener('hashchange', () => setTimeout(() => ScrollTrigger.refresh(), 120), { passive: true });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
        } catch (e) { /* fallback: reveal padrão segue funcionando */ }
    })();
});

/* ============================================================
   FAQ — accordion (Animação persistente e fechamento suave)
   ============================================================ */
document.querySelectorAll('.faq-item:not([data-faq-init])').forEach(details => {
    details.dataset.faqInit = '1';
    const summary = details.querySelector('summary');
    if (!summary) return;
    const originalP = details.querySelector(':scope > p');

    // Cria a estrutura wrapper necessária para a transição de altura se não existir
    if (originalP && !details.querySelector('.faq-answer')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'faq-answer';
        const inner = document.createElement('div');
        inner.appendChild(originalP);
        wrapper.appendChild(inner);
        details.appendChild(wrapper);
    }

    summary.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = details.hasAttribute('open');

        // Fecha outros itens abertos com suavidade
        document.querySelectorAll('.faq-item[open]').forEach(openItem => {
            if (openItem !== details) {
                openItem.classList.remove('is-expanded');
                // Aguarda o término da animação do CSS (450ms) antes de remover o atributo open nativo
                setTimeout(() => {
                    openItem.removeAttribute('open');
                }, 450); 
            }
        });

        if (isOpen) {
            // Se já está aberto, remove a classe de expansão primeiro para o CSS animar fechando
            details.classList.remove('is-expanded');
            setTimeout(() => {
                details.removeAttribute('open');
            }, 450);
        } else {
            // Se está fechado, ativa o atributo open nativo e logo em seguida engaja a classe de animação do CSS
            details.setAttribute('open', '');
            requestAnimationFrame(() => {
                details.classList.add('is-expanded');
            });
        }
    });
});

/* ============================================================
   EFEITO CINEMATOGRÁFICO HERO — Apple Style Scroll (view Tela)
   ============================================================ */
(function cinematicHero() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const viewTela = document.getElementById('view-tela');
    if (!viewTela) return;

    const hero = viewTela.querySelector('.hero');
    const title = viewTela.querySelector('.hero-title-cinematic');

    if (!hero || !title) return;

    let rafId = 0;
    let heroVisivel = false;

    function update() {
        rafId = 0;
        if (!heroVisivel) return;
        const rect = hero.getBoundingClientRect();
        const heroHeight = hero.offsetHeight || 1;
        const rawProgress = -rect.top / (heroHeight * 0.55);
        const progress = Math.max(0, Math.min(1, rawProgress));

        if (progress > 0.02) {
            const scale = 1 - (progress * 0.5);
            const opacity = Math.max(0, 1 - (progress * 2.2));
            const blur = progress * 14;
            const translateY = progress * -90;

            title.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
            title.style.opacity = opacity;
            title.style.filter = `blur(${blur}px)`;
        } else {
            title.style.transform = '';
            title.style.opacity = '';
            title.style.filter = '';
        }
    }

    function schedule() {
        if (heroVisivel && !rafId) rafId = requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver((entries) => {
        heroVisivel = entries.some(entry => entry.isIntersecting);
        if (heroVisivel) {
            schedule();
        } else {
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
            title.style.transform = '';
            title.style.opacity = '';
            title.style.filter = '';
        }
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('hashchange', schedule, { passive: true });
    observer.observe(viewTela);
})();

/* ============================================================
   PARALLAX — imagens .img-box em profundidade (riscos, educação,
   dicas, alternativas) + re-execução em mudança de view/resize.
   Removida a camada .parallax-bg-layer (gradientes translúcidos
   sobre position:fixed com backdrop-filter) porque gerava uma
   barra visível sob a navbar em todo scroll.
   ============================================================ */
(function parallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let images = [];
    const visiveis = new Set();
    let ticking = false;

    function update() {
        ticking = false;
        if (!visiveis.size) return;
        const winHeight = window.innerHeight;

        visiveis.forEach(img => {
            const rect = img.parentElement.getBoundingClientRect();
            if (rect.top < winHeight && rect.bottom > 0) {
                const offset = (winHeight - rect.top) * 0.15;
                img.style.transform = `translate3d(0, ${-offset * 0.3}px, 0) scale(1.1)`;
            }
        });
    }

    function schedule() {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }

    const visObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) visiveis.add(entry.target);
            else visiveis.delete(entry.target);
        });
        schedule();
    }, { rootMargin: '100px 0px' });

    function escopoPorView() {
        const ativa = document.querySelector('.view.is-active-view') || document.body;
        images.forEach(img => visObserver.unobserve(img));
        visiveis.clear();
        images = Array.from(ativa.querySelectorAll('.img-box img, .card-compact img'));
        images.forEach(img => visObserver.observe(img));
        schedule();
    }
    escopoPorView();
    setTimeout(escopoPorView, 400);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('hashchange', () => setTimeout(escopoPorView, 60), { passive: true });

    let resizeDebounce;
    window.addEventListener('resize', () => {
        clearTimeout(resizeDebounce);
        resizeDebounce = setTimeout(schedule, 150);
    }, { passive: true });

    update();
})();
/* ============================================================
   MOTION BACKGROUND OBSERVER — Adaptação dinâmica de fundos
   ============================================================ */
(function initAdaptiveBackgrounds() {
    'use strict';

    const prefereReduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefereReduzirMovimento) return;

    // Seleciona todas as subseções que possuem um background mapeado
    const sectionsWithBg = document.querySelectorAll('[data-bg]');
    const bgImages = document.querySelectorAll('.bg-image');

    if (!sectionsWithBg.length || !bgImages.length) return;

    // Configuração ideal: faixa central ampla para a imagem fixar antes
    // e permanecer nítida por mais tempo durante o scroll
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -20% 0px', // Afunila a área de detecção no centro do visor
        threshold: 0.25
    };

    const bgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetBgId = entry.target.getAttribute('data-bg');
                const alvo = document.getElementById(targetBgId);
                // Carrega a foto sob demanda antes de exibir (C4)
                if (alvo && !alvo.dataset.bgLoaded) {
                    const src = alvo.getAttribute('data-bg-src');
                    if (src) {
                        alvo.style.backgroundImage = `url('${src}')`;
                        alvo.dataset.bgLoaded = '1';
                    }
                }
                // Ativa apenas a imagem de fundo correspondente à seção visível
                bgImages.forEach(img => {
                    if (img.id === targetBgId) {
                        img.classList.add('active');
                    } else {
                        img.classList.remove('active');
                    }
                });
            }
        });
    }, observerOptions);

    sectionsWithBg.forEach(section => bgObserver.observe(section));
})();
/* ============================================================
   CHATBOT IA — Vera, assistente de segurança na agricultura
   Chat local (regras + palavras-chave), sem dependências externas
   ============================================================ */
(function chatbotIA() {
    'use strict';

    const widget = document.querySelector('[data-chatbot]');
    if (!widget) return;

    const toggleBtn = widget.querySelector('[data-chatbot-toggle]');
    const closeBtn = widget.querySelector('[data-chatbot-close]');
    const messagesEl = widget.querySelector('[data-chatbot-messages]');
    const suggestionsEl = widget.querySelector('[data-chatbot-suggestions]');
    const formEl = widget.querySelector('[data-chatbot-form]');
    const inputEl = widget.querySelector('[data-chatbot-input]');

    if (!toggleBtn || !closeBtn || !messagesEl || !formEl || !inputEl) return;

    let boasVindasEnviadas = false;

    // Base de conhecimento simples sobre segurança na agricultura
    const BASE_CONHECIMENTO = [
        {
            palavras: ['epi', 'equipamento', 'protecao individual', 'protecao', 'luva', 'mascara', 'respirador', 'roupa'],
            resposta: 'Para aplicar agrotóxicos com segurança, use o EPI completo: macacão impermeável, luvas de nitrila, botas de borracha, óculos de proteção, protetor facial e respirador com filtro adequado ao produto. Nunca aplique sem cobrir totalmente pele e vias respiratórias.'
        },
        {
            palavras: ['descarte', 'embalagem', 'embalagens', 'lavagem', 'triplice lavagem', 'reciclagem'],
            resposta: 'As embalagens vazias devem passar pela tríplice lavagem (ou lavagem sob pressão) e ser devolvidas em até um ano ao estabelecimento onde foram compradas ou a um posto de recebimento credenciado. Nunca reutilize ou descarte no meio ambiente.'
        },
        {
            palavras: ['intoxicacao', 'intoxicado', 'passou mal', 'emergencia', 'socorro', 'veneno', 'envenenamento'],
            resposta: 'Em caso de suspeita de intoxicação, afaste a pessoa do local, retire as roupas contaminadas e lave a pele com água corrente. Ligue imediatamente para o Disque-Intoxicação (0800 722 6001) ou para o SAMU (192). Você também pode acessar a seção SOS deste site para instruções rápidas.'
        },
        {
            palavras: ['carencia', 'periodo de carencia', 'prazo', 'colheita'],
            resposta: 'O período de carência é o intervalo mínimo entre a última aplicação do produto e a colheita ou consumo. Ele varia por cultura e produto e está sempre indicado no rótulo — respeitá-lo evita resíduos acima do limite seguro nos alimentos.'
        },
        {
            palavras: ['armazenamento', 'armazenar', 'guardar', 'deposito', 'estoque'],
            resposta: 'Armazene agrotóxicos em local exclusivo, ventilado, sinalizado, longe de alimentos, água e crianças. Mantenha os produtos nas embalagens originais e com acesso restrito a pessoas autorizadas.'
        },
        {
            palavras: ['agua', 'contaminacao da agua', 'lencol freatico', 'rio'],
            resposta: 'A contaminação da água ocorre principalmente por escoamento superficial e lixiviação. Manter faixas de vegetação nas margens de rios (mata ciliar), respeitar a dosagem recomendada e evitar aplicação em dias de vento ou chuva reduz bastante esse risco.'
        },
        {
            palavras: ['alternativa', 'alternativas', 'organico', 'organica', 'sustentavel', 'biologico', 'agroecologia'],
            resposta: 'Existem várias alternativas sustentáveis: controle biológico com insetos predadores, extratos botânicos como óleo de Neem, feromônios sintéticos para armadilhas, agricultura de precisão com drones e sensores, e manejo agroecológico integrado. Veja mais na seção "Alternativas" do site.'
        },
        {
            palavras: ['dosagem', 'dose', 'quantidade', 'aplicar demais', 'excesso'],
            resposta: 'A dosagem correta é sempre a indicada no rótulo do produto, de acordo com a cultura e a praga-alvo. Aplicar mais do que o recomendado não aumenta a eficácia — só eleva o risco de contaminação e resíduos no alimento.'
        },
        {
            palavras: ['polinizador', 'abelha', 'abelhas', 'biodiversidade'],
            resposta: 'Agrotóxicos aplicados de forma incorreta afetam diretamente polinizadores como abelhas, essenciais para cerca de 75% das culturas agrícolas. Evitar aplicação durante a floração e em horários de maior atividade dos insetos ajuda a proteger esses agentes.'
        },
        {
            palavras: ['clima', 'vento', 'chuva', 'deriva'],
            resposta: 'Evite aplicar agrotóxicos em dias de vento forte (causa deriva para áreas vizinhas) ou pouco antes de chuva (escoamento e perda de eficácia). O ideal é verificar a previsão do tempo e aplicar em horários de menor vento, geralmente no início da manhã ou fim da tarde.'
        },
        {
            palavras: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem'],
            resposta: 'Olá! Fico feliz em ajudar. Pode me perguntar sobre EPIs, descarte de embalagens, período de carência, armazenamento, contaminação da água, alternativas sustentáveis ou o que fazer em casos de intoxicação.'
        }
    ];

    const RESPOSTA_PADRAO = 'Ainda não tenho uma resposta pronta para isso, mas posso ajudar com dúvidas sobre segurança na agricultura: uso de EPIs, descarte de embalagens, período de carência, armazenamento, contaminação da água, alternativas sustentáveis e o que fazer em casos de intoxicação. Pode reformular sua pergunta?';

    function normalizar(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function buscarResposta(texto) {
        const textoNormalizado = normalizar(texto);

        for (const item of BASE_CONHECIMENTO) {
            if (item.palavras.some(p => textoNormalizado.includes(p))) {
                return item.resposta;
            }
        }
        return RESPOSTA_PADRAO;
    }

    function rolarParaFinal() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function adicionarMensagem(texto, autor) {
        const bolha = document.createElement('div');
        bolha.className = `chatbot-msg chatbot-msg-${autor}`;
        bolha.textContent = texto;
        messagesEl.appendChild(bolha);
        rolarParaFinal();
    }

    function mostrarDigitando() {
        const digitando = document.createElement('div');
        digitando.className = 'chatbot-typing';
        digitando.setAttribute('aria-hidden', 'true');
        digitando.innerHTML = '<span></span><span></span><span></span>';
        messagesEl.appendChild(digitando);
        rolarParaFinal();
        return digitando;
    }

    function enviarPergunta(texto) {
        const pergunta = (texto || '').trim();
        if (!pergunta) return;

        adicionarMensagem(pergunta, 'user');
        inputEl.value = '';

        const digitando = mostrarDigitando();
        const atraso = 500 + Math.random() * 500;

        setTimeout(() => {
            digitando.remove();
            adicionarMensagem(buscarResposta(pergunta), 'bot');
        }, atraso);
    }

    function abrirChat() {
        widget.classList.add('is-open');
        toggleBtn.setAttribute('aria-expanded', 'true');
        if (!boasVindasEnviadas) {
            boasVindasEnviadas = true;
            adicionarMensagem(
                'Olá! Eu sou o AgroBot, assistente virtual de segurança na agricultura do AgroConsciência. Este chat está aberto para responder todas as suas dúvidas sobre agrotóxicos, boas práticas e segurança no campo.',
                'bot'
            );
            adicionarMensagem('Envie sua pergunta ou escolha uma sugestão abaixo:', 'bot');
        }
        setTimeout(() => inputEl.focus(), 350);
    }

    function fecharChat() {
        widget.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.focus();
    }

    toggleBtn.addEventListener('click', () => {
        if (widget.classList.contains('is-open')) {
            fecharChat();
        } else {
            abrirChat();
        }
    });

    closeBtn.addEventListener('click', fecharChat);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && widget.classList.contains('is-open')) fecharChat();
    });

    formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        enviarPergunta(inputEl.value);
    });

    if (suggestionsEl) {
        // Event delegation - mais simples e confiável
        suggestionsEl.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-question]');
            if (chip) {
                enviarPergunta(chip.getAttribute('data-question'));
            }
        });
    }

})();