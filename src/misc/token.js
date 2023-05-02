const handleToken = (token) => {
    if(!token || typeof token !== 'string') return null;
    if(!token.startsWith('Bot ')) return `Bot ${token}`;
    return token;
};

export {
    handleToken,
};