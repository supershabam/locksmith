locksmith
=========

distributed locking mechanism using redis

## use case
I am trying to maximize the number of calls I can make to the 
rate-limited Twitter API. I would like to cache my twitter results
so that I can serve data from cache in the future


example
-------

```javascript
var locksmith = require('locksmith')({
  redis_host: 'localhost',
  redis_prefix: '__locksmith:',
  timeout: 2 * 60 * 1000 // 2 minutes
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