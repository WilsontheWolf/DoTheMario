class CountManager {
    #get;
    #inc;
    #count = 0;
    constructor(inc, get) {
        if (!inc) throw new Error('No inc function provided');
        if (get) this.#get = get;
        this.#inc = inc;
        this.#count = 0;
    }

    async get() {
        if (this.#get) return await this.#get?.() ?? this.#count;
        return this.#count;
    }

    async inc() {
        this.#count++;
        await this.#inc?.();
    }

    update(count) {
        this.#count = count;
    }

}

let manager;

/**
 * Gets the CountManager.
 * @param {import('@joshdb/core').default?} db - The db. Optional if the manager has already been initialized, or if in a child process.
 * @returns {CountManager}
 */
const getManager = (db) => {
    if (manager) return manager;
    if (db) {
        const get = () => db.get('count');
        const inc = () => db.inc('count');
        manager = new CountManager(inc, get);
    } else {
        if (!process.send) throw new Error('No db provided and not in a child process. CountManager cannot be used.');
        const inc = () => process.send({ type: 'incCount' });
        manager = new CountManager(inc);
        process.on('message', async (message) => {
            if (message.type === 'count') {
                if (message.count) manager.update(message.count);
            }
        });
        process.send({ type: 'getCount' });
    }
    return manager;
};

export default getManager;