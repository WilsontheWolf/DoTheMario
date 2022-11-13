const config = {
    prefix: '?',
    token: process.env.TOKEN,
    admins: ['517371142508380170', '312974985876471810'],
    loggingChannel: '607437067148066826',
    port: process.env.PORT,
    // The name of the song
    // Shows up in status and website.
    name: 'music',
    // The count message of the bot
    // If my count message is `I have been used {{count}} times` 
    // the message would be `I have been used 5 times`
    countMessage: 'I have been used {{count}} times',
    // The catch prase of the bot
    // Shows on the website
    catchPrase: 'Do do do...',
    // Base url for dashboard
    baseURL: 'https://dtm.antti.codes/'
};
export default config;
