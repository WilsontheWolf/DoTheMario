import { Constants } from '@projectdysnomia/dysnomia';
import createClient from '../bot.js';
import getManager from '../misc/CountManager.js';
import { logger } from '../misc/logger.js';
import Shard from './Shard.js';

const manager = new Shard();
const countManager = getManager();

const updateData = async ({ type, data }) => {
    if (type === 'count') {
        await countManager.inc();
    } else if (type === 'guilds') {
        process.send({ type: 'guildUpdate', count: data });
    } else if (type === 'shardInfo') {
        process.send({ type: 'shardInfo', ...data });
    } else {
        logger.warn('Unknown update type', type);
    }
};

logger.log('Child', manager.shard + 1, 'of', manager.shards);

/**
 * @param {import('@projectdysnomia/dysnomia').Client} client
 */
const ready = async (client) => {
    logger.log('Shard', manager.shard, 'ready, serving', client.guilds.size, 'guilds');
    manager.send('ready');
    const shard = client.shards.get(manager.shard);
    updateData({
        type: 'shardInfo',
        data: {
            ready: client.ready,
            latency: shard?.latency === Infinity ? -1 : shard?.latency,
            status: shard?.status,
        },
    });
    updateData({
        type: 'guilds',
        data: client.guilds.size
    });
    if (manager.shard !== 0) return;
    manager.send('readyInfo', {
        data: {
            name: client.user.username,
            id: client.user.id,
            tag: `${client.user.username}#${client.user.discriminator}`,
        }
    });
};

const client = await createClient({
    token: process.env.TOKEN,
    gateway: {
        firstShardID: manager.shard,
        lastShardID: manager.shard,
        maxShards: manager.shards,
    },
    isSharded: true,
    isMainChild: manager.shard === 0,
}, ready, updateData);


client.on('rawWS', (packet) => {
    if (packet.op === Constants.GatewayOPCodes.HEARTBEAT_ACK) {
        setImmediate(() => { // Wait for dysnomia to process the heartbeat ack. This computes the latency
            const shard = client.shards.get(manager.shard);
            updateData({
                type: 'shardInfo',
                data: {
                    ready: client.ready,
                    latency: shard?.latency === Infinity ? -1 : shard?.latency,
                    status: shard?.status,
                },
            });
        });
    }
});

manager.on('exit', () => {
    logger.log('Child exiting');
    client.disconnect({ reconnect: false });
    process.exit(0);
});
