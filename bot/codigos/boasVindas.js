import Jimp from 'jimp';
import axios from 'axios';

/**
 * Gera uma thumbnail da imagem a partir de um buffer
 */
async function gerarThumbnail(buffer, size = 256) {
    try {
        const image = await Jimp.read(buffer);
        image.resize(size, size);
        return await image.getBufferAsync(Jimp.MIME_PNG);
    } catch (err) {
        console.error('Erro ao gerar thumbnail:', err);
        return null;
    }
}

/**
 * Envia imagem com thumbnail usando Baileys
 */
async function sendImageWithThumbnail(sock, jid, imageBuffer, caption, mentions = []) {
    try {
        const thumb = await gerarThumbnail(imageBuffer, 256);
        await sock.sendMessage(jid, {
            image: imageBuffer,
            caption,
            jpegThumbnail: thumb,
            mentions
        });
        console.log('✅ Imagem com thumbnail enviada com sucesso');
        return true;
    } catch (err) {
        console.error('❌ Erro ao enviar imagem com thumbnail:', err);
        await sock.sendMessage(jid, { text: caption, mentions });
        return false;
    }
}

/**
 * Envia as regras do grupo após 10 segundos
 */
async function enviarRegrasAposDelay(socket, groupId, participant) {
    setTimeout(async () => {
        try {
            console.log('⏰ Enviando regras após 10 segundos...');
            
            const participantName = participant.split('@')[0];
            const groupMetadata = await socket.groupMetadata(groupId);
            const regras = groupMetadata.desc || "Não há regras definidas na descrição do grupo.";
            
            const mensagem = `📋 *REGRAS DO GRUPO* 📋\n\n@${participantName}, aqui estão as regras:\n\n${regras}\n\n⚠️ *Por favor, leia com atenção e siga todas as orientações!*`;
            
            await socket.sendMessage(groupId, {
                text: mensagem,
                mentions: [participant]
            });
            
            console.log('✅ Regras enviadas com sucesso para', participantName);
            
        } catch (error) {
            console.error('❌ Erro ao enviar regras:', error.message);
            
            // Tentativa de fallback caso haja erro
            try {
                await socket.sendMessage(groupId, {
                    text: `@${participant.split('@')[0]}, houve um erro ao carregar as regras. Por favor, verifique a descrição do grupo.`,
                    mentions: [participant]
                });
            } catch (fallbackError) {
                console.error('❌ Erro no fallback:', fallbackError.message);
            }
        }
    }, 10000); // 10 segundos
}

/**
 * Envia o menu de entretenimento após 20 segundos
 */
async function enviarMenuEntretenimento(socket, groupId, participant) {
    setTimeout(async () => {
        try {
            console.log('⏰ Enviando menu de entretenimento após 20 segundos...');
            
            const participantName = participant.split('@')[0];
            
            const menuMessage = `🌟✨━━━━━━━━━━━━━━━━━━✨🌟
👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸
🎪 *NOVO MENU DE ENTRETENIMENTO* 🎪
🔥 Comandos exclusivos liberados! 🔥
━━━━━━━━━━━━━━━━━━━━━━━
📱 *DIGITE NO GRUPO:*
   ➤ #menudamas
━━━━━━━━━━━━━━━━━━━━━━━
📋 *COMANDOS DISPONÍVEIS:*
🔮 #signos - Lista todos os signos
🌟 #horoscopo - Horóscopo do dia
🌶️ #contos - Contos picantes
🔞 #hqs - HQs adultos
🎵 #damas music - Buscar músicas
━━━━━━━━━━━━━━━━━━━━━━━
✨ *Diversão garantida!* ✨
💃 *Aproveite e compartilhe!* 🍾
© *Damas da Night*
🌟✨━━━━━━━━━━━━━━━━━━✨🌟

@${participantName}, explore todos os comandos! 🎉`;
            
            await socket.sendMessage(groupId, {
                text: menuMessage,
                mentions: [participant]
            });
            
            console.log('✅ Menu de entretenimento enviado com sucesso para', participantName);
            
        } catch (error) {
            console.error('❌ Erro ao enviar menu de entretenimento:', error.message);
            
            // Tentativa de fallback caso haja erro
            try {
                await socket.sendMessage(groupId, {
                    text: `@${participant.split('@')[0]}, digite #menudamas para ver todos os comandos disponíveis! 🎉`,
                    mentions: [participant]
                });
            } catch (fallbackError) {
                console.error('❌ Erro no fallback do menu:', fallbackError.message);
            }
        }
    }, 20000); // 20 segundos
}

/**
 * Configura mensagens de boas-vindas
 */
export const configurarBoasVindas = async (socket, groupId, participant) => {
    try {
        console.log('🎉 Iniciando boas-vindas para:', participant);
        
        const participantName = participant.split('@')[0];

        // Obtendo foto de perfil
        let profilePictureUrl;
        try {
            profilePictureUrl = await socket.profilePictureUrl(participant, 'image');
            console.log('✅ Foto de perfil obtida');
        } catch (error) {
            console.log('⚠️ Usando foto padrão');
            profilePictureUrl = 'https://images2.imgbox.com/a5/a4/gyGTUylB_o.png';
        }

        // Mensagens de boas-vindas
        const welcomeMessages = [
            
        `🎉💃 *BEM-VINDO(A) ao grupo* 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\n@${participantName} ✨🎉\n\nAqui é um espaço de interação e diversão 24 horas! 🕛🔥\n\nParticipe das conversas e aproveite bons momentos com a gente! 💃🎶🍾🍸\n\n⏰ *Aguarde 10 segundos que enviarei as regras do grupo!*`,

        `💃👏 *OBA! TEMOS NOVIDADES!* 🎊✨\n\n*SEJA MUITO BEM-VINDO(A) AO GRUPO* 🌟💬\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\n@${participantName}, sua presença já deixou tudo mais animado! 🙌🎉\n\n🎈 Aqui é o espaço perfeito pra se divertir e trocar ideias incríveis, 24/7! 💬🔥\n\n⏰ *Em 10 segundos você receberá as regras!*`,

        `💃👏 *SENSACIONAL!* ✨\n*MAIS UMA PESSOA ANIMADA NO GRUPO!* 🎉🔥\n\n*OLÁ*, @${participantName} 🌟💃\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸 está em festa com sua chegada! 🙌💥\n\n🎈 Aqui a diversão rola solta e a troca de ideias não para, 24/7! 💬✨\n\nSinta-se à vontade para interagir e brilhar com a galera! 🌟🥳\n\n⏰ *Aguarde as regras em 10 segundos!*`,

        `💃💥 *ESTOUROU!* 🎇\n*NOSSO GRUPO GANHOU MAIS UM MEMBRO SUPER ESTILO(A)!* 🔥✨\n\n🥳 *SEJA MUITO BEM-VINDO(A)* @${participantName} 🌟🎶\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸 está com tudo agora com você por aqui! 💬✨\n\n🚀 Aqui o clima é de energia positiva e muita conexão!\n\nNão economize nos emojis e nem nas risadas! 😂\n\n⏰ *Logo mais envio as regras do grupo!*`,
            
        `💃🎶🔥 *BEM-VINDO(A) ao grupo* 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\n@${participantName} 💃🍾\n\nVocê acaba de aterrissar no grupo mais animado de todos! 💃🎶🍾🍸\n\nO clima aqui é pura festa, diversão e muita interação 24h por dia! 🕛🔥\n\nVamos agitar as conversas e aproveitar cada segundo com muita alegria! 💬🎶🍾🍸\n\n⏰ *Regras chegando em 10 segundos!*`,

        `💃🎊🌟 *PREPARA QUE A DIVERSÃO COMEÇOU* @${participantName} 🎉\n\nAgora a vibe é só alegria, dança e muita energia boa no\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nA festa agora tá completa com você por aqui!\n\nO clima é de pura energia 24h por dia! 🕛🔥\n\nVamos agitar, dançar e se divertir até não aguentar mais! 💬🎶🍾🍸\n\n⏰ *Aguarde 10 segundos para receber as regras!*`,

        `💃🍾🍸 *BEM-VINDO(A) ao grupo* 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\n@${participantName}\n\n*Agora a energia do grupo subiu!* 🚀\n\nAqui, a diversão não tem hora pra começar e nem pra terminar!\n\n*24h de pura interação e boas vibrações!* 🕛🔥\n\nPrepare-se para momentos épicos com muitos emojis, risadas e danças até o amanhecer! 💃🎶🍾🍸\n\n⏰ *Em breve enviarei as regras!*`,

        `🎉👏💃 *BEM-VINDO(A)* @${participantName}\n*ao grupo* 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAgora o grupo está ainda mais poderoso!\n\n🚀💃 Prepare-se para uma onda de diversão, risadas e muita dança! 🎶🔥\n\nAqui, a diversão nunca para!\n\nEmojis, vibrações positivas e muita interação o tempo todo! 🕛🎉\n\n⏰ *Regras a caminho em 10 segundos!*`,

        `👏💃🔥 *BEM-VINDO(A)* @${participantName}\n*ao grupo* 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAgora o clima do grupo está ON FIRE! 🔥\n\nVamos criar momentos inesquecíveis com muitas risadas, emojis e danças! 🎶💥\n\n*Aqui, a diversão é garantida 24h por dia! Não tem hora pra parar!* 💃🕛🍸🍾\n\n⏰ *Aguarde as regras do grupo!*`,

        `🎉💥 *BEM-VINDO(A)* @${participantName}\n*ao grupo* 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nA vibe do grupo acaba de subir ainda mais com você aqui! 🚀🎶\n\nPrepare-se para curtir uma energia contagiante, com risadas, dança e emojis 24h por dia! 💃🎉🔥\n\nAqui, a diversão nunca tem fim!\n\nVamos agitar, rir e viver os melhores momentos juntos! 🎊🍾🕛\n\n⏰ *Em 10 segundos receba as regras!*`,
             `🎊✨ *CHEGOU MAIS UM(A) ESTRELA!* 🌟💃\n\n@${participantName}, você acabou de entrar no melhor grupo da galáxia!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui a vibe é sempre alta e a diversão não para nunca! 🚀🔥\n\nPreparado(a) para muita interação e momentos incríveis? 💬✨\n\n⏰ *As regras chegarão em 10 segundos!*`,

        `💃🎉 *QUE ENTRADA TRIUNFAL!* 👑✨\n\n*SEJA BEM-VINDO(A)* @${participantName} ao paraíso da diversão!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai encontrar pessoas incríveis e muita alegria! 🎊💥\n\n*A festa começa agora com você!* 24/7 de pura energia! 🕛🔥\n\n⏰ *Aguarde 10 segundos para as regras!*`,

        `🔥💥 *EXPLOSÃO DE ALEGRIA!* 🎆🎉\n\n@${participantName}, o grupo estava esperando por você!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAgora sim a festa está completa! 💃🍾\n\nPreparado(a) para curtir sem parar? A diversão aqui é 24h! 🕛✨\n\n⏰ *Regras a caminho!*`,

        `🎶💃 *A PISTA ESTÁ CHAMANDO!* 🔥🍸\n\n*BEM-VINDO(A)* @${participantName} ao grupo mais animado do momento!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui é só alegria, música e muita conexão! 🎊💬\n\nVamos dançar, rir e aproveitar cada segundo juntos! 🙌🔥\n\n⏰ *Em 10 segundos você recebe as regras!*`,

        `✨🎊 *CHEGOU O(A) MAIS NOVO(A) INTEGRANTE!* 💃🔥\n\n@${participantName}, seja muito bem-vindo(a)!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nO clima aqui é de pura vibração positiva 24/7! 🌟💥\n\nVamos criar momentos inesquecíveis com muito estilo! 💬🍾\n\n⏰ *Regras chegando em breve!*`,

        `🍾🎉 *BRINDE À NOVA CHEGADA!* 🥂✨\n\n*OLÁ* @${participantName}! Você acaba de entrar na melhor vibe!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui é festa constante, risadas garantidas e diversão sem fim! 🎊🔥\n\nSinta-se em casa e aproveite cada momento! 💃🎶\n\n⏰ *Aguarde as regras em 10 segundos!*`,

        `💥🌟 *UAUUU! QUE CHEGADA!* 🎉💃\n\n@${participantName}, o grupo ganhou mais brilho com você!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para uma experiência única de diversão? 🚀✨\n\nAqui a energia é contagiante 24h por dia! 🕛🔥\n\n⏰ *Regras a caminho!*`,

        `🎶🔥 *O GRUPO ACABA DE FICAR MAIS TOP!* 💃🎊\n\n*SEJA BEM-VINDO(A)* @${participantName}!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai encontrar gente incrível e muita animação! 🌟💥\n\nVamos curtir, dançar e interagir sem parar! 💬🍾\n\n⏰ *Em 10 segundos envio as regras!*`,

        `💃🎉 *MAIS UM(A) PARA AGITAR A FESTA!* 🔥✨\n\n@${participantName}, sua entrada já deixou tudo mais animado!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para viver momentos épicos? 🚀🎊\n\nAqui a diversão é garantida 24/7! 🕛💥\n\n⏰ *Aguarde as regras!*`,

        `🌟💥 *EBAAA! CHEGOU MAIS UM(A)!* 🎉💃\n\n*BEM-VINDO(A)* @${participantName} ao grupo da alegria!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai encontrar muita diversão e energia boa! ✨🔥\n\nVamos criar memórias incríveis juntos! 💬🍾\n\n⏰ *Regras em 10 segundos!*`,

        `🔥🎊 *A FESTA FICOU COMPLETA AGORA!* 💃🌟\n\n@${participantName}, que entrada espetacular!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para curtir sem limites? 🚀✨\n\nAqui a vibe é sempre alta, 24h por dia! 🕛🔥\n\n⏰ *Aguarde as regras do grupo!*`,

        `🎉💃 *CHEGOU QUEM FALTAVA!* ✨🔥\n\n*OLÁ* @${participantName}! Seja muito bem-vindo(a)!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui é o espaço perfeito para se divertir e fazer amigos! 🌟💥\n\nVamos agitar juntos com muita energia! 💬🍾\n\n⏰ *Em breve as regras!*`,

        `💥🍾 *QUE ALEGRIA TER VOCÊ AQUI!* 🎉💃\n\n@${participantName}, o grupo estava esperando por você!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para momentos inesquecíveis? 🚀✨\n\nA diversão aqui não tem hora para acabar! 🕛🔥\n\n⏰ *Regras chegando em 10 segundos!*`,

        `🌟🎶 *SHOW DE ENTRADA!* 💃🔥\n\n*BEM-VINDO(A)* @${participantName} ao melhor grupo!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai encontrar muita alegria e interação! 🎊💥\n\nVamos curtir cada segundo com muito estilo! 💬✨\n\n⏰ *Aguarde 10 segundos para as regras!*`,

        `🔥💃 *MAIS UM(A) ESTRELA NO GRUPO!* ⭐🎉\n\n@${participantName}, sua presença já iluminou tudo!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para muita diversão e risadas? 😂🔥\n\nAqui a energia é contagiante 24/7! 🕛✨\n\n⏰ *Regras a caminho!*`,

        `🎊✨ *CHEGOU A HORA DE CELEBRAR!* 💃🔥\n\n*OLÁ* @${participantName}! Seja bem-vindo(a) à festa!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui é só alegria, música e muita conexão! 🌟💥\n\nVamos criar momentos incríveis juntos! 💬🍾\n\n⏰ *Em 10 segundos as regras!*`,

        `💥🎉 *O GRUPO GANHOU MAIS PODER!* 🔥💃\n\n@${participantName}, que entrada sensacional!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para curtir sem parar? 🚀✨\n\nA diversão aqui é garantida 24h! 🕛🔥\n\n⏰ *Aguarde as regras!*`,

        `🍾💃 *VIBRAÇÕES POSITIVAS CHEGANDO!* ✨🎊\n\n*BEM-VINDO(A)* @${participantName} ao grupo da alegria!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai encontrar gente incrível e muita animação! 🌟💥\n\nVamos agitar e aproveitar cada momento! 💬🔥\n\n⏰ *Regras em 10 segundos!*`,

        `🔥🌟 *ADRENALINA PURA CHEGOU!* 💃🎉\n\n@${participantName}, o grupo ficou ainda melhor com você!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para momentos épicos? 🚀✨\n\nAqui a diversão nunca para, 24/7! 🕛💥\n\n⏰ *Aguarde as regras!*`,

        `🎉💥 *MAIS ENERGIA PARA O GRUPO!* 🔥💃\n\n*OLÁ* @${participantName}! Seja muito bem-vindo(a)!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui é o lugar perfeito para se divertir! 🎊✨\n\nVamos criar memórias inesquecíveis juntos! 💬🍾\n\n⏰ *Em breve as regras!*`,

        `💃🎶 *A PISTA ESTÁ LOTADA AGORA!* 🔥🎉\n\n@${participantName}, que alegria ter você aqui!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para curtir muito? 🚀✨\n\nA diversão aqui é constante, 24h! 🕛🔥\n\n⏰ *Regras chegando em 10 segundos!*`,

        `✨🔥 *MAIS UM(A) PARA BRILHAR!* 🌟💃\n\n*BEM-VINDO(A)* @${participantName} ao grupo mais top!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai encontrar muita alegria! 🎊💥\n\nVamos agitar com muito estilo e energia! 💬🍾\n\n⏰ *Aguarde as regras!*`,

        `🔥🎊 *CHEGOU MAIS UM(A) ANIMADO(A)!* 💃✨\n\n@${participantName}, sua entrada deixou tudo mais legal!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para viver experiências únicas? 🚀🔥\n\nAqui a vibe é sempre alta, 24/7! 🕛💥\n\n⏰ *Em 10 segundos as regras!*`,

        `🎉💃 *O GRUPO ESTÁ EM FESTA!* 🔥🌟\n\n*OLÁ* @${participantName}! Que bom ter você conosco!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui é só alegria e diversão garantida! 🎊✨\n\nVamos curtir cada momento juntos! 💬🍾\n\n⏰ *Regras a caminho!*`,

        `💥🍾 *SENSACIONAL! MAIS UM(A) MEMBRO!* 💃🔥\n\n@${participantName}, o grupo ganhou mais estilo!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para muita interação? 🚀✨\n\nA diversão aqui não tem limites, 24h! 🕛🔥\n\n⏰ *Aguarde as regras em 10 segundos!*`,

        `🌟🎶 *CHEGOU QUEM ESTAVA FALTANDO!* 💃🎉\n\n*BEM-VINDO(A)* @${participantName} à melhor vibe!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai encontrar muita energia boa! 🔥💥\n\nVamos criar momentos incríveis com muito estilo! 💬✨\n\n⏰ *Regras em breve!*`,

        `🔥💃 *EXPLOSION OF JOY!* 🎊✨\n\n@${participantName}, sua chegada deixou tudo mais animado!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para curtir sem parar? 🚀🔥\n\nAqui a festa é constante, 24/7! 🕛💥\n\n⏰ *Aguarde 10 segundos para as regras!*`,

        `🎉🍾 *MAIS ALEGRIA PARA O GRUPO!* 💃🌟\n\n*OLÁ* @${participantName}! Seja muito bem-vindo(a)!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui é o lugar perfeito para se divertir! 🎊✨\n\nVamos agitar e aproveitar juntos! 💬🔥\n\n⏰ *Regras a caminho!*`,

        `💥💃 *O GRUPO ESTÁ MAIS POTENTE!* 🔥🎉\n\n@${participantName}, que entrada incrível!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nPreparado(a) para momentos inesquecíveis? 🚀✨\n\nA diversão aqui é garantida 24h! 🕛💥\n\n⏰ *Em 10 segundos as regras!*`,

        `✨🎊 *CHEGOU A HORA DE COMEMORAR!* 💃🔥\n\n*BEM-VINDO(A)* @${participantName} ao grupo da festa!\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸\n\nAqui você vai viver os melhores momentos! 🌟💥\n\nVamos curtir com muita energia e estilo! 💬🍾\n\n⏰ *Aguarde as regras do grupo!*`

    ];

        const selectedMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

        // Enviando mensagem de boas-vindas
        if (profilePictureUrl) {
            try {
                const res = await axios.get(profilePictureUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 10000 // timeout de 10 segundos
                });
                const buffer = Buffer.from(res.data, 'binary');
                await sendImageWithThumbnail(socket, groupId, buffer, selectedMessage, [participant]);
            } catch (err) {
                console.error('⚠️ Erro ao baixar imagem, enviando mensagem de texto:', err.message);
                await socket.sendMessage(groupId, { text: selectedMessage, mentions: [participant] });
            }
        } else {
            await socket.sendMessage(groupId, { text: selectedMessage, mentions: [participant] });
        }

        console.log('✅ Boas-vindas enviadas com sucesso');

        // Programar envio das regras após 10 segundos
        enviarRegrasAposDelay(socket, groupId, participant);
        console.log('⏰ Regras agendadas para envio em 10 segundos');

        // Programar envio do menu de entretenimento após 20 segundos
        enviarMenuEntretenimento(socket, groupId, participant);
        console.log('⏰ Menu de entretenimento agendado para envio em 20 segundos');

    } catch (error) {
        console.error('❌ Erro ao enviar boas-vindas:', error.message, error.stack);
        
        // Fallback: tentar enviar pelo menos uma mensagem básica
        try {
            await socket.sendMessage(groupId, {
                text: `Bem-vindo(a) @${participant.split('@')[0]} ao grupo! 🎉`,
                mentions: [participant]
            });
        } catch (fallbackError) {
            console.error('❌ Erro crítico no fallback:', fallbackError.message);
        }
    }
};