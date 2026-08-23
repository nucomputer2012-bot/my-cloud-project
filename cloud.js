function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function allowedTarget(target) {
  try {
    const u = new URL(target);
    return u.protocol === "https:" &&
      (u.hostname === "script.google.com" ||
       u.hostname.endsWith(".googleusercontent.com"));
  } catch (e) {
    return false;
  }
}

async function handle(context) {
  try {
    const req = context.request;
    let reqData = {};

    if (req.method === "POST") {
      const text = await req.text();
      if (text) {
        try { reqData = JSON.parse(text); }
        catch (e) { return json({ok:false, error:"คำขอจากหน้าเว็บไม่ใช่ JSON"}, 400); }
      }
    } else if (req.method === "GET") {
      const u = new URL(req.url);
      reqData = Object.fromEntries(u.searchParams.entries());
    } else if (req.method === "OPTIONS") {
      return new Response("", {status:204});
    } else {
      return json({ok:false, error:"Method ไม่รองรับ: " + req.method}, 405);
    }

    const target = String(reqData.target || "").trim();
    const action = String(reqData.action || "").trim();
    let payload = reqData.payload || {};

    if (!target) return json({ok:false, error:"ไม่พบ Google Apps Script Web App URL"}, 400);
    if (!allowedTarget(target)) {
      return json({ok:false, error:"Google Apps Script Web App URL ไม่ถูกต้องหรือไม่ใช่ HTTPS"}, 400);
    }
    if (!action) return json({ok:false, error:"ไม่พบ action"}, 400);

    // getAll is implemented as doGet in the user's Apps Script.
    // Other actions are sent through doPost.
    let url = target;
    let fetchOptions;

    if (action === "getAll") {
      url += (url.includes("?") ? "&" : "?") +
             "action=getAll&t=" + Date.now();
      fetchOptions = {
        method: "GET",
        redirect: "follow",
        cache: "no-store"
      };
    } else {
      const body = Object.assign({action}, payload || {});
      fetchOptions = {
        method: "POST",
        headers: {"Content-Type":"text/plain;charset=utf-8"},
        body: JSON.stringify(body),
        redirect: "follow"
      };
    }

    const r = await fetch(url, fetchOptions);
    const text = await r.text();

    if (!r.ok) {
      return json({
        ok:false,
        error:"Google Apps Script HTTP " + r.status,
        detail:text.slice(0,500)
      }, 502);
    }

    if (!text.trim()) {
      return json({
        ok:false,
        error:"Google Apps Script ไม่ส่งข้อมูลกลับมา",
        action
      }, 502);
    }

    try {
      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type":"application/json; charset=utf-8",
          "Cache-Control":"no-store"
        }
      });
    } catch (e) {
      return json({ok:false, error:"Google Apps Script ส่งข้อมูลกลับมาไม่ถูกต้อง"}, 502);
    }
  } catch (e) {
    return json({ok:false, error:"Cloudflare Proxy: " + String(e?.message || e)}, 500);
  }
}

// Universal handler: works for Pages Functions deployments even when
// method-specific exports are not recognized by the deployment mode.
export async function onRequest(context) {
  return handle(context);
}
