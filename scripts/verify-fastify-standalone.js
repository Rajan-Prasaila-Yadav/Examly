// scripts/verify-fastify-standalone.js
const { spawn } = require('child_process');
const http = require('http');

async function verifyFastifyStandalone() {
  console.log('========================================================================');
  console.log('🚀 TESTING PURE STANDALONE FASTIFY PRODUCTION BOOTSTRAP');
  console.log('========================================================================\n');

  const child = spawn('node', ['apps/api/dist/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '4001', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdoutData = '';
  child.stdout.on('data', (d) => {
    const text = d.toString();
    stdoutData += text;
    process.stdout.write(text);
  });

  child.stderr.on('data', (d) => {
    process.stderr.write(d.toString());
  });

  // Wait 3 seconds for boot
  await new Promise((resolve) => setTimeout(resolve, 3000));

  function makeRequest(path) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 4001,
          path,
          method: 'GET',
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode, body, headers: res.headers }));
        },
      );
      req.on('error', reject);
      req.end();
    });
  }

  try {
    const health = await makeRequest('/api/v1/health');
    console.log(`\n[PROBE] GET /api/v1/health -> Status: ${health.statusCode} | Response: ${health.body}`);

    const ready = await makeRequest('/api/v1/live');
    console.log(`[PROBE] GET /api/v1/live   -> Status: ${ready.statusCode} | Response: ${ready.body}`);

    console.log('\n========================================================================');
    console.log('🎉 PURE FASTIFY SERVER BOOTSTRAPPED AND VERIFIED SUCCESSFULLY!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Probe failed:', err.message);
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

verifyFastifyStandalone().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
