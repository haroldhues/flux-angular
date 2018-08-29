import dispatchr from 'dispatchr'
import Baobab from 'baobab'
import { createStore } from './create-store'

const { createDispatcher } = dispatchr

// Flux Service is a wrapper for the Yahoo Dispatchr
export class FluxService {
  /**
   *
   * @param {import('FluxProvider').FluxProvider} provider
   */
  constructor(provider) {
    this.provider = provider
    this.stores = []
    this.dispatcherInstance = createDispatcher({})
    this.dispatcher = this.dispatcherInstance.createContext({})
    this.dispatch = function() {
      if (this.provider.registeredStores.length) {
        console.warn(
          'There are still stores not injected: ' +
            this.provider.registeredStores.join(',') +
            '. Make sure to manually inject all stores before running any dispatches or set autoInjectStores to true.'
        ) // eslint-disable-line no-console
      }
      this.dispatcher.dispatch.apply(this.dispatcher, arguments)
    }
    this.createStore = function(name, spec) {
      const Store = createStore(
        name,
        spec,
        this.provider.immutableDefaults,
        this
      )
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
      this.stores = []
      this.dispatcherInstance = createDispatcher({})
      this.dispatcher = this.dispatcherInstance.createContext({})
      this.provider.registeredStores.length = 0
    }
    // Expose Baobab in case user wants access to it for use outside a store
    this.Baobab = Baobab
  }
}
