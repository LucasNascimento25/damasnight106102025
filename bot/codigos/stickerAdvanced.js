import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Jimp from 'jimp';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import axios from 'axios';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API KEY DO GIPHY
const GIPHY_API_KEY = 'ukV6IWb4aCdDpp8RSnwRx14NN5jtLof9';

/**
 * Handler para buscar GIF automaticamente e criar sticker
 * Comando: #buscargif [termos de busca] [texto opcional]
 * Exemplo: #buscargif gato dancando
 * Exemplo: #buscargif cachorro feliz meu pet
 */
async function searchGifStickerHandler(sock, msg, searchTerms, texto = '') {
    try {
        if (!searchTerms || searchTerms.trim() === '') {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Por favor, digite o que você quer buscar!\n\n📝 Exemplos:\n\n#buscargif gato dancando\n#buscargif cachorro feliz\n#buscargif pessoa rindo meu amigo\n\n💡 O texto depois da busca vira legenda do sticker!'
            }, { quoted: msg });
            return;
        }

        // Envia mensagem de processamento
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔍 Buscando "${searchTerms}" no Reino das Damas Gifs 🏰... Aguarde!`
        }, { quoted: msg });

        console.log('🔍 Buscando GIF no Reino das Damas Gifs 🏰:', searchTerms);

        // Busca o GIF no Giphy
        const gifUrl = await searchGiphyGif(searchTerms);
        
        if (!gifUrl) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Não encontrei nenhum GIF para "${searchTerms}".\n\n💡 Tente outros termos de busca!`
            }, { quoted: msg });
            return;
        }

        console.log('✅ GIF encontrado:', gifUrl);

        // Atualiza mensagem de processamento
        const processingMsg = texto 
            ? `⏳ Criando sticker animado com texto "${texto}"... Aguarde!`
            : '⏳ Criando sticker animado... Aguarde!';
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: processingMsg
        }, { quoted: msg });

        // Baixa o GIF
        const gifBuffer = await downloadGifFromUrl(gifUrl);
        
        if (!gifBuffer) {
            throw new Error('Falha ao baixar GIF');
        }

        console.log(`📦 GIF baixado: ${gifBuffer.length} bytes`);

        // Cria sticker animado (com ou sem texto)
        const stickerBuffer = await createAnimatedSticker(gifBuffer, texto);

        if (!stickerBuffer) {
            throw new Error('Falha ao processar GIF');
        }

        console.log('📤 Enviando sticker...');

        // Envia o sticker WebP
        await sock.sendMessage(msg.key.remoteJid, {
            sticker: stickerBuffer
        });

        console.log('✅ Sticker criado e enviado com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao buscar e criar sticker:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Erro ao processar sua busca.\n\nErro: ${error.message}`
        }, { quoted: msg });
    }
}

/**
 * Busca GIF no Giphy pela API
 */
async function searchGiphyGif(searchQuery) {
    try {
        console.log('🌐 Consultando API do Reino das Damas Gifs 🏰...');
        
        // Busca GIFs na API do Giphy
        const response = await axios({
            method: 'get',
            url: 'https://api.giphy.com/v1/gifs/search',
            params: {
                api_key: GIPHY_API_KEY,
                q: searchQuery,
                limit: 1, // Pega apenas o primeiro resultado
                rating: 'g', // Conteúdo familiar
                lang: 'pt' // Resultados em português quando possível
            },
            timeout: 15000
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
            const gifData = response.data.data[0];
            // Retorna URL do GIF original em melhor qualidade
            return gifData.images.original.url;
        }

        console.log('⚠️ Nenhum resultado encontrado');
        return null;

    } catch (error) {
        console.error('❌ Erro ao buscar no Reino das Damas Gifs 🏰:', error.message);
        return null;
    }
}

/**
 * Handler para criar stickers a partir de URL de GIF
 * Comando: #gifsticker [url] [texto]
 */
async function gifUrlStickerHandler(sock, msg, url, texto = '') {
    try {
        if (!url || (!url.includes('giphy.com') && !url.includes('tenor.com') && !url.includes('.gif'))) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ URL inválida!\n\n📝 Exemplos de uso:\n\n#gifsticker https://giphy.com/gifs/abc123\n#gifsticker https://giphy.com/gifs/abc123 dancando\n#gifsticker https://media.giphy.com/media/abc/giphy.gif\n\n✅ Sites suportados:\n• Giphy\n• Tenor\n• Links diretos .gif'
            }, { quoted: msg });
            return;
        }

        const processingMsg = texto 
            ? `⏳ Baixando GIF e criando sticker com texto "${texto}"... Aguarde!`
            : '⏳ Baixando GIF e criando sticker animado... Aguarde!';
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: processingMsg
        }, { quoted: msg });

        console.log('🌐 Baixando GIF da URL:', url);

        const directGifUrl = await getDirectGifUrl(url);
        console.log('🔗 URL direta do GIF:', directGifUrl);

        const gifBuffer = await downloadGifFromUrl(directGifUrl);
        
        if (!gifBuffer) {
            throw new Error('Falha ao baixar GIF da URL');
        }

        console.log(`📦 GIF baixado: ${gifBuffer.length} bytes`);

        const stickerBuffer = await createAnimatedSticker(gifBuffer, texto);

        if (!stickerBuffer) {
            throw new Error('Falha ao processar GIF');
        }

        console.log('📤 Enviando sticker...');

        await sock.sendMessage(msg.key.remoteJid, {
            sticker: stickerBuffer
        });

        console.log('✅ Sticker criado e enviado com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar sticker do GIF:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ Erro ao processar GIF da URL.\n\n💡 Verifique se:\n• A URL está correta\n• O link é de um GIF válido\n• O site está acessível\n\nErro: ${error.message}`
        }, { quoted: msg });
    }
}

/**
 * Converte URL do Giphy/Tenor para link direto do GIF
 */
async function getDirectGifUrl(url) {
    if (url.endsWith('.gif') || url.includes('.gif?')) {
        return url;
    }

    if (url.includes('giphy.com')) {
        const match = url.match(/giphy\.com\/(?:gifs|stickers)\/[^\/]*-([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            const gifId = match[1];
            return `https://media.giphy.com/media/${gifId}/giphy.gif`;
        }
        
        const simpleMatch = url.match(/giphy\.com\/(?:gifs|stickers)\/([a-zA-Z0-9]+)/);
        if (simpleMatch && simpleMatch[1]) {
            return `https://media.giphy.com/media/${simpleMatch[1]}/giphy.gif`;
        }
    }

    if (url.includes('tenor.com')) {
        const match = url.match(/tenor\.com\/view\/[^-]+-(\d+)/);
        if (match && match[1]) {
            return url.replace('view', 'view') + '.gif';
        }
    }

    return url;
}

/**
 * Baixa GIF de uma URL
 */
async function downloadGifFromUrl(url) {
    try {
        console.log('📥 Fazendo download do GIF...');
        
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log('✅ Download concluído!');
        return Buffer.from(response.data);

    } catch (error) {
        console.error('❌ Erro ao baixar GIF:', error.message);
        return null;
    }
}

/**
 * Handler para criar stickers a partir de imagens/GIFs com texto opcional
 * Comando: #stickerdamas [texto]
 */
async function stickerHandler(sock, msg, quotedMsg, texto = '') {
    try {
        if (!quotedMsg) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Por favor, responda a uma imagem ou GIF com o comando #stickerdamas\n\n📝 Exemplos:\n#stickerdamas\n#stickerdamas leozinho\n\n💡 Dica: Para GIF animado, envie o GIF como DOCUMENTO!\n\n🔍 Ou use:\n#buscargif [busca]\n#gifsticker [url]'
            }, { quoted: msg });
            return;
        }

        const messageType = Object.keys(quotedMsg.message)[0];
        if (messageType !== 'imageMessage' && messageType !== 'videoMessage' && messageType !== 'documentMessage') {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ A mensagem respondida precisa ser uma imagem, GIF ou vídeo!'
            }, { quoted: msg });
            return;
        }

        let isGif = false;
        
        if (messageType === 'videoMessage') {
            isGif = quotedMsg.message.videoMessage.gifPlayback || 
                    quotedMsg.message.videoMessage.seconds <= 10;
        }
        
        if (messageType === 'documentMessage') {
            const mimeType = quotedMsg.message.documentMessage.mimetype || '';
            const fileName = quotedMsg.message.documentMessage.fileName || '';
            isGif = mimeType.includes('gif') || fileName.toLowerCase().endsWith('.gif');
        }

        let processingMsg;
        if (isGif) {
            processingMsg = texto 
                ? `⏳ Criando sticker animado com texto "${texto}"... Aguarde!`
                : '⏳ Criando sticker animado... Aguarde!';
        } else {
            processingMsg = texto 
                ? `⏳ Criando sticker com texto "${texto}"... Aguarde!`
                : '⏳ Criando sticker... Aguarde!';
        }
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: processingMsg
        }, { quoted: msg });

        console.log(`📥 Baixando ${isGif ? 'GIF' : 'imagem'}...`);
        const buffer = await downloadMediaMessage(
            quotedMsg,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            }
        );

        console.log(`📦 Buffer baixado: ${buffer.length} bytes`);

        let stickerBuffer;

        if (isGif) {
            stickerBuffer = await createAnimatedSticker(buffer, texto);
        } else if (texto.trim()) {
            stickerBuffer = await createStickerWithText(buffer, texto);
        } else {
            stickerBuffer = await createSimpleSticker(buffer);
        }

        if (!stickerBuffer) {
            throw new Error('Falha ao processar mídia');
        }

        console.log('📤 Enviando sticker...');

        await sock.sendMessage(msg.key.remoteJid, {
            sticker: stickerBuffer
        });

        console.log('✅ Sticker criado e enviado com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao criar sticker:', error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Erro ao criar sticker. Tente novamente ou verifique se a mídia é válida.'
        }, { quoted: msg });
    }
}

/**
 * Cria sticker animado a partir de GIF/vídeo
 */
async function createAnimatedSticker(videoBuffer, texto = '') {
    const tempDir = os.tmpdir();
    const timestamp = Date.now() + Math.random().toString(36).substring(7);
    const inputPath = path.join(tempDir, `sticker_input_${timestamp}.mp4`);
    const outputPath = path.join(tempDir, `sticker_output_${timestamp}.webp`);

    try {
        console.log('🎬 Processando GIF animado...');
        
        fs.writeFileSync(inputPath, videoBuffer);
        console.log(`💾 Vídeo temporário salvo: ${inputPath}`);
        
        let ffmpegCommand = `ffmpeg -i "${inputPath}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -loop 0 -preset default -an -t 6 -vsync 0 "${outputPath}"`;
        
        if (texto.trim()) {
            const textoUpper = texto.toUpperCase().replace(/'/g, "\\'");
            console.log(`✍️ Adicionando texto ao GIF: "${textoUpper}"`);
            
            ffmpegCommand = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15,drawtext=text='${textoUpper}':fontcolor=white:fontsize=48:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-80" -vcodec libwebp -loop 0 -preset default -an -t 6 -vsync 0 "${outputPath}"`;
        }
        
        console.log('⚙️ Executando FFmpeg para GIF animado...');
        await execPromise(ffmpegCommand);
        
        const webpBuffer = fs.readFileSync(outputPath);
        console.log(`✅ WebP animado gerado: ${webpBuffer.length} bytes`);
        
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        
        return webpBuffer;
        
    } catch (error) {
        console.error('❌ Erro ao criar sticker animado:', error.message);
        
        try {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (cleanupError) {
            console.error('⚠️ Erro ao limpar arquivos temporários:', cleanupError);
        }
        
        return null;
    }
}

/**
 * Aplica bordas arredondadas à imagem
 */
async function applyRoundedCorners(image, radius) {
    const width = image.getWidth();
    const height = image.getHeight();
    
    image.scan(0, 0, width, height, function(x, y, idx) {
        let distanceFromCorner = 0;
        
        if (x < radius && y < radius) {
            const dx = radius - x;
            const dy = radius - y;
            distanceFromCorner = Math.sqrt(dx * dx + dy * dy);
            if (distanceFromCorner > radius) {
                this.bitmap.data[idx + 3] = 0;
            }
        }
        else if (x > width - radius && y < radius) {
            const dx = x - (width - radius);
            const dy = radius - y;
            distanceFromCorner = Math.sqrt(dx * dx + dy * dy);
            if (distanceFromCorner > radius) {
                this.bitmap.data[idx + 3] = 0;
            }
        }
        else if (x < radius && y > height - radius) {
            const dx = radius - x;
            const dy = y - (height - radius);
            distanceFromCorner = Math.sqrt(dx * dx + dy * dy);
            if (distanceFromCorner > radius) {
                this.bitmap.data[idx + 3] = 0;
            }
        }
        else if (x > width - radius && y > height - radius) {
            const dx = x - (width - radius);
            const dy = y - (height - radius);
            distanceFromCorner = Math.sqrt(dx * dx + dy * dy);
            if (distanceFromCorner > radius) {
                this.bitmap.data[idx + 3] = 0;
            }
        }
    });
    
    return image;
}

/**
 * Converte PNG para WebP usando FFmpeg
 */
async function convertToWebP(inputBuffer) {
    const tempDir = os.tmpdir();
    const timestamp = Date.now() + Math.random().toString(36).substring(7);
    const inputPath = path.join(tempDir, `sticker_input_${timestamp}.png`);
    const outputPath = path.join(tempDir, `sticker_output_${timestamp}.webp`);

    try {
        console.log('🔄 Convertendo para WebP...');
        
        fs.writeFileSync(inputPath, inputBuffer);
        console.log(`💾 PNG temporário salvo: ${inputPath}`);
        
        const ffmpegCommand = `ffmpeg -i "${inputPath}" -vcodec libwebp -filter:v "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -qscale 75 -preset default -loop 0 -an -vsync 0 "${outputPath}"`;
        
        console.log('⚙️ Executando FFmpeg...');
        await execPromise(ffmpegCommand);
        
        const webpBuffer = fs.readFileSync(outputPath);
        console.log(`✅ WebP gerado: ${webpBuffer.length} bytes`);
        
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        
        return webpBuffer;
        
    } catch (error) {
        console.error('❌ Erro ao converter para WebP:', error.message);
        
        try {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (cleanupError) {
            console.error('⚠️ Erro ao limpar arquivos temporários:', cleanupError);
        }
        
        return null;
    }
}

/**
 * Cria sticker simples sem texto
 */
async function createSimpleSticker(imageBuffer) {
    try {
        console.log('🖼️ Processando imagem para sticker simples...');
        
        let image = await Jimp.read(imageBuffer);
        console.log(`📐 Dimensões originais: ${image.getWidth()}x${image.getHeight()}`);
        
        image.contain(512, 512, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
        console.log(`✅ Redimensionado: 512x512`);
        
        image = await applyRoundedCorners(image, 60);
        console.log(`✅ Bordas arredondadas aplicadas`);
        
        const pngBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
        console.log(`✅ PNG gerado: ${pngBuffer.length} bytes`);
        
        const webpBuffer = await convertToWebP(pngBuffer);
        
        if (!webpBuffer) {
            console.log('⚠️ Falha ao converter para WebP, tentando enviar PNG...');
            return pngBuffer;
        }
        
        return webpBuffer;
        
    } catch (error) {
        console.error('❌ Erro ao criar sticker simples:', error);
        return null;
    }
}

/**
 * Cria sticker com texto
 */
async function createStickerWithText(imageBuffer, texto) {
    try {
        console.log('🖼️ Processando imagem para sticker com texto...');
        
        let image = await Jimp.read(imageBuffer);
        console.log(`📐 Dimensões originais: ${image.getWidth()}x${image.getHeight()}`);
        
        image.contain(512, 512, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
        console.log(`✅ Redimensionado: 512x512`);

        image = await applyRoundedCorners(image, 60);
        console.log(`✅ Bordas arredondadas aplicadas`);

        const textoUpper = texto.toUpperCase();
        console.log(`✍️ Adicionando texto: "${textoUpper}"`);
        
        const fontWhite = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontBlack = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);

        const textWidth = Jimp.measureText(fontWhite, textoUpper);
        const textX = Math.floor((512 - textWidth) / 2);
        const textY = 420;
        
        console.log(`📝 Texto na posição: (${textX}, ${textY})`);

        for (let offsetX = -3; offsetX <= 3; offsetX++) {
            for (let offsetY = -3; offsetY <= 3; offsetY++) {
                if (offsetX !== 0 || offsetY !== 0) {
                    image.print(fontBlack, textX + offsetX, textY + offsetY, textoUpper);
                }
            }
        }

        image.print(fontWhite, textX, textY, textoUpper);

        const pngBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
        console.log(`✅ PNG com texto gerado: ${pngBuffer.length} bytes`);

        const webpBuffer = await convertToWebP(pngBuffer);
        
        if (!webpBuffer) {
            console.log('⚠️ Falha ao converter para WebP, tentando enviar PNG...');
            return pngBuffer;
        }
        
        return webpBuffer;

    } catch (error) {
        console.error('❌ Erro ao criar sticker com texto:', error);
        return null;
    }
}

/**
 * Função para processar os comandos
 */
export async function handleStickerCommand(sock, msg) {
    try {
        const messageText = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || '';
        
        const parts = messageText.trim().split(' ');
        const comando = parts[0].toLowerCase();
        
        // Comando #buscargif [termos de busca] [texto opcional]
        if (comando === '#buscargif') {
            // Separa os termos de busca do texto do sticker
            const restOfMessage = parts.slice(1).join(' ');
            
            // Estratégia: primeiras 3-5 palavras são busca, resto é texto
            const searchParts = parts.slice(1, 6); // pega até 5 palavras para busca
            const textParts = parts.slice(6); // resto vira texto
            
            const searchTerms = searchParts.join(' ');
            const texto = textParts.join(' ');
            
            await searchGifStickerHandler(sock, msg, searchTerms, texto);
            return;
        }
        
        // Comando #gifsticker [url] [texto]
        if (comando === '#gifsticker') {
            const args = messageText.substring(comando.length).trim().split(' ');
            const url = args[0];
            const texto = args.slice(1).join(' ');
            
            await gifUrlStickerHandler(sock, msg, url, texto);
            return;
        }
        
        // Comando #stickerdamas [texto]
        if (comando === '#stickerdamas') {
            const texto = messageText.substring(comando.length).trim();

            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage 
                ? {
                    key: msg.message.extendedTextMessage.contextInfo.participant 
                        ? {
                            remoteJid: msg.key.remoteJid,
                            fromMe: false,
                            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                            participant: msg.message.extendedTextMessage.contextInfo.participant
                          }
                        : {
                            remoteJid: msg.key.remoteJid,
                            fromMe: false,
                            id: msg.message.extendedTextMessage.contextInfo.stanzaId
                          },
                    message: msg.message.extendedTextMessage.contextInfo.quotedMessage
                  }
                : null;

            await stickerHandler(sock, msg, quotedMsg, texto);
        }

    } catch (error) {
        console.error('Erro no handleStickerCommand:', error);
    }
}

export { stickerHandler, gifUrlStickerHandler, searchGifStickerHandler };