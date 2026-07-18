export interface SessionRef {
  accessToken: string;
  tenantId: string;
}

let current: SessionRef = { accessToken: '', tenantId: 'local' };

export function setSessionRef(ref: SessionRef): void {
  current = ref;
}

export function getSessionRef(): SessionRef {
  return current;
}
