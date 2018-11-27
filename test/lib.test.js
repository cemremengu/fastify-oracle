'use strict'

const test = require('tap').test
const plugin = require('../plugin')
const Fastify = require('fastify')
const oracledb = require('oracledb')

const poolOptions = {
  user: 'travis',
  password: 'travis',
  connectString: 'localhost/xe',
  poolMin: 2
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

test('execution scope with promise', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope(conn => {
      return conn.execute('SELECT * FROM DUAL')
    }).then((res, err) => {
      t.error(err)
      t.strictDeepEqual(res.rows, [ { DUMMY: 'X' } ])

      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('execution scope with callback', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope(conn => {
      return conn.execute('SELECT * FROM DUAL')
    },
    function (err, result) {
      t.error(err)
      t.strictDeepEqual(result.rows, [ { DUMMY: 'X' } ])
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('execution scope with execute callback', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope((conn, done) => {
      conn.execute('SELECT * FROM DUAL', function (err, result) {
        done(err, result)
      })
    }, function (err, res) {
      t.error(err)
      t.strictDeepEqual(res.rows, [ { DUMMY: 'X' } ])
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('execution scope with promise (error)', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope(conn => {
      return conn.execute('SELECT * FROM ??')
    }).catch((err) => {
      t.is(err.message, 'ORA-00911: invalid character')

      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('execution scope with callback (error)', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope(conn => {
      return conn.execute('SELECT * FROM ??')
    },
    function (err, res) {
      t.is(res, undefined)
      t.is(err.message, 'ORA-00911: invalid character')
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('execution scope with execute callback (error)', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope((conn, done) => {
      conn.execute('SELECT * FROM ??', function (err, result) {
        done(err, result)
      })
    }, function (err, res) {
      t.is(res, undefined)
      t.is(err.message, 'ORA-00911: invalid character')
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('execution scope with callback + invalid connection pool', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(plugin, { pool: {}, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope(conn => {
      return conn.execute('SELECT * FROM DUAL')
    },
    function (err, res) {
      t.is(res, undefined)
      t.is(err.message, 'ORA-24415: Missing or null username.')
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('execution scope with promise + invalid connection pool', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: {}, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)

    fastify.oracle.scope(conn => {
      return conn.execute('SELECT * FROM DUAL')
    }).catch((err) => {
      t.is(err.message, 'ORA-24415: Missing or null username.')

      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})
