import { buildRunId, LiveClient, loadLiveEnv, loginAsAdmin, writeArtifact } from './lib/live-proof.mjs';

async function issueInvite(client, username, rank = 'SCOUT') {
  const response = await client.requestJson('/api/functions/auth/keys', {
    method: 'POST',
    body: JSON.stringify({
      action: 'issue',
      username,
      nexus_rank: rank,
    }),
  });

  if (!response.ok || !response.data?.key || !response.data?.user?.id) {
    throw new Error(`Invite issue failed for ${username}: ${response.data?.error || response.status}`);
  }

  return response.data;
}

async function revokeInvite(client, userId) {
  const response = await client.requestJson('/api/functions/auth/keys', {
    method: 'POST',
    body: JSON.stringify({
      action: 'revoke',
      user_id: userId,
    }),
  });

  return {
    ok: response.ok && response.data?.ok === true,
    error: response.data?.error || null,
  };
}

async function verifyFreshInviteViaLogin(baseUrl, username, key) {
  const client = new LiveClient(baseUrl);
  const login = await client.login(username, key, true);
  const session = await client.requestJson('/api/functions/auth/session', { method: 'GET' });

  return {
    ok: login.ok && !login.data?.error && login.data?.success === true && login.data?.isNew === true && session.data?.authenticated === true,
    login_status: login.status,
    login_error: login.data?.error || null,
    login_success: login.data?.success === true,
    is_new: login.data?.isNew === true,
    session_authenticated: session.data?.authenticated === true,
  };
}

async function verifyFreshInviteViaRegister(baseUrl, username, key) {
  const client = new LiveClient(baseUrl);
  const register = await client.requestJson('/api/functions/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      key,
      remember_me: true,
    }),
  });
  const session = await client.requestJson('/api/functions/auth/session', { method: 'GET' });

  return {
    ok: register.ok && !register.data?.error && register.data?.success === true && register.data?.isNew === true && session.data?.authenticated === true,
    register_status: register.status,
    register_error: register.data?.error || null,
    register_success: register.data?.success === true,
    is_new: register.data?.isNew === true,
    session_authenticated: session.data?.authenticated === true,
  };
}

async function main() {
  const env = loadLiveEnv();
  const client = new LiveClient(env.baseUrl);
  const runId = buildRunId('auth-login-proof');
  const artifact = {
    run_id: runId,
    executed_at: new Date().toISOString(),
    base_url: env.baseUrl,
  };

  const { credentials, login } = await loginAsAdmin(client, env, true);
  artifact.admin_login = {
    source: credentials.source,
    ok: login.ok && !login.data?.error && login.data?.success === true,
    status: login.status,
    error: login.data?.error || null,
  };
  if (!artifact.admin_login.ok) {
    throw new Error(`Admin login failed: ${login.data?.error || login.status}`);
  }

  const adminSession = await client.requestJson('/api/functions/auth/session', { method: 'GET' });
  artifact.admin_session = {
    ok: adminSession.ok && adminSession.data?.authenticated === true,
    status: adminSession.status,
    error: adminSession.data?.error || null,
    authenticated: adminSession.data?.authenticated === true,
    user: adminSession.data?.user?.login_name || null,
  };
  if (!artifact.admin_session.ok) {
    throw new Error(`Admin session failed: ${adminSession.data?.error || adminSession.status}`);
  }

  const roundtrip = await client.requestJson('/api/functions/auth/roundtrip', { method: 'POST' });
  artifact.auth_roundtrip = roundtrip.data;
  if (!roundtrip.ok || roundtrip.data?.ok !== true) {
    throw new Error(`Auth roundtrip failed: ${roundtrip.data?.error || roundtrip.status}`);
  }

  const inviteLoginUsername = `diag-login-${Date.now().toString(36)}`;
  const inviteLoginIssue = await issueInvite(client, inviteLoginUsername);
  artifact.invite_login = {
    username: inviteLoginUsername,
    issue_ok: true,
    user_id: inviteLoginIssue.user.id,
  };
  try {
    Object.assign(artifact.invite_login, await verifyFreshInviteViaLogin(env.baseUrl, inviteLoginUsername, inviteLoginIssue.key));
    if (!artifact.invite_login.ok) {
      throw new Error(`Fresh invite login failed: ${artifact.invite_login.login_error || artifact.invite_login.login_status}`);
    }
  } finally {
    artifact.invite_login.cleanup = await revokeInvite(client, inviteLoginIssue.user.id);
  }

  const inviteRegisterUsername = `diag-register-${Date.now().toString(36)}`;
  const inviteRegisterIssue = await issueInvite(client, inviteRegisterUsername);
  artifact.invite_register = {
    username: inviteRegisterUsername,
    issue_ok: true,
    user_id: inviteRegisterIssue.user.id,
  };
  try {
    Object.assign(artifact.invite_register, await verifyFreshInviteViaRegister(env.baseUrl, inviteRegisterUsername, inviteRegisterIssue.key));
    if (!artifact.invite_register.ok) {
      throw new Error(`Fresh invite register failed: ${artifact.invite_register.register_error || artifact.invite_register.register_status}`);
    }
  } finally {
    artifact.invite_register.cleanup = await revokeInvite(client, inviteRegisterIssue.user.id);
  }

  const artifactFile = writeArtifact(`${runId}.json`, artifact);
  console.log(`Auth login proof artifact: ${artifactFile}`);
  console.log(`Admin login ok: ${artifact.admin_login.ok}`);
  console.log(`Admin session ok: ${artifact.admin_session.ok}`);
  console.log(`Auth roundtrip ok: ${artifact.auth_roundtrip?.ok === true}`);
  console.log(`Fresh invite login ok: ${artifact.invite_login.ok === true}`);
  console.log(`Fresh invite register ok: ${artifact.invite_register.ok === true}`);

  if (!(artifact.admin_login.ok && artifact.admin_session.ok && artifact.auth_roundtrip?.ok === true && artifact.invite_login.ok === true && artifact.invite_register.ok === true)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[verify:auth-logins]', error.message || error);
  process.exitCode = 1;
});
