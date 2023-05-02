import fetch from 'node-fetch';
import { logger } from '../logger.js';

const topgg = async ({ guilds, shards, id }, token) => {
    const data = {
        server_count: guilds,
        shard_count: shards,
    };
    try {
        await fetch(`https://top.gg/api/bots/${id}/stats`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        })
            .then(res => res.ok ? res : Promise.reject(`Status ${res.status}`));
    } catch (e) {
        logger.error('Error sending top.gg data!');
        logger.error(e);
    }

};

export default topgg;