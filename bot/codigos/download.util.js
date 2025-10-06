import pkg from 'yt-dlp-wrap';
const { default: YTDlpWrap } = pkg;
import ytSearch from 'yt-search';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let ytDlp = null;
let isInitialized = false;
let initPromise = null;

// Sistema de retry com backoff exponencial
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            const isLastAttempt = i === maxRetries - 1;
            const isBusyError = err.message.includes('EBUSY') || err.message.includes('spawn');
            
            if (isLastAttempt || !isBusyError) {
                throw err;
            }
            
            const delay = baseDelay * Math.pow(2, i);
            console.log(`⏳ Tentativa ${i + 1}/${maxRetries} falhou. Aguardando ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function initYtDlp() {
    // Se já está inicializado, retorna a instância
    if (isInitialized && ytDlp) {
        return ytDlp;
    }
    
    // Se está inicializando, aguarda a Promise existente
    if (initPromise) {
        return await initPromise;
    }
    
    // Cria nova Promise de inicialização
    initPromise = (async () => {
        try {
            console.log('🔧 Inicializando yt-dlp...');
            const localBinPath = join(__dirname, '../../bin/yt-dlp.exe');
            
            try {
                await fs.access(localBinPath);
                console.log('✅ Usando yt-dlp local');
                ytDlp = new YTDlpWrap(localBinPath);
            } catch {
                console.log('⬇️ Baixando yt-dlp...');
                const downloadedPath = await YTDlpWrap.downloadFromGithub();
                ytDlp = new YTDlpWrap(downloadedPath);
                console.log('✅ yt-dlp baixado com sucesso');
            }
            
            isInitialized = true;
            return ytDlp;
        } catch (err) {
            isInitialized = false;
            initPromise = null;
            throw new Error(`Falha ao inicializar yt-dlp: ${err.message}`);
        }
    })();
    
    return await initPromise;
}

function isYouTubeUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

export async function buscarUrlPorNome(termo) {
    try {
        console.log(`🔍 Buscando no YouTube: ${termo}`);
        
        const resultados = await retryWithBackoff(async () => {
            return await ytSearch(termo);
        }, 3, 1000);
        
        if (!resultados?.videos?.length) {
            throw new Error('Nenhum vídeo encontrado.');
        }
        
        console.log(`✅ Encontrado: ${resultados.videos[0].title}`);
        return resultados.videos[0].url;
    } catch (err) {
        throw new Error(`Não foi possível encontrar: ${termo}`);
    }
}

async function resolverUrl(input) {
    return isYouTubeUrl(input) ? input : await buscarUrlPorNome(input);
}

export async function obterDadosMusica(url) {
    try {
        const ytDlp = await initYtDlp();
        const urlResolvida = await resolverUrl(url);
        
        console.log(`📊 Obtendo informações de: ${urlResolvida}`);
        
        // Usa retry com backoff para evitar EBUSY
        const info = await retryWithBackoff(async () => {
            return await ytDlp.getVideoInfo(urlResolvida);
        }, 3, 2000);

        console.log(`✅ Informações obtidas: ${info.title}`);

        return {
            titulo: info.title,
            autor: info.uploader || info.channel || 'Desconhecido',
            duracao: info.duration || 0,
            url: info.webpage_url,
            thumbnails: info.thumbnails?.map(t => t.url) || [info.thumbnail],
            thumbnailUrl: info.thumbnails?.[info.thumbnails.length - 1]?.url || info.thumbnail || null
        };
    } catch (err) {
        console.error(`❌ Erro ao obter informações: ${err.message}`);
        throw new Error(`Erro ao obter informações: ${err.message}`);
    }
}

export async function baixarMusicaBuffer(url) {
    let tempFile = null;
    
    try {
        const ytDlp = await initYtDlp();
        const urlResolvida = await resolverUrl(url);
        
        const randomId = randomBytes(8).toString('hex');
        tempFile = join(tmpdir(), `music_${randomId}.mp3`);

        console.log(`⬇️ Iniciando download para: ${tempFile}`);

        // Usa retry com backoff para o download
        await retryWithBackoff(async () => {
            return await ytDlp.execPromise([
                urlResolvida,
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '128K',
                '--no-playlist',
                '--no-warnings',
                '--no-check-certificate',
                '--prefer-insecure',
                '--max-filesize', '50M',
                '--socket-timeout', '30',
                '--retries', '3',
                '--fragment-retries', '3',
                '--output', tempFile
            ]);
        }, 3, 2000);

        console.log(`📦 Lendo arquivo baixado...`);
        const buffer = await fs.readFile(tempFile);
        
        console.log(`✅ Download concluído: ${buffer.length} bytes`);
        return { buffer };

    } catch (err) {
        console.error(`❌ Erro no download: ${err.message}`);
        throw new Error(`Falha no download: ${err.message}`);
    } finally {
        if (tempFile) {
            try {
                await fs.unlink(tempFile);
                console.log(`🗑️ Arquivo temporário removido`);
            } catch (cleanupErr) {
                console.log(`⚠️ Não foi possível remover arquivo temporário: ${cleanupErr.message}`);
            }
        }
    }
}

// Função auxiliar para limpar recursos (útil ao desligar o bot)
export async function cleanup() {
    isInitialized = false;
    ytDlp = null;
    initPromise = null;
    console.log('🧹 Recursos do yt-dlp limpos');
}