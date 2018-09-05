# fastify-oracle
[![Build Status](https://travis-ci.org/jsumners/fastify-oracle.svg?branch=master)](https://travis-ci.org/jsumners/fastify-oracle)

This module provides access to an Oracle database connection pool via the
[oracledb](https://npm.im/oracledb) module. It decorates the [Fastify](https://fastify.io)
instance with an `oracle` property that is a connection pool instance.

When the Fastify server is shutdown, this plugin invokes the `.close()` method
on the connection pool.

## Example

```js
const fastify = require('fastify')()

fastify.register(require('fastify-oracle'), {
  pool: {
    user: 'foo',
    password: 'bar',
    connectString: 'oracle.example.com:1521/foobar'
  }
})

fastify.get('/db_data', async function (req, reply) {
  const conn = await this.oracle.getConnection()
  const results = await conn.execute('select 1 as foo from dual')
  await conn.close()
  return results
})

fastify.listen(3000, (err) => {
  if (err) {
    fastify.log.error(err)
    // Manually close since Fastify did not boot correctly.
    fastify.oracle.close()
    process.exit(1)
  }

  // Initiate Fastify's shutdown procedure so that the plugin will
  // automatically close the connection pool.
  process.on('SIGTERM', fastify.close.bind(fastify))
})
```

## Options

`fastify-oracle` requires an options object with at least one of the following
properties:

+ `pool`: an `oracledb` [pool configuration object](https://github.com/oracle/node-oracledb/blob/33331413/doc/api.md#createpool)
+ `poolAlias`: the name of a pool alias that has already been configured. This
takes precedence over the `pool` option.
+ `client`: an instance of an `oracledb` connection pool. This takes precedence
over the `pool` and `poolAlias` options.

A `name` option can be used in order to connect to multiple oracledb instances. 
The first registered instance can be accessed via `fastify.oracle` or `fastify.oracle.<dbname>`. Note that once you register a *named* instance, you will *not* be able to register an unnamed instance.

```js
const fastify = require('fastify')()

fastify
  .register(require('fastify-oracle'), {
    pool: {
      user: 'foo',
      password: 'bar',
      connectString: 'oracle.example.com:1521/ora1'
    },
    name: 'ora1'
  })
  .register(require('fastify-oracle'), {
    pool: {
      user: 'foo',
      password: 'bar',
      connectString: 'oracle.example.com:1521/ora2'
    },
    name: 'ora2'
  })

fastify.get('/db_1_data', async function (req, reply) {
  const conn = await this.oracle.ora1.getConnection()
  const results = await conn.execute('select 1 as foo from dual')
  await conn.close()
  return results
})

fastify.get('/db_2_data', async function (req, reply) {
  const conn = await this.oracle.ora2.getConnection()
  const results = await conn.execute('select 1 as foo from dual')
  await conn.close()
  return results
})
```

The `oracledb` instance is also available via `fastify.oracle.db` for accessing constants and other functionality:

```js
fastify.get('/db_data', async function (req, reply) {
  const conn = await this.oracle.getConnection()
  const results = await conn.execute('select 1 as foo from dual', { }, { outFormat: this.oracle.db.OBJECT })
  await conn.close()
  return results
})
```

If needed `pool` instance can be accessed via `fastify.oracle[.dbname].pool`

## License

[MIT License](http://jsumners.mit-license.org/)

## Acknowledgements

Thanks to [James Sumners](https://github.com/jsumners) for his work and transferring his repository to me.
