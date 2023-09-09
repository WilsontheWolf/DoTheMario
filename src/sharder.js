import { Client, Collection } from '@projectdysnomia/dysnomia';
import config from './config.js';
import { handleToken } from './misc/token.js';
import ChildManager from './sharding/ChildManager.js';
import { logger } from './misc/logger.js';
import webServer from './misc/webServer.js';
import Josh from '@joshdb/core';
import provider from '@joshdb/sqlite';
import getManager from './misc/CountManager.js';
import botLists from './misc/botLists/index.js';

let shards = NaN;
if (process.env.SHARDS) shards = parseInt(process.env.SHARDS);
if (isNaN(shards)) {
    if (process.env.SHARDS) logger.warn('Invalid shard count provided. Attempting to auto-detect.');

    const client = new Client(handleToken(config.token), {
        autoreconnect: false,
    });

    const gateway = await client.getBotGateway()
        .catch(e => {
            logger.error('Error getting gateway details:', e);
            process.exit(1);
        });

    client.disconnect({ reconnect: false }); // Shouldn't be connected, but just in case

    if (!gateway?.shards) {
        logger.error('Could not automatically get shard count.');
        process.exit(1);
    }

    shards = gateway.shards;
}

logger.log('Starting with', shards, 'shard(s)');

const db = new Josh({
    name: 'db',
    provider
});

getManager(db);

await db.ensure('count', 0);
let constants = {
    bot: config.name,
    id: Buffer.from(process.env.TOKEN?.split('.')[0] || '', 'base64').toString('utf8'),
    catchPrase: config.catchPrase,
    tag: config.name,
    song: config.name,
    base: encodeURIComponent(config.baseURL),
    countMessage: config.countMessage,
    uptimeBadge: config.uptimeBadge || 'https://img.shields.io/static/v1?label=Uptime&message=%3F%3F%25&color=inactive&style=for-the-badge',
    supportServer: config.supportServer,
};

/** @type {Collection<ChildManager>} */
const children = new Collection(ChildManager);

const genShardData = () => {
    return children.map(child => {
        const data = child.displayInformation();
        data.healthy = data.ready && (data.latency !== Infinity ? data.latency < 2000 : true);
        return data;
    });
};

const postBotLists = await botLists(constants.id);

const server = webServer(constants, config.port, genShardData);



const updateChildren = async (type, data) => {
    for (const child of children.values()) {
        child.newData({ type, data });
    }
};

const allReady = () => {
    if (children.size !== shards) return false;
    for (const child of children.values()) {
        if (!child.childInformation.ready) return false;
    }
    return true;
};

const guildCount = () => {
    let count = 0;
    for (const child of children.values()) {
        count += child.childInformation.guilds || 0;
    }
    return count;
};

const updateData = async ({ type, data }) => {
    if (type === 'guilds') {
        if (!allReady()) return;
        postBotLists(guildCount(), shards);
        updateChildren?.('guilds', guildCount());
    }
    else if (type === 'count') {
        await db.inc('count');
        updateChildren?.('count', await db.get('count'));
    } else if (type === 'constants') {
        constants = { ...constants, ...data };
        server.updateConstants(constants);
    } else if (type === 'guildMsg') {
        updateChildren?.('guildMsg', data);
    }
    else logger.warn('Unknown type', type);
    server.updateData({ count: await db.get('count') });
};


for (let i = 0; i < shards; i++) {
    const manager = new ChildManager({
        shard: i,
        maxShards: shards,
        env: {
            TOKEN: handleToken(config.token),
        },
        file: './src/sharding/shard-index.js',
        updateData,
    });

    await manager.spawn();

    children.set(i, manager);
}




process.on('SIGINT', async () => {
    logger.log('SIGINT received. Exiting.');
    await Promise.all(children.map(child => child.exit()));
    logger.log('All children exited. Exiting.');
    process.exit(0);
});

