import Koa from 'koa';
import fs from 'node:fs/promises';
import { logger } from './logger.js';
import { register, registerMetrics, shouldSendMetrics, updateDataForMetrics } from './metrics.js';

const app = new Koa();
const api = new Map();
const pages = new Map();

const getPage = async (page) => {
    if (pages.has(page)) return pages.get(page);
    const file = await fs.readFile(`./public/${page}.html`, 'utf8').catch(() => null);
    if (!file) return null;
    if (process.env.NODE_ENV !== 'development')
        pages.set(page, file);
    return file;
};

const renderPage = async (ctx, page, title, vars, useTemplate = true) => {
    const file = await getPage(page);
    if (!file) return null;
    let html = file;
    if (useTemplate) {
        const template = await getPage('template');
        if (!template) return null;
        html = template.replace('{{content}}', html)
            .replace('{{title}}', title || ctx.constants.bot || 'Bot');
    }

    html = html.replace(/{{\s*(\w+)\s*}}/g, (orig, value) => {
        if (vars?.[value]) return vars[value];
        else if (ctx.constants[value]) return ctx.constants[value];
        else return orig;
    });

    return html;
};

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

api.set('invite', async (ctx) => {
    if (!ctx.constants.id) {
        ctx.status = 503;
        return await renderPage(ctx, 'error', 'Error', {
            message: 'The invite URL is currently unavailable. Please try again in a few seconds.'
        });
    }
    ctx.redirect(`https://discord.com/oauth2/authorize?client_id=${ctx.constants.id}&scope=bot%20applications.commands&permissions=3145728`);
    ctx.status = 308;
    return `Redirecting to https://discord.com/oauth2/authorize?client_id=${ctx.constants.id}&scope=bot%20applications.commands&permissions=3145728`;
});

api.set('support', async (ctx) => {
    if (ctx.constants.supportServer) {
        ctx.redirect(ctx.constants.supportServer);
        ctx.status = 308;
        return `Redirecting to ${ctx.constants.supportServer}`;
    }
    ctx.status = 503;
    return await renderPage(ctx, 'error', 'Error', {
        message: 'It looks like the support server URL is not set. Please contact the bot owner.'
    });
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



api.set('tos', async (ctx) => {
    return await renderPage(ctx, 'tos', 'Terms of Service');
});

api.set('privacy', async (ctx) => {
    return await renderPage(ctx, 'privacy', 'Privacy Policy');
});

api.set('metrics', async () => {
    return await register.metrics();
});

const updateConstants = (constants) => {
    app.context.constants = constants;
};

const updateData = (data) => {
    app.context.data = data;
    updateDataForMetrics(data);
};

export default (startingConst = {}, port, getShardData) => {

    updateConstants(startingConst);
    updateData({});

    app.context.getShardData = getShardData;

    if(shouldSendMetrics()) {
        registerMetrics(getShardData);
    } else api.delete('metrics');

    app.use(async (ctx) => {
        let { path, url } = ctx;
        let resp;


        try {
            let get = path.replace(/^\/+|(\/)\/+|\/+$/g, '$1');
            if (!get) {
                resp = await renderPage(ctx, 'index');
                ctx.status = 200;
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
            logger.error(`Error serving ${url}`);
            logger.error(e);
            ctx.status = 500;
            resp = { message: 'internal server error' };
        }
        ctx.body = resp;
    });

    app.listen(port || 3000);
    logger.log(`Starting on port ${port || 3000}`);

    return {
        updateConstants,
        updateData,
    };

};