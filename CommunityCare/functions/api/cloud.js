function json(data, status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
  });
}

function allowedTarget(target){
  try{
    const u=new URL(target);
    return (u.protocol==="https:" &&
      (u.hostname==="script.google.com" || u.hostname.endsWith(".googleusercontent.com")));
  }catch(e){return false;}
}

export async function onRequestPost(context){
  try{
    const req=await context.request.json();
    const target=String(req?.target||"").trim();
    const action=String(req?.action||"").trim();
    const payload=req?.payload||{};

    if(!allowedTarget(target)) return json({ok:false,error:"Google Apps Script Web App URL ไม่ถูกต้องหรือไม่ใช่ HTTPS"},400);
    if(!action) return json({ok:false,error:"ไม่พบ action"},400);

    const body=Object.assign({action},payload||{});
    const r=await fetch(target,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(body),
      redirect:"follow"
    });
    const text=await r.text();

    if(!r.ok) return json({ok:false,error:`Google Apps Script HTTP ${r.status}`,detail:text.slice(0,500)},502);

    try{
      return new Response(text,{
        status:200,
        headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
      });
    }catch(e){
      return json({ok:false,error:"Google Apps Script ส่งข้อมูลกลับมาไม่ถูกต้อง"},502);
    }
  }catch(e){
    return json({ok:false,error:"Cloudflare Proxy: "+String(e?.message||e)},500);
  }
}
