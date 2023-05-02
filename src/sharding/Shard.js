import Child from './Child.js';

class Shard extends Child {
    constructor() {
        super();
        if(!process.env.TOKEN) throw new Error('No token provided');
    }

    handleMessage(message) {
        if (!message?.type) return false;
        let found = true;
        switch (message.type) {
            default:
                found = false;
                break;
        }
        if (!found) found = super.handleMessage(message);
        return found;
    }
}

export default Shard;