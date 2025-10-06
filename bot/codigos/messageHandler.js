// messageHandler.js
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
import menuDamasHandler from './menuDamasHandler.js'; // 🆕 MENU DAMAS

// 🏷️ Instância do AutoTag
const autoTag = new AutoTagHandler();

export async function handleMessages(sock, message) {
    try {
        // 🔹 Ignora mensagens inválidas
        if (!message?.key || !message?.message) return;

        const from = message.key.remoteJid;
        const userId = message.key.participant || message.key.remoteJid;

        // 🔹 Conteúdo da mensagem
        const content =
            message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            message.message.imageMessage?.caption ||
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

        // 🔹 PRIORIDADE 0: Banimento de usuário
        if (!handled && from.endsWith('@g.us')) {
            await handleBanMessage(sock, message);
        }

        // 🔹 PRIORIDADE 1: Comandos de administração de grupo (#rlink, #fdamas, #abrir)
        if (!handled) {
            handled = await handleGroupCommands(sock, message);
        }

        // 🔹 PRIORIDADE 2: Comandos de AutoTag 
        if (!handled && from.endsWith('@g.us')) {
            handled = await autoTag.handleAdminCommands(sock, from, userId, content);
        }

        // 🔹 PRIORIDADE 3: Processar AutoTag (#all damas)
        if (!handled) {
            const tagResult = await autoTag.processMessage(sock, from, userId, content, message.key);

            if (tagResult) {
                if (tagResult.error) {
                    await sock.sendMessage(from, { text: tagResult.message });
                    return;
                }

                // 🗑️ REMOVE A MENSAGEM ORIGINAL PRIMEIRO
                console.log('🗑️ Removendo mensagem original com #all damas...');
                await autoTag.deleteOriginalMessage(sock, from, message.key);

                // 📤 DEPOIS ENVIA A NOVA MENSAGEM LIMPA
                await sock.sendMessage(from, {
                    text: tagResult.cleanMessage || ' ',
                    mentions: tagResult.mentions
                });

                console.log(`\n🏷️ ========= AUTO TAG =========`);
                console.log(`👤 Autor: ${userId}`);
                console.log(`📱 Grupo: ${tagResult.groupName}`);
                console.log(`📝 Original: ${tagResult.originalMessage}`);
                console.log(`✨ Limpa: ${tagResult.cleanMessage}`);
                console.log(`👥 Marcados: ${tagResult.tagsCount} pessoas`);
                console.log(`🕒 ${new Date().toLocaleString('pt-BR')}`);
                console.log(`=====================================\n`);

                return;
            }
        }

        // 🆕 PRIORIDADE 4: COMANDOS DE CONTOS (#contos, #ler, #aleatorio, etc)
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

        // 🆕 PRIORIDADE 5: COMANDOS DE HQS (#hqs, #hq, #pag, etc)
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

        // 🆕 PRIORIDADE 6: MENU DAMAS (#menudamas)
        if (!handled) {
            const lowerContent = content.toLowerCase().trim();
            
            if (lowerContent === '#menudamas') {
                await menuDamasHandler(sock, message, from);
                handled = true;
                console.log('📋 Menu Damas exibido');
            }
        }

        // ❌ PRIORIDADE 7: COMANDOS DE CARTOONS - DESABILITADO
        // Se quiser habilitar, descomente o import no topo e este bloco:
        /*
        if (!handled) {
            const lowerContent = content.toLowerCase().trim();
            const isCartoonCommand = lowerContent.startsWith('#cartoons') ||
                                    lowerContent.startsWith('#cartoon ') ||
                                    lowerContent.startsWith('#pagcartoon') ||
                                    lowerContent.startsWith('#proximacartoon') ||
                                    lowerContent.startsWith('#proxcartoon') ||
                                    lowerContent.startsWith('#anteriorcartoon') ||
                                    lowerContent.startsWith('#antcartoon') ||
                                    lowerContent.startsWith('#aleatoriocartoon') ||
                                    lowerContent.startsWith('#randomcartoon') ||
                                    lowerContent.startsWith('#categoriacartoon') ||
                                    lowerContent.startsWith('#atualizarcartoons') ||
                                    lowerContent.startsWith('#ajudacartoons') ||
                                    lowerContent.startsWith('#helpcartoons');

            if (isCartoonCommand) {
                handled = await handleCartoons(sock, message);
            }
        }
        */

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