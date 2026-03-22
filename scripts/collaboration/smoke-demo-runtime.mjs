import mutateHandler from '../../api/demo/mutate.js';
import resetHandler from '../../api/demo/reset.js';
import sessionHandler from '../../api/demo/session.js';
import stateHandler from '../../api/demo/state.js';

function createResponse(label) {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function runHandler(label, handler, req) {
  const res = createResponse(label);
  await handler(req, res);
  if (res.statusCode >= 400) {
    throw new Error(`${label} failed with ${res.statusCode}: ${JSON.stringify(res.body)}`);
  }
  console.log(`${label}: ${res.statusCode}`);
  return res;
}

async function main() {
  await runHandler('state:get', stateHandler, { method: 'GET', query: {}, headers: {} });

  const sessionGet = await runHandler('session:get', sessionHandler, { method: 'GET', query: {}, headers: {} });
  if (sessionGet.body?.authenticated !== true || sessionGet.body?.persona_id !== 'voyager') {
    throw new Error(`session:get returned unexpected body: ${JSON.stringify(sessionGet.body)}`);
  }

  const sessionSet = await runHandler('session:set_persona', sessionHandler, {
    method: 'POST',
    headers: {},
    body: { action: 'set_persona', persona_id: 'scout' },
  });
  if (sessionSet.body?.persona_id !== 'scout') {
    throw new Error(`session:set_persona returned unexpected body: ${JSON.stringify(sessionSet.body)}`);
  }

  const mutateCreate = await runHandler('mutate:create', mutateHandler, {
    method: 'POST',
    headers: {},
    body: { action: 'create', entityType: 'RescueCall', data: { callsign: 'SMOKE_TEST', status: 'OPEN' } },
  });
  if (!mutateCreate.body?.record?.id) {
    throw new Error(`mutate:create returned unexpected body: ${JSON.stringify(mutateCreate.body)}`);
  }

  await runHandler('reset:post', resetHandler, {
    method: 'POST',
    headers: {},
    body: {},
  });

  const logout = await runHandler('session:logout', sessionHandler, {
    method: 'POST',
    headers: {},
    body: { action: 'logout' },
  });
  if (logout.body?.authenticated !== false) {
    throw new Error(`session:logout returned unexpected body: ${JSON.stringify(logout.body)}`);
  }

  console.log('collaboration smoke test passed');
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
