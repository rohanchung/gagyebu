/* t41 — 💚 선불 지갑 (네이버페이) v2.13
   🔒 불변식 다섯:
      ① 지갑은 **경유지**다. Sankey 에선 자금원 계좌로 접고, **잔액은 지갑에 남긴다.**
      ② 충전은 **부족분을 10,000 단위로 올림.** 잔액이 충분하면 충전하지 않는다.
      ③ 저장하면 **이체와 지출 두 건**이 된다. 합치지 않는다 —
         합치면 통장에서 나간 돈(충전액)과 쓴 돈(결제액)이 섞여 나중에 못 가른다.
      ④ 짝인 충전 이체는 지출을 지울 때 **같이 지운다.** 안 그러면 유령으로 남는다.
      ⑤ 수정 중이면 자기 자신을 잔액 계산에서 뺀다 — 안 그러면 옛 금액이 두 번 반영된다.
   ⚠️ 충전 공식은 로한의 실제 내역에서 뽑았다: 9/2 110,000 · 9/4 10,000 · 9/5 10,000 · 8/7 30,000 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE=(tx,walOpen)=>({schemaVersion:7,ui:{month:'2026-09'},
 accounts:[
  {id:'ac1',name:'주거래',group:'현금성',mode:'auto',
   hist:[{date:'2026-09-01',amount:300000}],opening:{date:'2026-09-01',amount:300000}},
  {id:'wal',name:'네이버페이',group:'현금성',mode:'auto',fundedBy:'ac1',
   hist:[{date:'2026-09-01',amount:walOpen==null?5939:walOpen}],
   opening:{date:'2026-09-01',amount:walOpen==null?5939:walOpen}}],
 cards:[{id:'c1',name:'네이버페이(이체)',type:'check',acct:'wal'},
        {id:'c2',name:'K패스',type:'check',acct:'ac1'}],
 categories:[{name:'식비',type:'expense'},{name:'의류&미용',type:'expense'},{name:'기타수입',type:'income'}],
 transactions:tx||[],
 goals:[],routines:[],checks:{},meals:{},study:{books:[],plan:{},logs:{},tests:[],cfg:{target:{}},errors:[]},
 rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],netSnapshots:[],
 fixed:[],events:[],posts:[],budgets:{},debts:[],itemCats:[],timelog:{},
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};
   function mk(){let _m=null,_p=null;
    const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},
     eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
     update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;return Promise.resolve({})},
     order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
     delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
    return q;}
   window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const dlg=[];p.on('dialog',d=>{dlg.push(String(d.message()));d.accept();});
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  return {b,p,errs,dlg};
}
/* 모달로 지갑 결제를 넣는다 — 저장 경로 자체를 검증한다 */
const buy=(p,amt,ds)=>p.evaluate(([amt,ds])=>{
  txnModal(null);
  const sel=document.getElementById('fMethod');
  for(const o of sel.options)if(o.value==='네이버페이(이체)')sel.value='네이버페이(이체)';
  methodChange();
  document.getElementById('fDate').value=ds;
  document.getElementById('fAmt').value=String(amt);
  walletSync();
  saveTxn(null);},[amt,ds]);

(async()=>{
 /* ── A. 충전 공식 — 로한의 실제 4건으로 검증 ── */
 {
  const {b,p,errs}=await boot(BASE([]));
  const f=(bal,amt)=>p.evaluate(([b,a])=>topupNeed(b,a),[bal,amt]);
  ok('A1 9/2  잔액5,939 결제110,000 → 110,000',(await f(5939,110000))===110000);
  ok('A2 9/4  잔액5,939 결제10,501  → 10,000',(await f(5939,10501))===10000);
  ok('A3 9/5  잔액15,939 결제18,424 → 10,000',(await f(15939,18424))===10000);
  ok('A4 8/7  잔액0 결제25,420      → 30,000',(await f(0,25420))===30000);
  /* 🔒 잔액이 충분하면 충전하지 않는다 */
  ok('A5 잔액 충분하면 0',(await f(50000,6800))===0);
  ok('A6 딱 맞아도 0',(await f(10000,10000))===0);
  ok('A7 1원 모자라면 10,000',(await f(9999,10000))===10000);
  ok('A8 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── B. 지갑 판정 ── */
 {
  const {b,p}=await boot(BASE([]));
  ok('B1 네이버페이는 지갑',(await p.evaluate(()=>!!walletOf('네이버페이(이체)')))===true);
  ok('B2 K패스는 지갑 아님',(await p.evaluate(()=>walletOf('K패스')))===null);
  ok('B3 자금원은 주거래',(await p.evaluate(()=>walletOf('네이버페이(이체)').fundedBy))==='ac1');
  await b.close();
 }

 /* ── C. 저장하면 이체 + 지출 두 건 ── */
 {
  const {b,p,errs}=await boot(BASE([]));
  await buy(p,18424,'2026-09-05');await p.waitForTimeout(700);
  const ts=await p.evaluate(()=>DB.transactions);
  ok('C1 두 건이 생긴다',ts.length===2,JSON.stringify(ts.map(t=>[t.type,t.amt])));
  const tr=ts.filter(t=>t.type==='transfer')[0], ex=ts.filter(t=>t.type==='expense')[0];
  /* 🔒 합치지 않는다 — 나간 돈과 쓴 돈은 다른 숫자다 */
  ok('C2 이체는 충전액 20,000',tr&&tr.amt===20000,tr?String(tr.amt):'없음');
  ok('C3 지출은 결제액 18,424',ex&&ex.amt===18424);
  ok('C4 이체는 주거래 → 지갑',tr.from==='ac1'&&tr.to==='wal');
  ok('C5 짝으로 묶인다',!!tr.linkId&&tr.linkId===ex.linkId);
  /* 잔액: 지갑 5,939 + 20,000 − 18,424 = 7,515  (로한 실측과 같은 숫자) */
  ok('C6 지갑 잔액 7,515',(await p.evaluate(()=>accVal(DB.accounts[1])))===7515,
     String(await p.evaluate(()=>accVal(DB.accounts[1]))));
  ok('C7 주거래에서 충전액만 빠진다',(await p.evaluate(()=>accVal(DB.accounts[0])))===280000,
     String(await p.evaluate(()=>accVal(DB.accounts[0]))));
  ok('C8 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── D. 잔액이 충분하면 이체를 만들지 않는다 ── */
 {
  const {b,p}=await boot(BASE([],50000));
  await buy(p,6800,'2026-09-05');await p.waitForTimeout(700);
  const ts=await p.evaluate(()=>DB.transactions);
  ok('D1 지출 한 건만',ts.length===1&&ts[0].type==='expense',JSON.stringify(ts.map(t=>t.type)));
  ok('D2 linkId 없음',!('linkId' in ts[0]),JSON.stringify(ts[0]));
  ok('D3 지갑 잔액 43,200',(await p.evaluate(()=>accVal(DB.accounts[1])))===43200);
  ok('D4 주거래는 그대로',(await p.evaluate(()=>accVal(DB.accounts[0])))===300000);
  await b.close();
 }

 /* ── E. 삭제하면 짝인 충전도 같이 ── */
 {
  const {b,p,dlg}=await boot(BASE([]));
  await buy(p,18424,'2026-09-05');await p.waitForTimeout(700);
  const exId=await p.evaluate(()=>DB.transactions.filter(t=>t.type==='expense')[0].id);
  await p.evaluate(x=>delTxn(x),exId);await p.waitForTimeout(600);
  ok('E1 짝을 알린다',dlg.some(m=>m.indexOf('충전 이체')>=0),dlg.join('|'));
  ok('E2 둘 다 지워진다',(await p.evaluate(()=>DB.transactions.length))===0,
     JSON.stringify(await p.evaluate(()=>DB.transactions.map(t=>t.type))));
  ok('E3 잔액 원복',(await p.evaluate(()=>accVal(DB.accounts[1])))===5939);
  await b.close();
 }

 /* ── F. 수정 중엔 자기 자신을 빼고 잔액을 센다 ── */
 {
  const {b,p}=await boot(BASE([]));
  await buy(p,18424,'2026-09-05');await p.waitForTimeout(700);
  const exId=await p.evaluate(()=>DB.transactions.filter(t=>t.type==='expense')[0].id);
  /* ⚠️ 자기 자신을 안 빼면 잔액이 18,424 만큼 낮게 잡혀 충전을 또 제안한다 */
  const bal=await p.evaluate(x=>{const w=acctById('wal');return acctBalAt(w,'2026-09-05',x);},exId);
  ok('F1 자기 자신 제외 잔액 5,939',bal===5939,String(bal));
  const balAll=await p.evaluate(()=>acctBalAt(acctById('wal'),'2026-09-05'));
  ok('F2 제외 안 하면 7,515',balAll===7515,String(balAll));
  await b.close();
 }

 /* ── G. Sankey — 지갑은 자금원으로 접힌다 ── */
 {
  const {b,p,errs}=await boot(BASE([
    {id:'i1',date:'2026-09-01',type:'income',cat:'기타수입',method:'이체',acct:'ac1',amt:500000,card:false},
    {id:'e1',date:'2026-09-02',type:'expense',scope:'personal',cat:'의류&미용',
     method:'네이버페이(이체)',amt:110000,card:false,memo:''}
  ]));
  await p.evaluate(()=>{DB.ui.cfPeriod='month';DB.ui.month='2026-09';renderCashflow();});
  await p.waitForTimeout(500);
  const g=await p.evaluate(()=>{const gg=cfBuildSankey(cfTxns('month'));
    return {accs:Object.keys(gg.A||{}),links:(gg.linksAK||[]).map(l=>[l.a,l.k,l.v])};});
  /* 🔒 지갑 노드가 그림에 따로 서면 '어디서 온 돈인지' 끊긴다 */
  ok('G1 지갑 노드가 없다',g.accs.indexOf('wal')<0,JSON.stringify(g.accs));
  ok('G2 자금원 노드로 접힌다',g.accs.indexOf('ac1')>=0,JSON.stringify(g.accs));
  ok('G3 지출이 자금원에서 나간다',g.links.some(l=>l[0]==='ac1'&&l[2]===110000),JSON.stringify(g.links));
  /* ⚠️ 접는 건 그림뿐 — 잔액은 지갑에 남아야 한다 */
  ok('G4 잔액은 여전히 지갑에',(await p.evaluate(()=>accVal(DB.accounts[1])))===5939-110000,
     String(await p.evaluate(()=>accVal(DB.accounts[1]))));
  ok('G5 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── H. 선불 지갑에 후불은 없다 (스크린샷으로 잡은 결함) ── */
 {
  const {b,p,errs}=await boot(BASE([]));
  const show=(m)=>p.evaluate(x=>{txnModal(null);
    const sel=document.getElementById('fMethod');
    for(const o of sel.options)if(o.value===x)sel.value=x;
    methodChange();
    return {pk:document.getElementById('payKindField').style.display,
            wal:document.getElementById('walletBox').style.display,
            credit:modal._credit};},m);
  const w=await show('네이버페이(이체)');
  /* ⚠️ 후불을 누를 수 있으면 지갑 잔액이 안 줄고 카드 미결제로 잘못 쌓인다 */
  ok('H1 지갑엔 결제성격 토글이 없다',w.pk==='none',JSON.stringify(w));
  ok('H2 지갑은 언제나 즉시',w.credit===false,JSON.stringify(w));
  ok('H3 지갑 패널은 보인다',w.wal==='block',JSON.stringify(w));
  const k=await show('K패스');
  ok('H4 일반 카드엔 토글이 뜬다',k.pk==='block',JSON.stringify(k));
  ok('H5 일반 카드엔 지갑 패널 없음',k.wal==='none',JSON.stringify(k));
  ok('H6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
