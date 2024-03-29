import 'dotenv/config'; 

const config = {
    prefix: '?',
    token: process.env.TOKEN,
    admins: ['517371142508380170', '312974985876471810'],
    loggingChannel: '607437067148066826',
    port: process.env.PORT,
    // The name of the song
    // Shows on the website.
    name: 'music',
    // The count message of the bot
    // If my count message is `I have been used {{count}} times` 
    // the message would be `I have been used 5 times`
    countMessage: 'I have been used {{count}} times',
    // The catch prase of the bot
    // Shows up in status and the website
    catchPrase: 'Do do do...',
    // Base url for dashboard
    baseURL: 'https://dtm.shorty.systems/',
    // The path to the uptime badge
    // Leave this blank if you don't have a uptime badge
    uptimeBadge: 'https://status.shorty.systems/api/badge/3/uptime?style=for-the-badge&label=uptime&labelSuffix=',
    // The support server of the bot
    supportServer: 'https://discord.gg/jRN7SZB',
    // The prefix for prometheus metrics
    // Leave blank to disable
    // E.G. "dtm_"
    metricsPrefix: '',
};

export default config;
