# fastify-oracle
[![Greenkeeper badge](https://badges.greenkeeper.io/cemremengu/fastify-oracle.svg)](https://greenkeeper.io/)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![Build Status](https://travis-ci.org/cemremengu/fastify-oracle.svg?branch=master)](https://travis-ci.org/cemremengu/fastify-oracle) [![Coverage Status](https://coveralls.io/repos/github/cemremengu/fastify-oracle/badge.svg?branch=master)](https://coveralls.io/github/cemremengu/fastify-oracle?branch=master)

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
  let conn
  try {
    conn = await this.oracle.getConnection()
    const result = await conn.execute('select 1 as foo from dual')  
    return result.rows
  } finally {
    if (conn) {
      conn.close().catch((err) => {})
    }
  }  
})

fastify.listen(3000, (err) => {
  if (err) {
    fastify.log.error(err)
    // Manually close since Fastify did not boot correctly.
    fastify.close(err => {
      process.exit(1)
    })
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
+ `name`: can be used in order to connect to multiple oracledb instances. The first registered instance can be accessed via `fastify.oracle` or `fastify.oracle.<dbname>`. Note that once you register a *named* instance, you will *not* be able to register an unnamed instance.
+ `jsonOutput`: sets the `outFormat` of oracledb to `OBJECT` (default: `false` i.e: `ARRAY`)

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
  let conn
  try {
    conn = await this.oracle.ora1.getConnection()
    const result = await conn.execute('select 1 as foo from dual')  
    return result.rows
  } finally {
    if (conn) {
      conn.close().catch((err) => {})    
    }
  } 
})

fastify.get('/db_2_data', async function (req, reply) {
  let conn
  try {
    conn = await this.oracle.ora2.getConnection()
    const result = await conn.execute('select 1 as foo from dual')  
    return result.rows
  } finally {
    if (conn) {
      conn.close().catch((err) => {})    
    }
  }
})
```

The `oracledb` instance is also available via `fastify.oracle.db` for accessing constants and other functionality:

```js
fastify.get('/db_data', async function (req, reply) {
  let conn
  try {
    conn = await this.oracle.ora1.getConnection()
    const result = await conn.execute('select 1 as foo from dual', { }, { outFormat: this.oracle.db.OBJECT })
    return result.rows
  } finally {
    if (conn) {
      conn.close().catch((err) => {})    
    }
  } 
})
```

If needed `pool` instance can be accessed via `fastify.oracle[.dbname].pool`

## License

[MIT License](http://jsumners.mit-license.org/)

## Acknowledgements

Thanks to 
- [James Sumners](https://github.com/jsumners), who is the original author of this plugin, for his work and transferring his repository to me.
- [Vincit](https://github.com/Vincit/travis-oracledb-xe) for his Travis Oracle work.
