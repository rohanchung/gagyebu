/* t26 — v1.41  현금흐름 정합 · 거래 행 2줄 · 설명 문구 제거
   ⚠️ 시드는 로한 실제 8월 구조 그대로: 신용카드 일부 선결제 완료 + 체크카드에 계좌 누락 + 현금 건. */
const {chromium}=require('playwright');
const file=process.argv[2];
const INIT=({st})=>{const store={v:st,at:'2026-08-21T00:00:00.000Z'};window.__store=store;
 const res=d=>Promise.resolve({data:d,error:null});
 function mk(){let m=null,p=null;const q={
  select(){if(m==='update'){store.v=p.data;store.at=p.updated_at;return res([{updated_at:store.at}]);}return q},
  eq(){return q},maybeSingle(){return store.v===null?res(null):res({data:store.v,updated_at:store.at})},
  update(x){m='update';p=x;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return res(null)},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};return q;}
 window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};};

const E=(id,date,amt,cat,method,o)=>Object.assign({id,type:'expense',scope:'personal',cat,method,amt,date},o||{});
const ST={schemaVersion:7,
 accounts:[{id:'a1',name:'우리SUPER',group:'현금성',mode:'auto',opening:{date:'2026-08-01',amount:1000000},hist:[]},
           {id:'a2',name:'카카오사업자',group:'현금성',mode:'auto',opening:{date:'2026-08-01',amount:500000},hist:[]},
           {id:'a3',name:'노랑우산',group:'저축',mode:'manual',hist:[{date:'2026-08-01',amount:300000}]}],
 cards:[{id:'c1',name:'삼성 탭탭오',type:'credit',acct:'a1',closeDay:10,payDay:25},
        {id:'c2',name:'우리(K패스)',type:'check',acct:'a1'},
        {id:'c3',name:'카카오-사업자체크카드',type:'check',acct:'a2'}],
 categories:[{id:'k1',name:'식비',type:'expense'},{id:'k2',name:'교통',type:'expense'},
             {id:'k3',name:'카드결제',type:'expense'},{id:'k4',name:'급여',type:'income'}],
 transactions:[
   /* 신용카드 — 선결제 완료분(332,154 상당) */
   E('c_a','2026-08-02',200000,'식비','삼성 탭탭오',{card:false}),
   E('c_b','2026-08-05',132154,'식비','삼성 탭탭오',{card:false}),
   {id:'s1',type:'settle',acct:'a1',amt:332154,date:'2026-08-06',method:'삼성 탭탭오 결제',cat:'카드결제',cycle:'2026-08'},
   /* 신용카드 — 아직 미결제 */
   E('c_c','2026-08-18',656000,'식비','삼성 탭탭오',{card:true}),
   /* ⚠️ 같은 체크카드인데 하나는 acct 있고 하나는 없다 — 로한 실제 상태(45건 중 23건) 재현 */
   E('k_a','2026-08-03',100000,'교통','우리(K패스)'),
   E('k_b','2026-08-04',63410,'교통','우리(K패스)',{acct:'a1'}),
   /* 고아 — 카드 이름을 바꿔서(카카오(사업자) → 카카오-사업자체크카드) 목록에 없는 옛 결제수단 */
   E('k_c','2026-08-08',44995,'식비','카카오(사업자)'),
   E('k_d','2026-08-09',1500,'식비','카카오-사업자체크카드'),
   /* 현금 — 앱이 계좌를 알 수 없다 */
   E('h_a','2026-08-07',50000,'식비','현금'),
   /* 정상 (계좌 붙음) */
   E('n_a','2026-08-09',30000,'식비','이체',{acct:'a1'}),
   {id:'i1',type:'income',scope:'personal',cat:'급여',method:'이체',acct:'a1',amt:2000000,date:'2026-08-10'},
   {id:'tr1',type:'transfer',from:'a1',to:'a3',amt:100000,date:'2026-08-11'},
 ],
 goals:[],routines:[],checks:{},rewards:[],debts:[],budgets:{},items:[],journal:[],meta:{seq:{}},
 ui:{month:'2026-08',cfPeriod:'month'}};

let F=0,N=0;
const ok=(c,m,x)=>{N++;if(!c)F++;console.log((c?'  ✓ ':'  ✗ ')+m+(x!==undefined?('   → '+x):''));};
async function boot(b,st,w){
  const c=await b.newContext(w?{viewport:w,hasTouch:true,isMobile:true}:{});
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

console.log('=== 🔑 계좌는 저장이 아니라 파생이다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const g=id=>DB.transactions.filter(x=>x.id===id)[0];
   return {
     ka:txnAcct(g('k_a')), kb:txnAcct(g('k_b')),
     kaRaw:g('k_a').acct, kbRaw:g('k_b').acct,
     kc:txnAcct(g('k_c')),
     credit:txnAcct(g('c_a')), settle:txnAcct(g('s1')),
     cash:txnAcct(g('h_a')), tr:txnAcct(g('n_a'))};});
 ok(r.ka==='a1'&&r.kb==='a1','⚠️ 같은 체크카드면 acct 저장 여부와 무관하게 같은 계좌', r.ka+'/'+r.kb);
 ok(r.kaRaw===undefined&&r.kbRaw===undefined,'마이그레이션이 카드 거래의 저장된 acct 를 걷어냈다', String(r.kaRaw)+'/'+String(r.kbRaw));
 ok(r.credit===null,'신용카드 = 계좌 없음 (선결제 때 나간다)', String(r.credit));
 ok(r.settle==='a1','선결제는 확정 시 고른 계좌가 사실', r.settle);
 ok(r.kc===null,'고아 결제수단은 계좌를 못 찾는다', String(r.kc));
 ok(r.cash===null,'현금 = 사람만 안다', String(r.cash));
 ok(r.tr==='a1','이체 지출은 사용자가 고른 계좌', r.tr);
 const chg=await p.evaluate(()=>{
   DB.cards.filter(x=>x.id==='c2')[0].acct='a2';   /* 카드 연결계좌 변경 */
   return DB.transactions.filter(x=>x.id==='k_a'||x.id==='k_b').map(t=>txnAcct(t));});
 ok(chg.join('/')==='a2/a2','⚠️ 카드 연결계좌를 바꾸면 그 카드 거래가 전부 따라온다', chg.join('/'));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 유출 이중계상이 사라졌다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   const tx=cfTxns('month');
   let tin=0,tout=0,naive=0;
   tx.forEach(t=>{if(cfIsCashIn(t))tin+=t.amt;else if(cfIsCashOut(t))tout+=t.amt;
     if(t.type==='expense'||t.type==='settle')naive+=t.amt;});
   return {tin,tout,naive};});
 ok(r.naive===1610213,'옛 방식(expense 전부 + settle) = 1,608,713', r.naive);
 ok(r.tout===527064,'새 방식 유출 = 332,154(settle) + 164,910(체크 파생) + 30,000(이체) = 527,064', r.tout);
 ok(r.tin===2000000,'유입 = 계좌 붙은 수입만', r.tin);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 신용카드는 settle 로만 나간다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>({
   buy:cfIsCashOut(DB.transactions.filter(x=>x.id==='c_a')[0]),
   pend:cfIsCashOut(DB.transactions.filter(x=>x.id==='c_c')[0]),
   settle:cfIsCashOut(DB.transactions.filter(x=>x.id==='s1')[0]),
   check:cfIsCashOut(DB.transactions.filter(x=>x.id==='k_a')[0]),
   orphan:cfIsCashOut(DB.transactions.filter(x=>x.id==='k_c')[0])}));
 ok(r.buy===false,'신용카드 산 시점 = 현금유출 아님');
 ok(r.pend===false,'미결제 = 아직 안 나갔다');
 ok(r.settle===true,'settle = 실제 유출');
 ok(r.check===true,'⚠️ 체크카드는 acct 저장 없이도 유출로 잡힌다 (파생)');
 ok(r.orphan===false,'고아는 계좌를 못 찾아 유출에서 빠진다 → 경고로 드러낸다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 미지정은 사람만 아는 것에만 뜬다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const u=cfUnassigned(cfTxns('month'));
   const o=cfOrphanMethods(cfTxns('month'));
   return {ids:u.map(t=>t.id).sort().join(','), n:u.length,
     orphKeys:Object.keys(o).join(','), orphSum:o['카카오(사업자)']};});
 ok(r.ids==='h_a','⚠️ 미지정 = 현금 1건뿐. 체크카드는 파생되므로 안 뜬다', r.ids);
 ok(r.n===1,'미지정 1건', r.n);
 ok(r.orphKeys==='카카오(사업자)','고아 결제수단 별도 검출', r.orphKeys);
 ok(r.orphSum===44995,'고아 금액', r.orphSum);
 const ui=await p.evaluate(()=>{renderCashflow();const h=document.getElementById('v-cashflow').innerHTML;
   return {una:/출금계좌 미지정 1건/.test(h), orph:/카드 목록에 없다/.test(h),
     noBtn:!/cfFixBtn/.test(h), noGuess:typeof window.cfGuessAcct==='undefined'};});
 ok(ui.una,'미지정 경고 (현금·이체만)');
 ok(ui.orph,'고아 경고 별도');
 ok(ui.noBtn&&ui.noGuess,'⚠️ 보정 버튼·추측 함수 제거됨 (채울 게 없다)');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 계좌 잔액도 파생을 쓴다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const a1=DB.accounts.filter(x=>x.id==='a1')[0];
   return {comp:acctComputed(a1), base:acctBaseline(a1).amount, flow:acctFlow(a1)};});
 ok(r.base===1000000,'기초 1,000,000', r.base);
 ok(r.flow===2000000-332154-163410-30000-100000,'흐름 = 수입 − (settle+체크a1+이체+저축이체)', r.flow);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== Sankey 와 합계가 같은 판정을 쓴다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const tx=cfTxns('month');const g=cfBuildSankey(tx);
   let tout=0;tx.forEach(t=>{if(cfIsCashOut(t))tout+=t.amt;});
   const kSum=Object.keys(g.K).filter(k=>k.slice(0,3)==='ex:').reduce((s,k)=>s+g.K[k],0);
   let tin=0;tx.forEach(t=>{if(cfIsCashIn(t))tin+=t.amt;});
   const sSum=Object.keys(g.S).reduce((s,k)=>s+g.S[k],0);
   return {tout,kSum,tin,sSum};});
 ok(r.kSum===r.tout,'⚠️ 그림의 유출 = 숫자의 유출', r.kSum+' = '+r.tout);
 ok(r.sSum===r.tin,'그림의 유입 = 숫자의 유입', r.sSum+' = '+r.tin);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 거래 행 2줄 구조 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{renderCal();renderDay('2026-08-18');
   const row=document.querySelector('#dayPanel .txr');
   const cs=getComputedStyle(row.querySelector('.txr-x'));
   return {two:!!row.querySelector('.txr1')&&!!row.querySelector('.txr2'),
     title:row.querySelector('.txr-t').textContent,
     amt:row.querySelector('.txr-a').textContent,
     meta:row.querySelector('.txr-m').textContent,
     acts:row.querySelectorAll('.txr-x span').length,
     hidden:cs.opacity==='0'};});
 ok(r.two,'1행/2행으로 갈렸다');
 ok(r.title==='식비'&&/656,000/.test(r.amt),'1행 = 무엇 · 얼마', r.title+' '+r.amt);
 ok(/삼성 탭탭오/.test(r.meta),'2행 = 수단', JSON.stringify(r.meta));
 ok(r.acts===2,'액션 2개(수정·삭제)', r.acts);
 ok(r.hidden,'액션은 hover 전엔 숨는다 (줄이 조용해진다)');
 const w=await p.evaluate(()=>{renderDay('2026-08-03');
   const a=document.querySelector('#dayPanel .txr .txr-m').innerHTML;
   renderDay('2026-08-08');
   const b=document.querySelector('#dayPanel .txr .txr-m').innerHTML;
   return {a,b};});
 ok(/우리SUPER/.test(w.a),'⚠️ 체크카드 행은 파생 계좌가 보인다 (저장 안 했는데도)', w.a.replace(/<[^>]+>/g,''));
 ok(/출금계좌 미지정/.test(w.b),'계좌를 못 찾는 건만 행에서 드러난다', w.b.replace(/<[^>]+>/g,''));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 설명 문구가 지워졌다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(async()=>{const bad=[];
   const pats=[/자동=거래 연동/,/클릭→추세/,/항목 클릭 → 그래프/,/줄을 눌러 선결제/,
     /예정일<\/b>일 뿐/,/여기 있는 것만 주간/,/체중계 화면 순서대로/,/행 클릭 = 드릴다운/,
     /실제잔액을 넣으면 차액이/,/확정하면 선택 건이/,/스케줄\(거치·상환방식\)/];
   for(const v of ['dash','cal','cashflow','acct','tax','budget','items','weight','reward','goal','daily','log']){
     const el=document.querySelector('.m[data-v="'+v+'"]'); if(!el)continue;
     el.click(); await new Promise(r=>setTimeout(r,150));
     const h=(document.getElementById('v-'+v)||{}).innerHTML||'';
     pats.forEach((p,i)=>{if(p.test(h))bad.push(v+'#'+i);});}
   return {bad, btn:!document.getElementById('settleBtn')};});
 ok(r.bad.length===0,'설명 문구 잔존 0', r.bad.join(',')||'없음');
 ok(r.btn,'선결제 확정 버튼 제거됨 (결제분 줄 클릭이 진입점)');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 모바일 390px ===');
{const {c,p,errs}=await boot(b,ST,{width:390,height:844});
 const r=await p.evaluate(async()=>{const o={};
   for(const v of ['cal','cashflow','dash']){
     document.querySelector('.m[data-v="'+v+'"]').click();
     await new Promise(r=>setTimeout(r,200));
     o[v]=document.documentElement.scrollWidth-document.documentElement.clientWidth;}
   renderDay('2026-08-18');
   const row=document.querySelector('#dayPanel .txr');
   o.acts=getComputedStyle(row.querySelector('.txr-x')).opacity;
   return o;});
 ok(r.cal<=4&&r.cashflow<=4&&r.dash<=4,'가로 넘침 없음', JSON.stringify(r));
 ok(r.acts==='1','⚠️ 좁은 화면·터치에선 액션 항상 노출', r.acts);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n'+(F?('=== 실패 '+F+' / '+N+' ==='):('=== 전부 통과 ('+N+'건) ===')));
await b.close();process.exit(F?1:0);})();
