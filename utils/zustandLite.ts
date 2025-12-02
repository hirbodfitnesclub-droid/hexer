import React, { useSyncExternalStore } from 'react';

export type StateCreator<T extends object> = (
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  getState: () => T
) => T;

interface StoreApi<T extends object> {
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
}

const createStore = <T extends object>(initializer: StateCreator<T>): StoreApi<T> => {
  let state = {} as T;
  const listeners = new Set<() => void>();

  const setState: StoreApi<T>["setState"] = (partial) => {
    const next = typeof partial === 'function' ? (partial as (state: T) => Partial<T>)(state) : partial;
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  const getState = () => state;

  state = initializer(setState, getState);

  const subscribe: StoreApi<T>["subscribe"] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, subscribe };
};

export const create = <T extends object>(initializer: StateCreator<T>) => {
  const store = createStore(initializer);

  const useBoundStore = <U = T>(selector?: (state: T) => U): U => {
    const selectorFn = selector || ((state: T) => state as unknown as U);
    const getSnapshot = () => selectorFn(store.getState());
    return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
  } as any;

  useBoundStore.getState = store.getState;
  useBoundStore.setState = store.setState;
  useBoundStore.subscribe = store.subscribe;

  return useBoundStore as typeof useBoundStore & StoreApi<T>;
};

export const createSelector = <T extends object, U>(
  store: ReturnType<typeof create<T>>,
  selector: (state: T) => U
) => () => store(selector);

