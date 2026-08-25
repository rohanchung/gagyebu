/* t31 — v1.8 카드결제 날짜 · 미결제 복원 · 동기화 충돌 설명
   로한 문의(0825):
   ① "1월 데이터를 넣고 있는데 카드결제가 처리 당일(오늘)로 표현된다. 7월까지 이래도 되나?"
      → 안 된다. v1.7 doSettle 이 date:todayStr() 로 박았다. 실제 결제일이어야 한다.
   ② "충돌 팝업이 무슨 데이터가 충돌하는지 설명이 없다."
      → v1.7 syncConflict 는 서버의 updated_at 만 읽었다. data 를 읽어 diff 를 낸다.
   ⚠️ 오늘 날짜에 기대지 않는다 — 과거 주기는 코드가 계산한 예정일로 검증한다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

/* 카드: 10일 마감 / 25일 결제. 1월 결제분 = 2025-12-11 ~ 2026-01-10 이용분, 2026-01-25 결제 */
const BASE=()=>({schemaVersion:7,ui:{month:'2026-01'},
 goals:[],routines:[],checks:{},rewards:[],rewardCards:{},journal:[],items:[],logs:[],
 fixed:[],events:[],posts:[],budgets:{},debts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 accounts:[{id:'a1',name:'우리 SUPER',type:'bank',balance:1000000}],
 cards:[{id:'cd1',name:'삼성',type:'credit',acct:'a1',closeDay:10,payDay:25}],
 categories:[{id:'c1',name:'통신비',type:'expense'},{id:'c2',name:'배달',type:'expense'},
             {id:'c3',name:'구독',type:'expense'},{id:'c9',name:'카드결제',type:'expense'}],
 transactions:[
  {id:'t1',type:'expense',date:'2025-12-20',cat:'통신비',method:'삼성',amt:72870,card:true,memo:'통신비'},
  {id:'t2',type:'expense',date:'2026-01-05',cat:'배달',method:'삼성',amt:21000,card:true,memo:'배달'},
  /* 3개월 할부 — 1월/2월/3월 결제분으로 쪼개진다 */
  {id:'t3',type:'expense',date:'2025-12-28',cat:'구독',method:'삼성',amt:60000,card:true,inst:3,instDone:0,memo:'Capcut'}
 ]});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1300);
  return {b,p,errs};
}

(async()=>{
{
  const {b,p,errs}=await boot(BASE());

  /* ── A. 주기 계산이 맞는가 (전제 확인) ── */
  const a=await p.evaluate(()=>({
    cyc1:instCycle(DB.transactions[0],1),      /* 12-20 구매 → 1월 결제분 */
    cyc2:instCycle(DB.transactions[1],1),      /* 01-05 구매 → 1월 결제분 */
    inst:[1,2,3].map(k=>instCycle(DB.transactions[2],k)),
    pay:cyclePayDate('2026-01',25)
  }));
  ok('A1 12-20 구매는 1월 결제분',a.cyc1==='2026-01',a.cyc1);
  ok('A2 01-05 구매도 1월 결제분',a.cyc2==='2026-01',a.cyc2);
  ok('A3 3개월 할부가 1·2·3월로 쪼개진다',a.inst.join(',')==='2026-01,2026-02,2026-03',a.inst.join(','));
  ok('A4 1월 결제분 예정일 = 2026-01-26(25일이 일요일 → 익영업일)',a.pay==='2026-01-26',a.pay);

  /* ── B. 🔒 핵심: 지난 결제분은 '오늘'이 아니라 실제 결제일로 들어간다 ── */
  const st=await p.evaluate(()=>{
    settleModal();
    const d=document.getElementById('stDate');
    return {def:d?d.value:null, today:todayStr(), ym:modal._stYM};
  });
  ok('B1 결제일 입력칸이 있다',st.def!==null,st.def);
  ok('B2 1월 결제분이 잡힌다',st.ym==='2026-01',st.ym);
  ok('B3 기본값이 오늘이 아니다',st.def!==st.today,`${st.def} / today=${st.today}`);
  ok('B4 기본값 = 실제 결제 예정일',st.def==='2026-01-26',st.def);
  const warn=await p.evaluate(()=>document.getElementById('modal').innerHTML.indexOf('그 달 현금흐름이 오늘로 몰린다')>=0);
  ok('B5 지난 결제분이라는 경고가 뜬다',warn===true);

  const done=await p.evaluate(()=>{
    doSettle();
    const s=DB.transactions.filter(x=>x.type==='settle')[0];
    return {date:s.date,amt:s.amt,cycle:s.cycle,acct:s.acct,
            t1:DB.transactions.filter(x=>x.id==='t1')[0].card,
            t3done:DB.transactions.filter(x=>x.id==='t3')[0].instDone,
            t3card:DB.transactions.filter(x=>x.id==='t3')[0].card};
  });
  ok('B6 결제 거래 날짜 = 2026-01-26',done.date==='2026-01-26',done.date);
  /* 72,870 + 21,000 + 할부 1회차 20,000 = 113,870 */
  ok('B7 금액 113,870',done.amt===113870,done.amt);
  ok('B8 일시불은 결제 완료',done.t1===false,done.t1);
  ok('B9 할부는 1회차만 확정',done.t3done===1&&done.t3card===true,`${done.t3done}/${done.t3card}`);

  /* ── C. 어긋난 날짜를 잡아낸다 (v1.7 로 만들어진 기존 데이터) ── */
  const off=await p.evaluate(()=>{
    const s=DB.transactions.filter(x=>x.type==='settle')[0];
    const good=settleDateOff(s);
    s.date='2026-08-25';                       /* v1.7 이 박아 놓았을 법한 값 */
    const bad=settleDateOff(s);
    const due=settleDueDate(s);
    s.date='2026-01-26';
    return {good,bad,due};
  });
  ok('C1 제 날짜면 경고 없음',off.good===0,off.good);
  ok('C2 7개월 밀린 날짜를 잡아낸다',off.bad>200,off.bad);
  ok('C3 예정일을 알려준다',off.due==='2026-01-26',off.due);

  /* 화면에도 뜨는가 */
  const ui=await p.evaluate(()=>{
    const s=DB.transactions.filter(x=>x.type==='settle')[0];
    s.date='2026-08-25';
    renderCal(); renderDay('2026-08-25');
    const h=document.getElementById('v-cal').innerHTML;
    return {warn:h.indexOf('날짜 +')>=0, fix:h.indexOf('data-stfix')>=0};
  });
  ok('C4 어긋난 날짜 뱃지가 화면에 뜬다',ui.warn===true);
  ok('C5 결제일 수정 버튼이 있다',ui.fix===true);

  /* ── D. 결제일 수정 ── */
  const fix=await p.evaluate(()=>{
    const s=DB.transactions.filter(x=>x.type==='settle')[0];
    settleFixDate(s.id);
    const has=document.getElementById('sf_date')!==null;
    document.getElementById('sf_date').value='2026-01-26';
    saveSettleDate(s.id);
    return {has,date:DB.transactions.filter(x=>x.type==='settle')[0].date};
  });
  ok('D1 수정 모달이 뜬다',fix.has===true);
  ok('D2 날짜가 바뀐다',fix.date==='2026-01-26',fix.date);
  const noAmt=await p.evaluate(()=>{
    const s=DB.transactions.filter(x=>x.type==='settle')[0];
    settleFixDate(s.id);
    const h=document.getElementById('modal').innerHTML;
    closeModal();
    return h.indexOf('sf_amt')<0 && h.indexOf('원장이 깨진다')>=0;
  });
  ok('D3 금액은 못 고치게 막혀 있다',noAmt===true);

  /* ── E. 🔒 결제를 지우면 미결제로 돌아온다 (v1.7 은 조용히 증발시켰다) ── */
  const un=await p.evaluate(()=>{
    const s=DB.transactions.filter(x=>x.type==='settle')[0];
    const covered=settleTxns(s).length;
    delTxn(s.id);
    const g=id=>DB.transactions.filter(x=>x.id===id)[0];
    return {covered,
      settles:DB.transactions.filter(x=>x.type==='settle').length,
      t1:g('t1').card, t2:g('t2').card,
      t3card:g('t3').card, t3done:g('t3').instDone,
      owed:DB.transactions.filter(x=>x.type==='expense').reduce((a,x)=>a+txnOwed(x),0)};
  });
  ok('E1 이 결제가 3건을 덮고 있었다',un.covered===3,un.covered);
  ok('E2 결제 거래가 사라진다',un.settles===0,un.settles);
  ok('E3 일시불이 미결제로 복원',un.t1===true&&un.t2===true,`${un.t1}/${un.t2}`);
  ok('E4 할부 회차가 되감긴다',un.t3card===true&&un.t3done===0,`${un.t3card}/${un.t3done}`);
  ok('E5 미결제 잔액이 전액으로 복원',un.owed===72870+21000+60000,un.owed);

  /* 지우고 다시 확정해도 같은 금액 — 왕복이 손실 없이 닫히는가 */
  const round=await p.evaluate(()=>{
    settleModal(); doSettle();
    const s=DB.transactions.filter(x=>x.type==='settle')[0];
    return {amt:s.amt,date:s.date};
  });
  ok('E6 다시 확정하면 같은 금액·같은 날짜',round.amt===113870&&round.date==='2026-01-26',
     `${round.amt}/${round.date}`);

  ok('Z1 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── F. 동기화 충돌 설명 ── */
{
  const {b,p,errs}=await boot(BASE());
  const d=await p.evaluate(()=>{
    const srv=JSON.parse(JSON.stringify(DB));
    /* 저쪽에서: 거래 1건 추가 · 내 거래 1건 금액 수정 */
    srv.transactions.push({id:'tS',type:'expense',date:'2026-01-09',cat:'배달',method:'삼성',amt:33000,card:true});
    srv.transactions.filter(x=>x.id==='t1')[0].amt=99999;
    /* 내 쪽에서: 거래 1건 추가 */
    DB.transactions.push({id:'tM',type:'expense',date:'2026-01-08',cat:'통신비',method:'삼성',amt:5000,card:true});
    const txt=syncDiffText(DB,srv);
    return {txt,
      same:syncDiffText(DB,DB),
      noSrv:syncDiffText(DB,null)};
  });
  ok('F1 무엇이 다른지 설명이 나온다',d.txt.indexOf('거래')>=0,d.txt.slice(0,80));
  ok('F2 내 쪽에만 있는 것을 짚는다',d.txt.indexOf('내 쪽에만')>=0,d.txt);
  ok('F3 저쪽에만 있는 것을 짚는다',d.txt.indexOf('저쪽에만')>=0,d.txt);
  ok('F4 양쪽 내용이 다른 건수도 센다',d.txt.indexOf('양쪽 내용 다름 1건')>=0,d.txt);
  ok('F5 항목 라벨에 날짜·금액이 보인다',d.txt.indexOf('2026-01-08')>=0&&d.txt.indexOf('2026-01-09')>=0,d.txt);
  ok('F6 건수 비교가 붙는다',/거래 \(\d+ vs \d+\)/.test(d.txt),d.txt.slice(0,60));
  ok('F7 내용이 같으면 "잃는 것 없다"고 말한다',d.same.indexOf('잃는 것이 없다')>=0,d.same);
  ok('F8 서버를 못 읽으면 비교 불가라고 말한다',d.noSrv.indexOf('비교 불가')>=0,d.noSrv);
  ok('F9 pre_overwrite 스냅샷 종류가 등록돼 있다',
     await p.evaluate(()=>SNAP_LIMIT.pre_overwrite>0&&snapKindLabel('pre_overwrite')==='덮어쓰기직전'));
  ok('Z2 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

console.log('t31 카드결제일·충돌설명 |',pass,'통과 /',fail,'실패');
if(bad.length)console.log('  ✗ '+bad.join('\n  ✗ '));
process.exit(fail?1:0);
})();
