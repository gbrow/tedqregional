// auth.js - Verificação simplificada
const ARQUIVO_TESTE = "https://[SUA_EMPRESA].sharepoint.com/sites/[SEU_SITE]/[PASTA]/arquivo_secreto.txt";

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

// script.js - Controle de fluxo
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