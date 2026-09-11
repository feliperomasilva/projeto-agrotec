/* Remove o estado "sem JS" assim que o script carrega.
   Em CSS, .no-js .revelar mantém o conteúdo visível caso o JS falhe. */
document.documentElement.classList.remove('no-js');

document.addEventListener("DOMContentLoaded", () => {
    const prefereReduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    function mostrarView(nome, ancoraId) {
        const alvo = viewsCache.get(nome);
        if (!alvo) return;

        if (viewAtiva !== alvo) {
            if (viewAtiva) viewAtiva.classList.remove('is-active-view');
            alvo.classList.add('is-active-view');
            viewAtiva = alvo;
        }

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
            if (menuToggleCache) menuToggleCache.setAttribute('aria-expanded', 'false');
        }

        if (!ancoraId) {
            window.scrollTo(0, 0);
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

    /* ============================================================
       REVEAL-ON-SCROLL APRIMORADO
       ============================================================ */
    const elementosParaRevelar = document.querySelectorAll('.revelar');

    if (prefereReduzirMovimento) {
        elementosParaRevelar.forEach(el => {
            el.classList.add('ativo');
            el.style.transitionDelay = '0s';
        });
    } else {
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) {
                    revelarElemento(entrada.target);
                    observador.unobserve(entrada.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px',
            threshold: 0.12  // Reduzido de 0.15 para trigger mais natural
        });

        function revelarElemento(el) {
            el.style.willChange = 'opacity, transform';
            el.classList.add('ativo');
            setTimeout(() => {
                el.style.willChange = 'auto';
            }, 1200);
        }

        elementosParaRevelar.forEach(el => observador.observe(el));
    }

   /* ============================================================
   SLIDING NUMBERS — Vanilla JS
   Adaptado do componente React SlidingNumber
   ============================================================ */

(function initSlidingNumbers() {
    'use strict';

    const containers = document.querySelectorAll('[data-sliding-number]');
    if (!containers.length) return;

    const instances = new Map();

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

        if (prefereReduzirMovimento) {
            container.innerHTML = instance.target + instance.suffix;
            container.style.opacity = '1';
        }
    });

    if (!prefereReduzirMovimento) {
        const slidingObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const instance = instances.get(entry.target);
                if (!instance) return;
                if (entry.isIntersecting) animateInstance(instance);
                else resetInstance(instance);
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
        const seletorMagnetico = '.card, .metric-card, .alert-card, .data-card, .pillar-card, .step-card, .alt-card';
        let pendingEvent = null;
        let glowMagRaf = 0;
        let lastMag = null;

        function flushGlowMag() {
            glowMagRaf = 0;
            const e = pendingEvent;
            pendingEvent = null;
            if (!e || !(e.target instanceof Element)) return;
            const cx = e.clientX;
            const cy = e.clientY;

            const card = e.target.closest(seletorGlow);
            if (card) {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${cx - rect.left}px`);
                card.style.setProperty('--my', `${cy - rect.top}px`);
            }

            const found = e.target.closest(seletorMagnetico);
            const mag = (found && !found.closest('#view-sos')) ? found : null;
            if (mag !== lastMag) {
                if (lastMag) lastMag.style.translate = '';
                lastMag = mag;
            }
            if (mag) {
                const rect = mag.getBoundingClientRect();
                const forca = 0.12;
                const x = (cx - rect.left - rect.width / 2) * forca;
                const y = (cy - rect.top - rect.height / 2) * forca;
                mag.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
            }
        }

        document.body.addEventListener('mousemove', (e) => {
            pendingEvent = e;
            if (!glowMagRaf) glowMagRaf = requestAnimationFrame(flushGlowMag);
        }, { passive: true });

        document.body.addEventListener('mouseout', (e) => {
            if (!(e.target instanceof Element)) return;
            const el = e.target.closest(seletorMagnetico);
            if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) {
                el.style.translate = '';
                if (lastMag === el) lastMag = null;
            }
        }, { passive: true });
    }

    /* ============================================================
       MENU MÓVEL
       ============================================================ */
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const mobileMenu = document.querySelector('[data-mobile-menu]');

    const fecharMenu = () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('is-open');
    };

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', String(!expanded));
            mobileMenu.classList.toggle('is-open', !expanded);
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', fecharMenu);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') fecharMenu();
        });
    }

    /* Efeito magnético agora usa event delegation otimizado (linha 220-262) */

    const footerTopBtn = document.getElementById('footer-scroll-top');
    if (footerTopBtn) {
        footerTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
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
    const images = Array.from(document.querySelectorAll('.img-box img, .card-compact img'));
    if (!images.length) return;
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
    images.forEach(img => visObserver.observe(img));

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('hashchange', schedule, { passive: true });

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