/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import hotkeys, { HotkeysEvent } from 'hotkeys-js';

export function useHotkeys(
  key: string, 
  callback: (event: KeyboardEvent, handler: HotkeysEvent) => void, 
  options: { enableOnFormTags?: boolean } = {}, 
  deps: any[] = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // Global filter setting for hotkeys-js
    const originalFilter = hotkeys.filter;
    if (options.enableOnFormTags) {
      hotkeys.filter = () => true;
    }

    const handler = (event: KeyboardEvent, keys: HotkeysEvent) => {
      callbackRef.current(event, keys);
    };

    hotkeys(key, handler);

    return () => {
      hotkeys.unbind(key);
      hotkeys.filter = originalFilter;
    };
  }, [key, options.enableOnFormTags, ...deps]);
}
