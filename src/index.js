import webServer from './misc/webServer.js';
import botLists from './misc/botLists/index.js';
import Josh from '@joshdb/core';
import provider from '@joshdb/sqlite';
import 'dotenv/config';
import config from './config.js';
import createClient from './bot.js';

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
    uptimeBadge: config.uptimeBadge || 'https://img.shields.io/static/v1?label=Uptime&message=%3F%3F%25&color=inactive&style=for-the-badge',
};

let client;

const genShardData = () => {
    if (!client?.shards) return;
    const shardData = client.shards.map(shard => ({
        id: shard.id,
        status: shard.status,
        ready: shard.ready,
        latency: shard.latency !== Infinity ? shard.latency : null,
        healthy: shard.ready && (shard.latency !== Infinity ? shard.latency < 2000 : true),
        guilds: 0,
    }));

    Object.values(client.guildShardMap).forEach(shardId => {
        const shard = shardData.find(shard => shard.id === shardId);
        if (!shard) return console.warn('Shard not found', shardId);
        shard.guilds++;
    });

    return shardData;
};

const postBotLists = await botLists(constants.id);

const server = webServer(constants, config.port, genShardData);

const updateData = async ({ type, data }) => {
    if (type === 'guilds') {
        postBotLists(client.guilds.size, client.shards.size);
    }
    else if (type === 'count') {
        await db.inc('count');
    } 
    else console.warn('Unknown type', type);
    server.updateData({ count: await db.get('count') });
};

const ready = async (client) => {
    guilds = client.guilds.size;
    constants = {
        ...constants,
        bot: client.user.username,
        id: client.user.id,
        tag: `${client.user.username}#${client.user.discriminator}`,
    };
    server.updateConstants(constants);
    server.updateData({ count: await db.get('count') });
    console.log(`Ready! Serving ${client.guilds.size} guilds.`);
    postBotLists(client.guilds.size, client.shards.size);
};

client = await createClient({
    token: config.token,
    maxShards: 'auto',
}, ready, updateData);


client.db = db;
