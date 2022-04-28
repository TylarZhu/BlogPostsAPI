
const router = require("express").Router();
const Sort = require('fast-sort');
const axios = require('axios');
// const cache = require('memory-cache');
const bodyParser = require('body-parser');
const redisClient = require("../db");


const SortBy = ["id", "reads", "likes", "popularity"];
const Direction = ["desc", "asc"];

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/ping', function(req, res, next) {
    res.status(200).json({"success" : true});
});

router.get('/post', function(req, res, next) {    
    try {
        const { tags, sortBy, direction } = req.query;

        if(tags === "" || typeof tags === "undefined") {
            return res.status(400).json({"error": "Tags parameter is required"});
        } else if (direction !== "" && !Direction.includes(direction)) {
            return res.status(400).json({"error": "direction parameter is invalid"});
        } else if(sortBy !== "" && !SortBy.includes(sortBy)) {
            return res.status(400).json({"error": "sortBy parameter is invalid"});
        } else {
            let tagList = tags.split(",");
            
            // remove empty tags
            for(let i = tagList.length - 1; i >= 0 ; i --) {
                if(tagList[i] === '') {
                    tagList.splice(i, 1);
                }
            }

            // if all tags are removed, then there are no tags presented
            if(tagList.length === 0) {
                return res.status(400).json({"error": "Tags parameter is required"});
            }

            tagList = Sort.sort(tagList).asc();

            let element = {};
            element["tags"] = tags;

            

            
        }
    } catch (err) {
        next(err);
    }
    // // check conditions
    // if(tags === '' || typeof tags === "undefined") {
    //     return res.status(400).json({"error": "Tags parameter is required"});
    // } else if (direction !== undefined && !Direction.includes(direction)) {
    //     return res.status(400).json({"error": "direction parameter is invalid"});
    // } else if(sortBy !== undefined && !SortBy.includes(sortBy)) {
    //     return res.status(400).json({"error": "sortBy parameter is invalid"});
    // } else {
    //     let tags = queryObject.tags.split(',');
    //     let result = [], sortResult = [];
    //     let keyVal = "";

    //     // remove empty tags
    //     for(let i = tags.length - 1; i >= 0 ; i --) {
    //         if(tags[i] === '') {
    //             tags.splice(i, 1);
    //         }
    //     }

    //     // if all tags are removed, then there are no tags presented
    //     if(tags.length === 0) {
    //         return res.status(400).json({"error": "Tags parameter is required"});
    //     }

    //     // concat all tags for future cache use 
    //     for(let tag of tags) {
    //         keyVal = keyVal.concat(tag, ",");
    //     }

    //     // check if similar calls performed before
    //     let obj = checkTagsinCache(tags);
    //     if(obj.flag && redisClient.get(obj.key).sortBy === sortBy && redisClient.get(obj.key).direction === direction){
    //         console.log(1);
    //         return res.status(200).json({"posts": redisClient.get(obj.key).posts});
    //     } else {
    //         // perform async multiple requests and return a Promise object contain all the posts.
    //         let response = tags.map((tag) => {
    //             let link = "https://api.hatchways.io/assessment/blog/posts?tag=" + tag;
    //             return axios.get(link);
    //         });

    //         // loop though the responses and add post into array
    //         Promise.all(response).then(function (payload){
    //             payload.map(function(val) {
    //                 for(let post of val.data.posts) {
    //                     result.push(post);
    //                 }
    //             });

    //             // sort the array corresponding to sortBy and direction
    //             if(direction === "desc") {
    //                 if(sortBy === "popularity") sortResult = Sort.sort(result).desc(o => o.popularity);
    //                 else if(sortBy === "reads") sortResult = Sort.sort(result).desc(o => o.reads);
    //                 else if(sortBy === "likes") sortResult = Sort.sort(result).desc(o => o.likes);
    //                 else sortResult = Sort.sort(result).desc(o => o.id);
    //             } else {
    //                 if(sortBy === "popularity") sortResult = Sort.sort(result).asc(o => o.popularity);
    //                 else if(sortBy === "reads") sortResult = Sort.sort(result).asc(o => o.reads);
    //                 else if(sortBy === "likes") sortResult = Sort.sort(result).asc(o => o.likes);
    //                 else sortResult = Sort.sort(result).asc(o => o.id);
    //             }
                
    //             //remove the duplicate post in the array
    //             for(let i = sortResult.length - 1; i > 0 ; i --) {
    //                 if(sortResult[i].id === sortResult[i - 1].id) {
    //                     sortResult.splice(i, 1);
    //                 }
    //             }

    //             //save up to five calls.
    //             //if new call excced the limit, then delete the oldest call in cache.
    //             redisClient.dbSize().then((size) => {
    //                 if(size > 4) {
    //                     redisClient.del();
    //                 }
    //                 //save the new call into cache.
    //                 redisClient.lPush("blogs", JSON.stringify({key: keyVal, "sortBy": sortBy, "direction": direction, "posts": sortResult}));
    //                 // cache.put(keyVal, {"sortBy": sortBy, "direction": direction, "posts": sortResult, "timestamp": new Date().getTime()});
    //                 return res.status(200).json({"posts": sortResult});
    //             });
    //         }).catch(function(err) {
    //             return res.status(500).json({"error": err.message});
    //         });
    //     } 
    // }
});

function deleteRecentCall(){
    // let allKeys = cache.keys();
    // let a = [];
    // for(let i = 0; i < allKeys.length; i ++) {
    //     a.push({"key": allKeys[i], "timestamp": parseInt(cache.get(allKeys[i]).timestamp)});
    // }

    // let sortR = Sort.sort(a).asc(o => o.timestamp);
    // cache.del(sortR.shift().key);
    // return true;
    
}

// redisScan({
//     redis: redisClient,
//     each_callback: (type, key, subkey, length, value, cb) => {
//         console.log(type, key, subkey, length, value);
//         cb();
//     },
//     done_callback: (err) => {
//         console.log(err);
//     }
// });

let checkTagsinCache = async (tags) => {
    let cacheKeys = [];

    const iterationParams = {
        MATCH: "*",
        COUNT: 100
    };

    for await (const key of redisClient.scanIterator(iterationParams)) {
        cacheKeys.push(key);
    }

    console.log(cacheKeys);

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

let recursiveFunction = function (arr, x, start, end) {
      
    // Base Condition
    if (start > end) return false;
  
    // Find the middle index
    let mid=Math.floor((start + end)/2);
  
    // Compare mid with given key x
    if (arr[mid]===x) return true;
         
    // If element at mid is greater than x,
    // search in the left half of mid
    if(arr[mid] > x)
        return recursiveFunction(arr, x, start, mid-1);
    else
 
        // If element at mid is smaller than x,
        // search in the right half of mid
        return recursiveFunction(arr, x, mid+1, end);
}

module.exports = router;