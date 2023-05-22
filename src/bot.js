import { Client } from '@projectdysnomia/dysnomia';
import { handleToken } from './misc/token.js';
import config from './config.js';
import fs from 'node:fs/promises';
import functions from './misc/functions.js';
import { logger } from './misc/logger.js';

/**
 * @param {import('@projectdysnomia/dysnomia').ClientOptions} options 
 * @param {function?} ready 
 * @param {function?} updateData 
 * @returns 
 */
const createClient = async (options, ready, updateData) => {
    const token = handleToken(options.token);

    if (!token) throw new Error('No token provided.');

    const client = new Client(token, {
        intents: ['guildMessages', 'guildVoiceStates', 'guilds'],
        restMode: true,
        messageLimit: 1,
        ...options,
    });
    client.config = config;
    client.commands = new Map();
    client.slashCommands = new Map();
    client.updateData = updateData;

    functions(client);

    client.once('ready', async () => {
        client.editStatus('online', {
            name: client.config.name || 'music',
            type: 2
        });
        logger.log(`Logged in as ${client.user.username}#${client.user.discriminator}!`);
        logger.log(`I'm in ${client.guilds.size} servers.`);

        ready?.(client);
        
        if(options.isSharded && !options.isMainChild) return;

        logger.log('Ensuring slash commands');
        let res = await client.slashValidate();
        if (res) logger.error(res);
    });

    client.on('shardDisconnect', (err, id) => {
        logger.warn(`Shard ${id} disconnected!`);
        if (err)
            logger.warn(err);
    });

    client.on('shardResume', (id) => {
        logger.log(`Shard ${id} resumed!`);
    });

    client.on('shardReady', (id) => {
        logger.log(`shard ${id} ready`);
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.author.id === client.user.id) return;
        if (!message.guildID) return;
        if (!message.member) return;
        const guild = message.member.guild;
        const fullMention = new RegExp(`^<@!?${client.user.id}>$`);
        const prefixMention = new RegExp(`^<@!?${client.user.id}>\\s+`);

        // A user just pinged me. Attempt to join their voice channel.
        if (message.content.match(fullMention))
            return client.play(guild.channels.get(message.member.voiceState.channelID));

        // Admins only can run commands.
        if (!client.config.admins.includes(message.author.id)) return;

        let content;
        // Prefix Check
        if (message.content.startsWith(client.config.prefix)) {
            content = message.content
                .slice(client.config.prefix.length)
                .trim();
        }
        else if (prefixMention.test(message.content)) {
            const match = message.content.match(prefixMention);
            content = message.content
                .slice(match[0].length)
                .trim();
        }
        if (!content) return;

        const args = content
            .split(' ');
        const command = args.shift().toLowerCase();

        const cmd = client.commands.get(command);
        if (!cmd) return;

        try {
            await cmd.run(client, message, args);
        } catch (e) {
            logger.error(`Error running ${command}\n`, e);
            message.channel.createMessage('Error running command. ```\n' + e.toString() + '\n```');
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.guildID) return await interaction.createMessage({
            content: `To use slash commands you need to invite the bot user. 
You can do so [here](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=3145728).`, flags: 64
        });
        if (!interaction.member) {
            logger.error('No member found for interaction. Please fix me!!!!');
            return await interaction.createMessage({ content: 'I\'m sorry something went wrong.', flags: 64 });
        }
        const command = interaction.data.name;
        if (!command) {
            logger.error('No command found for interaction. Please fix me!!!!');
            return await interaction.createMessage({ content: 'I\'m sorry something went wrong.', flags: 64 });
        }
        const cmd = client.slashCommands.get(command);
        if (!cmd) return await interaction.createMessage({ content: 'I\'m sorry that command was not found!', flags: 64 });
        try {
            await cmd.run(client, interaction);
        } catch (e) {
            logger.error(`Error running slash command ${command}\n`, e);
            interaction.createMessage({ content: 'I\'m sorry an error occurred. ```\n' + e.toString() + '\n```', flags: 64 }).catch(e => logger.error('error sending error message', e));
        }
    });

    client.on('guildCreate', () => {
        client.getChannel(client.config.loggingChannel)
            ?.createMessage(`Joined a new server! Now I have ${client.guilds.size} servers!`)
            .catch(e => logger.error('error logging', e));

        updateData?.({
            type: 'guilds',
            data: client.guilds.size
        });
    });

    client.on('guildDelete', () => {
        client.getChannel(client.config.loggingChannel)
            ?.createMessage(`Left a server! Now I have ${client.guilds.size} servers!`)
            .catch(e => logger.error('error logging', e));

        updateData?.({
            type: 'guilds',
            data: client.guilds.size
        });
    });

    client.on('error', (e) => {
        logger.error(e);
    });

    client.connect().catch(e => {
        logger.error('Error logging into client');
        logger.error(e);
        process.exit(1);
    });


    {
        // Load commands
        let commands = await fs.readdir('./src/commands');
        logger.info(`Loading ${commands.length} command${commands.length !== 1 ? 's' : ''}.`);
        let done = 0;
        await Promise.all(commands.map(async cmd => {
            if (!cmd.endsWith('.js')) return;
            let r = await client.loadCommand(cmd);
            if (!r) done++;
        }));
        logger.log(`Successfully loaded ${done}/${commands.length} command${commands.length !== 1 ? 's' : ''}.`);
    }
    {
        // Load slash commands
        let commands = await fs.readdir('./src/slash');
        logger.info(`Loading ${commands.length} slash command${commands.length !== 1 ? 's' : ''}.`);
        let done = 0;
        await Promise.all(commands.map(async cmd => {
            if (!cmd.endsWith('.js')) return;
            let r = await client.loadSlashCommand(cmd);
            if (!r) done++;
        }));
        logger.log(`Successfully loaded ${done}/${commands.length} slash command${commands.length !== 1 ? 's' : ''}.`);
    }

    return client;
};

export default createClient;