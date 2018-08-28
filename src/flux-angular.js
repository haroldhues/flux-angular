import Baobab from 'baobab'
import angular from 'angular'
import dispatchr from 'dispatchr'

const { createDispatcher } = dispatchr

const angularModule = angular.module
let registeredStores = []
let autoInjectStores = false
let useEvalAsync = true

// A function that creates stores
function createStore(name, spec = {}, immutableDefaults, flux) {
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

  return Store
}

// Flux Service is a wrapper for the Yahoo Dispatchr
const FluxService = function(immutableDefaults) {
  this.stores = []
  this.dispatcherInstance = createDispatcher({})
  this.dispatcher = this.dispatcherInstance.createContext()

  this.dispatch = function() {
    if (registeredStores.length) {
      console.warn(
        'There are still stores not injected: ' +
          registeredStores.join(',') +
          '. Make sure to manually inject all stores before running any dispatches or set autoInjectStores to true.'
      ) // eslint-disable-line no-console
    }
    this.dispatcher.dispatch.apply(this.dispatcher, arguments)
  }

  this.createStore = function(name, spec) {
    const Store = createStore(name, spec, immutableDefaults, this)
    this.dispatcherInstance.registerStore(Store)
    const instance = this.dispatcher.getStore(Store)
    const exports = instance.exports
    this.stores.push({ Store, instance, exports })
    return exports
  }

  this.getStore = function(storeExport) {
    const { Store } = this.stores.filter(
      ({ exports }) => exports === storeExport
    )[0]
    return this.dispatcher.getStore(Store)
  }

  this.areStoresRegistered = function(stores) {
    const storeNames = this.stores.map(({ Store }) => Store.storeName)
    return stores.every(storeName => storeNames.indexOf(storeName) > -1)
  }

  this.reset = function() {
    this.dispatcherInstance.stores = {}
    this.dispatcherInstance.handlers = {}
    this.stores = []
    registeredStores = []
  }

  // Expose Baobab in case user wants access to it for use outside a store
  this.Baobab = Baobab
}

// Wrap "angular.module" to attach store method to module instance
angular['module'] = function(...args) {
  // Call the module as normaly and grab the instance
  const moduleInstance = angularModule.apply(angular, args)

  // Attach store method to instance
  moduleInstance.store = function(storeName, storeDefinition) {
    // Add to stores array
    registeredStores.push(storeName)

    // Create a new store
    this.factory(storeName, [
      '$injector',
      'flux',
      function($injector, flux) {
        const storeConfig = $injector.invoke(storeDefinition)
        registeredStores.splice(registeredStores.indexOf(storeName), 1)
        return flux.createStore(storeName, storeConfig)
      },
    ])

    return this
  }

  return moduleInstance
}

class FluxProvider {
  constructor() {
    this.immutableDefaults = {}
    this.$get = [() => new FluxService(this.immutableDefaults)]
  }

  // Defaults that are passed on to Baobab: https://github.com/Yomguithereal/baobab#options
  setImmutableDefaults(defaults) {
    this.immutableDefaults = defaults
  }

  autoInjectStores(val) {
    autoInjectStores = val
  }

  useEvalAsync(val) {
    useEvalAsync = val
  }
}

angular
  .module('flux', [])
  .provider('flux', () => new FluxProvider())
  .run([
    '$rootScope',
    '$injector',
    'flux',
    function($rootScope, $injector, flux) {
      if (angular.mock) {
        // Forced to false during testing to avoid needing to flush to test $listenTo interaction
        useEvalAsync = false
        flux.reset()
      }

      if (!angular.mock && autoInjectStores) {
        $injector.invoke(registeredStores.concat(angular.noop))
      }

      // Extend scopes with $listenTo
      $rootScope.constructor.prototype.$listenTo = function(
        storeExport,
        mapping,
        callback
      ) {
        let cursor, originalCallback
        const store = flux.getStore(storeExport)

        if (!store.__tree) {
          throw new Error(
            'Store ' +
              storeExport.storeName +
              ' has not defined state with this.immutable() which is required in order to use $listenTo'
          )
        }

        if (!callback) {
          callback = mapping
          cursor = store.__tree
        } else {
          cursor = store.__tree.select(mapping)
        }

        originalCallback = callback
        if (useEvalAsync) {
          callback = e => {
            this.$evalAsync(() => originalCallback(e))
          }
        }

        cursor.on('update', callback)

        // Call the callback so that state gets the initial sync with the view-model variables. evalAsync is specifically
        // not used here because state should be available to angular as it is initializing. Otherwise state can be
        // undefined while the first digest cycle is running.
        originalCallback({})

        // Remove the listeners on the store when scope is destroyed (GC)
        this.$on('$destroy', () => cursor.off('update', callback))
      }
    },
  ])

module.exports = 'flux'
