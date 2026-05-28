function revelarAoRolar() {
    // Seleciona todos os elementos que têm a classe 'revelar'
    const elementos = document.querySelectorAll('.revelar');
    
    elementos.forEach((elemento) => {
        // Pega a distância do topo do elemento em relação à tela
        const topoDoElemento = elemento.getBoundingClientRect().top;
        
        // Define o ponto da tela onde o efeito vai disparar (75% da altura da tela)
        const alturaDisparo = window.innerHeight * 0.75;
        
        // Se o elemento chegou no ponto de disparo, adiciona a classe 'ativo'
        if (topoDoElemento < alturaDisparo) {
            elemento.classList.add('ativo');
        }
    });
}

// Escuta o evento de rolagem da página e executa a função acima
window.addEventListener('scroll', revelarAoRolar);

// Executa uma vez ao carregar a página caso algum elemento já esteja visível
revelarAoRolar();
