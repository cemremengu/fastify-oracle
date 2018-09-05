'use strict'

const fp = require('fastify-plugin')
const oracledb = require('oracledb')

const close = function (fastify, done) {
  Object.keys(fastify.oracle)
    .forEach(key => {
      if (fastify.oracle[key].pool) {
        fastify.oracle[key].pool.close(done)
      }
    })

  if (fastify.oracle.pool) {
    fastify.oracle.pool.close(done)
  }
}

function decorateFastifyInstance(pool, fastify, options, next) {
  const oracle = {
    getConnection: pool.getConnection.bind(pool),
    pool
  };

  if (options.name) {
    if (!fastify.oracle) {
      fastify.decorate('oracle', Object.assign(oracle, { db: oracledb }))
    }

    if (fastify.oracle[options.name]) {
      return next(new Error('Connection name has already been registered: ' + options.name))
    }

    fastify.oracle[options.name] = oracle
  } else {
    if (fastify.oracle) {
      return next(new Error('fastify-oracle has already been registered'))
    }
    else {
      fastify.decorate('oracle', Object.assign(oracle, { db: oracledb }))
    }
  }

  fastify.addHook('onClose', close)

  return next()
}

function fastifyOracleDB(fastify, options, next) {
  if (options.client) {
    if (oracledb.Pool.prototype.isPrototypeOf(options.client) === false) {
      return next(Error('supplied client must be an instance of oracledb.pool'))
    }
    return decorateFastifyInstance(options.client, fastify, options, next)
  }

  if (options.poolAlias) {
    const pool = oracledb.getPool(options.poolAlias)
    if (!pool) return next(Error('could not get default pool from oracledb instance'))
    return decorateFastifyInstance(pool, fastify, options, next)
  }

  if (!options.pool) {
    return next(Error('must supply options.pool oracledb pool options'))
  }

  oracledb.createPool(options.pool, (err, pool) => {
    if (err) return next(err)
    return decorateFastifyInstance(pool, fastify, options, next)
  })
}

module.exports = fp(fastifyOracleDB, {
  fastify: '^1.1.0',
  name: 'fastify-oracle'
})
