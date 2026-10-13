from pathlib import Path
p=Path('index.html'); s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:90]
 s=s.replace(a,b,1)
rep("Object.assign(STR,{", "Object.assign(STR,{advanced:['Advanced options','Opciones avanzadas'], inspectMonth:['See this month’s transactions','Ver los movimientos de este mes'], ruleWhen:['When the description','Cuando la descripción'], ruleUse:['Use category','Usar categoría'],")
# mobile and compact result layout; use existing colors/type variables
css=r'''
.tx-filter-panel>summary{cursor:pointer;font-weight:600;margin-bottom:var(--s8)}
.tx-filter-panel .filters{padding:var(--s12);border:1px solid var(--line);border-radius:var(--r-card)}
.filters label{display:grid;gap:var(--s4);font-size:var(--fs-meta)}
.filters input{max-width:200px}.tx-source{display:block;overflow-wrap:anywhere}.tx input[type=checkbox]{margin-right:var(--s8)}
.bulk-tools{display:flex;align-items:center;flex-wrap:wrap;gap:var(--s8);margin-bottom:var(--s12)}
.more-analysis{display:grid;gap:var(--s24)}.more-analysis[hidden]{display:none}
.compare-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s12);margin-top:var(--s12)}
.compare-grid b{display:block;font-size:var(--fs-kpi)}.compare-grid small{display:block}
.compare-controls,.scenario-fields{display:flex;flex-wrap:wrap;gap:var(--s12)}
.compare-controls label,.scenario-fields label{display:grid;gap:var(--s4)}
.month-list li{display:flex;justify-content:space-between;gap:var(--s12);padding:var(--s8);border-bottom:1px solid var(--line)}
@media(max-width:600px){.mast{padding-top:var(--s8);padding-bottom:var(--s8)}.mast .eyebrow{display:none}.brand{font-size:24px}.mast .top{gap:var(--s8)}.page-head{margin-bottom:var(--s12)}.ph-meta{font-size:var(--fs-meta)}.ph-acts{gap:var(--s4)}.ph-acts>.btn:not(.primary):not([data-action=import]){display:none}.ph-acts>.btn[data-action=import]{display:inline-flex}.tx-filter-panel:not([open])+.tx-sum{margin-top:var(--s8)}.compare-grid{grid-template-columns:1fr}.filters input{max-width:100%}.ov-top{gap:var(--s12)}.more-analysis{gap:var(--s16)}}
'''
# put CSS at end of real main style (just before application markup)
pos=s.index('</style>',s.index('<body>'))
s=s[:pos]+css+s[pos:]
# preferences are display-only, remembered on this device.
helpers=r'''function analysisOpen(tab){ if(S.ui.analysis&&tab in S.ui.analysis) return S.ui.analysis[tab]; try{ return localStorage.getItem('ybt.analysis.'+tab)==='1'; }catch(_){ return false; } }
function analysisToggle(tab){ return `<button class="btn" data-action="analysis-toggle" data-tab="${tab}" aria-expanded="${analysisOpen(tab)}" aria-controls="analysis-${tab}">${esc(L(analysisOpen(tab)?'analysisLess':'analysisMore'))}</button>`; }
function monthComparison(rows,k,base){
  const prev=base==='year'?ymAdd(k,-12):ymAdd(k,-1);
  const totals=key=>{ const a=rows.filter(r=>r.date.slice(0,7)===key), out={income:0,expenses:0,investments:0,saved:0,n:a.length};
    for(const r of a) if(r.table==='income') out.income+=cents(r.amount); else if(r.table==='expenses') out.expenses-=cents(r.amount); else if(r.table==='investments') out.investments-=cents(r.amount);
    out.saved=out.income-out.expenses; for(const x of ['income','expenses','investments','saved']) out[x]/=100; return out; };
  const current=totals(k), previous=totals(prev), change={}; for(const t of ['income','expenses','investments','saved']) change[t]=r2(current[t]-previous[t]);
  return {month:k,previousMonth:prev,current,previous,change,complete:!!(current.n&&previous.n)};
}
function comparisonCard(){
  const ms=[...new Set(allRows().map(r=>r.date.slice(0,7)))].filter(k=>+k.slice(0,4)===S.ui.year).sort(); if(!ms.length) return '';
  const done=ms.filter(k=>k<ymNow()), k=ms.includes(S.ui.compareMonth)?S.ui.compareMonth:done[done.length-1]||ms[ms.length-1], base=S.ui.compareBase||'month', C=monthComparison(allRows(),k,base);
  return `<section class="card" id="month-comparison"><div class="card-head"><h2>${esc(L('compareTitle'))}</h2></div><div class="compare-controls"><label>${esc(L('month'))}<select id="compare-month">${ms.map(m=>`<option value="${m}"${m===k?' selected':''}>${esc(ymLabel(m,true))}</option>`).join('')}</select></label><label>${esc(L('compareAgainst'))}<select id="compare-base"><option value="month"${base==='month'?' selected':''}>${esc(L('previousMonth'))}</option><option value="year"${base==='year'?' selected':''}>${esc(L('previousYear'))}</option></select></label></div>
  ${C.complete?`<p class="hint">${esc(ymLabel(k,true))} – ${esc(ymLabel(C.previousMonth,true))}. ${esc(L('reviewSafety'))}</p><div class="compare-grid">${['income','expenses','saved'].map(t=>`<div><span>${esc(L(t==='saved'?'savings':t))}</span><b>${fmtEUR(C.current[t])}</b><small>${esc(ymLabel(C.previousMonth,true))}: ${fmtEUR(C.previous[t])}</small><small>Δ ${signed(C.change[t])}</small><button class="linkish" data-action="compare-rows" data-k="${k}" data-t="${t==='saved'?'expenses':t}">${esc(L('inspectMonth'))}</button></div>`).join('')}</div>`:`<p class="hint">${esc(L('missingComparison'))}</p>`}</section>`;
}
function scenarioTotal(current,monthly,extra,n){
  if(![current,monthly,extra,n].every(Number.isFinite)||extra<0||extra>=1e9||!Number.isInteger(n)||n<1||n>600) return null;
  return (cents(current)+(cents(monthly)+cents(extra))*n)/100;
}
function scenarioCard(){
  const ms=nwMonths(); if(!ms.length) return ''; const current=nwTotals(ms[ms.length-1]).total, pace=savingPace();
  const extra=S.ui.scenarioExtra==null?100:S.ui.scenarioExtra, n=S.ui.scenarioMonths==null?12:S.ui.scenarioMonths, v=scenarioTotal(current,pace?pace.avg:0,extra,n);
  return `<section class="card" id="savings-scenario"><h2>${esc(L('scenario'))}</h2><p class="hint">${esc(L('scenarioHelp'))}</p><p>${esc(L('nwValue'))}: ${fmtEUR(current)} · ${esc(L('avgMonth',fmtEUR(pace?pace.avg:0)))}</p><div class="scenario-fields"><label>${esc(L('scenarioExtra'))}<input id="scenario-extra" type="text" inputmode="decimal" value="${esc(S.ui.scenarioRaw==null?fmtNum(extra):S.ui.scenarioRaw)}"></label><label>${esc(L('scenarioMonths'))}<input id="scenario-months" type="number" min="1" max="600" step="1" value="${n}"></label></div><p aria-live="polite">${esc(L('scenarioResult'))}: <b id="scenario-result">${v==null?DASH:fmtEUR(v)}</b></p></section>`;
}
function latestMonthCard(){
  if(allRows().some(r=>r.date.slice(0,7)===ymNow())) return '';
  const ms=[...new Set(allRows().map(r=>r.date.slice(0,7)))].filter(k=>k<ymNow()&&+k.slice(0,4)===S.ui.year).sort(), k=ms[ms.length-1]; if(!k) return '';
  const C=monthComparison(allRows(),k,'month').current;
  return `<section class="card"><h2>${esc(L('latestSummary'))} · ${esc(ymLabel(k,true))}</h2><p>${esc(L('savings'))}: <b>${fmtEUR(C.saved)}</b> · ${esc(L('income'))}: ${fmtEUR(C.income)} · ${esc(L('expenses'))}: ${fmtEUR(C.expenses)}</p><button class="btn" data-action="compare-rows" data-k="${k}" data-t="expenses">${esc(L('inspectMonth'))}</button></section>`;
}
function yearMonthCard(y,A){
  const ms=activeMonths(y), m=ms.includes(S.ui.yearMonth)?S.ui.yearMonth:ms[ms.length-1]||0;
  return `<section class="card"><label>${esc(L('month'))}<select id="year-month-pick">${ms.map(i=>`<option value="${i}"${i===m?' selected':''}>${esc(M()[i])}</option>`).join('')}</select></label>${TKEYS.map(t=>`<h2>${esc(TL(t))} · ${fmtEUR(t==='income'?A[t].total[m]:-A[t].total[m])}</h2><ul class="month-list">${catRowsFor(A,t).map(c=>({c,v:(A[t].rows.get(c)||[])[m]||0})).filter(x=>Math.abs(x.v)>=.005).map(x=>`<li><button class="linkish" data-action="drill" data-t="${t}" data-c="${esc(x.c)}" data-m="${m}">${esc(dispCat(x.c))}</button><b>${fmtEUR(x.v)}</b></li>`).join('')}</ul>`).join('')}</section>`;
}
'''
rep('function viewOverview(){',helpers+'function viewOverview(){')
rep("    ${thisMonthCard()}", "    ${latestMonthCard()}${comparisonCard()}${thisMonthCard()}\n    ${analysisToggle('overview')}<div class=\"more-analysis\" id=\"analysis-overview\"${analysisOpen('overview')?'':' hidden'}>")
# end overview more-analysis inserted just before closing stack
rep("style=\"height:260px\"></div></section>`:''}\n  </div>`;", "style=\"height:260px\"></div></section>`:''}\n    </div>\n  </div>`;")
rep("${hero}${chart}${healthCard(k,T)}<div class=\"two nw-two\">${changeCard}${goalCard}</div>${accountsCard(k)}", "${hero}${changeCard}${accountsCard(k)}${analysisToggle('networth')}<div class=\"more-analysis\" id=\"analysis-networth\"${analysisOpen('networth')?'':' hidden'}>${chart}${healthCard(k,T)}${goalCard}${scenarioCard()}</div>")
# one month on phone, annual grid still remains toggleable at any width.
rep("  return pageHead('yearly',yearStepper())+`<div class=\"grid-head\">", "  const single=S.ui.yearSingle==null?matchMedia('(max-width:600px)').matches:S.ui.yearSingle;\n  const choice=`<div class=\"seg\"><button data-action=\"year-view\" data-v=\"month\" aria-pressed=\"${single}\">${esc(L('monthView'))}</button><button data-action=\"year-view\" data-v=\"grid\" aria-pressed=\"${!single}\">${esc(L('gridView'))}</button></div>`;\n  if(single) return pageHead('yearly',yearStepper())+choice+yearMonthCard(y,A);\n  return pageHead('yearly',yearStepper())+choice+`<div class=\"grid-head\">")
# rules UI makes whole-word semantics explicit without changing saved keyword format
rep("<span class=\"kw\" title=\"${esc(d.k)}\">${esc(d.k)}</span>", "<span class=\"kw\" title=\"${esc(d.k)}\">${esc(L('ruleWhen'))} ${esc(L(/^\".*\"$/.test(d.k)?'wholeWord':'contains'))}: <b>${esc(d.k.replace(/^\"|\"$/g,''))}</b><small>${esc(L('ruleUse'))}: ${esc(d.cat)}</small></span>")
rep("<label class=\"sr\" for=\"new-kw-cat\">", "<label for=\"rule-mode\">${esc(L('ruleMode'))}</label><select id=\"rule-mode\"><option value=\"contains\"${c.ruleMode!=='word'?' selected':''}>${esc(L('contains'))}</option><option value=\"word\"${c.ruleMode==='word'?' selected':''}>${esc(L('wholeWord'))}</option></select><label class=\"sr\" for=\"new-kw-cat\">")
rep("<p class=\"hint\">${esc(L('kwQuoteTip'))}</p>", "<p class=\"hint\">${esc(L('rulePriority'))}</p><p class=\"hint\" id=\"rule-preview\">${rulePreview()}</p>") if "<p class=\"hint\">${esc(L('kwQuoteTip'))}</p>" in s else None
# universal inline preview adjacent to form
rep("id=\"add-kw-form\" style=\"margin-top:0;padding-top:0;border-top:0\">", "id=\"add-kw-form\" style=\"margin-top:0;padding-top:0;border-top:0\"><p class=\"hint\" id=\"rule-preview\">${rulePreview()}</p>")
rule=r'''function rulePreview(){
  const c=S.ui.ct, text=loose((c.newKw||'').replace(/^"|"$/g,'')); if(!text) return esc(L('rulePriority'));
  const rows=allRows().filter(r=>r.table===c.table&&(c.ruleMode==='word'?hasWord(loose(r.concept),text):hasKw(loose(r.concept),text)));
  return esc(L('affectedRows',rows.length))+(rows.length?' · '+rows.slice(0,3).map(r=>esc(r.concept)).join(' · '):'');
}
'''
rep('function viewCategories(){',rule+'function viewCategories(){')
rep("const t=S.ui.ct.table, k=$('#new-kw').value.trim(), cat=", "const t=S.ui.ct.table, raw=$('#new-kw').value.trim().replace(/^\"|\"$/g,''), k=S.ui.ct.ruleMode==='word'?'\"'+raw+'\"':raw, cat=")
rep("else if(id==='new-kw'){ S.ui.ct.newKw=e.target.value; }", "else if(id==='new-kw'){ S.ui.ct.newKw=e.target.value; const p=$('#rule-preview'); if(p) p.innerHTML=rulePreview(); }")
rep("  if(id==='new-kw-cat'){", "  if(id==='rule-mode'){ S.ui.ct.ruleMode=el.value; const p=$('#rule-preview'); if(p) p.innerHTML=rulePreview(); return; }\n  if(id==='new-kw-cat'){")
# additional actions + UI-only preferences permitted in demo (never mutate demo user data)
rep("  'import-history':()=>", "  'analysis-toggle':el=>{ const t=el.dataset.tab; if(!['overview','networth'].includes(t)) return; S.ui.analysis=Object.assign({},S.ui.analysis,{[t]:!analysisOpen(t)}); try{ localStorage.setItem('ybt.analysis.'+t,S.ui.analysis[t]?'1':'0'); }catch(_){} render(); },\n  'year-view':el=>{ S.ui.yearSingle=el.dataset.v==='month'; render(); },\n  'compare-rows':el=>{ const k=el.dataset.k; Object.assign(S.ui.tx,{table:el.dataset.t,from:k+'-01',to:ymdAdd(ymAdd(k,1)+'-01',-1),month:'all',cat:'all',q:'',min:'',max:'',source:'',account:'',batch:'',allYears:true}); setTab('transactions'); },\n  'import-history':()=>")
rep("  if(id==='tx-month'){", "  if(id==='compare-month'){ S.ui.compareMonth=el.value; render(); return; }\n  if(id==='compare-base'){ S.ui.compareBase=el.value; render(); return; }\n  if(id==='year-month-pick'){ S.ui.yearMonth=+el.value; render(); return; }\n  if(id==='scenario-extra'||id==='scenario-months'){ if(id==='scenario-extra'){ S.ui.scenarioRaw=el.value; S.ui.scenarioExtra=parseAmount(el.value,wantNum()); } else S.ui.scenarioMonths=+el.value; const ms=nwMonths(), pace=savingPace(), v=scenarioTotal(nwTotals(ms[ms.length-1]).total,pace?pace.avg:0,S.ui.scenarioExtra,S.ui.scenarioMonths); $('#scenario-result').textContent=v==null?DASH:HIDE?'••••':fmtEUR(v); return; }\n  if(id==='tx-month'){")
# allow non-writing UI actions in demo guard
rep("const DEMO_OFF=", "const DEMO_OFF=") if 'const DEMO_OFF=' in s else None
# test seam
rep('window.__ybt={txMatches,', 'window.__ybt={monthComparison,scenarioTotal,txMatches,')
p.write_text(s,encoding='utf-8',newline='\n')
print('Stage 3 written')
