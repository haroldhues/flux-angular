import angular from 'angular'
import { FluxProvider } from './FluxProvider'

const angularModule = angular.module

/** @type {string[]} */
const registeredStores = []

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

angular
  .module('flux', [])
  .provider('flux', () => new FluxProvider(registeredStores))
  .run([
    '$rootScope',
    '$injector',
    'flux',
    /**
     *
     * @param {ng.IRootScopeService} $rootScope
     * @param {ng.auto.IInjectorService} $injector
     * @param {import('./FluxService').FluxService} flux
     */
    function($rootScope, $injector, flux) {
      if (angular.mock) {
        // Forced to false during testing to avoid needing to flush to test $listenTo interaction
        flux.provider.evalAsync = false
        flux.reset()
      }

      if (!angular.mock && flux.provider.autoInject) {
        $injector.invoke([...registeredStores, angular.noop])
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
        if (flux.provider.evalAsync) {
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
