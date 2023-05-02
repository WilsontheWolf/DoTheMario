import { logger } from './logger.js';

export default (client) => {
    client.loadCommand = async (cmd) => {
        try {
            let name = cmd.split('.');
            if (name.length !== 1) name.pop();
            name = name.join('.');
            logger.info(`Loading command ${name}...`);
            const c = await (await import(`../commands/${cmd}`)).cmd;
            client.commands.set(c.name, c);
        } catch (e) {
            logger.error(`Error loading command ${cmd}:`);
            logger.error(e);
            return e;
        }
    };
    client.loadSlashCommand = async (cmd) => {
        try {
            let name = cmd.split('.');
            if (name.length !== 1) name.pop();
            name = name.join('.');
            logger.info(`Loading slash command ${name}...`);
            const c = await(await import(`../slash/${cmd}`)).cmd;
            client.slashCommands.set(c.name, c);
        } catch (e) {
            logger.error(`Error loading slash command ${cmd}:`);
            logger.error(e);
            return e;
        }
    };
    client.play = async (channel) => {
        try {
            if (!channel || !channel.guild || !client.canSpeakVC(channel) || client.voiceConnections.has(channel.guild.id))
                return;
            const connection = await channel.join({ selfDeaf: true });
            // Stage Channels
            if (channel.type === 13) {
                try {
                    const perms = channel.permissionsOf(client.user.id);
                    if (perms.has('voiceMuteMembers') || perms.has('administrator'))
                        await channel.guild.editVoiceState({ suppress: false });
                    else if (perms.has('voiceRequestToSpeak'))
                        await channel.guild.editVoiceState({ requestToSpeakTimestamp: new Date().toISOString() });
                } catch (e) {
                    logger.error('Error attempting to escalate stage channel permissions.\n', e);
                }
            }
            connection.play('./song/song.ogg');
            client.updateData?.({
                type: 'count'
            });
            connection.on('end', async () => {
                try {
                    await channel.leave();
                } catch (e) {
                    logger.warn('error leaving after doing the song\n', e);
                }
            });
        } catch (e) {
            logger.error('error doing the song');
            logger.error(e);
        }
    };
    client.canJoinVC = (channel) => {
        if (client.user.id === channel.guild.ownerID) return true;
        const permissions = channel.permissionsOf(client.user.id);
        if (!permissions) return false;
        if (permissions.has('administrator')) return true;
        if (!permissions.has('viewChannel')) return false;
        if (!permissions.has('voiceConnect')) return false;
        if (!channel.userLimit) return true;
        if (channel.userLimit <= channel.voiceMembers.size && !permissions.has('voiceMoveMembers')) return false;
        return true;
    };

    client.canSpeakVC = (channel) => {
        if (!client.canJoinVC(channel)) return false;
        if (client.user.id === channel.guild.ownerID) return true;
        // No perms for stage channels
        if (channel.type === 13) return true;
        const permissions = channel.permissionsOf(client.user.id);
        if (!permissions) return false;
        if (permissions.has('administrator')) return true;
        if (!permissions.has('voiceSpeak')) return false;
        return true;
    };

    client.slashValidate = async () => {
        const commands = await client.getCommands();
        client.slashCommands.forEach(cmd => {
            let origIndex = commands.findIndex(c => c.name === cmd.name);
            if (origIndex !== -1) {
                commands[origIndex].description = cmd.desc;
                commands[origIndex].options = cmd.options;
            } else
                commands.push({
                    name: cmd.name,
                    description: cmd.desc,
                    options: cmd.options
                });
        });
        await client.bulkEditCommands(commands);
    };
};
