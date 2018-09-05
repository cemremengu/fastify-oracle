'use strict'

const test = require('tap').test
const plugin = require('../plugin')
const Fastify = require('fastify')

test('creates pool from config', (t) => {
  t.plan(6)

  const fastify = {
    decorate (name, obj) {
      t.is(name, 'oracle')
      this[name] = obj
    },

    addHook (name, fn) {
      t.is(name, 'onClose')
      t.match(fn, /fastify\.oracle\.pool\.close/)
    }
  }

  const opts = {
    user: 'travis',
    password: 'travis',
    connectString: 'localhost/xe'
  }
  plugin(fastify, { pool: opts }, (err) => {
    if (err) t.threw(err)
    t.ok(fastify.oracle)
    fastify.oracle.getConnection()
      .then((conn) => {
        conn.execute('SELECT 1 AS FOO FROM DUAL', { }, { outFormat: fastify.oracle.db.OBJECT })
          .then((result) => {
            t.is(result.rows.length, 1)
            t.is(result.rows[0].FOO, 1)
          })
          .then(() => conn.close())
          .catch(t.threw)
      })
      .catch(t.threw)
  })
})

test('creates named pool from config', (t) => {
  t.plan(8)

  const fastify = {
    decorate (name, obj) {
      t.is(name, 'oracle')
      this[name] = obj
    },

    addHook (name, fn) {
      t.is(name, 'onClose')
      t.match(fn, /fastify\.oracle\.pool\.close/)
    }
  }

  const opts = {
    user: 'travis',
    password: 'travis',
    connectString: 'localhost/xe'
  }
  plugin(fastify, { pool: opts, name: 'testdb' }, (err) => {
    if (err) t.threw(err)
    t.ok(fastify.oracle)
    fastify.oracle.getConnection()
      .then((conn) => {
        conn.execute('SELECT 1 AS FOO FROM DUAL', { }, { outFormat: fastify.oracle.db.OBJECT })
          .then((result) => {
            t.is(result.rows.length, 1)
            t.is(result.rows[0].FOO, 1)
          })
          .then(() => conn.close())
          .catch(t.threw)
      })
      .catch(t.threw)

    fastify.oracle.testdb.getConnection()
      .then((conn) => {
        conn.execute('SELECT 1 AS FOO FROM DUAL', { }, { outFormat: fastify.oracle.db.OBJECT })
          .then((result) => {
            t.is(result.rows.length, 1)
            t.is(result.rows[0].FOO, 1)
          })
          .then(() => conn.close())
          .catch(t.threw)
      })
      .catch(t.threw)
  })
})

test('duplicate connection names should throw', (t) => {
  t.plan(1)

  const fastify = Fastify()

  const opts = {
    user: 'travis',
    password: 'travis',
    connectString: 'localhost/xe'
  }

  fastify
    .register(plugin, { pool: opts, name: 'testdb' })
    .register(plugin, { pool: opts, name: 'testdb' })

  fastify.ready(err => {
    t.is(err.message, 'Connection name has already been registered: testdb')
  })
})
