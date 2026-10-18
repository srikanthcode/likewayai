// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — SECURE CREDENTIALS & INTEGRATION STATE STORE
// Manages real credentials, verification metadata, and live session status
// ══════════════════════════════════════════════════════════════════════

export interface AppCredential {
  appId: string;
  token?: string;
  apiKey?: string;
  serverUrl?: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  meta?: Record<string, any>;
  connectedAt: string;
  lastVerifiedAt: string;
  isValid: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var _userCredentialsStore: Map<string, Map<string, AppCredential>> | undefined;
}

if (!global._userCredentialsStore) {
  global._userCredentialsStore = new Map<string, Map<string, AppCredential>>();
}

const credentialsStore = global._userCredentialsStore;

export function getUserCredentials(userId: string): Map<string, AppCredential> {
  if (!credentialsStore.has(userId)) {
    credentialsStore.set(userId, new Map<string, AppCredential>());
  }
  return credentialsStore.get(userId)!;
}

export function getAppCredential(userId: string, appId: string): AppCredential | undefined {
  const userCreds = getUserCredentials(userId);
  return userCreds.get(appId);
}

export function saveAppCredential(userId: string, cred: AppCredential): void {
  const userCreds = getUserCredentials(userId);
  userCreds.set(cred.appId, cred);
}

export function removeAppCredential(userId: string, appId: string): boolean {
  const userCreds = getUserCredentials(userId);
  return userCreds.delete(appId);
}
