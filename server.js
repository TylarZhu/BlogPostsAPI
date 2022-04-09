const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const url = require('url');
const Sort = require('fast-sort');
const axios = require('axios');
const cache = require('memory-cache');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

let SortBy = ["id", "reads", "likes", "popularity", ""];
let Direction = ["desc", "asc", ""];

app.get('/favicon.ico', (req, res, next) => res.status(200));

app.get('/api/ping', function(req, res, next) {
    res.status(200).json({"success" : true});
});

app.get('/api/post', function(req, res, next) {    
    let queryObject = url.parse(req.url, true).query;
    let sortBy = queryObject.sortBy;
    let direction = queryObject.direction;

    // check conditions
    if(queryObject.tags === '' || queryObject.tags === undefined) {
        return res.status(400).json({"error": "Tags parameter is required"});
    } else if (direction !== undefined && !Direction.includes(direction)) {
        return res.status(400).json({"error": "direction parameter is invalid"});
    } else if(sortBy !== undefined && !SortBy.includes(sortBy)) {
        return res.status(400).json({"error": "sortBy parameter is invalid"});
    } else {
        let tags = queryObject.tags.split(',');
        let result = [], sortResult = [];
        let keyVal = "";

        // remove empty tags
        for(let i = tags.length - 1; i >= 0 ; i --) {
            if(tags[i] === '') {
                tags.splice(i, 1);
            }
        }

        // if all tags are removed, then there are no tags presented
        if(tags.length === 0) {
            return res.status(400).json({"error": "Tags parameter is required"});
        }

        // concat all tags for future cache use 
        for(let tag of tags) {
            keyVal = keyVal.concat(tag, ",");
        }

        // check if similar calls performed before
        let obj = checkTagsinCache(tags);
        if(obj.flag && cache.get(obj.key).sortBy === sortBy && cache.get(obj.key).direction === direction){
            console.log(1);
            return res.status(200).json({"posts": cache.get(obj.key).posts});
        } else {
            // perform async multiple requests and return a Promise object contain all the posts.
            let response = tags.map((tag) => {
                let link = "https://api.hatchways.io/assessment/blog/posts?tag=" + tag;
                return axios.get(link);
            });

            // loop though the responses and add post into array
            Promise.all(response).then(function (payload){
                payload.map(function(val) {
                    for(let post of val.data.posts) {
                        result.push(post);
                    }
                });

                // sort the array corresponding to sortBy and direction
                if(direction === "desc") {
                    if(sortBy === "popularity") sortResult = Sort.sort(result).desc(o => o.popularity);
                    else if(sortBy === "reads") sortResult = Sort.sort(result).desc(o => o.reads);
                    else if(sortBy === "likes") sortResult = Sort.sort(result).desc(o => o.likes);
                    else sortResult = Sort.sort(result).desc(o => o.id);
                } else {
                    if(sortBy === "popularity") sortResult = Sort.sort(result).asc(o => o.popularity);
                    else if(sortBy === "reads") sortResult = Sort.sort(result).asc(o => o.reads);
                    else if(sortBy === "likes") sortResult = Sort.sort(result).asc(o => o.likes);
                    else sortResult = Sort.sort(result).asc(o => o.id);
                }
                
                //remove the duplicate post in the array
                for(let i = sortResult.length - 1; i > 0 ; i --) {
                    if(sortResult[i].id === sortResult[i - 1].id) {
                        sortResult.splice(i, 1);
                    }
                }

                //save up to five calls.
                //if new call excced the limit, then delete the oldest call in cache.
                if(cache.size() > 4) {
                    deleteRecentCall();
                }

                //save the new call into cache.
                cache.put(keyVal, {"sortBy": sortBy, "direction": direction, "posts": sortResult, "timestamp": new Date().getTime()});
                return res.status(200).json({"posts": sortResult});
            }).catch(function(err) {
                return res.status(500).json({"error": err.message});
            });
        } 
    }
});

function deleteRecentCall(){
    let allKeys = cache.keys();
    let a = [];
    for(let i = 0; i < allKeys.length; i ++) {
        a.push({"key": allKeys[i], "timestamp": parseInt(cache.get(allKeys[i]).timestamp)});
    }

    let sortR = Sort.sort(a).asc(o => o.timestamp);
    cache.del(sortR.shift().key);
    return true;
}

function checkTagsinCache(tags){
    let cacheKeys = cache.keys();
    let i = 0;
    let flag = false;
    
    for(let j = 0; j < tags.length && i < cacheKeys.length;) {
        let cacheTag = cacheKeys[i].split(',');
        if(!cacheTag.includes(tags[j])){
            i ++;
            flag = false;
        } else {
            j ++;
            flag = true;
        }
    }
    return {"flag": flag, "key": cacheKeys[i]};
}


const PORT = 3000;
const server = http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    // else console.log("HTTP server on http://localhost:%s", PORT);
});
module.exports = server;
