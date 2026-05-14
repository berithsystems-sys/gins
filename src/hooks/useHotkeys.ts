/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import hotkeys, { HotkeysEvent } from 'hotkeys-js';

// Set global filter to always allow, we will handle filtering in the hook
hotkeys.filter = () => true;

export function useHotkeys(
  key: string, 
  callback: (event: KeyboardEvent, handler: HotkeysEvent) => void, 
  options: { enableOnFormTags?: boolean } = {}, 
  deps: any[] = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (event: KeyboardEvent, keys: HotkeysEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInput && !options.enableOnFormTags) {
        return;
      }
      
      callbackRef.current(event, keys);
    };

    hotkeys(key, handler);

    return () => {
      hotkeys.unbind(key, handler);
    };
  }, [key, options.enableOnFormTags, ...deps]);
}
