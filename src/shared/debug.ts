let debugMode = false;

export function setDebugMode(enabled: boolean) {
  debugMode = enabled;
}

export function debugLog(message: string, ...args: any[]) {
  if (debugMode) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

export function isDebugMode(): boolean {
  return debugMode;
}