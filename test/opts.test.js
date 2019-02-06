'use strict'

const test = require('tap').test
const plugin = require('../plugin')
const Fastify = require('fastify')
const oracledb = require('oracledb')

test('client must be instance of oracledb.pool', async (t) => {
  const fastify = Fastify()
  fastify.register(plugin, { client: 'hello world' })

  try {
    await fastify.ready()
  } catch (err) {
    t.is(err.message, 'fastify-oracle: supplied client must be an instance of oracledb.pool')
    await fastify.close()
  }
})

test('duplicate connection names should throw', async (t) => {
  const fastify = Fastify()
  fastify
    .register(plugin, { pool: {}, name: 'testdb' })
    .register(plugin, { pool: {}, name: 'testdb' })

  try {
    await fastify.ready()
  } catch (err) {
    t.is(err.message, 'fastify-oracle: connection name "testdb" has already been registered')
    await fastify.close()
  }
})

test('duplicate plugin registration should throw', async (t) => {
  const fastify = Fastify()

  fastify
    .register(plugin, { pool: {} })
    .register(plugin, { pool: {} })

  try {
    await fastify.ready()
  } catch (err) {
    t.is(err.message, 'fastify-oracle has already been registered')
    await fastify.close()
  }
})

test('should throw if no pool option is provided', async (t) => {
  const fastify = Fastify()

  fastify.register(plugin, {})

  try {
    await fastify.ready()
  } catch (err) {
    t.is(err.message, 'fastify-oracle: must supply options.pool oracledb pool options')
    await fastify.close()
  }
})

test('should throw if could not get pool alias', async (t) => {
  const fastify = Fastify()

  fastify.register(plugin, { poolAlias: 'test' })

  try {
    await fastify.ready()
  } catch (err) {
    t.match(err.message, 'fastify-oracle: could not get pool alias')
    await fastify.close()
  }
})

test('should throw if pool cannot be created', async (t) => {
  const fastify = Fastify()

  fastify.register(plugin, { pool: { poolMin: -5 } })

  try {
    await fastify.ready()
  } catch (err) {
    t.match(err.message, 'fastify-oracle: failed to create pool')
    await fastify.close()
  }
})

test('sets OBJECT as default outFormat', async (t) => {
  const fastify = Fastify()
  oracledb.outFormat = oracledb.ARRAY

  fastify.register(plugin, { pool: {}, outFormat: 'OBJECT' })

  try {
    await fastify.ready()
    t.ok(fastify.oracle.pool)
    t.is(fastify.oracle.db.outFormat, fastify.oracle.db.OBJECT)
    oracledb.outFormat = oracledb.ARRAY
  } catch (err) {
    t.error(err)
  }
})

test('sets fetchAsString values', async (t) => {
  const fastify = Fastify()
  fastify.register(plugin, { pool: {}, fetchAsString: ['NUMBER'] })

  try {
    await fastify.ready()
    t.ok(fastify.oracle.pool)
    t.deepEquals(fastify.oracle.db.fetchAsString, [fastify.oracle.db.NUMBER])
  } catch (err) {
    t.error(err)
  }
})
