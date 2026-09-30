/* v4.23 🏛 아고라 — 월간 합의체
   정본: agora-design.md · DB: db/20260930_agora.sql
   🔒 이 화면이 지켜야 하는 것
      ① 미제출을 숨기지 않는다 — 빈 격자가 아고라의 상태다
      ② 접어도 총평과 「다른 영역에 하는 말」 건수는 보인다(v4.19 원칙)
      ③ 「다른 영역」이 비면 「담당 영역만 봤다」로 드러낸다 — 그게 아고라의 값어치다
      ④ 미제출(·)과 「해당 없음」(⊘)을 가른다 — 빈 칸은 「방이 일을 안 했다」로 읽힌다
      ⑤ 들여쓰기는 1단까지 — 트리로 쌓으면 일목요연이 깨진다(FM 원칙)
      ⑥ 🙋 로한은 피고가 아니다 — 해명 말고 「방 조언 평가」도 여기서 쓴다(설계 §5)
      ⑦ 사실 묶음은 파생 — DB 함수가 계산한다. 0 인 칸을 빨갛게 드러낸다 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

const MEM=[
 {slug:'robert-life' ,name:'로버트(생활)',provider:'claude',domain:'재정',icon:'🏠',active:true,sort:10},
 {slug:'robert-study',name:'로버트(학습)',provider:'claude',domain:'JLPT',icon:'📖',active:true,sort:20},
 {slug:'robert-saju' ,name:'로버트(사주)',provider:'claude',domain:'명리',icon:'🕯️',active:true,sort:30},
 {slug:'suyeon'      ,name:'수연'        ,provider:'openai',domain:'검수',icon:'🔎',active:true,sort:40},
 {slug:'maker'       ,name:'제작방'      ,provider:'claude',domain:'앱'  ,icon:'🛠',active:true,sort:50},
 {slug:'cardio'      ,name:'순환기'      ,provider:'claude',domain:'심장',icon:'❤️',active:true,sort:60},
 {slug:'rehab'       ,name:'재활의학과'  ,provider:'claude',domain:'어깨',icon:'💪',active:true,sort:70},
 /* 🔒 빠진 방은 지우지 않는다 — 지우면 과거 달의 이름이 깨진다 */
 {slug:'psychic'     ,name:'점술방'      ,provider:'claude',domain:'심리',icon:'🔯',active:false,sort:80}];

const POSTS=[
 /* 월간 평가 — 「다른 영역」이 있는 것 / 없는 것 / 해당 없음 */
 {id:'p1',ym:'2026-09',member:'robert-life',kind:'review',status:'ok',parent_id:null,
  summary:'지출이 예산을 넘었다. 고정비가 데이터에 없다.',own:'예산 초과 146만',
  others:'학습이 재정을 안 본다 — 교재비가 예산 밖이다\n사주는 재물 예측에 실제 숫자를 안 쓴다',
  ask:'로그를 한 번이라도 써라',submitted_at:'2026-09-30T10:00:00Z'},
 {id:'p2',ym:'2026-09',member:'robert-study',kind:'review',status:'ok',parent_id:null,
  summary:'과제 43건 중 25건 완료. 드릴은 늘었다.',own:'완료율 58%',
  others:null,ask:null,submitted_at:'2026-09-30T11:00:00Z'},
 {id:'p3',ym:'2026-09',member:'cardio',kind:'review',status:'na',parent_id:null,
  summary:null,own:null,others:null,ask:null,
  content:'9월엔 진료가 없었다',submitted_at:'2026-09-30T12:00:00Z'},
 /* 토론 — 대댓글 → 로한 해명 → 재대댓글 */
 {id:'p4',ym:'2026-09',member:'robert-study',kind:'comment',status:'ok',parent_id:'p1',
  content:'교재비는 예산 항목에 없었다. 생활방이 만들어 주지 않았다.',submitted_at:'2026-09-30T13:00:00Z'},
 {id:'p5',ym:'2026-09',member:'rohan',kind:'clarify',status:'ok',parent_id:'p4',
  content:'교재비는 9월에 현금으로 냈다 — 거래에 안 잡혔다.',submitted_at:'2026-09-30T14:00:00Z'},
 {id:'p6',ym:'2026-09',member:'robert-life',kind:'comment',status:'ok',parent_id:'p5',
  content:'현금이면 10월엔 계좌로 내라. 안 잡히면 예산이 거짓말을 한다.',submitted_at:'2026-09-30T15:00:00Z'},
 /* ⭐ 로한의 방 평가 — 되먹임 */
 {id:'p7',ym:'2026-09',member:'rohan',kind:'rate',status:'ok',parent_id:null,target:'robert-study',
  content:'교재비 지적은 실제로 예산 수정에 썼다.',submitted_at:'2026-09-30T16:00:00Z'},
 /* 지난 달 — 월을 넘겨도 섞이지 않는지 */
 {id:'p8',ym:'2026-08',member:'robert-life',kind:'review',status:'ok',parent_id:null,
  summary:'8월 총평이다.',own:'8월',others:null,ask:null,submitted_at:'2026-08-31T10:00:00Z'}];

const FACTS={ym:'2026-09','거래건수':183,'지출':5432100,'학습과제':42,'과제완료':25,
 '드릴':18,'시험':3,'체크한날':25,'체중기록':5,'EMR턴':4,'일지':1,'로그':0,
 '주의':'「기록 없음」은 「하지 않음」이 아니다.'};

const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-09',agYm:'2026-09'},
 accounts:[{id:'a1',name:'주계좌',type:'bank',group:'현금'}],cards:[{id:'cd1',name:'현금',type:'check'}],
 categories:[{id:'c1',name:'식비',type:'expense'}],transactions:[],
 budgets:{},debts:[],fixed:[],events:[],posts:[],items:[],logs:[],journal:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words:[],sents:[],units:[],tests:[],errors:[],drills:[],pomos:[],books:[],
   phases:[],week:{},month:{},logs:{}}};

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1500,height:1100}});
 await c.addInitScript(({st,mem,posts,facts})=>{
   const store={v:JSON.parse(JSON.stringify(st))};window.__ins=[];window.__upd=[];window.__rpc=[];
   const tbl={agora_members:mem,agora_posts:posts};
   let _m=null,_p=null;
   function mk(name){
     const q={
       select(){ if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}
         if(tbl[name])return Object.assign(Promise.resolve({data:tbl[name],error:null}),q); return q;},
       order(){ if(tbl[name])return Object.assign(Promise.resolve({data:tbl[name],error:null}),q); return q;},
       eq(k,v){ if(_m==='aupd'){_m=null;window.__upd.push({t:name,patch:_p,id:v});return Promise.resolve({data:[],error:null});} return q;},
       limit(){return q}, in(){return q}, delete(){return q},
       maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
       update(pp){ if(name==='agora_posts'){_m='aupd';_p=pp;return q;} _m='update';_p=pp;return q;},
       upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},
       insert(row){window.__ins.push({t:name,row:row});return Promise.resolve({data:[],error:null})},
       then(a){return Promise.resolve({data:(tbl[name]||[]),error:null}).then(a)}};
     return q;}
   window.supabase={createClient:()=>({from:(n)=>mk(n),
     rpc:(fn,args)=>{window.__rpc.push({fn,args});
       return Promise.resolve({data:(fn==='agora_facts'&&args.p_ym==='2026-09')?facts:null,error:null});},
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),
       onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
 },{st:STATE,mem:MEM,posts:POSTS,facts:FACTS});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>d.accept());
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.saju);
 await p.evaluate(()=>{document.getElementById('login').style.display='none';
   document.getElementById('app').classList.add('on');gotoTab('agora');});
 await p.waitForTimeout(900);
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 const txt=()=>p.$eval('#v-agora',e=>e.textContent);
 const q=(sel)=>p.$$eval('#v-agora '+sel,es=>es.length);
 const pick=async(v)=>{await p.evaluate(x=>agPick(x),v);await p.waitForTimeout(400);};

 /* ── A) 탭이 성찰에 붙었다 ── */
 ok('A1 사이드 메뉴에 아고라가 있다',
    await p.$eval('.side',e=>/아고라/.test(e.textContent)));
 /* 🔒 성찰 묶음 안이어야 한다 — 일지 바로 뒤 */
 ok('A2 일지 바로 뒤에 온다',
    await p.evaluate(()=>{const ms=[...document.querySelectorAll('.side .m')].map(x=>x.dataset.v);
      return ms.indexOf('agora')===ms.indexOf('journal')+1;}));
 ok('A3 VIEW_RENDER 에 등록됐다',await p.evaluate(()=>typeof VIEW_RENDER.agora==='function'));
 let t=await txt();
 ok('A4 목적을 한 줄로 말한다',/같은 한 달을, 일곱 개의 눈으로/.test(t));

 /* ── B) 🔒 ① 미제출을 숨기지 않는다 ── */
 ok('B1 활동 중인 방 7개가 모두 뜬다',(await q('.agro'))===7,String(await q('.agro')));
 /* 🔒 active=false 인 방은 안 뜬다 — 그래도 데이터에서 지우지 않았다 */
 ok('B2 활동하지 않는 방은 명단에 없다',!/점술방/.test(t));
 ok('B3 제출한 방은 ✓',(await q('.agro.ok'))===2,String(await q('.agro.ok')));
 /* 🔒 ④ 해당없음과 미제출을 가른다 */
 ok('B4 해당없음은 ⊘ 로 따로',(await q('.agro.na'))===1,String(await q('.agro.na')));
 ok('B5 미제출은 4칸',(await q('.agro.no'))===4,String(await q('.agro.no')));
 ok('B6 집계를 숫자로 적는다',/제출 2/.test(t)&&/해당없음 1/.test(t)&&/미제출 4/.test(t));
 ok('B7 빈 칸을 숨기지 않는다고 말한다',/숨기지 않는다/.test(t));

 /* ── C) 📊 사실 묶음 — 🔒 ⑦ 파생이다 ── */
 /* 🔒 앱이 따로 세지 않는다 — DB 함수를 부른다(같은 질문에 답하는 함수는 하나) */
 const rpc=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='agora_facts'));
 ok('C1 agora_facts 를 DB 에서 가져온다',rpc.length>=1&&rpc[0].args.p_ym==='2026-09',JSON.stringify(rpc[0]||{}));
 ok('C2 숫자 칸 9개',(await q('.agf'))===9,String(await q('.agf')));
 /* 🔒 0 을 드러낸다 — 로그 0 건이 첫 달 지적거리다 */
 ok('C3 0 인 칸을 빨갛게 드러낸다',(await q('.agf.zero'))===1,String(await q('.agf.zero')));
 ok('C4 파생이라고 못 박는다',/파생이다/.test(t)&&/복사하지 않는다/.test(t));
 ok('C5 「기록 없음」은 「하지 않음」이 아니라고 적는다',/하지 않음/.test(t));
 ok('C6 과제는 완료/전체로 보여준다',/25\/42/.test(t));

 /* ── D) 월간 평가 격자 ── */
 ok('D1 평가 카드 3개(해당없음 포함)',(await q('.agrev'))===3,String(await q('.agrev')));
 ok('D2 해당없음 카드는 따로 표시',(await q('.agrev.na'))===1,String(await q('.agrev.na')));
 /* 🔒 ② 접어도 총평이 보인다 */
 ok('D3 접힌 상태가 기본',(await q('.agrev[open]'))===0,String(await q('.agrev[open]')));
 ok('D4 접어도 총평이 보인다',
    await p.evaluate(()=>{const s=document.querySelector('#v-agora .agrev summary');
      return /지출이 예산을 넘었다/.test(s.textContent);}));
 /* 🔒 ② 접어도 「다른 영역」 건수가 보인다 — 줄 수로 센다 */
 ok('D5 접어도 「다른 영역」 건수가 보인다',/다른 영역에 하는 말 2건/.test(t));
 /* 🔒 ③ 비면 드러낸다 */
 ok('D6 「다른 영역」이 비면 「담당 영역만 봤다」',(await q('.agxn.none'))===1&&/담당 영역만 봤다/.test(t));
 /* 펼치면 4칸이 나온다 */
 await p.evaluate(()=>{document.querySelectorAll('#v-agora .agrev').forEach(d=>d.open=true);});
 await p.waitForTimeout(200); t=await txt();
 ok('D7 펼치면 내 담당 영역이 나온다',/내 담당 영역/.test(t));
 ok('D8 「다른 영역에 하는 말」은 눈에 띄게 둔다',(await q('.agsec.x'))===1,String(await q('.agsec.x')));
 ok('D9 로한에게 요구하는 것이 나온다',/로한에게 요구하는 것/.test(t)&&/로그를 한 번이라도/.test(t));
 ok('D10 해당없음은 미제출과 다르다고 말한다',/미제출과 다르다/.test(t));

 /* ── E) 토론 — 🔒 ⑤ 들여쓰기 1단까지 ── */
 ok('E1 토론 글 4개(대댓글2·해명1·방평가1)',(await q('.agmsg'))===4,String(await q('.agmsg')));
 ok('E2 로한 해명은 따로 칠한다',(await q('.agmsg.rohan'))===1,String(await q('.agmsg.rohan')));
 ok('E3 방 평가도 따로 칠한다',(await q('.agmsg.rate'))===1,String(await q('.agmsg.rate')));
 ok('E4 누구에게 하는 말인지 적는다',/→/.test(t)&&/로버트\(생활\)/.test(t));
 /* 🔒 트리로 쌓이지 않는다 — 들여쓰기는 한 단뿐 */
 const depth=await p.evaluate(()=>{
   const ms=[...document.querySelectorAll('#v-agora .agmsg')];
   const lefts=[...new Set(ms.map(m=>Math.round(m.getBoundingClientRect().left)))];
   return {steps:lefts.length,lefts:lefts};});
 ok('E5 들여쓰기 단계가 2 이하다 (트리로 안 쌓인다)',depth.steps<=2,JSON.stringify(depth));
 ok('E6 시간순이다',
    await p.evaluate(()=>{const ms=[...document.querySelectorAll('#v-agora .agmsg .agmb')].map(x=>x.textContent);
      return ms[0].indexOf('교재비는 예산 항목')===0&&/현금으로 냈다/.test(ms[1]);}));

 /* ── F) 🙋 ⑥ 로한은 피고가 아니다 ── */
 ok('F1 피고가 아니라고 말한다',/피고가 아니다/.test(t)&&/해명할 의무가 없/.test(t));
 ok('F2 방을 평가할 권한을 알린다',/방을 평가할 권한/.test(t));
 ok('F3 방이 그걸 읽는다고 알린다',/다음 달 평가를 쓰기 전에/.test(t));
 ok('F4 📋 방에 보낼 한 줄이 있다',
    await p.evaluate(()=>{const b=[...document.querySelectorAll('#v-agora button')]
      .find(x=>/방에 보낼 한 줄/.test(x.textContent));
      return !!b&&/agora_review/.test(b.dataset.line||'');}));
 /* 🔒 ⑤ 제출 잠금은 방 쪽 규칙이라고 화면에 적는다 — 로한이 "나도 가려지나" 헷갈리지 않게 */
 ok('F5 잠금이 방에게만 걸린다고 적는다',/방에게만 걸린다/.test(t)&&/처음부터 전부 본다/.test(t));

 /* ── G) 해명 저장 ── */
 await p.evaluate(()=>agSayModal('p4'));await p.waitForTimeout(300);
 ok('G1 답할 상대를 보여준다',
    await p.evaluate(()=>/로버트\(학습\)/.test(document.getElementById('modal').textContent)));
 await p.evaluate(()=>{document.getElementById('agBody').value='테스트 해명';agSaySave('p4');});
 await p.waitForTimeout(400);
 let ins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_posts'));
 ok('G2 agora_posts 에 저장한다',ins.length===1,JSON.stringify(ins[0]||{}));
 ok('G3 kind=clarify · member=rohan',ins.length===1&&ins[0].row.kind==='clarify'&&ins[0].row.member==='rohan',
    JSON.stringify(ins[0]&&ins[0].row));
 ok('G4 답할 글과 묶인다',ins.length===1&&ins[0].row.parent_id==='p4');
 ok('G5 그 달에 붙는다',ins.length===1&&ins[0].row.ym==='2026-09');

 /* ── H) ⭐ 방 평가 — 되먹임 ── */
 await p.evaluate(()=>agRateModal('robert-life'));await p.waitForTimeout(300);
 ok('H1 조언이 실제로 쓰였는지 묻는다',
    await p.evaluate(()=>/실제로 쓰였나/.test(document.getElementById('modal').textContent)));
 ok('H2 방 목록에서 고른다',
    await p.evaluate(()=>document.querySelectorAll('#agTarget option').length===7));
 await p.evaluate(()=>{document.getElementById('agRateBody').value='긴축 얘기는 세 달째 같은 말이다';agRateSave();});
 await p.waitForTimeout(400);
 ins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_posts'));
 ok('H3 새 rate 는 insert',ins.length===2&&ins[1].row.kind==='rate'&&ins[1].row.target==='robert-life',
    JSON.stringify(ins[1]&&ins[1].row));
 /* 🔒 한 달에 방 하나당 하나 — 이미 있으면 덮는다(DB 부분 유니크와 짝) */
 await p.evaluate(()=>agRateModal('robert-study'));await p.waitForTimeout(300);
 ok('H4 이미 쓴 평가는 불러온다',
    await p.evaluate(()=>/예산 수정에 썼다/.test(document.getElementById('agRateBody').value)));
 await p.evaluate(()=>{document.getElementById('agRateBody').value='고쳐 쓴다';agRateSave();});
 await p.waitForTimeout(400);
 const upd=await p.evaluate(()=>window.__upd.filter(x=>x.t==='agora_posts'));
 ok('H5 이미 있으면 덮는다 (insert 가 아니다)',upd.length===1&&upd[0].id==='p7',JSON.stringify(upd[0]||{}));

 /* ── I) 달을 넘겨도 섞이지 않는다 ── */
 await pick('2026-08'); t=await txt();
 ok('I1 8월 평가만 보인다',/8월 총평이다/.test(t)&&!/지출이 예산을 넘었다/.test(t));
 ok('I2 8월 토론은 없다',(await q('.agmsg'))===0,String(await q('.agmsg')));
 ok('I3 8월엔 제출 1건',/제출 1/.test(t));
 /* 🔒 사실 묶음은 달마다 다시 가져온다 — 9월 숫자를 8월에 보여주면 거짓말이다 */
 ok('I4 8월 숫자는 9월 것을 재사용하지 않는다',(await q('.agf'))===0&&/불러오는 중/.test(t),String(await q('.agf')));
 await pick('2026-07'); t=await txt();
 ok('I5 평가 없는 달은 어떻게 시작하는지 알려준다',/월간 평가 남겨/.test(t)&&/agora_review/.test(t));

 /* ── J) 좁은 화면 — FM 원칙: 방이 늘어도 표로 본다 ── */
 await pick('2026-09');
 for(const w of [360,768,1100,1500]){
   await p.setViewportSize({width:w,height:1000});await p.waitForTimeout(260);
   const bad=await p.evaluate(()=>{
     const box=document.getElementById('v-agora');
     const over=[...box.querySelectorAll('.agf .fv,.agro,.agrw')]
       .filter(e=>e.scrollWidth>e.clientWidth+2).length;
     return {over,hscroll:box.scrollWidth>box.clientWidth+2};});
   ok('J'+w+' 넘침·가로스크롤 없다',!bad.over&&!bad.hscroll,JSON.stringify(bad));
 }
 await p.setViewportSize({width:1500,height:1100});

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
