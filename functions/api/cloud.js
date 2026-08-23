/**
 * Community Care
 * Cloudflare Pages Function
 *
 * URL:
 * https://community-care.pages.dev/api/cloud
 *
 * หน้าที่:
 * Browser
 *    ↓
 * Cloudflare /api/cloud
 *    ↓
 * Google Apps Script Web App
 *
 * รองรับรูปแบบที่ Community Care v18 ใช้อยู่:
 *
 * POST body:
 * {
 *   target: "https://script.google.com/macros/s/XXXXX/exec",
 *   action: "getAll",
 *   payload: null
 * }
 *
 * หรือ
 *
 * {
 *   target: "...",
 *   action: "saveAll",
 *   payload: {
 *      people: [],
 *      help: [],
 *      statuses: []
 *   }
 * }
 */

const ALLOWED_ORIGIN = "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders()
    }
  });
}

/**
 * ตรวจสอบ URL ของ Google Apps Script
 *
 * อนุญาตเฉพาะ:
 * https://script.google.com/macros/s/XXXXX/exec
 */
function validateTarget(target) {
  if (!target) {
    throw new Error("ไม่ได้ระบุ Google Apps Script Web App URL");
  }

  let url;

  try {
    url = new URL(target);
  } catch (e) {
    throw new Error("Google Apps Script Web App URL ไม่ถูกต้อง");
  }

  if (url.protocol !== "https:") {
    throw new Error("Google Apps Script URL ต้องเป็น HTTPS");
  }

  if (url.hostname !== "script.google.com") {
    throw new Error(
      "URL นี้ไม่ใช่ Google Apps Script Web App"
    );
  }

  if (!url.pathname.startsWith("/macros/s/")) {
    throw new Error(
      "URL Google Apps Script ต้องเป็นรูปแบบ /macros/s/.../exec"
    );
  }

  if (!url.pathname.endsWith("/exec")) {
    throw new Error(
      "Google Apps Script Web App URL ต้องลงท้ายด้วย /exec"
    );
  }

  return url;
}

/**
 * อ่านข้อมูลจาก Google Apps Script
 * และพยายามแปลงเป็น JSON
 */
async function readGoogleResponse(response) {
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      error: "Google Apps Script ส่งข้อมูลกลับมาไม่ใช่ JSON",
      httpStatus: response.status,
      detail: text.substring(0, 5000)
    };
  }

  return data;
}

/**
 * OPTIONS
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

/**
 * GET
 *
 * รองรับ:
 * /api/cloud?action=getAll&target=...
 *
 * แต่ Community Care v18 จะใช้ POST เป็นหลัก
 */
export async function onRequestGet(context) {
  try {
    const requestUrl = new URL(context.request.url);

    const target = requestUrl.searchParams.get("target");
    const action = requestUrl.searchParams.get("action") || "getAll";

    const googleUrl = validateTarget(target);

    googleUrl.searchParams.set("action", action);
    googleUrl.searchParams.set("t", Date.now().toString());

    const response = await fetch(googleUrl.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await readGoogleResponse(response);

    if (!response.ok) {
      return json({
        ok: false,
        error: `Google Apps Script HTTP ${response.status}`,
        detail: data
      }, 502);
    }

    return json(data, 200);

  } catch (error) {
    return json({
      ok: false,
      error: error?.message || String(error)
    }, 502);
  }
}

/**
 * POST
 *
 * รูปแบบที่ Community Care v18 ส่งมา:
 *
 * {
 *   target,
 *   action,
 *   payload
 * }
 */
export async function onRequestPost(context) {

  try {

    const bodyText = await context.request.text();

    if (!bodyText) {
      return json({
        ok: false,
        error: "ไม่ได้รับข้อมูลจาก Community Care"
      }, 400);
    }

    let requestData;

    try {
      requestData = JSON.parse(bodyText);
    } catch (e) {
      return json({
        ok: false,
        error: "ข้อมูลที่ส่งมายัง Cloudflare ไม่ใช่ JSON"
      }, 400);
    }

    const target = requestData?.target;
    const action = requestData?.action;
    const payload = requestData?.payload || {};

    if (!action) {
      return json({
        ok: false,
        error: "ไม่ได้ระบุ action"
      }, 400);
    }

    const googleUrl = validateTarget(target);

    /**
     * สร้างข้อมูลสำหรับ Google Apps Script
     *
     * จาก:
     *
     * {
     *   target,
     *   action: "saveAll",
     *   payload: {
     *      people,
     *      help,
     *      statuses
     *   }
     * }
     *
     * เป็น:
     *
     * {
     *   action: "saveAll",
     *   people,
     *   help,
     *   statuses
     * }
     */
    const googlePayload = Object.assign(
      { action },
      payload || {}
    );

    const response = await fetch(googleUrl.toString(), {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "Accept": "application/json"
      },
      body: JSON.stringify(googlePayload)
    });

    const data = await readGoogleResponse(response);

    if (!response.ok) {
      return json({
        ok: false,
        error: `Google Apps Script HTTP ${response.status}`,
        detail: data
      }, 502);
    }

    return json(data, 200);

  } catch (error) {

    return json({
      ok: false,
      error: error?.message || String(error)
    }, 502);

  }
}
