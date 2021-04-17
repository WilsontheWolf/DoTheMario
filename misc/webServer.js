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