const {chromium}=require('playwright');
const file=process.argv[2];
const INIT=({st})=>{const store={v:st,at:st?'2026-08-20T00:00:00.000Z':null};window.__store=store;
 const res=d=>Promise.resolve({data:d,error:null});
 function mk(){let m=null,p=null;const q={
  select(){if(m==='update'){store.v=p.data;store.at=p.updated_at;return res([{updated_at:store.at}]);}return q},
  eq(){return q},maybeSingle(){return store.v===null?res(null):res({data:store.v,updated_at:store.at})},
  update(x){m='update';p=x;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return res(null)},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};return q;}
 window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};};
async function walk(b,st,label){
 const c=await b.newContext();await c.addInitScript(INIT,{st});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.split('\n')[0]));p.on('dialog',d=>d.accept());
 await p.route('**/*supabase*',r=>r.abort());await p.goto('file://'+file);await p.waitForTimeout(1200);
 const tabs=await p.$$eval('.m[data-v]',n=>n.map(x=>x.dataset.v));
 const bad={};let empty=[];
 for(const t of tabs){const n0=errs.length;await p.click(`.m[data-v="${t}"]`);await p.waitForTimeout(140);
   const L=await p.evaluate(x=>{const e=document.getElementById('v-'+x);return e?e.innerHTML.length:-1;},t);
   if(L<50)empty.push(t); if(errs.length>n0)bad[t]=errs.slice(n0)[0];}
 console.log(('  '+label).padEnd(34),'탭',tabs.length,'| 빈탭:',empty.join(',')||'없음','| 에러:',errs.length);
 Object.keys(bad).forEach(k=>console.log('     ✗',k,'→',bad[k].slice(0,110)));
 return {p,errs:errs.length,fail:errs.length||empty.length};
}
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let F=0;
console.log('=== 극단 상태에서 15탭 순회 ===');
for(const [lbl,st] of [
  ['① 서버 행 없음(SEED)',null],
  ['② 빈 객체 {}',{}],
  ['③ schemaVersion만',{schemaVersion:7}],
  ['④ 구버전(v0) 유사',{transactions:[],goals:[],routines:[],rewards:[],bucket:[]}],
  ['⑤ ui 없음',{schemaVersion:7,transactions:[],goals:[],routines:[],checks:{},categories:[],cards:[],accounts:[],debts:[],items:[],journal:[]}],
]){ const r=await walk(b,st,lbl); F+=r.fail?1:0; await r.p.context().close(); }

console.log('\n=== 백업 왕복 (내보내기 → 복원) ===');
{const c=await b.newContext();await c.addInitScript(INIT,{st:{schemaVersion:7,transactions:[{id:'t1',date:'2026-08-01',amount:1234,type:'expense',cat:'식비',method:'현금'}],goals:[],routines:[],journal:[{id:'j',date:'2026-08-01',t:'원본'}]}});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>{if(!/__stop_reload__/.test(e.message))errs.push(e.message.split('\n')[0]);});p.on('dialog',d=>d.accept());
 await p.route('**/*supabase*',r=>r.abort());await p.goto('file://'+file);await p.waitForTimeout(1200);
 const snap=await p.evaluate(()=>JSON.stringify(DB));
 // 데이터를 망가뜨린 뒤 스냅샷으로 복원
 await p.evaluate(()=>{DB.transactions=[];DB.journal=[];save();});
 await p.waitForTimeout(700);
 const brokeN=await p.evaluate(()=>DB.transactions.length);
 const res=await p.evaluate(s=>{window.__cap=null;window.alert=function(){window.__cap=JSON.stringify(window.__store.v);throw new Error('__stop_reload__');};
   try{var d=JSON.parse(s); d.transactions=[{id:'r1'},{id:'r2'},{id:'r3'}]; d.journal=[{id:'rj'},{id:'rj2'}];
       applyRestore(d,'테스트 스냅샷');return 'ok';}catch(e){return 'ERR '+e.message;}},snap);
 await p.waitForTimeout(700);
 const after=await p.evaluate(()=>{const c=window.__cap?JSON.parse(window.__cap):{};
   return {tx:(c.transactions||[]).length,j:(c.journal||[]).length,act:(c.activity||[])[0]&&c.activity[0].m,rl:!!window.__cap};});
 const good = brokeN===0 && after.tx===3 && after.j===2;
 console.log((good?'  ✓':'  ✗')+' 망가뜨린 뒤 복원(파일 tx=3,journal=2 기대)  → 파괴후 tx='+brokeN+' / 서버 tx='+after.tx+' journal='+after.j+' / '+res);
 console.log('  서버에 실제로 쓰인 값 확인 · 활동로그:',after.act,'| 서버 write 포착:',after.rl);
 console.log((errs.length?'  ✗':'  ✓')+' JS 에러 '+errs.length+(errs[0]?' → '+errs[0]:''));
 if(!good||errs.length)F++;
 // 잘못된 파일 거부
 const rej=await p.evaluate(()=>{let msg='';const oa=window.alert;window.alert=m=>{msg=m};
   applyRestore({foo:1},'쓰레기'); window.alert=oa; return msg;});
 console.log((/복원할 수 없다/.test(rej)?'  ✓':'  ✗')+' 형식 아닌 파일 거부 → '+JSON.stringify(rej.slice(0,50)));
 if(!/복원할 수 없다/.test(rej))F++;
 await c.close();}
console.log(F?('\n=== 실패 '+F+'건 ==='):'\n=== 전부 통과 ===');
await b.close();process.exit(F?1:0);})();
