import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const port = 4387;
const baseUrl = `http://${host}:${port}`;
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", host, "--port", String(port)],
  { stdio: "ignore", env: process.env },
);

async function stopServer() {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      delay(3000),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js production server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The server is still starting.
    }
    await delay(500);
  }
  if (!ready) throw new Error("Next.js production server did not become ready in time.");

  const routes = [
    "/",
    "/login",
    "/guest",
    "/gift",
    "/account",
    "/admin",
    "/admin/login",
    "/admin/review",
    "/admin/studio",
    "/g/smoke-test-story",
  ];
  const assets = new Set();

  for (const route of routes) {
    const response = await fetch(new URL(route, baseUrl));
    if (!response.ok) {
      throw new Error(`Route ${route} returned HTTP ${response.status}`);
    }
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) {
      throw new Error(`Route ${route} did not return HTML (${type})`);
    }
    const html = await response.text();
    for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)) {
      assets.add(match[1]);
    }
    console.log(`PASS ${route} -> HTTP ${response.status}`);
  }

  const protectedRoute = await fetch(new URL("/private-admin/smoke-invalid-key", baseUrl));
  if (protectedRoute.status !== 404) {
    throw new Error(`Invalid private Admin route should return 404, got HTTP ${protectedRoute.status}`);
  }
  console.log("PASS invalid private Admin route -> HTTP 404");

  for (const asset of assets) {
    const response = await fetch(new URL(asset, baseUrl));
    if (!response.ok) {
      throw new Error(`Static asset ${asset} returned HTTP ${response.status}`);
    }
  }
  console.log(`PASS ${assets.size} static JS/CSS assets`);
} finally {
  await stopServer();
}
