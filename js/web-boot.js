/* offline: keep the site's files on the device so it opens without internet */
if('serviceWorker' in navigator&&location.protocol==='https:'||'serviceWorker' in navigator&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
/* the footer's year follows the calendar */
document.addEventListener('DOMContentLoaded',()=>{ const y=document.getElementById('ybt-year'); if(y) y.textContent=String(new Date().getFullYear()); });
/* visit counter (GoatCounter, see privacy.html): a plain image request from this file instead of GoatCounter's script, so no
   outside code runs on the page. Only on the live site, and not when the browser asks not to be tracked */
if(location.hostname==='myahorros.app'&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl){
  window.addEventListener('load',()=>{ const q=new URLSearchParams({p:location.pathname,t:document.title,r:document.referrer,s:String(screen.width),rnd:Math.random().toString(36).slice(2)});
    new Image().src='https://myahorrosapp.goatcounter.com/count?'+q; });
}
