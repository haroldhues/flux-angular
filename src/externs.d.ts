declare module 'baobab' {
  const Baobab: any;
  export = Baobab;
}

declare class FluxAngularStore extends dispatchr.Store {
  exports: any;
}

// Based on @types/dispatchr - the types were slightly incomplete
declare module 'dispatchr' {
  export = dispatchr
}

declare namespace dispatchr {

  class Store {
    static storeName: string;
    dehydrate?(): unknown;
    rehydrate?(state: unknown): void;
    shouldDehydrate?(): boolean;
  }

  interface DispatcherInterface {
    getContext(): unknown;

    getStore(name: string): Store;
    getStore(store: typeof Store): Store;

    waitFor(stores: ReadonlyArray<string|typeof Store>, callback: () => void): void;
  }

  interface DispatcherContext {
    getStore<T extends Store = Store>(name: string): T;
    getStore<T extends typeof Store>(store: T): InstanceType<T>;

    dispatch(actionName: string, payload: any): void;

    dehydrate(): unknown;
    rehydrate(dispatcherState: unknown): void;

    waitFor(stores: ReadonlyArray<string|typeof Store>, callback: () => void): void;
    dispatcherInterface: DispatcherInterface;
  }

  interface DispatcherError {
    message: string;
    type: string;
    meta: {
      actionName?: string,
      payload?: any,
      error: Error
    };
  }

  interface Dispatcher {
    createContext(context?: unknown): DispatcherContext;
    registerStore(store: typeof Store): void;
    isRegistered(store: typeof Store | string): boolean;
    getStoreName(store: typeof Store | string): string;
  }

  interface DispatcherOption {
    stores?: typeof Store[];
    errorHandler?: (e: DispatcherError, context: unknown) => void;
  }

  export function createDispatcher(options?: DispatcherOption): Dispatcher;
}
