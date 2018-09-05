'use strict'

const test = require('tap').test
const plugin = require('../plugin')

test('creates usable pool from config', (t) => {
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
        conn.execute('select 1 from dual')
          .then((result) => {
            t.is(result.rows.length, 1)
            t.is(result.rows[0][0], 1)
          })
          .then(() => conn.close())
          .catch(t.threw)
      })
      .catch(t.threw)
  })
})
