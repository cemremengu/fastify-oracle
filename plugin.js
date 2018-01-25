'use strict'

const fp = require('fastify-plugin')
const oracledb = require('oracledb')

function fastifyOracleDB (fastify, options, next) {
  const close = function (fastify, done) {
    fastify.oracle.close(done)
  }

  if (options.client) {
    if (oracledb.Pool.prototype.isPrototypeOf(options.client) === false) {
      return next(Error('supplied client must be an instance of oracledb.pool'))
    }
    fastify.decorate('oracle', options.client)
    fastify.addHook('onClose', close)
    return next()
  }

  if (options.poolAlias) {
    const pool = oracledb.getPool(options.poolAlias)
    if (!pool) return next('could not get default pool from oracledb instance')
    fastify.decorate('oracle', pool)
    fastify.addHook('onClose', close)
    return next()
  }

  if (!options.pool) {
    return next(Error('must supply options.pool oracledb pool options'))
  }

  oracledb.createPool(options.pool, (err, pool) => {
    if (err) return next(err)
    fastify.decorate('oracle', pool)
    fastify.addHook('onClose', close)
    next()
  })
}

module.exports = fp(fastifyOracleDB, {
  fastify: '>=0.40.0',
  name: 'fastify-oracle'
})
