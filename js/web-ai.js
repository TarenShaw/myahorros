/* Yearly Budget Tracker (web version): reading statements with AI, using the visitor's own account.
   Plays the part of Claude's `sample` for the page: sample.json(prompt,{images,signal,onText}) answers with the JSON object.
   - Claude, ChatGPT or Gemini with the visitor's own API key: the request goes straight from this browser to that
     company; the key is kept only in this browser (or only until the tab closes, if they prefer);
   - no key: copy the request into any AI chat (a ChatGPT Plus account works), paste the answer back.
   The page checks every answer the same way (balances, review screen) before anything is saved. */
(function(){
'use strict';
if(window.Neutralino) return;
const KEY='ybt.ai', SKEY='ybt.ai.key';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls={ get(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }, set(k,v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(_){} } };
const ss={ get(k){ try{ return sessionStorage.getItem(k); }catch(_){ return null; } }, set(k,v){ try{ if(v==null) sessionStorage.removeItem(k); else sessionStorage.setItem(k,v); }catch(_){} } };
/* the page passes its language whenever it asks for text; that's the one on screen */
let pageLang=null;
const seeLang=l=>{ if(l==='es'||l==='en') pageLang=l; };
function lang(){ if(pageLang) return pageLang; try{ const s=window.__ybtWeb&&window.__ybtWeb.store; const l=s&&s.config&&s.config.settings&&s.config.settings.lang; if(l==='es'||l==='en') return l; }catch(_){}
  const v=ls.get('ybt.lang'); if(v==='es'||v==='en') return v; return /^es\b/i.test(navigator.language||'')?'es':'en'; }

const P={
  anthropic:{name:'Claude', company:'Anthropic', keyUrl:'https://console.anthropic.com/settings/keys', keyHint:'sk-ant-…', keyRe:/^sk-ant-/},
  openai:{name:'ChatGPT', company:'OpenAI', keyUrl:'https://platform.openai.com/api-keys', keyHint:'sk-…', keyRe:/^sk-/},
  gemini:{name:'Gemini', company:'Google', keyUrl:'https://aistudio.google.com/apikey', keyHint:'AIza… or AQ.…', keyRe:/^(AIza|AQ\.)/},
  paste:{name:null}
};
const TX={
  en:{
    title:'Read statements with AI', sub:'Pick the AI that reads your statements. Your files go straight from this browser to the company you pick, never to this website.',
    anthropicS:'Your own Anthropic API key. Pay per use: usually a few cents per statement.',
    openaiS:'Your own OpenAI API key. The API is billed separately from a ChatGPT Plus subscription, per use.',
    geminiS:'Your own Google AI Studio key. Has a free tier; on the free tier Google may use what you send to improve its products, so a paid key is better for bank statements.',
    pasteT:'Copy and paste into an AI chat', pasteS:'No key needed: works with your ChatGPT Plus account, Claude, Gemini or any free chat. One extra step, and scanned pages or photos can’t be sent this way.',
    keyLabel:'API key', getKey:n=>`Get a key from ${n}`, remember:'Remember the key on this device', rememberHelp:'Otherwise you’re asked again after closing the tab.',
    keyPrivacy:'The key stays in this browser. It’s only ever sent to the company it belongs to.',
    check:'Check the key and save', checking:'Checking…', usePaste:'Use copy and paste', cancel:'Cancel',
    model:'Model', modelHelp:'Picked for you; change it if you prefer another.',
    badKey:'That key wasn’t accepted. Check you copied all of it.', noKey:'Paste your API key first.', wrongKey:(n,h)=>`That doesn’t look like a ${n} key. It should start with ${h}`,
    netFail:'Couldn’t reach the service. Check your connection and try again.', noModels:'Your key works, but no suitable model was found for it.',
    saved:n=>`${n} is ready to read your statements.`, savedPaste:'Copy and paste is ready.',
    pTitle:'Copy and paste into an AI chat', p1:'Copy the request. It has the instructions and your statements’ text.', copy:'Copy the request', copied:'Copied',
    p2:'Paste it into a new chat in ChatGPT, Claude or Gemini and send it.', p3:'When it has finished, copy its whole answer and paste it here:',
    pPlaceholder:'Paste the AI’s answer here', read:'Read the answer', pBad:'That doesn’t look like the whole answer. Copy everything the AI wrote, from the first { to the last }, and try again.',
    pSize:n=>`${n} characters. If the chat says it’s too long, send one month at a time.`, pTip:'Tip: use a new chat, so nothing from earlier conversations gets mixed in.',
    setTitleNone:'Set up AI…', setHelpNone:'Not set up yet. Use your own Claude, ChatGPT or Gemini key, or copy and paste into any AI chat.',
    setTitle:n=>'Change AI…', setHelp:(n,m)=>`Now using ${n}${m?' ('+m+')':''} with your own key.`, setHelpPaste:'Now using copy and paste: you paste the request into any AI chat and its answer back here.',
    forget:'Forget the AI key', forgetHelp:'Removes the key from this browser.', forgotten:'The AI key was removed from this browser.',
    privacy:n=>`Your files are read here, in this page, and their contents are sent from this browser straight to ${n} with your own key. Nothing goes to this website.`,
    privacyPaste:'Your files are read here, in this page. You copy their text into the AI chat yourself; nothing goes to this website.',
    label:'AI', change:'Change AI…',
    errWhat:'What went wrong', copyDetails:'Copy details', detailsCopied:'Copied',
    why_bad_key:n=>`${n} didn’t accept the API key. It may be wrong, expired, deleted, or limited to other websites or services.`,
    why_no_credit:n=>`Your ${n} account has no credit left, or it has reached its spending limit for the API.`,
    why_rate_limited:n=>`${n} is busy, or you’ve reached your usage limit. Wait a minute and try again.`,
    why_prompt_too_large:n=>`That’s more than ${n} can read in one request. Send fewer files at a time.`,
    why_output_truncated:n=>`${n}’s answer was longer than this model can write in one go, so it was cut off.`,
    why_model:n=>`The chosen model isn’t available to your ${n} key. Pick another model.`,
    why_network:n=>`${n} couldn’t be reached. This is usually your connection, an ad blocker or a firewall.`,
    why_timeout:n=>`${n} stopped answering for too long, so the request was stopped.`,
    why_server:n=>`${n} had a problem on its side. Try again in a few minutes.`,
    why_bad_request:n=>`${n} rejected the request, for example because of an unsupported file type or setting.`,
    why_refused:n=>`${n} declined to read these files. Check they are statements and try again.`,
    why_invalid_json:n=>`${n}’s answer wasn’t complete.`,
    why_other:n=>`Something unexpected went wrong talking to ${n}.`,
    cardTitle:'Reading statements with AI', cardSub:'The “Do it with AI” and “Read statements with AI” buttons read your bank statements and fill in transactions and balances for you to check.'
  },
  es:{
    title:'Leer extractos con IA', sub:'Elige la IA que lee tus extractos. Tus archivos van directamente de este navegador a la empresa que elijas, nunca a esta web.',
    anthropicS:'Tu propia clave de API de Anthropic. Pagas por uso: normalmente unos céntimos por extracto.',
    openaiS:'Tu propia clave de API de OpenAI. La API se paga aparte de una suscripción ChatGPT Plus, por uso.',
    geminiS:'Tu propia clave de Google AI Studio. Tiene un nivel gratuito; en él Google puede usar lo que envías para mejorar sus productos, así que para extractos bancarios es mejor una clave de pago.',
    pasteT:'Copiar y pegar en un chat de IA', pasteS:'Sin clave: sirve con tu cuenta ChatGPT Plus, Claude, Gemini o cualquier chat gratuito. Es un paso más, y así no se pueden enviar páginas escaneadas ni fotos.',
    keyLabel:'Clave de API', getKey:n=>`Consigue una clave en ${n}`, remember:'Recordar la clave en este dispositivo', rememberHelp:'Si no, se te vuelve a pedir al cerrar la pestaña.',
    keyPrivacy:'La clave se queda en este navegador. Solo se envía a la empresa a la que pertenece.',
    check:'Comprobar la clave y guardar', checking:'Comprobando…', usePaste:'Usar copiar y pegar', cancel:'Cancelar',
    model:'Modelo', modelHelp:'Elegido por ti; cámbialo si prefieres otro.',
    badKey:'Esa clave no se ha aceptado. Comprueba que la has copiado entera.', noKey:'Primero pega tu clave de API.', wrongKey:(n,h)=>`No parece una clave de ${n}. Debería empezar por ${h}`,
    netFail:'No se ha podido conectar con el servicio. Revisa la conexión y vuelve a intentarlo.', noModels:'Tu clave funciona, pero no se ha encontrado ningún modelo adecuado.',
    saved:n=>`${n} ya puede leer tus extractos.`, savedPaste:'Copiar y pegar está listo.',
    pTitle:'Copiar y pegar en un chat de IA', p1:'Copia la petición. Lleva las instrucciones y el texto de tus extractos.', copy:'Copiar la petición', copied:'Copiada',
    p2:'Pégala en un chat nuevo de ChatGPT, Claude o Gemini y envíala.', p3:'Cuando termine, copia toda su respuesta y pégala aquí:',
    pPlaceholder:'Pega aquí la respuesta de la IA', read:'Leer la respuesta', pBad:'Eso no parece la respuesta completa. Copia todo lo que escribió la IA, desde la primera { hasta la última }, y vuelve a intentarlo.',
    pSize:n=>`${n} caracteres. Si el chat dice que es demasiado largo, envía un mes cada vez.`, pTip:'Consejo: usa un chat nuevo, para que no se mezcle nada de conversaciones anteriores.',
    setTitleNone:'Configurar la IA…', setHelpNone:'Aún sin configurar. Usa tu propia clave de Claude, ChatGPT o Gemini, o copia y pega en cualquier chat de IA.',
    setTitle:n=>'Cambiar la IA…', setHelp:(n,m)=>`Ahora con ${n}${m?' ('+m+')':''} y tu propia clave.`, setHelpPaste:'Ahora con copiar y pegar: pegas la petición en cualquier chat de IA y su respuesta aquí.',
    forget:'Olvidar la clave de IA', forgetHelp:'Quita la clave de este navegador.', forgotten:'La clave de IA se ha quitado de este navegador.',
    privacy:n=>`Tus archivos se leen aquí, en esta página, y su contenido se envía desde este navegador directamente a ${n} con tu propia clave. No llega nada a esta web.`,
    privacyPaste:'Tus archivos se leen aquí, en esta página. Tú copias su texto en el chat de IA; no llega nada a esta web.',
    label:'la IA', change:'Cambiar la IA…',
    errWhat:'Qué ha fallado', copyDetails:'Copiar detalles', detailsCopied:'Copiado',
    why_bad_key:n=>`${n} no ha aceptado la clave de API. Puede ser incorrecta, haber caducado, estar borrada o limitada a otras webs o servicios.`,
    why_no_credit:n=>`Tu cuenta de ${n} no tiene saldo, o ha llegado a su límite de gasto para la API.`,
    why_rate_limited:n=>`${n} está ocupado, o has llegado a tu límite de uso. Espera un minuto y vuelve a intentarlo.`,
    why_prompt_too_large:n=>`Es más de lo que ${n} puede leer en una sola petición. Envía menos archivos a la vez.`,
    why_output_truncated:n=>`La respuesta de ${n} era más larga de lo que este modelo puede escribir de una vez, así que se cortó.`,
    why_model:n=>`El modelo elegido no está disponible con tu clave de ${n}. Elige otro modelo.`,
    why_network:n=>`No se ha podido conectar con ${n}. Suele ser la conexión, un bloqueador de anuncios o un cortafuegos.`,
    why_timeout:n=>`${n} tardó demasiado en responder, así que se detuvo la petición.`,
    why_server:n=>`${n} ha tenido un problema por su parte. Inténtalo de nuevo en unos minutos.`,
    why_bad_request:n=>`${n} ha rechazado la petición, por ejemplo por un tipo de archivo o un ajuste no admitido.`,
    why_refused:n=>`${n} no ha querido leer estos archivos. Comprueba que son extractos e inténtalo de nuevo.`,
    why_invalid_json:n=>`La respuesta de ${n} no estaba completa.`,
    why_other:n=>`Ha pasado algo inesperado al hablar con ${n}.`,
    cardTitle:'Leer extractos con IA', cardSub:'Los botones «Hacerlo con IA» y «Leer extractos con IA» leen tus extractos y rellenan movimientos y saldos para que los revises.'
  }
};
function t(k,...a){ const v=TX[lang()][k]; return typeof v==='function'?v(...a):v; }

/* ---------- saved choice ---------- */
function cfg(){ let c={}; try{ c=JSON.parse(ls.get(KEY)||'{}')||{}; }catch(_){} const k=c.key||ss.get(SKEY)||''; return {provider:P[c.provider]?c.provider:null,model:c.model||'',key:k,remember:!!c.key}; }
function saveCfg(c){ ls.set(KEY,JSON.stringify({provider:c.provider,model:c.model||'',key:c.remember&&c.key?c.key:undefined})); ss.set(SKEY,!c.remember&&c.key?c.key:null); }
function ready(){ const c=cfg(); return c.provider==='paste'||(c.provider&&c.key&&c.model)?c:null; }

/* ---------- talking to each service ---------- */
const API={
  anthropic:{
    headers:k=>({'x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true','content-type':'application/json'}),
    async models(k){ const r=await req('https://api.anthropic.com/v1/models?limit=100',{headers:this.headers(k)}); return ((await r.json()).data||[]).map(m=>m.id); },
    pick(ids){ return ids.find(i=>/sonnet/.test(i))||ids.find(i=>/opus/.test(i))||ids[0]; },
    request(k,model,prompt,imgs,maxTok){ return ['https://api.anthropic.com/v1/messages',{method:'POST',headers:this.headers(k),body:JSON.stringify({model,max_tokens:maxTok||outMax(),stream:true,
      messages:[{role:'user',content:[...imgs.map(i=>({type:'image',source:{type:'base64',media_type:i.type,data:i.data}})),{type:'text',text:prompt}]}]})}]; },
    delta(ev){ if(ev.type==='content_block_delta'&&ev.delta&&ev.delta.type==='text_delta') return ev.delta.text; if(ev.type==='error') throw mapErr(400,JSON.stringify(ev)); if(ev.type==='message_delta'&&ev.delta&&ev.delta.stop_reason==='refusal') throw {code:'refused'}; if(ev.type==='message_delta'&&ev.delta&&ev.delta.stop_reason==='max_tokens') throw {code:'output_truncated'}; return ''; }
  },
  openai:{
    headers:k=>({Authorization:'Bearer '+k,'content-type':'application/json'}),
    async models(k){ const r=await req('https://api.openai.com/v1/models',{headers:this.headers(k)}); return ((await r.json()).data||[]).sort((a,b)=>(b.created||0)-(a.created||0)).map(m=>m.id); },
    pick(ids){ const chat=ids.filter(i=>/^(gpt-|o\d)/.test(i)&&!/(audio|realtime|tts|transcribe|image|search|embedding|instruct|codex|nano|preview|\d{4}-\d{2}-\d{2})/.test(i));
      return chat.find(i=>/^gpt-[\d.]+(-[a-z]+)?$/.test(i)&&!/mini|luna/.test(i))||chat.find(i=>/^gpt-/.test(i))||chat[0]; },
    request(k,model,prompt,imgs,maxTok){ return ['https://api.openai.com/v1/chat/completions',{method:'POST',headers:this.headers(k),body:JSON.stringify({model,stream:true,max_completion_tokens:maxTok||outMax(),response_format:{type:'json_object'},
      messages:[{role:'user',content:[{type:'text',text:prompt},...imgs.map(i=>({type:'image_url',image_url:{url:`data:${i.type};base64,${i.data}`}}))]}]})}]; },
    delta(ev){ const c=ev.choices&&ev.choices[0]; if(c&&c.finish_reason==='content_filter') throw {code:'refused'}; if(c&&c.finish_reason==='length') throw {code:'output_truncated'}; return c&&c.delta&&c.delta.content||''; }
  },
  gemini:{
    headers:k=>({'x-goog-api-key':k,'content-type':'application/json'}),
    async models(k){ const r=await req('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:this.headers(k)});
      return ((await r.json()).models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>String(m.name).replace(/^models\//,'')); },
    pick(ids){ const v=i=>{ const m=i.match(/^gemini-(\d+(?:\.\d+)?)-flash(-preview)?$/); return m?+m[1]-(m[2]?0.01:0):-1; };
      const f=ids.filter(i=>v(i)>=0).sort((a,b)=>v(b)-v(a)); return f[0]||ids.find(i=>/^gemini-.*flash/.test(i)&&!/(tts|image|live|lite|exp)/.test(i))||ids.find(i=>/^gemini/.test(i)); },
    request(k,model,prompt,imgs,maxTok){ return [`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,{method:'POST',headers:this.headers(k),body:JSON.stringify({
      contents:[{role:'user',parts:[{text:prompt},...imgs.map(i=>({inline_data:{mime_type:i.type,data:i.data}}))]}],generationConfig:{responseMimeType:'application/json',maxOutputTokens:maxTok||outMax()}})}]; },
    delta(ev){ if(ev.promptFeedback&&ev.promptFeedback.blockReason) throw {code:'refused'}; const c=ev.candidates&&ev.candidates[0]; if(c&&/SAFETY|RECITATION|PROHIBITED/.test(c.finishReason||'')) throw {code:'refused'}; if(c&&c.finishReason==='MAX_TOKENS') throw {code:'output_truncated'};
      return c&&c.content&&(c.content.parts||[]).map(p=>p.text||'').join('')||''; }
  }
};
const outMax=()=>{ const m=window.YBT_MODELS; return m&&m.maxOutput||16000; };
const HEAD_MS=60000, IDLE_MS=90000, TRIES=3;
/* never let a key travel into an error message or into the details a person copies */
const clean=s=>String(s||'').replace(/\b(sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{10,}|AQ\.[0-9A-Za-z_.-]{10,})/g,'[key hidden]');
function providerMsg(body){ try{ const j=JSON.parse(body); const e=j.error||j; return String((e&&(e.message||e.detail))||j.message||'').trim(); }catch(_){ return ''; } }
function mapErr(status,body){
  const b=String(body||''), m=providerMsg(b), info={status,message:clean(m||b.slice(0,300)),body:clean(b.slice(0,1500))};
  const lim=b.match(/max_tokens[^>]*>\s*(\d+)\s*,?\s*which is the maximum/i);
  let code='other';
  if(lim){ code='max_tokens'; info.limit=+lim[1]; }
  else if(status===401||status===403||/API_KEY_INVALID|API key not valid|invalid x-api-key|Incorrect API key|invalid_api_key/i.test(b)) code='bad_key';
  else if(/credit balance is too low|insufficient_quota|billing|exceeded your current quota/i.test(b)) code='no_credit';
  else if(status===429||status===529||/overloaded|rate.?limit|RESOURCE_EXHAUSTED/i.test(b)) code='rate_limited';
  else if(status===413||/prompt is too long|context.?length|maximum context|too many tokens|exceeds the maximum/i.test(b)) code='prompt_too_large';
  else if(status===404||/model.*(not found|does not exist|not supported)|not_found_error/i.test(b)) code='model';
  else if(status>=500) code='server';
  else if(status===400) code='bad_request';
  return Object.assign(info,{code});
}
async function req(url,opt){
  let r; try{ r=await fetch(url,opt); }catch(e){ if(e&&e.name==='AbortError') throw {code:'cancelled'}; throw {code:'network',message:clean(e&&e.message)}; }
  if(!r.ok){ let b=''; try{ b=await r.text(); }catch(_){} throw mapErr(r.status,b); }
  return r;
}
async function stream(r,each,tick){
  const rd=r.body.getReader(), dec=new TextDecoder(); let buf='';
  for(;;){ const {done,value}=await rd.read(); if(done) break; if(tick) tick(); buf+=dec.decode(value,{stream:true});
    let i; while((i=buf.search(/\r?\n\r?\n/))>-1){ const chunk=buf.slice(0,i); buf=buf.slice(i).replace(/^\r?\n\r?\n/,'');
      const data=chunk.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('');
      if(!data||data==='[DONE]') continue; let ev; try{ ev=JSON.parse(data); }catch(_){ continue; } each(ev); } }
  const rest=buf.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('');
  if(rest&&rest!=='[DONE]'){ try{ each(JSON.parse(rest)); }catch(e){ if(e&&e.code) throw e; } }
}
const sleep=(ms,signal)=>new Promise((res,rej)=>{ const t=setTimeout(res,ms); if(signal) signal.addEventListener('abort',()=>{ clearTimeout(t); rej({code:'cancelled'}); },{once:true}); });
/* the object in the answer, even with ``` fences or a sentence around it */
function parseAnswer(text){
  let s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'');
  try{ return JSON.parse(s); }catch(_){}
  const a=s.indexOf('{'), b=s.lastIndexOf('}'); if(a<0||b<=a) return null;
  try{ return JSON.parse(s.slice(a,b+1)); }catch(_){ return null; }
}
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
const mimeOf=b=>b.type||MIME[String(b.name||'').split('.').pop().toLowerCase()]||'image/jpeg';
async function toPng(b){ const bm=await createImageBitmap(b), cv=document.createElement('canvas'); cv.width=bm.width; cv.height=bm.height; cv.getContext('2d').drawImage(bm,0,0);
  return new Promise((res,rej)=>cv.toBlob(x=>x?res(x):rej(new Error('image')),'image/png')); }
/* Gemini reads PNG, JPEG and WebP only, so anything else is converted to PNG first */
async function prep(p,b){ let blob=b, type=mimeOf(b); if(p==='gemini'&&!/^image\/(png|jpeg|webp)$/.test(type)){ blob=await toPng(b); type='image/png'; } return {type,data:await b64(blob)}; }
const b64=blob=>new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]); r.onerror=rej; r.readAsDataURL(blob); });

/* ---------- panels ---------- */
function panel(html){
  const el=document.createElement('div'); el.className='web-panel overlay ai-panel'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','ap-title');
  el.innerHTML=`<div class="web-panel-card">${html}<p class="web-msg" role="status" hidden></p><div class="web-details" hidden><pre></pre><button type="button" class="btn sm" data-x="copydetails">${esc(t('copyDetails'))}</button></div></div>`;
  document.body.appendChild(el);
  el.msg=(s,good)=>{ const m=el.querySelector('.web-msg'); m.textContent=s||''; m.hidden=!s; m.classList.toggle('good',!!good); el.querySelector('.web-details').hidden=true; };
  el.fail=e=>{ const x=explain(e); el.msg(x.why); const d=el.querySelector('.web-details'); d.querySelector('pre').textContent=x.details; d.hidden=false; el._details=x.details; };
  el.addEventListener('click',async e=>{ const b=e.target.closest('[data-x=copydetails]'); if(!b) return; await copyText(el._details||''); b.textContent=t('detailsCopied'); setTimeout(()=>{ if(b.isConnected) b.textContent=t('copyDetails'); },2000); });
  el.addEventListener('keydown',e=>{ if(e.key==='Escape'){ const c=el.querySelector('[data-x=cancel]'); if(c) c.click(); } e.stopPropagation(); });
  return el;
}
/* pick the AI (and key); resolves with the saved choice, or null if cancelled */
let setupOpen=null;
function setup(){
  if(setupOpen) return setupOpen;
  setupOpen=new Promise(resolve=>{
    const c=cfg(); let sel=c.provider||'anthropic', models=null;
    const card=(p,title,sub)=>`<button type="button" class="web-way ai-way${sel===p?' current':''}" data-p="${p}" aria-pressed="${sel===p}"><span><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`;
    const el=panel(`<p class="web-eyebrow">Yearly Budget Tracker</p><h2 id="ap-title">${esc(t('title'))}</h2><p class="web-sub">${esc(t('sub'))}</p>
      <div class="web-ways ai-ways">
        ${card('anthropic','Claude',t('anthropicS'))}${card('openai','ChatGPT',t('openaiS'))}${card('gemini','Gemini',t('geminiS'))}${card('paste',t('pasteT'),t('pasteS'))}
      </div>
      <div class="ai-key" id="ai-keybox">
        <label for="ai-key">${esc(t('keyLabel'))}</label>
        <input id="ai-key" type="password" autocomplete="off" spellcheck="false">
        <p class="web-hint"><a id="ai-getkey" target="_blank" rel="noopener noreferrer"></a> · ${esc(t('keyPrivacy'))}</p>
        <label class="ai-check"><input type="checkbox" id="ai-remember"${c.remember||!c.key?' checked':''}> ${esc(t('remember'))}</label>
        <div id="ai-modelbox" hidden><label for="ai-model">${esc(t('model'))}</label><select id="ai-model"></select><p class="web-hint">${esc(t('modelHelp'))}</p></div>
      </div>
      <div class="web-acts"><button type="button" class="btn primary" data-x="go"></button><button type="button" class="btn ghost" data-x="cancel">${esc(t('cancel'))}</button></div>`);
    const $=s=>el.querySelector(s), keyIn=$('#ai-key');
    if(c.key&&c.provider===sel) keyIn.value=c.key;
    const show=()=>{
      el.querySelectorAll('.ai-way').forEach(b=>{ const on=b.dataset.p===sel; b.classList.toggle('current',on); b.setAttribute('aria-pressed',on); });
      const api=sel!=='paste'; $('#ai-keybox').hidden=!api;
      if(api){ const p=P[sel]; keyIn.placeholder=p.keyHint; const a=$('#ai-getkey'); a.href=p.keyUrl; a.textContent=t('getKey',p.company); }
      $('#ai-modelbox').hidden=!(api&&models&&models.length>1);
      $('[data-x=go]').textContent=api?t('check'):t('usePaste'); el.msg('');
    };
    show();
    setTimeout(()=>{ (sel!=='paste'?keyIn:$('[data-x=go]')).focus(); },0);
    /* already set up: list the models the key can use, so another can be picked */
    const listModels=async()=>{ if(sel==='paste'||!keyIn.value.trim()) return; const p=sel;
      try{ const ms=await API[p].models(keyIn.value.trim()); if(p!==sel||!el.isConnected) return; models=ms;
        const cur=c.provider===p&&c.model&&ms.includes(c.model)?c.model:API[p].pick(ms);
        $('#ai-model').innerHTML=ms.filter(m=>p!=='openai'||/^(gpt-|o\d)/.test(m)).map(m=>`<option${m===cur?' selected':''}>${esc(m)}</option>`).join(''); show(); }catch(_){} };
    if(c.key&&c.provider===sel) listModels();
    /* a different key is checked again from scratch */
    keyIn.addEventListener('input',()=>{ if(models){ models=null; show(); } });
    const done=v=>{ el.remove(); setupOpen=null; resolve(v); };
    el.addEventListener('click',async e=>{
      const w=e.target.closest('.ai-way'); if(w){ if(w.dataset.p!==sel){ sel=w.dataset.p; models=null; keyIn.value=c.provider===sel?c.key:''; } show(); if(sel!=='paste') keyIn.focus(); return; }
      const b=e.target.closest('button[data-x]'); if(!b||b.dataset.x==='copydetails') return;
      if(b.dataset.x==='cancel'){ done(null); return; }
      if(sel==='paste'){ const n={provider:'paste',model:'',key:'',remember:false}; saveCfg(n); done(n); toast(t('savedPaste')); return; }
      const key=keyIn.value.trim(); if(!key){ el.msg(t('noKey')); keyIn.focus(); return; }
      if(!P[sel].keyRe.test(key)&&!(sel==='openai'&&/^sk-/.test(key))){ el.msg(t('wrongKey',P[sel].name,P[sel].keyHint)); keyIn.focus(); return; }
      const chosen=!$('#ai-modelbox').hidden?$('#ai-model').value:'';
      b.disabled=true; const was=b.textContent; b.textContent=t('checking');
      try{
        if(!models){ models=await API[sel].models(key); }
        const model=chosen||(c.provider===sel&&c.model&&models.includes(c.model)?c.model:API[sel].pick(models));
        if(!model){ el.msg(t('noModels')); return; }
        const n={provider:sel,model,key,remember:$('#ai-remember').checked}; saveCfg(n);
        done(n); toast(t('saved',P[sel].name));
      }catch(err){ el.fail(Object.assign({provider:P[sel].name},err&&err.code?err:{code:'other',message:String(err&&err.message||err)})); }
      finally{ if(el.isConnected){ b.disabled=false; b.textContent=was; } }
    });
  });
  return setupOpen;
}
async function copyText(s){ try{ await navigator.clipboard.writeText(s); return true; }catch(_){}
  const ta=document.createElement('textarea'); ta.value=s; ta.style.cssText='position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(_){} ta.remove(); return ok; }
function toast(s){ window.dispatchEvent(new CustomEvent('ybt-local-note',{detail:s})); }

/* copy and paste: shows the request, waits for the answer */
function pasteRound(prompt,signal){
  return new Promise((resolve,reject)=>{
    const el=panel(`<h2 id="ap-title">${esc(t('pTitle'))}</h2>
      <ol class="ai-steps">
        <li><p>${esc(t('p1'))}</p><div class="web-acts"><button type="button" class="btn primary" data-x="copy">${esc(t('copy'))}</button></div><p class="web-hint">${esc(t('pSize',prompt.length.toLocaleString(lang()==='es'?'es-ES':'en-GB')))}</p>
          <textarea class="ai-req" readonly rows="3" aria-label="${esc(t('copy'))}"></textarea></li>
        <li><p>${esc(t('p2'))}</p><p class="web-links"><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a><a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Claude</a><a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">Gemini</a></p><p class="web-hint">${esc(t('pTip'))}</p></li>
        <li><p>${esc(t('p3'))}</p><textarea id="ai-answer" rows="7" placeholder="${esc(t('pPlaceholder'))}"></textarea></li>
      </ol>
      <div class="web-acts"><button type="button" class="btn primary" data-x="read">${esc(t('read'))}</button><button type="button" class="btn ghost" data-x="cancel">${esc(t('cancel'))}</button></div>`);
    el.querySelector('.ai-req').value=prompt;
    const fin=(fn,v)=>{ el.remove(); fn(v); };
    if(signal) signal.addEventListener('abort',()=>{ if(el.isConnected) fin(reject,{code:'cancelled'}); },{once:true});
    el.addEventListener('click',async e=>{ const b=e.target.closest('button[data-x]'); if(!b) return;
      if(b.dataset.x==='cancel'){ fin(reject,{code:'cancelled'}); return; }
      if(b.dataset.x==='copy'){ let ok=false; try{ await navigator.clipboard.writeText(prompt); ok=true; }catch(_){}
        if(!ok){ const ta=el.querySelector('.ai-req'); ta.focus(); ta.select(); try{ ok=document.execCommand('copy'); }catch(_){} }
        b.textContent=t('copied'); setTimeout(()=>{ if(b.isConnected) b.textContent=t('copy'); },2500); return; }
      if(b.dataset.x==='read'){ const v=parseAnswer(el.querySelector('#ai-answer').value); if(!v||typeof v!=='object'){ el.msg(t('pBad')); return; } fin(resolve,v); }
    });
  });
}

/* ---------- what the page calls ---------- */
async function ensure(){ return ready()||await setup(); }
/* one request, stopped if the service goes quiet */
async function once(c,A,prompt,imgs,opts,maxTok){
  const ac=new AbortController(); let timedOut=false, timer;
  const arm=ms=>{ clearTimeout(timer); timer=setTimeout(()=>{ timedOut=true; ac.abort(); },ms); };
  const onAbort=()=>ac.abort();
  if(opts.signal){ if(opts.signal.aborted) throw {code:'cancelled'}; opts.signal.addEventListener('abort',onAbort,{once:true}); }
  try{
    const [url,o]=A.request(c.key,c.model,prompt,imgs,maxTok);
    arm(HEAD_MS);
    const r=await req(url,Object.assign(o,{signal:ac.signal}));
    let text='';
    await stream(r,ev=>{ const d=A.delta(ev); if(d){ text+=d; if(typeof opts.onText==='function') try{ opts.onText({text}); }catch(_){} } },()=>arm(IDLE_MS));
    const v=parseAnswer(text); if(!v||typeof v!=='object') throw {code:'invalid_json'};
    return v;
  }catch(e){
    if(timedOut) throw {code:'timeout'};
    if(e&&e.name==='AbortError') throw {code:'cancelled'};
    throw e&&e.code?e:{code:'other',message:clean(e&&e.message)};
  }finally{ clearTimeout(timer); if(opts.signal) opts.signal.removeEventListener('abort',onAbort); }
}
/* what the error box shows: a plain reason, plus the facts to copy and send */
function explain(e,lg){
  seeLang(lg); e=e||{}; const c=cfg(), n=e.provider||(c.provider&&P[c.provider]&&P[c.provider].name)||(lang()==='es'?'la IA':'the AI');
  const k=TX[lang()]['why_'+e.code]?e.code:'other', model=e.model||c.model;
  const lines=['Provider: '+n, model?'Model: '+model:'', 'Problem: '+(e.code||'other'), e.status?'HTTP status: '+e.status:'', e.message?'Message from '+n+': '+clean(e.message):'', e.part?'Request: '+e.part:'', 'Time: '+(e.at||new Date().toISOString())].filter(Boolean);
  return {why:t('why_'+k,n), code:e.code||'other', status:e.status||null, message:e.message||'', details:lines.join('\n')};
}
async function json(prompt,opts){
  opts=opts||{};
  const c=await ensure(); if(!c) throw {code:'cancelled'};
  if(c.provider==='paste') return pasteRound(prompt,opts.signal);
  const imgs=[]; for(const b of opts.images||[]) imgs.push(await prep(c.provider,b));
  const A=API[c.provider]; let maxTok=null, err;
  for(let attempt=1;attempt<=TRIES;attempt++){
    try{ return await once(c,A,prompt,imgs,opts,maxTok); }
    catch(e){ err=e; if(!e||e.code==='cancelled') throw e;
      /* the model's own output limit is lower than ours: ask again within it */
      if(e.code==='max_tokens'&&e.limit&&maxTok!==e.limit&&attempt<TRIES){ maxTok=e.limit; continue; }
      if(!/^(rate_limited|network|server|timeout)$/.test(e.code)||attempt===TRIES) break;
      const wait=Math.min(20000,1500*Math.pow(2,attempt))+Math.random()*500;
      if(typeof opts.onRetry==='function') try{ opts.onRetry({attempt:attempt+1,max:TRIES,wait,code:e.code}); }catch(_){}
      await sleep(wait,opts.signal);
    }
  }
  err=Object.assign({},err,{provider:P[c.provider].name,model:c.model,at:new Date().toISOString()});
  if(err.code==='max_tokens') err.code='output_truncated';
  throw err;
}
async function limits(){ const c=await ensure(); if(!c) throw {code:'cancelled'}; return c.provider==='paste'?{images:null}:{images:{maxCount:20}}; }
const sample=Object.assign(async(...a)=>json(...a),{
  json, limits, explain, setup:async()=>{ const r=await setup(); window.dispatchEvent(new CustomEvent('ybt-local-render')); return r; },
  text(k,lg){ seeLang(lg); const c=cfg(); if(k==='aiPrivacy') return c.provider==='paste'?t('privacyPaste'):c.provider?t('privacy',P[c.provider].name):t('privacy',lang()==='es'?'la IA que elijas':'the AI you pick'); if(k==='aiChange') return t('change'); return null; }
});
Object.assign(sample,{
  actions:['aiSetup','aiForget'],
  extra(lg){ seeLang(lg); const c=cfg(), r=ready();
    const out=[{fn:'aiSetup',label:r?t('setTitle',c.provider==='paste'?t('pasteT'):P[c.provider].name):t('setTitleNone'),help:r?(c.provider==='paste'?t('setHelpPaste'):t('setHelp',P[c.provider].name,c.model)):t('setHelpNone')}];
    if(c.key) out.push({fn:'aiForget',label:t('forget'),help:t('forgetHelp')});
    return out; },
  async aiSetup(){ await setup(); window.dispatchEvent(new CustomEvent('ybt-local-render')); return null; },

  async aiForget(){ const c=cfg(); saveCfg({provider:null,model:'',key:'',remember:false}); ss.set(SKEY,null); window.dispatchEvent(new CustomEvent('ybt-local-render')); return {message:t('forgotten')}; },
  _parse:parseAnswer, _cfg:cfg
});
/* read each time: the choice and the language can change while the page is open */
Object.defineProperties(sample,{
  label:{get(){ const c=cfg(); return c.provider&&c.provider!=='paste'?P[c.provider].name:t('label'); }},
  title:{get(){ return t('cardTitle'); }}, sub:{get(){ return t('cardSub'); }}
});
window.YBT_AI={sample};
})();
