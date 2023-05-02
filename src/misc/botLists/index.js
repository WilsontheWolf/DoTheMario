import { logger } from '../logger.js';

export default async (id) => {
    const tokens = {
        topcord: process.env.TOPCORD,
        topgg: process.env.DBL,
        test: process.env.TEST_BOT_LIST,
    };

    const functions = {
        topcord: await (await import('./topcord.js')).default,
        topgg: await (await import('./topgg.js')).default,
        test: await (await import('./test.js')).default,
    };

    const loaded = [];
    Object.entries(tokens).forEach(([key, value]) => {
        if(!value) return;
        const func = functions[key];
        if(typeof func !== 'function') return;
        loaded.push(func);
    });
    logger.log(`Loaded ${loaded.length} bot list stats.`);
    return (guilds, shards) => {
        loaded.forEach(func => func({guilds, shards, id}, tokens[func.name]));
    };
};