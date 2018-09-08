# Strapon-db

*Strap dynamically named functions onto IndexedDB!*

### What is it?

Strapon-db is a tiny stand-alone library for working with IndexedDB which:

1. Lets you clearly define collections and relationships
2. Generates ***functions named after your collections and relationships***
3. Makes database versioning/migration a breeze
4. Does some caching

### An Example

Your app deals with **cats**, **dogs** and **owners**, where dogs only have one owner, but cats have multiple owners. 

Just define your collections and relationships like so:

```javascript
import {Database} from 'strapon-db';

var db = new Database('your-db-name', function(schema) {  
  schema.addStore('owner')
  schema.addStore('cat')
  schema.addStore('dog')
  schema.oneToMany('owner', 'dog')
  schema.manyToMany('owner', 'cat')
})
```

Strapon-db will then:

1. Create the required stores and indices in your database if required (see IndexedDB versioning below)
2. Strap functions onto the **db** object to help you work with your collections

```javascript
// Basic CRUD
db.putDog({name: 'Bruno'})             // Create (or save changes to) a dog
db.getDog(id)                          // Retrieve dog by id
db.delDog(aDog)                        // Delete a dog
db.getAllDogs()                        // All dogs, note plural (you can change this)
db.filterDogs(query)                   // Pass an object or function

// One to Many relationship
db.getDogOwner(aDog)                   // Gets a dog's owner
db.getOwnerDogs(anOwner)               // Gets an owner's dogs
db.setDogOwner(aDog, dogOwner)         // Creates a parent-child relationship
db.setDogOwner(aDog, dogOwner2)        // Changes the dog to new owner

// Many to many relationship
db.getCatOwners(aCat)                  // Gets a cat's owners
db.getOwnerCats(catOwner)              // Gets an owner's cats
db.linkCatToOwner(cat, catOwner)       // Links a cat to an owner
db.linkOwnerToCat(catOwner, cat)       // Does exactly same as previous line
db.unlinkCatFromOwner(cat, catOwner)   // Cat did not get enough food...
```

Note that all of the above return promises:

```javascript
db.getCatOwners(aCat).then(owners => {
  owners.forEach('May I have some food please?')
})
```

You will also only see these functions appear on db after `db.ready()` has resolved:

```javascript
db.ready().then(() => {
  console.log(db) // inspect all the functions on db
  //It is now safe to use your app.
})
```

Good to know:

* You can control how the dynamic functions will be named (coming soon)
* You can easily handle changes to your schema structure over time, including migrations.
* This process ***probably loads faster than defining all those functions in source files*** (That's because parsing JavaScript source files is a major bottleneck, whereas linking objects in memory isn't) though I haven't quantatively tested this yet.

### IndexedDB versioning

IndexedDB has a built in versioning and upgrade system, although it is a bit clunky to use. Strapon-db makes this easy and hides the details, all you need to do is pass a schema object instead of a function to the Database constructor:

```javascript
import {Database, schema} from 'strapon-db';

var schema = new Schema();

schema.addVersion(schema => {  
  schema.addStore('owner')
  schema.addStore('dog')
  schema.oneToMany('owner', 'dog')
})

// Code added after your app was released
schema.addVersion(schema => { 
  schema.addStore('cat')
  schema.manyToMany('owner', 'cat')
})

var db = new Database('your-db-name', schema)
```

### Caching

At present only records are cached, meaning once a specific record has been fetched from the database, strapon-db will returned the cached version.