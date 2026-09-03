/* t28 — v1.6  제지방량 · 보조 태그(반반 배분) · 카드결제 분해 */
const {chromium}=require('playwright');
const file=process.argv[2];
const INIT=({st})=>{const store={v:st,at:'2026-08-25T00:00:00.000Z'};window.__store=store;
 const res=d=>Promise.resolve({data:d,error:null});
 function mk(){let m=null,p=null;const q={
  select(){if(m==='update'){store.v=p.data;store.at=p.updated_at;return res([{updated_at:store.at}]);}return q},
  eq(){return q},maybeSingle(){return store.v===null?res(null):res({data:store.v,updated_at:store.at})},
  update(x){m='update';p=x;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return res(null)},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};return q;}
 window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};};
const ST={schemaVersion:7,
 accounts:[{id:'a1',name:'주계좌',group:'현금성',mode:'auto',hist:[{date:'2026-08-01',amount:1000000}]}],
 cards:[{id:'c1',name:'삼성',type:'credit',acct:'a1',closeDay:10,payDay:25}],
 categories:[{id:'k1',name:'식비',type:'expense'},{id:'k2',name:'의료',type:'expense'},
   {id:'k3',name:'카드결제',type:'expense'},{id:'k4',name:'배달',type:'expense',isFood:true}],
 transactions:[
   {id:'e1',type:'expense',scope:'personal',cat:'식비',method:'삼성',amt:120000,date:'2026-08-05',card:true},
   {id:'e2',type:'expense',scope:'personal',cat:'의료',method:'삼성',amt:80000,date:'2026-08-06',card:true}],
 health:{height:163,weights:[
   {date:'2026-08-25',kg:68.8,fatKg:16.2,muscle:49.8,boneKg:2.7,waterKg:35.5,protein:9.5,skMuscle:28,bmr:1500},
   {date:'2026-08-13',kg:68.0,fatKg:15.7,muscle:49.5,boneKg:2.7,waterKg:35.1,protein:9.4,skMuscle:27.8,bmr:1490}],
   labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 timelog:{'2026-08-25':[
   {s:20,e:23,tag:'waste',tag2:'rest',title:'유튜브'},
   {s:30,e:33,tag:'work',title:'강의'}]},
 goals:[],routines:[],checks:{},rewards:[],debts:[],budgets:{},items:[],journal:[],
 meta:{seq:{},foodSeeded:2},ui:{month:'2026-08',cfPeriod:'month'}};
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

console.log('=== ① 내장지방 → 제지방량 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   const t=WTABS.map(x=>x.k);
   const e=DB.health.weights[0];
   const ffm=WTABS.filter(x=>x.k==='ffm')[0], pct=WTABS.filter(x=>x.k==='ffmPct')[0];
   return {noVisceral:t.indexOf('visceral')<0, has:t.indexOf('ffm')>=0&&t.indexOf('ffmPct')>=0,
     val:+ffm.g(e).toFixed(1), pct:+pct.g(e).toFixed(1),
     chk:+(e.muscle+e.boneKg).toFixed(1), tabs:t.length};});
 ok(r.noVisceral,'⚠️ 죽은 내장지방 탭 제거됨 (실측 82건 중 0건이었다)');
 ok(r.has,'제지방량·제지방률 탭 신설');
 ok(r.val===52.6,'제지방량 = 68.8 − 16.2 = 52.6', r.val);
 ok(Math.abs(r.val-r.chk)<=0.2,'⚠️ 근육+골무기질(52.5)과 오차 0.2 이내 — 파생이 맞다', r.val+' vs '+r.chk);
 ok(r.pct===76.5,'제지방률 76.5%', r.pct);
 const ui=await p.evaluate(async()=>{document.querySelector('.m[data-v="weight"]').click();
   await new Promise(r=>setTimeout(r,250));
   const h=document.getElementById('v-weight').innerHTML;
   return {noV:!/내장지방/.test(h), ffm:/제지방량/.test(h), val:/52\.6/.test(h)};});
 ok(ui.noV&&ui.ffm,'화면에서도 교체됨');
 ok(ui.val,'실제 값이 그려진다 (전엔 빈칸)');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== ② 보조 태그 — 24시간 총량이 안 깨진다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   const blk=DB.timelog['2026-08-25'][0];
   const sum=tlSum('2026-08-25');
   const used=tlUsed('2026-08-25');
   let tot=0;for(const k in sum)tot+=sum[k];
   return {css:tlCss(blk), label:tlLabel(blk), sum, used, tot,
     solo:tlCss(DB.timelog['2026-08-25'][1])};});
 ok(/linear-gradient/.test(r.css),'두 태그 = 그라데이션', r.css.slice(0,52)+'…');
 ok(!/gradient/.test(r.solo),'한 태그 = 단색 그대로', r.solo);
 ok(r.label==='낭비+휴식','라벨이 둘 다 보인다', r.label);
 ok(r.sum.waste===2&&r.sum.rest===2,'⚠️ 4슬롯이 낭비 2 + 휴식 2 로 반반', JSON.stringify(r.sum));
 ok(r.tot===r.used,'🔒 집계 합 = 실제 사용 슬롯 — 24h 총량이 안 깨진다', r.tot+' = '+r.used);
 const m=await p.evaluate(async()=>{
   document.querySelector('.m[data-v="daily"]').click(); await new Promise(r=>setTimeout(r,250));
   tlRangeModal('2026-08-25',20,23); await new Promise(r=>setTimeout(r,60));
   const seg2=document.getElementById('tl_seg2');
   const pre=document.getElementById('tl_mix').textContent;
   return {has:!!seg2, n:seg2?seg2.querySelectorAll('button').length:0,
     on:seg2?seg2.querySelector('button.on').textContent.trim():'', pre};});
 ok(m.has,'모달에 보조 태그 줄');
 /* v2.5 — '준비' 태그 추가 → 없음 + 15개 = 16 */
 ok(m.n===16,'없음 + 15개 태그', m.n);
 ok(m.on==='휴식','기존 값 선택 상태', m.on);
 ok(/낭비\+휴식/.test(m.pre)&&/1h/.test(m.pre),'섞인 결과 미리보기', m.pre.trim());
 const dup=await p.evaluate(()=>{window.__dlg=[];tlSetTag2(null,modal._tltag);
   return {dlg:window.__dlg[0]||'',t2:modal._tltag2};});
 ok(/같은 것은 보조로/.test(dup.dlg),'주 태그와 같은 것은 못 고른다');
 const sv=await p.evaluate(()=>{tlSetTag2(null,'');tlSave('2026-08-25');
   const blk=DB.timelog['2026-08-25'].filter(b=>b.s===20)[0];
   return {tag2:blk.tag2, sum:tlSum('2026-08-25')};});
 ok(sv.tag2===undefined,'보조를 없음으로 바꾸면 필드가 안 남는다', String(sv.tag2));
 ok(sv.sum.waste===4&&sv.sum.rest===undefined,'집계가 단독으로 복귀', JSON.stringify(sv.sum));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== ③ 카드결제는 지출 루트가 아니다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   settleModal('c1|2026-08');
   doSettle();
   const st=DB.transactions.filter(x=>x.type==='settle')[0];
   const g=cfBuildSankey(cfTxns('month'));
   const ks=Object.keys(g.K).sort();
   return {mix:st.catMix, amt:st.amt, keys:ks,
     food:Math.round(g.K['ex:식비']||0), med:Math.round(g.K['ex:의료']||0),
     noCard:ks.indexOf('ex:카드결제')<0};});
 ok(JSON.stringify(r.mix)==='{"식비":120000,"의료":80000}','선결제 시 계정과목 구성 박제', JSON.stringify(r.mix));
 ok(r.noCard,'⚠️ Sankey 종착에 "카드결제"가 없다');
 ok(r.keys.join(',')==='ex:식비,ex:의료','실제 사용처로 쪼개진다', r.keys.join(' · '));
 ok(r.food===120000&&r.med===80000,'금액이 그대로 배분', r.food+' / '+r.med);
 const old=await p.evaluate(()=>{
   DB.transactions.push({id:'sOld',type:'settle',acct:'a1',amt:50000,date:'2026-08-20',
     method:'삼성 결제',cat:'카드결제'});   /* catMix 없는 옛 데이터 */
   const g=cfBuildSankey(cfTxns('month'));
   return Object.keys(g.K).indexOf('ex:카드결제 내역미상')>=0;});
 ok(old,'역산도 catMix 도 불가한 건만 "내역미상" 으로 정직하게 표시');
 const sh=await p.evaluate(()=>[cfShort(1500),cfShort(33254),cfShort(365934),cfShort(123456789)]);
 ok(sh[1]==='33,000'&&sh[2]==='366,000','만 → 천 단위', sh.join(' / '));
 /* ⚠️ v1.9: 카드결제는 더 이상 '오늘'이 아니라 **실제 결제일**에 들어간다(v1.8 결함 수정).
    🔒 그러니 todayStr() 로 찾으면 안 된다 — 거래가 실제로 박힌 날짜를 읽어서 연다. */
 const row=await p.evaluate(()=>{
   const st=DB.transactions.filter(x=>x.type==='settle'&&x.catMix)[0];
   renderCal();renderDay(st.date);
   const el=[...document.querySelectorAll('#dayPanel .txr.st')][0];
   return el?el.textContent.replace(/\s+/g,' ').trim():'(없음)';});
 ok(/식비 120,000/.test(row)&&/의료 80,000/.test(row),'거래 행에 세부 적요', row.slice(0,72));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== ④ 현금흐름 ↔ 가계부 기준 일치 (로한 지적) ===');
{/* 실측 8월 배달 구조 재현: 체크 84,200 + 신용 선결제 52,700 + 신용 미결제 24,900 = 161,800 */
 const st=JSON.parse(JSON.stringify(ST));
 st.cards.push({id:'c9',name:'K패스',type:'check',acct:'a1'});
 st.transactions=[
  {id:'d1',type:'expense',scope:'personal',cat:'배달',method:'K패스',amt:84200,date:'2026-08-15'},
  {id:'d2',type:'expense',scope:'personal',cat:'배달',method:'삼성',amt:52700,date:'2026-08-05',card:false},
  {id:'d3',type:'expense',scope:'personal',cat:'배달',method:'삼성',amt:24900,date:'2026-08-18',card:true},
  {id:'s9',type:'settle',acct:'a1',amt:52700,date:'2026-08-21',method:'삼성 결제',cat:'카드결제',cycle:'2026-08'}];
 const {c,p,errs}=await boot(b,st);
 const r=await p.evaluate(()=>{
   DB.ui.month='2026-08';DB.ui.cfPeriod='month';
   const ledger=monthPL('2026-08').exp;                    /* 가계부 발생 */
   setCfMode('cash');
   const gC=cfBuildSankey(cfTxns('month'));
   let outC=0;cfTxns('month').forEach(t=>{if(cfIsOut(t))outC+=t.amt;});
   setCfMode('accrual');
   const gA=cfBuildSankey(cfTxns('month'));
   let outA=0;cfTxns('month').forEach(t=>{if(cfIsOut(t))outA+=t.amt;});
   return {ledger, outC, outA,
     bC:Math.round(gC.K['ex:배달']||0), bA:Math.round(gA.K['ex:배달']||0),
     mix:settleMix(DB.transactions.filter(x=>x.id==='s9')[0])};});
 ok(r.ledger===161800,'가계부 8월 배달(발생) 161,800', r.ledger);
 ok(r.bA===161800,'⚠️ 발생 모드 = 가계부와 정확히 같다', r.bA);
 ok(r.outA===161800,'발생 유출 합도 일치', r.outA);
 ok(r.bC===136900,'현금 모드 = 84,200 + 52,700', r.bC);
 ok(r.ledger-r.bC===24900,'🔒 차이 24,900 = 아직 안 나간 카드값', r.ledger-r.bC);
 ok(JSON.stringify(r.mix)==='{"배달":52700}','⚠️ catMix 없어도 역산된다 (v1.61)', JSON.stringify(r.mix));
 const ui=await p.evaluate(()=>{setCfMode('cash');renderCashflow();
   const h=document.getElementById('v-cashflow').innerHTML;
   setCfMode('accrual');renderCashflow();
   const h2=document.getElementById('v-cashflow').innerHTML;
   return {bar:/plbar/.test(h), diff:/아직 안 나간 카드값/.test(h),
     onC:/plm on[^>]*>현금/.test(h), onA:/plm on[^>]*>발생/.test(h2),
     noOld:!/카드결제\(구\)/.test(h)&&!/카드결제\(구\)/.test(h2)};});
 ok(ui.bar&&ui.onC&&ui.onA,'현금/발생 토글이 동작한다');
 ok(ui.diff,'차이의 정체를 한 줄로 알려준다');
 ok(ui.noOld,'⚠️ "카드결제(구)" 라벨이 사라졌다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n'+(F?('=== 실패 '+F+' / '+N+' ==='):('=== 전부 통과 ('+N+'건) ===')));
await b.close();process.exit(F?1:0);})();
