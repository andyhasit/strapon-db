# Strapon-db

Strapon-db is a library for IndexedDB which straps dynamically named functions onto a db object, to make working with your collections a breeze.

#### Example:

Say your app works with **cats**, **dogs** and **owners**. Once you've defined those collections and the relationships between them, strapon-db will create an object with the following functions for you:

```javascript
db.putOwner({name: 'Jana'})            // Create (or save changes to) an owner
db.delOwner(anOwner)                   // Delete an owner from database

// Dogs have only one owner
db.putDog({name: 'Bruno'})             // Create a dog
db.setDogOwner(aDog, dogOwner)         // Creates a parent-child relationship
db.setDogOwner(aDog, dogOwner2)        // Changes the dog to new owner
db.getDogOwner(aDog)                   // Gets a dog's owner
db.getOwnerDogs(anOwner)               // Gets an owners dogs

// Cats have multiple owners (many to many relationship)
db.linkCatToOwner(cat, catOwner)       // Links a cat to an owner
db.linkOwnerToCat(catOwner, cat)       // Does exactly same as last line
db.getCatOwners(aCat)                  // Gets a cat's owner
db.getOwnerCats(catOwner)              // Gets an owner's cat's
db.unlinkCatFromOwner(cat, catOwner)   // Cat did not get enough food

//For all collections:
db.getAllDogs()
db.getAllDogs(dog => dog.breed == 'spaniel')
```

You can now write vry expressive code in your app without having to manually create all these functions. Additionally, the queries and relationships are also lazily cached for extra fast performance.

#### Defining collections and relationships

 All you need to get the cat, dog and owner functions shown above, is this:

```javascript
import {Database, Schema} from 'strapon-db';

const schema = new Schema()

schema.addVersion(schema => {       // Version is explained below.
  schema.addStore('owner')
  schema.addStore('cat')
  schema.addStore('dog')
  schema.oneToMany('owner', 'dog')
  schema.manyToMany('owner', 'cat')
})

const db = new Database('mop-todos', schema)
```

You can also:

* Customise the function names which are generated (e.g. Mouse vs Mice)
* Customise the caching strategy (lazy, load all, or none)
* Take advantage of IndexedDB's built in versioning system to manage schema changes.

### Status of project:

It's not complete yet! So if you are reading this (god knows what you put into Google to end up here) just come back in a few days.