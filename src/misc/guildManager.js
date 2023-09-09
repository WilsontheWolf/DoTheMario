import { logger } from "./logger.js";

let guildCount = 0;

let updateGuildCount = () => { };

let isChild = false;
let client = null;

const doGuildMsg = (msg, isExternal) => {
    if (!client) return
    const channel = client.getChannel(client.config.loggingChannel);
    if (!channel) {
        if (isExternal) return;
        if (!isChild) return;
        return process.send({ type: 'guildMsg', msg });
    }
    channel.createMessage(`${msg} Now I have ${guildCount} servers!`)
        .catch(e => logger.error('error logging', e));
};

const setClient = (c) => {
    client = c;
};

if (process.send) {
    process.on('message', async (message) => {
        if (message.type === 'guilds') {
            guildCount = message.count;
        }
        if (message.type === 'guildMsg') {
            doGuildMsg(message.msg, true);
        }
    });
    isChild = true;
} else {
    updateGuildCount = (count) => {
        guildCount = count;
    };
}

export {
    updateGuildCount,
    guildCount,
    doGuildMsg,
    setClient,
};