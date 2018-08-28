# Using Baobab

`flux-angular` requires that data is immutable in order to perform change detection by checking
object identity, however you can store the data using different data structures like
[baobab](https://github.com/Yomguithereal/baobab) as long as the data can be serialized into
immutable POJOs.

## Installation

Use npm to install and then `require('baobab')` in your application.

```sh
npm install --save baobab
```

## Usage

By default the state in a store is immutable which means it cannot be changed
once created, except through a defined API. If you're unfamiliar with the
benefits of immutable data [this
article](http://jlongster.com/Using-Immutable-Data-Structures-in-JavaScript)
and [this video](https://www.youtube.com/watch?v=I7IdS-PbEgI) explain the theory and benefits.

Some of the pros:

- Computed data (by using 'monkeys' in a store) can be observed in the same way
  as raw data. This allows for more logic to live in the store (e.g. a
  sorted version of a list) and for angular to only re-render when the raw data
  underlying the computed data changes. See the [full
  docs](https://github.com/Yomguithereal/baobab#computed-data-or-monkey-business).
- Baobab has a rich cursors API that makes it easy to make changes deep within
  the tree

Some of the cons:

- Need to use a slightly [more verbose API](https://github.com/Yomguithereal/baobab#updates) for changing state.

### Create a store

```javascript
angular.module('app', ['flux']).store('MyStore', function() {
  return {
    initialize: function() {
      this.state = new Baobab(({
        comments: [],
      })
    },
    getState: function() {
      return this.state.get()
    },
    handlers: {
      ADD_COMMENT: 'addComment',
    },
    addComment: function(comment) {
      this.state.push('comments', comment)
    },
    exports: {
      getLatestComment: function() {
        var comments = this.state.get('comments')
        return comments[comments.length - 1]
      },
      get comments() {
        return this.state.get('comments')
      },
    },
  }
})
```

See the [Baobab docs](https://github.com/Yomguithereal/baobab#updates) for
documentation on how to retrieve and update the immutable state.

### Two way databinding

```javascript
angular
  .module('app', ['flux'])
  .store('MyStore', function() {
    return {
      initialize: function() {
        this.state = new Baobab({
          person: {
            name: 'Jane',
            age: 30,
            likes: 'awesome stuff',
          },
        })
      },
      getState: function() {
        return this.state.get()
      }
      handlers: {
        SAVE_PERSON: 'savePerson',
      },
      savePerson: function(payload) {
        this.state.merge('person', payload.person)
      },
      saveName: function(payload) {
        this.state.set(['person', 'name'], payload.name)
      },
      exports: {
        get person() {
          return this.state.get('person')
        },
      },
    }
  })
  .component('myComponent', {
    templateUrl: 'myComponent.html',
    controller: function(MyStore, myStoreActions) {
      var vm = this
      vm.savePerson = myStoreActions.savePerson
      vm.$listenTo(MyStore, setStoreVars)
      vm.$listenTo(MyStore, s => s.person.name, setName)

      function setStoreVars() {
        $scope.person = MyStore.person
      }

      function setName() {
        $scope.name = MyStore.person.name
      }
    },
  })
  .service('myStoreActions', function(flux) {
    var service = {
      savePerson: savePerson,
    }

    return service

    function savePerson(person) {
      flux.dispatch('SAVE_PERSON', { person: person })
    }
  })
```

### Wait for other stores to complete their handlers

```javascript
angular
  .module('app', ['flux'])
  .store('CommentsStore', function() {
    return {
      initialize: function() {
        this.state = new Baobab({ comments: [] })
      },
      getState() {
        return this.state.get()
      },
      handlers: {
        ADD_COMMENT: 'addComment',
      },
      addComment: function(comment) {
        this.waitFor('NotificationStore', function() {
          this.state.push('comments', comment)
        })
      },
      getComments: function() {
        return this.state.get('comments')
      },
    }
  })
  .store('NotificationStore', function() {
    return {
      initialize: function() {
        this.state = new Baobab({ notifications: [] })
      },
      getState() {
        return this.state.get()
      },
      handlers: {
        ADD_COMMENT: 'addNotification',
      },
      addNotification: function(comment) {
        this.state.push('notifications', 'Something happened')
      },
      exports: {
        getNotifications: function() {
          return this.state.get('notifications')
        },
      },
    }
  })
```
