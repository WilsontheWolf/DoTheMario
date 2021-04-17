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
            if (!channel || !channel.guild || !client.canJoinVC(channel) || !client.canSpeakVC(channel) || client.voiceConnections.has(channel.guild.id))
                return;
            // count.math('count', 'add', 1);
            // console.log(`The ${type} has been done ${count.get('count')} times now!`);

            const connection = await channel.join();
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
        if (!permissions.has('voiceConnect')) return false;
        if (!channel.userLimit) return true;
        if (channel.userLimit <= channel.voiceMembers.size && !permissions.has('voiceMoveMembers')) return false;
        return true;
    };

    client.canSpeakVC = (channel) => {
        if (!client.canJoinVC(channel)) return false;
        if (client.user.id === channel.guild.ownerID) return true;
        const permissions = channel.permissionsOf(client.user.id);
        if (!permissions) return false;
        if (permissions.has('administrator')) return true;
        if (!permissions.has('voiceSpeak')) return false;
        return true;
    };
    client.slashRespond = async (url, response, hidden = true) => {
        let request = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                type: 4,
                data: {
                    content: response,
                    flags: hidden ? 64 : 0
                }
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!request.ok) {
            console.error('Failed to send', request.url, request.status, await request.text(), response);
            return '';
        }
        return await request.text();
    };
    client.slashValidate = async () => {
        let commands;
        try {
            const request = await fetch(`https://discord.com/api/v8/applications/${client.user.id}/commands`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bot ${client.config.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            if (!request.ok) return `Error ${request.status} getting commands.\n${await request.text()}`;
            commands = await request.json();
        } catch (e) {
            return `Error getting commands.\n${e}`;
        }
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
        try {
            const request = await fetch(`https://discord.com/api/v8/applications/${client.user.id}/commands`,
                {
                    method: 'PUT',
                    body: JSON.stringify(commands),
                    headers: {
                        Authorization: `Bot ${client.config.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            if (!request.ok) return `Error ${request.status} updating commands.\n${await request.text()}`;
            commands = await request.json();
        } catch (e) {
            return `Error updating commands.\n${e}`;
        }
    };
};
