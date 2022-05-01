
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

router.get('/post', (req, res, next) => {    
    try {
        const { tags, sortBy, direction } = req.query;

        if(tags === "" || typeof tags === "undefined") {
            return res.status(400).json({"error": "Tags parameter is required"});
        } else if (typeof direction !== "undefined" && !Direction.includes(direction)) {
            return res.status(400).json({"error": "direction parameter is invalid"});
        } else if(typeof sortBy !== "undefined" && !SortBy.includes(sortBy)) {
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
            element["tags"] = tagList;

            redisClient.lRange("blogs", 0, -1).then((reply) => {
                for(let i = 0; i < reply.length; i ++) {
                    let data = JSON.parse(reply[i]);
                    let flag = false;
                    for(let i = 0; i < tagList.length; i ++) {
                        if(!binarySearch(data.tags, tagList[i], 0, data.tags.length)) {
                            flag = true;
                            break;
                        }
                    }
                    // if tag value is in cache, then return the result to user
                    if(!flag && data.sortBy === sortBy && data.direction === direction) {
                        console.log("Cashe hit!")
                        return res.status(200).json({"posts": data.posts});
                    }
                    
                }
                //perform async multiple requests and return a Promise object contain all the posts.
                let response = tagList.map((tag) => {
                    let link = "https://api.hatchways.io/assessment/blog/posts?tag=" + tag;
                    return axios.get(link);
                });

                // loop though the responses and add post into array
                Promise.all(response).then(function (payload){
                    let result = payload[0].data.posts, sortResult = [];
                    
                    // O(nlogn) <==== 
                    for(let i = 1; i < payload.length; i ++) {
                        console.log(payload[i].data.posts);
                        if(!binarySearchId(result, payload[i].data.posts.id, 0, result.length)) {
                            result.push(payload[i]);
                        }
                    }

                    // sort the array corresponding to sortBy and direction
                    if(typeof sortBy !== "undefined" && typeof direction !== "undefined") {
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
                    }

                    element["sortBy"] = sortBy;
                    element["direction"] = direction;
                    element["posts"] = sortResult;

                    //save it to cache
                    redisClient.lPush("blogs", JSON.stringify(element)).then((response) => {
                        // if the length of cache is larger then 5, then pop it.
                        redisClient.lLen("blogs").then((len) => {
                            if(len >  5) {
                                redisClient.rPop("blogs").then((item) => {
                                    console.log("item poped: " + item);
                                    return res.status(200).json({"posts": element["posts"]});
                                });
                            } else return res.status(200).json({"posts": element["posts"]});
                        });
                    });                    
                }).catch(function(err) {
                    return res.status(500).json({"error": err.message});
                });
            }).catch((err) => {
                return console.log(err);
            });    
        }
    } catch (err) {
        next(err);
    }
});

let binarySearch = (arr, x, start, end) => {
      
    // Base Condition
    if (start > end) return false;
  
    // Find the middle index
    let mid=Math.floor((start + end)/2);
  
    // Compare mid with given key x
    if (arr[mid]===x) return true;
         
    // If element at mid is greater than x,
    // search in the left half of mid
    if(arr[mid] > x)
        return binarySearch(arr, x, start, mid-1);
    else
 
        // If element at mid is smaller than x,
        // search in the right half of mid
        return binarySearch(arr, x, mid+1, end);
}

let binarySearchId = (arr, x, start, end) => {
      
    // Base Condition
    if (start > end) return false;
  
    // Find the middle index
    let mid=Math.floor((start + end)/2);
  
    // Compare mid with given key x
    if (arr[mid].id === x) return true;
         
    // If element at mid is greater than x,
    // search in the left half of mid
    if(arr[mid].id > x)
        return binarySearch(arr, x, start, mid-1);
    else
 
        // If element at mid is smaller than x,
        // search in the right half of mid
        return binarySearch(arr, x, mid+1, end);
}

module.exports = router;