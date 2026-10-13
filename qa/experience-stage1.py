from pathlib import Path
p=Path('index.html'); s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s, a[:100]
 s=s.replace(a,b,1)
def between(a,b,new):
 global s
 start=s.index(a); end=s.index(b,start)
 s=s[:start]+new+s[end:]
strings=r'''Object.assign(STR,{
 quickStart:['Start with last month','Empezar con el mes pasado'], historyStart:['Bring in my history','Traer mi historial'], quickHelp:['One account and one statement give you your first summary. Add more later.','Una cuenta y un extracto bastan para ver tu primer resumen. Añade más después.'], historyHelp:['Choose how far back to go, then add statements and balances at your own pace.','Elige desde cuándo empezar y añade extractos y saldos a tu ritmo.'], addStatement:['Add a statement','Añadir un extracto'], quickBalances:['Add the previous and latest month-end balances if you want to see what changed. You can do this later.','Añade los saldos del mes anterior y del último mes si quieres ver el cambio. Puedes hacerlo después.'], incomeOptional:['Optional: mark your regular income, or skip if you do not have a salary or pension.','Opcional: marca tus ingresos habituales o sáltalo si no tienes nómina ni pensión.'], historyFrom:['Start from','Empezar desde'], noActivity:['No activity in this period','Sin movimientos en este periodo'], periodConfirm:['This statement covers the full period shown below','Este extracto cubre todo el periodo indicado abajo'], needsAttention:['Needs attention','Necesita revisión'], allRowsReview:['All rows','Todas las filas'], reviewSummary:[(n,q,d)=>`${n} ready · ${q} to review · ${d} left out`,(n,q,d)=>`${n} listas · ${q} por revisar · ${d} excluidas`], reviewSafety:['Matching totals check the amounts, not the categories. Check questions and possible duplicates before adding.','Que los totales coincidan comprueba los importes, no las categorías. Revisa las preguntas y posibles duplicados antes de añadir.'], useAiFallback:['Read this file with AI','Leer este archivo con IA'], localReadHelp:['CSV and Excel are read on this device first. PDFs and pictures use your chosen AI method.','CSV y Excel se leen primero en este dispositivo. PDF e imágenes usan el método de IA que elijas.'], rememberAnswers:['Answers AI remembers','Respuestas que recuerda la IA'], forgetAnswer:['Forget answer','Olvidar respuesta'], rememberedNone:['No answers remembered yet.','Aún no hay respuestas guardadas.'], editAnswer:['Edit answer','Editar respuesta'], saveAnswer:['Save answer','Guardar respuesta'], deleteOptIn:['Possible duplicates are not selected. Compare both rows before selecting a deletion.','Los posibles duplicados no están seleccionados. Compara ambas filas antes de marcar un borrado.'], filters:['Filters','Filtros'], fromDate:['From date','Desde la fecha'], toDate:['To date','Hasta la fecha'], minAmount:['Minimum amount (absolute)','Importe mínimo (absoluto)'], maxAmount:['Maximum amount (absolute)','Importe máximo (absoluto)'], source:['Source file','Archivo de origen'], accountFilter:['Account','Cuenta'], anyAccount:['All accounts / unknown','Todas las cuentas / sin cuenta'], anySource:['All sources','Todos los orígenes'], saveView:['Save these filters','Guardar estos filtros'], viewName:['View name','Nombre de la vista'], savedViews:['Saved views','Vistas guardadas'], defaultView:['Choose a view','Elegir una vista'], deleteView:['Delete this view','Borrar esta vista'], selectFiltered:['Select filtered rows','Seleccionar filas filtradas'], clearSelection:['Clear selection','Quitar selección'], selectedCount:[n=>`${n} selected`,n=>`${n} seleccionadas`], bulkCategory:['Change category for selected rows','Cambiar categoría de las filas seleccionadas'], bulkPreview:[n=>`Review ${n} selected rows. Only their category will change.`,n=>`Revisa ${n} filas seleccionadas. Solo cambiará su categoría.`], bulkApply:['Apply category','Aplicar categoría'], batchChanged:[n=>`${n} categories changed`,n=>`${n} categorías cambiadas`], importHistory:['Import history','Historial de importaciones'], importHistoryHelp:['Files and statements added here. Older rows may not have source details.','Archivos y extractos añadidos aquí. Las filas antiguas pueden no tener origen.'], noImports:['No recorded imports yet.','Aún no hay importaciones registradas.'], viewImport:['View these transactions','Ver estos movimientos'], unknownSource:['Manually entered or older import','Entrada manual o importación antigua'], period:['Period','Periodo'], importCount:[n=>`${n} rows imported`,n=>`${n} filas importadas`], analysisMore:['More analysis','Más análisis'], analysisLess:['Show the summary','Ver el resumen'], latestSummary:['Latest recorded month','Último mes con datos'], compareTitle:['Compare months','Comparar meses'], compareAgainst:['Compare with','Comparar con'], previousMonth:['Previous month','Mes anterior'], previousYear:['Same month last year','Mismo mes del año anterior'], missingComparison:['No transactions recorded for one of these months. Add or confirm its statement before comparing.','No hay movimientos registrados en uno de estos meses. Añade o confirma su extracto antes de comparar.'], scenario:['Try a savings scenario','Probar un escenario de ahorro'], scenarioExtra:['Extra saved each month','Ahorro adicional cada mes'], scenarioMonths:['Number of months','Número de meses'], scenarioHelp:['Hypothetical only: current total + your recent average saving + the extra amount each month. No market growth, fees or inflation assumed. Recorded figures and forecasts stay unchanged.','Solo hipotético: total actual + ahorro medio reciente + importe adicional mensual. Sin crecimiento de mercado, comisiones ni inflación. Las cifras y previsiones guardadas no cambian.'], scenarioResult:['Hypothetical total','Total hipotético'], ruleMode:['Match','Coincidencia'], contains:['Contains this text','Contiene este texto'], wholeWord:['Whole word or phrase','Palabra o frase completa'], rulePriority:['Longer matching rules win. At equal length, the first rule in the list wins. Test a description below.','Gana la regla coincidente más larga. A igual longitud, gana la primera de la lista. Prueba una descripción abajo.'], affectedRows:[n=>`${n} existing descriptions match this rule`,n=>`${n} descripciones existentes coinciden con esta regla`], monthView:['One month','Un mes'], gridView:['Year grid','Tabla anual'], noActivitySaved:['Period marked as having no activity.','Periodo marcado sin movimientos.'], importFileHelp:['Choose a bank export, PDF or picture. AI is optional; no automatic bank connection.','Elige una exportación bancaria, PDF o imagen. La IA es opcional; no hay conexión bancaria automática.'], setupScope:['How would you like to start?','¿Cómo quieres empezar?'], quickAccounts:['Start with one everyday account. Add savings, investments and other accounts whenever you are ready.','Empieza con una cuenta de uso diario. Añade ahorro, inversiones y otras cuentas cuando quieras.'], confirmCoverage:['Confirm statement coverage per account','Confirmar cobertura por cuenta'], notConfirmed:['Coverage not confirmed','Cobertura sin confirmar']
});
'''
rep('function L(k,...a){',strings+'function L(k,...a){')
# Optional provenance survives normalization and moving a transaction.
rep("function normRow(r){ return {id:String(r.id||newId()),date:String(r.date||''),amount:finAmt(r.amount),concept:String(r.concept==null?'':r.concept),category:String(r.category||'')}; }", "function normRow(r){ const o={id:String(r.id||newId()),date:String(r.date||''),amount:finAmt(r.amount),concept:String(r.concept==null?'':r.concept),category:String(r.category||'')}; for(const k of ['source','account','batch']) if(typeof r[k]==='string'&&r[k]) o[k]=r[k].slice(0,500); return o; }")
rep("  if(old){\n    const f=findRow(old.mk,old.table,old.id);", "  const origin=old&&findRow(old.mk,old.table,old.id).row;\n  if(old){\n    const f=findRow(old.mk,old.table,old.id);")
rep("insertSorted(doc[next.table],{id:(old&&old.id)||newId(),date:next.date,amount:r2(next.amount),concept:next.concept,category:next.category||''});", "insertSorted(doc[next.table],normRow(Object.assign({},origin||{},{id:(old&&old.id)||newId(),date:next.date,amount:r2(next.amount),concept:next.concept,category:next.category||''}))); ")
# AI undo includes remembered answers; duplicate deletions are deliberate.
rep("  const before={months:{},kw:clone(kws()),cats:clone(cats()),nw:clone(nw())};", "  const before={answers:clone(auAnswers()),months:{},kw:clone(kws()),cats:clone(cats()),nw:clone(nw())};")
# capture before answers get saved
rep("  if(ans.length) setSettings({auditAnswers:", "  const oldAnswers=clone(auAnswers());\n  if(ans.length) setSettings({auditAnswers:")
rep("answers:clone(auAnswers()),months:{}", "answers:oldAnswers,months:{}")
rep("  toast(L('auApplied',n),{label:L('undo'),fn:()=>{", "  toast(L('auApplied',n),{label:L('undo'),fn:()=>{\n    if(ans.length) setSettings({auditAnswers:before.answers});")
rep("if(!n){ if(ans.length) toast(L('auAnsSaved',ans.length)); return; }", "if(!n){ if(ans.length) toast(L('auAnsSaved',ans.length),{label:L('undo'),fn:()=>{ setSettings({auditAnswers:oldAnswers}); render(); }}); return; }")
rep('id="au-${i}" checked', 'id="au-${i}"${x.k===\'dup\'?\'\':\' checked\'}')
rep('${groups}</div>\n    <div class="m-foot">', '${m.items.some(x=>x.k===\'dup\')?`<p class="notice">${esc(L(\'deleteOptIn\'))}</p>`:\'\'}${groups}</div>\n    <div class="m-foot">')
rep("${esc(L('auPrivacy',c?c.name:'AI'))}", "${esc(S.ai&&typeof S.ai.text==='function'?S.ai.text('aiAuditPrivacy',LANG):L('auPrivacy',c?c.name:'AI'))}")
# File first: AI setup comes only at send; intake is allowed without connection.
rep("  if(S.ai&&typeof S.ai.configured==='function'&&!S.ai.configured()){ const c=await S.ai.setup(); if(!c) return; render(); }\n  openModal(m);", "  openModal(m);")
rep("${esc(L('aiDrop'))}", "${esc(S.ai&&typeof S.ai.text==='function'?S.ai.text('aiFileHelp',LANG):L('aiDrop'))}")
# Welcome is the scope choice; real setup skips the demo tour.
between('function viewWelcome(){','\n/* ───────── settings',r'''function viewWelcome(){
  const u=S.ui;
  return `<section class="card welcome" aria-labelledby="ob-title"><p class="eyebrow">${esc(L('welcome'))}</p><h2 id="ob-title">${esc(L('setupScope'))}</h2><p>${esc(L('quickHelp'))}</p>
  <div class="ob-ways"><button class="ob-way" id="ob-start" data-action="ob-start"><b>${esc(L('quickStart'))}</b><span>${esc(L('quickHelp'))}</span></button><button class="ob-way" id="ob-history" data-action="ob-history"><b>${esc(L('historyStart'))}</b><span>${esc(L('historyHelp'))}</span></button></div>
  <p class="hint">${esc(L('webHaveBackup'))} <button class="linkish" data-action="restore">${esc(L('restoreIt'))}</button></p></section>`;
}
''')
rep("    S.tourPending=true;   /* the tour comes first; the setup wizard follows when it ends */", "    if(!demo){ const k=ymAdd(ymNow(),-1); setSettings({start:{y:+k.slice(0,4),m:+k.slice(5,7)-1},startAuto:true,guide:{on:true,quick:true}}); S.wizardShown=true; bump(); render(); wizardOpen(0); return; }\n    S.tourPending=true;")
rep("  'ob-ai':()=>", "  'ob-history':()=>{ if(!S.canWrite) return; const y=nowYM().y; obApply(S.ui.obLang==='es'?'es':'en',y,0,false); S.wizardShown=true; render(); wizardOpen(0); },\n  'ob-ai':()=>")
# quick start asks for only previous/current month-end, historical scope respects settings start
between('function wzFrom(){','\nconst ymRange=',"function wzFrom(){ const st=startOf(); if(st) return ymOf(st.y,st.m); const n=nowYM(); return ymOf(n.m<2?n.y-1:n.y,0); }\n")
# scope controls/accounts optional and consistent copy
rep("body=`<p>${esc(L('wz0Text'))}</p>", "body=`<p>${esc(L(S.settings.guide.quick?'quickAccounts':'wz0Text'))}</p>\n      <div class=\"seg\"><button type=\"button\" data-action=\"wz-scope\" data-v=\"quick\" aria-pressed=\"${!!S.settings.guide.quick}\">${esc(L('quickStart'))}</button><button type=\"button\" data-action=\"wz-scope\" data-v=\"history\" aria-pressed=\"${!S.settings.guide.quick}\">${esc(L('historyStart'))}</button></div>\n      ${!S.settings.guide.quick?`<label>${esc(L('historyFrom'))} <input id=\"wz-from\" type=\"month\" value=\"${wzFrom()}\" max=\"${ymNow()}\"></label>`:''}")
rep("${esc(L('wz1Text',ymIn(C.from)))}", "${esc(L('historyFrom'))}: ${esc(ymLabel(C.from,true))}. ${esc(L('importFileHelp'))}")
rep("${act('guide-import',esc(L('wzImport'))", "${act('guide-import',esc(L('addStatement'))")
rep("${wzStrip(C.tx,C.txAt,C.now,C.txMiss.length?L('wzTxCover',fin-C.txMiss.length,fin):L('wzTxAll'))}", "${coverageList(C.from,ymAdd(C.now,-1))}")
rep("${esc(L('wz2Text',ymIn(C.bal[0])))}", "${esc(S.settings.guide.quick?L('quickBalances'):L('wz2Text',ymIn(C.bal[0])))}")
rep("${esc(L('wz3Text'))}", "${esc(L('incomeOptional'))}")
rep("const done=[nAcc>0,txOk,balOk,!!sal];", "const done=[nAcc>0,txOk,balOk,!!sal||!!S.settings.guide.noSalary];")
# existing flags remain compatible: new full period confirmations improve coverage.
rep("txMiss:tx.filter(k=>k<now&&!have.has(k))", "txMiss:tx.filter(k=>k<now&&!statementMonthCovered(k))")
# account coverage helper
helper=r'''function statementCovered(a,from,to){
  const st=(S.settings&&S.settings.guide&&S.settings.guide.stmts||{})[a.id];
  if(!st) return false;
  const f=st.coverFrom, t=st.coverTo;
  return typeof f==='string'&&typeof t==='string'&&f<=from+'-01'&&t>=ymdAdd(ymAdd(to,1)+'-01',-1);
}
function statementMonthCovered(k){
  const cash=nw().accounts.filter(a=>a.group==='cash');
  return cash.length?cash.every(a=>statementCovered(a,k,k)):allRows().some(r=>r.date.slice(0,7)===k);
}
function coverageList(from,to){
  const cash=nw().accounts.filter(a=>a.group==='cash');
  return `<p class="hint">${esc(L('confirmCoverage'))}</p><ul class="wz-list">${cash.map(a=>`<li><b>${esc(a.name)}</b><span>${esc(L(statementCovered(a,from,to)?'wzHave':'notConfirmed'))}</span>${statementCovered(a,from,to)?'':`<button class="btn sm" data-action="wz-noactivity" data-acc="${esc(a.id)}" data-from="${from}" data-to="${to}">${esc(L('noActivity'))}</button>`}</li>`).join('')}</ul>`;
}
'''
rep('function wzCover(){',helper+'function wzCover(){')
rep("const covered=a=>!!st[a.id]&&st[a.id].to>=k+'-25';", "const covered=a=>statementCovered(a,k,k)||!!st[a.id]&&!st[a.id].coverFrom&&st[a.id].to>=k+'-25';")
rep("txOk:C.have.has(k)&&cash.every(a=>!st[a.id]||covered(a))", "txOk:cash.length?cash.every(covered):C.have.has(k)")
rep("${S.ai?`<div class=\"wz-acts\">${act('ai-tx',ICON.ai+esc(L('wzAi')))}</div>`:''}`;", "${coverageList(k,k)}${S.ai?`<div class=\"wz-acts\">${act('ai-tx',ICON.ai+esc(L('wzAi')))}</div>`:''}`;")
# actions and scope dates
rep("  'wz-next':()=>", "  'wz-scope':el=>{ const quick=el.dataset.v==='quick', k=quick?ymAdd(ymNow(),-1):ymOf(nowYM().y,0); setSettings({start:{y:+k.slice(0,4),m:+k.slice(5,7)-1},guide:Object.assign({},S.settings.guide,{quick})}); render(); renderModalKeepScroll(); },\n  'wz-noactivity':el=>{ const g=S.settings.guide||{}, st=Object.assign({},g.stmts), id=el.dataset.acc; if(!nw().accounts.some(a=>a.id===id)||el.dataset.from>el.dataset.to) return; const o=st[id]||{}; st[id]=Object.assign({},o,{coverFrom:el.dataset.from+'-01',coverTo:ymdAdd(ymAdd(el.dataset.to,1)+'-01',-1),noActivity:true}); setSettings({guide:Object.assign({},g,{stmts:st})}); renderModalKeepScroll(); toast(L('noActivitySaved')); },\n  'wz-next':()=>")
rep("  if(id==='wz-cur'){", "  if(id==='wz-from'&&/^\\d{4}-\\d{2}$/.test(el.value)&&el.value<=ymNow()){ setSettings({start:{y:+el.value.slice(0,4),m:+el.value.slice(5,7)-1}}); renderModalKeepScroll(); return; }\n  if(id==='wz-cur'){")
# base modal trap yields to web AI panel
rep("if(e.key!=='Tab'||!S.modal) return;", "if(e.key!=='Tab'||!S.modal||document.querySelector('.ai-panel')) return;")
p.write_text(s,encoding='utf-8',newline='\n')
print('Stage 1 written')
