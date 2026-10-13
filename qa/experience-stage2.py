from pathlib import Path
p=Path('index.html'); s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b,1)
# unify entry labels; retain familiar APIs for compatibility.
s=s.replace("pasteImport:['Paste or import','Pegar o importar']", "pasteImport:['Add a statement','Añadir un extracto']")
rep("  'import':()=>{ let t='auto';", "  'import':()=>{ let t='auto';")
rep("table:t,text:'',rows:[],bad:[],msg:''}); },", "table:t,text:'',rows:[],bad:[],msg:'',pick:true}); },")
rep("${mHead(esc(L('impTitle')),esc(L('impSub')))}", "${mHead(esc(L('addStatement')),esc(L('importFileHelp')))}")
rep("    ${S.downloads?`<div class=\"imp-tpl\">", "    <p class=\"hint\">${esc(L('localReadHelp'))}</p>\n    ${S.downloads?`<details class=\"imp-tpl\"><summary>${esc(L('dlTemplateBtn'))}</summary>")
rep("${esc(L('dlTemplateHint'))}</span></div>`:''}", "${esc(L('dlTemplateHint'))}</span></details>`:''}")
rep('accept=".xlsx,.xlsm,.xls,.csv,.txt" class="sr"></div>', 'accept=".xlsx,.xlsm,.xls,.csv,.txt,.tsv,.ods,.pdf,.png,.jpg,.jpeg,.webp,.gif" class="sr"></div>')
rep("${esc(L('impFileA'))}${S.downloads?`<button type=\"button\" class=\"linkish\" data-action=\"import-template\">${esc(L('impFileLink'))}</button>`:esc(L('impFileLink'))}${esc(L('impFileB'))}", "${esc(L('importFileHelp'))}")
rep("    <div class=\"field\"><label for=\"imp-table\">", "    <details><summary>${esc(L('advanced'))}</summary><div class=\"field\"><label for=\"imp-table\">")
rep("${esc(L('sortAutoHelp'))}</span></div>", "${esc(L('sortAutoHelp'))}</span></div></details>")
# local parser failure can reuse the already selected file in AI rather than starting over
rep("    ${m.msg?`<p class=\"field\"><span class=\"err\">${esc(m.msg)}</span></p>`:''}", "    ${S.ai?`<button class=\"btn\" type=\"button\" data-action=\"imp-ai\">${ICON.ai}${esc(L('useAiFallback'))}</button>`:''}\n    ${m.msg?`<p class=\"field\"><span class=\"err\">${esc(m.msg)}</span></p>`:''}")
rep("  const m=S.modal; m.table=($('#imp-table')||{}).value||m.table;", "  const m=S.modal; m.originalFile=file; if(/\\.(pdf|png|jpe?g|webp|gif)$/i.test(file.name)){ ACTIONS['imp-ai'](); return; } m.table=($('#imp-table')||{}).value||m.table;")
rep("/\\.(csv|txt)$/i.test(file.name)", "/\\.(csv|txt|tsv)$/i.test(file.name)")
rep("  'undo-import':()=>undoImport(),", "  'imp-ai':()=>{ const m=S.modal; if(!S.ai||!m) return; const file=m.originalFile; aiOpen({type:'ai',mode:'tx',files:file?[{file}]:[],acct:m.acct,pick:true,mid:true}); },\n  'undo-import':()=>undoImport(),")
rep("rows:[],bad:[],msg:'',ai:{out:tx.out", "rows:[],bad:[],msg:'',acct:m.acct,pick:true,ai:{out:tx.out")
# focus question rows, preserve original indexes through filtering
rep("const body=rows.slice(0,shown).map((r,i)=>", "const reviewRows=rows.map((r,i)=>({r,i})).filter(x=>!m.attention||impNeedsAttention(x.r));\n  const body=reviewRows.slice(0,shown).map(({r,i})=>")
rep("${m.pick?impAcctPick(m):''}${aiReviewNote(m)}", "${m.pick?impAcctPick(m):''}${importCoverage(m)}\n    <p class=\"notice\">${esc(L('reviewSummary',rows.filter(r=>r.on&&!impNeedsAttention(r)).length,rows.filter(impNeedsAttention).length,rows.filter(r=>!r.on).length))}</p><p class=\"hint\">${esc(L('reviewSafety'))}</p>\n    <div class=\"seg\"><button type=\"button\" data-action=\"imp-review-mode\" data-v=\"attention\" aria-pressed=\"${!!m.attention}\">${esc(L('needsAttention'))}</button><button type=\"button\" data-action=\"imp-review-mode\" data-v=\"all\" aria-pressed=\"${!m.attention}\">${esc(L('allRowsReview'))}</button></div>${aiReviewNote(m)}")
rep("${rows.length>shown?`<div class=\"more\">", "${reviewRows.length>shown?`<div class=\"more\">")
rep("Math.min(200,rows.length-shown)", "Math.min(200,reviewRows.length-shown)")
rep('function impAcctPick(m){',r'''function impNeedsAttention(r){ return !!((r.aiQ&&!r.aiA)||r.dup||r.like||r.future||r.balOff||r.odd!=null||r.fx||!r.category||!WORDCH.test(r.concept)); }
function importCoverage(m){
  if(!m.acct||!m.rows.length) return '';
  const ds=m.rows.map(r=>r.date).sort(), f=m.coverFrom||ds[0], t=m.coverTo||ds[ds.length-1];
  return `<fieldset class="field"><legend>${esc(L('period'))}</legend><label>${esc(L('fromDate'))}<input type="date" id="imp-period-from" value="${esc(f)}"></label><label>${esc(L('toDate'))}<input type="date" id="imp-period-to" value="${esc(t)}"></label><label class="check"><input type="checkbox" id="imp-period-confirm"${m.coverConfirmed?' checked':''}>${esc(L('periodConfirm'))}</label></fieldset>`;
}
function impAcctPick(m){''')
rep("  'imp-more':()=>", "  'imp-review-mode':el=>{ S.modal.attention=el.dataset.v==='attention'; renderModalKeepScroll(); },\n  'imp-more':()=>")
# optional source metadata and batch log. Do not put transaction amounts in metadata.
rep("const rows=m.rows.filter(r=>r.on); const by={}, added=[], pendNw=m.pendingNw;", "const rows=m.rows.filter(r=>r.on); const by={}, added=[], pendNw=m.pendingNw, batch=newId(), oldGuide=clone(S.settings.guide||{}), oldFp=clone(S.settings.stmtFp||{});\n  const coverageDates=m.rows.map(r=>r.date).sort(), cf=m.coverFrom||coverageDates[0], ct=m.coverTo||coverageDates[coverageDates.length-1];\n  if(m.coverConfirmed&&(!parseDate(cf)||!parseDate(ct)||cf>ct)){ toast(L('errDate')); return; }")
rep("concept:r.concept,category:r.category||''}); markDirty('months/'+mk); added.push", "concept:r.concept,category:r.category||'',batch,source:r.aiSrc||m.fileName||'',account:m.acct||''}); markDirty('months/'+mk); added.push")
rep("sts[m.acct]={from:o&&o.from<ds[0]?o.from:ds[0],to:o&&o.to>ds[ds.length-1]?o.to:ds[ds.length-1],n:(o?o.n:0)+rows.length};", "sts[m.acct]=Object.assign({},o||{},{from:o&&o.from<ds[0]?o.from:ds[0],to:o&&o.to>ds[ds.length-1]?o.to:ds[ds.length-1],n:(o?o.n:0)+rows.length});\n    if(m.coverConfirmed){ const merge=o&&o.coverFrom&&cf<=ymdAdd(o.coverTo,1)&&ct>=ymdAdd(o.coverFrom,-1); Object.assign(sts[m.acct],{coverFrom:merge&&o.coverFrom<cf?o.coverFrom:cf,coverTo:merge&&o.coverTo>ct?o.coverTo:ct}); }")
rep("S.lastImport=added.length?{added,n:added.length,bal:", "if(added.length){ const dates=rows.map(r=>r.date).sort(); setSettings({imports:(Array.isArray(S.settings.imports)?S.settings.imports:[]).concat([{id:batch,date:todayYmd(),source:m.fileName||'',account:m.acct||'',from:dates[0],to:dates[dates.length-1],n:added.length}])}); }\n  S.lastImport=added.length?{added,n:added.length,batch,oldGuide,oldFp,bal:")
rep("  S.lastImport=null; bump(); render(); toast(L('importUndone',n));", "  setSettings({guide:li.oldGuide||S.settings.guide,stmtFp:li.oldFp||S.settings.stmtFp,imports:(S.settings.imports||[]).map(x=>x.id===li.batch?Object.assign({},x,{undone:true}):x)});\n  S.lastImport=null; bump(); render(); toast(L('importUndone',n));")
rep("  if(id==='imp-balfill'&&S.modal)", "  if((id==='imp-period-from'||id==='imp-period-to')&&S.modal){ S.modal[id==='imp-period-from'?'coverFrom':'coverTo']=el.value; return; }\n  if(id==='imp-period-confirm'&&S.modal){ S.modal.coverConfirmed=el.checked; return; }\n  if(id==='imp-balfill'&&S.modal)")
# safe filter/snapshot fields; keys are row identity across months and tables.
rep("allYears:false},", "allYears:false,from:'',to:'',min:'',max:'',account:'',source:'',batch:'',selection:new Set()},")
helpers=r'''const txKey=r=>JSON.stringify([r.mk,r.table,r.id]);
function txMatches(r,u){
  if(u.from&&r.date<u.from||u.to&&r.date>u.to||u.account&&r.account!==u.account||u.source&&r.source!==u.source||u.batch&&r.batch!==u.batch) return false;
  const min=u.min===''||u.min==null?null:parseAmount(String(u.min),wantNum()), max=u.max===''||u.max==null?null:parseAmount(String(u.max),wantNum());
  return !(min!=null&&Math.abs(r.amount)<min||max!=null&&Math.abs(r.amount)>max);
}
function txView(){ const out={year:S.ui.year}; for(const k of ['table','q','month','cat','sort','allYears','from','to','min','max','account','source','batch']) out[k]=S.ui.tx[k]; return out; }
function savedTxViews(){ return Array.isArray(S.settings&&S.settings.txViews)?S.settings.txViews.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.filters&&typeof x.filters==='object'):[]; }
function applyTxView(v){
  const f=v.filters||{}, u=S.ui.tx; Object.assign(u,{q:'',month:'all',cat:'all',from:'',to:'',min:'',max:'',account:'',source:'',batch:'',allYears:false});
  for(const k of ['q','month','cat','sort','from','to','min','max','account','source','batch']) if(typeof f[k]==='string') u[k]=f[k].slice(0,500);
  if(TKEYS.includes(f.table)) u.table=f.table; u.allYears=f.allYears===true; if(Number.isInteger(f.year)&&f.year>=1900&&f.year<=2100) S.ui.year=f.year;
  u.selection.clear(); u.limit=150; render();
}
function modalBulkCategory(){
  const rows=allRows().filter(r=>S.ui.tx.selection.has(txKey(r))&&r.table===S.ui.tx.table); S.modal.refs=rows.map(r=>({mk:r.mk,table:r.table,id:r.id}));
  return `${mHead(esc(L('bulkCategory')),esc(L('bulkPreview',rows.length)))}<div class="m-body"><label for="bulk-cat">${esc(L('category'))}</label><select id="bulk-cat">${catOptions(S.ui.tx.table,'',true)}</select><ul>${rows.slice(0,50).map(r=>`<li>${esc(fmtDate(r.date))} · ${esc(r.concept)} · ${fmtEUR(r.amount)} · ${esc(r.category||L('uncat'))}</li>`).join('')}</ul>${rows.length>50?`<p>${esc(L('selectedCount',rows.length))}</p>`:''}</div><div class="m-foot"><button class="btn" data-action="close">${esc(L('cancel'))}</button><button class="btn primary" data-action="bulk-apply">${esc(L('bulkApply'))}</button></div>`;
}
function bulkApply(){
  if(!S.canWrite||!S.modal||S.modal.type!=='bulkcat') return; const cat=$('#bulk-cat').value, t=S.ui.tx.table; if(cat&&!isKnown(t,cat)) return;
  const before=[]; for(const ref of S.modal.refs){ const f=findRow(ref.mk,ref.table,ref.id); if(!f.row||f.row.category===cat) continue; before.push({ref,cat:f.row.category}); f.row.category=cat; markDirty('months/'+ref.mk); }
  S.ui.tx.selection.clear(); bump(); closeModal(); render(); toast(L('batchChanged',before.length),{label:L('undo'),fn:()=>{ for(const x of before){ const f=findRow(x.ref.mk,x.ref.table,x.ref.id); if(f.row&&f.row.category===cat){ f.row.category=x.cat; markDirty('months/'+x.ref.mk); } } bump(); render(); }});
}
function modalSaveView(){ return `${mHead(esc(L('saveView')))}<form id="save-view-form"><div class="m-body"><label for="view-name">${esc(L('viewName'))}</label><input id="view-name" maxlength="80" required></div><div class="m-foot"><button class="btn" type="button" data-action="close">${esc(L('cancel'))}</button><button class="btn primary" type="submit">${esc(L('saveChanges'))}</button></div></form>`; }
function modalImportHistory(){
  const xs=Array.isArray(S.settings.imports)?S.settings.imports:[];
  return `${mHead(esc(L('importHistory')),esc(L('importHistoryHelp')))}<div class="m-body"><ul class="wz-list">${xs.slice().reverse().map(x=>`<li><span><b>${esc(x.source||L('unknownSource'))}</b><small>${esc(x.from||'')} – ${esc(x.to||'')} · ${esc(L('importCount',x.n))}${x.undone?' · '+esc(L('undo')):''}</small></span><button class="btn sm" data-action="import-view" data-id="${esc(x.id)}">${esc(L('viewImport'))}</button></li>`).join('')||`<li>${esc(L('noImports'))}</li>`}</ul></div><div class="m-foot"><button class="btn" data-action="close">${esc(L('close'))}</button></div>`;
}
function modalAnswers(){ return `${mHead(esc(L('rememberAnswers')))}<div class="m-body">${auAnswers().map((x,i)=>`<div class="card"><p>${esc(x.q)}</p><label class="sr" for="answer-${i}">${esc(L('editAnswer'))}</label><input id="answer-${i}" value="${esc(x.a)}"><button class="btn sm" data-action="answer-save" data-i="${i}">${esc(L('saveAnswer'))}</button><button class="btn sm" data-action="answer-forget" data-i="${i}">${esc(L('forgetAnswer'))}</button></div>`).join('')||`<p>${esc(L('rememberedNone'))}</p>`}</div><div class="m-foot"><button class="btn" data-action="close">${esc(L('close'))}</button></div>`; }
'''
rep('function txFiltered(){',helpers+'function txFiltered(){')
rep("every=!!(u.allYears&&q);", "every=!!(u.allYears||u.from||u.to||u.batch);")
rep("  const [k,dir]=u.sort.split('-');", "  rows=rows.filter(r=>txMatches(r,u));\n  const [k,dir]=u.sort.split('-');")
# mobile actions in house details; Desktop shows contents through CSS.
rep("${unInTable?`<button class=\"btn\"", "${unInTable?`<button class=\"btn\"")
rep("const cat=S.canWrite?`<label", "const cat=S.canWrite?`<label")
rep("<td class=\"c\">${esc(r.concept)||", "<td class=\"c\">${S.canWrite?`<input type=\"checkbox\" data-action=\"tx-pick\" ${ref} ${u.selection.has(txKey(r))?'checked':''} aria-label=\"${esc(L('includeRow',r.ord+1))}\">`:''}${esc(r.concept)||")
rep("</span>`}</td><td class=\"k\">${cat}", "</span>`}${r.source?`<small class=\"hint tx-source\">${esc(r.source)}</small>`:''}</td><td class=\"k\">${cat}")
rep("    <div class=\"filters\">", "    <details class=\"tx-filter-panel\"${u.filtersOpen?' open':''}><summary>${esc(L('filters'))}</summary><div class=\"filters\">")
rep("    <div class=\"tx-sum\">", "    </details><div class=\"tx-sum\">")
# insert advanced filter controls before end of .filters
rep("      ${(u.q||u.month!=='all'||u.cat!=='all')?", "      <label>${esc(L('fromDate'))}<input id=\"tx-from\" type=\"date\" value=\"${esc(u.from)}\"></label><label>${esc(L('toDate'))}<input id=\"tx-to\" type=\"date\" value=\"${esc(u.to)}\"></label><label>${esc(L('minAmount'))}<input id=\"tx-min\" inputmode=\"decimal\" value=\"${esc(u.min)}\"></label><label>${esc(L('maxAmount'))}<input id=\"tx-max\" inputmode=\"decimal\" value=\"${esc(u.max)}\"></label>\n      <label>${esc(L('accountFilter'))}<select id=\"tx-account\"><option value=\"\">${esc(L('anyAccount'))}</option>${nw().accounts.map(a=>`<option value=\"${esc(a.id)}\"${u.account===a.id?' selected':''}>${esc(a.name)}</option>`).join('')}</select></label><label>${esc(L('source'))}<select id=\"tx-source\"><option value=\"\">${esc(L('anySource'))}</option>${[...new Set(allRows().map(r=>r.source).filter(Boolean))].map(f=>`<option${u.source===f?' selected':''}>${esc(f)}</option>`).join('')}</select></label>\n      <label>${esc(L('savedViews'))}<select id=\"tx-saved-view\"><option value=\"\">${esc(L('defaultView'))}</option><option value=\"uncat\">${esc(L('uncat'))}</option><option value=\"large\">${esc(L('minAmount'))}: ${fmtNum(100)}</option>${savedTxViews().map(v=>`<option value=\"${esc(v.id)}\">${esc(v.name)}</option>`).join('')}</select></label><button class=\"btn sm\" data-action=\"tx-save-view\">${esc(L('saveView'))}</button>${u.savedView?`<button class=\"btn sm\" data-action=\"tx-delete-view\">${esc(L('deleteView'))}</button>`:''}\n      ${(u.q||u.month!=='all'||u.cat!=='all'||u.from||u.to||u.min||u.max||u.account||u.source||u.batch)?")
rep("    ${S.canWrite&&rows.length?`<p class=\"hint\"", "    ${S.canWrite&&rows.length?`<div class=\"bulk-tools\"><button class=\"btn sm\" data-action=\"tx-select-filtered\">${esc(L('selectFiltered'))}</button><span>${esc(L('selectedCount',u.selection.size))}</span>${u.selection.size?`<button class=\"btn sm\" data-action=\"tx-bulk\">${esc(L('bulkCategory'))}</button><button class=\"btn sm\" data-action=\"tx-clear-selection\">${esc(L('clearSelection'))}</button>`:''}</div><p class=\"hint\"")
# modal dispatch additions
rep("nwimp:modalNwImport})", "nwimp:modalNwImport,bulkcat:modalBulkCategory,saveview:modalSaveView,imports:modalImportHistory,answers:modalAnswers})")
# settings action list/history
rep("${aiX.map(x=>", "<div class=\"set-act\"><button class=\"btn\" data-action=\"audit-answers\">${esc(L('rememberAnswers'))}</button></div>${aiX.map(x=>")
rep("${esc(L('dlEverything'))}", "${esc(L('dlEverything'))}") if "${esc(L('dlEverything'))}" in s else None
# add history in Transactions header and Settings next to backup action
rep("${S.lastImport?`<button", "<button class=\"btn ghost\" data-action=\"import-history\">${esc(L('importHistory'))}</button>${S.lastImport?`<button")
rep("  'tx-clear':()=>{ Object.assign(S.ui.tx,{q:'',month:'all',cat:'all',limit:150,allYears:false});", "  'tx-clear':()=>{ Object.assign(S.ui.tx,{q:'',month:'all',cat:'all',limit:150,allYears:false,from:'',to:'',min:'',max:'',account:'',source:'',batch:'',savedView:''}); S.ui.tx.selection.clear();")
rep("  'tx-more':()=>", "  'import-history':()=>openModal({type:'imports',mid:true}),\n  'import-view':el=>{ closeModal(); const u=S.ui.tx; Object.assign(u,{batch:el.dataset.id,from:'',to:'',q:'',month:'all',cat:'all',source:'',account:'',min:'',max:'',allYears:true}); u.selection.clear(); setTab('transactions'); },\n  'tx-select-filtered':()=>{ for(const r of txFiltered()) S.ui.tx.selection.add(txKey(r)); render(); },\n  'tx-clear-selection':()=>{ S.ui.tx.selection.clear(); render(); },\n  'tx-bulk':()=>{ if(S.canWrite&&S.ui.tx.selection.size) openModal({type:'bulkcat',mid:true}); },\n  'bulk-apply':()=>bulkApply(),\n  'tx-save-view':()=>{ if(S.canWrite) openModal({type:'saveview'}); },\n  'tx-delete-view':()=>{ setSettings({txViews:savedTxViews().filter(v=>v.id!==S.ui.tx.savedView)}); S.ui.tx.savedView=''; render(); },\n  'audit-answers':()=>openModal({type:'answers',mid:true}),\n  'answer-forget':el=>{ const a=auAnswers().slice(); a.splice(+el.dataset.i,1); setSettings({auditAnswers:a}); renderModalKeepScroll(); },\n  'answer-save':el=>{ const a=clone(auAnswers()), i=+el.dataset.i, v=$('#answer-'+i).value.trim(); if(a[i]&&v){ a[i].a=v.slice(0,1000); setSettings({auditAnswers:a}); toast(L('savedToast')); } },\n  'tx-more':()=>")
rep("  if(id==='tx-month'){", "  if(a==='tx-pick'){ const ref=refOf(el), k=txKey(ref); if(el.checked) S.ui.tx.selection.add(k); else S.ui.tx.selection.delete(k); render(); return; }\n  if(['tx-from','tx-to','tx-min','tx-max','tx-account','tx-source'].includes(id)){ S.ui.tx[id.slice(3)]=el.value; S.ui.tx.limit=150; render(); return; }\n  if(id==='tx-saved-view'){ const v=el.value==='uncat'?{filters:{table:S.ui.tx.table,cat:UNCAT,year:S.ui.year}}:el.value==='large'?{filters:{table:S.ui.tx.table,min:'100',year:S.ui.year}}:savedTxViews().find(v=>v.id===el.value); S.ui.tx.savedView=v&&v.id||''; if(v) applyTxView(v); return; }\n  if(id==='tx-month'){")
rep("  if(f.id==='tx-form') submitEdit();", "  if(f.id==='save-view-form'){ const name=$('#view-name').value.trim(); if(name&&S.canWrite){ const id=newId(); setSettings({txViews:savedTxViews().concat([{id,name:name.slice(0,80),filters:txView()}])}); S.ui.tx.savedView=id; closeModal(); render(); } }\n  else if(f.id==='tx-form') submitEdit();")
# house event dispatch must leave checkbox selection to change handler
rep("if(a==='set-cat'||a==='kw-cat'", "if(a==='tx-pick'||a==='set-cat'||a==='kw-cat'")
# preserve details filter expansion across filter-triggered renders
rep("document.addEventListener('change',e=>{", "document.addEventListener('toggle',e=>{ if(e.target.classList&&e.target.classList.contains('tx-filter-panel')) S.ui.tx.filtersOpen=e.target.open; },true);\ndocument.addEventListener('change',e=>{")
# test-only helper seam
rep('window.__ybt={kwHealth,', 'window.__ybt={txMatches,txKey,impNeedsAttention,statementCovered,bulkApply,kwHealth,')
p.write_text(s,encoding='utf-8',newline='\n')
print('Stage 2 written')
