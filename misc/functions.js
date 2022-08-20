const fetch = require('node-fetch');

module.exports = (client) => {
    client.loadCommand = (cmd) => {
        try {
            let name = cmd.split('.');
            if (name.length !== 1) name.pop();
            name = name.join('.');
            console.info(`Loading command ${name}...`);
            const c = require(`../commands/${cmd}`);
            client.commands.set(c.name, c);
        } catch (e) {
            console.error(`Error loading command ${cmd}:`);
            console.error(e);
            return e;
        }
    };
    client.loadSlashCommand = (cmd) => {
        try {
            let name = cmd.split('.');
            if (name.length !== 1) name.pop();
            name = name.join('.');
            console.info(`Loading slash command ${name}...`);
            const c = require(`../slash/${cmd}`);
            client.slashCommands.set(c.name, c);
        } catch (e) {
            console.error(`Error loading slash command ${cmd}:`);
            console.error(e);
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
                    console.error('Error attempting to escalate stage channel permissions.\n', e);
                }
            }
            connection.play('./song.ogg');
            await client.db.inc('count');
            connection.on('end', async () => {
                try {
                    await channel.leave();
                } catch (e) {
                    console.warn('error leaving after doing the song\n', e);
                }
            });
        } catch (e) {
            console.error('error doing the song');
            console.error(e);
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
