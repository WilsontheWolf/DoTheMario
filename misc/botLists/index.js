module.exports = (client) => {
    const tokens = {
        topcord: process.env.TOPCORD,
        topgg: process.env.DBL
    };

    const functions = {
        topcord: require('./topcord'),
        topgg: require('./topgg'),
    };

    let total = 0;
    Object.entries(tokens).forEach(([key, value]) => {
        if(!value) return;
        const func = functions[key];
        if(typeof func !== 'function') return;
        func(client, value);
        total++;
    });
    console.log(`Loaded ${total} bot list stats.`);
};