// Cloudflare Pages Function: /api/content
// GET  -> 回傳目前存在 KV 裡的網站內容(html 字串),沒有的話回傳 null
// POST -> 驗證密碼後,把新的 html 內容寫進 KV

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const html = await env.SITE_KV.get('site-content');
    return new Response(JSON.stringify({ html: html || null }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ html: null, error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: '請求格式錯誤' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  if (!body || body.password !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ ok: false, error: '密碼錯誤' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  if (typeof body.html !== 'string' || body.html.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: '內容是空的' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  try {
    await env.SITE_KV.put('site-content', body.html);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
}
