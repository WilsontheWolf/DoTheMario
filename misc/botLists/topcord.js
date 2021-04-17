const fetch = require('node-fetch');

const topcord = async (client, token = process.env.TOPCORD) => {
    const data = {
        guilds: client.guilds.size,
        shards: client.shards.size
    };
    try {
        const json = await fetch(`https://api.topcord.xyz/bot/${client.user.id}/stats/`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'authorization': token
            }
        })
            .then(res => res.json());
        if (json.message == 'Bot Updated') return;
        console.error('Received unexpected response sending topcord data!');
        console.error(json);
    } catch (e) {
        console.error('Error sending topcord data!');
        console.error(e);
    }

};

module.exports = (client, token) => {
    client.on('ready', () => {
        topcord(client, token);
    });
    client.on('guildCreate', () => {
        topcord(client, token);
    });
    client.on('guildDelete', () => {
        topcord(client, token);
    });
};