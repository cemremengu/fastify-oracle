'use strict'

const test = require('tap').test
const Fastify = require('fastify')
const plugin = require('../plugin')

test('should set outFormat globally', (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(plugin, {
    pool: {
      user: 'travis',
      password: 'travis',
      connectString: 'localhost/xe'
    },
    oracledb: { fetchArraySize: 567 }
  })

  fastify.ready(err => {
    if (err) t.threw(err)
    t.ok(fastify.oracle)
    t.is(fastify.oracle.db.fetchArraySize, 567)
    fastify.close()
  })
})
