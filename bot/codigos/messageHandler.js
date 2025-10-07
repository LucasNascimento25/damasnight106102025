// messageHandler.js - ATUALIZADO COM SUPORTE A IMAGENS, VÍDEOS E STICKERS
import { handleBlacklistCommands } from './blacklistHandler.js';
import { handleMusicaCommands } from './musicaHandler.js';
import { handleMessage as handleAdvertencias } from './advertenciaGrupos.js';
import { handleAntiLink } from './antilink.js';
import AutoTagHandler from './autoTagHandler.js';
import { handleBanMessage } from './banHandler.js';
import { handleGroupCommands } from './redefinirFecharGrupo.js';
import pool from '../../db.js';
import { moderacaoAvancada, reabrirGrupo, statusGrupo } from './removerCaracteres.js';
import { handleHoroscopoCommand, listarSignos } from './horoscopoHandler.js';
import { handleContos } from './contosHandler.js';
import { handleHQs } from './hqseroticos.js';
import menuDamasHandler from './menuDamasHandler.js';
import { onUserJoined, scanAndRemoveBlacklisted } from './blacklistFunctions.js';
import { handleOwnerMenu } from './menuOwner.js';
import { handleStickerCommand } from './stickerAdvanced.js'; // 🆕 IMPORT DO STICKER HANDLER AVANÇADO

// 🏷️ Instância do AutoTag
const autoTag = new AutoTagHandler();

// 👑 NÚMEROS DOS DONOS DO BOT
const OWNER_NUMBERS = [
    '5521979452941',
    '5516981874405',
    '5521972337640'
];

export async function handleMessages(sock, message) {
    try {
        // 🔹 Ignora mensagens inválidas
        if (!message?.key || !message?.message) return;

        const from = message.key.remoteJid;
        const userId = message.key.participant || message.key.remoteJid;

        // 🔹 Conteúdo da mensagem - ✨ MODIFICADO: Adicionado suporte para vídeo
        const content =
            message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            message.message.imageMessage?.caption ||
            message.message.videoMessage?.caption ||
            '';

        // 🔹 Ignora mensagens vazias, do próprio bot ou do sistema
        if (!content || message.key.fromMe || userId === sock.user?.jid) return;

        console.log(`📨 Mensagem de ${userId} em ${from}: ${content}`);

        // 🔹 MODERAÇÃO AVANÇADA: Remover mensagens longas e usuários
        if (from.endsWith('@g.us')) {
            await moderacaoAvancada(sock, message);
        }

        // 🔹 Anti-link em grupos
        if (from.endsWith('@g.us')) {
            await handleAntiLink(sock, message, from);
        }

        let handled = false;

        // 👑 PRIORIDADE 0: MENU DO OWNER (comando secreto)
        if (!handled) {
            handled = await handleOwnerMenu(sock, from, userId, content, OWNER_NUMBERS);
        }

        // 🔹 PRIORIDADE 1: Banimento de usuário
        if (!handled && from.endsWith('@g.us')) {
            await handleBanMessage(sock, message);
        }

        // 🔹 PRIORIDADE 2: Comandos de administração de grupo (#rlink, #fdamas, #abrir)
        if (!handled) {
            handled = await handleGroupCommands(sock, message);
        }

        // 🔹 PRIORIDADE 3: Comandos de AutoTag 
        if (!handled && from.endsWith('@g.us')) {
            handled = await autoTag.handleAdminCommands(sock, from, userId, content);
        }

        // 🔹 PRIORIDADE 4: Processar AutoTag (#all damas) - ✨ MODIFICADO: Suporte a imagens e vídeos
        if (!handled) {
            const tagResult = await autoTag.processMessage(
                sock, 
                from, 
                userId, 
                content, 
                message.key,
                message  // ← ADICIONADO: Passa o objeto message completo
            );

            // Se o AutoTag processou a mensagem (texto, imagem ou vídeo), não faz mais nada
            if (tagResult?.processed) {
                return;
            }
        }

        // 🆕 🎨 PRIORIDADE 5: COMANDOS DE STICKER (#stickerdamas, #buscargif, #gifsticker)
        if (!handled) {
            const lowerContent = content.toLowerCase().trim();
            
            // Verifica se é algum dos comandos de sticker
            if (lowerContent.startsWith('#stickerdamas') || 
                lowerContent.startsWith('#buscargif') || 
                lowerContent.startsWith('#gifsticker')) {
                
                await handleStickerCommand(sock, message);
                handled = true;
                console.log(`🎨 Comando de sticker processado: ${lowerContent.split(' ')[0]}`);
            }
        }

        // 🆕 PRIORIDADE 6: COMANDOS DE CONTOS (#contos, #ler, #aleatorio, etc)
        if (!handled) {
            const lowerContent = content.toLowerCase().trim();
            const isContoCommand = lowerContent.startsWith('#contos') ||
                                   lowerContent.startsWith('#ler') ||
                                   lowerContent.startsWith('#aleatorio') ||
                                   lowerContent.startsWith('#random') ||
                                   lowerContent.startsWith('#categoria') ||
                                   lowerContent.startsWith('#atualizar') ||
                                   lowerContent.startsWith('#ajudacontos');

            if (isContoCommand) {
                handled = await handleContos(sock, message);
            }
        }

        // 🆕 PRIORIDADE 7: COMANDOS DE HQS (#hqs, #hq, #pag, etc)
        if (!handled) {
            const lowerContent = content.toLowerCase().trim();
            const isHQCommand = lowerContent.startsWith('#hqs') ||
                               lowerContent.startsWith('#hq ') ||
                               lowerContent.startsWith('#pag ') ||
                               lowerContent.startsWith('#proxima') ||
                               lowerContent.startsWith('#prox') ||
                               lowerContent.startsWith('#anterior') ||
                               lowerContent.startsWith('#ant') ||
                               lowerContent.startsWith('#randomhq') ||
                               lowerContent.startsWith('#categoriahq') ||
                               lowerContent.startsWith('#atualizarhqs') ||
                               lowerContent.startsWith('#ajudahqs') ||
                               lowerContent.startsWith('#helphqs');

            if (isHQCommand) {
                handled = await handleHQs(sock, message);
            }
        }

        // 🆕 PRIORIDADE 8: MENU DAMAS (#menudamas)
        if (!handled) {
            const lowerContent = content.toLowerCase().trim();
            
            if (lowerContent === '#menudamas') {
                await menuDamasHandler(sock, message, from);
                handled = true;
                console.log('📋 Menu Damas exibido');
            }
        }

        // 🔹 Comandos de blacklist (somente admins em grupo)
        if (!handled) {
            const isAdmin = from.endsWith('@g.us')
                ? (await sock.isGroupAdmin?.(from, userId)) || false
                : true;

            handled = await handleBlacklistCommands(
                sock,
                from,
                userId,
                content,
                isAdmin,
                pool
            );
        }

        // 🆕 COMANDO MANUAL DE VARREDURA (#varredura) - VERSÃO CORRIGIDA
        if (!handled && content.toLowerCase().trim() === '#varredura' && from.endsWith('@g.us')) {
            try {
                // 🔧 VERIFICAÇÃO DE ADMIN CORRIGIDA
                const groupMetadata = await sock.groupMetadata(from);
                const participant = groupMetadata.participants.find(p => p.id === userId);
                const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
                
                console.log(`🔍 DEBUG VARREDURA:`);
                console.log(`   - Usuário: ${userId}`);
                console.log(`   - É Admin? ${isAdmin}`);
                console.log(`   - Tipo: ${participant?.admin || 'member'}`);
                
                if (!isAdmin) {
                    await sock.sendMessage(from, {
                        text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸 🚫 Este comando só pode ser usado por administradores!'
                    });
                    handled = true;
                } else {
                    console.log(`🔍 Iniciando varredura manual no grupo ${from}...`);
                    const result = await scanAndRemoveBlacklisted(from, sock);
                    await sock.sendMessage(from, { text: result });
                    handled = true;
                }
            } catch (err) {
                console.error('❌ Erro ao executar #varredura:', err);
                await sock.sendMessage(from, {
                    text: '❌ Erro ao executar comando de varredura.'
                });
                handled = true;
            }
        }

        // 🔹 Comando de horóscopo (#horoscopo, #signos)
        if (!handled) {
            const lowerContent = content.toLowerCase();
            
            // Comando #signos - Lista todos os signos
            if (lowerContent.startsWith('#signos')) {
                await sock.sendMessage(from, {
                    text: listarSignos()
                });
                handled = true;
            }
            
            // Comando #horoscopo [signo] [período]
            else if (lowerContent.startsWith('#horoscopo') || lowerContent.startsWith('#horóscopo')) {
                const args = content.trim().split(/\s+/);
                args.shift(); // Remove o comando
                
                await handleHoroscopoCommand(sock, message, args);
                handled = true;
            }
        }

        // 🔹 Comando de música
        if (!handled) handled = await handleMusicaCommands(sock, message, from);
        if (!handled) await handleAdvertencias(sock, message, pool);

        // 🔹 Comando para checar status do grupo (#status)
        if (!handled && content.toLowerCase().startsWith('#status') && from.endsWith('@g.us')) {
            await statusGrupo(sock, from);
            handled = true;
        }

        // 🔹 Comando inválido #da
        if (!handled && content.toLowerCase().startsWith('#da')) {
            await sock.sendMessage(from, {
                text: '❌ Comando inválido.\n✅ Exemplo: #damas music [nome da música]'
            });
        }

    } catch (err) {
        console.error('❌ Erro ao processar mensagem:', err);
    }
}

// 🏷️ Função para atualizar grupo automaticamente (usado no evento group-participants.update)
export async function updateGroupOnJoin(sock, groupId) {
    try {
        const count = await autoTag.updateGroup(sock, groupId);
        console.log(`✅ Grupo ${groupId} atualizado automaticamente: ${count} membros`);
    } catch (error) {
        console.error('❌ Erro ao atualizar grupo:', error);
    }
}

// 🆕 🚨 VERIFICAÇÃO DE BLACKLIST QUANDO ALGUÉM ENTRA NO GRUPO
export async function handleGroupParticipantsUpdate(sock, update) {
    try {
        const { id: groupId, participants, action } = update;

        console.log(`\n👥 ========= EVENTO DE GRUPO =========`);
        console.log(`📱 Grupo: ${groupId}`);
        console.log(`🎬 Ação: ${action}`);
        console.log(`👤 Participantes: ${participants.join(', ')}`);
        console.log(`=====================================\n`);

        // 🤖 QUANDO O BOT ENTRA NO GRUPO - FAZ VARREDURA AUTOMÁTICA
        if (action === 'add' && participants.includes(sock.user?.id)) {
            console.log('🤖 Bot foi adicionado ao grupo! Iniciando varredura automática...');
            await scanAndRemoveBlacklisted(groupId, sock);
        }

        // 👤 QUANDO ALGUÉM ENTRA NO GRUPO - VERIFICA SE ESTÁ NA BLACKLIST
        if (action === 'add') {
            for (const userId of participants) {
                // Pula se for o próprio bot
                if (userId === sock.user?.id) continue;
                
                console.log(`🔍 Verificando ${userId} na blacklist...`);
                
                // Chama a função de verificação e remoção automática
                await onUserJoined(userId, groupId, sock);
            }

            // Também atualiza o grupo para AutoTag
            await updateGroupOnJoin(sock, groupId);
        }

    } catch (err) {
        console.error('❌ Erro ao processar atualização de participantes:', err);
    }
}