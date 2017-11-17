var PIGATO = require('../')
var assert = require('chai').assert
var uuidv4 = require('uuid/v4')

var bhost = 'inproc://#' + uuidv4()
// var bhost = 'tcp://0.0.0.0:2020';
var broker = new PIGATO.Broker(bhost)

var client, worker, ns

describe('WILDCARDS', function () {
  beforeEach(function (done) {
    broker.conf.onStart = done
    broker.start()
  })

  afterEach(function (done) {
    broker.conf.onStop = done
    broker.stop()
  })

  describe('A wildcard worker', function () {
    var chunk = 'foo'
    beforeEach(function () {
      ns = uuidv4()
      client = new PIGATO.Client(bhost)
      worker = new PIGATO.Worker(bhost, ns + '*')

      worker.start()

      client.start()
      worker.on('request', function (inp, res) {
        res.end(inp + ':bar')
      })
    })

    afterEach(function () {
      client.stop()
      worker.stop()
    })

    it('can be reach several times using widlcard mecanisme', function (done) {
      this.timeout(5000)
      var rcnt = 0

      function request () {
        client.request(ns + '-' + uuidv4(), chunk, {
          timeout: 5000
        })
          .on('data', function (data) {
            assert.equal(data, chunk + ':bar')
          })
          .on('error', function (err) {
            assert.equal(undefined, err)
            done(err)
          })
          .on('end', function () {
            rcnt++
            if (rcnt === 5) {
              done()
            }
          })
      }
      for (var i = 0; i < 5; i++) {
        request()
      }
    })

    it('Can reach a wildcard worker by using the wildcard name', function (done) {
      client.request(ns + '*', chunk, function () {}, function (type, data) {
        assert.equal(type, 0)
        assert.equal(data, chunk + ':bar')
        done()
      })
    })
  })

  describe('When a worker with matching name exist', function () {
    var wildcardWorker, matchingworker, workerid

    beforeEach(function () {
      ns = uuidv4()

      workerid = uuidv4()
      wildcardWorker = new PIGATO.Worker(bhost, ns + '-*')
      matchingworker = new PIGATO.Worker(bhost, ns + '-' + workerid)

      wildcardWorker.on('request', function (inp, res) {
        res.end('WILDCARD')
      })

      matchingworker.on('request', function (inp, res) {
        res.end('MATCHING')
      })

      client = new PIGATO.Client(bhost)

      wildcardWorker.start()
      matchingworker.start()
      client.start()
    })

    afterEach(function () {
      matchingworker.stop()
      wildcardWorker.stop()
      client.stop()
    })

    it('use it instead of the wildcard', function (done) {
      client.request(ns + '-' + workerid, '', function () {}, function (type, data) {
        assert.equal(type, 0)
        assert.equal(data, 'MATCHING')
        done()
      })
    })
  })

  describe('When several workers exists with different matching length', function () {
    var wildcardWorker, matchingworker, workerid

    beforeEach(function () {
      workerid = uuidv4()
      wildcardWorker = new PIGATO.Worker(bhost, ns + '-*')
      matchingworker = new PIGATO.Worker(bhost, ns + '-' + workerid + '-*')

      wildcardWorker.on('request', function (inp, res) {
        res.end('WILDCARD')
      })

      matchingworker.on('request', function (inp, res) {
        res.end('BEST MATCHING')
      })

      client = new PIGATO.Client(bhost)

      wildcardWorker.start()
      matchingworker.start()
      client.start()
    })

    afterEach(function () {
      matchingworker.stop()
      wildcardWorker.stop()
      client.stop()
    })

    it('use the biggest matching wildcard node', function (done) {
      client.request(ns + '-' + workerid + '-aa', '', function () {}, function (type, data) {
        assert.equal(type, 0)
        assert.equal(data, 'BEST MATCHING')
        done()
      })
    })
  })

  describe('A wildcard worker with a long name but not matching', function () {
    var wildcardWorker, matchingworker, workerid

    beforeEach(function () {
      workerid = uuidv4()
      wildcardWorker = new PIGATO.Worker(bhost, ns + uuidv4() + uuidv4() + '-*')
      matchingworker = new PIGATO.Worker(bhost, ns + '-' + workerid + '-*')

      wildcardWorker.on('request', function (inp, res) {
        res.end('WILDCARD')
      })

      matchingworker.on('request', function (inp, res) {
        res.end('BEST MATCHING')
      })

      client = new PIGATO.Client(bhost)

      wildcardWorker.start()
      matchingworker.start()
      client.start()
    })

    afterEach(function () {
      matchingworker.stop()
      wildcardWorker.stop()
      client.stop()
    })

    it('is not used', function (done) {
      client.request(ns + '-' + workerid + '-aa', '', function () {}, function (type, data) {
        assert.equal(type, 0)
        assert.equal(data, 'BEST MATCHING')
        done()
      })
    })
  })
})
