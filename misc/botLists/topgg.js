const { AutoPoster } = require('topgg-autoposter');

module.exports = (client, token) => {
    AutoPoster(token, client);
};