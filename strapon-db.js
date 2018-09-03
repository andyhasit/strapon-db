
const c = console;

export class Database {
  constructor(dbName, schema) {
    this.schema = schema
    this._caches = {}
    this._fullyLoaded = {}
    this._dbp = new Promise((resolve, reject) => {
      let openreq = indexedDB.open(dbName, schema.getVersion())
      openreq.onerror = () => reject(openreq.error)
      openreq.onsuccess = () => {
        schema.createFunctions(this)
        resolve(openreq.result)
      }
      openreq.onupgradeneeded = (event) => {
        // First time setup: create an empty object store
        schema.upgrade(openreq.result, event.oldVersion)
      }
    })
  }
  ready() {
    return this._dbp
  }
  dump() {
    let data = {}, promises=[];
    return this._dbp.then(db => {
      let names = db.objectStoreNames, len = db.objectStoreNames.length;
      for (let i=0;i<len;i++) {
        let store = names[i];
        promises.push(this.getAll(store).then(rows => data[store] = rows))
      }
      return Promise.all(promises).then(x => data)
    });
  }
  _cacheOf(store) {
    if (!this._caches.hasOwnProperty(store)) {
      this._caches[store] = {}
    }
    return this._caches[store]
  }
  _wrap(store, action, type, ...args) {
    return this._dbp.then(db => new Promise((resolve, reject) => {
      let transaction = db.transaction(store, type)
      let request = transaction.objectStore(store)[action](...args)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = transaction.onerror = () => reject(transaction.error)
    }))
  }
  put(store, record) {
    return this._wrap(store, 'put', 'readwrite', record).then(id => {
      record.id = id
      this._cacheOf(store)[id] = record
      return record
    })
  }
  del(store, record) {
    return this._wrap(store, 'delete', 'readwrite', record.id).then(id => {
      delete this._cacheOf(store)[record.id]
    })
  }
  get(store, id) {
    let record = this._cacheOf(store)[id]
    if (record == undefined) {
      return this._wrap(store, 'get', undefined, id).then(record => {
        this._cacheOf(store)[id] = record
        return record
      })
    } else {
      return Promise.resolve(record)
    }
  }
  getAll(store) {
    if (this._fullyLoaded[store]) {
      return Promise.resolve(Object.values(this._cacheOf(store)))
    } else {
      return this._wrap(store, 'getAll').then(records => {
        let cache = this._cacheOf(store)
        this._fullyLoaded[store] = true
        records.map(record => cache[record.id] = record)
        return records
      })
    }
  }
  _criteriaMatch(record, criteria) {
    for (let key in criteria) {
      if (record[key] !== criteria[key]) {
        return false
      }
    }
    return true
  }
  _fetchOne(store, criteria) {

    // UNTESTED
    //Todo: add query caching
    return this._dbp.then(db => new Promise((resolve, reject) => {
      let records = []
      let cursorTrans = db.transaction(store).objectStore(store).openCursor()
      cursorTrans.onerror = error => c.log(error)
      cursorTrans.onsuccess = event => {
        var cursor = event.target.result
        if (cursor) {
          let record = cursor.value
          if (this._criteriaMatch(record, criteria)) {
            records.push(record)
          } else {
            cursor.continue()
          }
        }
        else {
          resolve(records)
        }
      }
    }))
  }
  filter(store, criteria) {
    //Todo: add query caching
    return this._dbp.then(db => new Promise((resolve, reject) => {
      let records = []
      let cursorTrans = db.transaction(store).objectStore(store).openCursor()
      cursorTrans.onerror = error => c.log(error)
      cursorTrans.onsuccess = event => {
        var cursor = event.target.result
        if (cursor) {
          let record = cursor.value
          if (this._criteriaMatch(record, criteria)) {
            records.push(record)
          }
          cursor.continue();
        }
        else {
          resolve(records)
        }
      }
    }))
  }
  getParent(childStore, parentStore, child) {
    let fkName = this.schema.getFkName(parentStore)
    let parentId = child[fkName]
    if (parentId == undefined ) {
      return Promise.resolve(undefined)
    }
    return this.get(parentStore, parentId)
  }
  getLinked(storeName, store1, store2Record) {

  }
  getChildren(parentStore, childStore, parentRecord) {
    //Todo : cache
    return this._dbp.then(db => new Promise((resolve, reject) => {
      let transaction = db.transaction(childStore)
      let request = transaction.objectStore(childStore).index(parentStore).get(parentRecord.id)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = transaction.onerror = () => reject(transaction.error)
    }))
  }
  setParent(childStore, parentStore, childRecord, parentRecord) {
    let fkName = this.schema.getFkName(parentStore)
    childRecord[fkName] = parentRecord.id
    return this.put(childStore, childRecord)
  }
  link(store1, store2, store1Record, store2Record) {
    let storeName = this.schema.getLinkStoreName(store1, store2);
    let record = {}
    record[this.schema.getFkName(store1)] = store1Record.id;
    record[this.schema.getFkName(store2)] = store2Record.id;
    return this.put(storeName, record)
  }
}

/*
  IndexDb allows versioning. It would be a shame to lose that, but we also want one description of the model.

  We tap into that by 
  
  The idea is that we define the stores and relationships once.

  
  or:
    db.getParent('table1', 'table2', record)
    db.getChildren('table1', 'table2', record)
    db.getRelated('table1', 'table2', record) // many to many
    db.setParent('table1', 'table2', record, parent)
    db.link('table1', 'table2', record1, record2)
    db.unlink('table1', 'table2', record1, record2)

    The many__many tables will have predictable names.

    Need to ensure we can wrap multiple in a transaction.


May not want to load everything in memory, e.g. child objects.
But once a specific query has been called, e.g. getChildren of x, then so long as all other changes are cached

Todo:
  Make a generic backend agnostic CachedDatabase on which we must implement a wrap method

*/

export class Schema {
  constructor(defaultConf={keyPath: "id", autoIncrement: true}) {
    this.defaultConf = defaultConf
    this._versions = []
  }
  addVersion(fn) {
    this._versions.push(fn)
  }
  getVersion() {
    return this._versions.length + 1
  }
  upgrade(idb, oldVersion) {
    let schemaUpgrader = new SchemaUpgrader(this, idb, this.defaultConf)
    this._versions.forEach((fn, version) => {
      if (version >= oldVersion) {
        fn(schemaUpgrader, true)
      }
    })
  }
  createFunctions(target) {
    let schemaFunctionBuilder = new SchemaFunctionBuilder(this, target)
    this._versions.forEach((fn, version) => {
      fn(schemaFunctionBuilder, false)
    })
  }
  getFkName(parentStore) {
    return `__${parentStore}Id`
  }
  getLinkStoreName(store1, store2) {
    return `m2m__${store1}__${store2}`
  }
}


class SchemaFunctionBuilder {
  constructor(schema, target) {
    this.schema = schema
    this.target = target
  }
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  addStore(name) {
    let capitalizedName = this.capitalize(name);
    ['put', 'del', 'get', 'getAll'].forEach(method => {
      this.target[method + capitalizedName] = function(arg) {
        return this[method](name, arg)
      }
    })
  }
  oneToMany(parentStore, childStore) {
    let parentCaps = this.capitalize(parentStore);
    let childCaps = this.capitalize(childStore);
    let pluralChildren = childCaps + 's'; //TODO: allow override in opts.
    //Get parent as getChildParent(child)
    this.target['get' + childCaps + parentCaps] = function(childRecord) {
      return this.getParent(childStore, parentStore, childRecord)
    }
    //Get children as getParentChildren(parent)
    this.target['get' + parentCaps + pluralChildren] = function(parentRecord) {
      return this.getChildren(parentStore, childStore, parentRecord)
    }
    this.target['set' + childCaps + parentCaps] = function(childRecord, parentRecord) {
      return this.setParent(childStore, parentStore, childRecord, parentRecord)
    }
  }
  manyToMany(store1, store2) {
    let storeName = this.schema.getLinkStoreName(store1, store2);
    let store1Caps = this.capitalize(store1);
    let store2Caps = this.capitalize(store2);
    let pluralStore1 = store1Caps + 's';
    let pluralStore2 = store2Caps + 's';
    this.target['get' + store1Caps + pluralStore2] = function(store1Record) {
      return this.getChildren(store2, storeName, store1Record)
      //return this.getLinked(storeName, store2, store1Record) //tagtask(tag)
    }
    this.target['get' + store2Caps + pluralStore1] = function(store2Record) {
      //return this.getLinked(storeName, store1, store2Record)
    }
    this.target['link' + store1Caps + 'to' + store2Caps] = function(store1Record, store2Record) {
      db.link(store1, store2, store1Record, store2Record)
    }
    this.target['link' + store2Caps + 'to' + store1Caps] = function(store2Record, store1Record) {
      db.link(store1, store2, store1Record, store2Record)
    }
    //TODO: test above, then add unlink
  }
}


class SchemaUpgrader {
  constructor(schema, idb, defaultConf) {
    this.schema = schema
    this.idb = idb
    this.stores = {}
    this.defaultConf = defaultConf
  }
  addStore(name, conf=this.defaultConf) {
    let store = this.idb.createObjectStore(name, conf)
    this.stores[name] = store
    return store
  }
  oneToMany(parent, child) {
    this.stores[child].createIndex(parent, this.schema.getFkName(parent));
  }
  manyToMany(store1, store2) {
    let store = this.idb.createObjectStore(this.schema.getLinkStoreName(store1, store2), this.defaultConf)
    store.createIndex(store1, this.schema.getFkName(store1));
    store.createIndex(store2, this.schema.getFkName(store2));
  }
}

export function deleteIdb(dbName) {
  indexedDB.deleteDatabase(dbName)
}