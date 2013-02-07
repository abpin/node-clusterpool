# About

**Cluster of generic pools for multi-server environments.**

This module extends [node-pool module](https://github.com/coopernurse/node-pool) providing clusters of pools. Generic resource pool module can be used to reuse or throttle expensive resources such as database connections. Cluster-pool module allows pooling connections to replicated (multi-slave) environments, rotating requests between different servers.

Each server in cluster has its own connection pool created by the module. Requests for connections are rotated between server pools. Rotation checks server pool waiting queue and omits fully used pools to rotate between non-full pools (if all pools are full, requests are distributed again to queues of all pools).

## Installation

```
$ npm install cluster-pool
```

## Usage

If you are familiar with [node-pool module](https://github.com/coopernurse/node-pool) you will recognize that there are only few changes required to switch to cluster-pool module.

### Step 1 - Create cluster pool using a factory object

```javascript
// Create a MySQL connection pool with a max of 10 connections, a min of 2
// and a 30 seconds max idle time. These settings will be used for all pools
// created for individual servers.
var ClusterPool = require('cluster-pool');

var cluster = ClusterPool.create({
  name: 'mysql',
  destroy: function(client) { client.end(); },
  max: 10,
  min: 2,
  idleTimeoutMillis : 30000
});
```

The difference to generic-pool module is that factory object doesn't contain connect function - it will be defined for each server in cluster. For documentation of factory object fields (and other pool features), please refer to [generic-pool documentation](https://github.com/coopernurse/node-pool#documentation).

### Step 2 - Add servers to the cluster

```javascript
var MySQLClient = require('mysql').Client;

// Add server to the cluster
cluster.add(function(callback) {
  var client = new MySQLClient();
  client.user = 'username';
  client.password = 'password';
  client.database = 'dbname';
  client.host = 'host 1';
  client.connect(function(err) {
    callback(err, client);  
  });
});

// Add another server to the cluster
cluster.add(function(callback) {
  var client = new MySQLClient();
  client.user = 'username';
  client.password = 'password';
  client.database = 'dbname';
  client.host = 'host 2';
  client.connect();
  client.connect(function(err) {
    callback(err, client);  
  });
});

// … repeat for as many servers as you have in cluster.
```

Add as many servers as you have in cluster. In the above example we have two servers at two different hosts added to the cluster. Each of these servers will have a separate connection pool created with settings from the factory object used to create server pool.

### Step 3 - Use cluster pool in your code to acquire/release resources

```javascript
// Acquire connection - callback function is called once a resource becomes
// available.
cluster.acquire(function(err, client, pool) {
  if (err) {
    // Handle error - this is generally the err from your create function.
  } else {
    client.query('SELECT * FROM foo', [], function() {
      // Release connection object back to the pool.
      pool.release(client);
    });
  }
});
```

If you're familiar with generic-pool, you'll see the only difference is that your callback function receives not only client connection, but also pool object for the server which has been chosen to serve your request. You use it to release client back to this specific pool after you're done.

## Run tests

```
$ npm install expresso
$ expresso -I lib test/*.js
```

The included test simulates cluster of three servers with pool of maximum 4 connections to each one. There is a simulated lag time for each of servers of 1000, 2000 and 3000 milliseconds respectively and 24 requests for connections performed every 105 milliseconds. As the requests are made, some server pools are getting full, some connections are released, and this example demonstrates how less-busy servers from cluster are chosen. In summary, server with bigger lag serves less connections than server with smaller lag.

## License

(The MIT License)

Copyright (C) 2013 Bartosz Raciborski <bartosz@raciborski.net>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.