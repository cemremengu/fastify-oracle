'use strict'

const test = require('tap').test
const oracledb = require('oracledb')
const plugin = require('../plugin')
const Fastify = require('fastify')

test('accepts singleton client', (t) => {
  t.plan(5)
  oracledb.createPool({
    user: 'travis',
    password: 'travis',
    connectString: 'localhost/XE'
  }, (err, pool) => {
    if (err) t.threw(err)
    const fastify = {
      decorate (name, obj) {
        t.is(name, 'oracle')
        t.is(obj.db, oracledb)
        t.is(obj.pool, pool)
      },

      addHook (name, fn) {
        t.is(name, 'onClose')
        t.match(fn, /fastify\.oracle\.pool\.close/)
      }
    }

    plugin(fastify, { client: pool }, (err) => {
      if (err) t.threw(err)
      pool.close()
    })
  })
})

test('retrieves a cached pool', (t) => {
  t.plan(5)
  oracledb.createPool({
    user: 'travis',
    password: 'travis',
    connectString: 'localhost/XE',
    poolAlias: 'foo'
  }, (err, pool) => {
    if (err) t.threw(err)
    const fastify = {
      decorate (name, obj) {
        t.is(name, 'oracle')
        t.is(obj.db, oracledb)
        t.is(obj.pool, pool)
      },

      addHook (name, fn) {
        t.is(name, 'onClose')
        t.match(fn, /fastify\.oracle\.pool\.close/)
      }
    }

    plugin(fastify, { poolAlias: 'foo' }, (err) => {
      if (err) t.threw(err)
      pool.close()
    })
  })
})

test('client must be instance of oracledb.pool', (t) => {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(plugin, { client: 'hello world' })

  fastify.ready(err => {
    t.is(err.message, 'fastify-oracle: supplied client must be an instance of oracledb.pool')
  })
})
