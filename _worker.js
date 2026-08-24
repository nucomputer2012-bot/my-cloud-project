/**
 * Community Care - Cloudflare Pages Advanced Mode Worker
 * Routes /api/cloud to Google Apps Script and serves the static site for everything else.
 *
 * IMPORTANT:
 * - This file must be deployed in the Pages output directory.
 * - When _worker.js is present, Cloudflare Pages Advanced Mode uses this Worker
 *   instead of the /functions directory.
 */

const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "cache-control": "no-store, no-cache, must-revalidate",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "Content-Type");
  headers.set("cache-control", "no-store, no-cache, must-revalidate");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isAllowedGoogleScript(url) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (
        u.hostname === "script.google.com" ||
        u.hostname === "script.googleusercontent.com"
      )
    );
  } catch {
    return false;
  }
}

function appendQuery(url, key, value) {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

async function proxyToGoogle(request) {
  let input = {};
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, error: "ข้อมูลคำขอจากหน้าเว็บไม่ใช่ JSON" }, 400);
  }

  const target = String(input.target || "").trim();
  const action = String(input.action || "").trim();
  const payload = input.payload && typeof input.payload === "object"
    ? input.payload
    : {};

  if (!target) {
    return json({ ok: false, error: "ไม่พบ Google Apps Script Web App URL" }, 400);
  }

  if (!isAllowedGoogleScript(target)) {
    return json({
      ok: false,
      error: "URL Google Apps Script ไม่ถูกต้องหรือไม่ใช่โดเมนที่อนุญาต"
    }, 400);
  }

  if (!action) {
    return json({ ok: false, error: "ไม่พบ action" }, 400);
  }

  try {
    let upstreamResponse;

    if (action === "getAll") {
      const url = appendQuery(target, "action", "getAll");
      upstreamResponse = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "accept": "application/json" },
      });
    } else {
      const body = JSON.stringify(Object.assign({ action }, payload));
      upstreamResponse = await fetch(target, {
        method: "POST",
        redirect: "follow",
        headers: {
          "content-type": "text/plain;charset=utf-8",
          "accept": "application/json",
        },
        body,
      });
    }

    const text = await upstreamResponse.text();

    // GAS should return JSON. Pass it through unchanged so the existing
    // Community Care front-end can parse the same response.
    if (!upstreamResponse.ok) {
      return json({
        ok: false,
        error: `Google Apps Script HTTP ${upstreamResponse.status}`,
        detail: text.slice(0, 2000),
      }, 502);
    }

    try {
      const data = JSON.parse(text);
      return json(data, 200);
    } catch {
      return json({
        ok: false,
        error: "Google Apps Script ส่งข้อมูลกลับมาไม่ใช่ JSON",
        detail: text.slice(0, 2000),
      }, 502);
    }
  } catch (err) {
    return json({
      ok: false,
      error: "Cloudflare ไม่สามารถเชื่อมต่อ Google Apps Script ได้",
      detail: String(err?.message || err),
    }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // This diagnostic response is intentional. Visiting /api/cloud directly
    // in a browser should NEVER show the Community Care index page.
    if (url.pathname === "/api/cloud") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: JSON_HEADERS });
      }

      if (request.method === "POST") {
        return proxyToGoogle(request);
      }

      if (request.method === "GET") {
        return json({
          ok: true,
          service: "Community Care Cloud Proxy",
          status: "running",
          message: "Cloudflare /api/cloud ทำงานแล้ว กรุณาเรียกผ่าน POST จากระบบ",
        });
      }

      return json({ ok: false, error: "Method Not Allowed" }, 405);
    }

    // Everything else is the normal static Community Care website.
    return env.ASSETS.fetch(request);
  },
};
