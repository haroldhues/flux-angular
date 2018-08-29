import { FluxService } from './FluxService'

export class FluxProvider {
  /**
   * @param {string[]} registeredStores
   */
  constructor(registeredStores) {
    this.registeredStores = registeredStores
    this.immutableDefaults = {}
    this.autoInject = false
    this.evalAsync = true
    this.$get = [() => new FluxService(this)]
  }

  // Defaults that are passed on to Baobab: https://github.com/Yomguithereal/baobab#options
  setImmutableDefaults(defaults) {
    this.immutableDefaults = defaults
  }

  autoInjectStores(val) {
    this.autoInject = val
  }

  useEvalAsync(val) {
    this.evalAsync = val
  }
}
