import { buildRunId, LiveClient, loadLiveEnv, loginAsAdmin, writeArtifact } from './lib/live-proof.mjs';

async function main() {
  const env = loadLiveEnv();
  const client = new LiveClient(env.baseUrl);
  const runId = buildRunId('audit');

  const { credentials, login } = await loginAsAdmin(client, env, true);
  if (!login.ok || login.data?.error) {
    throw new Error(`Admin login failed: ${login.data?.error || login.status}`);
  }

  const session = await client.requestJson('/api/functions/auth/session', { method: 'GET' });
  const roundtrip = await client.requestJson('/api/functions/auth/roundtrip', { method: 'POST' });
  const readiness = await client.requestJson('/api/functions/prodReadiness', {
    method: 'POST',
    body: JSON.stringify({ action: 'full_audit' }),
  });

  const artifact = {
    run_id: runId,
    executed_at: new Date().toISOString(),
    base_url: env.baseUrl,
    admin_auth_source: credentials.source,
    session: session.data,
    auth_roundtrip: roundtrip.data,
    prod_readiness: readiness.data,
  };

  const artifactFile = writeArtifact(`${runId}.json`, artifact);

  const failedChecks = Array.isArray(readiness.data?.failures) ? readiness.data.failures.length : 0;
  console.log(`Audit artifact: ${artifactFile}`);
  console.log(`Session authenticated: ${session.data?.authenticated === true}`);
  console.log(`Auth roundtrip ok: ${roundtrip.data?.ok === true}`);
  console.log(`Prod readiness ok: ${readiness.data?.ok === true}`);
  console.log(`Prod readiness failures: ${failedChecks}`);

  if (!(session.data?.authenticated === true) || !(roundtrip.data?.ok === true) || !(readiness.data?.ok === true)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[audit:prod]', error.message || error);
  process.exitCode = 1;
});
