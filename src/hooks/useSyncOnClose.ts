import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauriApp } from '../domain/services/CalDavApi';
import { flushSyncOnAppClose } from '../lib/manualSync';

export function useSyncOnClose() {
  useEffect(() => {
    if (!isTauriApp()) {
      const onBeforeUnload = () => {
        void flushSyncOnAppClose();
      };
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }

    let unlisten: (() => void) | undefined;

    void getCurrentWindow()
      .onCloseRequested(async (event) => {
        event.preventDefault();
        await flushSyncOnAppClose();
        await getCurrentWindow().destroy();
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => {
      unlisten?.();
    };
  }, []);
}
