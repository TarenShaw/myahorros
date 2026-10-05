/* offline: keep the site's files on the device so it opens without internet */
if('serviceWorker' in navigator&&location.protocol==='https:'||'serviceWorker' in navigator&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
