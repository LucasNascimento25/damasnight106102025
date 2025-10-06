// hqseroticos.js - SISTEMA DE HQS ERÓTICOS COM NAVEGAÇÃO POR PÁGINAS
import fetch from 'node-fetch';
import axios from 'axios';
import Jimp from 'jimp';

console.log('✅ hqseroticos.js CARREGADO!');

// URL do seu repositório GitHub - CORRIGIDA
const URL_HQS = 'https://raw.githubusercontent.com/LucasNascimento25/cartoons/refs/heads/main/cartoons/Cartoons.json';

// Cache dos HQs em memória
let hqs = [];
let ultimaAtualizacao = null;

// Armazena o HQ atual de cada usuário para navegação
const sessoesUsuarios = new Map();

/**
 * Função para gerar thumbnail com Jimp (mantém proporção original)
 */
async function gerarThumbnail(buffer, size = 256) {
    try {
        const image = await Jimp.read(buffer);
        image.scaleToFit(size, size);
        return await image.getBufferAsync(Jimp.MIME_JPEG);
    } catch (err) {
        console.error('Erro ao gerar thumbnail:', err);
        return null;
    }
}

/**
 * Função para baixar e processar imagem com Jimp
 */
async function baixarImagemComJimp(url) {
    try {
        console.log(`🖼️ Baixando imagem: ${url}`);
        
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*'
            },
            maxRedirects: 5,
            validateStatus: (status) => status === 200
        });

        const imageBuffer = Buffer.from(response.data);
        console.log(`📦 Buffer baixado: ${imageBuffer.length} bytes`);

        if (imageBuffer.length < 5000) {
            console.log(`⚠️ Imagem muito pequena (${imageBuffer.length} bytes)`);
            return null;
        }

        const image = await Jimp.read(imageBuffer);
        console.log(`📐 Dimensões originais: ${image.getWidth()}x${image.getHeight()}`);
        
        const maxWidth = 1280;
        const maxHeight = 1280;
        
        if (image.getWidth() > maxWidth || image.getHeight() > maxHeight) {
            console.log(`🔧 Redimensionando...`);
            image.scaleToFit(maxWidth, maxHeight);
            console.log(`✅ Nova dimensão: ${image.getWidth()}x${image.getHeight()}`);
        }

        const processedBuffer = await image
            .quality(90)
            .getBufferAsync(Jimp.MIME_JPEG);

        console.log(`✅ Imagem processada: ${processedBuffer.length} bytes`);
        
        if (processedBuffer.length > 5 * 1024 * 1024) {
            console.log(`⚠️ Imagem muito grande, reduzindo qualidade...`);
            return await image.quality(75).getBufferAsync(Jimp.MIME_JPEG);
        }
        
        return processedBuffer;

    } catch (error) {
        console.error(`❌ Erro ao baixar/processar imagem:`, error.message);
        return null;
    }
}

/**
 * Carrega os HQs do GitHub
 */
async function carregarHQs() {
    try {
        console.log('🔄 Iniciando carregamento dos HQs...');
        const response = await fetch(URL_HQS);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const dados = await response.json();
        hqs = dados.hqs || dados.cartoons || [];
        ultimaAtualizacao = new Date();
        
        console.log(`✅ ${hqs.length} HQs carregados com sucesso!`);
        console.log('📚 HQs disponíveis:', hqs.map(h => h.titulo).join(', '));
        return true;
    } catch (error) {
        console.error('❌ Erro ao carregar HQs:', error);
        return false;
    }
}

/**
 * Retorna a lista de HQs formatada
 */
function listarHQs() {
    console.log('📋 listarHQs() chamado. Total:', hqs.length);
    
    if (hqs.length === 0) {
        return '❌ Nenhum HQ disponível no momento.';
    }

    let lista = '🔞 *HQS ERÓTICOS DISPONÍVEIS*\n\n';
    
    hqs.forEach((hq, index) => {
        lista += `${index + 1}. *${hq.titulo}*\n`;
        if (hq.categoria) {
            lista += `   _${hq.categoria}_\n`;
        }
        if (hq.paginas) {
            lista += `   📖 ${hq.paginas.length} páginas\n`;
        }
    });
    lista += '\n💡 Digite *#hq [número]* para visualizar um HQ\n';
    lista += 'Exemplo: #hq 1\n\n';
    lista += '© _Damas da Night_';

    return lista;
}

/**
 * Obtém ID único do usuário (funciona para grupos e privado)
 */
function obterIdUsuario(message) {
    // Em grupos, usa o número do participante
    if (message.key.participant) {
        return message.key.participant;
    }
    // Em chat privado, usa o remoteJid
    return message.key.remoteJid;
}

/**
 * Inicia a leitura de um HQ (mostra página 1)
 */
async function iniciarHQ(sock, remoteJid, numero, message) {
    const index = parseInt(numero) - 1;
    
    if (isNaN(index) || index < 0 || index >= hqs.length) {
        return await sock.sendMessage(remoteJid, {
            text: `❌ Número inválido! Temos ${hqs.length} HQs disponíveis.\nUse *#hqs* para ver a lista.`
        }, { quoted: message });
    }

    const hq = hqs[index];
    
    if (!hq.paginas || hq.paginas.length === 0) {
        return await sock.sendMessage(remoteJid, {
            text: `❌ Este HQ não possui páginas disponíveis.`
        }, { quoted: message });
    }

    // Usa ID único do usuário
    const userId = obterIdUsuario(message);
    
    // Salva a sessão do usuário
    sessoesUsuarios.set(userId, {
        hqIndex: index,
        paginaAtual: 1,
        totalPaginas: hq.paginas.length
    });

    console.log(`📖 [${userId}] Iniciando HQ "${hq.titulo}" - ${hq.paginas.length} páginas`);
    await mostrarPagina(sock, remoteJid, 1, message);
}

/**
 * Mostra uma página específica do HQ atual
 */
async function mostrarPagina(sock, remoteJid, numeroPagina, message) {
    // Usa ID único do usuário
    const userId = obterIdUsuario(message);
    const sessao = sessoesUsuarios.get(userId);
    
    if (!sessao) {
        return await sock.sendMessage(remoteJid, {
            text: `❌ Você não está lendo nenhum HQ!\nUse *#hqs* para ver a lista e *#hq [número]* para começar.`
        }, { quoted: message });
    }

    const hq = hqs[sessao.hqIndex];
    const pagina = parseInt(numeroPagina);
    
    if (isNaN(pagina) || pagina < 1 || pagina > hq.paginas.length) {
        return await sock.sendMessage(remoteJid, {
            text: `❌ Página inválida! Este HQ tem ${hq.paginas.length} páginas.\nUse *#pag [número]* (exemplo: #pag 1)`
        }, { quoted: message });
    }

    sessao.paginaAtual = pagina;

    const urlPagina = hq.paginas[pagina - 1];
    console.log(`📖 [${userId}] Mostrando página ${pagina}/${hq.paginas.length} do HQ "${hq.titulo}"`);

    const imageBuffer = await baixarImagemComJimp(urlPagina);
    
    if (!imageBuffer) {
        return await sock.sendMessage(remoteJid, {
            text: `❌ Erro ao carregar a página ${pagina}. Tente novamente.`
        }, { quoted: message });
    }

    let caption = `🔞 *${hq.titulo}*\n\n`;
    if (hq.categoria) {
        caption += `_${hq.categoria}_\n`;
    }
    caption += `\n📄 Página ${pagina} de ${hq.paginas.length}\n`;
    caption += `───────────────\n`;
    
    if (pagina < hq.paginas.length) {
        caption += `➡️ Próxima: *#pag ${pagina + 1}*\n`;
    }
    if (pagina > 1) {
        caption += `⬅️ Anterior: *#pag ${pagina - 1}*\n`;
    }
    caption += `🔢 Ir para: *#pag [número]*\n`;
    caption += `🏠 Voltar: *#hqs*\n\n`;
    caption += `© _Damas da Night_`;

    try {
        const thumb = await gerarThumbnail(imageBuffer, 256);
        
        await sock.sendMessage(remoteJid, {
            image: imageBuffer,
            caption: caption,
            jpegThumbnail: thumb,
            contextInfo: {
                stanzaId: message.key.id,
                participant: message.key.participant || message.key.remoteJid,
                quotedMessage: message.message
            }
        });
        
        console.log(`✅ [${userId}] Página ${pagina} enviada com sucesso!`);
    } catch (err) {
        console.error('❌ Erro ao enviar página:', err.message);
        await sock.sendMessage(remoteJid, {
            text: `❌ Erro ao enviar a imagem. Tente novamente.`
        }, { quoted: message });
    }
}

/**
 * HQ aleatório
 */
async function hqAleatorio(sock, remoteJid, message) {
    if (hqs.length === 0) {
        return await sock.sendMessage(remoteJid, {
            text: '❌ Nenhum HQ disponível no momento.'
        }, { quoted: message });
    }

    const indexAleatorio = Math.floor(Math.random() * hqs.length);
    await iniciarHQ(sock, remoteJid, (indexAleatorio + 1).toString(), message);
}

/**
 * Handler principal para Baileys - processa comandos
 */
export async function handleHQs(sock, message) {
    try {
        console.log('\n🎯 ========= handleHQs CHAMADO =========');
        
        let texto = '';
        if (message.message.conversation) {
            texto = message.message.conversation;
            console.log('✅ Texto extraído de conversation');
        } else if (message.message.extendedTextMessage?.text) {
            texto = message.message.extendedTextMessage.text;
            console.log('✅ Texto extraído de extendedTextMessage');
        } else if (message.message.imageMessage?.caption) {
            texto = message.message.imageMessage.caption;
            console.log('✅ Texto extraído de imageMessage');
        } else {
            console.log('❌ Nenhum texto encontrado na mensagem');
            return false;
        }

        console.log('💬 Texto original:', texto);
        texto = texto.toLowerCase().trim();
        console.log('💬 Texto processado:', texto);
        
        const remoteJid = message.key.remoteJid;
        console.log('📱 RemoteJid:', remoteJid);

        // Comando: #hqs - Lista todos
        if (texto === '#hqs') {
            console.log('✅ Comando #hqs reconhecido!');
            const resposta = listarHQs();
            await sock.sendMessage(remoteJid, { 
                text: resposta 
            }, { quoted: message });
            return true;
        }

        // Comando: #hq [numero]
        if (texto.startsWith('#hq ')) {
            console.log('✅ Comando #hq reconhecido!');
            const numero = texto.replace('#hq ', '').trim();
            await iniciarHQ(sock, remoteJid, numero, message);
            return true;
        }

        // Comando: #pag [numero]
        if (texto.startsWith('#pag ')) {
            console.log('✅ Comando #pag reconhecido!');
            const numero = texto.replace('#pag ', '').trim();
            await mostrarPagina(sock, remoteJid, numero, message);
            return true;
        }

        // Comando: #randomhq
        if (texto === '#randomhq') {
            console.log('✅ Comando #randomhq reconhecido!');
            await hqAleatorio(sock, remoteJid, message);
            return true;
        }

        // Comando: #atualizarhqs
        if (texto === '#atualizarhqs') {
            console.log('✅ Comando #atualizarhqs reconhecido!');
            await sock.sendMessage(remoteJid, { 
                text: '🔄 Atualizando HQs...' 
            }, { quoted: message });
            
            const sucesso = await carregarHQs();
            const resposta = sucesso 
                ? `✅ HQs atualizados!\nTotal: ${hqs.length} HQs`
                : '❌ Erro ao atualizar HQs. Tente novamente.';
            
            await sock.sendMessage(remoteJid, { 
                text: resposta 
            }, { quoted: message });
            return true;
        }

        // Comando: #ajudahqs
        if (texto === '#ajudahqs' || texto === '#helphqs') {
            console.log('✅ Comando #ajudahqs reconhecido!');
            const resposta = `🔞 *COMANDOS DE HQS ERÓTICOS*\n\n` +
                       `*#hqs* - Lista todos os HQs\n` +
                       `*#hq [número]* - Inicia leitura de um HQ\n` +
                       `*#pag [número]* - Vai para página específica\n` +
                       `*#randomhq* - HQ aleatório\n` +
                       `*#atualizarhqs* - Atualizar lista de HQs\n` +
                       `*#ajudahqs* - Esta mensagem\n\n` +
                       `📊 Total de HQs: ${hqs.length}\n\n` +
                       `💡 *Como usar:*\n` +
                       `1. Digite *#hqs* para ver a lista\n` +
                       `2. Escolha um HQ: *#hq 1*\n` +
                       `3. Navegue: *#pag 2*, *#pag 3*, etc.\n\n` +
                       `© _Damas da Night_`;
            
            await sock.sendMessage(remoteJid, { 
                text: resposta 
            }, { quoted: message });
            return true;
        }

        console.log('❌ Nenhum comando de HQ reconhecido');
        console.log('========================================\n');
        return false;
        
    } catch (error) {
        console.error('❌ Erro no handleHQs:', error);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Inicializar carregando os HQs
console.log('🚀 Iniciando carregamento inicial dos HQs...');
carregarHQs();

// Exportar funções
export {
    carregarHQs,
    listarHQs
};