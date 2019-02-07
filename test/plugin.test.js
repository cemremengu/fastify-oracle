'use strict'

const test = require('tap').test
const plugin = require('../plugin')
const Fastify = require('fastify')
const oracledb = require('oracledb')

const poolOptions = {
  user: 'travis',
  password: 'travis',
  connectString: 'localhost/xe'
}

test('creates pool from config', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: poolOptions, drainTime: 0 })
    await fastify.ready()

    t.ok(fastify.oracle.pool)
    const conn = await fastify.oracle.getConnection()
    const result = await conn.execute('SELECT 1 AS FOO FROM DUAL', {}, { outFormat: fastify.oracle.db.OBJECT })
    t.is(result.rows.length, 1)
    t.is(result.rows[0].FOO, 1)

    // Note that we don't explicity close the connection here.
    // This tests the drainTime option since if a drainTime is not given,
    // then any open connections should be released with connection.close() before fastify.close() is called, 
    // otherwise the underlying pool close will fail and the pool will remain open.
    await fastify.close()
    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('creates named pool from config', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: poolOptions, name: 'testdb' })
    await fastify.ready()

    t.ok(fastify.oracle.pool)
    t.ok(fastify.oracle.testdb.pool)
    const conn = await fastify.oracle.getConnection()
    const result = await conn.execute('SELECT 1 AS FOO FROM DUAL', {}, { outFormat: fastify.oracle.db.OBJECT })
    t.is(result.rows.length, 1)
    t.is(result.rows[0].FOO, 1)

    await conn.close()
    await fastify.close()

    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
    t.is(fastify.oracle.testdb.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('accepts singleton client', async (t) => {
  const fastify = Fastify()

  try {
    const pool = await oracledb.createPool(poolOptions)
    fastify.register(plugin, { client: pool })
    await fastify.ready()

    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_OPEN)
    t.is(fastify.oracle.db, oracledb)
    t.is(fastify.oracle.pool, pool)

    await fastify.close()

    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('retrieves a cached pool', async (t) => {
  const fastify = Fastify()
  const opts = Object.assign({}, poolOptions)

  try {
    const pool = await oracledb.createPool(Object.assign(opts, { poolAlias: 'foo' }))
    fastify.register(plugin, { poolAlias: 'foo' })

    await fastify.ready()

    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_OPEN)
    t.is(fastify.oracle.db, oracledb)
    t.is(fastify.oracle.pool, pool)

    await fastify.close()

    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('transact with async/await', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })
    await fastify.ready()

    const { rows } = await fastify.oracle.transact(async conn => {
      const res = await conn.execute('SELECT * FROM DUAL')
      t.strictDeepEqual(res.rows, [ { DUMMY: 'X' } ])

      return conn.execute('SELECT * FROM DUAL')
    })

    t.strictDeepEqual(rows, [ { DUMMY: 'X' } ])
    await fastify.close()
    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('transact with promise', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.transact(conn => {
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

test('transact with callback', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.transact(conn => {
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

test('transact with commit callback', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.transact((conn, commit) => {
      conn.execute('SELECT * FROM DUAL', function (err, result) {
        commit(err, result)
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

test('transact with promise (error)', (t) => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.transact(conn => {
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

test('transact with callback (error)', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.transact(conn => {
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

test('transact with commit callback (error)', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.transact((conn, commit) => {
      conn.execute('SELECT * FROM ??', function (err, result) {
        commit(err, result)
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

test('transact should fail if connection pool is invalid', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: {}, outFormat: 'OBJECT' })
    await fastify.ready()
    await fastify.oracle.transact(conn => {
      return conn.execute('SELECT * FROM DUAL')
    })
  } catch (err) {
    t.is(err.message, 'ORA-24415: Missing or null username.')
    await fastify.close()
    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  }
})

test('transact commit should error if connection drops', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.transact((conn, commit) => {
      conn.execute('SELECT * FROM DUAL', function (err, result) {
        conn.close(() => {
          commit(err, result)
        })
      })
    }, function (err, res) {
      t.is(res, undefined)
      t.is(err.message, 'NJS-003: invalid connection')
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('query with async/await', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })
    await fastify.ready()

    const { rows } = await fastify.oracle.query('SELECT * FROM DUAL')

    t.strictDeepEqual(rows, [ { DUMMY: 'X' } ])
    await fastify.close()
    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('query with async/await + values', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })
    await fastify.ready()

    const { rows } = await fastify.oracle.query('SELECT * FROM DUAL WHERE 1 = :v', [1])

    t.strictDeepEqual(rows, [ { DUMMY: 'X' } ])
    await fastify.close()
    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('query with async/await + values + options', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })
    await fastify.ready()

    const { rows } = await fastify.oracle.query('SELECT * FROM DUAL WHERE 1 = :v', [1], { outFormat: oracledb.ARRAY })

    t.strictDeepEqual(rows, [ ['X'] ])
    await fastify.close()
    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  } catch (err) {
    t.error(err)
  }
})

test('query with promise', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.query('SELECT * FROM DUAL').then((res, err) => {
      t.error(err)
      t.strictDeepEqual(res.rows, [ { DUMMY: 'X' } ])

      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('query with callback', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.query('SELECT * FROM DUAL', function (err, res) {
      t.error(err)
      t.strictDeepEqual(res.rows, [ { DUMMY: 'X' } ])
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('query with callback + values', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.query('SELECT * FROM DUAL WHERE 1 = :v', [1], function (err, res) {
      t.error(err)
      t.strictDeepEqual(res.rows, [ { DUMMY: 'X' } ])
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('query with callback + values + options', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.query('SELECT * FROM DUAL WHERE 1 = :v', [1], { outFormat: oracledb.ARRAY }, function (err, res) {
      t.error(err)
      t.strictDeepEqual(res.rows, [ ['X'] ])
      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('query with promise (error)', (t) => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.query('SELECT * FROM ??').catch((err) => {
      t.is(err.message, 'ORA-00911: invalid character')

      fastify.close(err => {
        t.error(err)
        t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
      })
    })
  })
})

test('query with callback (error)', (t) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.register(plugin, { pool: poolOptions, outFormat: 'OBJECT' })

  fastify.ready(err => {
    t.error(err)

    fastify.oracle.query('SELECT * FROM ??',
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

test('query should fail if connection pool is invalid', async (t) => {
  const fastify = Fastify()

  try {
    fastify.register(plugin, { pool: {}, outFormat: 'OBJECT' })
    await fastify.ready()
    await fastify.oracle.query('SELECT * FROM DUAL')
  } catch (err) {
    t.is(err.message, 'ORA-24415: Missing or null username.')
    await fastify.close()
    t.is(fastify.oracle.pool.status, fastify.oracle.db.POOL_STATUS_CLOSED)
  }
})
