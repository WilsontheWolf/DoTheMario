module.exports = {
    name: 'reboot'
};
// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args) => {
    await message.channel.createMessage('rebooting...');
    await client.disconnect();
    console.log(`Reboot triggered by ${message.author.username}#${message.author.discriminator}`);
    process.exit();
};