'use strict'

const test = require('tap').test
const oracledb = require('oracledb')
const plugin = require('../plugin')

test('accepts singleton client', (t) => {
  t.plan(4)
  oracledb.createPool({
    user: 'travis',
    password: 'travis',
    connectString: 'localhost/XE'
  }, (err, pool) => {
    if (err) t.threw(err)
    const fastify = {
      decorate (name, obj) {
        t.is(name, 'oracle')
        t.is(obj, pool)
      },

      addHook (name, fn) {
        t.is(name, 'onClose')
        t.match(fn, /fastify\.oracle\.close/)
      }
    }

    plugin(fastify, {client: pool}, (err) => {
      if (err) t.threw(err)
      pool.close()
    })
  })
})

test('retrieves a cached pool', (t) => {
  t.plan(4)
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
        t.is(obj, pool)
      },

      addHook (name, fn) {
        t.is(name, 'onClose')
        t.match(fn, /fastify\.oracle\.close/)
      }
    }

    plugin(fastify, {poolAlias: 'foo'}, (err) => {
      if (err) t.threw(err)
      pool.close()
    })
  })
})
