const Eris = require('eris');
const config = require('./config');
const fs = require('fs/promises');
const Josh = require('@joshdb/core');
const provider = require('@joshdb/sqlite');
const botLists = require('./misc/botLists');
const webServer = require('./misc/webServer');

const client = new Eris(config.token, {
    intents: ['guildMessages', 'guildVoiceStates', 'guilds'],
    maxShards: 'auto',
    restMode: true,
    messageLimit: 1
});
client.config = config;
client.commands = new Map();
client.slashCommands = new Map();
client.db = new Josh({
    name: 'db',
    provider
});
require('./misc/functions')(client);

client.on('ready', async () => {
    client.editStatus('online', {
        name: client.config.name || 'music',
        type: 2
    });
    console.log(`Logged in as ${client.user.username}#${client.user.discriminator}!`);
    console.log(`I'm in ${client.guilds.size} servers.`);
    client.db.ensure('count', 0);
    console.log('Ensuring slash commands');

    let res = await client.slashValidate();
    if(res) console.error(res);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.author.id === client.user.id) return;
    if (!message.guildID) return;
    if (!message.member) return;
    const guild = message.member.guild;
    const prefixMention = new RegExp(`^<@!?${client.user.id}>$`);

    // A user just pinged me. Attempt to join their voice channel.
    if (message.content.match(prefixMention))
        return client.play(guild.channels.get(message.member.voiceState.channelID));

    // Admins only can run commands.
    if (!client.config.admins.includes(message.author.id)) return;

    // Prefix Check
    if (!message.content.startsWith(client.config.prefix)) return;

    const args = message.content
        .slice(client.config.prefix.length)
        .trim()
        .split(/ +/g);
    const command = args.shift().toLowerCase();

    const cmd = client.commands.get(command);
    if (!cmd) return;

    try {
        await cmd.run(client, message, args);
    } catch (e) {
        console.error(`Error running ${command}\n`, e);
        message.channel.createMessage('Error running command. ```\n' + e.toString() + '\n```');
    }
});

client.on('rawWS', async (packet) => {
    if (!packet || !packet.t || !packet.d) return;
    if (packet.t !== 'INTERACTION_CREATE') return;
    const data = packet.d;
    const url = `https://discord.com/api/v8/interactions/${data.id}/${data.token}/callback`;
    const reply = (content, hidden) =>
        client.slashRespond(url, content, hidden);
    // In DM
    if (!data.guild_id) return await reply(`To use this slash command you need to be in a server. You can invite me [here](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=3145728).`);
    let guild = client.guilds.get(data.guild_id);
    if (!guild) return await reply(`To use this slash command you need to invite the bot user. 
You can do so [here](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=3145728).`);
    let member = guild.members.get(data.member.user.id) || await guild.getRESTMember(data.member.user.id);
    if (!member) return await reply('I\'m sorry something went wrong.');
    let command = data.data.name;
    let options = data.data.options || [];
    const cmd = client.slashCommands.get(command);
    if (!cmd) return await reply('I\'m sorry that command was not found!');
    try {
        await cmd.run(client, {
            guild,
            member,
            options,
        }, reply);
    } catch (e) {
        console.error(`Error running slash command ${command}\n`, e);
        reply('I\'m sorry an error occurred. ```\n' + e.toString() + '\n```');
    }
});

client.on('guildCreate', () => {
    client.getChannel(client.config.loggingChannel)
        .send(`Joined a new server! Now I have ${client.guilds.size} servers!`)
        .catch(e => console.error('error logging', e));
});

client.on('guildDelete', () => {
    client.getChannel(client.config.loggingChannel)
        .send(`Left a server! Now I have ${client.guilds.size} servers!`)
        .catch(e => console.error('error logging', e));
});

client.connect().catch(e => {
    console.error('Error logging into client');
    console.error(e);
    process.exit(1);
});

(async () => {
    {
        // Load commands
        let commands = await fs.readdir('./commands');
        console.info(`Loading ${commands.length} command${commands.length !== 1 ? 's' : ''}.`);
        let done = 0;
        commands.forEach(cmd => {
            if (!cmd.endsWith('.js')) return;
            let r = client.loadCommand(cmd);
            if (!r) done++;
        });
        console.log(`Successfully loaded ${done}/${commands.length} command${commands.length !== 1 ? 's' : ''}.`);
    }
    {
        // Load slash commands
        let commands = await fs.readdir('./slash');
        console.info(`Loading ${commands.length} slash command${commands.length !== 1 ? 's' : ''}.`);
        let done = 0;
        commands.forEach(cmd => {
            if (!cmd.endsWith('.js')) return;
            let r = client.loadSlashCommand(cmd);
            if (!r) done++;
        });
        console.log(`Successfully loaded ${done}/${commands.length} slash command${commands.length !== 1 ? 's' : ''}.`);
    }
    botLists(client);
    webServer(client);
})();