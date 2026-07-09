#!/usr/bin/env node
// One-time local helper to mint a Google Calendar refresh token for the
// Fitness dashboard. Intentionally NOT a deployed route on the public
// site — see scripts/strava-auth.mjs for why. Run this once, from your
// own machine.
//
// Prerequisites:
//   1. Create a project at https://console.cloud.google.com
//   2. Enable the "Google Calendar API" for that project
//   3. Configure the OAuth consent screen (External, Testing mode is fine
//      since only you will authorize)
//   4. Create OAuth 2.0 credentials of type "Web application" with
//      authorized redirect URI: http://localhost:8788/callback
//   5. Export the client id/secret before running:
//        export GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
//        export GOOGLE_CLIENT_SECRET=xxxxx
//
// Usage:
//   node scripts/google-calendar-auth.mjs
//
// It opens your browser to Google's consent screen, catches the
// callback on localhost, exchanges the code for tokens, and prints the
// refresh token to paste into .env.local as GOOGLE_REFRESH_TOKEN.

import http from 'node:http';
import { exec } from 'node:child_process';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 8788;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars. See the header of this script.');
  process.exit(1);
}

const authorizeUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code&access_type=offline&prompt=consent` +
  `&scope=${encodeURIComponent(SCOPE)}`;

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
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`${tokenRes.status} ${await tokenRes.text()}`);
    }

    const data = await tokenRes.json();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Success — check your terminal, then close this tab.');

    if (!data.refresh_token) {
      console.log('\nNo refresh_token returned — you may have already authorized this app before.');
      console.log('Revoke access at https://myaccount.google.com/permissions and run this script again.\n');
    } else {
      console.log('\nAdd this to .env.local:\n');
      console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}\n`);
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Token exchange failed — see terminal.');
    console.error('Token exchange failed:', err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT} — opening browser for Google authorization...`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} "${authorizeUrl}"`);
});
