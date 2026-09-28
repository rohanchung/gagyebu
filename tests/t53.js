/* v4.20 🔮 사주 — 예측 → 현실 → 검증 (세로 시간축)
   정본: saju-design.md · DB: db/20260928_saju_v2.sql
   🔒 이 화면이 지켜야 하는 것
      ① 세로다. 좌우 2열이 아니다 — EMR 과 정반대 구조다(설계 §1)
      ② 기간이 안 끝났으면 3단(검증)을 **열지 않는다** — 빈 칸은 "수연이 일을 안 했다"로 읽힌다
      ③ 실제 기록은 **파생**이다. saju_* 에 복사하지 않는다(설계 §8)
      ④ 「개입」을 드러낸다 — 예측을 읽고 막으면 「불일치」가 되는 문제(설계 §4)
      ⑤ timing(prior/mid/post)을 그대로 보여준다. post 는 평가 대상이 아니라고 말한다
   🔒 v4.22 (db/20260928b_saju_known.sql · 설계 §15) — 검수자 수연의 지적
      ⑥ 「이미 알고 있던 일정」은 예측문과 **다른 칸**이고, **예측문 위**에 온다.
         아래 두면 예측문을 먼저 읽고 「맞췄다」로 각인된 뒤다.
      ⑦ known 과 완전히 겹치는 적중은 **색을 주지 않는다** — 달력을 읽은 것이다.
         숨기면 거짓말이 아니라 **칠하면 거짓말**이다.
      ⑧ legacy 는 「자기신고」 배지를 달고 「잠김」이라고 하지 않는다 — 서버가 시각을 못 봤다 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

const FC=[
 {id:'f-oct',period_type:'month',target_start:'2026-10-01',target_end:'2026-10-31',version:1,
  status:'locked',timing:'prior',locked_at:'2026-09-28T02:10:00Z',created_at:'2026-09-28T02:10:00Z',
  content:'丁酉월 — 정관이 들어오는 달.',
  structured:{'재물':'10월 중순 자금 압박 가능','공부':'마감·제출이 맞는 달','관계':'경조사 지출 주의'},
  basis:'거래 9월 163건 · 학습 과제 43건',
  /* 🔴 실제 데이터에서 확인된 문제 — 9/30 예측에 ★풍무점 2차 설명회가 들어 있었다.
     그 일이 열리면 적중으로 세어진다. 그건 명리가 아니라 달력이다. */
  known:'9/30 풍무점 2차 설명회(1차 9/19 의 후속, 확정) · 10/3 개천절 연휴',
  conflict:'명리는 확장운. 생활방은 긴축 중.'},
 /* 🔒 legacy — 서버가 작성시각을 못 봤다. 자기신고 declared_at 으로 timing 을 쟀다 */
 {id:'f-lgc',period_type:'month',target_start:'2026-07-01',target_end:'2026-07-31',version:1,
  status:'locked',timing:'prior',timing_trust:'self',legacy:true,declared_at:'2026-06-20',
  locked_at:'2026-09-28T03:00:00Z',created_at:'2026-09-28T03:00:00Z',
  content:'7월 — 겁재의 달. 루틴이 무너질 수 있다.',known:'없음(legacy — 당시 기록이 남아 있지 않다)',
  structured:{'재물':'지출 관리가 흔들린다'}},
 {id:'f-aug',period_type:'month',target_start:'2026-08-01',target_end:'2026-08-31',version:1,
  status:'locked',timing:'prior',locked_at:'2026-07-28T00:00:00Z',created_at:'2026-07-28T00:00:00Z',
  content:'乙未월 — 겁재가 강한 달.',structured:{'재물':'지출이 새는 달'}},
 /* 🔴 기간이 끝난 뒤에 쓴 글 — 예측이 아니다 */
 {id:'f-jun',period_type:'month',target_start:'2026-06-01',target_end:'2026-06-30',version:1,
  status:'locked',timing:'post',locked_at:'2026-09-01T00:00:00Z',created_at:'2026-09-01T00:00:00Z',
  content:'6월 사후 정리',structured:null},
 /* 같은 기간 v2 — 옛 버전이 남는다 */
 {id:'f-aug2',period_type:'month',target_start:'2026-08-01',target_end:'2026-08-31',version:2,
  status:'locked',timing:'mid',locked_at:'2026-08-05T00:00:00Z',created_at:'2026-08-05T00:00:00Z',
  content:'8월 v2 — 보강',known:'8월엔 확정된 일정이 없었다',
  structured:{'재물':'지출이 새는 달(보강)'}}];
const EV=[
 {id:'e1',forecast_id:'f-aug2',area:'재물',verdict:'hit',evaluated_at:'2026-09-01T00:00:00Z',
  evidence:'8월 거래 155건 · 생활용품 577,778',reasoning:'구체적 수치와 대응한다.',hindsight_risk:'mid',
  /* 🔒 이미 알던 일정과 완전히 겹친다 → 적중이라고 칠하면 거짓말이다 */
  known_overlap:'full'},
 {id:'e2',forecast_id:'f-aug2',area:'공부',verdict:'partial',evaluated_at:'2026-09-01T00:00:00Z',
  evidence:'8월 학습 기록 없음',reasoning:'대조할 기록이 적다.',hindsight_risk:'high',
  known_overlap:'none'}];
const NOTES=[
 {id:'n1',note_date:'2026-10-02',kind:'intervention',intervention:'acted',forecast_id:'f-oct',
  body:'예측 보고 카드값 선결제 47만'}];

const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-09',sjSel:'2026-10'},
 accounts:[{id:'a1',name:'주계좌',type:'bank',group:'현금'}],cards:[{id:'cd1',name:'현금',type:'check'}],
 categories:[{id:'c1',name:'식비',type:'expense'}],
 transactions:[{id:'t3',date:'2026-08-10',type:'expense',cat:'식비',amt:3263759,method:'현금',acct:'a1'}],
 budgets:{},debts:[],fixed:[],events:[],posts:[],items:[],logs:[],journal:[],
 health:{weights:[{date:'2026-08-03',kg:84.2},{date:'2026-08-20',kg:83.1}],
   labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words:[],sents:[],units:[{id:'u1',day:'2026-08-02',title:'과제',status:'done',backlog:false}],
   tests:[],errors:[],drills:[],pomos:[],books:[],phases:[],week:{},month:{},logs:{}}};

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1500,height:1100}});
 await c.addInitScript(({st,fc,ev,notes})=>{
   const store={v:JSON.parse(JSON.stringify(st))};window.__ins=[];
   const tbl={saju_forecasts:fc,saju_evaluations:ev,saju_notes:notes};
   let _m=null,_p=null;
   function mk(name){
     const q={
       select(){ if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}
         if(tbl[name])return Object.assign(Promise.resolve({data:tbl[name],error:null}),q); return q;},
       order(){ if(tbl[name])return Object.assign(Promise.resolve({data:tbl[name],error:null}),q); return q;},
       eq(){return q}, limit(){return q}, in(){return q}, delete(){return q},
       maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
       update(p){_m='update';_p=p;return q},
       upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},
       insert(row){window.__ins.push({t:name,row:row});return Promise.resolve({data:[],error:null})},
       then(a){return Promise.resolve({data:(tbl[name]||[]),error:null}).then(a)}};
     return q;}
   window.supabase={createClient:()=>({from:(n)=>mk(n),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
 },{st:STATE,fc:FC,ev:EV,notes:NOTES});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>d.accept());
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.saju);
 await p.evaluate(()=>{document.getElementById('login').style.display='none';document.getElementById('app').classList.add('on');gotoTab('saju');});
 await p.waitForTimeout(900);
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 const txt=()=>p.$eval('#v-saju',e=>e.textContent);
 const q=(sel)=>p.$$eval('#v-saju '+sel,es=>es.length);
 const pick=async(v)=>{await p.evaluate(x=>sjPick(x),v);await p.waitForTimeout(350);};

 /* ── A) 세로 시간축 — 🔒 EMR 과 정반대다 ── */
 ok('A1 명식·대운은 그대로 있다',/총운/.test(await txt())&&/대운 흐름/.test(await txt()));
 ok('A2 예측과 검증 칸이 있다',/예측과 검증/.test(await txt()));
 /* 🔒 세로여야 한다 — 단계들이 위에서 아래로 쌓인다 */
 const vert=await p.evaluate(()=>{
   const st=[...document.querySelectorAll('#v-saju .sjstep')];
   if(st.length<2)return null;
   const a=st[0].getBoundingClientRect(), b=st[1].getBoundingClientRect();
   return {below:b.top>=a.bottom-2, sameLeft:Math.abs(b.left-a.left)<2};});
 ok('A3 단계가 세로로 쌓인다 (좌우 2열이 아니다)',vert&&vert.below&&vert.sameLeft,JSON.stringify(vert));

 /* ── B) 10월: 예측 있음 · 아직 안 끝남 ── */
 let t=await txt();
 ok('B1 로버트 사전예측이 보인다',/로버트 · 사전예측/.test(t));
 ok('B2 timing=prior 를 「사전」으로 표시',/사전/.test(t)&&(await q('.sjtm.prior'))===1);
 ok('B3 잠금·버전이 보인다',/v1/.test(t)&&/잠김/.test(t));
 ok('B4 영역별 예측이 격자로',(await q('.sjarea'))===3,String(await q('.sjarea')));
 /* 🔒 평가 대상이 아닌 영역은 「관찰」이라고 적는다(설계 §6) */
 ok('B5 관계는 「관찰」로 표시 — 대조할 기록이 없다',/관계 관찰/.test(t.replace(/\s+/g,' ')),'');
 /* ⚖ 담당 방과 어긋나는 점 — 숨기지 않는다 */
 ok('B6 담당 방과 어긋나는 점을 드러낸다',(await q('.sjconf'))===1&&/최종 판단은 로한이 한다/.test(t));
 /* ⚠️ 기간이 안 끝났으면 3단을 열지 않는다 */
 ok('B7 기간 중엔 검증 단을 열지 않는다',(await q('.sjstep'))===2&&!/사후평가/.test(t),String(await q('.sjstep')));
 /* 🙋 개입 */
 ok('B8 개입 기록이 보인다',/선결제 47만/.test(t));
 ok('B9 개입 기록 버튼이 있다',/이 예측을 보고 한 행동/.test(t));

 /* ── C) 8월: 검증 완료 ── */
 await pick('2026-08'); t=await txt();
 ok('C1 3단이 전부 열린다',(await q('.sjstep'))===3,String(await q('.sjstep')));
 ok('C2 수연 사후평가가 보인다',/수연 · 사후평가/.test(t));
 ok('C3 판정 칩 2개',(await q('.sjv'))===2,String(await q('.sjv')));
 ok('C4 적중·부분 적중이 적힌다',/재물 적중/.test(t.replace(/\s+/g,' '))&&/공부 부분 적중/.test(t.replace(/\s+/g,' ')));
 ok('C5 근거가 된 실제 기록을 적는다',/근거가 된 실제 기록/.test(t));
 ok('C6 사후 끼워맞춤 여지를 적는다',/끼워맞춤 여지/.test(t)&&/높음/.test(t));
 /* 🔒 실제 기록은 파생 — DB.transactions 등에서 온다 */
 ok('C7 실제 기록이 파생으로 채워진다',(await q('.sjr'))>=2,String(await q('.sjr')));
 ok('C8 해석하지 않는다고 적는다',/해석하지 않는다/.test(t));
 /* 🔒 최신 버전이 대표, 옛 버전은 이력으로 남는다 */
 ok('C9 최신 버전(v2)이 대표로 뜬다',/v2/.test(t));
 ok('C10 이전 버전이 남아 있다고 알린다',/이전 버전 1개/.test(t.replace(/\s+/g,' ')),'');

 /* ── D) 6월: timing=post — 평가 대상이 아니다 ── */
 await pick('2026-06'); t=await txt();
 ok('D1 post 를 「사후」로 표시',(await q('.sjtm.post'))===1);
 ok('D2 평가 대상이 아니라고 말한다',/평가 대상이 아니다/.test(t));
 ok('D3 판정 칩이 없다',(await q('.sjv'))===0);

 /* ── E) 예측 없는 지난 기간 ── */
 await pick('2026-05'); t=await txt();
 ok('E1 예측이 없다고 말한다',/사전예측이 없다/.test(t));
 /* 🔒 지금 써도 예측이 아니라는 걸 알려준다 — 소급 작성을 부추기지 않는다 */
 ok('E2 지금 써도 예측이 아니라고 알린다',/지금 써도 예측이 아니다/.test(t));

 /* ── F) 미래 기간 ── */
 await pick('2026-12'); t=await txt();
 ok('F1 예측이 아직 없다고 말한다',/아직 예측이 없다/.test(t));
 ok('F2 saju_publish 로 쓴다고 알려준다',/saju_publish/.test(t));

 /* ── G) 기간 탐색 ── */
 ok('G1 월 12칸이 있다',(await q('.sjp'))===12,String(await q('.sjp')));
 await p.evaluate(()=>sjSetUnit('year'));await p.waitForTimeout(350);
 ok('G2 연운으로 바꾸면 연도 칸',(await q('.sjp'))===6,String(await q('.sjp')));
 await p.evaluate(()=>sjSetUnit('month'));await p.waitForTimeout(350);

 /* ── H) 개입 기록 저장 ── */
 await pick('2026-10');
 await p.evaluate(()=>sjIntModal('f-oct'));await p.waitForTimeout(300);
 await p.evaluate(()=>{document.getElementById('sjIntBody').value='테스트 개입';
   document.getElementById('sjIntDate').value='2026-10-05';sjIntSave('f-oct');});
 await p.waitForTimeout(400);
 const ins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='saju_notes'));
 ok('H1 saju_notes 에 저장한다',ins.length===1&&ins[0].row.kind==='intervention',JSON.stringify(ins[0]||{}));
 ok('H2 기본값은 「읽고 움직였다」',ins.length===1&&ins[0].row.intervention==='acted',JSON.stringify(ins[0]&&ins[0].row));
 ok('H3 예측과 묶인다',ins.length===1&&ins[0].row.forecast_id==='f-oct');

 /* ── I) 🗓 이미 알고 있던 일정 — 🔒 예측과 가른다 (v4.22 · 수연의 지적) ── */
 await pick('2026-10'); t=await txt();
 ok('I1 known 칸이 있다',(await q('.sjknown'))===1,String(await q('.sjknown')));
 ok('I2 풍무 설명회가 known 칸 안에 있다',
    await p.evaluate(()=>/풍무/.test((document.querySelector('#v-saju .sjknown')||{}).textContent||'')));
 /* 🔒 예측문 **위**여야 한다. 아래 두면 이미 「맞췄다」로 각인된 뒤다 */
 const kpos=await p.evaluate(()=>{
   const k=document.querySelector('#v-saju .sjknown'), x=document.querySelector('#v-saju .sjtext');
   if(!k||!x)return null;
   return {above:k.getBoundingClientRect().bottom<=x.getBoundingClientRect().top+2};});
 ok('I3 known 이 예측문 위에 온다',kpos&&kpos.above,JSON.stringify(kpos));
 ok('I4 적중으로 세지 않는다고 못 박는다',/적중으로 세지 않는다/.test(t));
 /* 🔒 known 은 예측문 안에 섞이지 않는다 — 같은 칸이면 가른 의미가 없다 */
 ok('I5 예측 본문엔 known 이 섞이지 않는다',
    await p.evaluate(()=>!/풍무/.test((document.querySelector('#v-saju .sjtext')||{}).textContent||'')));

 /* ── J) 달력 읽기는 적중으로 칠하지 않는다 ── */
 await pick('2026-08'); t=await txt();
 ok('J1 겹치는 적중엔 적중 색을 주지 않는다',(await q('.sjv.cal'))===1,String(await q('.sjv.cal')));
 ok('J2 그 칩엔 초록(적중) 색이 없다',(await q('.sjv.pos'))===0,String(await q('.sjv.pos')));
 ok('J3 칩에 「달력」이라고 적는다',/달력/.test(t));
 ok('J4 본문에도 겹침을 적는다',/이미 알던 일정과 완전히 겹친다/.test(t.replace(/s+/g,' ')));
 /* 겹치지 않는 판정은 그대로 색을 준다 — 전부 회색이 되면 그것도 거짓말이다 */
 ok('J5 겹치지 않는 판정은 색을 유지한다',(await q('.sjv.warn'))===1,String(await q('.sjv.warn')));

 /* ── K) legacy 낙인 — 서버가 시각을 못 봤다 ── */
 await pick('2026-07'); t=await txt();
 ok('K1 자기신고 배지가 뜬다',(await q('.sjlgc'))===1,String(await q('.sjlgc')));
 ok('K2 신고한 작성일을 적는다',/2026-06-20/.test(t));
 /* 🔒 「잠김」이라고 하면 서버가 본 것처럼 읽힌다 */
 ok('K3 「잠김」이라고 하지 않는다',!/잠김/.test(t),t.slice(0,0));
 ok('K4 그래도 예측은 보인다',/겁재의 달/.test(t));

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
