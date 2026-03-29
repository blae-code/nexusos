import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { buildRunId, ensureArtifactDir, LiveClient, loadLiveEnv, loginAsAdmin } from '../scripts/prod/lib/live-proof.mjs';

const env = loadLiveEnv();
const runId = buildRunId('live-proof');
const artifactDir = ensureArtifactDir();
const manifestFile = path.join(artifactDir, `${runId}-manifest.json`);
let adminCredentials = null;
const manifest = {
  run_id: runId,
  created_at: new Date().toISOString(),
  base_url: env.baseUrl,
  admin_auth_source: null,
  records: [],
  cleanup: null,
};

function saveManifest() {
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function loginThroughGate(page, username, authKey) {
  await page.goto('/');
  await page.getByPlaceholder('ENTER ISSUED USERNAME').fill(username);
  await page.getByPlaceholder('ENTER ACCESS KEY').fill(authKey);
  await page.getByRole('button', { name: /CONTINUE/i }).click();
  await page.waitForURL(/\/(?:onboarding|app)(?:\/|$)/, { timeout: 20000 });
}

async function completeOnboardingIfNeeded(page) {
  if (!page.url().includes('/onboarding')) {
    return;
  }

  await page.getByText('Welcome,', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });

  const advanceStep = async (currentMarker, nextMarker) => {
    const currentNode = page.getByText(currentMarker, { exact: true }).first();
    if (!(await currentNode.isVisible().catch(() => false))) {
      return;
    }

    await page.getByRole('button', { name: /^CONTINUE/i }).first().click();
    await page.getByText(nextMarker, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  };

  await advanceStep('Welcome,', 'How It Works');
  await advanceStep('How It Works', 'Recommended Setup');
  await advanceStep('Recommended Setup', 'Privacy Disclosure');

  const privacyPanel = page.getByText('Last Updated: 2026-03-23').first();
  await privacyPanel.waitFor({ state: 'visible', timeout: 10000 });
  await privacyPanel.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });

  await expect(page.getByRole('button', { name: /^CONTINUE/i })).toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: /^CONTINUE/i }).click();
  await page.getByText('Consent & Preferences', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('I have read and agree to the NexusOS data disclosure').click();
  await page.getByText('I understand that my assigned rank determines my access level within NexusOS').click();
  await page.getByRole('button', { name: /ENTER NEXUSOS/i }).click();
}

async function signOut(page) {
  await page.getByRole('button', { name: /SIGN OUT/i }).click();
  await expect(page.getByPlaceholder('ENTER ISSUED USERNAME')).toBeVisible();
}

async function callAuthedFunction(page, pathname, body) {
  return await page.evaluate(async ({ pathname: nextPathname, body: nextBody }) => {
    const response = await fetch(nextPathname, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextBody),
    });
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }, { pathname, body });
}

test.describe.serial('Live Production Proof', () => {
  test.beforeAll(async () => {
    const client = new LiveClient(env.baseUrl);
    const { credentials, login } = await loginAsAdmin(client, env, true);
    if (!login.ok || login.data?.error) {
      throw new Error(`Admin login failed before Playwright run: ${login.data?.error || login.status}`);
    }

    adminCredentials = credentials;
    manifest.admin_auth_source = credentials.source;
    saveManifest();
  });

  test.afterAll(async () => {
    if (manifest.records.length === 0) {
      saveManifest();
      return;
    }

    const client = new LiveClient(env.baseUrl);
    const { credentials, login } = await loginAsAdmin(client, env, true);
    if (!login.ok || login.data?.error) {
      manifest.cleanup = {
        ok: false,
        error: `admin_login_failed: ${login.data?.error || login.status}`,
      };
      saveManifest();
      return;
    }

    manifest.admin_auth_source = credentials.source;

    const cleanup = await client.requestJson('/api/functions/prodReadiness', {
      method: 'POST',
      body: JSON.stringify({
        action: 'cleanup_records',
        records: manifest.records,
      }),
    });

    manifest.cleanup = cleanup.data || {
      ok: false,
      error: cleanup.status,
    };
    saveManifest();
  });

  test('existing admin session survives login, refresh, logout, and re-login', async ({ page }) => {
    await loginThroughGate(page, adminCredentials.username, adminCredentials.key);
    await completeOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/app(\/|$)/);

    await page.reload();
    await expect(page).toHaveURL(/\/app(\/|$)/);

    const session = await page.evaluate(async () => {
      const response = await fetch('/api/functions/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      return await response.json();
    });

    expect(session.authenticated).toBe(true);

    await signOut(page);
    await loginThroughGate(page, adminCredentials.username, adminCredentials.key);
    await completeOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/app(\/|$)/);
    await signOut(page);
  });

  test('new issued-key user can onboard, then revoke and re-login with regenerated key', async ({ page }) => {
    const qaUsername = `qa-${Date.now()}`;

    await loginThroughGate(page, adminCredentials.username, adminCredentials.key);
    await completeOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/app(\/|$)/);

    const issued = await callAuthedFunction(page, '/api/functions/auth/keys', {
      action: 'issue',
      username: qaUsername,
      nexus_rank: 'QUARTERMASTER',
    });

    expect(issued.ok).toBe(true);
    expect(typeof issued.data?.key).toBe('string');
    expect(typeof issued.data?.user?.id).toBe('string');

    manifest.records.push({ entity: 'NexusUser', id: issued.data.user.id });
    saveManifest();

    const issuedKey = issued.data.key;
    await signOut(page);

    await loginThroughGate(page, qaUsername, issuedKey);
    await completeOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/app\/industry/);

    await page.reload();
    await expect(page).toHaveURL(/\/app(\/|$)/);
    await signOut(page);

    await loginThroughGate(page, adminCredentials.username, adminCredentials.key);
    await completeOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/app(\/|$)/);

    const revoked = await callAuthedFunction(page, '/api/functions/auth/keys', {
      action: 'revoke',
      user_id: issued.data.user.id,
    });
    expect(revoked.ok).toBe(true);
    await signOut(page);

    await loginThroughGate(page, qaUsername, issuedKey);
    await expect(page.getByText(/ACCESS REVOKED|INVALID CREDENTIALS/i)).toBeVisible();

    await loginThroughGate(page, adminCredentials.username, adminCredentials.key);
    await completeOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/app(\/|$)/);

    const regenerated = await callAuthedFunction(page, '/api/functions/auth/keys', {
      action: 'regenerate',
      user_id: issued.data.user.id,
    });
    expect(regenerated.ok).toBe(true);
    expect(typeof regenerated.data?.key).toBe('string');
    await signOut(page);

    await loginThroughGate(page, qaUsername, regenerated.data.key);
    await completeOnboardingIfNeeded(page);
    await expect(page).toHaveURL(/\/app\/industry/);
    await signOut(page);
  });
});
