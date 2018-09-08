import {Database, Schema} from '../dist/strapon-db.js'
global.indexedDB = require("fake-indexeddb");

const c = console;
const schema = new Schema();

schema.addVersion((schema, isUpgrade) => {
  let days = schema.addStore('day')
  let tasks = schema.addStore('task')
  let tags = schema.addStore('tag')
  schema.oneToMany('day', 'task')
  schema.manyToMany('tag', 'task')
  if (isUpgrade) {
    tags.put({label: 'urgent'})
  }
})

const db = new Database('testdb', schema)


it('Silly test just to initialise db.ready()', () => { expect.assertions(1)
  /*
  The first test found in this file must call db.ready() and wait for it to resolve.
  Subsequent tests can now skip that and go straight to calling functions on db.
  */
  expect.assertions(1)
  return db.ready().then(() => {
    return expect(1).toEqual(1)
  })
})


it('All expected functions are defined', () => {

  expect(db.putDay).toBeDefined()
  expect(db.delDay).toBeDefined()
  expect(db.getDay).toBeDefined()
  expect(db.getAllDays).toBeDefined()

  expect(db.putTask).toBeDefined()
  expect(db.delTask).toBeDefined()
  expect(db.getTask).toBeDefined()
  expect(db.getAllTasks).toBeDefined()

  expect(db.putTag).toBeDefined()
  expect(db.delTag).toBeDefined()
  expect(db.getTag).toBeDefined()
  expect(db.getAllTags).toBeDefined()

  expect(db.getTaskDay).toBeDefined()
  expect(db.getDayTasks).toBeDefined()
  expect(db.setTaskDay).toBeDefined()

  expect(db.getTagTasks).toBeDefined()
  expect(db.getTaskTags).toBeDefined()
  expect(db.linkTagtoTask).toBeDefined()
  expect(db.linkTasktoTag).toBeDefined()
  expect(db.unlinkTagFromTask).toBeDefined()
  expect(db.unlinkTaskFromTag).toBeDefined()

})


it('getAll works as expected', () => { expect.assertions(1)
  return db.getAllTags().then(tags => {
    return expect(tags.length).toEqual(1)
  })
})