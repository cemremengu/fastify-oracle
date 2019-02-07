'use strict'

const fp = require('fastify-plugin')
const oracledb = require('oracledb')

function transactScope (pool, fn, cb) {
  pool.getConnection(function (err, conn) {
    if (err) return cb(err)

    const commit = (err, res) => {
      if (err) return conn.close(() => cb(err))

      conn.commit(function (err) {
        conn.close(function () {
          if (err) {
            return cb(err)
          }
          return cb(null, res)
        })
      })
    }

    const promise = fn(conn, commit)

    if (promise && typeof promise.then === 'function') {
      promise.then(
        (res) => commit(null, res),
        (e) => commit(e))
    }
  })
}

function transact (fn, cb) {
  if (cb && typeof cb === 'function') {
    return transactScope(this, fn, cb)
  }

  return new Promise((resolve, reject) => {
    transactScope(this, fn, function (err, res) {
      if (err) { return reject(err) }
      return resolve(res)
    })
  })
}

function execute (pool, sql, values, options, cb) {
  pool.getConnection(function (err, conn) {
    if (err) return cb(err)

    const done = (err, res) => {
      if (err) return conn.close(() => cb(err))

      conn.close(function () {
        return cb(null, res)
      })
    }

    conn.execute(sql, values, options, done)
  })
}

function query (sql, a2, a3, a4) {
  const promisify = typeof arguments[arguments.length - 1] !== 'function'

  let cb
  let values = []
  let options = {}

  switch (arguments.length) {
    case 2:
      promisify ? values = a2 : cb = a2
      break
    case 3:
      values = a2
      promisify ? options = a3 : cb = a3
      break
    case 4:
      values = a2
      options = a3
      cb = a4
      break
  }

  if (cb && typeof cb === 'function') {
    return execute(this, sql, values, options, cb)
  }

  return new Promise((resolve, reject) => {
    execute(this, sql, values, options, function (err, res) {
      if (err) { return reject(err) }
      return resolve(res)
    })
  })
}

function decorateFastifyInstance (pool, fastify, options, next) {
  const oracle = {
    getConnection: pool.getConnection.bind(pool),
    pool,
    query: query.bind(pool),
    transact: transact.bind(pool)
  }

  if (options.name) {
    if (!fastify.oracle) {
      fastify.decorate('oracle', Object.assign(oracle, { db: oracledb }))
    }

    if (fastify.oracle[options.name]) {
      return next(Error(`fastify-oracle: connection name "${options.name}" has already been registered`))
    }

    fastify.oracle[options.name] = oracle
  } else {
    if (fastify.oracle) {
      return next(Error('fastify-oracle has already been registered'))
    } else {
      fastify.decorate('oracle', Object.assign(oracle, { db: oracledb }))
    }
  }

  if (options.drainTime != null) {
    fastify.addHook('onClose', (_, done) => pool.close(options.drainTime, done))
  } else {
    fastify.addHook('onClose', (_, done) => pool.close(done))
  }

  return next()
}

function fastifyOracleDB (fastify, options, next) {
  if (options.client) {
    if (oracledb.Pool.prototype.isPrototypeOf(options.client)) {
      return decorateFastifyInstance(options.client, fastify, options, next)
    } else {
      return next(Error('fastify-oracle: supplied client must be an instance of oracledb.pool'))
    }
  }

  if (options.poolAlias) {
    try {
      const pool = oracledb.getPool(options.poolAlias) // synchronous, throws error
      return decorateFastifyInstance(pool, fastify, options, next)
    } catch (err) {
      return next(Error('fastify-oracle: could not get pool alias' + '-' + err.message))
    }
  }

  if (!options.pool) {
    return next(Error('fastify-oracle: must supply options.pool oracledb pool options'))
  }

  if (options.outFormat) {
    oracledb.outFormat = oracledb[options.outFormat.toUpperCase()]
  }

  if (options.fetchAsString) {
    oracledb.fetchAsString = options.fetchAsString.map(t => oracledb[t.toUpperCase()])
  }

  oracledb.createPool(options.pool, (err, pool) => {
    if (err) {
      return next(Error('fastify-oracle: failed to create pool' + '-' + err.message))
    }
    return decorateFastifyInstance(pool, fastify, options, next)
  })
}

module.exports = fp(fastifyOracleDB, {
  fastify: '>=1.1.0',
  name: 'fastify-oracle'
})
