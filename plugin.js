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

function decorateFastifyInstance (pool, fastify, options, next) {
  const oracle = {
    getConnection: pool.getConnection.bind(pool),
    pool,
    transact: transact.bind(pool)
  }

  if (options.name) {
    if (!fastify.oracle) {
      fastify.decorate('oracle', Object.assign(oracle, { db: oracledb }))
    }

    if (fastify.oracle[options.name]) {
      return next(Error('fastify-oracle: connection name "' + options.name + '" has already been registered'))
    }

    fastify.oracle[options.name] = oracle
  } else {
    if (fastify.oracle) {
      return next(Error('fastify-oracle has already been registered'))
    } else {
      fastify.decorate('oracle', Object.assign(oracle, { db: oracledb }))
    }
  }

  fastify.addHook('onClose', (_, done) => pool.close(done))

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

  oracledb.extendedMetaData = options.extendedMetaData || false

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
