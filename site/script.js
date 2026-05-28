document.addEventListener("DOMContentLoaded", () => {
    // Seleciona todos os elementos que possuem a classe de animação
    const elementosParaRevelar = document.querySelectorAll('.revelar');

    // Configurações do observador de tela
    const opcoes = {
        root: null,         // Usa a janela do navegador (viewport) como referência
        rootMargin: '0px',  // Sem margens extras
        threshold: 0.15     // O elemento ativa quando 15% dele aparece na tela
    };

    // Cria o observador que detecta a entrada do elemento na tela
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                // Quando o elemento entra na tela (subindo ou descendo), adiciona a classe ativo
                entrada.target.classList.add('ativo');
            } else {
                // OPCIONAL: Se você quiser que o elemento SUMA de novo ao sair da tela 
                // para poder reaparecer quando você subir/descer infinitamente, descomente a linha abaixo:
                // entrada.target.classList.remove('ativo');
            }
        });
    }, opcoes);

    // Ativa o observador para cada um dos elementos selecionados
    elementosParaRevelar.forEach(elemento => {
        observador.observe(elemento);
    });
});