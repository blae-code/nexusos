import fs from 'node:fs';
import path from 'node:path';

function readDotEnvLine(line) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) {
    return null;
  }

  const [, key, rawValue] = match;
  let value = rawValue.trim();
  if (!value) {
    return { key, value: '' };
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, '').trim();
  }

  return { key, value };
}

function hydrateProcessEnvFromDotfiles() {
  const envFiles = ['.env', '.env.local'];
  for (const filename of envFiles) {
    const file = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(file)) {
      continue;
    }

    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/u);
    for (const line of lines) {
      const parsed = readDotEnvLine(line);
      if (!parsed) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(process.env, parsed.key) || !String(process.env[parsed.key] || '').trim()) {
        process.env[parsed.key] = parsed.value;
      }
    }
  }
}

export function loadLiveEnv() {
  hydrateProcessEnvFromDotfiles();

  const baseUrl = String(process.env.E2E_BASE_URL || process.env.APP_URL || '').trim().replace(/\/+$/, '');
  const adminUsername = String(process.env.E2E_ADMIN_USERNAME || 'system-admin').trim() || 'system-admin';
  const adminKey = String(process.env.E2E_ADMIN_KEY || '').trim();
  const bootstrapSecret = String(process.env.E2E_BOOTSTRAP_SECRET || process.env.SYSTEM_ADMIN_BOOTSTRAP_SECRET || '').trim();
  const missing = [];

  if (!baseUrl) {
    missing.push('E2E_BASE_URL or APP_URL');
  }
  if (!adminKey && !bootstrapSecret) {
    missing.push('E2E_ADMIN_KEY or E2E_BOOTSTRAP_SECRET/SYSTEM_ADMIN_BOOTSTRAP_SECRET');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required live-proof env vars: ${missing.join(', ')}`);
  }

  return {
    baseUrl,
    adminUsername,
    adminKey: adminKey || null,
    bootstrapSecret: bootstrapSecret || null,
  };
}

export function ensureArtifactDir() {
  const dir = path.resolve(process.cwd(), 'artifacts', 'prod-readiness');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeArtifact(filename, payload) {
  const file = path.join(ensureArtifactDir(), filename);
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return file;
}

export function buildRunId(prefix = 'prod') {
  const iso = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${iso}`;
}

function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const raw = headers.get('set-cookie');
  return raw ? [raw] : [];
}

export class LiveClient {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.cookies = new Map();
  }

  updateCookies(response) {
    const setCookies = extractSetCookies(response.headers);
    setCookies.forEach((cookieLine) => {
      const pair = String(cookieLine || '').split(';')[0];
      const [name, ...rest] = pair.split('=');
      if (!name || rest.length === 0) {
        return;
      }
      this.cookies.set(name.trim(), rest.join('=').trim());
    });
  }

  cookieHeader() {
    return Array.from(this.cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
  }

  async requestJson(pathname, init = {}) {
    const headers = new Headers(init.headers || {});
    const cookieHeader = this.cookieHeader();
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }
    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...init,
      headers,
    });

    this.updateCookies(response);
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }

  async login(username, key, rememberMe = true) {
    return await this.requestJson('/api/functions/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        key,
        remember_me: rememberMe,
      }),
    });
  }
}

export async function recoverAdminCredentials(client, env) {
  if (!env?.bootstrapSecret) {
    throw new Error('No bootstrap recovery token is configured for live proof');
  }

  const recovered = await client.requestJson('/api/functions/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify({
      recovery_token: env.bootstrapSecret,
    }),
  });

  if (!recovered.ok || recovered.data?.success !== true || typeof recovered.data?.key !== 'string') {
    throw new Error(`Admin bootstrap recovery failed: ${recovered.data?.error || recovered.status}`);
  }

  return {
    username: String(recovered.data?.username || env.adminUsername || 'system-admin').trim() || 'system-admin',
    key: recovered.data.key,
    source: 'bootstrap_recovery',
  };
}

export async function loginAsAdmin(client, env, rememberMe = true) {
  if (env?.adminKey) {
    const credentials = {
      username: env.adminUsername,
      key: env.adminKey,
      source: 'issued_key',
    };
    const login = await client.login(credentials.username, credentials.key, rememberMe);
    if (login.ok && !login.data?.error) {
      return { credentials, login };
    }

    if (!env?.bootstrapSecret) {
      return { credentials, login };
    }
  }

  const recoveredCredentials = await recoverAdminCredentials(client, env);
  const recoveryLogin = await client.login(recoveredCredentials.username, recoveredCredentials.key, rememberMe);
  return {
    credentials: recoveredCredentials,
    login: recoveryLogin,
  };
}
