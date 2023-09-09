import getManager from '../misc/CountManager.js';
import { guildCount } from '../misc/guildManager.js';

const cmd = {
    name: 'stats',
    desc: 'Shows some stats.'
};

const manager = getManager();
// eslint-disable-next-line no-unused-vars
cmd.run = async (client, interaction) => {
    await interaction.createMessage({
        content: `**Stats:**
>>> ${(client.config.countMessage || 'I have been used {{count}} times.').replace('{{count}}', `**${await manager.get()}**`)}
I am in **${guildCount}** servers.
You are talking to shard **#${interaction.channel?.guild?.shard?.id ?? '?'}**`, flags: 64
    });
};

export { cmd };