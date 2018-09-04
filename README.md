# Strapon-db

Strapon-db is a library for IndexedDB which builds dynamically named functions to make working with your collections a breeze.

#### Example:

Your app deals with **cats**, **dogs** and **owners**. Once you've defined those collections and the relationships between them, strapon-db will create an object an strap the following functions onto it for you:

```javascript
db.putOwner({name: 'Jana'})            // Create (or save changes to) an owner
db.delOwner(anOwner)                   // Delete an owner from database

// Dogs have only one owner
db.putDog({name: 'Bruno'})             // Create a dog
db.setDogOwner(aDog, dogOwner)         // Creates a parent-child relationship
db.setDogOwner(aDog, dogOwner2)        // Changes the dog to new owner
db.getDogOwner(aDog)                   // Gets a dog's owner
db.getOwnerDogs(anOwner)               // Gets an owner's dogs

// Cats have multiple owners (many to many relationship)
db.linkCatToOwner(cat, catOwner)       // Links a cat to an owner
db.linkOwnerToCat(catOwner, cat)       // Does exactly same as previous line
db.getCatOwners(aCat)                  // Gets a cat's owners
db.getOwnerCats(catOwner)              // Gets an owner's cat's
db.unlinkCatFromOwner(cat, catOwner)   // Cat did not get enough food

//For all collections:
db.getAllDogs()
db.getAllDogs(dog => dog.breed == 'spaniel')
```

You can now write very expressive code without having to manually create all these functions. To get the functions shown above (and more) you'd just need to define your collections and relationships as follows:

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

You can of course control more than this (e.g. getMouses vs getMice) as well as take advantage of IndexdDB's versioning to manage schema changes.

Additionally, simple queries and relationships are **lazily cached**, which means you don't need to save query results in your app just for performance:

```javascript
db.getOwnerDogs(this).then(dogs => {
 this.myDogs = dogs; // Unecessary, just run the same query again when you need to. 
})
```

### Status of project:

It's not complete yet! So if you are reading this (god knows what you put into Google to end up here) just come back in a few days.