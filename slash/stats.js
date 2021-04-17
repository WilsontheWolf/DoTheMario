module.exports = {
    name: 'stats',
    desc: 'Shows some stats.'
};
// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, { guild, member, options }, reply) => {
    reply(`**Stats:**
>>> ${(client.config.countMessage || 'I have been used {{count}} times.').replace('{{count}}', `**${await client.db.get('count')}**`)}
I am in **${client.guilds.size}** servers.`);
};