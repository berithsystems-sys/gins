/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import hotkeys from 'hotkeys-js';

export function useHotkeys(key: string, callback: () => void, deps: any[] = []) {
  useEffect(() => {
    hotkeys(key, (event) => {
      event.preventDefault();
      event.stopPropagation();
      callback();
      return false; // For hotkeys-js to prevent default
    });
    return () => hotkeys.unbind(key);
  }, [key, callback, ...deps]);
}
