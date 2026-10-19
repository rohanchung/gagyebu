/* t56 — 💳 부채 잔액은 거래에서 나온다 (v4.46)
   🔴 로한(10/19): "두 달째 빚을 갚고 있는데 계좌·채무 페이지랑 현황판의 부채 금액이 변동이 없다"
      맞았다. 거래와 부채가 **이어져 있지 않았다** — debtId 를 쓰는 코드가 0건이었고,
      balance 는 손으로 넣은 값만 들어갔다. 가계부에 아무리 적어도 빚은 그대로였다.
   🔒 핵심 불변식 넷:
      ① 잔액은 **파생이다** — 최초 원금 − 갚은 원금. 저장하지 않는다.
      ② 잔액을 묻는 함수는 **debtBalance 하나**다(현황판·계좌·총부채가 같은 값을 본다).
      ③ **이자는 빚을 줄이지 않는다** — 원금분만 센다.
      ④ 스케줄은 **최초 원금**에서 그린다 — 갚을 때마다 표가 앞으로 밀리면 회차가 거짓이 된다. */
const {chromium}=require('playwright');
const path=require('path');
const file=(process.argv[2]||path.join(__dirname,'..','index.html')).replace(/\\/g,'/');
let pass=0,fail=0;const bad=[];
function ok(n,c,d){if(c){pass++;console.log('✓ '+n);}else{fail++;bad.push(n+(d?('  → '+d):''));console.log('✗ '+n+(d?('  → '+d):''));}}

/* 🔒 로한의 실제 값 그대로 — 꾸민 숫자로는 실제와 어긋난 것을 못 잡는다 */
const DEBTS=[
 {id:'d1',name:'소상공인대환',rate:3.11,balance:20000000,
  schedule:{bank:{basis:365,payDay:21,firstYM:'2026-09',prevDate:'2026-08-19',
    principal:416000,firstPrincipal:448000},
    grace:'3년(종료)',start:'2026-09',method:'원금균등',remain:47,monthly:502944}},
 {id:'d2',name:'약관대출(교보 종신)',rate:5.5,balance:19900000,schedule:null}];
const TX=[
 {id:'t1',type:'expense',scope:'personal',cat:'이자비용',amt:52827,date:'2026-08-19',memo:'',method:'이체'},
 {id:'t2',type:'expense',scope:'personal',cat:'이자비용',amt:92957,date:'2026-08-25',memo:'',method:'이체'},
 {id:'t3',type:'expense',scope:'personal',cat:'이자비용',amt:502944,date:'2026-09-21',memo:'정책대출 원리금',method:'이체'},
 {id:'t4',type:'expense',scope:'personal',cat:'이자비용',amt:92957,date:'2026-09-28',memo:'',method:'이체'},
 {id:'t5',type:'expense',scope:'personal',cat:'이자비용',amt:467906,date:'2026-10-19',memo:'',method:'이체'}];
const SEED={schemaVersion:7,ui:{month:'2026-10',watchCats:[]},
 debts:JSON.parse(JSON.stringify(DEBTS)),transactions:JSON.parse(JSON.stringify(TX)),
 accounts:[],cards:[],categories:[{id:'c1',name:'이자비용',type:'expense',deductible:false}],
 budgets:{},fixed:[],events:[],posts:[],journal:[],activity:[],goals:[],routines:[],
 checks:{},rewards:[],rewardCards:{},logs2:[],insurance:[],timelog:[],meals:[],itemCats:[],
 saju:{},health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],weights:[],events:[]},
 study:{v:1,words:[],sents:[],units:[],tests:[],errors:[],drills:[],pomos:[],books:[],phases:[],week:{},month:{},logs:{}}};

async function boot(st){
  const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.clock.setFixedTime(new Date('2026-10-19T20:00:00'));
  await p.goto('file://'+file);await p.waitForTimeout(1400);
  return {b,p,errs};
}

(async()=>{
{
  const {b,p,errs}=await boot(JSON.parse(JSON.stringify(SEED)));

  /* ── A. 마이그레이션 ── */
  const mg=await p.evaluate(()=>(DB.debts||[]).map(d=>({n:d.name,p0:d.principal0,bal:d.balance})));
  ok('A1 balance 를 최초 원금(principal0)으로 옮긴다',
     mg[0].p0===20000000&&mg[1].p0===19900000,JSON.stringify(mg));
  /* 🔒 옛 칸은 지우지 않는다 — 옛 백업을 복원할 때 되살릴 근거다 */
  ok('A2 옛 balance 칸은 지우지 않는다',mg[0].bal===20000000,JSON.stringify(mg));
  /* 🔒 멱등 — 두 번 돌려도 값이 안 바뀐다(v7.5 사고의 반대쪽) */
  const idem=await p.evaluate(()=>{
    const before=DB.debts[0].principal0;
    DB.debts[0].principal0=19000000;      /* 로한이 고친 값이라 치고 */
    migrateV6(DB);
    return {고친값:19000000,마이그레이션뒤:DB.debts[0].principal0,before:before};});
  ok('A3 🔒 두 번 돌려도 손댄 값을 덮지 않는다',idem.마이그레이션뒤===19000000,JSON.stringify(idem));
  await p.evaluate(()=>{DB.debts[0].principal0=20000000;});

  /* ── B. 잔액은 파생이다 ── */
  const b0=await p.evaluate(()=>({
    d1:debtBalance(DB.debts[0]), d2:debtBalance(DB.debts[1]),
    paid:debtPaid('d1'), total:totalDebt()}));
  ok('B1 아직 안 묶였으면 최초 원금 그대로다',
     b0.d1===20000000&&b0.paid===0,JSON.stringify(b0));

  /* 🔴 여기가 이번 판의 핵심 — 묶으면 줄어야 한다 */
  const b1=await p.evaluate(()=>{
    const row=(dt)=>bankRowOf(DB.debts[0],dt);
    const t3=DB.transactions.filter(t=>t.id==='t3')[0];
    t3.debtId='d1'; t3.debtPrin=row('2026-09-21').principal;
    const t5=DB.transactions.filter(t=>t.id==='t5')[0];
    t5.debtId='d1'; t5.debtPrin=row('2026-10-19').principal;
    return {남은:debtBalance(DB.debts[0]), 갚은:debtPaid('d1'),
            원금들:[t3.debtPrin,t5.debtPrin], total:totalDebt()};});
  ok('B2 🔴 갚으면 잔액이 줄어든다',b1.남은===19136000,JSON.stringify(b1));
  ok('B3 갚은 원금이 회차와 같다',b1.원금들.join()==='448000,416000',JSON.stringify(b1.원금들));
  /* 🔒 총부채도 같은 함수를 본다 — 화면마다 따로 세면 반드시 어긋난다 */
  ok('B4 🔒 총부채가 같은 값을 쓴다',b1.total===19136000+19900000,String(b1.total));

  /* 🔒 이자는 빚을 줄이지 않는다 */
  const b2=await p.evaluate(()=>{
    const t2=DB.transactions.filter(t=>t.id==='t2')[0];
    t2.debtId='d2'; t2.debtPrin=0;          /* 약관대출은 이자만 낸다 */
    return {d2:debtBalance(DB.debts[1]), paid2:debtPaid('d2')};});
  ok('B5 🔒 이자만 낸 상환은 잔액을 안 줄인다',
     b2.d2===19900000&&b2.paid2===0,JSON.stringify(b2));

  /* ── C. 스케줄은 최초 원금에서 그린다 ── */
  const sc=await p.evaluate(()=>{
    const r=bankSchedule(DB.debts[0]).rows;
    return {첫회:r[0].date+'/'+r[0].principal, 둘째:r[1].date+'/'+r[1].principal,
            첫잔액:r[0].balance, 회차수:r.length};});
  /* 🔴 여기에 현재 잔액을 넣으면 갚을 때마다 표가 앞으로 밀려 회차가 거짓이 된다 */
  ok('C1 🔒 갚은 뒤에도 스케줄 1회차는 그대로다',
     sc.첫회==='2026-09-21/448000',JSON.stringify(sc));
  ok('C2 2회차도 그대로다',sc.둘째.indexOf('/416000')>0,JSON.stringify(sc));
  ok('C3 1회차 뒤 잔액이 최초−원금이다',sc.첫잔액===20000000-448000,String(sc.첫잔액));

  /* ── D. 안 묶인 상환을 숨기지 않는다 ── */
  const loose=await p.evaluate(()=>({
    n:debtLooseTxns().length, 날짜:debtLooseTxns().map(t=>t.date),
    html:debtLooseHtml()}));
  ok('D1 안 묶인 상환 후보를 찾는다',loose.n===2,JSON.stringify(loose.날짜));
  ok('D2 🔒 화면이 그걸 말한다',/안 묶인 상환 후보가 2건/.test(loose.html),loose.html.slice(0,60));
  ok('D3 왜 안 줄어드는지까지 적는다',/아무리 갚아도 잔액이 안 줄어든다/.test(loose.html),'');
  /* 🔒 묶으면 후보에서 빠진다 */
  const loose2=await p.evaluate(()=>{
    DB.transactions.filter(t=>t.id==='t1')[0].debtId='d2';
    DB.transactions.filter(t=>t.id==='t1')[0].debtPrin=0;
    return debtLooseTxns().length;});
  ok('D4 묶으면 후보에서 빠진다',loose2===1,String(loose2));

  /* ── E. 화면 ── */
  await p.evaluate(()=>{gotoTab('acct');}); await p.waitForTimeout(500);
  const ui=await p.evaluate(()=>document.getElementById('v-acct').textContent.replace(/\s+/g,' '));
  ok('E1 얼마에서 얼마를 갚아 얼마가 남았는지 적는다',
     /최초 20,000,000/.test(ui)&&/갚은 원금 864,000/.test(ui)&&/남은 19,136,000/.test(ui),
     ui.slice(ui.indexOf('소상공인'),ui.indexOf('소상공인')+120));
  ok('E2 상환 내역이 보인다',/2026-10-19/.test(ui)&&/원금 416,000/.test(ui),'');
  ok('E3 계좌·채무에도 안 묶인 경고가 뜬다',/안 묶인 상환 후보/.test(ui),'');
  await p.evaluate(()=>{gotoTab('dash');}); await p.waitForTimeout(500);
  const dash=await p.evaluate(()=>document.getElementById('v-dash').textContent.replace(/\s+/g,' '));
  ok('E4 🔒 현황판도 같은 잔액을 보여준다',/19,136,000/.test(dash),'');

  ok('E5 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── F. 🔒 빈 서랍을 남기지 않는다 ── */
{
  const {b,p,errs}=await boot(JSON.parse(JSON.stringify(SEED)));
  const keys=await p.evaluate(()=>{
    txnModal();
    document.getElementById('fAmt').value='10000';
    document.getElementById('fDate').value='2026-10-20';
    saveTxn();
    const t=DB.transactions[DB.transactions.length-1];
    return {has:('debtId' in t), hasPrin:('debtPrin' in t), amt:t.amt};});
  ok('F1 🔒 빚을 안 고르면 칸을 만들지 않는다',
     !keys.has&&!keys.hasPrin,JSON.stringify(keys));
  ok('F2 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

console.log('t56 부채 연결 |',pass,'통과 /',fail,'실패');
if(bad.length)console.log('  ✗ '+bad.join('\n  ✗ '));
process.exit(fail?1:0);
})();
