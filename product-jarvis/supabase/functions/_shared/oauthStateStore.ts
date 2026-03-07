const memory = new Map<
  string,
  {
    workspace_id: string;
    provider: 'jira' | 'linear' | 'notion';
    dev_authorization_code: string;
    created_at: number;
    expires_at: number;
  }
>();

const TTL_MS = 1000 * 60 * 10;

function prune() {
  const now = Date.now();
  for (const [key, row] of memory.entries()) {
    if (row.expires_at <= now) {
      memory.delete(key);
    }
  }
}

export function createOauthState(input: { workspace_id: string; provider: 'jira' | 'linear' | 'notion' }) {
  prune();
  const state = crypto.randomUUID();
  const code = `auth_${crypto.randomUUID()}`;
  const now = Date.now();
  memory.set(state, {
    workspace_id: input.workspace_id,
    provider: input.provider,
    dev_authorization_code: code,
    created_at: now,
    expires_at: now + TTL_MS,
  });
  return { state, dev_authorization_code: code, expires_at: new Date(now + TTL_MS).toISOString() };
}

export function consumeOauthState(state: string) {
  prune();
  const row = memory.get(state);
  if (!row) return null;
  memory.delete(state);
  return row;
}
