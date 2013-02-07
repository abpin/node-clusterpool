var PoolModule = require('generic-pool');

module.exports = {
  /**
   * Create new cluster of pools with a specified factory.
   *
   * Factory object is compatible with generic-pool module factory object,
   * except that it shouldn't include factory.create method.
   * Factory docs copypasted from generic-pool module docs:
   *
   * @param {Object} factory
   *   Factory to be used for generating and destorying the items.
   * @param {String} factory.name
   *   Name of the factory. Serves only logging purposes.
   * @param {Function} factory.destroy
   *   Should gently close any resources that the item is using.
   *   Called before the items is destroyed.
   * @param {Function} factory.validate
   *   Should return true if connection is still valid and false
   *   If it should be removed from pool. Called before item is
   *   acquired from pool.
   * @param {Number} factory.max
   *   Maximum number of items that can exist at the same time.  Default: 1.
   *   Any further acquire requests will be pushed to the waiting list.
   * @param {Number} factory.min
   *   Minimum number of items in pool (including in-use). Default: 0.
   *   When the pool is created, or a resource destroyed, this minimum will
   *   be checked. If the pool resource count is below the minimum, a new
   *   resource will be created and added to the pool.
   * @param {Number} factory.idleTimeoutMillis
   *   Delay in milliseconds after the idle items in the pool will be destroyed.
   *   And idle item is that is not acquired yet. Waiting items doesn't count here.
   * @param {Number} factory.reapIntervalMillis
   *   Cleanup is scheduled in every `factory.reapIntervalMillis` milliseconds.
   * @param {Boolean|Function} factory.log
   *   Whether the pool should log activity. If function is specified,
   *   that will be used instead. The function expects the arguments msg, loglevel
   * @param {Number} factory.priorityRange
   *   The range from 1 to be treated as a valid priority
   * @param {RefreshIdle} factory.refreshIdle
   *   Should idle resources be destroyed and recreated every idleTimeoutMillis? Default: true.
   *
   * @returns {Object} An ClusterPool object that works with the supplied `factory`.
   */   
  create: function ClusterPool(factory) {
    var cluster = [];
    var index = 0;

    /**
     * Adds server to the cluster. This should be called once for each server
     * you want to add to the cluster.
     *
     * @param {Function} create Should create the item to be acquired,
     *   and call it's first callback argument with the generated item as its
     *   argument.
     */
    this.add = function(create) {
      var pool_factory = {};
      for (i in factory) {
        pool_factory[i] = factory[i];
      }
      pool_factory.create = create;
      cluster.push(PoolModule.Pool(pool_factory));
    }
    
    /**
     * Requests a new client from cluster pool. The callback will be called
     * when a new client will be available, passing the client to it.
     * Selected pool will also be passed so that you can release the client
     * to the pool after use.
     *
     * @param {Function} callback(err, client, pool)
     *   Callback function to be called after the acquire is successful.
     * @param {Number} priority
     *   Optional.  Integer between 0 and (priorityRange - 1).  Specifies the priority
     *   of the caller if there are no available resources.  Lower numbers mean higher
     *   priority.
     * @returns {Object} `true` if pools are not fully utilized, `false` otherwise.
     */
    this.acquire = function(callback, priority) {
      if (cluster.length === 0) {
        return callback(new Error('No servers added to cluster yet'));
      }
      
      var tryIndex = index;
      var useIndex;
      
      var looped = false;
  
      /** Requests for clients are rotated between pools in cluster. This
        * selects next pool from cluster that doesn't have clients waiting
        * in the queue (or simply the next pool if all have waiting clients).
        */
      while (typeof useIndex === 'undefined' && (tryIndex != index || !looped)) {
        if (cluster[tryIndex].waitingClientsCount() == 0) {
          useIndex = tryIndex;
        } else {
          if (++tryIndex >= cluster.length) {
            tryIndex = 0;
            looped = true;
          }
        }
      }
      
      if (typeof useIndex === 'undefined') {
        useIndex = tryIndex;
      }
      
      var pool = cluster[useIndex];
      
      index = ++useIndex >= cluster.length ? 0 : useIndex;
  
      return pool.acquire(function(err, client) {
        return callback(err, client, pool);
      });
    }

    return this;
  }
    
}