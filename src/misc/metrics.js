import { Gauge, register } from 'prom-client';
import config from '../config.js';

const shouldSendMetrics = () => {
    return config.metricsPrefix !== '';
};

let data;
const updateDataForMetrics = (newData) => {
    data = newData;
};

const metricsPrefix = config.metricsPrefix;

const registerMetrics = (genShardData) => {
    const totalGuilds = new Gauge({
        name: metricsPrefix + 'total_guilds',
        help: 'The number of guilds the bot is in',
        labelNames: ['shard', 'overall'],
        collect() {
            const shardData = genShardData();
            if (!shardData) return;
            for (const shard of Object.keys(shardData)) {
                totalGuilds.set({ shard }, shardData[shard].guilds);
                health.set({ shard }, shardData[shard].healthy ? 1 : 0);
                latency.set({ shard }, shardData[shard].latency || 0);
                ready.set({ shard }, shardData[shard].ready ? 1 : 0);
            }
        }
    });

    const health = new Gauge({
        name: metricsPrefix + 'health',
        help: 'The health of the bot',
        labelNames: ['shard'],
    });

    const latency = new Gauge({
        name: metricsPrefix + 'latency',
        help: 'The latency of the bot',
        labelNames: ['shard'],
    });

    const ready = new Gauge({
        name: metricsPrefix + 'ready',
        help: 'The ready status of the bot',
        labelNames: ['shard'],
    });

    const count = new Gauge({
        name: metricsPrefix + 'count',
        help: 'The number of times the bot has been used',
        collect() {
            if (data.count)
                count.set(data.count);
        }
    });

};



export {
    shouldSendMetrics,
    registerMetrics,
    register,
    updateDataForMetrics,
};
