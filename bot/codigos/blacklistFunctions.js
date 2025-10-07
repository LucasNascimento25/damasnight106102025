//blacklistFunctions.js

import pool from '../../db.js';

export const BOT_TITLE = '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸';

/**
 * Normaliza números para o formato do WhatsApp
 * 🔧 CORREÇÃO: Preserva o sufixo original (@lid ou @s.whatsapp.net)
 */
export function normalizeNumber(number) {
    // Extrai o sufixo original (@lid, @s.whatsapp.net, etc)
    const suffixMatch = number.match(/@(.+)$/);
    const suffix = suffixMatch ? `@${suffixMatch[1]}` : '@s.whatsapp.net';
    
    // Remove tudo que não é dígito
    let digits = number.replace(/@.*$/, '').replace(/\D/g, '');
    
    // Adiciona 55 se for número brasileiro de 11 dígitos sem código de país
    if (digits.length === 11 && !digits.startsWith('55')) {
        digits = '55' + digits;
    }
    
    return `${digits}${suffix}`;
}

/**
 * 🔧 NOVA FUNÇÃO: Extrai apenas os dígitos normalizados
 */
export function extractDigits(number) {
    // Remove tudo que não é dígito
    let digits = number.replace(/@.*$/, '').replace(/\D/g, '');
    
    // Adiciona 55 se for número brasileiro de 11 dígitos sem código de país
    if (digits.length === 11 && !digits.startsWith('55')) {
        digits = '55' + digits;
    }
    
    return digits;
}

export function adminOnlyMessage() {
    return `${BOT_TITLE} 🚫 Este comando só pode ser usado por administradores!`;
}

/**
 * Verifica em tempo real se o número está na blacklist
 * 🔧 VERSÃO COM DEBUG INTENSIVO
 */
export async function isBlacklistedRealtime(number) {
    try {
        console.log('\n🔍 ========= isBlacklistedRealtime =========');
        console.log('📥 Número recebido:', number);
        
        // Extrai apenas os dígitos do número
        const digits = extractDigits(number);
        console.log('🔢 Dígitos extraídos:', digits);
        
        // Busca na blacklist (agora comparando direto com whatsapp_id que só tem dígitos)
        console.log('🔍 Executando query no banco...');
        const query = 'SELECT whatsapp_id FROM blacklist WHERE whatsapp_id = $1';
        console.log('📝 Query:', query);
        console.log('📝 Parâmetro:', [digits]);
        
        const result = await pool.query(query, [digits]);
        
        console.log('📊 Resultado da query:');
        console.log('   - Rows encontradas:', result.rowCount);
        console.log('   - Dados:', JSON.stringify(result.rows, null, 2));
        
        const isBlocked = result.rowCount > 0;
        console.log('🎯 ESTÁ BLOQUEADO?', isBlocked);
        console.log('==========================================\n');
        
        return isBlocked;
        
    } catch (err) {
        console.error('❌ ========= ERRO em isBlacklistedRealtime =========');
        console.error('❌ Erro:', err.message);
        console.error('❌ Stack:', err.stack);
        console.error('===================================================\n');
        return false;
    }
}

/**
 * Adiciona número à blacklist
 * 🔧 SALVA APENAS OS DÍGITOS, SEM SUFIXO
 */
export async function addToBlacklist(whatsappId, motivo = null) {
    try {
        const digits = extractDigits(whatsappId);
        
        console.log('🔍 DEBUG ADD - Número recebido:', whatsappId);
        console.log('🔍 DEBUG ADD - Dígitos salvos:', digits);
        console.log('🔍 DEBUG ADD - Motivo:', motivo);
        
        const alreadyBlocked = await isBlacklistedRealtime(digits);
        if (alreadyBlocked) return `${BOT_TITLE} ⚠️ *número* ${digits} * está na blacklist.*`;

        await pool.query('INSERT INTO blacklist (whatsapp_id, motivo) VALUES ($1, $2)', [digits, motivo]);
        
        console.log('✅ DEBUG ADD - número adicionado com sucesso:', digits);
        
        return `${BOT_TITLE} ✅ *número* ${digits} *adicionado à blacklist.*`;
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao adicionar ${whatsappId}:`, err);
        return `${BOT_TITLE} ❌ Erro ao adicionar ${whatsappId} à blacklist.`;
    }
}

/**
 * Remove número da blacklist
 * 🔧 REMOVE USANDO APENAS OS DÍGITOS
 */
export async function removeFromBlacklist(whatsappId) {
    try {
        const digits = extractDigits(whatsappId);
        
        console.log('🔍 DEBUG REM - Número recebido:', whatsappId);
        console.log('🔍 DEBUG REM - Dígitos extraídos:', digits);
        
        const result = await pool.query(
            'DELETE FROM blacklist WHERE whatsapp_id = $1',
            [digits]
        );

        console.log('🔍 DEBUG REM - Linhas afetadas:', result.rowCount);

        if (result.rowCount > 0) return `${BOT_TITLE} 🟢 *número* ${digits} *removido da blacklist* 🔓`;
        return `${BOT_TITLE} ⚠️ *número* ${digits} *não está na blacklist.*`;
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao remover ${whatsappId}:`, err);
        return `${BOT_TITLE} ❌ Erro ao remover ${whatsappId} da blacklist.`;
    }
}

/**
 * Lista números da blacklist
 */
export async function listBlacklist() {
    try {
        const result = await pool.query('SELECT * FROM blacklist ORDER BY created_at DESC');
        
        console.log('🔍 DEBUG LISTA - Total na blacklist:', result.rows.length);
        console.log('🔍 DEBUG LISTA - Números:', result.rows.map(r => r.whatsapp_id));
        
        if (!result.rows.length) return `${BOT_TITLE} 📋 A blacklist está vazia.`;
        return `${BOT_TITLE}\n\n` + result.rows.map(r => `• ${r.whatsapp_id} - ${r.motivo || 'Sem motivo'}`).join('\n');
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao listar blacklist:`, err);
        return `${BOT_TITLE} ❌ Erro ao listar blacklist.`;
    }
}

/**
 * Faz varredura no grupo e remove todos da blacklist
 */
export async function scanAndRemoveBlacklisted(groupId, bot) {
    try {
        console.log(`${BOT_TITLE} 🔍 Iniciando varredura no grupo ${groupId}...`);
        
        const groupMetadata = await bot.groupMetadata(groupId);
        const participants = groupMetadata.participants.map(p => p.id);
        
        console.log(`${BOT_TITLE} 👥 Total de participantes: ${participants.length}`);
        
        const result = await pool.query('SELECT whatsapp_id FROM blacklist');
        const blacklistedNumbers = result.rows.map(r => r.whatsapp_id);
        
        console.log(`${BOT_TITLE} 🚫 Total na blacklist: ${blacklistedNumbers.length}`);
        
        const toRemove = [];
        
        // 🔥 Processa cada participante (incluindo LIDs)
        for (const participant of participants) {
            let numberToCheck = participant;
            
            // Se for LID, resolve para número real
            if (participant.includes('@lid')) {
                const participantData = groupMetadata.participants.find(p => p.id === participant);
                if (participantData?.phoneNumber) {
                    numberToCheck = participantData.phoneNumber;
                    console.log(`   🔍 LID resolvido: ${participant} → ${numberToCheck}`);
                }
            }
            
            const digits = extractDigits(numberToCheck);
            const isBlacklisted = blacklistedNumbers.includes(digits);
            
            if (isBlacklisted) {
                toRemove.push(participant); // Adiciona o ID original (LID ou número normal)
                console.log(`   🚨 Encontrado na blacklist: ${participant} (${numberToCheck})`);
            }
        }
        
        console.log(`${BOT_TITLE} 🎯 Encontrados para remover: ${toRemove.length}`);
        
        if (toRemove.length > 0) {
            for (const userId of toRemove) {
                try {
                    await bot.groupParticipantsUpdate(groupId, [userId], 'remove');
                    console.log(`${BOT_TITLE} 🚨 ${userId} foi removido do grupo ${groupId} (estava na blacklist)`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    console.error(`${BOT_TITLE} ❌ Erro ao remover ${userId}:`, err.message);
                }
            }
            
            return `${BOT_TITLE} ✅ Varredura concluída!\n🚨 ${toRemove.length} usuário(s) da blacklist foram removidos.`;
        } else {
            return `${BOT_TITLE} ✅ Varredura concluída!\n✨ Nenhum usuário da blacklist encontrado no grupo.`;
        }
        
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao fazer varredura no grupo ${groupId}:`, err);
        return `${BOT_TITLE} ❌ Erro ao fazer varredura no grupo.`;
    }
}

/**
 * Remove automaticamente usuário blacklist ao entrar no grupo
 * 🔧 VERSÃO COM DEBUG INTENSIVO + SUPORTE A LID
 */
export async function onUserJoined(userId, groupId, bot, originalId = null) {
    try {
        console.log('\n🔍 ==================== DEBUG onUserJoined ====================');
        console.log('📥 INPUT - userId:', userId);
        console.log('📥 INPUT - originalId:', originalId);
        console.log('📥 INPUT - groupId:', groupId);
        console.log('📥 INPUT - bot existe?', !!bot);
        
        const digits = extractDigits(userId);
        console.log('🔄 DÍGITOS EXTRAÍDOS:', digits);
        
        console.log('\n🔍 Chamando isBlacklistedRealtime...');
        const blocked = await isBlacklistedRealtime(digits);
        
        console.log('📊 RESULTADO DA VERIFICAÇÃO:', blocked);
        console.log('📊 Tipo do resultado:', typeof blocked);

        if (blocked) {
            console.log('\n🚨 =============== USUÁRIO ESTÁ NA BLACKLIST ===============');
            console.log('🎯 Tentando remover...');
            
            // 🔥 USA O ID ORIGINAL (LID) PARA REMOVER, NÃO O NÚMERO REAL
            const idToRemove = originalId || userId;
            console.log('   - ID para remover:', idToRemove);
            console.log('   - Group ID:', groupId);
            
            try {
                const result = await bot.groupParticipantsUpdate(groupId, [idToRemove], 'remove');
                
                console.log('✅ RESULTADO DA REMOÇÃO:', JSON.stringify(result, null, 2));
                console.log(`✅ ${idToRemove} foi REMOVIDO do grupo ${groupId} (blacklist)`);
                
            } catch (removeError) {
                console.error('❌ ERRO AO REMOVER:', removeError.message);
                console.error('❌ Stack:', removeError.stack);
            }
            
        } else {
            console.log('\n✅ =============== USUÁRIO NÃO ESTÁ NA BLACKLIST ===============');
            console.log(`✅ ${userId} pode permanecer no grupo ${groupId}`);
        }
        
        console.log('==================== FIM DEBUG onUserJoined ====================\n');
        
    } catch (err) {
        console.error(`\n❌ =============== ERRO GERAL em onUserJoined ===============`);
        console.error('❌ Erro:', err.message);
        console.error('❌ Stack:', err.stack);
        console.error('❌ userId:', userId);
        console.error('❌ groupId:', groupId);
        console.error('===============================================================\n');
    }
}

/**
 * Mensagem de ajuda da blacklist
 */
export function getBlacklistHelp() {
    return `
${BOT_TITLE} \n\n
📋 *COMANDOS DE BLACKLIST* 📋

- #addlista [número] - Adiciona número à blacklist
- #remlista [número] - Remove número da blacklist
- #verilista [número] - Verifica se número está na blacklist
- #lista - Lista todos os números da blacklist
- #varredura - Faz varredura no grupo e remove quem está na blacklist
- #infolista - Mostra este guia

💡 *Como salvar números corretamente:*
- Apenas dígitos, sem símbolos.
- Inclua o código do país (55 para Brasil). Ex: 5521979452941
- Números internacionais: inclua o código do país + número. Ex: 12125551234

🔍 *Varredura Automática:*
- O bot faz varredura automática ao entrar no grupo
- Use #varredura para fazer verificação manual a qualquer momento
`;
}