// contosHandler.js - VERSÃO SIMPLIFICADA (SEM COMANDOS DUPLICADOS)
import fetch from 'node-fetch';
import axios from 'axios';
import Jimp from 'jimp';

console.log('✅ contosHandler.js CARREGADO!');

// URL do seu repositório GitHub
const URL_CONTOS = 'https://raw.githubusercontent.com/LucasNascimento25/meus-contos/main/contos/contos.json';

// Cache dos contos em memória
let contos = [];
let ultimaAtualizacao = null;

/**
 * Função para gerar thumbnail com Jimp (mantém proporção original)
 */
async function gerarThumbnail(buffer, size = 256) {
    try {
        const image = await Jimp.read(buffer);
        // Redimensiona mantendo a proporção original (não força quadrado)
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
        
        // Baixa a imagem
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*'
            },
            maxRedirects: 5,
            validateStatus: (status) => status === 200
        });

        const imageBuffer = Buffer.from(response.data);
        console.log(`📦 Buffer baixado: ${imageBuffer.length} bytes`);

        // Valida tamanho mínimo
        if (imageBuffer.length < 5000) {
            console.log(`⚠️ Imagem muito pequena (${imageBuffer.length} bytes)`);
            return null;
        }

        // Processa com Jimp
        const image = await Jimp.read(imageBuffer);
        console.log(`📐 Dimensões originais: ${image.getWidth()}x${image.getHeight()}`);
        
        // Limita tamanho máximo mantendo proporção
        const maxWidth = 1280;
        const maxHeight = 720;
        
        if (image.getWidth() > maxWidth || image.getHeight() > maxHeight) {
            console.log(`🔧 Redimensionando...`);
            // Usa scaleToFit para reduzir mantendo proporção exata
            image.scaleToFit(maxWidth, maxHeight);
            console.log(`✅ Nova dimensão: ${image.getWidth()}x${image.getHeight()}`);
        }

        // Converte para JPEG de alta qualidade
        const processedBuffer = await image
            .quality(90)
            .getBufferAsync(Jimp.MIME_JPEG);

        console.log(`✅ Imagem processada: ${processedBuffer.length} bytes`);
        
        // Valida tamanho máximo (5MB)
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
 * Carrega os contos do GitHub
 */
async function carregarContos() {
    try {
        console.log('🔄 Iniciando carregamento dos contos...');
        const response = await fetch(URL_CONTOS);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const dados = await response.json();
        contos = dados.contos || [];
        ultimaAtualizacao = new Date();
        
        console.log(`✅ ${contos.length} contos carregados com sucesso!`);
        console.log('📚 Contos disponíveis:', contos.map(c => c.titulo).join(', '));
        return true;
    } catch (error) {
        console.error('❌ Erro ao carregar contos:', error);
        return false;
    }
}

/**
 * Retorna a lista de contos formatada
 */
function listarContos() {
    console.log('📋 listarContos() chamado. Total:', contos.length);
    
    if (contos.length === 0) {
        return '❌ Nenhum conto disponível no momento.';
    }

    let lista = '📚 *CONTOS DISPONÍVEIS*\n';
    lista += 'Autora: Gatinha Lua 🐾\n\n';
    contos.forEach((conto, index) => {
        lista += `${index + 1}. *${conto.titulo}*\n`;
    });
    lista += '\n💡 Digite *#ler [número]* para ler um conto\n';
    lista += 'Exemplo: #ler 1\n\n';
    lista += '_© Damas da Night_';

    return lista;
}

/**
 * Retorna um conto específico pelo número
 */
function obterConto(numero) {
    const index = parseInt(numero) - 1;
    
    if (isNaN(index) || index < 0 || index >= contos.length) {
        return {
            sucesso: false,
            mensagem: `❌ Número inválido! Temos ${contos.length} contos disponíveis.\nUse *#contos* para ver a lista.`,
            conto: null
        };
    }

    const conto = contos[index];
    let mensagem = `📖 *${conto.titulo}*\n`;
    mensagem += `_Autora: Gatinha Lua 🐾_\n\n`;
    mensagem += `${conto.conteudo}\n\n`;
    mensagem += `───────────────\n`;
    mensagem += `📚 Conto ${numero} de ${contos.length}\n`;
    mensagem += `_© Damas da Night_`;

    return {
        sucesso: true,
        mensagem: mensagem,
        conto: conto
    };
}

/**
 * Retorna um conto aleatório
 */
function contoAleatorio() {
    if (contos.length === 0) {
        return {
            sucesso: false,
            mensagem: '❌ Nenhum conto disponível no momento.',
            conto: null
        };
    }

    const indexAleatorio = Math.floor(Math.random() * contos.length);
    const conto = contos[indexAleatorio];
    
    let mensagem = `🎲 *CONTO ALEATÓRIO*\n\n`;
    mensagem += `📖 *${conto.titulo}*\n`;
    mensagem += `_Autora: Gatinha Lua 🐾_\n\n`;
    mensagem += conto.conteudo + '\n\n';
    mensagem += `_© Damas da Night_`;

    return {
        sucesso: true,
        mensagem: mensagem,
        conto: conto
    };
}

/**
 * Handler principal para Baileys - processa comandos
 */
export async function handleContos(sock, message) {
    try {
        console.log('\n🎯 ========= handleContos CHAMADO =========');
        console.log('📦 Message keys:', Object.keys(message));
        console.log('📦 Message.message keys:', Object.keys(message.message || {}));
        
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
        
        let resposta = null;

        // Comando: #contos - Lista todos
        if (texto === '#contos') {
            console.log('✅ Comando #contos reconhecido!');
            resposta = listarContos();
            await sock.sendMessage(remoteJid, { 
                text: resposta 
            }, { quoted: message });
        }

        // Comando: #ler [numero]
        else if (texto.startsWith('#ler ')) {
            console.log('✅ Comando #ler reconhecido!');
            const numero = texto.replace('#ler ', '').trim();
            const resultado = obterConto(numero);
            
            if (resultado.sucesso && resultado.conto && resultado.conto.imagem) {
                console.log('📷 Conto tem imagem, baixando...');
                
                // Baixa e processa a imagem
                const imageBuffer = await baixarImagemComJimp(resultado.conto.imagem);
                
                if (imageBuffer) {
                    // Envia imagem com caption
                    try {
                        // Gera thumbnail menor (256x256)
                        const thumb = await gerarThumbnail(imageBuffer, 256);
                        
                        await sock.sendMessage(remoteJid, {
                            image: imageBuffer,
                            caption: resultado.mensagem,
                            jpegThumbnail: thumb,
                            contextInfo: {
                                stanzaId: message.key.id,
                                participant: message.key.participant || message.key.remoteJid,
                                quotedMessage: message.message
                            }
                        });
                        console.log('✅ Conto com imagem enviado!');
                    } catch (err) {
                        console.error('❌ Erro ao enviar imagem:', err.message);
                        // Fallback: envia só o texto
                        await sock.sendMessage(remoteJid, { 
                            text: resultado.mensagem 
                        }, { quoted: message });
                    }
                } else {
                    // Se falhou o download, envia só o texto
                    console.log('⚠️ Falha no download, enviando apenas texto');
                    await sock.sendMessage(remoteJid, { 
                        text: resultado.mensagem 
                    }, { quoted: message });
                }
            } else {
                // Sem imagem, envia só o texto
                console.log('📝 Enviando conto sem imagem');
                await sock.sendMessage(remoteJid, { 
                    text: resultado.mensagem 
                }, { quoted: message });
            }
        }

        // Comando: #aleatorio
        else if (texto === '#aleatorio') {
            console.log('✅ Comando #aleatorio reconhecido!');
            const resultado = contoAleatorio();
            
            if (resultado.sucesso && resultado.conto && resultado.conto.imagem) {
                console.log('📷 Conto aleatório tem imagem, baixando...');
                
                const imageBuffer = await baixarImagemComJimp(resultado.conto.imagem);
                
                if (imageBuffer) {
                    try {
                        // Gera thumbnail menor (256x256)
                        const thumb = await gerarThumbnail(imageBuffer, 256);
                        
                        await sock.sendMessage(remoteJid, {
                            image: imageBuffer,
                            caption: resultado.mensagem,
                            jpegThumbnail: thumb,
                            contextInfo: {
                                stanzaId: message.key.id,
                                participant: message.key.participant || message.key.remoteJid,
                                quotedMessage: message.message
                            }
                        });
                        console.log('✅ Conto aleatório com imagem enviado!');
                    } catch (err) {
                        console.error('❌ Erro ao enviar imagem:', err.message);
                        await sock.sendMessage(remoteJid, { 
                            text: resultado.mensagem 
                        }, { quoted: message });
                    }
                } else {
                    console.log('⚠️ Falha no download, enviando apenas texto');
                    await sock.sendMessage(remoteJid, { 
                        text: resultado.mensagem 
                    }, { quoted: message });
                }
            } else {
                console.log('📝 Enviando conto aleatório sem imagem');
                await sock.sendMessage(remoteJid, { 
                    text: resultado.mensagem 
                }, { quoted: message });
            }
        }

        // Comando: #atualizarcontos
        else if (texto === '#atualizarcontos') {
            console.log('✅ Comando #atualizarcontos reconhecido!');
            await sock.sendMessage(remoteJid, { 
                text: '🔄 Atualizando contos...' 
            }, { quoted: message });
            
            const sucesso = await carregarContos();
            resposta = sucesso 
                ? `✅ Contos atualizados!\nTotal: ${contos.length} contos`
                : '❌ Erro ao atualizar contos. Tente novamente.';
            
            await sock.sendMessage(remoteJid, { 
                text: resposta 
            }, { quoted: message });
        }

        // Comando: #ajudacontos
        else if (texto === '#ajudacontos') {
            console.log('✅ Comando #ajudacontos reconhecido!');
            resposta = `📚 *COMANDOS DE CONTOS*\n\n` +
                       `*#contos* - Lista todos os contos\n` +
                       `*#ler [número]* - Lê um conto específico\n` +
                       `*#aleatorio* - Envia um conto aleatório\n` +
                       `*#atualizarcontos* - Atualiza a lista de contos\n` +
                       `*#ajudacontos* - Esta mensagem\n\n` +
                       `📊 Total de contos: ${contos.length}`;
            
            await sock.sendMessage(remoteJid, { 
                text: resposta 
            }, { quoted: message });
        }

        else {
            console.log('❌ Nenhum comando reconhecido');
            console.log('========================================\n');
            return false;
        }

        console.log(`✅ Comando de conto executado: ${texto}`);
        console.log('========================================\n');
        return true;
        
    } catch (error) {
        console.error('❌ Erro no handleContos:', error);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Inicializar carregando os contos
console.log('🚀 Iniciando carregamento inicial dos contos...');
carregarContos();

// Exportar funções
export {
    carregarContos,
    listarContos,
    obterConto,
    contoAleatorio
};