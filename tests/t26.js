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
        {id:'c3',name:'카카오(사업자)',type:'check',acct:'a2'}],
 categories:[{id:'k1',name:'식비',type:'expense'},{id:'k2',name:'교통',type:'expense'},
             {id:'k3',name:'카드결제',type:'expense'},{id:'k4',name:'급여',type:'income'}],
 transactions:[
   /* 신용카드 — 선결제 완료분(332,154 상당) */
   E('c_a','2026-08-02',200000,'식비','삼성 탭탭오',{card:false}),
   E('c_b','2026-08-05',132154,'식비','삼성 탭탭오',{card:false}),
   {id:'s1',type:'settle',acct:'a1',amt:332154,date:'2026-08-06',method:'삼성 탭탭오 결제',cat:'카드결제',cycle:'2026-08'},
   /* 신용카드 — 아직 미결제 */
   E('c_c','2026-08-18',656000,'식비','삼성 탭탭오',{card:true}),
   /* 체크카드인데 계좌 누락 (카드 연결계좌를 나중에 설정한 옛 건) */
   E('k_a','2026-08-03',100000,'교통','우리(K패스)'),
   E('k_b','2026-08-04',63410,'교통','우리(K패스)'),
   E('k_c','2026-08-08',44995,'식비','카카오(사업자)'),
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

console.log('=== 유출 이중계상이 사라졌다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   const tx=cfTxns('month');
   let tin=0,tout=0,naive=0;
   tx.forEach(t=>{if(cfIsCashIn(t))tin+=t.amt;else if(cfIsCashOut(t))tout+=t.amt;
     if(t.type==='income')naive+=0; if(t.type==='expense'||t.type==='settle')naive+=t.amt;});
   return {tin,tout,naive};});
 ok(r.naive===1608713,'옛 방식(expense 전부 + settle) = 1,608,713', r.naive);
 ok(r.tout===362154,'새 방식 유출 = 30,000(이체) + 332,154(settle) = 362,154', r.tout);
 ok(r.naive-r.tout===1246559,'⚠️ 차이 1,246,559 = 신용카드 원거래 988,154 + 계좌미지정 258,405', r.naive-r.tout);
 ok(r.tin===2000000,'유입 = 계좌 붙은 수입만', r.tin);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 신용카드는 settle 로만 나간다 (산 시점 아님) ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>({
   buy:cfIsCashOut(DB.transactions.filter(x=>x.id==='c_a')[0]),
   pend:cfIsCashOut(DB.transactions.filter(x=>x.id==='c_c')[0]),
   settle:cfIsCashOut(DB.transactions.filter(x=>x.id==='s1')[0]),
   normal:cfIsCashOut(DB.transactions.filter(x=>x.id==='n_a')[0]),
   noacct:cfIsCashOut(DB.transactions.filter(x=>x.id==='k_a')[0])}));
 ok(r.buy===false,'신용카드 산 시점 = 현금유출 아님');
 ok(r.pend===false,'미결제 = 아직 안 나갔다');
 ok(r.settle===true,'settle = 실제 유출');
 ok(r.normal===true,'계좌 붙은 이체 지출 = 유출');
 ok(r.noacct===false,'계좌 없으면 유출로 못 센다 (경고로 드러낸다)');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 계좌 미지정이 화면에 드러난다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{const u=cfUnassigned(cfTxns('month'));
   return {n:u.length, sum:u.reduce((s,t)=>s+t.amt,0),
     ids:u.map(t=>t.id).sort().join(','),
     fixable:u.filter(t=>cfGuessAcct(t)).length};});
 ok(r.n===4,'미지정 4건 (체크카드3 + 현금1)', r.n);
 ok(r.sum===258405,'합계 258,405', r.sum);
 ok(r.ids==='h_a,k_a,k_b,k_c','신용카드는 미지정에 안 들어간다 (정상 동작이므로)', r.ids);
 ok(r.fixable===3,'⚠️ 체크카드 3건만 보정 가능 — 현금은 앱이 모른다', r.fixable);
 const ui=await p.evaluate(()=>{renderCashflow();const h=document.getElementById('v-cashflow').innerHTML;
   return {warn:/계좌 미지정 4건/.test(h), btn:/cfFixBtn/.test(h), sum:/258,405/.test(h)};});
 ok(ui.warn&&ui.sum,'경고 줄에 건수·금액 표시');
 ok(ui.btn,'보정 버튼 노출');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 일괄 보정 — 체크카드만, 현금은 안 건드린다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{window.__ans=true;cfFixAccts();
   const g=id=>DB.transactions.filter(x=>x.id===id)[0];
   return {ka:g('k_a').acct,kb:g('k_b').acct,kc:g('k_c').acct,ha:g('h_a').acct,
     dlg:window.__dlg.filter(x=>!/^ALERT/.test(x))[0]||'',
     left:cfUnassigned(cfTxns('month')).length};});
 ok(r.ka==='a1'&&r.kb==='a1','우리(K패스) → 우리SUPER', r.ka+'/'+r.kb);
 ok(r.kc==='a2','카카오(사업자) → 카카오사업자', r.kc);
 ok(r.ha===undefined,'⚠️ 현금 건은 손대지 않는다 (추측하지 않는다)', String(r.ha));
 ok(/우리\(K패스\) → 우리SUPER 2건/.test(r.dlg),'무엇을 어디로 채우는지 먼저 보여준다');
 ok(r.left===1,'보정 후 미지정 1건(현금)만 남는다', r.left);
 const after=await p.evaluate(()=>{const tx=cfTxns('month');let o=0;
   tx.forEach(t=>{if(cfIsCashOut(t))o+=t.amt;});return o;});
 ok(after===570559,'보정 후 유출 = 362,154 + 208,405 = 570,559', after);
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
   return document.querySelector('#dayPanel .txr .txr-m').innerHTML;});
 ok(/계좌 미지정/.test(w),'계좌 없는 건은 행에서도 드러난다');
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
