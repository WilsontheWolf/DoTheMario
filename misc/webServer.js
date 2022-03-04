const Koa = require('koa');
const app = new Koa();
const fs = require('fs/promises');
const api = new Map();

api.set('invites', async (ctx) => {
    if (!ctx.client.guilds?.size) return {
        schemaVersion: 1,
        label: 'invite',
        message: 'Loading server count',
        color: 'red'
    };
    return {
        schemaVersion: 1,
        label: 'invite',
        message: `${ctx.client.guilds.size} servers`,
        color: 'success'
    };
});

api.set('count', async (ctx) => {
    const [label, message] = (ctx.client.config.countMessage || 'I have been used {{count}} times.').split('{{count}}');
    return {
        schemaVersion: 1,
        label,
        message: `${await ctx.client.db.get('count') || 0}${message}`,
        color: 'success'
    };
});

api.set('tos', async (ctx) => {
    return `<!DOCTYPE html>

<head>
    <title>Terms of Service</title>
    <style>
        body {
            color: white;
            background-color: black;
        }
    </style>
</head>

<body>
    <h1>Terms of Service</h1>
    <p>Please read these terms of service (&quot;terms&quot;, &quot;terms of service&quot;) carefully before using our
        bot (the &quot;service&quot;).</p>
    <h3 id="conditions-of-use">Conditions of Use</h3>
    <p>Usage of this bot is subject to the terms below. By using the bot you agree to these terms.</p>
    <h3 id="privacy-policy">Privacy Policy</h3>
    <p>Before you continue using our website we advise you to read our <a href="./privacy">privacy policy</a> regarding
        our user data collection.</p>
</body>`
});

api.set('privacy', async (ctx) => {
    return `<!DOCTYPE html>

<head>
    <title>Privacy Policy</title>
    <style>
        body {
            color: white;
            background-color: black;
        }
    </style>
</head>

<body>
    <h1>Privacy Policy</h1>
    <p>We do not store any user data. The only data we store is a single number which counts how many times the bot has
        been used. This is entirely anonymous and has absolutely no user, guild, channel data associated with it.</p>
</body>`
});

module.exports = (client) => {
    app.context.client = client;
    app.use(async (ctx) => {
        let { path, url } = ctx;
        let resp;
        try {
            let get = path.replace(/^\/+|(\/)\/+|\/+$/g, '$1');
            if (!get) {
                const constants = {
                    bot: client.user.username,
                    id: client.user.id,
                    catchPrase: client.config.catchPrase,
                    tag: `${client.user.username}#${client.user.discriminator}`,
                    song: client.config.name,
                    base: encodeURIComponent(client.config.baseURL)
                };
                const file = await fs.readFile('./index.html');
                resp = file.toString().replace(/{{\s*(\w+)\s*}}/g, (orig, value) => {
                    if(constants[value]) return constants[value];
                    else return orig;
                });
            }
            else {
                let route = api.get(get);
                if (!route) {
                    resp = { message: 'not found' };
                    ctx.status = 404;
                }
                if (route) resp = await route(ctx);
            }
            if (resp === undefined) {
                resp = { message: 'not found' };
                ctx.status = 404;
            }
        } catch (e) {
            console.error(`Error serving ${url}`);
            console.error(e);
            ctx.status = 500;
            resp = { message: 'internal server error' };
        }
        ctx.body = resp;
    });

    app.listen(client.config.port || 3000);
    console.log(`Starting on port ${client.config.port || 3000}`);

};