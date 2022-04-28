const express = require('express');
const app = express();

app.get('/favicon.ico', (req, res, next) => res.status(200));

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url);
    next();
});

app.use("/api", require("./api"));

app.use((err, req, res, next) => {
    console.log(err);
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    res.status(err.status || 500);
    res.json({error: err.message});
});

module.exports = app;