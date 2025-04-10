// auth.js - Verificação simplificada
const ARQUIVO_TESTE = "https://ufprbr0.sharepoint.com/:t:/r/sites/TEDQuilombos/Documentos%20Compartilhados/General/BANCO%20DE%20INFORMA%C3%87%C3%95ES/TERRITORIAL/arquivo_secreto.txt?csf=1&web=1&e=ipM7dL";

async function verificarAcesso() {
    try {
        const response = await fetch(ARQUIVO_TESTE, {
            method: 'HEAD',
            credentials: 'include',
            mode: 'cors'
        });
        
        // Status 200-299 indica acesso autorizado
        return response.ok; 
    } catch (error) {
        return false;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const temAcesso = await verificarAcesso();
    
    if (temAcesso) {
        // Carrega aplicação normal
        const dados = await carregarDadosLocais();
        inicializarAplicacao(dados);
    } else {
        // Exibe mensagem de bloqueio
        document.body.innerHTML = `
            <div class="blocked-container">
                <h2>Acesso Negado</h2>
                <p>Você precisa:</p>
                <ol>
                    <li>Estar logado na rede corporativa</li>
                    <li>Ter acesso ao SharePoint da equipe</li>
                </ol>
                <button onclick="window.location.reload()">Tentar Novamente</button>
            </div>
        `;
    }
});

//document.addEventListener("DOMContentLoaded", function() {
    
function carregarDadosLocais() {
    // Dados carregados do CSV
    // Elementos do DOM
    const recorteSelect = document.getElementById("recorte");
    const temaSelect = document.getElementById("tema");
    const subTemaSelect = document.getElementById("subTema");
    const carregarBtn = document.getElementById("carregar");
    const conteudoDiv = document.getElementById("conteudo");
    const BASE_URL = window.location.href.includes('github.io') 
    ? '/' + window.location.pathname.split('/')[1] + '/' 
    : '/';

    let dados = [];

    // Carrega o CSV
    fetch(`${BASE_URL}dados/tematicas.csv`)
        .then(response => {
            if (!response.ok) throw new Error("Erro ao carregar CSV");
            return response.text();
        })
        .then(csvText => {
            dados = parseCSV(csvText);
            inicializarFiltros();
        })
        .catch(error => {
            console.error("Erro:", error);
            conteudoDiv.innerHTML = `<p class="erro">Erro ao carregar dados. Verifique o console.</p>`;
        });
}
    // Parse do CSV (suporta vírgulas internas)
    function parseCSV(csvText) {
        const linhas = csvText.split("\n").filter(linha => linha.trim() !== "");
        const headers = linhas[0].split(",").map(header => header.trim());
        const dados = [];

        for (let i = 1; i < linhas.length; i++) {
            const valores = linhas[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const item = {};
            
            headers.forEach((header, j) => {
                item[header] = valores[j] ? valores[j].replace(/"/g, "").trim() : "";
            });

            if (Object.values(item).some(val => val)) dados.push(item);
        }

        return dados;
    }

    // Inicializa os filtros
    function inicializarFiltros() {
        // Recortes (nível mais alto)
        const recortes = [...new Set(dados.map(item => item.RECORTE))];
        preencherSelect(recorteSelect, recortes);

        // Atualiza Temas quando Recorte muda
        recorteSelect.addEventListener("change", () => {
            const recorte = recorteSelect.value;
            const temas = [...new Set(
                dados.filter(item => item.RECORTE === recorte).map(item => item.TEMA)
            )]; // Parêntese FIXADO aqui
            preencherSelect(temaSelect, temas);
            subTemaSelect.innerHTML = '<option value="">Selecione...</option>';
        });

        // Atualiza Sub-temas quando Tema muda
        temaSelect.addEventListener("change", () => {
            const recorte = recorteSelect.value;
            const tema = temaSelect.value;
            const subTemas = [...new Set(
                dados.filter(item => item.RECORTE === recorte && item.TEMA === tema).map(item => item.SUB_TEMA)
            )];
            preencherSelect(subTemaSelect, subTemas);
        });

        // Botão "Carregar"
        carregarBtn.addEventListener("click", carregarConteudo);
    }

    // Preenche um <select> com opções
    function preencherSelect(select, valores) {
        select.innerHTML = '<option value="">Selecione...</option>';
        valores.forEach(valor => {
            if (valor) select.innerHTML += `<option value="${valor}">${valor}</option>`;
        });
    }

    // Carrega o conteúdo
    function carregarConteudo() {
        const recorte = recorteSelect.value;
        const tema = temaSelect.value;
        const subTema = subTemaSelect.value;

        if (!recorte || !tema || !subTema) {
            alert("Selecione todos os filtros!");
            return;
        }

        const itemSelecionado = dados.find(item => 
            item.RECORTE === recorte && 
            item.TEMA === tema && 
            item.SUB_TEMA === subTema
        );

        if (itemSelecionado) {
            exibirConteudo(itemSelecionado);
        } else {
            conteudoDiv.innerHTML = "<p>Nenhum conteúdo encontrado.</p>";
        }
    }

    // Exibe o conteúdo do layout
    function exibirConteudo(item) {
        const caminhoLayout = `${BASE_URL}conteudo/${item.RECORTE}/Layout/${item.LAYOUT}`;
        console.log(caminhoLayout)
        fetch(`${caminhoLayout}?v=${Date.now()}`)  // Adiciona timestamp como parâmetro
        .then(response => {
            if (!response.ok) throw new Error("Arquivo de layout não encontrado");
            return response.text();
        })
        .then(texto => {
            // Processa título e escala
            const titulo = extrairTag(texto, 'Título') || item.TEMA;
            const escala = extrairTag(texto, 'Escala') || item.RECORTE;
            
            // Processa o conteúdo principal
            let html = processarConteudo(texto, item.RECORTE);
            
            // Monta a estrutura final
            conteudoDiv.innerHTML = `
                <article class="conteudo-detalhado">
                    <header>
                        <h2>${titulo}</h2>
                        <h3>${escala}</h3>
                    </header>
                    <div class="conteudo-principal">
                        ${html}
                    </div>
                </article>
            `;
            inicializarSliders();
        })
        .catch(error => {
            console.error("Erro ao carregar conteúdo:", error);
            conteudoDiv.innerHTML = `
                <div class="erro">
                    <p>Erro ao exibir o conteúdo</p>
                    <p class="detalhe-erro">${error.message}</p>
                </div>
            `;
        });
    }
    function extrairTag(texto, tag) {
        const regex = new RegExp(`<${tag}:(.*?)>`);
        const match = texto.match(regex);
        return match ? match[1] : null;
    }

    function processarConteudo(texto, recorte) {
        // Processa tags Multi
    texto = texto.replace(/<Multi>([\s\S]*?)<\/Multi>/g, (_, conteudoMulti) => {
        const slides = [];
        conteudoMulti.replace(/<(\d+)>([\s\S]*?)<\/\1>/g, (_, num, conteudo) => {
                slides.push({
                    num: parseInt(num),
                    conteudo: formatarSlide(conteudo, recorte)
                });
                return '';
            });
            
            return criarSlider(slides);
        });
        // Remove tags de título e escala
        let conteudo = texto
            .replace(/<Título:(.*?)>/g, '')
            .replace(/<Escala:(.*?)>/g, '');
        
        // Processa elementos visuais com legendas
        conteudo = conteudo
            .replace(/<Mapas:(.*?):(.*?)>/g, (_, arquivo, legenda) => `
                <figure class="elemento-visual mapa">
                    <img src="${BASE_URL}conteudo/${recorte}/Mapas/${arquivo}?v=${Date.now()}" alt="${legenda}">
                    <figcaption>${legenda}</figcaption>
                </figure>
            `)
            .replace(/<Gráficos:(.*?):(.*?)>/g, (_, arquivo, legenda) => `
                <figure class="elemento-visual grafico">
                    <img src="${BASE_URL}conteudo/${recorte}/Graficos/${arquivo}?v=${Date.now()}" alt="${legenda}">
                    <figcaption>${legenda}</figcaption>
                </figure>
            `);
        
        // Formata parágrafos e destaques
        return formatarTexto(conteudo);
    }

    function formatarTexto(texto) {
        return texto
            .split('\n\n')
            .filter(paragrafo => paragrafo.trim() !== '')
            .map(paragrafo => {
                paragrafo = paragrafo
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');
                return `<p>${paragrafo}</p>`;
            })
            .join('');
    }
    function formatarSlide(conteudo, recorte) {
    // Processa elementos visuais dentro de cada slide
    return conteudo
        .replace(/<Mapas:(.*?):(.*?)>/g, (_, arquivo, legenda) => `
            <figure class="slide-element mapa">
                <img src="${BASE_URL}conteudo/${recorte}/Mapas/${arquivo}" alt="${legenda}">
                <figcaption>${legenda}</figcaption>
            </figure>
        `)
        .replace(/<Gráficos:(.*?):(.*?)>/g, (_, arquivo, legenda) => `
            <figure class="slide-element grafico">
                <img src="${BASE_URL}conteudo/${recorte}/Graficos/${arquivo}" alt="${legenda}">
                <figcaption>${legenda}</figcaption>
            </figure>
        `);
    }
    function criarSlider(slides) {
    // Ordena slides numericamente
    slides.sort((a, b) => a.num - b.num);
    
    // Gera HTML do slider com ID único
    const sliderId = 'slider-' + Math.random().toString(36).substr(2, 9);
    
    return `
        <div class="slider-container" id="${sliderId}">
            <div class="slider-track">
                ${slides.map(slide => `
                    <div class="slide" data-slide="${slide.num}">
                        ${slide.conteudo}
                    </div>
                `).join('')}
            </div>
            <div class="slider-controls">
                <button class="slider-prev">❮</button>
                <div class="slider-dots">
                    ${slides.map(slide => `
                        <span class="dot" data-target="${slide.num}"></span>
                    `).join('')}
                </div>
                <button class="slider-next">❯</button>
            </div>
        </div>
    `;
    }
    function inicializarSliders() {
    document.querySelectorAll('.slider-container').forEach(container => {
        const track = container.querySelector('.slider-track');
        const slides = container.querySelectorAll('.slide');
        const dots = container.querySelectorAll('.dot');
        let current = 0;
        
        function updateSlider() {
            // Atualiza posição
            track.style.transform = `translateX(-${current * 100}%)`;
            
            // Atualiza opacidade dos slides
            slides.forEach((slide, index) => {
                slide.style.opacity = index === current ? '1' : '0.5';
                slide.classList.toggle('active', index === current);
            });
            
            // Atualiza dots
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === current);
            });
        }
        
        // Event listeners
        container.querySelector('.slider-next').addEventListener('click', () => {
            current = (current + 1) % slides.length;
            updateSlider();
        });
        
        container.querySelector('.slider-prev').addEventListener('click', () => {
            current = (current - 1 + slides.length) % slides.length;
            updateSlider();
        });
        
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                current = i;
                updateSlider();
            });
        });
        
        // Inicializa
        updateSlider();
    });
    }
//});