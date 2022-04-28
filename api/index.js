const Router = require("express").Router();

Router.use("/blogs", require("./blogs"));
Router.use("/testRedis", require("./testRedis"));

Router.use((req, res, next) => {
    const error = new Error("Not found");
    error.status = 404;
    next(error);
});

module.exports = Router;