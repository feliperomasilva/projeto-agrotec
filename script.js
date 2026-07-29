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

        // A view que está saindo faz um fade-out rápido antes de sumir de vez
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

        // Revela imediatamente o que já está visível na tela ao trocar de view
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
        if (!hash) {
            mostrarView('home');
            return;
        }
        if (VIEWS.includes(hash)) {
            mostrarView(hash);
        }
    }

    window.addEventListener('hashchange', rotear);
    rotear();

    /* ============================================================
       REVEAL-ON-SCROLL — mostra elementos suavemente ao rolar a tela
       ============================================================ */
    const elementosParaRevelar = document.querySelectorAll('.revelar');

    if (prefereReduzirMovimento) {
        elementosParaRevelar.forEach(elemento => elemento.classList.add('ativo'));
    } else {
        const opcoes = { root: null, rootMargin: '0px', threshold: 0.15 };

        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) {
                    entrada.target.classList.add('ativo');
                    observador.unobserve(entrada.target);
                }
            });
        }, opcoes);

        elementosParaRevelar.forEach(elemento => observador.observe(elemento));
    }

    /* ============================================================
       CONTADORES ANIMADOS — recontam toda vez que a seção reaparece
       ============================================================ */
    const counters = document.querySelectorAll('[data-counter]');
    counters.forEach(counter => {
        const target = Number(counter.getAttribute('data-target')) || 0;
        const duration = Number(counter.getAttribute('data-duration')) || 1200;
        const suffix = counter.getAttribute('data-suffix') || '';
        let animId = 0;

        function animar() {
            const meuId = ++animId;
            let start = null;

            function step(timestamp) {
                if (meuId !== animId) return; // uma nova animação começou, cancela essa
                if (!start) start = timestamp;
                const progress = Math.min((timestamp - start) / duration, 1);
                counter.textContent = Math.floor(progress * target) + suffix;
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    counter.textContent = target + suffix;
                }
            }
            requestAnimationFrame(step);
        }

        if (prefereReduzirMovimento) {
            counter.textContent = target + suffix;
        } else {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        animar();
                    } else {
                        animId++; // invalida qualquer animação em andamento
                        counter.textContent = '0' + suffix;
                    }
                });
            }, { threshold: 0.4 });
            obs.observe(counter);
        }
    });

    /* ============================================================
       GLOW NO MOUSE — brilho que acompanha o cursor dentro dos cards
       ============================================================ */
    if (!prefereReduzirMovimento && window.matchMedia('(hover: hover)').matches) {
        const cardsComGlow = document.querySelectorAll(
            '.card, .metric-card, .alt-card, .step-card, .pillar-card, .data-card, .alert-card, .faq-item'
        );
        cardsComGlow.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                card.style.setProperty('--my', `${e.clientY - rect.top}px`);
            });
        });
    }

    /* ============================================================
       MENU MÓVEL — abrir, fechar ao clicar em link, fechar com Esc
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
});