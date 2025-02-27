import { forceUpdate, getRenderingRef } from '@stencil/core';
import { Subscription } from '../types';
import { appendToMap, debounce } from '../utils';

/**
 * Check if a possible element isConnected.
 * The property might not be there, so we check for it.
 *
 * We want it to return true if isConnected is not a property,
 * otherwise we would remove these elements and would not update.
 *
 * Better leak in Edge than to be useless.
 */
const isConnected = (maybeElement: any) =>
  !('isConnected' in maybeElement) || maybeElement.isConnected;

const cleanupElements = debounce((map: Map<string, any[]>) => {
  for (let key of map.keys()) {
    map.set(key, map.get(key).filter(isConnected));
  }
}, 2_000);

export const stencilSubscription = <T>(): Subscription<T> => {
  if (typeof getRenderingRef !== 'function') {
    // If we are not in a stencil project, we do nothing.
    // This function is not really exported by @stencil/core.
    return {};
  }

  const elmsToUpdate = new Map<string, any[]>();

  return {
    dispose: () => elmsToUpdate.clear(),
    get: (propName) => {
      const elm = getRenderingRef();
      if (elm) {
        appendToMap(elmsToUpdate, propName as string, elm);
      }
    },
    set: (propName) => {
      const elements = elmsToUpdate.get(propName as string);
      if (elements) {
        elmsToUpdate.set(propName as string, elements.filter(forceUpdate));
      }
      cleanupElements(elmsToUpdate);
    },
    reset: () => {
      elmsToUpdate.forEach((elms) => elms.forEach(forceUpdate));
      cleanupElements(elmsToUpdate);
    },
  };
};
