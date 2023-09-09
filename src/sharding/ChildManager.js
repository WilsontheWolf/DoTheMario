import { EventEmitter } from 'node:events';
import { fork } from 'node:child_process';
import { logger } from '../misc/logger.js';
import getManager from '../misc/CountManager.js';

class ChildManager extends EventEmitter {
    constructor({
        shard,
        maxShards,
        env,
        file,
        autoRestart = true,
        updateData,
    }) {
        if (shard == null) throw new Error('No shard provided');
        if (!maxShards) throw new Error('No maxShards provided');
        // if (!env) throw new Error('No env provided');
        if (!file) throw new Error('No file provided');

        super();

        this.shard = shard;
        this.maxShards = maxShards;
        this.env = env;
        this.file = file;
        this.autoRestart = autoRestart;
        this.spawned = false;
        this.ready = false;
        this.exiting = false;
        this.countManager = getManager();
        this.updateData = updateData;
        this.childInformation = {};
    }

    /**
     * Spawn a child.
     * @returns {Promise<void>} - Resolves when the child process is spawned and ready.
     */
    spawn() {
        if (this.spawned) return Promise.reject(new Error('Child already running'));
        return new Promise((resolve, reject) => {
            this.child = fork(this.file, {
                env: {
                    ...this.env,
                    SHARD: this.shard,
                    SHARDS: this.maxShards,
                },
            });

            this.child.on('error', reject);
            this.child.on('exit', (code, signal) => {
                this.emit('exit', code, signal);
                this.spawned = false;
                if (!this.ready) reject(new Error('Child exited before ready'));
                this.ready = false;
                logger.log('Child exited with code', code, 'and signal', signal);
                if (this.autoRestart && !this.exiting) {
                    logger.log('Restarting child');
                    this.spawn();
                }
            });
            this.child.on('message', message => {
                this.emit('message', message);
                this.handleMessage(message);
            });

            const timeout = setTimeout(() => {
                this.child?.kill();
                reject(new Error('Child took too long to start'));
            }, 10000);
            this.resolve = () => {
                clearTimeout(timeout);
                this.ready = true;
                resolve();
            };
            this.spawned = true;

        });
    }

    async handleMessage(message) {
        if (!message?.type) return;

        switch (message.type) {
            case 'ready': {
                if (this.ready) {
                    logger.warn('Child already ready');
                    return;
                }
                if (!this.resolve) {
                    logger.warn('Child ready before spawn resolved');
                    return;
                }
                this.resolve();
                break;
            }

            case 'error': {
                logger.error('Child error:', message.error);
                break;
            }

            case 'ping': {
                this.send('pong');
                break;
            }

            case 'getCount': {
                this.send('count', {
                    count: await this.countManager.get(),
                });
                break;
            }

            case 'incCount': {
                this.updateData?.({ type: 'count' });
                break;
            }

            case 'guildUpdate': {
                this.childInformation.guilds = message.count;
                this.updateData?.({ type: 'guilds', data: message.count });
                // TODO:
                break;
            }

            case 'shardInfo': {
                this.childInformation.ready = message.ready;
                this.childInformation.latency = message.latency;
                if (this.childInformation.latency === -1) this.childInformation.latency = Infinity;
                this.childInformation.status = message.status;
                break;
            }

            case 'readyInfo': {
                this.updateData?.({ type: 'constants', data: message.data });
                break;
            }

            case 'guildMsg': {
                this.updateData?.({ type: 'guildMsg', data: message.msg });
                break;
            }

            default: {
                logger.warn('Unknown message type', message.type);

            }
        }
    }

    send(type, message) {
        if (!this.child) throw new Error('Child not spawned');
        if (!message) message = {};
        if (typeof message !== 'object') message = { message };
        this.child.send({
            ...message,
            type,
        });
    }

    async exit() {
        this.autoRestart = false;
        await this._exit();
        // logger.warn('SIGKILL 1')
        // this.child?.kill?.('SIGKILL');
    }

    _exit() {
        return new Promise(resolve => {
            if (!this.child) return resolve();
            if (this.exiting) {
                logger.log('Kill was called twice, killing child', this.shard);
                this.child.kill('SIGKILL');
                return resolve();
            }
            this.exiting = true;
            const timeout = setTimeout(() => {
                logger.log('Killing child', this.shard);
                this.child?.kill('SIGKILL');
                resolve();
            }, 5000);

            this.child.on('exit', (code) => {
                logger.log('exit', code);
                if (code !== undefined) {
                    resolve();
                    clearTimeout(timeout);
                }
            });

        });
    }

    newData({ type, data }) {
        if (type === 'count') {
            this.send('count', {
                count: data,
            });
        }
        if (type === 'guilds') {
            this.send('guilds', {
                count: data,
            });
        }
        if (type === 'guildMsg') {
            this.send('guildMsg', {
                msg: data,
            });
        }
    }

    displayInformation() {
        if (!this.childInformation.ready && !this.childInformation.status) return {
            id: this.shard,
            ready: false,
            latency: null,
            guilds: null,
            status: 'offline',
        };
        return {
            id: this.shard,
            ready: this.childInformation.ready,
            latency: this.childInformation.latency,
            guilds: this.childInformation.guilds,
            status: this.childInformation.status,
        };
    }

}
export default ChildManager;