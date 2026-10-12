/* Styled import templates keep their ZIP parts and tables when date display changes. */
const fs=require('fs'),assert=require('assert'),X=require('../vendor/xlsx.full.min.js');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('const TEMPLATE_XLSX='),b=html.indexOf('\n};',a),templates=new Function(html.slice(a,b+3)+'return TEMPLATE_XLSX')();
const start=html.indexOf('function templateDateBytes('),end=html.indexOf('\n}\n',start),body=html.slice(start,end+3);
for(const us of [false,true])for(const lang of ['en','es']){
 const format=us?'mm/dd/yyyy':'dd/mm/yyyy',isoOf=(y,m,d)=>{const x=new Date(Date.UTC(y,m-1,d));return x.getUTCMonth()===m-1?y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):null;};
 const fmtDate=iso=>(us?iso.slice(5,7)+'/'+iso.slice(8,10):iso.slice(8,10)+'/'+iso.slice(5,7))+'/'+iso.slice(0,4);
 const convert=new Function('usDates','dateFormat','fmtDate','isoOf',body+'return templateDateBytes')(()=>us,()=>format,fmtDate,isoOf);
 const bytes=Buffer.from(templates[lang],'base64'),before=X.CFB.read(bytes,{type:'buffer'}),afterBytes=convert(X,new Uint8Array(bytes)),after=X.CFB.read(afterBytes,{type:'array'});
 assert.deepEqual([...before.FullPaths].sort(),[...after.FullPaths].sort(),'all workbook parts retained');
 for(let i=2;i<before.FullPaths.length;i++){
  const name=before.FullPaths[i],original=Buffer.from(before.FileIndex[i].content).toString(),expected=name.endsWith('/styles.xml')?original.replace(/formatCode="(?:dd\/mm\/yyyy|yyyy-mm-dd)"/g,'formatCode="'+format+'"'):us&&/\/xl\/worksheets\/sheet\d+\.xml$/.test(name)?original.replace(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g,(s,d,m,y)=>isoOf(+y,+m,+d)?fmtDate(isoOf(+y,+m,+d)):s):original;
  assert.equal(Buffer.from(after.FileIndex[after.FullPaths.indexOf(name)].content).toString(),expected,name+' changed unexpectedly');
 }
 const styles=Buffer.from(after.FileIndex[after.FullPaths.findIndex(n=>n.endsWith('/styles.xml'))].content).toString();assert(styles.includes('formatCode="'+format+'"'));assert(!styles.includes('formatCode="yyyy-mm-dd"'));
 assert.equal(X.read(afterBytes,{type:'array'}).SheetNames.length,4,'workbook still opens');
 console.log(lang+' '+format+': template dates updated; tables, styles and other parts preserved');
}
