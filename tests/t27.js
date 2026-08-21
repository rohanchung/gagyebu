/* t27 — v1.5  🍽 음식 기록 */
const {chromium}=require('playwright');
const file=process.argv[2];
const INIT=({st})=>{const store={v:st,at:'2026-08-21T00:00:00.000Z'};window.__store=store;
 const res=d=>Promise.resolve({data:d,error:null});
 function mk(){let m=null,p=null;const q={
  select(){if(m==='update'){store.v=p.data;store.at=p.updated_at;return res([{updated_at:store.at}]);}return q},
  eq(){return q},maybeSingle(){return store.v===null?res(null):res({data:store.v,updated_at:store.at})},
  update(x){m='update';p=x;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return res(null)},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};return q;}
 window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};};
const E=(id,date,amt,cat,o)=>Object.assign({id,type:'expense',scope:'personal',cat,method:'현금',amt,date,acct:'a1'},o||{});
const ST={schemaVersion:7,
 accounts:[{id:'a1',name:'주계좌',group:'현금성',mode:'auto',hist:[{date:'2026-08-01',amount:1000000}]}],
 cards:[{id:'c1',name:'삼성',type:'credit',acct:'a1',closeDay:10,payDay:25}],
 categories:[{id:'k1',name:'배달',type:'expense'},{id:'k2',name:'식비',type:'expense'},
   {id:'k3',name:'카페',type:'expense'},{id:'k4',name:'간식/편의점',type:'expense'},
   {id:'k5',name:'월세',type:'expense'},{id:'k6',name:'급여',type:'income'}],
 transactions:[
   E('t1','2026-08-10',18500,'배달',{food:'교촌 허니콤보'}),
   E('t2','2026-08-12',22000,'배달',{food:'쿠팡이츠 국밥'}),
   E('t3','2026-08-15',18500,'배달',{food:'교촌 허니콤보'}),
   E('t4','2026-08-16',9000,'식비',{food:'김치찌개'}),
   E('t5','2026-08-17',420000,'월세')],
 goals:[],routines:[],checks:{},rewards:[],debts:[],budgets:{},items:[],journal:[],meta:{seq:{}},ui:{month:'2026-08'}};
let F=0,N=0;
const ok=(c,m,x)=>{N++;if(!c)F++;console.log((c?'  ✓ ':'  ✗ ')+m+(x!==undefined?('   → '+x):''));};
async function boot(b,st){
  const c=await b.newContext();
  await c.addInitScript(INIT,{st:JSON.parse(JSON.stringify(st))});
  const p=await c.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1100);
  await p.evaluate(()=>{window.__dlg=[];window.alert=m=>{window.__dlg.push(m);};window.confirm=()=>true;});
  return {c,p,errs};
}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

console.log('=== 기본 음식 카테고리 마킹 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>({
   food:DB.categories.filter(x=>x.isFood).map(x=>x.name).sort().join(','),
   notFood:isFoodCat('월세'), seeded:DB.meta.foodSeeded}));
 ok(r.food==='간식/편의점,배달,식비,카페','배달·식비·카페·간식만 음식', r.food);
 ok(r.notFood===false,'월세는 음식 아님');
 ok(r.seeded===1,'한 번만 찍는 플래그');
 const again=await p.evaluate(()=>{
   DB.categories.filter(x=>x.name==='카페')[0].isFood=undefined;   /* 로한이 껐다 */
   migrateV6(DB);                                                   /* 다시 로드해도 */
   return isFoodCat('카페');});
 ok(again===false,'⚠️ 로한이 끈 것을 마이그레이션이 되살리지 않는다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 음식 카테고리일 때만 칸이 뜬다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(async()=>{
   txnModal(null); await new Promise(r=>setTimeout(r,30));
   const f=document.getElementById('foodField');
   const set=v=>{document.getElementById('fCat').value=v;updIncInfo();foodFieldSync();};
   set('배달'); const a=f.style.display;
   set('월세'); const b2=f.style.display;
   set('카페'); const c2=f.style.display;
   return {a,b2,c2,exists:!!document.getElementById('fFood')};});
 ok(r.exists,'입력칸 존재');
 ok(r.a==='block','배달 → 뜬다', r.a);
 ok(r.b2==='none','월세 → 안 뜬다', r.b2);
 ok(r.c2==='block','카페 → 뜬다', r.c2);
 const inc=await p.evaluate(async()=>{
   txnModal(null); await new Promise(r=>setTimeout(r,30));
   document.getElementById('fCat').value='배달';foodFieldSync();
   const seg=document.querySelectorAll('.seg button');
   setType(seg[1],'income');    /* 수입으로 전환 */
   return document.getElementById('foodField').style.display;});
 ok(inc==='none','⚠️ 수입으로 바꾸면 닫힌다', inc);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 저장 · 음식 아닌 곳엔 필드를 만들지 않는다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(async()=>{
   txnModal(null); await new Promise(r=>setTimeout(r,30));
   document.getElementById('fCat').value='배달'; foodFieldSync();
   document.getElementById('fAmt').value='21000';
   document.getElementById('fDate').value='2026-08-21';
   document.getElementById('fFood').value='  BHC 뿌링클  ';
   saveTxn(null);
   const t=DB.transactions.slice(-1)[0];
   return {food:t.food,cat:t.cat,amt:t.amt};});
 ok(r.food==='BHC 뿌링클','음식명 저장 (공백 정리됨)', JSON.stringify(r.food));
 const r2=await p.evaluate(async()=>{
   txnModal(null); await new Promise(r=>setTimeout(r,30));
   document.getElementById('fCat').value='월세'; foodFieldSync();
   document.getElementById('fAmt').value='420000';
   document.getElementById('fDate').value='2026-08-22';
   saveTxn(null);
   const t=DB.transactions.slice(-1)[0];
   return {has:'food' in t, keys:Object.keys(t).filter(k=>k==='food').length};});
 ok(r2.keys===0,'⚠️ 음식 아닌 거래엔 food 키 자체가 없다 (빈 서랍 안 만든다)');
 const r3=await p.evaluate(async()=>{
   const id=DB.transactions.filter(x=>x.id==='t1')[0].id;
   txnModal(id); await new Promise(r=>setTimeout(r,30));
   const pre=document.getElementById('fFood').value;
   document.getElementById('fCat').value='월세'; foodFieldSync();
   saveTxn(id);
   return {pre, after:DB.transactions.filter(x=>x.id==='t1')[0].food};});
 ok(r3.pre==='교촌 허니콤보','수정 시 기존 음식명 프리필', r3.pre);
 ok(r3.after===undefined,'⚠️ 음식 아닌 카테고리로 바꾸면 음식명이 지워진다', String(r3.after));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 최근 입력 자동완성 (표준화 유도) ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(async()=>{
   const rf=recentFoods(40);
   txnModal(null); await new Promise(r=>setTimeout(r,30));
   const opts=[...document.querySelectorAll('#foodList option')].map(o=>o.value);
   return {rf, opts, dedup:rf.filter(x=>x==='교촌 허니콤보').length,
     linked:document.getElementById('fFood').getAttribute('list')};});
 ok(r.dedup===1,'⚠️ 같은 음식은 한 번만 (중복 제거)', r.dedup);
 ok(r.rf[0]==='김치찌개','최신순 정렬', r.rf.join(' · '));
 ok(r.opts.length===3,'datalist 3개', r.opts.length);
 ok(r.linked==='foodList','입력칸에 연결됨');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 거래 행 · 카테고리 편집 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{renderCal();renderDay('2026-08-10');
   const m=document.querySelector('#dayPanel .txr .txr-m');
   return {html:m.innerHTML, txt:m.textContent};});
 ok(/foodx/.test(r.html)&&/교촌 허니콤보/.test(r.txt),'거래 행에 🍽 음식명', r.txt);
 const k=await p.evaluate(()=>{
   catModal(DB.categories.filter(x=>x.name==='배달')[0].id);
   const box=document.getElementById('k_food');
   const was=box.checked;
   box.checked=false; saveCat(DB.categories.filter(x=>x.name==='배달')[0].id);
   return {was, now:isFoodCat('배달')};});
 ok(k.was===true,'카테고리 편집에 체크박스, 현재 상태 반영');
 ok(k.now===false,'끄면 꺼진다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n'+(F?('=== 실패 '+F+' / '+N+' ==='):('=== 전부 통과 ('+N+'건) ===')));
await b.close();process.exit(F?1:0);})();
