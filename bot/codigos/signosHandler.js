// signosHandler.js - Sistema de Signos e Horóscopo Otimizado com Menções
import fetch from 'node-fetch';

const URL_SIGNOS = 'https://raw.githubusercontent.com/LucasNascimento25/signos-taro/main/signos.json';
const ADMIN_NUMBER = '5516981874405'; // ⚠️ ATUALIZE AQUI COM SEU NÚMERO REAL

const SIGNOS_MAP = {
    'aries': 'aries', 'áries': 'aries',
    'touro': 'touro',
    'gemeos': 'gemeos', 'gêmeos': 'gemeos',
    'cancer': 'cancer', 'câncer': 'cancer',
    'leao': 'leao', 'leão': 'leao',
    'virgem': 'virgem', 'libra': 'libra',
    'escorpiao': 'escorpiao', 'escorpião': 'escorpiao',
    'sagitario': 'sagitario', 'sagitário': 'sagitario',
    'capricornio': 'capricornio', 'capricórnio': 'capricornio',
    'aquario': 'aquario', 'aquário': 'aquario',
    'peixes': 'peixes'
};

let signos = {};
let signosCarregados = false;
let envioEmAndamento = false;

/**
 * Extrai apenas os dígitos do número (adaptado de blacklistFunctions.js)
 */
function extractDigits(number) {
    // Remove tudo que não é dígito
    let digits = number.replace(/@.*$/, '').replace(/\D/g, '');
    
    // Adiciona 55 se for número brasileiro de 11 dígitos sem código de país
    if (digits.length === 11 && !digits.startsWith('55')) {
        digits = '55' + digits;
    }
    
    return digits;
}

// Função para formatar cabeçalho
const formatarCabecalho = () => 
    'ஓீᤢ✧͢⃟ᤢ̤̤̤̤̤̤̤̤̤̤̤̤̤̤̤̤̤̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̼̬🔮ஓீᤢ✧͢⃟ᤢ̤̤̤̤̤̤̤̤̤̤̤̤̤̤̤̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̼̬🔮ஓீᤢ✧͢⃟ᤢ̤̤̤̤̤̤̤̤̤̤̤̤̤̤̤̤̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̣̼̬🔮\n💃 ⃝⃕፝⃟Oráculo das Damas⸵░⃟☪️\n᭥ꩌ゚໋ ꯴᩠ꦽꦼ⛓️↦᭥ꩌ゚໋ ꯴᩠ꦽꦼ⛓️↦᭥ꩌ゚໋ ꯴᩠ꦽꦼ⛓️\n𝔇𝔞𝔪𝔞𝔰 𝔡𝔞 𝔑𝔦𝔤𝔥𝔱\n🔮 ⃢───𖡜ꦽ̸ོ˚￫───ཹ🔮💃🏻 ݇-݈\n°︠︠︠︠︠︠︠︠𖡬 ᭄\n\n';

const formatarRodape = () => {
    const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dataFormatada = data.charAt(0).toUpperCase() + data.slice(1);
    return `\n°︠︠︠︠︠︠︠︠𖡬 ᭄───𖡜ꦽ̸ོ˚￫───ཹ🔮💃\n_${dataFormatada}_\n_© Oráculo das Damas_`;
};

// Carrega signos do GitHub
export async function carregarSignos() {
    try {
        console.log('🔄 Carregando signos...');
        const response = await fetch(URL_SIGNOS, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            timeout: 15000
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        signos = await response.json();
        signosCarregados = true;
        console.log(`✅ ${Object.keys(signos).length} signos carregados!`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao carregar signos:', error.message);
        signosCarregados = false;
        throw error;
    }
}

const verificarCarregamento = () => {
    if (!signosCarregados) {
        return '⚠️ Aguarde, os signos estão sendo carregados...\nTente novamente em alguns segundos.';
    }
    return null;
};

/**
 * 🔥 FUNÇÃO CORRIGIDA: Resolve LID para número real usando múltiplos métodos
 */
async function resolverNumeroReal(sock, senderJid, chatJid) {
    try {
        // Método 1: Se não é LID, retorna direto
        if (!senderJid.includes('@lid')) {
            console.log('✅ Não é LID, usando JID original:', senderJid);
            return senderJid;
        }

        console.log('🔍 Detectado LID, tentando resolver:', senderJid);

        // Método 2: Tenta buscar nos metadados do grupo
        if (chatJid.includes('@g.us')) {
            try {
                const groupMetadata = await sock.groupMetadata(chatJid);
                
                // Busca o participante pelo LID
                const participant = groupMetadata.participants.find(p => p.id === senderJid);
                
                if (participant) {
                    console.log('📋 Participante encontrado:', JSON.stringify(participant, null, 2));
                    
                    // 🔥 PRIORIDADE: Campo phoneNumber (onde está o número REAL!)
                    if (participant.phoneNumber) {
                        console.log('✅ Número real via phoneNumber:', participant.phoneNumber);
                        return participant.phoneNumber;
                    }
                    
                    // Tenta diferentes campos onde o número real pode estar
                    if (participant.jid) {
                        console.log('✅ Número real via jid:', participant.jid);
                        return participant.jid;
                    }
                    
                    if (participant.notify) {
                        console.log('✅ Número real via notify:', participant.notify);
                        return participant.notify;
                    }
                    
                    if (participant.phone) {
                        const phoneJid = participant.phone + '@s.whatsapp.net';
                        console.log('✅ Número real via phone:', phoneJid);
                        return phoneJid;
                    }
                }
            } catch (err) {
                console.error('❌ Erro ao buscar metadados:', err.message);
            }
        }

        // Método 3: Tenta usar store (se disponível)
        if (sock.store?.contacts?.[senderJid]) {
            const contact = sock.store.contacts[senderJid];
            if (contact.notify || contact.name) {
                console.log('✅ Número via store:', contact);
                return contact.id || senderJid;
            }
        }

        // Método 4: Tenta extrair do próprio LID (alguns casos)
        const lidMatch = senderJid.match(/^(\d+)@lid$/);
        if (lidMatch) {
            const possibleJid = lidMatch[1] + '@s.whatsapp.net';
            console.log('🔄 Tentando JID construído:', possibleJid);
            return possibleJid;
        }

        console.log('⚠️ Não foi possível resolver LID, usando original');
        return senderJid;

    } catch (error) {
        console.error('❌ Erro em resolverNumeroReal:', error);
        return senderJid;
    }
}

/**
 * Verifica se usuário é admin - CORRIGIDO COM NOVA FUNÇÃO DE RESOLUÇÃO
 */
const verificarAdmin = async (sock, message) => {
    try {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatJid = message.key.remoteJid;
        
        // 🔥 USA A NOVA FUNÇÃO DE RESOLUÇÃO
        const numeroReal = await resolverNumeroReal(sock, senderJid, chatJid);
        
        // Extrai apenas os dígitos
        const numero = extractDigits(numeroReal);
        const adminNumero = extractDigits(ADMIN_NUMBER);
        
        console.log('🔍 ========= Verificando Admin (Signos) =========');
        console.log('📥 Remetente JID original:', senderJid);
        console.log('📥 Número real resolvido:', numeroReal);
        console.log('📥 Chat JID:', chatJid);
        console.log('🔢 Número extraído:', numero);
        console.log('🔢 Admin configurado:', adminNumero);
        console.log('🎯 É admin?', numero === adminNumero);
        console.log('=================================================\n');
        
        return numero === adminNumero;
    } catch (err) {
        console.error('❌ Erro em verificarAdmin:', err);
        return false;
    }
};

/**
 * Obtém lista de participantes do grupo (mesmo esquema do AutoTagHandler)
 */
async function obterParticipantesGrupo(sock, jid) {
    try {
        if (!jid.endsWith('@g.us')) {
            console.log('⚠️ Não é um grupo, sem menções');
            return [];
        }

        const groupMetadata = await sock.groupMetadata(jid);
        const participants = groupMetadata.participants.map(p => p.id);
        
        console.log(`👥 ${participants.length} participantes encontrados no grupo`);
        return participants;
    } catch (error) {
        console.error('❌ Erro ao obter participantes:', error);
        return [];
    }
}

/**
 * Envia todos os signos com intervalo e MENÇÕES NO POSTER INICIAL
 */
async function enviarSignosCompletos(sock, jid) {
    if (envioEmAndamento) {
        return '⚠️ Já existe um envio em andamento. Aguarde a conclusão.';
    }

    const erro = verificarCarregamento();
    if (erro) return erro;

    envioEmAndamento = true;
    
    try {
        const listaSignos = Object.values(signos);
        
        // Obtém participantes para mencionar
        const mentions = await obterParticipantesGrupo(sock, jid);
        
        console.log(`\n🏷️ ========= POSTER COM MENÇÕES =========`);
        console.log(`📱 Grupo: ${jid}`);
        console.log(`👥 Mencionando: ${mentions.length} pessoas`);
        console.log(`🕒 ${new Date().toLocaleString('pt-BR')}`);
        console.log(`========================================\n`);
        
        // Envia poster inicial com menções
        await sock.sendMessage(jid, { 
            text: formatarCabecalho() + 
                  `🔮 *ENVIANDO SIGNOS DO DIA* 🔮\n\n` +
                  `✨ *Aguarde envio...*` +
                  formatarRodape(),
            mentions: mentions
        });

        // Envia cada signo
        for (let i = 0; i < listaSignos.length; i++) {
            const s = listaSignos[i];
            
            const mensagem = formatarCabecalho() +
                `${s.simbolo} *${s.nome.toUpperCase()}* ${s.simbolo}\n\n` +
                `🃏 *Carta do Dia:* ${s.carta}\n\n` +
                `🌟 *Previsão:*\n${s.previsao}\n\n` +
                `💡 *Conselho:*\n${s.conselho}\n\n` +
                formatarRodape();

            await sock.sendMessage(jid, { text: mensagem });
            
            console.log(`✅ Signo ${i + 1}/${listaSignos.length} enviado: ${s.nome}`);
            
            if (i < listaSignos.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
            }
        }

        // Mensagem final
        await sock.sendMessage(jid, { 
            text: formatarCabecalho() +
                  `✨ *AS DAMAS COMPLETARAM SUAS REVELAÇÕES* ✨\n\n` +
                  `🔮 _"Os astros falaram, os arcanos se manifestaram..._\n` +
                  `_As energias do universo foram reveladas."_\n\n` +
                  `🌙 *O ciclo de hoje se encerra,*\n` +
                  `*mas o véu do amanhã já se prepara para abrir...*\n\n` +
                  `💫 _Retornaremos com novas previsões quando_\n` +
                  `_o sol renascer e as estrelas dançarem novamente._\n\n` +
                  `🌟 *Que as bênçãos do Oráculo guiem seus passos!*\n\n` +
                  `🔮💃 _Até o próximo encontro, queridas Damas..._\n` +
                  formatarRodape()
        });

        envioEmAndamento = false;
        return null;
        
    } catch (error) {
        envioEmAndamento = false;
        console.error('❌ Erro no envio de signos:', error);
        throw error;
    }
}

// Lista todos os signos
export function listarSignos() {
    const erro = verificarCarregamento();
    if (erro) return erro;
    
    let msg = formatarCabecalho() + '🌟 *SIGNOS DISPONÍVEIS* 🌟\n\n';
    
    Object.values(signos).forEach(s => {
        msg += `${s.simbolo} *${s.nome}*\n`;
    });
    
    msg += '\n💫 Digite *!signo [nome]* para ver sua previsão\n📝 Exemplo: !signo aries\n' + formatarRodape();
    return msg;
}

// Obtém um signo específico
export function obterSigno(nome) {
    const erro = verificarCarregamento();
    if (erro) return { sucesso: false, mensagem: erro };
    
    const key = SIGNOS_MAP[nome.toLowerCase().trim()];
    if (!key || !signos[key]) {
        return { sucesso: false, mensagem: '❌ Signo não encontrado!\n\nUse *!listasignos* para ver todos os signos.' };
    }

    const s = signos[key];
    const msg = formatarCabecalho() +
        `${s.simbolo} *${s.nome}* ${s.simbolo}\n\n` +
        `🃏 *Carta do Dia:* ${s.carta}\n\n` +
        `🌟 *Previsão:*\n${s.previsao}\n\n` +
        `💡 *Conselho:*\n${s.conselho}\n` +
        formatarRodape();

    return { sucesso: true, mensagem: msg, signo: s };
}

// Signo aleatório
export function signoAleatorio() {
    const erro = verificarCarregamento();
    if (erro) return { sucesso: false, mensagem: erro };
    
    const keys = Object.keys(signos);
    const s = signos[keys[Math.floor(Math.random() * keys.length)]];
    
    const msg = formatarCabecalho() +
        '🎲 *SIGNO ALEATÓRIO* 🎲\n\n' +
        `${s.simbolo} *${s.nome}* ${s.simbolo}\n\n` +
        `🃏 *Carta do Dia:* ${s.carta}\n\n` +
        `🌟 *Previsão:*\n${s.previsao}\n\n` +
        `💡 *Conselho:*\n${s.conselho}\n` +
        formatarRodape();

    return { sucesso: true, mensagem: msg, signo: s };
}

// Horóscopo completo
export function horoscopoCompleto() {
    const erro = verificarCarregamento();
    if (erro) return erro;
    
    let msg = formatarCabecalho() + '✨ *HORÓSCOPO COMPLETO* ✨\n\n';
    
    Object.values(signos).forEach((s, i, arr) => {
        msg += `${s.simbolo} *${s.nome}*\n🃏 ${s.carta}\n${s.previsao}`;
        if (i < arr.length - 1) msg += '\n\n───────────────\n\n';
    });
    
    return msg + formatarRodape();
}

// Handler principal
export async function handleSignos(sock, message) {
    try {
        const texto = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text || 
                     message.message?.imageMessage?.caption || '';
        
        if (!texto) return false;

        const cmd = texto.toLowerCase().trim();
        const jid = message.key.remoteJid;
        
        // Comandos restritos (apenas admin)
        if (cmd === '#damastaro') {
            const isAdmin = await verificarAdmin(sock, message);
            
            if (!isAdmin) {
                await sock.sendMessage(jid, { 
                    text: formatarCabecalho() +
                          '⛔ *ACESSO NEGADO* ⛔\n\n' +
                          '🔮 *As Damas da Night protegem seus segredos...*\n\n' +
                          '❌ Você não possui permissão para acessar\n' +
                          '    os mistérios sagrados do Oráculo.\n\n' +
                          '🔒 Este comando é **exclusivo** para a\n' +
                          '    *Mestra do Oráculo*.\n\n' +
                          '💫 Apenas aqueles escolhidos pelas Damas\n' +
                          '    podem invocar o poder completo do Tarô.\n\n' +
                          '🌙 _"Nem todos têm olhos para ver além do véu..."_\n' +
                          formatarRodape()
                }, { quoted: message });
                return true;
            }
            
            const resultado = await enviarSignosCompletos(sock, jid);
            if (resultado) {
                await sock.sendMessage(jid, { text: resultado }, { quoted: message });
            }
            return true;
        }

        if (cmd === '#atualizarsignos') {
            const isAdmin = await verificarAdmin(sock, message);
            
            if (!isAdmin) {
                await sock.sendMessage(jid, { 
                    text: formatarCabecalho() +
                          '⛔ *ACESSO NEGADO* ⛔\n\n' +
                          '🔮 *As Damas da Night protegem seus segredos...*\n\n' +
                          '❌ Você não possui permissão para acessar\n' +
                          '    os mistérios sagrados do Oráculo.\n\n' +
                          '🔒 Este comando é **exclusivo** para a\n' +
                          '    *Mestra do Oráculo*.\n\n' +
                          '💫 Apenas aqueles escolhidos pelas Damas\n' +
                          '    podem invocar o poder completo do Tarô.\n\n' +
                          '🌙 _"Nem todos têm olhos para ver além do véu..."_\n' +
                          formatarRodape()
                }, { quoted: message });
                return true;
            }
            
            await sock.sendMessage(jid, { text: '🔄 Atualizando signos...' }, { quoted: message });
            try {
                await carregarSignos();
                await sock.sendMessage(jid, { 
                    text: formatarCabecalho() +
                          `✅ *SIGNOS ATUALIZADOS!* ✅\n\n` +
                          `📊 Total: ${Object.keys(signos).length} signos\n` +
                          `⏰ ${new Date().toLocaleString('pt-BR')}\n` +
                          formatarRodape()
                }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(jid, { text: `❌ Erro ao atualizar: ${error.message}` }, { quoted: message });
            }
            return true;
        }

        const comandos = {
            '!listasignos': () => listarSignos(),
            '!listarsignos': () => listarSignos(),
            '!mysignos': () => listarSignos(),
            '!signos': () => listarSignos(),
            '!horoscopo': () => horoscopoCompleto(),
            '!horoscopocompleto': () => horoscopoCompleto(),
            '!signoaleatorio': () => signoAleatorio().mensagem,
            '!signo aleatorio': () => signoAleatorio().mensagem,
            '!ajudahoroscopo': () => 
                '🔮 *COMANDOS DE HORÓSCOPO*\n\n' +
                '*!listasignos* - Lista todos\n' +
                '*!signo [nome]* - Ver previsão\n' +
                '*!signoaleatorio* - Aleatório\n' +
                '*!horoscopo* - Completo\n' +
                '*!atualizarhoroscopo* - Atualizar\n\n' +
                '✨ Exemplos:\n!signo aries\n!signo leão'
        };

        // Comandos diretos
        if (comandos[cmd]) {
            await sock.sendMessage(jid, { text: comandos[cmd]() }, { quoted: message });
            return true;
        }

        // !signo [nome]
        if (cmd.startsWith('!signo ')) {
            const nome = texto.substring(7).trim();
            const res = obterSigno(nome);
            await sock.sendMessage(jid, { text: res.mensagem }, { quoted: message });
            return true;
        }

        // !atualizarhoroscopo
        if (cmd === '!atualizarhoroscopo') {
            await sock.sendMessage(jid, { text: '🔄 Atualizando...' }, { quoted: message });
            try {
                await carregarSignos();
                await sock.sendMessage(jid, { text: `✅ Signos atualizados!\n⏰ ${new Date().toLocaleString('pt-BR')}` }, { quoted: message });
            } catch (error) {
                await sock.sendMessage(jid, { text: `❌ Erro: ${error.message}` }, { quoted: message });
            }
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Erro:', error);
        await sock.sendMessage(message.key.remoteJid, { text: `❌ Erro: ${error.message}` }, { quoted: message });
        return false;
    }
}

// Inicialização
carregarSignos().catch(err => console.error('❌ Erro na inicialização:', err));

export { verificarCarregamento as verificarSignosCarregados };