const cmd = {
    name: 'ping'
};
// eslint-disable-next-line no-unused-vars
cmd.run = async (client, message, args) => {
    let msg = await message.channel.createMessage('Pong!');
    msg.edit(`🏓 Pong! The latency is ${msg.createdAt - message.createdAt}ms. API Latency is ${client.guilds.get(message.guildID).shard.latency}ms.`);
};

export { cmd };