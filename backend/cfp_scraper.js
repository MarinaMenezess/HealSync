// backend/cfp_scraper.js
const puppeteer = require('puppeteer');

/**
 * Tenta realizar a automação de busca no site do CFP.
 * ESTA FUNÇÃO É ALTAMENTE INSTÁVEL DEVIDO A MECANISMOS ANTI-BOT (RECAPTCHA).
 * @param {string} cfp - O número de registro do CFP (Ex: 06/12345).
 * @param {string} cpf - O CPF do usuário (Ex: 123.456.789-00).
 * @returns {Promise<{valid: boolean, message: string}>}
 */
async function scrapeCfpValidation(cfp, cpf) {
    const URL = 'https://cadastro.cfp.org.br/';
    let browser;
    let result = { 
        valid: false, 
        message: 'Falha na validação automática do CFP. A conta foi marcada para Revisão Manual.' 
    };

    try {
        browser = await puppeteer.launch({ 
            headless: true, // Use headless para ambiente de servidor
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        // 1. Navegar até o site do CFP
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 2. Clicar em 'Busca Avançada'
        const advancedSearchButtonSelector = 'a.btn.btn-secondary'; 
        await page.waitForSelector(advancedSearchButtonSelector, { timeout: 5000 });
        await page.click(advancedSearchButtonSelector);

        // Aguardar o carregamento da modal/página de busca avançada
        await page.waitForSelector('#busca-avancada-modal', { visible: true, timeout: 5000 });
        
        // Se a busca avançada for um modal/formulário na mesma página, os IDs dos inputs devem ser:
        const cfpInputSelector = '#registro'; // Seletor para o campo de registro
        const cpfInputSelector = '#cpf';     // Seletor para o campo de CPF

        // 3. Inserir o número de registro (CFP) e o CPF
        await page.type(cfpInputSelector, cfp, { delay: 50 });
        await page.type(cpfInputSelector, cpf, { delay: 50 });

        // 4. Tentar submeter o formulário (o botão de busca dentro do modal)
        const searchButtonInModalSelector = '#busca-avancada-modal button[type="submit"]';
        await page.click(searchButtonInModalSelector);

        // ATENÇÃO: A partir daqui, a lógica de checagem é altamente vulnerável.
        // O site do CFP provavelmente exigirá a resolução de um ReCaptcha. 
        // Se o Captcha for exigido e não resolvido, a submissão falha silenciosamente ou a página congela.
        
        // Tentativa de aguardar o resultado:
        // Se a busca for bem-sucedida, o site pode exibir uma tabela ou um nome. 
        // Se falhar (e.g., Captcha), pode aparecer uma mensagem de erro ou nada acontecer.
        
        await page.waitForTimeout(5000); // Dá um tempo para a página processar (e falhar no Captcha)

        // Lógica Heurística (Baseada na URL de sucesso/falha ou em um elemento específico):
        
        const successMessageSelector = '.consulta-psicologo-sucesso'; // Exemplo de seletor que indica sucesso
        const failureMessageSelector = '.alert-danger'; // Exemplo de seletor que indica erro ou não encontrado

        const successElement = await page.$(successMessageSelector);
        const failureElement = await page.$(failureMessageSelector);

        if (successElement) {
            result.valid = true;
            result.message = 'Verificação automática do CFP/CPF **concluída com sucesso**. Sua conta foi marcada para Revisão Manual final do administrador.';
        } else if (failureElement) {
            const errorMessage = await page.evaluate(el => el.textContent.trim(), failureElement);
            result.valid = false; // Falhou na busca
            result.message = `Verificação automática falhou: ${errorMessage}. O sistema tentou o acesso e foi bloqueado ou o registro/CPF está incorreto. Sua conta foi marcada para Revisão Manual.`;
        } else {
            // Caso comum de bloqueio de bot/captcha
            result.valid = false;
            result.message = 'A consulta automática falhou (possível bloqueio anti-bot ou ReCaptcha). Sua conta foi marcada para Revisão Manual.';
        }
        
    } catch (error) {
        console.error('Erro de Puppeteer na automação do CFP:', error.message);
        result.valid = false;
        result.message = `Erro crítico na automação de validação (serviço fora do ar ou bloqueio de IP). Sua conta foi marcada para Revisão Manual.`;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    return result;
}

module.exports = {
    scrapeCfpValidation
};