// bot.js
import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import pino from 'pino';

import { handleMessages, updateGroupOnJoin } from './bot/codigos/messageHandler.js';
import { configurarBoasVindas } from './bot/codigos/boasVindas.js';
import { configurarDespedida } from './bot/codigos/despedidaMembro.js';
import { isBlacklistedRealtime, scanAndRemoveBlacklisted, onUserJoined } from './bot/codigos/blacklistFunctions.js';
import { verificarBlacklistAgora } from './bot/codigos/blacklistChecker.js';
import { handleGroupParticipantsUpdate as handleAdminNotifications, setupClient } from './bot/codigos/avisoadm.js';
import configurarBloqueio from './bot/codigos/bloquearUsuarios.js';
import pool from './db.js';

const logger = pino({ level: 'fatal', enabled: false });
const BOT_TITLE = '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸';

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
let isConnecting = false;

console.clear();
console.log("🌙 =======================================");
console.log("🌙    DAMAS DA NIGHT - WhatsApp Bot      ");
console.log("🌙 =======================================\n");

async function connectToWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        console.log("🔄 Conectando ao WhatsApp...");

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 25000,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            getMessage: async () => undefined,
            generateHighQualityLinkPreview: false,
            markMessageAsReadWhenReceived: false,
            browser: ['Damas da Night', 'Chrome', '1.0.0'],
            connectTimeoutMs: 30000,
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 2,
            transactionOpts: { maxCommitRetries: 1, delayBetweenTriesMs: 1000 }
        });

        sock.ev.on("creds.update", saveCreds);

        // Conexão e QR code
        sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log("\n📱 Escaneie o QR Code:");
                console.log("=".repeat(50));
                qrcode.generate(qr, { small: true });
                console.log("=".repeat(50));
            }

            if (connection === "open") {
                console.log(`✅ ${BOT_TITLE} Bot conectado com sucesso!`);
                console.log("💾 Conexão com banco de dados: OK");
                console.log("🚀 Bot operacional e monitorando grupos...\n");

                reconnectAttempts = 0;
                isConnecting = false;

                if (!fs.existsSync('./downloads')) fs.mkdirSync('./downloads', { recursive: true });

                // Inicializa bloqueio de usuários privados
                configurarBloqueio(sock);

                // 🔍 VARREDURA AUTOMÁTICA EM TODOS OS GRUPOS AO CONECTAR
                console.log('🔍 ========= INICIANDO VARREDURA AUTOMÁTICA =========\n');
                
                try {
                    // Busca todos os grupos
                    const groups = await sock.groupFetchAllParticipating();
                    const groupIds = Object.keys(groups);
                    
                    console.log(`📋 Total de grupos encontrados: ${groupIds.length}\n`);
                    
                    let totalRemovidos = 0;
                    
                    // Varre cada grupo
                    for (let i = 0; i < groupIds.length; i++) {
                        const groupId = groupIds[i];
                        const groupName = groups[groupId].subject;
                        
                        console.log(`[${i + 1}/${groupIds.length}] 🔍 Varrendo: ${groupName}`);
                        
                        try {
                            const resultado = await scanAndRemoveBlacklisted(groupId, sock);
                            console.log(`   ${resultado}`);
                            
                            // Conta quantos foram removidos
                            const match = resultado.match(/(\d+) usuário/);
                            if (match) {
                                totalRemovidos += parseInt(match[1]);
                            }
                            
                        } catch (err) {
                            console.error(`   ❌ Erro ao varrer ${groupName}:`, err.message);
                        }
                        
                        // Delay de 2 segundos entre grupos
                        if (i < groupIds.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                    
                    console.log('\n✅ ========= VARREDURA COMPLETA =========');
                    console.log(`🚨 Total removido: ${totalRemovidos} usuário(s) da blacklist`);
                    console.log('==========================================\n');
                    
                } catch (err) {
                    console.error('❌ Erro na varredura automática:', err);
                }
            }

            if (connection === "close") {
                isConnecting = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;

                console.log("==================================================");
                console.log("⚠️  Bot desconectado");

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut &&
                                        statusCode !== 401 &&
                                        reconnectAttempts < MAX_RECONNECT_ATTEMPTS;

                if (shouldReconnect) {
                    reconnectAttempts++;
                    console.log(`🔄 Reconectando... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                    setTimeout(() => connectToWhatsApp(), RECONNECT_DELAY);
                } else {
                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        console.log("🚪 Bot foi deslogado. Execute novamente e escaneie o QR.");
                    } else {
                        console.log("❌ Falha na reconexão. Reinicie o bot.");
                    }
                }
            }
        });

        // 🚨 EVENTO DE PARTICIPANTES DO GRUPO (BLACKLIST + NOTIFICAÇÕES + DESPEDIDA)
        sock.ev.on('group-participants.update', async (update) => {
            try {
                const groupId = update.id;
                const action = update.action;

                console.log(`\n👥 ========= EVENTO DE GRUPO =========`);
                console.log(`📱 Grupo: ${groupId}`);
                console.log(`🎬 Ação: "${action}" (tipo: ${typeof action})`);
                console.log(`👤 Participantes:`, update.participants);
                console.log(`📋 Update completo:`, JSON.stringify(update, null, 2));
                console.log(`=====================================\n`);

                // 1️⃣ Notificações de promoção/demissão (avisoadm.js)
                await handleAdminNotifications(sock, update, sock.user);

                // 2️⃣ PROCESSAR ADIÇÕES (BLACKLIST + BOAS-VINDAS)
                if (action === 'add') {
                    for (const participant of update.participants) {
                        const userPhone = participant.split('@')[0];

                        console.log(`\n🔍 ========= VERIFICAÇÃO DE BLACKLIST =========`);
                        console.log(`👤 Verificando: ${participant}`);
                        console.log(`📱 Telefone: ${userPhone}`);
                        
                        // 🔧 Pequeno delay para garantir que o usuário foi processado
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // 🔥 RESOLVE LID PARA NÚMERO REAL
                        let realNumber = participant;
                        if (participant.includes('@lid')) {
                            try {
                                console.log('🔍 LID detectado! Buscando número real...');
                                const metadata = await sock.groupMetadata(groupId);
                                const participantData = metadata.participants.find(p => p.id === participant);
                                
                                if (participantData?.phoneNumber) {
                                    realNumber = participantData.phoneNumber;
                                    console.log(`✅ Número real encontrado: ${realNumber}`);
                                } else {
                                    console.log('⚠️ phoneNumber não encontrado no metadata');
                                }
                            } catch (err) {
                                console.log('⚠️ Erro ao resolver LID:', err.message);
                            }
                        }
                        
                        // 🔥 CHAMA A FUNÇÃO onUserJoined COM O NÚMERO REAL E ID ORIGINAL
                        await onUserJoined(realNumber, groupId, sock, participant);
                        
                        // ✅ Se passou pela verificação, envia boas-vindas (usa o ID original)
                        const isBlocked = await isBlacklistedRealtime(realNumber);
                        if (!isBlocked) {
                            console.log(`✅ ${userPhone} não está na blacklist - enviando boas-vindas`);
                            await configurarBoasVindas(sock, groupId, participant);
                        }
                        
                        console.log(`==============================================\n`);
                    }
                }

                // 3️⃣ PROCESSAR SAÍDAS E REMOÇÕES (DESPEDIDA)
                if (action === 'remove' || action === 'leave') {
                    console.log(`\n👋 ========= PROCESSANDO SAÍDA/REMOÇÃO =========`);
                    console.log(`🎬 Ação detectada: "${action}"`);
                    console.log(`👮 Author (quem executou): ${update.author || 'N/A'}`);
                    console.log(`👥 Total de participantes afetados: ${update.participants.length}`);
                    
                    for (const participant of update.participants) {
                        const userPhone = participant.split('@')[0];
                        
                        console.log(`\n📤 Processando despedida para: ${participant}`);
                        console.log(`📱 Telefone: ${userPhone}`);
                        console.log(`🔄 Chamando configurarDespedida com action="${action}" e author="${update.author}"`);
                        
                        try {
                            // 🔥 PASSA O AUTHOR PARA VERIFICAR SE FOI SAÍDA VOLUNTÁRIA
                            await configurarDespedida(sock, groupId, participant, action, update.author);
                            console.log(`✅ Despedida processada com sucesso para ${userPhone}`);
                        } catch (err) {
                            console.error(`❌ Erro ao processar despedida de ${userPhone}:`, err.message);
                            console.error(err.stack);
                        }
                    }
                    
                    console.log(`==============================================\n`);
                }

                // 4️⃣ Auto-atualizar grupo para AutoTag quando houver mudanças
                if (['add', 'remove', 'leave', 'promote', 'demote'].includes(action)) {
                    await updateGroupOnJoin(sock, groupId);
                    console.log(`🏷️ Grupo ${groupId} atualizado para AutoTag`);
                }

            } catch (error) {
                console.error('❌ Erro no evento de participantes:', error);
                console.error('Stack completo:', error.stack);
            }
        });

        // Listener de mensagens
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== 'notify') return;

            try {
                const validMessages = messages.filter(msg =>
                    msg &&
                    !msg.key.fromMe &&
                    msg.messageTimestamp &&
                    (Date.now() - (msg.messageTimestamp * 1000)) < 30000
                );

                for (const message of validMessages) {
                    await handleMessages(sock, message);

                    const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text;
                    if (messageText && messageText.toLowerCase() === '#veriflista') {
                        const groupId = message.key.remoteJid;
                        const sender = message.key.participant || message.key.remoteJid;

                        const metadata = await sock.groupMetadata(groupId);
                        const participantData = metadata.participants.find(p => p.id === sender);
                        const isAdmin = participantData?.admin === 'admin' || participantData?.admin === 'superadmin';

                        if (!isAdmin) {
                            const adminMsg = await sock.sendMessage(groupId, { text: `${BOT_TITLE} ❌ Apenas administradores podem usar este comando.` });
                            setTimeout(async () => {
                                await sock.sendMessage(groupId, { delete: { remoteJid: adminMsg.key.remoteJid, id: adminMsg.key.id, fromMe: true } });
                            }, 8000);
                            continue;
                        }

                        const checkingMsg = await sock.sendMessage(groupId, { text: `${BOT_TITLE} 🔎 Checando a blacklist...` });
                        const removidos = await verificarBlacklistAgora(sock, groupId);

                        const resultText = removidos.length > 0
                            ? `${BOT_TITLE} 🚨 *Blacklist Atualizada* 💃🎶\n✅ ${removidos.length} usuário(s) removido(s) do grupo:\n• ${removidos.join('\n• ')}`
                            : `${BOT_TITLE} ✅ Nenhum usuário da blacklist encontrado neste grupo.`;

                        const resultMsg = await sock.sendMessage(groupId, { text: resultText });

                        setTimeout(async () => {
                            await sock.sendMessage(groupId, { delete: { remoteJid: checkingMsg.key.remoteJid, id: checkingMsg.key.id, fromMe: true } });
                            await sock.sendMessage(groupId, { delete: { remoteJid: resultMsg.key.remoteJid, id: resultMsg.key.id, fromMe: true } });
                        }, 8000);
                    }
                }
            } catch (error) {
                console.error('❌ Erro no listener de mensagens:', error);
            }
        });

        // Configura reconexão automática do avisoadm.js
        setupClient(sock);

        return sock;

    } catch (error) {
        console.error("❌ Erro na conexão:", error.message);
        isConnecting = false;

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(connectToWhatsApp, RECONNECT_DELAY);
        }
    }
}

// Finalização limpa
process.on('SIGINT', () => { console.log(`\n🌙 ${BOT_TITLE} Bot desconectado`); process.exit(0); });
process.on('SIGTERM', () => { console.log(`\n🌙 ${BOT_TITLE} Bot finalizado`); process.exit(0); });
process.on('unhandledRejection', () => { });
process.on('uncaughtException', (error) => {
    if (error.message.includes('baileys') || error.message.includes('socket')) return;
    console.error('❌ Erro crítico:', error.message);
});

// Inicia conexão
connectToWhatsApp();