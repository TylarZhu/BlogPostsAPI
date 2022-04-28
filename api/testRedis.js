const router = require("express").Router();
const redisClient = require("../db");

router.get('/', async (req, res, next) => {
    try {
        
        // redisClient.lPush("blog", JSON.stringify({name: "tylar", age: 16, email: "zhuxingyuan@gmail.com"}));
    

        // redisClient.lPush("blog", JSON.stringify({name: "angel", age: 16, email: "aningzhou@gmail.com"}));

        // const iterationParams = {
        //     MATCH: "*",
        //     COUNT: 100
        // };
    
        // for await (const key of redisClient.scanIterator(iterationParams)) {
        //     console.log(key);
        // }

        // redisClient.dbSize().then(data => console.log(data));
        // redisClient.rPop("blog", (err, reply) => {
        //     if(err) console.log(err);
        //     console.log("pop element name: " + reply);
        // });
    } catch (err) {
        next(err);
    }
})

module.exports = router;