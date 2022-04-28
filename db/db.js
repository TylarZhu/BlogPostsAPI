const Redis = require("redis");
const redisClient = Redis.createClient();

module.exports = redisClient;

