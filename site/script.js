document.addEventListener("DOMContentLoaded", () => {
    const prefereReduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Seleciona todos os elementos que possuem o atributo data-reveal (bate com o CSS)
    const elementosParaRevelar = document.querySelectorAll('[data-reveal]');

    if (prefereReduzirMovimento) {
        // Quem prefere menos animação já vê tudo visível, sem transição
        elementosParaRevelar.forEach(elemento => elemento.classList.add('is-visible'));
    } else {
        // Configurações do observador de tela
        const opcoes = {
            root: null,         // Usa a janela do navegador (viewport) como referência
            rootMargin: '0px',  // Sem margens extras
            threshold: 0.5   // O elemento ativa quando 15% dele aparece na tela
        };

        // Cria o observador que detecta a entrada do elemento na tela
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) {
                    entrada.target.classList.add('is-visible');
                    observador.unobserve(entrada.target); // já revelou, não precisa mais observar

                }
            });
        }, opcoes);

        // Ativa o observador para cada um dos elementos selecionados
        elementosParaRevelar.forEach(elemento => {
            observador.observe(elemento);
        });
    }

    // Animação dos contadores com suporte a sufixo (%) e fallback para elementos já visíveis
    const counters = document.querySelectorAll('[data-counter]');
    counters.forEach(counter => {
        const target = Number(counter.getAttribute('data-target')) || 0;
        const duration = Number(counter.getAttribute('data-duration')) || 1200;
        const suffix = counter.getAttribute('data-suffix') || '';

        let start = null;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const value = Math.floor(progress * target);
            counter.textContent = value + suffix;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                counter.textContent = target + suffix;
            }
        };

        const startWhenVisible = (el) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >= 0) {
                requestAnimationFrame(step);
                return true;
            }
            return false;
        };

        if (!startWhenVisible(counter)) {
            const obs = new IntersectionObserver((entries, obsInstance) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        requestAnimationFrame(step);
                        obsInstance.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            obs.observe(counter);
        }
    });

    // Menu móvel: abrir, fechar ao clicar em link, e fechar com Esc
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

        // Fecha o menu ao clicar em qualquer link dentro dele
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', fecharMenu);
        });

        // Fecha o menu ao apertar Esc
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                fecharMenu();
            }
        });
    }
});