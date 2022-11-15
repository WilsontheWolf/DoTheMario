import Koa from 'koa';
import fs from 'node:fs/promises';

const app = new Koa();
const api = new Map();

api.set('invites', async (ctx) => {
    const shards = ctx.getShardData?.();
    const guilds = shards?.reduce((a, b) => a + b.guilds ?? 0, 0);
    if (!shards || !guilds) return {
        schemaVersion: 1,
        label: 'invite',
        message: 'Loading server count',
        color: 'red'
    };

    return {
        schemaVersion: 1,
        label: 'invite',
        message: `${guilds} servers`,
        color: 'success'
    };
});

api.set('invite', (ctx) => {
    if (!ctx.constants.id) {
        ctx.status = 503;
        return `<!DOCTYPE html>
        
        <head>
            <title>Error</title>
            <style>
                body {
                    color: white;
                    background-color: black;
                }
            </style>
            <meta http-equiv="refresh" content="3">
        </head>
        
        <body>
            <h1>Error</h1>
            <p>The invite URL is currently unavailable. Please try again in a few seconds.</p>
        </body>`;
    }
    ctx.redirect(`https://discord.com/oauth2/authorize?client_id=${ctx.constants.id}&scope=bot%20applications.commands&permissions=3145728`);
    ctx.status = 308;
    return `Redirecting to https://discord.com/oauth2/authorize?client_id=${ctx.constants.id}&scope=bot%20applications.commands&permissions=3145728`;
});

api.set('count', async (ctx) => {
    const [label, message] = (ctx.constants.countMessage || 'I have been used {{count}} times').split('{{count}}');
    return {
        schemaVersion: 1,
        label,
        message: `${await ctx.data.count || 0}${message}`,
        color: 'success'
    };
});

api.set('shards', (ctx) => {
    const shards = ctx.getShardData?.();
    if (!shards) {
        ctx.status = 503;
        return {
            Error: 'No shard data available'
        };
    }
    return shards;
});

api.set('health', (ctx) => {
    const shards = ctx.getShardData?.();

    if (!shards) {
        ctx.status = 503;
        return {
            Error: 'No health data available'
        };
    }

    const healthy = shards.every(shard => shard.healthy);
    const ready = shards.every(shard => shard.ready);

    if (!healthy || !ready) {
        ctx.status = 503;
    }

    return {
        healthy,
        ready,
    };
});



api.set('tos', async () => {
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
</body>`;
});

api.set('privacy', async () => {
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
</body>`;
});

const updateConstants = (constants) => {
    app.context.constants = constants;

};
const updateData = (data) => {
    app.context.data = data;
};

export default (startingConst = {}, port, getShardData) => {

    updateConstants(startingConst);
    updateData({});

    app.context.getShardData = getShardData;

    app.use(async (ctx) => {
        let { path, url } = ctx;
        let resp;


        try {
            let get = path.replace(/^\/+|(\/)\/+|\/+$/g, '$1');
            if (!get) {
                const file = await fs.readFile('./public/index.html');
                resp = file.toString().replace(/{{\s*(\w+)\s*}}/g, (orig, value) => {
                    if (ctx.constants[value]) return ctx.constants[value];
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

    app.listen(port || 3000);
    console.log(`Starting on port ${port || 3000}`);

    return {
        updateConstants,
        updateData,
    };

};