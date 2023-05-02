import { logger } from '../logger.js';

const test = async ({ guilds, shards, id }, token) => {
    const data = {
        guilds,
        shards,
        id,
        token,
    };
    logger.warn('Test Bot List', data);

};

export default test;