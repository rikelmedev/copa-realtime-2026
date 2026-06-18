const Redis = require('ioredis');

const publisher = new Redis(process.env.REDIS_URL);

publisher.on('connect', () => console.log('Redis publisher conectado'));
publisher.on('error', (err) => console.error('Redis publisher erro:', err));

module.exports = { publisher };
