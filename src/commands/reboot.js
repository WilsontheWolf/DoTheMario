import { logger } from '../misc/logger.js';

const cmd = {
    name: 'reboot'
};
// eslint-disable-next-line no-unused-vars
cmd.run = async (client, message, args) => {
    await message.channel.createMessage('rebooting...');
    await client.disconnect();
    logger.log(`Reboot triggered by ${message.author.username}#${message.author.discriminator}`);
    await client.disconnect({
        reconnect: false
    });
    process.exit(0);
};

export { cmd };