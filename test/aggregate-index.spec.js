'use strict'

/* global describe, it, before */

const AggregateIndex = require('../aggregate-index')
const Promise = require('bluebird')
const helper = require('./helper')
const expect = require('chai').expect
const EntryAlreadyExistsError = require('rheactor-value-objects/errors/entry-already-exists')

describe('AggregateIndex', () => {
  before(helper.clearDb)

  let aggregateIndex

  before(() => {
    aggregateIndex = new AggregateIndex('user', helper.redis)
  })

  describe('.add()', () => {
    it('should add and overwrite indices for the same value', done => {
      Promise
        .join(
          aggregateIndex.add('email', 'john.doe@example.invalid', '17'),
          aggregateIndex.add('email', 'jane.doe@example.invalid', '18')
        )
        .then(() => aggregateIndex.find('email', 'jane.doe@example.invalid'))
        .then(res => {
          expect(res).to.equal('18')
          done()
        })
    })
  })

  describe('.getAll()', () => {
    it('should return all entries', done => {
      aggregateIndex.getAll('email')
        .then(res => {
          expect(res).to.deep.equal(['17', '18'])
          done()
        })
    })
  })

  describe('.remove()', () => {
    it('should remove a value from an index', done => {
      aggregateIndex.add('some-type', 'some-value', 'some-aggregateId')
        .then(() => aggregateIndex.remove('some-type', 'some-value', 'some-aggregateId'))
        .then(() => aggregateIndex.find('some-type', 'some-value'))
        .then(res => {
          expect(res).to.equal(null)
          done()
        })
    })
  })

  describe('.addIfNotPresent()', () => {
    it('should only add and index for a value if it is not present', done => {
      Promise
        .join(
          aggregateIndex.addIfNotPresent('email', 'jill.doe@example.invalid', '17'),
          aggregateIndex.addIfNotPresent('email', 'jill.doe@example.invalid', '18')
        )
        .catch(err => EntryAlreadyExistsError.is(err), (err) => {
          expect(err.message).to.be.contain('jill.doe@example.invalid')
          done()
        })
    })
  })

  describe('.addToListIfNotPresent()', () => {
    it('should add a value to the list if it is not present', done => {
      aggregateIndex.addToListIfNotPresent('meeting-users:42', '17')
        .then(() => {
          done()
        })
    })
    it('should not add the value to the list if it is present', done => {
      aggregateIndex.addToListIfNotPresent('meeting-users:42', '17')
        .catch(err => EntryAlreadyExistsError.is(err), (err) => {
          expect(err.message).to.equal('Aggregate "17" already member of "user.meeting-users:42.list".')
          done()
        })

    })
  })

  describe('.getList()', () => {
    it('should add a value to the list if it is not present', done => {
      Promise
        .join(
          aggregateIndex.addToListIfNotPresent('meeting-users:256', '19'),
          aggregateIndex.addToListIfNotPresent('meeting-users:256', '20')
        )
        .then(() => aggregateIndex.getList('meeting-users:256'))
        .spread((id1, id2) => {
          expect(id1).to.equal('19')
          expect(id2).to.equal('20')
          done()
        })
    })
  })

  describe('.removeFromList()', () => {
    it('should add a value to the list if it is not present', done => {
      aggregateIndex.addToListIfNotPresent('meeting-users:127', '18')
        .then(() => aggregateIndex.getList('meeting-users:127'))
        .spread((id) => expect(id).to.equal('18'))
        .then(() => aggregateIndex.removeFromList('meeting-users:127', '18'))
        .then(() => aggregateIndex.getList('meeting-users:127'))
        .then(members => {
          expect(members).to.deep.equal([])
          done()
        })
    })
  })
})
