/* t37 — 🔗 가계부↔데일리 연동 · 입력순 · 기본값 자동화 (v2.6)
   🔒 핵심 불변식 넷:
      ① 현금성 계좌는 **거래에서 파생**한다 — 거래를 넣으면 현황판이 즉시 따라와야 한다.
      ② 투자·저축·외환은 파생하지 않는다 — 평가액이라 거래로 계산할 수 없다.
      ③ 정렬하지 않는 것이 곧 입력순이다 — 통장 내역과 눈으로 대조하려고 만든 것이다.
      ④ 자동 기본값은 **수정 중에 끼어들지 않는다** — 이미 고른 값을 조용히 바꾸면 안 된다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const D='2026-09-03';

const BASE=()=>({schemaVersion:7,ui:{month:'2026-09',goalDate:D},
 goals:[],routines:[],checks:{},rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],
 netSnapshots:[],fixed:[],events:[],posts:[],budgets:{},timelog:{},meals:{},
 debts:[{id:'d1',name:'정책자금',balance:1000000}],
 accounts:[
  {id:'aw',name:'우리 SUPER주거래 통장',group:'현금성',mode:'auto',
   hist:[{date:'2026-08-31',amount:300000}],opening:{date:'2026-09-01',amount:300000}},
  {id:'ak',name:'카카오뱅크 개인사업자입출금',group:'현금성',mode:'auto',
   hist:[{date:'2026-08-31',amount:50000}],opening:{date:'2026-09-01',amount:50000}},
  {id:'ai',name:'ETF',group:'투자',mode:'manual',hist:[{date:'2026-08-31',amount:200000}]}],
 cards:[{id:'c3',acct:'aw',name:'우리(K패스)',type:'check'},
        {id:'c2',acct:'ak',name:'카카오-사업자체크카드',type:'check'},
        {id:'c1',acct:'aw',name:'삼성 탭탭오',type:'credit',payDay:25,closeDay:10}],
 categories:[{name:'식비',type:'expense',isFood:true},{name:'카페',type:'expense',isFood:true},
             {name:'배달',type:'expense',isFood:true},{name:'생활용품',type:'expense'},
             {name:'채움영어',type:'income',incType:'사업소득'}],
 transactions:[
  {id:'t1',type:'expense',scope:'personal',cat:'생활용품',method:'우리(K패스)',amt:1000,date:D,memo:'다이소 정리함'},
  {id:'t2',type:'expense',scope:'personal',cat:'식비',method:'우리(K패스)',amt:50000,date:D,memo:''},
  {id:'t3',type:'income',scope:'business',cat:'채움영어',acct:'aw',amt:20000,date:D,memo:''}],
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};
   function mk(t){let _m=null,_p=null;
    const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},
     eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
     update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;return Promise.resolve({})},
     order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
     delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
    return q;}
   window.supabase={createClient:()=>({from:t=>mk(t),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  return {b,p,errs};
}

(async()=>{
 /* ── A. ⑥ 현황판이 거래를 따라온다 ── */
 {
  const {b,p,errs}=await boot(BASE());
  /* 우리 SUPER: 기초 300,000 − 1,000 − 50,000 + 20,000 = 269,000 */
  ok('A1 현금성은 파생',(await p.evaluate(()=>accIsDerived(DB.accounts[0])))===true);
  ok('A2 투자는 파생 아님',(await p.evaluate(()=>accIsDerived(DB.accounts[2])))===false);
  ok('A3 우리 SUPER = 기초+거래',(await p.evaluate(()=>accVal(DB.accounts[0])))===269000,
     await p.evaluate(()=>accVal(DB.accounts[0])));
  ok('A4 투자는 hist 그대로',(await p.evaluate(()=>accVal(DB.accounts[2])))===200000);
  const before=await p.evaluate(()=>totalAssets());
  /* 거래를 하나 더 넣으면 즉시 반영돼야 한다 */
  await p.evaluate(d=>{DB.transactions.push({id:'tz',type:'expense',scope:'personal',cat:'생활용품',
    method:'우리(K패스)',amt:9000,date:d});},D);
  const after=await p.evaluate(()=>totalAssets());
  ok('A5 거래 추가가 총자산에 즉시 반영',after===before-9000,before+'→'+after);
  ok('A6 hist 를 안 건드려도 바뀐다',(await p.evaluate(()=>DB.accounts[0].hist.length))===1);
  ok('A7 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── B. 🔒 파생 계좌는 평가액을 손으로 못 고친다 ── */
 {
  const {b,p}=await boot(BASE());
  await p.click('.m[data-v="acct"]');await p.waitForTimeout(500);
  await p.evaluate(()=>accModal('aw'));await p.waitForTimeout(300);
  ok('B1 평가액 읽기전용',(await p.$eval('#ac_amt',e=>e.readOnly))===true);
  ok('B2 왜 그런지 설명',(await p.$eval('.modal',e=>e.textContent)).indexOf('거래에서 파생')>=0);
  await p.evaluate(()=>{closeModal();accModal('ai');});await p.waitForTimeout(300);
  ok('B3 투자는 편집 가능',(await p.$eval('#ac_amt',e=>e.readOnly))===false);
  /* 파생 계좌 저장 시 hist 를 찍지 않는다 */
  await p.evaluate(()=>{closeModal();accModal('aw');});await p.waitForTimeout(300);
  await p.evaluate(()=>saveAcc('aw'));await p.waitForTimeout(500);
  ok('B4 파생 계좌엔 hist 미기록',(await p.evaluate(()=>DB.accounts[0].hist.length))===1,
     await p.evaluate(()=>JSON.stringify(DB.accounts[0].hist)));
  await b.close();
 }

 /* ── C. ③ 입력순 정렬 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(600);
  await p.evaluate(d=>renderDay(d),D);await p.waitForTimeout(300);
  const order=await p.$$eval('#dayPanel .txr .txr-t',es=>es.map(e=>e.textContent.trim()));
  /* 입력순: 생활용품(1,000) → 식비(50,000) → 채움영어(20,000)
     ⚠️ v2.51 은 금액 내림차순이라 식비가 맨 위였다 */
  ok('C1 목록이 입력순',order[0].indexOf('생활용품')>=0,JSON.stringify(order));
  ok('C2 금액순이 아니다',order[0].indexOf('식비')<0,JSON.stringify(order));
  const cellOrder=await p.$$eval('.cell[data-date="'+D+'"] .cl .c',es=>es.map(e=>e.textContent.trim()));
  ok('C3 캘린더 칸도 입력순',cellOrder[0].indexOf('생활용품')>=0,JSON.stringify(cellOrder));
  ok('C4 수입이 위로 안 올라간다',cellOrder[0].indexOf('채움영어')<0,JSON.stringify(cellOrder));
  ok('C5 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── D. ④ 캘린더 툴팁 ── */
 {
  const {b,p}=await boot(BASE());
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(600);
  const tips=await p.$$eval('.cell[data-date="'+D+'"] .cl',es=>es.map(e=>e.getAttribute('data-tip')));
  ok('D1 모든 줄에 툴팁',tips.every(t=>!!t),JSON.stringify(tips));
  ok('D2 적요가 들어간다',tips.some(t=>t.indexOf('다이소 정리함')>=0),JSON.stringify(tips));
  ok('D3 계정과목·금액',tips[0].indexOf('생활용품')>=0&&tips[0].indexOf('1,000')>=0,tips[0]);
  ok('D4 결제수단',tips[0].indexOf('우리(K패스)')>=0,tips[0]);
  ok('D5 적요 없으면 안 넣는다',tips[1].indexOf('“')<0,tips[1]);
  await b.close();
 }

 /* ── E. ② 사업 → 카페 + 카카오 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(500);
  await p.evaluate(()=>txnModal(null));await p.waitForTimeout(300);
  await p.evaluate(()=>{const bs=document.querySelectorAll('.seg button');
    for(const x of bs)if(x.textContent==='사업')x.click();});
  await p.waitForTimeout(300);
  ok('E1 계정과목 카페',(await p.$eval('#fCat',e=>e.value))==='카페');
  ok('E2 결제수단 카카오 사업자',(await p.$eval('#fMethod',e=>e.value))==='카카오-사업자체크카드');
  ok('E3 scope 도 사업',(await p.evaluate(()=>modal._scope))==='business');
  /* 🔒 수정 중에는 끼어들지 않는다 */
  await p.evaluate(()=>{closeModal();txnModal('t1');});await p.waitForTimeout(300);
  await p.evaluate(()=>{const bs=document.querySelectorAll('.seg button');
    for(const x of bs)if(x.textContent==='사업')x.click();});
  await p.waitForTimeout(300);
  ok('E4 수정 중엔 계정과목 유지',(await p.$eval('#fCat',e=>e.value))==='생활용품');
  ok('E5 수정 중에도 scope 는 바뀐다',(await p.evaluate(()=>modal._scope))==='business');
  ok('E6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── F. ⑤ 수입 → 우리 SUPER ── */
 {
  const {b,p}=await boot(BASE());
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(500);
  await p.evaluate(()=>txnModal(null));await p.waitForTimeout(300);
  await p.evaluate(()=>{const bs=document.querySelectorAll('.seg button');
    for(const x of bs)if(x.textContent==='수입')x.click();});
  await p.waitForTimeout(300);
  ok('F1 입금계좌가 우리 SUPER',(await p.$eval('#fAcct',e=>e.value))==='aw',await p.$eval('#fAcct',e=>e.value));
  ok('F2 이름으로 찾는다(id 미박제)',(await p.evaluate(()=>mainInAcct().name)).indexOf('SUPER')>=0);
  /* 계좌 이름이 바뀌면 첫 현금성으로 물러선다 */
  ok('F3 없으면 첫 현금성으로',await p.evaluate(()=>{
     const o=DB.accounts[0].name;DB.accounts[0].name='다른통장';
     const r=mainInAcct().id;DB.accounts[0].name=o;return r==='aw';}));
  await b.close();
 }

 /* ── G. ① 식비 → 끼니 슬롯 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(500);
  await p.evaluate(()=>txnModal(null));await p.waitForTimeout(300);
  ok('G1 음식 계정과목이면 칩이 뜬다',await p.evaluate(()=>{
     selOpt(document.getElementById('fCat'),'식비');foodFieldSync();
     return document.getElementById('foodField').style.display==='block';}));
  ok('G2 칩 5개(해당없음+4끼)',(await p.$$('#fSlotWrap .dchip')).length===5);
  ok('G3 기본은 해당없음',(await p.evaluate(()=>modal._slot||''))==='');
  /* 음식 아닌 계정과목이면 숨는다 */
  ok('G4 비음식이면 숨는다',await p.evaluate(()=>{
     selOpt(document.getElementById('fCat'),'생활용품');foodFieldSync();
     return document.getElementById('foodField').style.display==='none';}));
  /* 끼니를 고르고 저장 → 데일리 식사에 들어간다 */
  await p.evaluate(d=>{
    selOpt(document.getElementById('fCat'),'식비');foodFieldSync();
    document.getElementById('fFood').value='제육덮밥';
    document.getElementById('fAmt').value='9000';
    document.getElementById('fDate').value=d;
    const c=document.querySelector('#fSlotWrap .dchip[data-slot="l"]');setMealSlot(c,'l');
    saveTxn(null);},D);
  await p.waitForTimeout(600);
  ok('G5 거래에 slot 저장',(await p.evaluate(()=>DB.transactions.filter(t=>t.food==='제육덮밥')[0].slot))==='l');
  ok('G6 데일리 식사에 반영',(await p.evaluate(d=>mealCell(d,'l').a,D))==='제육덮밥');
  /* 🔒 덮어쓰지 않고 이어붙인다 */
  await p.evaluate(d=>{txnModal(null);
    selOpt(document.getElementById('fCat'),'카페');foodFieldSync();
    document.getElementById('fFood').value='아메리카노';
    document.getElementById('fAmt').value='2500';
    document.getElementById('fDate').value=d;
    const c=document.querySelector('#fSlotWrap .dchip[data-slot="l"]');setMealSlot(c,'l');
    saveTxn(null);},D);
  await p.waitForTimeout(600);
  ok('G7 이어붙인다',(await p.evaluate(d=>mealCell(d,'l').a,D))==='제육덮밥, 아메리카노',
     await p.evaluate(d=>mealCell(d,'l').a,D));
  /* ⚠️ 같은 말은 두 번 안 넣는다 */
  await p.evaluate(d=>{txnModal(null);
    selOpt(document.getElementById('fCat'),'카페');foodFieldSync();
    document.getElementById('fFood').value='아메리카노';
    document.getElementById('fAmt').value='2500';
    document.getElementById('fDate').value=d;
    const c=document.querySelector('#fSlotWrap .dchip[data-slot="l"]');setMealSlot(c,'l');
    saveTxn(null);},D);
  await p.waitForTimeout(600);
  ok('G8 중복은 안 넣는다',(await p.evaluate(d=>mealCell(d,'l').a,D))==='제육덮밥, 아메리카노');
  /* 끼니를 안 고르면 식사 기록에 안 들어간다 (식재료) */
  await p.evaluate(d=>{txnModal(null);
    selOpt(document.getElementById('fCat'),'식비');foodFieldSync();
    document.getElementById('fFood').value='장보기 채소';
    document.getElementById('fAmt').value='30000';
    document.getElementById('fDate').value=d;
    saveTxn(null);},D);
  await p.waitForTimeout(600);
  ok('G9 끼니 안 고르면 식사 기록 안 함',(await p.evaluate(d=>mealCell(d,'b').a+mealCell(d,'d').a+mealCell(d,'s').a,D))==='');
  ok('G10 slot 키를 안 만든다',(await p.evaluate(()=>DB.transactions.filter(t=>t.food==='장보기 채소')[0].slot))===undefined);
  ok('G11 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 console.log('t37  pass='+pass+' fail='+fail);
 if(bad.length)console.log(bad.map(x=>'  ✗ '+x).join('\n'));
 process.exit(fail?1:0);
})();
