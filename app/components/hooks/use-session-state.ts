// Backward-compatible exports. Existing modules keep their imports while the
// implementation now persists through localStorage and migrates legacy session data.
export {
  hasLocalStorageState as hasSessionState,
  useLocalStorageState as useSessionState
} from "./use-local-storage-state";
