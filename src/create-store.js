import Baobab from 'baobab'
import angular from 'angular'

// A function that creates stores
/**
 * @returns {typeof FluxAngularStore}
 */
export function createStore(name, spec = {}, immutableDefaults, flux) {
  // Constructor of a yahoo dispatchr store
  /**
   * @param {dispatchr.Dispatcher} dispatcher
   */
  const Store = function(dispatcher) {
    this.dispatcher = dispatcher

    // Check if store exists when waiting for it
    this.waitFor = function(stores, cb) {
      stores = Array.isArray(stores) ? stores : [stores]
      if (!flux.areStoresRegistered(stores)) {
        throw new Error(
          'Waiting for stores that are not injected into Angular yet, ' +
            stores.join(', ') +
            '. Be sure to inject stores before waiting for them'
        )
      }
      this.dispatcher.waitFor(stores, cb.bind(this))
    }

    if (!this.initialize) {
      throw new Error(
        'Store ' +
          name +
          ' does not have an initialize method which is is necessary to set the initial state'
      )
    }

    this.initialize()
  }

  // Add constructor properties, as required by Yahoo Dispatchr
  Store.handlers = spec.handlers
  Store.storeName = name

  // Instantiates immutable state and saves it to private variable that can be used for setting listeners
  Store.prototype.immutable = function(initialState, options = {}) {
    if (this.__tree) {
      this.__tree.set(initialState)
    } else {
      this.__tree = new Baobab(
        initialState,
        angular.extend({}, immutableDefaults, options)
      )
    }
    return this.__tree
  }

  Store.prototype.monkey = Baobab.monkey

  // Attach store definition to the prototype
  Object.keys(spec).forEach(function(key) {
    Store.prototype[key] = spec[key]
  })

  if (!spec.exports) {
    throw new Error('You have to add an exports object to your store: ' + name)
  }

  Store.prototype.exports = {}
  Object.defineProperty(Store.prototype, 'exports', {
    get() {
      const storeInstance = this
      const instanceExports = {}

      Object.keys(spec.exports).forEach(function(key) {
        // Create a getter
        const descriptor = Object.getOwnPropertyDescriptor(spec.exports, key)
        if (descriptor.get) {
          Object.defineProperty(instanceExports, key, {
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable,
            get: descriptor.get.bind(storeInstance),
          })
        } else {
          instanceExports[key] = spec.exports[key].bind(storeInstance)
        }
      })

      // NOTE: Magic here: this will shadow the static getter. Further uses of store.exports
      // will not need to build the exports array again. See https://goo.gl/jXYfAS
      Object.defineProperty(storeInstance, 'exports', {
        writable: false,
        value: instanceExports,
      })

      return storeInstance.exports
    },
  })

  /**
   * Forcefully convert to a store, this should be able to go away once this is covered to a class.
   * @type {any}
   */
  const _Store = Store

  return _Store
}
