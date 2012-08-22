locksmith
=========

distributed locking mechanism using redis

## use case
I am trying to maximize the number of calls I can make to the 
rate-limited Twitter API. I cache the results, but often I
fire off additional requests to the API for the same data 
before I finish populating the cache.

I want to hit the API only if the data is not in cache AND no other
server is currently working to populate the cache.

## api
```javascript
var locksmith = require('locksmith')({
  host: String (optional) - defaults to 'localhost'
  port: Integer (optional) - defaults to 6379
  prefix: String (optional) - defaults to '__locksmith:'
  timeout: Integer (optional) - given in seconds defaults to 120 (two minutes)
});

/**
 * locksmith is a function
 * 
 * key - the system-wide keyname to lock on (defaults to '')
 * callback - function to execute (the critical code) when you have the lock
 *  callback = function(err, release)
 *  - release is a function that you MUST call when you are done with the lock
 */
locksmith([key], callback)
```


example
-------

```javascript
var locksmith = require('locksmith')({
  timeout: 120 // 2 minutes
});

// locks are aquired on strings, when this is omitted, you lock
// on the '' string
locksmith(function(err, release) {
  // no need to release if there is an error
  if (err) return console.error('something went wrong aquiring the lock!', err);
  
  // I am the only one running in the ENTIRE application (even on other servers)
  doSomething();
  
  // I'm done now, so let somebody else go
  release();
});

// let's lock to something more specific, like our api call
var twitterId = '37344436';
twitterCache.contains(twitterId, function(err, inCache, data) {
  if (inCache) return doStuffWithTwitterCacheData(data);
  
  // didn't have the data, so let's aquire a lock on populating data
  locksmith('cache:' + twitterId, function(err, release) {
    if (err) return console.error(err);
    
    // it could be we were not the first to lock, so the cache may be populated now
    twitterCache.contains(twitterId, function(err, inCache, data) {
      if (inCache) {
        release(); // release as soon as possible
        return doStuffWithTwitterCacheData(data);
      }
      
      // alright, the cache is indeed empty, and we do have the lock
      twitterService.populateCache(twitterId, function(err) {
        release(); // always release even when error
        
        if (err) return console.error(err);
      });
    });
  });
});
```

## similar projects
https://github.com/PatrickTulskie/redis-lock

## locking with redis
http://redis.io/commands/setnx
 
## license
(c) Copyright 2012, Ian Hansen (MIT Licensed).
See LICENSE for more info.
