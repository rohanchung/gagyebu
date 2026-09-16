/* t40 — 💳 거래별 후불 판정 (v2.10)
   🔒 불변식 넷:
      ① card.type 은 **기본값**이다. t.credit 이 있으면 그것이 이긴다.
      ② t.credit 이 없으면 카드 기본값을 따른다 — **기존 거래를 건드리지 않는다.**
      ③ 기본값과 같으면 저장하지 않는다 — 빈 서랍을 남기지 않고, 카드 설정을 바꾸면 따라온다.
      ④ 후불이면 계좌에서 즉시 나가지 않는다. 미결제로 쌓였다가 선결제 때 빠진다.
   ⚠️ 실측 근거: 로한의 9월 교통비 3건 11,950원이 앱에선 즉시 빠졌는데 **통장엔 없었다.**
      우리(K패스)는 체크카드지만 교통비만 후불이다. 한 장이 두 성격을 갖는다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE=(tx)=>({schemaVersion:7,ui:{month:'2026-09'},
 accounts:[{id:'ac1',name:'주거래',group:'현금성',mode:'auto',
   hist:[{date:'2026-09-01',amount:100000}],opening:{date:'2026-09-01',amount:100000}}],
 cards:[{id:'c1',name:'K패스',type:'check',acct:'ac1'},
        {id:'c2',name:'탭탭오',type:'credit',acct:'ac1',closeDay:12,payDay:25}],
 categories:[{name:'교통비',type:'expense'},{name:'식비',type:'expense'},{name:'기타수입',type:'income'}],
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
const T=(d,m,amt,cat,extra)=>Object.assign(
  {id:'t'+amt,date:d,type:'expense',scope:'personal',cat:cat||'식비',method:m,amt:amt,card:false,memo:''},extra||{});

(async()=>{
 /* ── A. 기본값: 카드 type 을 따른다 (기존 거래를 건드리지 않는다) ── */
 {
  const {b,p,errs}=await boot(BASE([
    T('2026-09-02','K패스',10000),           /* 체크 기본 → 즉시 */
    T('2026-09-02','탭탭오',20000,'식비',{card:true}) /* 신용 기본 → 후불 */
  ]));
  ok('A1 체크 기본은 즉시출금',(await p.evaluate(()=>txnIsCredit(DB.transactions[0])))===false);
  ok('A2 신용 기본은 후불',(await p.evaluate(()=>txnIsCredit(DB.transactions[1])))===true);
  ok('A3 체크는 계좌가 붙는다',(await p.evaluate(()=>txnAcct(DB.transactions[0])))==='ac1');
  /* 🔒 후불은 계좌에서 즉시 나가지 않는다 */
  ok('A4 신용은 계좌가 안 붙는다',(await p.evaluate(()=>txnAcct(DB.transactions[1])))===null);
  ok('A5 잔액은 체크분만 차감',(await p.evaluate(()=>acctComputed(DB.accounts[0])))===90000);
  ok('A6 미결제는 신용분만',(await p.evaluate(()=>cardPending()))===20000);
  ok('A7 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── B. 거래별 뒤집기 — 로한의 실제 사례 ── */
 {
  const {b,p,errs}=await boot(BASE([
    /* 체크카드인데 교통비만 후불 — 통장엔 아직 없다 */
    T('2026-09-02','K패스',5150,'교통비',{credit:true,card:true}),
    T('2026-09-02','K패스',4000,'식비'),
    /* 신용카드인데 이 건은 즉시 결제 */
    T('2026-09-02','탭탭오',3000,'식비',{credit:false})
  ]));
  ok('B1 체크카드도 credit:true 면 후불',(await p.evaluate(()=>txnIsCredit(DB.transactions[0])))===true);
  ok('B2 후불이면 계좌 안 붙음',(await p.evaluate(()=>txnAcct(DB.transactions[0])))===null);
  ok('B3 같은 카드 다른 건은 즉시',(await p.evaluate(()=>txnAcct(DB.transactions[1])))==='ac1');
  ok('B4 신용카드도 credit:false 면 즉시',(await p.evaluate(()=>txnIsCredit(DB.transactions[2])))===false);
  ok('B5 신용의 즉시건은 계좌가 붙는다',(await p.evaluate(()=>txnAcct(DB.transactions[2])))==='ac1');
  /* 🔒 잔액: 4,000 + 3,000 만 빠진다. 교통비 5,150 은 아직 통장에 있다 */
  ok('B6 잔액 = 100,000 - 7,000',(await p.evaluate(()=>acctComputed(DB.accounts[0])))===93000);
  ok('B7 미결제 = 교통비 5,150',(await p.evaluate(()=>cardPending()))===5150);
  ok('B8 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── C. 저장: 기본값과 같으면 필드를 만들지 않는다 ── */
 {
  const {b,p,errs}=await boot(BASE([]));
  const add=(m,amt,kind)=>p.evaluate(([m,amt,kind])=>{
    txnModal(null);
    const sel=document.getElementById('fMethod');
    for(const o of sel.options)if(o.value===m)sel.value=m;
    methodChange();
    if(kind!=null){const bs=document.getElementById('payKindSeg').querySelectorAll('button');
      setPayKind(bs[kind],kind);}
    document.getElementById('fAmt').value=String(amt);
    document.getElementById('fDate').value='2026-09-02';
    saveTxn(null);},[m,amt,kind]);
  await add('K패스',1000,null);await p.waitForTimeout(500);
  let t=await p.evaluate(()=>DB.transactions[DB.transactions.length-1]);
  ok('C1 체크 기본으로 저장',t.amt===1000&&t.method==='K패스');
  /* 🔒 기본값과 같으면 credit 을 저장하지 않는다 */
  ok('C2 기본값이면 credit 필드 없음',!('credit' in t),JSON.stringify(t));
  ok('C3 card=false',t.card===false);
  await add('K패스',2000,1);await p.waitForTimeout(500);
  t=await p.evaluate(()=>DB.transactions[DB.transactions.length-1]);
  ok('C4 후불로 바꾸면 credit:true 저장',t.credit===true,JSON.stringify(t));
  ok('C5 후불이면 card=true (미결제로)',t.card===true);
  await add('탭탭오',3000,0);await p.waitForTimeout(500);
  t=await p.evaluate(()=>DB.transactions[DB.transactions.length-1]);
  ok('C6 신용을 즉시로 바꾸면 credit:false',t.credit===false,JSON.stringify(t));
  ok('C7 즉시면 card=false',t.card===false);
  await add('탭탭오',4000,null);await p.waitForTimeout(500);
  t=await p.evaluate(()=>DB.transactions[DB.transactions.length-1]);
  ok('C8 신용 기본이면 credit 필드 없음',!('credit' in t),JSON.stringify(t));
  ok('C9 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── D. 카드 설정을 바꾸면 저장 안 한 건은 따라온다 ── */
 {
  const {b,p}=await boot(BASE([T('2026-09-02','K패스',10000)]));
  ok('D1 처음엔 즉시',(await p.evaluate(()=>txnIsCredit(DB.transactions[0])))===false);
  /* 🔒 credit 을 저장하지 않았으므로 카드 기본값을 바꾸면 따라온다 */
  await p.evaluate(()=>{DB.cards[0].type='credit';});
  ok('D2 카드를 신용으로 바꾸면 따라온다',(await p.evaluate(()=>txnIsCredit(DB.transactions[0])))===true);
  /* 저장된 건은 안 따라온다 */
  await p.evaluate(()=>{DB.transactions[0].credit=false;});
  ok('D3 저장된 건은 카드 설정을 무시',(await p.evaluate(()=>txnIsCredit(DB.transactions[0])))===false);
  await b.close();
 }

 /* ── E. 방어: 회차가 확정된 할부는 즉시출금으로 못 되돌린다 ── */
 {
  const {b,p,dlg}=await boot(BASE([
    T('2026-09-02','탭탭오',300000,'식비',{card:true,inst:3,instDone:1})
  ]));
  await p.evaluate(()=>{txnModal(DB.transactions[0].id);});
  await p.waitForTimeout(400);
  await p.evaluate(()=>{const bs=document.getElementById('payKindSeg').querySelectorAll('button');
    setPayKind(bs[0],0);});
  await p.waitForTimeout(300);
  ok('E1 결제 확정된 할부는 되돌리기 거부',dlg.some(m=>m.indexOf('결제 확정')>=0),dlg.join('|'));
  ok('E2 값이 안 바뀐다',(await p.evaluate(()=>modal._credit))!==false);
  await b.close();
 }

 /* ── F. 할부 개월 선택지 확대 (실제로 24개월 단말기 할부가 있다) ── */
 {
  const {b,p,errs}=await boot(BASE([]));
  await p.evaluate(()=>{txnModal(null);
    const sel=document.getElementById('fMethod');
    for(const o of sel.options)if(o.value==='탭탭오')sel.value='탭탭오';
    methodChange();});
  await p.waitForTimeout(400);
  const opts=await p.$$eval('#instSeg button',es=>es.map(e=>e.textContent));
  ok('F1 개월 선택지 6개',opts.length===6,opts.join(','));
  ok('F2 24개월이 있다',opts.some(x=>x.indexOf('24')>=0),opts.join(','));
  /* 24개월 회차가 결제월로 제대로 퍼지나 — 단말기 할부가 이 계산에 달렸다 */
  const cyc=await p.evaluate(()=>{
    const t={amt:1245600,date:'2025-01-30',method:'탭탭오',inst:24};
    return [instAmt(t,1),instAmt(t,24),instCycle(t,21),instCycle(t,24)];});
  ok('F3 24회 균등분할 51,900',cyc[0]===51900&&cyc[1]===51900,JSON.stringify(cyc));
  ok('F4 21회차는 2026-10',cyc[2]==='2026-10',cyc[2]);
  ok('F5 24회차는 2027-01',cyc[3]==='2027-01',cyc[3]);
  ok('F6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── G. 미결제는 '아직 안 낸 돈'이다 — 할부 총액이 아니라 잔여 ── */
 {
  const {b,p,errs}=await boot(BASE([
    /* 24개월 할부, 20회 완료 → 잔여 4회 = 207,600 */
    T('2025-01-30','탭탭오',1245600,'식비',{card:true,inst:24,instDone:20}),
    /* 3개월 할부, 1회 완료 → 잔여 2회 */
    T('2026-08-29','탭탭오',435100,'식비',{card:true,inst:3,instDone:1}),
    /* 일시불 → 전액 */
    T('2026-09-02','탭탭오',72870,'식비',{card:true})
  ]));
  /* ⚠️ [결함·중대] v2.10 까지 t.amt(총액)를 셌다. 로한: "총부채가 어떻게 4,200만이 되냐?" */
  ok('G1 24개월 할부는 잔여 4회만',(await p.evaluate(()=>txnOwed(DB.transactions[0])))===207600,
     String(await p.evaluate(()=>txnOwed(DB.transactions[0]))));
  ok('G2 3개월 할부는 잔여 2회',(await p.evaluate(()=>txnOwed(DB.transactions[1])))===290066,
     String(await p.evaluate(()=>txnOwed(DB.transactions[1]))));
  ok('G3 일시불은 전액',(await p.evaluate(()=>txnOwed(DB.transactions[2])))===72870);
  /* 🔒 현황판이 세는 값과 선결제 화면이 세는 값이 같아야 한다 */
  const pend=await p.evaluate(()=>cardPending());
  ok('G4 미결제 합 = 잔여 합',pend===207600+290066+72870,String(pend));
  ok('G5 총액(1,753,570)을 세지 않는다',pend!==1245600+435100+72870,String(pend));
  ok('G6 총부채에 반영',(await p.evaluate(()=>totalDebt()))===570536,
     String(await p.evaluate(()=>totalDebt())));
  ok('G7 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── H. 파생 기준은 그룹이 아니라 기초잔액 (v2.12) ── */
 {
  const st=BASE([]);
  /* 저축 그룹 + 기초잔액 있음 → 파생되어야 한다 (노랑우산) */
  st.accounts.push({id:'sav1',name:'노랑우산',group:'저축',mode:'auto',
    hist:[{date:'2026-09-01',amount:2400000}],opening:{date:'2026-09-01',amount:2400000}});
  /* 투자 그룹 + 기초 없음 → 평가액(수기) 그대로 */
  st.accounts.push({id:'inv1',name:'ETF',group:'투자',mode:'manual',
    hist:[{date:'2026-08-31',amount:61360}]});
  st.transactions=[{id:'tr1',type:'transfer',date:'2026-09-30',amt:100000,
    from:'ac1',to:'sav1',cat:'이체',memo:'노랑우산 9월 납입'}];
  const {b,p,errs}=await boot(st);
  /* 🔒 그룹이 아니라 기초잔액 유무가 기준이다 — 판단은 로한이 한다 */
  ok('H1 저축이라도 기초 있으면 파생',(await p.evaluate(()=>accIsDerived(DB.accounts[1])))===true);
  ok('H2 투자에 기초 없으면 수기',(await p.evaluate(()=>accIsDerived(DB.accounts[2])))===false);
  ok('H3 납입 이체가 잔액에 반영',(await p.evaluate(()=>accVal(DB.accounts[1])))===2500000,
     String(await p.evaluate(()=>accVal(DB.accounts[1]))));
  /* ⚠️ 평가액 계좌는 거래로 파생하면 안 된다 — 주식은 산 값이 아니라 지금 값이다 */
  ok('H4 수기 계좌는 hist 그대로',(await p.evaluate(()=>accVal(DB.accounts[2])))===61360);
  ok('H5 출금계좌도 같이 줄었다',(await p.evaluate(()=>accVal(DB.accounts[0])))===0,
     String(await p.evaluate(()=>accVal(DB.accounts[0]))));
  ok('H6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── I. 음식명만 적고 끼니를 안 고르면 조용히 버리지 않는다 (v2.14) ── */
 {
  const st=BASE([]);
  st.categories=[{name:'간식/편의점',type:'expense',isFood:true},{name:'생활용품',type:'expense'}];
  const {b,p,dlg}=await boot(st);
  const put=(cat,food,slot)=>p.evaluate(([cat,food,slot])=>{
    txnModal(null);
    const sel=document.getElementById('fCat');
    for(const o of sel.options)if(o.value===cat)sel.value=cat;
    sel.dispatchEvent(new Event('change')); foodFieldSync();
    document.getElementById('fFood').value=food;
    document.getElementById('fAmt').value='4050';
    document.getElementById('fDate').value='2026-09-08';
    if(slot){const cs=[...document.querySelectorAll('#fSlotWrap .dchip')];
      const el=cs.filter(e=>e.dataset.slot===slot)[0]; if(el)setMealSlot(el,slot);}
    saveTxn(null);},[cat,food,slot]);
  /* ⚠️ 로한의 9/7 간식이 정확히 이 경우였다 — 음식명은 있고 slot 이 비었다 */
  await put('간식/편의점','빵, 제로콜라',null);await p.waitForTimeout(600);
  ok('I1 끼니 없이 저장하면 경고한다',dlg.some(m=>m.indexOf('끼니를 안 골랐다')>=0),dlg.join('|'));
  /* 🔒 막지는 않는다 — 장보기는 '해당없음'이 맞다 */
  ok('I2 그래도 저장은 된다',(await p.evaluate(()=>DB.transactions.length))===1);
  ok('I3 데일리엔 안 들어간다',(await p.evaluate(()=>DB.meals['2026-09-08']))===undefined);
  const n0=dlg.length;
  await put('간식/편의점','후레이크바','s');await p.waitForTimeout(600);
  ok('I4 끼니를 고르면 안 묻는다',dlg.length===n0,dlg.slice(n0).join('|'));
  ok('I5 간식이 데일리에 들어간다',
     (await p.evaluate(()=>DB.meals['2026-09-08']&&DB.meals['2026-09-08'].s.a))==='후레이크바',
     JSON.stringify(await p.evaluate(()=>DB.meals['2026-09-08'])));
  const n1=dlg.length;
  await put('생활용품','',null);await p.waitForTimeout(600);
  ok('I6 음식 아닌 계정과목은 안 묻는다',dlg.length===n1,dlg.slice(n1).join('|'));
  await b.close();
 }

 /* ── J. 💳 체크카드 후불이 '카드 미결제'에 떠야 한다 (v3.8) ──
    ⚠️ [결함·중대] 로한 신고: "우리K패스카드 중 후불결제(신용카드) 부분은 현황판 카드 미결제에 노출이 안 된다."
       실측(9/16) 우리(K패스) 후불 10건 39,500원이 **총부채엔 있고 현황판·선결제엔 없었다** — 낼 방법이 없는 부채.
       원인: cardPendingByCard() 는 거래(txnIsCredit)로 세는데 cardCycles() 는 카드 종류로 걸렀다.
    🔒 후불 여부는 **카드 종류가 아니라 거래**가 답한다. 같은 질문에 두 함수가 다르게 답하면 안 된다(v2.11 재발). */
 {
  const st=BASE([
    /* K패스(체크)의 후불 교통 — 로한의 실제 형태 */
    T('2026-09-01','K패스',1500,'교통비',{card:true,credit:true}),
    T('2026-09-05','K패스',3000,'교통비',{card:true,credit:true}),
    T('2026-09-15','K패스',35000,'교통비',{card:true,credit:true}),
    /* 같은 카드의 즉시 결제분 — 미결제에 섞이면 안 된다 */
    T('2026-09-06','K패스',12000,'식비'),
    /* 신용카드 쪽은 그대로 */
    T('2026-09-03','탭탭오',20000,'식비',{card:true})
  ]);
  const {b,p,errs}=await boot(st);
  /* ① 두 함수가 같은 답을 낸다 */
  const pend=await p.evaluate(()=>cardPendingByCard());
  ok('J1 체크카드 후불이 미결제로 잡힌다',pend['K패스']===39500,JSON.stringify(pend));
  const cyc=await p.evaluate(()=>{const cy=cardCycles(),o={};
    for(const k in cy){o[k]=Object.keys(cy[k]).reduce((s,y)=>s+cy[k][y].sum,0);}return o;});
  ok('J2 결제분 분해도 같은 금액',cyc['K패스']===39500,JSON.stringify(cyc));
  ok('J3 신용카드는 그대로',cyc['탭탭오']===20000,JSON.stringify(cyc));
  ok('J5 총부채에 한 번만 들어간다',(await p.evaluate(()=>totalDebt()))===59500,
     String(await p.evaluate(()=>totalDebt())));
  /* ② 화면에 실제로 뜬다 — 여기가 로한이 본 자리다 */
  await p.evaluate(()=>gotoTab('dash'));await p.waitForTimeout(600);
  const dash=await p.$eval('#v-dash .cardbox',e=>e.textContent);
  ok('J6 현황판 카드 미결제에 K패스가 뜬다',dash.indexOf('K패스')>=0,dash.slice(0,240));
  ok('J7 금액도 뜬다',dash.indexOf('39,500')>=0,dash.slice(0,240));
  ok('J8 체크카드라고 표시한다',dash.indexOf('체크·후불분')>=0,dash.slice(0,240));
  ok('J9 신용카드도 같이 뜬다',dash.indexOf('탭탭오')>=0);
  ok('J10 미결제 없음 문구가 아니다',dash.indexOf('미결제 없음')<0);
  /* ③ 선결제로 실제로 지울 수 있다 — 못 지우면 영원히 쌓인다 */
  await p.evaluate(()=>settleModal('c1|2026-09'));await p.waitForTimeout(500);
  const mod=await p.$eval('#modal',e=>e.textContent);
  /* ⚠️ 39,500 이 한 덩어리로 뜨지 않는다 — K패스는 closeDay 가 없어 기본값 10일이 먹는다.
     9/1·9/5 → 9월 결제분 4,500 · 9/15 → 10월 결제분 35,000. **결제분이 갈리는 게 맞다.**
     (실제 K패스 후불교통 청구 주기가 10일 마감인지는 불확실 — 그래서 체크카드도 마감일을 고칠 수 있게 했다) */
  ok('J11 선결제 화면이 K패스를 받는다',mod.indexOf('거래가 없습니다')<0&&mod.indexOf('4,500')>=0,
     mod.slice(0,260));
  ok('J11b 결제분이 둘로 갈린다',mod.indexOf('9월 결제분')>=0&&mod.indexOf('10월 결제분')>=0,
     mod.slice(0,200));
  ok('J12 두 카드 탭이 다 나온다',mod.indexOf('K패스')>=0&&mod.indexOf('탭탭오')>=0,mod.slice(0,200));
  /* ④ 카드 설정 줄이 '즉시결제'라고 거짓말하지 않는다 */
  await p.evaluate(()=>{closeModal();gotoTab('acct');});await p.waitForTimeout(600);
  const av=await p.$eval('#v-acct',e=>e.textContent);
  ok('J13 설정에 미결제 금액이 뜬다',av.indexOf('후불분 있음')>=0&&av.indexOf('39,500')>=0,
     av.slice(0,400));
  /* ⑤ 후불이 있는 체크카드는 마감·결제일을 고칠 수 있다 */
  await p.evaluate(()=>cardModal('c1'));await p.waitForTimeout(400);
  ok('J14 주기 칸이 열린다',
     (await p.$eval('#cd_cycwrap',e=>e.style.display))==='block');
  ok('J15 후불 없는 체크카드엔 안 준다',(await p.evaluate(()=>{
     closeModal();DB.cards.push({id:'c3',name:'맹체크',type:'check',acct:'ac1'});
     cardModal('c3');return document.getElementById('cd_cycwrap').style.display;}))==='none');
  /* ⑥ 현금 기준 월 손익 — 후불은 **거래일이 아니라 결제월**에 나간다(체크카드 후불도).
     9월 유출 = 즉시 12,000 + 9월 결제분(K패스 4,500 + 탭탭오 20,000) = 36,500
     10월 유출 = K패스 10월 결제분 35,000 (9/15 이용분 — 10일 마감 이후라 다음 결제분) */
  const cash=await p.evaluate(()=>monthCashPL('2026-09').exp);
  ok('J16 9월 유출 = 즉시분 + 9월 결제분',cash===12000+4500+20000,String(cash));
  const cash10=await p.evaluate(()=>monthCashPL('2026-10').exp);
  ok('J17 마감 이후 후불은 10월로 밀린다',cash10===35000,String(cash10));
  /* 🔒 두 달을 합치면 전액이다 — 어느 달에도 안 걸려 사라지는 돈이 없어야 한다 */
  ok('J17b 9·10월 합 = 전체 지출',cash+cash10===12000+39500+20000,String(cash+cash10));
  ok('J18 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
