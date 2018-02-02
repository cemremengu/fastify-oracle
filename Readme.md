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

## License

[MIT License](http://jsumners.mit-license.org/)
