require('dotenv').config();
const enmap = require('enmap');
const fs = require('fs');
const count = new enmap({ name: 'count' });
const Discord = require('discord.js');
const fetch = require('node-fetch');
const client = new Discord.Client({
    messageCacheMaxSize: 1,
    messageCacheLifetime: 5,
    messageSweepInterval: 30,
    ws: {
        intents: [
            'GUILD_MESSAGES',
            'GUILD_VOICE_STATES',
            'GUILDS'
        ]
    }
});
const DBL = require('dblapi.js');
const config = require('./config.js');
const dbl = new DBL(config.dbl, client);
const express = require('express');
const bodyParser = require('body-parser');
const app = express.Router();
const a = express();
const helmet = require('helmet');
const { response } = require('express');
a.use(bodyParser.urlencoded({ extended: false }));
a.use(bodyParser.json());
a.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ['\'self\''],
        'img-src': ['\'self\'', 'img.shields.io', 'forthebadge.com', 'top.gg', 'topcord.xyz'],
        'frame-src': ['\'self\'', 'topcord.xyz']
    }
}));

a.use('/', app);


const type = 'mario';
let serversBadge = '{"schemaVersion": 1,"label": "invite","message": "Loading server count","color": "red"}';
let publicCount = `{"schemaVersion": 1,"label": "loading","message": "${type} count","color": "red"}`;

client.login(config.token).catch(e => {
    console.error('Error Logging in:');
    console.error(e);
    process.exit();
});

function song(channel) {
    try {
        if (!channel.guild || !channel || !channel.joinable || channel.guild.me.voice.channel)
            return;
        count.math('count', 'add', 1);
        console.log(`The ${type} has been done ${count.get('count')} times now!`);
        publicCount = `{"schemaVersion": 1,"label": "The ${type} has been done","message": "${count.get(
            'count'
        )} times","color": "success"}`;

        channel.join().then(connection => {
            const dispatcher = connection.play('./song.ogg');

            dispatcher.on('finish', () => {
                try {
                    channel.guild.me.voice.channel.leave();
                } catch (e) {
                    console.warn(`error leaving after doing the song
                       ${e}`);
                }
            });
        });
    } catch (e) {
        console.error('error doing the song');
        console.error(e);
    }
}


app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

app.get('/invites', function (request, response) {
    response.send(serversBadge);
});

app.get('/count', function (request, response) {
    response.send(publicCount);
});

const topcord = (client, token = process.env.TOPCORD) => {
    if (!token) return console.error('Error sending topcord stats! No auth token!');
    if (!client || !client.user || !client.user.id) return console.error('Error sending topcord stats! No client user!');
    const data = {
        guilds: client.guilds.cache.size,
        shards: 1 // i'm not coding this in
    };
    fetch(`https://topcord.xyz/api/bot/stats/${client.user.id}`, {
        method: 'post',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            'authorization': token
        }
    })
        .then(res => res.json())
        .then(json => {
            if (json.message == 'Bot Updated') return;
            console.error('Received unexpected response sending topcord data!');
            console.error(json);
        })
        .catch(e => {
            console.error('Error sending topcord data!');
            console.error(e);
        });
};
const listener = a.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});

client.on('ready', async () => {
    console.log(`${client.user.tag} has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    serversBadge = `{"schemaVersion": 1,"label": "invite","message": "${client.guilds.cache.size} servers","color": "success"}`;
    publicCount = `{"schemaVersion": 1,"label": "${type == 'mario' ? 'The mario has been done' : 'People have been rick rolled'}","message": "${count.get('count')} times","color": "success"}`;
    client.user.setActivity(type == 'mario' ? 'Do the mario' : 'Never gonna give you up', { type: 'LISTENING' });
    topcord(client);
});

client.on('guildCreate', guild => {
    serversBadge = `{"schemaVersion": 1,"label": "invite","message": "${client.guilds.cache.size} servers","color": "success"}`;
    console.log(`Joined a new server! Now I have ${client.guilds.cache.size} servers!`);
    client.channels.cache
        .get('607437067148066826')
        .send(
            `Joined a new server! Now I have ${client.guilds.cache.size} servers!`
        );
    topcord(client);
});

client.on('guildDelete', guild => {
    serversBadge = `{"schemaVersion": 1,"label": "invite","message": "${client.guilds.cache.size} servers","color": "success"}`;
    console.log(`Left a server! Now I have ${client.guilds.cache.size} servers!`);
    client.channels.cache
        .get('607437067148066826')
        .send(`Left a server! Now I have ${client.guilds.cache.size} servers!`);
    topcord(client);
});

client.on('message', async message => {
    if (message.author.bot) return;

    const prefixMention = new RegExp(`^<@!?${client.user.id}>( |)$`);
    if (message.content.match(prefixMention)) {
        song(message.member.voice.channel);
    }
    if (message.content.indexOf(config.prefix) !== 0) return;

    const args = message.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        const m = await message.channel.send('Ping?');
        m.edit(
            `Pong! Latency is ${m.createdTimestamp -
            message.createdTimestamp}ms. API Latency is ${Math.round(
                client.ws.ping
            )}ms`
        );
    }

    if (command == 'reboot') {
        if (!config.admins.includes(message.author.id)) return;
        await client.user.setActivity('Rebooting...');
        await message.reply('rebooting...');
        console.log(
            `${client.user.username} is Rebooting. Reboot triggered by ${message.author.username}`
        );
        await client.destroy();
        process.exit(1);
    }

    if (command === 'eval') {
        if (!config.admins.includes(message.author.id)) return;
        let evaled;
        try {
            const code = args.join(' ');
            evaled = eval(code);
            if (typeof evaled !== 'string') {
                evaled = require('util').inspect(evaled);
            }
        } catch (err) {
            let length = `\`\`\`${err}\`\`\``.length;
            let embedErr = new Discord.MessageEmbed()
                .setColor('RED')
                .setTitle('**Error**')
                .setFooter(`Eval command executed by ${message.author.username}`)
                .setTimestamp();
            if (length >= 2049) {
                console.error(`An eval command executed by ${message.author.username}'s error was too long (${length}/2048) the response was:
${evaled}`);
                embedErr.setDescription(
                    `The error was too long with a length of \`${length}/2048\` characters. it was logged to the console`
                );
            } else {
                embedErr.setDescription(`\`\`\`${err}\`\`\``);
            }
            message.channel.send(embedErr);
            return;
        }
        let length = `\`\`\`${evaled}\`\`\``.length;
        let embed = new Discord.MessageEmbed()
            .setColor('GREEN')
            .setTitle('**Success**')
            .setFooter(`eval command executed by ${message.author.username}`)
            .setTimestamp();
        if (length >= 2049) {
            console.log(`An eval command executed by ${message.author.username}'s response was too long (${length}/2048) the response was:
${evaled}`);
            embed.setDescription(
                `The response was too long with a length of \`${length}/2048\` characters. it was logged to the console`
            );
        } else {
            embed.setDescription(`\`\`\`${evaled}\`\`\``);
        }
        message.channel.send(embed);
    }
    if (command === 'exec') {
        if (!config.admins.includes(message.author.id)) return;
        let flags = [];
        while (args[0].startsWith('-')) {
            flags.push(args.shift());
        }
        const embed = new Discord.MessageEmbed()
            .setFooter(`exec command executed by ${message.author.username}`)
            .setTimestamp();
        let timeout = 5000;
        if (flags.includes('l')) {
            timeout = 60000;
        }
        if (flags.includes('d')) {
            message.delete().catch(O_o => { });
        }

        require('child_process')
            .exec(args.join(' '), { timeout },
                (err, stdout, stderr) => {
                    let e = !!stderr;
                    let result = stdout || stderr;
                    embed.setTitle(e ? '**Error**' : '**Success**')
                        .setColor(e ? 'RED' : 'GREEN')
                        .setDescription(`\`\`\`${result.substr(0, 2042)}\`\`\``);
                    if (result.length >= 2049) {
                        console.log(`An exec command executed by ${message.author.username}'s response was too long (${result.length}/2048) the response was:
                ${result}`);
                        embed.addField(
                            'Note:',
                            `The response was too long with a length of \`${result.length}/2048\` characters. it was logged to the console`
                        );
                    }
                    message.channel.send(embed);
                });
    }
});

const slashRespond = async (url, response, hidden = true) => {
    let request = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            type: 3,
            data: {
                content: response,
                flags: hidden ? 64 : 0
            }
        }),
        headers: { 'Content-Type': 'application/json' }
    });
    if (!request.ok) {
        console.error('Failed to send', request.url, request.status, await request.text());
        return '';
    }
    return await request.text();
};

client.ws.on('INTERACTION_CREATE', async (data) => {
    if (!data) return console.error('WTF slash command with no data!');
    const url = `https://discord.com/api/v8/interactions/${data.id}/${data.token}/callback`;
    let guild = client.guilds.cache.get(data.guild_id);
    if (!guild) return await slashRespond(url, `To use this slash commands you need to invite the bot user. 
You can do so here: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=3145728`);
    let member = await guild.members.fetch(data.member.user.id);
    if (!member) return await slashRespond(url, 'I\'m sorry something went wrong.');
    let command = data.data.name;
    let options = data.data.options || [];
    if (command === 'play') {
        let channel = options.find(o => o.name === 'channel');
        if (channel) channel = guild.channels.cache.get(channel.value);
        if (channel && channel.type !== 'voice') return await slashRespond(url, 'Please choose a voice channel.');
        if (!channel) channel = member.voice.channel;
        if (!channel) return await slashRespond(url, 'Please be in a voice channel or choose a valid voice channel.');
        if (!channel.joinable) return await slashRespond(url, `I am unable to join the voice channel #${channel.name}.`);
        if (!channel.speakable) return await slashRespond(url, `I am unable to speak in the voice channel #${channel.name}.`);
        if (channel.guild.me.voice.channel) return await slashRespond(url, `I am already playing music in #${channel.guild.me.voice.channel.name}! Please try again when I am done.`);
        await slashRespond(url, `Joining #${channel.name}!`);
        return song(channel);
    } else return await slashRespond(url, 'I\'m sorry that command was not found!');
});