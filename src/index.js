import webServer from './misc/webServer.js';
import botLists from './misc/botLists/index.js';
import Josh from '@joshdb/core';
import provider from '@joshdb/sqlite';
import 'dotenv/config';
import config from './config.js';
import createClient from './bot.js';

const status = {
    ready: false,
    healthy: true,
    guilds: null,
};

const db = new Josh({
    name: 'db',
    provider
});

await db.ensure('count', 0);

let guilds;

let constants = {
    bot: config.name,
    id: Buffer.from(process.env.TOKEN?.split('.')[0] || '', 'base64').toString('utf8'),
    catchPrase: config.catchPrase,
    tag: config.name,
    song: config.name,
    base: encodeURIComponent(config.baseURL),
    countMessage: config.countMessage,
};

const postBotLists = await botLists(constants.id);

const server = webServer(constants, port);

const updateData = async ({ type, data }) => {
    if (type === 'guilds') {
        guilds = data;
        postBotLists(client.guilds.size, client.shards.size);
    }
    else if (type === 'count') {
        await db.inc('count');
    } else if(type === 'shard') {
        status.healthy = data.healthy;
    }
    else console.warn('Unknown type', type);
    server.updateData({ guilds, count: await db.get('count'), shards: [status] });
};

const ready = async (client) => {
    status.ready = true;
    status.guilds = client.guilds.size;
    guilds = client.guilds.size;
    constants = {
        ...constants,
        bot: client.user.username,
        id: client.user.id,
        tag: `${client.user.username}#${client.user.discriminator}`,
    };
    server.updateConstants(constants);
    server.updateData({ guilds, count: await db.get('count'), shards: [status] });
    console.log(`Ready! Serving ${client.guilds.size} guilds.`);
    postBotLists(client.guilds.size, client.shards.size);
};

const client = await createClient({
    token: config.token,
    maxShards: 'auto',
}, ready, updateData);


client.db = db;
