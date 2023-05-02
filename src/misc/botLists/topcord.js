import fetch from 'node-fetch';
import { logger } from '../logger.js';

const topcord = async ({guilds, shards, id}, token) => {
    const data = {
        guilds,
        shards,
    };
    try {
        const json = await fetch(`https://api.topcord.xyz/bot/${id}/stats`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        })
            .then(res => res.json());
        if (json.message == 'Bot updated!') return;
        logger.error('Received unexpected response sending topcord data!');
        logger.error(json);
    } catch (e) {
        logger.error('Error sending topcord data!');
        logger.error(e);
    }

};

export default topcord;