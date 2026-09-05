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

    function mostrarView(nome) {
        const alvo = document.getElementById(`view-${nome}`);
        if (!alvo) return;
        const atual = document.querySelector('.view.is-active-view');

        if (atual && atual !== alvo) {
            atual.classList.remove('is-active-view');
            if (!prefereReduzirMovimento) {
                atual.classList.add('is-leaving');
                setTimeout(() => atual.classList.remove('is-leaving'), 200);
            }
        }

        alvo.classList.add('is-active-view');
        document.body.dataset.view = nome;
        document.title = TITULOS[nome] || TITULOS.home;
        window.scrollTo(0, 0);

        document.querySelectorAll(`#view-${nome} .revelar`).forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >= 0) {
                el.classList.add('ativo');
            }
        });

        const mobileMenu = document.querySelector('[data-mobile-menu]');
        const menuToggle = document.querySelector('[data-menu-toggle]');
        if (mobileMenu && mobileMenu.classList.contains('is-open')) {
            mobileMenu.classList.remove('is-open');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    function rotear() {
        const hash = location.hash.replace('#', '');
        if (!hash) { mostrarView('home'); return; }
        if (VIEWS.includes(hash)) mostrarView(hash);
    }

    window.addEventListener('hashchange', rotear);
    rotear();

    /* ============================================================
       REVEAL-ON-SCROLL
       ============================================================ */
    const elementosParaRevelar = document.querySelectorAll('.revelar');

    if (prefereReduzirMovimento) {
        elementosParaRevelar.forEach(el => el.classList.add('ativo'));
    } else {
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) {
                    entrada.target.classList.add('ativo');
                    observador.unobserve(entrada.target);
                }
            });
        }, { root: null, rootMargin: '0px', threshold: 0.15 });

        elementosParaRevelar.forEach(el => observador.observe(el));
    }

   /* ============================================================
   SLIDING NUMBERS — Vanilla JS
   Adaptado do componente React SlidingNumber
   ============================================================ */

(function initSlidingNumbers() {
    'use strict';

    const prefereReduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
            return;
        }

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateInstance(instance);
                } else {
                    resetInstance(instance);
                }
            });
        }, { threshold: 0.4 });

        obs.observe(container);
    });
})();

    /* ============================================================
       GLOW NO MOUSE — brilho que acompanha o cursor dentro dos cards
       (throttled via rAF para não recalcular estilo a cada pixel)
       ============================================================ */
    if (!prefereReduzirMovimento && window.matchMedia('(hover: hover)').matches) {
        const cardsComGlow = document.querySelectorAll(
            '.card, .metric-card, .alt-card, .step-card, .pillar-card, .data-card, .alert-card, .faq-item'
        );
        let glowTicking = false;
        let pendingGlow = null;

        cardsComGlow.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                pendingGlow = { card, x: e.clientX - rect.left, y: e.clientY - rect.top };
                if (!glowTicking) {
                    requestAnimationFrame(() => {
                        if (pendingGlow) {
                            pendingGlow.card.style.setProperty('--mx', `${pendingGlow.x}px`);
                            pendingGlow.card.style.setProperty('--my', `${pendingGlow.y}px`);
                        }
                        glowTicking = false;
                    });
                    glowTicking = true;
                }
            });
        });
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

    /* ============================================================
       EFEITO MAGNÉTICO — cards e botões seguem levemente o cursor
       ============================================================ */
    function aplicarEfeitoMagnetico(seletor, forca) {
        if (prefereReduzirMovimento || !window.matchMedia('(hover: hover)').matches) return;

        document.querySelectorAll(seletor).forEach(el => {
            if (el.closest('#view-sos')) return;

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = (e.clientX - rect.left - rect.width / 2) * forca;
                const y = (e.clientY - rect.top - rect.height / 2) * forca;
                el.style.transform = `translate(${x}px, ${y}px) scale(1.04)`;
                el.style.transition = 'transform 0.08s ease-out';
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
                el.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            });
        });
    }

    aplicarEfeitoMagnetico(
        '.card, .metric-card, .alert-card, .data-card, .pillar-card, .step-card, .alt-card',
        0.12
    );
    aplicarEfeitoMagnetico('.footer-pill, .footer-pill-small, .footer-top-btn', 0.25);
    aplicarEfeitoMagnetico('.hero-actions .btn, .nav-actions .btn', 0.18);

    const footerTopBtn = document.getElementById('footer-scroll-top');
    if (footerTopBtn) {
        footerTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

/* ============================================================
   CABEÇALHO — permanece sempre visível e fixo no topo.
   (Antes escondia ao rolar pra baixo, mas isso deixava uma faixa
   sem preenchimento visível no topo da página; removido.)
   ============================================================ */
(function headerReveal() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    // Garante que nunca fique com a classe que o esconde
    header.classList.remove('is-hidden');
})();

/* ============================================================
   FAQ — accordion (Animação persistente e fechamento suave)
   ============================================================ */
document.querySelectorAll('.faq-item').forEach(details => {
    const summary = details.querySelector('summary');
    const originalP = details.querySelector('p');

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
    const viewTela = document.getElementById('view-tela');
    if (!viewTela) return;

    const hero = viewTela.querySelector('.hero');
    const title = viewTela.querySelector('.hero-title-cinematic');

    if (!hero || !title) return;

    let rafId = null;

    function update() {
        if (!viewTela.classList.contains('is-active-view')) {
            cancelAnimationFrame(rafId);
            setTimeout(() => { rafId = requestAnimationFrame(update); }, 100);
            return;
        }

        const rect = hero.getBoundingClientRect();
        const heroHeight = hero.offsetHeight;
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

        rafId = requestAnimationFrame(update);
    }

    rafId = requestAnimationFrame(update);
})();

/* ============================================================
   PARALLAX — camada de fundo única + imagens em profundidade
   (substitui as 3 camadas de gradiente redundantes que existiam)
   ============================================================ */
(function parallax() {
    const bgLayer = document.createElement('div');
    bgLayer.className = 'parallax-bg-layer';
    bgLayer.style.cssText = `
        position: fixed; inset: 0; z-index: -1; pointer-events: none;
        background:
            radial-gradient(circle at 15% 25%, rgba(57, 255, 158, 0.12), transparent 35%),
            radial-gradient(circle at 85% 20%, rgba(51, 240, 255, 0.08), transparent 25%),
            radial-gradient(circle at 50% 80%, rgba(57, 255, 158, 0.06), transparent 30%);
        will-change: transform;
    `;
    document.body.insertBefore(bgLayer, document.body.firstChild);

    const images = document.querySelectorAll('.img-box img, .card-compact img');
    let ticking = false;

    function update() {
        const scrollY = window.scrollY;
        const winHeight = window.innerHeight;

        bgLayer.style.transform = `translate3d(0, ${scrollY * 0.05}px, 0)`;

        images.forEach(img => {
            const rect = img.parentElement.getBoundingClientRect();
            if (rect.top < winHeight && rect.bottom > 0) {
                const offset = (winHeight - rect.top) * 0.15;
                img.style.transform = `translate3d(0, ${-offset * 0.3}px, 0) scale(1.1)`;
            }
        });

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
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

    // Configuração ideal: Dispara quando a seção cruza a metade da tela do usuário
    const observerOptions = {
        root: null,
        rootMargin: '-10% 0px -40% 0px', // Afunila a área de detecção no centro do visor
        threshold: 0.15
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
        setTimeout(() => inputEl.focus(), 350);
    }

    function fecharChat() {
        widget.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
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
        e.stopPropagation();
        enviarPergunta(inputEl.value);
    });

    // Suporte para enviar ao pressionar Enter no mobile
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarPergunta(inputEl.value);
        }
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

    // Mensagens iniciais de boas-vindas — deixa claro o escopo do chat
    adicionarMensagem(
        'Olá! Eu sou o AgroBot, assistente virtual de segurança na agricultura do AgroConsciência. Este chat está aberto para responder todas as suas dúvidas sobre agrotóxicos, boas práticas e segurança no campo.',
        'bot'
    );
    adicionarMensagem('Envie sua pergunta ou escolha uma sugestão abaixo:', 'bot');
})();