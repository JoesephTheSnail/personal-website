#!/usr/bin/env node
// One-time local helper to mint a Strava refresh token for the Fitness
// dashboard. This is intentionally NOT a deployed route on the public
// site — running an OAuth "connect" flow on a public domain would let
// any visitor authorize their own Strava account against your dashboard.
// Run this once, from your own machine, and it never touches the server.
//
// Prerequisites:
//   1. Create an API application at https://www.strava.com/settings/api
//   2. Set "Authorization Callback Domain" to: localhost
//   3. Export your client id/secret before running:
//        export STRAVA_CLIENT_ID=xxxxx
//        export STRAVA_CLIENT_SECRET=xxxxx
//      (or edit the constants below)
//
// Usage:
//   node scripts/strava-auth.mjs
//
// It opens your browser to Strava's consent screen, catches the
// callback on localhost, exchanges the code for tokens, and prints the
// refresh token to paste into .env.local as STRAVA_REFRESH_TOKEN.

import http from 'node:http';
import { exec } from 'node:child_process';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const PORT = 8787;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'activity:read_all';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET env vars. See the header of this script.');
  process.exit(1);
}

const authorizeUrl =
  `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code&approval_prompt=auto&scope=${encodeURIComponent(SCOPE)}`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing ?code — authorization may have been denied.');
    server.close();
    return;
  }

  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`${tokenRes.status} ${await tokenRes.text()}`);
    }

    const data = await tokenRes.json();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Success — check your terminal, then close this tab.');

    console.log('\nAdd this to .env.local:\n');
    console.log(`STRAVA_CLIENT_ID=${CLIENT_ID}`);
    console.log(`STRAVA_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`STRAVA_REFRESH_TOKEN=${data.refresh_token}\n`);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Token exchange failed — see terminal.');
    console.error('Token exchange failed:', err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT} — opening browser for Strava authorization...`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} "${authorizeUrl}"`);
});
