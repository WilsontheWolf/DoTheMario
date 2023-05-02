import { EventEmitter } from 'node:events';
import { logger } from '../misc/logger.js';

const isChild = () => !!process.send;

let init = false;

class Child extends EventEmitter {
    #shard;
    #shards;
    #pingTimeout;

    constructor() {
        super();

        if (init) throw new Error('Child already initialized');
        init = true;
        if (!isChild()) {
            logger.log('Not a child process. Exiting.');
            process.exit(1);
        }

        if (!process.env.SHARD || !process.env.SHARDS) {
            logger.log('Invalid environment variables. Exiting.');
            process.exit(1);
        }

        this.exiting = false;

        const shard = parseInt(process.env.SHARD);
        const shards = parseInt(process.env.SHARDS);

        if (isNaN(shard) || isNaN(shards)) {
            logger.log('Invalid environment variables. Exiting.');
            process.exit(1);
        }

        process.on('message', message => {
            this.handleMessage(message);
        });

        process.on('SIGINT', () => {
            if (this.exiting) return;
            logger.log('Child exiting', shard);
            this.exiting = true;
            this.emit('exit');
        });

        this.#shard = shard;
        this.#shards = shards;

        this.ping();
    }

    handleMessage(message) {
        this.emit('rawMsg', message);
        if (!message?.type) return false;
        let found = true;
        switch (message.type) {
            case 'exit':
                this.emit('exit');
                break;
            case 'pong':
                clearTimeout(this.#pingTimeout);
                setTimeout(() => this.ping(), 1000);
                break;
            default:
                found = false;
                break;
        }
        return found;
    }

    send(type, message) {
        if (!message) message = {};
        if (typeof message !== 'object') message = { message };
        process.send({
            ...message,
            type,
        });
    }

    ping() {
        try {
            this.send('ping');
        } catch (e) {
            logger.error('Error sending ping', e);
            logger.error('Guess I\'ll die.');
            process.exit(1);
        }
        
        this.#pingTimeout = setTimeout(() => {
            logger.error('Ping timeout');
            logger.error('Guess I\'ll die.');
            process.exit(1);
        }, 3000);
            
    }

    get shard() {
        return this.#shard;
    }

    get shards() {
        return this.#shards;
    }
}

export default Child;       
