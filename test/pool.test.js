'use strict'

// Unless someone can provide an Oracle Docker image to test against, we'll
// just have to assume this works.

// const test = require('tap').test
// const plugin = require('../plugin')

// test('creates usable pool from config', (t) => {
//   t.plan(6)

//   const fastify = {
//     decorate (name, obj) {
//       t.is(name, 'oracle')
//       this[name] = obj
//     },

//     addHook (name, fn) {
//       t.is(name, 'onClose')
//       t.match(fn, /fastify\.oracle\.close/)
//     }
//   }

//   const opts = {
//     user: 'SYSTEM',
//     password: 'oracle',
//     connectString: 'localhost/xe'
//   }
//   plugin(fastify, {pool: opts}, (err) => {
//     if (err) t.threw(err)
//     t.ok(fastify.oracle)
//     fastify.oracle.getConnection()
//       .then((conn) => {
//         conn.execute('select 1 as foo from dual')
//           .then((rows) => {
//             t.is(rows.length, 1)
//             t.is(rows[0].foo, 1)
//           })
//           .then(() => conn.close())
//           .catch(t.threw)
//       })
//       .catch(t.threw)
//   })
// })
