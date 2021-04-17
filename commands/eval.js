module.exports = {
    name: 'eval'
};
// eslint-disable-next-line no-unused-vars
module.exports.run = async (client, message, args) => {
    const embed = {
        footer: {
            text: `Eval command executed by ${message.author.username}`
        },
        timestamp: new Date().toISOString()
    };
    let code = args.join(' ');
    let response;
    let e = false;
    try {
        if (code.includes('await') && !message.content.includes('\n'))
            code = '( async () => {return ' + code + '})()';
        else if (code.includes('await') && message.content.includes('\n'))
            code = '( async () => {' + code + '})()';
        response = await eval(code);
        if (typeof response !== 'string') {
            response = require('util').inspect(response, { depth: 3 });
        }
    } catch (err) {
        e = true;
        response = err.toString();
        try {
            const Linter = require('eslint').Linter;
            let linter = new Linter();
            let lint = linter.verify(code, { 'env': { 'commonjs': true, 'es2021': true, 'node': true }, 'extends': 'eslint:recommended', 'parserOptions': { 'ecmaVersion': 12 } });
            let error = lint.find(e => e.fatal);
            if (error) {
                let line = code.split('\n')[error.line - 1];
                let match = line.slice(error.column - 1).match(/\w+/i);
                let length = match ? match[0].length : 1;
                response = `${line}
${' '.repeat(error.column - 1)}${'^'.repeat(length)}
[${error.line}:${error.column}] ${error.message} `;
            }
        } catch (e) { }

    }
    response = response.replace(client.config.token, 'no');
    const length = `\`\`\`${response}\`\`\``.length;
    embed.title = e ? '**Error**' : '**Success**';
    embed.color = e ? 0xe74c3c : 0x2ecc71;
    embed.description = `\`\`\`${response.substr(0, 2042)}\`\`\``;
    if (length >= 2049) {
        console.debug(`An eval command executed by ${message.author.username}'s response was too long (${length}/2048) the response was:
${response}`);
        embed.fields = [{
            name: 'Note:',
            value: `The response was too long with a length of \`${length}/2048\` characters. it was logged to the console`
        }];
    }
    await message.channel.createMessage({ embed });
};