var assert = require('assert');
var ClusterPool = require('..');

module.exports = {
  'returns pools with available connections first': function(beforeExit) {
    /*
      This creates cluster of three pools with max 4 connections in each pool.
      We simulate different performance of each pool, so connections are released
      after 1000, 2000 and 3000 miliseconds respectively from pools 0, 1 and 2.

      Then we acquire 24 connections from cluster - one connection every
      105 miliseconds, so the whole test takes about 2.5 seconds.
      
      ClusterPool should rotate pools for first 12 acquires because pools will
      open up to 4 connection each. Then it should select pools which has no
      waiting requests for clients or rotate all pools if all of them have
      waiting requests. In the summary, there should be 10 acquires from pool 0,
      8 acquires from pool 1 and 6 acquires from pool 2 because of the timings
      we use.
    */
    var createCounts = [0, 0, 0];
    var acquireCounts = [0, 0, 0];
    var acquireHistory = '';
    var factory = {
      max: 4,
      idleTimeoutMillis : 1000,
      destroy  : function(client) {}
    }
    
    var clusterPool = ClusterPool.create(factory);
    
    clusterPool.add(function(callback) {
      callback(null, {pool: 0, count: createCounts[0]++});
    });
    clusterPool.add(function(callback) {
      callback(null, {pool: 1, count: createCounts[1]++});
    });
    clusterPool.add(function(callback) {
      callback(null, {pool: 2, count: createCounts[2]++});
    });

    function open() {
      clusterPool.acquire(function(err, client, pool) {
        acquireCounts[client.pool]++;
        acquireHistory += client.pool
        setTimeout(function() {
          pool.release(client);
        }, ((client.pool+1) * 1000));
      });
    }
        
    for (var i = 0; i < 24; i++) {
      setTimeout(open, i * 105);
    }
    
    
    beforeExit(function() {
      assert.equal(4, createCounts[0]);
      assert.equal(4, createCounts[1]);
      assert.equal(4, createCounts[2]);
      assert.equal(10, acquireCounts[0]);
      assert.equal(8, acquireCounts[1]);
      assert.equal(6, acquireCounts[2]);
      
      assert.equal('012012012012000010101122', acquireHistory);
    });
  }
}