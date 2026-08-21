/* t25 — v1.4
   💳 청구주기 · 할부 · 선결제 재설계 / 🧾 재물 날짜 / ⏳ 병원·가족 태그
   ⚠️ 시드는 로한 실제 구조를 그대로 쓴다 — 삼성 신용 2장(마감10/결제25), 8/02~8/18 미결제. */
const {chromium}=require('playwright');
const file=process.argv[2];
const INIT=({st})=>{const store={v:st,at:st?'2026-08-21T00:00:00.000Z':null};window.__store=store;
 const res=d=>Promise.resolve({data:d,error:null});
 function mk(){let m=null,p=null;const q={
  select(){if(m==='update'){store.v=p.data;store.at=p.updated_at;return res([{updated_at:store.at}]);}return q},
  eq(){return q},maybeSingle(){return store.v===null?res(null):res({data:store.v,updated_at:store.at})},
  update(x){m='update';p=x;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return res(null)},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};return q;}
 window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};};

const T=(id,date,amt,cat,method,extra)=>Object.assign({id:id,type:'expense',scope:'personal',cat:cat,method:method,amt:amt,date:date,card:true},extra||{});
const ST={schemaVersion:7,
 accounts:[{id:'a1',name:'주계좌',group:'현금성',mode:'auto',init:5000000}],
 cards:[{id:'c1',name:'삼성 탭탭오',type:'credit',acct:'a1'},
        {id:'c2',name:'카카오체크',type:'check',acct:'a1'}],
 categories:[{id:'k1',name:'식비',type:'expense'},{id:'k2',name:'건강용품',type:'expense'},{id:'k3',name:'카드결제',type:'expense'}],
 transactions:[
   T('t1','2026-08-02',18500,'식비','삼성 탭탭오'),
   T('t2','2026-08-10',60000,'식비','삼성 탭탭오'),      /* 경계 — 8월 결제분 */
   T('t3','2026-08-11',33321,'식비','삼성 탭탭오'),      /* 경계 — 9월 결제분 */
   T('t4','2026-08-18',20000,'식비','삼성 탭탭오'),
   T('t5','2026-08-21',435100,'건강용품','삼성 탭탭오',{inst:3,instDone:0}),   /* 브리즘 안경 */
   T('t6','2026-08-19',7000,'식비','카카오체크',{card:false}),                 /* 체크 = 미결제 아님 */
 ],
 items:[{id:'i1',name:'브리즘 맞춤 안경',cat:'건강용품',cond:'신품',price:435100,buy:'2026-09-01',end:'1800',basis:'일간',units:0,status:'사용중'}],
 goals:[],routines:[],checks:{},rewards:[],debts:[],budgets:{},journal:[],meta:{seq:{}},ui:{month:'2026-08'}};

let F=0,N=0;
const ok=(c,m,x)=>{N++;if(!c)F++;console.log((c?'  ✓ ':'  ✗ ')+m+(x!==undefined?('   → '+x):''));};
async function boot(b,st,w){
  const c=await b.newContext(w?{viewport:w}:{});
  await c.addInitScript(INIT,{st:JSON.parse(JSON.stringify(st))});
  const p=await c.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1100);
  await p.evaluate(()=>{window.__dlg=[];window.__ans=true;
    window.confirm=m=>{window.__dlg.push(m);return window.__ans;};
    window.alert=m=>{window.__dlg.push('ALERT:'+m);};});
  return {c,p,errs};
}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

console.log('=== 청구주기 경계 (마감 10일) ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>({
   d10:cycleOf('2026-08-10',10), d11:cycleOf('2026-08-11',10),
   d21:cycleOf('2026-08-21',10), dec:cycleOf('2026-12-21',10),
   rng:cycleRange('2026-09',10), pay:cyclePayDate('2026-09',25),
   dflt:[cardClose(cardBy('삼성 탭탭오')),cardPay(cardBy('삼성 탭탭오'))],
   chk:[cardBy('카카오체크').closeDay,cardBy('카카오체크').payDay]}));
 ok(r.d10==='2026-08','8/10 → 8월 결제분 (경계 포함)', r.d10);
 ok(r.d11==='2026-09','8/11 → 9월 결제분 (경계 다음)', r.d11);
 ok(r.d21==='2026-09','8/21 → 9월 결제분', r.d21);
 ok(r.dec==='2027-01','12/21 → 2027-01 (연도 넘김)', r.dec);
 ok(r.rng.from==='2026-08-11'&&r.rng.to==='2026-09-10','9월 결제분 이용기간', r.rng.from+'~'+r.rng.to);
 ok(r.pay==='2026-09-25','결제 예정일', r.pay);
 ok(r.dflt[0]===10&&r.dflt[1]===25,'마이그레이션이 신용카드에 10/25 주입', r.dflt.join('/'));
 ok(r.chk[0]===undefined&&r.chk[1]===undefined,'체크카드엔 주기 없음 (즉시출금)');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 할부 회차 — 단수 처리 · 결제일 귀속 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const t=DB.transactions.filter(x=>x.id==='t5')[0];
   const a=[1,2,3].map(k=>instAmt(t,k)), cy=[1,2,3].map(k=>instCycle(t,k));
   return {a:a,sum:a.reduce((x,y)=>x+y,0),cy:cy,owed:txnOwed(t)};});
 ok(r.a.join('/')==='145034/145033/145033','회차 금액 (첫 회차에 나머지)', r.a.join(' / '));
 ok(r.sum===435100,'⚠️ 회차 합 = 원금 정확히 일치', r.sum);
 ok(r.cy.join(',')==='2026-09,2026-10,2026-11','⚠️ 9·10·11월 결제분 (구매일 기념일 8/21·9/21 아님)', r.cy.join(' · '));
 ok(r.owed===435100,'미납액 = 전액 (아직 0회차)', r.owed);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 미결제가 결제분별로 갈린다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const cy=cardCycles()['삼성 탭탭오'];
   const o={};Object.keys(cy).sort().forEach(k=>o[k]={sum:cy[k].sum,n:cy[k].rows.length});
   return {o:o,total:cardPending(),keys:Object.keys(cy).sort()};});
 ok(r.keys.join(',')==='2026-08,2026-09,2026-10,2026-11','4개 결제분으로 분해', r.keys.join(' · '));
 ok(r.o['2026-08'].sum===78500&&r.o['2026-08'].n===2,'8월 결제분 = 8/02+8/10 = 78,500', r.o['2026-08'].sum);
 ok(r.o['2026-09'].sum===198355,'9월 결제분 = 33,321+20,000+안경1회차 145,034 = 198,355', r.o['2026-09'].sum);
 ok(r.o['2026-10'].sum===145033&&r.o['2026-11'].sum===145033,'10·11월 = 할부만', r.o['2026-10'].sum+'/'+r.o['2026-11'].sum);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 const ui=await p.evaluate(()=>{renderDash();const h=document.getElementById('v-dash').innerHTML;
   return {rows:(h.match(/data-settle=/g)||[]).length, has8:/8월 결제분/.test(h), has11:/11월 결제분/.test(h),
           chk:/카카오체크/.test(h)};});
 ok(ui.rows===4,'현황판에 결제분 줄 4개 (클릭 가능)', ui.rows);
 ok(ui.has8&&ui.has11,'8월·11월 결제분 라벨 표시');
 ok(!ui.chk,'체크카드는 미결제 섹션에 안 뜬다');
 await c.close();}

console.log('\n=== 선결제 — 결제분 단위 · 할부 당월 회차 포함 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   settleModal('c1|2026-09');
   const h=modal.innerHTML;
   const bx=[...document.querySelectorAll('.stx')];
   return {n:bx.length, locked:bx.filter(x=>x.disabled).length,
           sum:bx.filter(x=>!x.disabled).reduce((s,x)=>s+parseFloat(x.dataset.amt),0),
           inst:/1\/3 할부/.test(h), tabs:(h.match(/data-stym=/g)||[]).length,
           range:/2026-08-11 ~ 2026-09-10/.test(h)};});
 ok(r.n===3,'9월 결제분 3건 (일시불 2 + 할부 1회차)', r.n);
 ok(r.inst,'⚠️ 할부 당월 회차가 선결제 목록에 포함된다 (초안이 틀렸던 지점)');
 ok(r.locked===0,'9월분엔 잠긴 회차 없음 (1회차가 다음 차례)');
 ok(r.sum===198355,'선택 합계 = 198,355', r.sum);
 ok(r.tabs===4,'결제분 탭 4개', r.tabs);
 ok(r.range,'이용기간 표시 8/11~9/10');

 const d=await p.evaluate(()=>{doSettle();
   const t5=DB.transactions.filter(x=>x.id==='t5')[0];
   const st=DB.transactions.filter(x=>x.type==='settle')[0];
   const cy=cardCycles()['삼성 탭탭오'];
   return {instDone:t5.instDone, card5:t5.card, t3:DB.transactions.filter(x=>x.id==='t3')[0].card,
     t1:DB.transactions.filter(x=>x.id==='t1')[0].card,
     settleAmt:st&&st.amt, cycle:st&&st.cycle, keys:Object.keys(cy).sort(),
     sep:cy['2026-08']&&cy['2026-08'].sum};});
 ok(d.instDone===1,'할부 1회차만 확정됐다 (instDone=1)', d.instDone);
 ok(d.card5===true,'⚠️ 남은 회차가 있으므로 미결제 유지');
 ok(d.t3===false,'그 주기 일시불은 해제됨');
 ok(d.t1===true,'⚠️ 다른 주기(8월분)는 건드리지 않았다');
 ok(d.settleAmt===198355&&d.cycle==='2026-09','settle 거래 생성 + 주기 기록', d.settleAmt+' / '+d.cycle);
 ok(d.keys.join(',')==='2026-08,2026-10,2026-11','9월분이 사라지고 나머지는 그대로', d.keys.join(' · '));
 ok(d.sep===78500,'8월 결제분 금액 불변', d.sep);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 회차는 순서대로만 확정한다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{settleModal('c1|2026-10');
   const bx=[...document.querySelectorAll('.stx')];
   return {n:bx.length,locked:bx.filter(x=>x.disabled).length,txt:/1회차 먼저/.test(modal.innerHTML)};});
 ok(r.n===1&&r.locked===1,'10월분(2회차)은 잠겨 있다 — 1회차가 먼저', r.locked+'/'+r.n);
 ok(r.txt,'왜 잠겼는지 그 자리에 쓰여 있다');
 const z=await p.evaluate(()=>{const before=DB.transactions.filter(x=>x.type==='settle').length;
   doSettle();return {b:before,a:DB.transactions.filter(x=>x.type==='settle').length,dlg:window.__dlg.slice(-1)[0]||''};});
 ok(z.a===z.b&&/선택된 항목이 없/.test(z.dlg),'잠긴 것만 있으면 확정되지 않는다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 발생 / 카드결제 토글 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   const acc=monthPL('2026-08').exp, cash8=monthCashPL('2026-08').exp,
         cash9=monthCashPL('2026-09').exp, cash11=monthCashPL('2026-11').exp;
   return {acc,cash8,cash9,cash11};});
 ok(r.acc===573921,'발생(8월) = 그 달 산 것 전부 = 573,921', r.acc);
 ok(r.cash8===78500+7000,'카드결제(8월) = 8월 결제분 78,500 + 체크 7,000', r.cash8);
 ok(r.cash9===198355,'카드결제(9월) = 198,355 (안경 1회차 포함)', r.cash9);
 ok(r.cash11===145033,'카드결제(11월) = 안경 3회차만', r.cash11);
 const ui=await p.evaluate(()=>{setPlMode('accrual');renderCal();
   const a=document.getElementById('v-cal').innerHTML;
   setPlMode('cash');renderCal();
   const b=document.getElementById('v-cal').innerHTML;
   return {aOn:/plm on[^>]*>발생/.test(a), bOn:/plm on[^>]*>카드결제/.test(b),
           note:/plbar/.test(b)&&/통장에서 나가는/.test(b)&&/산<\/b> 것은/.test(b), persist:DB.ui.plMode};});
 ok(ui.aOn&&ui.bOn,'토글 상태가 화면에 반영된다');
 ok(ui.note,'토글 옆에 두 숫자를 나란히 안내한다 (헷갈리던 지점)');
 ok(ui.persist==='cash','선택이 저장된다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 🧾 재물 날짜 버그 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const it=DB.items[0];
   return {units:itemUnits(it), daily:itemDaily(it), bad:!isDateStr(it.end),
     dz:daysBetween('2026-09-01','1800'), ok1:daysBetween('2026-08-21','2031-07-26')};});
 ok(r.dz===0,'⚠️ daysBetween 가 형식 아닌 값에 0을 준다 (전엔 -82,788)', r.dz);
 ok(r.ok1===1800,'정상 날짜쌍은 그대로 1800일', r.ok1);
 const ui=await p.evaluate(()=>{renderItems();const h=document.getElementById('v-items').innerHTML;
   return {warn:/마감일 형식 오류/.test(h), noPast:!/기간종료/.test(h)};});
 ok(ui.warn,'⚠ 마감일 형식 오류 뱃지로 드러난다');
 ok(ui.noPast,'"기간종료"로 오인시키지 않는다 (원래 버그)');
 const m=await p.evaluate(()=>{itemModal('i1');
   const buy=document.getElementById('it_buy'), end=document.getElementById('it_end'), life=document.getElementById('it_life');
   const types=[buy.type,end.type];
   buy.value='2026-08-21'; life.value='1800'; itLifeSync();
   const calc=end.value;
   end.value='2029-08-20'; itEndSync();
   return {types:types, calc:calc, back:life.value};});
 ok(m.types.join('/')==='date/date','구매일·마감일이 type=date (모바일 피커)', m.types.join('/'));
 ok(m.calc==='2031-07-26','수명 1800일 → 마감일 자동 계산 (구매일 당일은 안 센다)', m.calc);
 ok(m.back==='1095','마감일 → 수명 역산 (3년=1095일)', m.back);
 const v=await p.evaluate(()=>{itemModal('i1');
   document.getElementById('it_end').value='1800';window.__dlg=[];
   saveItem('i1');const a=window.__dlg.slice();
   document.getElementById('it_buy').value='2026-08-21';
   document.getElementById('it_end').value='2026-08-01';window.__dlg=[];
   saveItem('i1');return {a:a,b:window.__dlg.slice(),still:DB.items[0].end};});
 ok(/ALERT:.*마감일을 날짜로/.test(v.a[0]||''),'형식 아닌 마감일은 저장 거부');
 ok(/ALERT:.*뒤여야/.test(v.b[0]||''),'마감일이 구매일보다 앞이면 거부');
 ok(v.still==='1800','거부됐으니 데이터는 그대로 (조용히 망가뜨리지 않는다)');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== ⏳ 병원 · 가족 태그 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>({n:TL_TAGS.length,
   hosp:tlTag('hosp').label, fam:tlTag('family').label,
   last:TL_TAGS[TL_TAGS.length-1].k,
   dup:new Set(TL_TAGS.map(x=>x.c)).size===TL_TAGS.length,
   keys:new Set(TL_TAGS.map(x=>x.k)).size===TL_TAGS.length}));
 ok(r.n===14,'태그 14개', r.n);
 ok(r.hosp==='병원'&&r.fam==='가족','병원·가족 조회됨', r.hosp+'/'+r.fam);
 ok(r.last==='etc','⚠️ 기타가 마지막 (tlTag 폴백이 여기에 의존)', r.last);
 ok(r.dup,'색 중복 없음');
 ok(r.keys,'키 중복 없음');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 모바일 390px 가로 overflow ===');
{const {c,p,errs}=await boot(b,ST,{width:390,height:844});
 const r=await p.evaluate(async()=>{const out={};
   for(const v of ['dash','cal','items']){
     document.querySelector('.m[data-v="'+v+'"]').click();
     await new Promise(r=>setTimeout(r,180));
     out[v]=document.documentElement.scrollWidth-document.documentElement.clientWidth;}
   return out;});
 ok(r.dash<=4&&r.cal<=4&&r.items<=4,'현황판·가계부·재물 가로 넘침 없음', JSON.stringify(r));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n'+(F?('=== 실패 '+F+' / '+N+' ==='):('=== 전부 통과 ('+N+'건) ===')));
await b.close();process.exit(F?1:0);})();
