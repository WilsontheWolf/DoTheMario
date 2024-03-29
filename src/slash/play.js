const cmd = {
    name: 'play',
    desc: 'I will sing you a song!',
    options: [
        {
            name: 'channel',
            description: 'The channel to play in. If none is provided I will join your current voice channel.',
            type: 7,
            required: false,
            // Voice and Stage
            channel_types: [2, 13]
        }
    ]
};
// eslint-disable-next-line no-unused-vars
cmd.run = async (client, interaction) => {
    const guild = client.guilds.get(interaction.guildID);
    const member = interaction.member;
    const options = interaction.data?.options || [];
    const reply = (content) => interaction.createMessage({content, flags: 64});
    if (client.voiceConnections.has(guild.id)) return await reply(`I am already playing music in <#${client.voiceConnections.get(guild.id).channelID}>! Please try again when I am done.`);
    let channel = options.find(o => o.name === 'channel');
    if (channel) channel = guild.channels.get(channel.value);
    if (channel && channel.type !== 2 && channel.type !== 13) return await reply('Please choose a voice channel.');
    if (!channel) channel = guild.channels.get(member.voiceState.channelID);
    if (!channel) return await reply('Please be in a voice channel or choose a valid voice channel.');
    if (!client.canJoinVC(channel)) return await reply(`I am unable to join the voice channel <#${channel.id}>.`);
    if (!client.canSpeakVC(channel)) return await reply(`I am unable to speak in the voice channel <#${channel.id}>.`);
    await reply(`Joining <#${channel.id}>!`);
    return client.play(channel);
};

export { cmd };