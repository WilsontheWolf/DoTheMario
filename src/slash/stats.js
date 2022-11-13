const cmd = {
    name: 'stats',
    desc: 'Shows some stats.'
};
// eslint-disable-next-line no-unused-vars
cmd.run = async (client, interaction) => {
    interaction.createMessage({
        content: `**Stats:**
>>> ${(client.config.countMessage || 'I have been used {{count}} times.').replace('{{count}}', `**${await client.db.get('count')}**`)}
I am in **${client.guilds.size}** servers.`, flags: 64
    });
};

export { cmd };