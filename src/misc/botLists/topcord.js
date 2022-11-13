import fetch from 'node-fetch';

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
        console.error('Received unexpected response sending topcord data!');
        console.error(json);
    } catch (e) {
        console.error('Error sending topcord data!');
        console.error(e);
    }

};

export default topcord;