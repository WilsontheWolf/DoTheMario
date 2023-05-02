const logger = {};

const prefix = [];
if(process.send && process.env.SHARD && !isNaN(parseInt(process.env.SHARD))) { // Child process
    prefix.push(`[Shard #${process.env.SHARD}]`);
} else if(!process.send) { // Parent process
    prefix.push('[Main]');
}

Object.entries(console).forEach(([key, value]) => {
    logger[key] = (...args) => {
        const date = new Date();
        const time = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0') }`;
        value(...prefix, `[${time}]`, ...args);
    };
});

export { logger, prefix };