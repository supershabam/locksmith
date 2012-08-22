'use strict';

/**
 * The locking algorithm used in this is described here: http://redis.io/commands/setnx
 */
var redis = require('redis')
  , moment = require('moment')
  ;

function Locksmith(options) {
  var host, port, prefix, timeout, retries;
  
  options = options || {};
  host = options.host || null;
  port = options.port || null;
  prefix = options.prefix || '__locksmith:';
  timeout = options.timeout || 10;
  retries = options.retries || 100;

  delete options.host;
  delete options.port;
  delete options.prefix;
  delete options.timeout;

  if (options.redisClient) {
    this._redisClient = options.redisClient;
  } else {
    this._redisClient = redis.createClient(host, port, options);
  }

  this._prefix = prefix;
  this._timeout = timeout;
  this._retries = retries;
}

Locksmith.prototype.lock = function(key, cb) {
  var retries = 0
    , _this = this
    , fullKey
    ;

  if (typeof(key) === 'function') {
    cb = key;
    key = '';
  }
  fullKey = this._prefix + key;

  (function aquire() {
    var expires = moment().add('seconds', _this._timeout).unix();
    _this._redisClient.setnx(fullKey, expires, function handleSetnx(err, response) {
      if (err) return cb(err);

      // if we aquired the lock
      if (response === 1) {
        return cb(null, _this._release.bind(_this, key, expires));
      }

      // otherwise let's check if the lockholder is expired
      _this._redisClient.get(fullKey, function handleGet(err, keyExpires) {
        if (err) return cb(err);

        function retry() {
          if (retries++ > _this._retries) {
            return cb(new Error('maximum retries hit while aquiring lock for: ' + key));
          }
          setTimeout(aquire, 1000);
        }

        // if the key has not expired
        if (moment().unix() < keyExpires) {
          return retry();
        } else { // try and aquire expired lock
          expires = moment().add('seconds', _this._timeout).unix();
          _this._redisClient.getset(fullKey, expires, function handleGetSet(err, keyExpires) {
            if (err) return cb(err);

            // if the key is no longer expired, somebody else grabbed it, get back in line
            if (moment().unix() < keyExpires) {              
              return retry();
            }

            // we got the lock!
            return cb(null, _this._release.bind(_this, key, expires));
          });
        }
      });
    });
  })();
};

Locksmith.prototype._release = function(key, expires) {
  var fullKey = this._prefix + key
    , _this = this
    ;

  // nice! we finished before somebody tries to expires us
  if (moment().unix() < expires) {
    this._redisClient.del(fullKey, function handleDel(err) {
      if (err) return console.error(err);
    });
  } else {
    // it's too late, the lock is already being fought for
    console.error('you released your lock too late on key: ' + key);    
  }
};

/**
 * options = {
 *   redisClient: (optional) - already instantiated redis client (host, port, args will not be used in this case)
 *   host: String (optional) - defaults to 'localhost'
 *   port: Integer (optional) - defaults to 6379
 *   prefix: String (optional) - defaults to '__locksmith:'
 *   timeout: Positive Integer (optional) - seconds for timeout defaults to (120) two minutes
 *   args: any additional arguments are passed to redis.createClient as options
 * }
 */
module.exports = function(options) {
  var locksmith = new Locksmith(options);
  return locksmith.lock.bind(locksmith);
};
module.exports.Locksmith = Locksmith;