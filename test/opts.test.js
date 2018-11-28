'use strict'

const test = require('tap').test
const plugin = require('../plugin')
const Fastify = require('fastify')
const oracledb = require('oracledb')

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
    .register(plugin, { pool: {}, name: 'testdb' })
    .register(plugin, { pool: {}, name: 'testdb' })

  fastify.ready(err => {
    t.is(err.message, 'fastify-oracle: connection name "testdb" has already been registered')
    fastify.close()
  })
})

test('duplicate plugin registration should throw', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify
    .register(plugin, { pool: {} })
    .register(plugin, { pool: {} })

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

test('sets OBJECT as default outFormat', (t) => {
  t.plan(3)

  oracledb.outFormat = oracledb.ARRAY

  const fastify = Fastify()
  fastify.register(plugin, { pool: {}, objectOutput: true })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.oracle.pool)
    t.is(fastify.oracle.db.outFormat, fastify.oracle.db.OBJECT)
    oracledb.outFormat = oracledb.ARRAY
  })
})
