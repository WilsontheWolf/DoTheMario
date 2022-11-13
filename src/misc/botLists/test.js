const test = async ({ guilds, shards, id }, token) => {
    const data = {
        guilds,
        shards,
        id,
        token,
    };
    console.warn('Test Bot List', data);

};

export default test;