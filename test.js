'use strict'

const test = require('tap').test
const plugin = require('./plugin')
const Fastify = require('fastify')
const oracledb = require('oracledb')
const poolOptions = {
  user: 'travis',
  password: 'travis',
  connectString: 'localhost/xe'
}

test('creates pool from config', (t) => {
  t.plan(9)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.getConnection((err, conn) => {
      t.error(err)
      conn.execute('SELECT 1 AS FOO FROM DUAL', {}, { outFormat: fastify.oracle.db.OBJECT }, (err, result) => {
        t.error(err)
        t.is(result.rows.length, 1)
        t.is(result.rows[0].FOO, 1)
        conn.close(err => {
          t.error(err)

          fastify.close(err => {
            t.error(err)
            t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
          })
        })
      })
    })
  })
})

test('creates named pool from config', (t) => {
  t.plan(11)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, name: 'testdb' })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)
    t.ok(fastify.oracle.testdb.pool)

    fastify.oracle.testdb.getConnection((err, conn) => {
      t.error(err)

      conn.execute('SELECT 1 AS FOO FROM DUAL', {}, { outFormat: fastify.oracle.db.OBJECT }, (err, result) => {
        t.error(err)
        t.is(result.rows.length, 1)
        t.is(result.rows[0].FOO, 1)
        conn.close(err => {
          t.error(err)

          fastify.close(err => {
            t.error(err)
            t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
            t.is(fastify.oracle.testdb.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
          })
        })
      })
    })
  })
})

test('accepts singleton client', (t) => {
  t.plan(7)
  oracledb.createPool(poolOptions, (err, pool) => {
    t.error(err)

    const fastify = Fastify()
    fastify.register(plugin, { client: pool })

    fastify.ready(err => {
      t.error(err)
      t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_OPEN)
      t.is(fastify.oracle.db, oracledb)
      t.is(fastify.oracle.pool, pool)
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('sets OBJECT as default outFormat', (t) => {
  t.plan(9)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.getConnection((err, conn) => {
      t.error(err)
      conn.execute('SELECT 1 AS FOO FROM DUAL', (err, result) => {
        t.error(err)
        t.is(result.rows.length, 1)
        t.is(result.rows[0].FOO, 1)
        conn.close(err => {
          t.error(err)

          fastify.close(err => {
            t.error(err)
            t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
          })
        })
      })
    })
  })
})

test('retrieves a cached pool', (t) => {
  t.plan(7)

  const opts = Object.assign({}, poolOptions)
  oracledb.createPool(Object.assign(opts, { poolAlias: 'foo' }), (err, pool) => {
    t.error(err)

    const fastify = Fastify()
    fastify.register(plugin, { poolAlias: 'foo' })

    fastify.ready(err => {
      t.error(err)
      t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_OPEN)
      t.is(fastify.oracle.db, oracledb)
      t.is(fastify.oracle.pool, pool)
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('client must be instance of oracledb.pool', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(plugin, { client: 'hello world' })

  fastify.ready(err => {
    t.is(err.message, 'fastify-oracle: supplied client must be an instance of oracledb.pool')
    fastify.close()
  })
})

test('duplicate connection names should throw', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify
    .register(plugin, { pool: poolOptions, name: 'testdb' })
    .register(plugin, { pool: poolOptions, name: 'testdb' })

  fastify.ready(err => {
    t.is(err.message, 'fastify-oracle: connection name "testdb" has already been registered')
    fastify.close()
  })
})

test('duplicate plugin registration should throw', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify
    .register(plugin, { pool: poolOptions })
    .register(plugin, { pool: poolOptions })

  fastify.ready(err => {
    t.is(err.message, 'fastify-oracle has already been registered')
    fastify.close()
  })
})

test('should throw if no pool option is provided', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(plugin, {})
  fastify.ready(err => {
    t.is(err.message, 'fastify-oracle: must supply options.pool oracledb pool options')
    fastify.close()
  })
})

test('should throw if could not get pool alias', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(plugin, { poolAlias: 'test' })

  fastify.ready(err => {
    t.match(err.message, 'fastify-oracle: could not get pool alias')
    fastify.close()
  })
})

test('should throw if pool cannot be created', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(plugin, { pool: { poolMin: -5 } })

  fastify.ready(err => {
    t.match(err.message, 'fastify-oracle: failed to create pool')
    fastify.close()
  })
})
