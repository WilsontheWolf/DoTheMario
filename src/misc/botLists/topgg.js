import fetch from 'node-fetch';

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
        console.error('Error sending top.gg data!');
        console.error(e);
    }

};

export default topgg;