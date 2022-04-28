const http = require('http');
const app = require("../server");
const redisClient = require("../db");

const PORT = 3000;
const server = http.createServer(app).listen(PORT, async function (err) {
    if (err) console.log(err);
    else {
        await redisClient.connect(); 
        console.log("HTTP server on http://localhost:%s", PORT);
    }
});
;