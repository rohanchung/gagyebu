/* v4.23~4.25 🏛 아고라 — 월간 합의체
   정본: agora-design.md · DB: db/20260930_agora.sql
   🔒 이 화면이 지켜야 하는 것
      ① 미제출을 숨기지 않는다 — 빈 격자가 아고라의 상태다
      ② 🔴 격자는 **고르는 곳**이다. 카드를 눌러도 **카드 높이가 변하지 않는다**
         ⚠️ [v4.24 결함] <details> 로 펼쳤더니 같은 행의 **빈 칸 두 개가 함께 1000px 늘어났다**
            (실측 92px → 1082px). 로한: "클릭하면 화면이 깨진다."
            원인은 CSS 가 아니라 구조 오판 — 「총평 한 줄 + 짧은 4칸」을 가정했는데
            방들은 보고서를 쓴다(실측 own 2,000자 · others 1,399자 · 총평 258자).
      ③ 총평은 카드에선 2줄로 줄이고 **본문에선 전문**을 보여준다(258자가 잘려 못 읽혔다)
      ④ 본문·대댓글은 **마크다운으로 렌더**한다(mdEsc 만 쓰면 ** 가 글자로 보였다 — 52개)
      ⑤ 「다른 영역에 하는 말」은 **누구에게 말했나**로 센다
         ⚠️ 줄 수로 셌더니 사주방(줄바꿈 없이 5개 방에 말함)이 1건, 순환기(14줄)가 14건이 됐다
      ⑥ 미제출(·)과 「해당 없음」(⊘)을 가른다
      ⑦ 들여쓰기는 1단까지 — 트리로 쌓으면 일목요연이 깨진다(FM 원칙)
      ⑧ 🙋 로한은 피고가 아니다 — 해명 말고 「방 조언 평가」도 여기서 쓴다(설계 §5) */
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

/* 🔬 실측 분량을 그대로 쓴다 — 방들은 보고서를 쓴다 */
function big(n,paras,md){
  const out=[];const per=Math.max(30,Math.floor(n/Math.max(1,paras)));
  for(let i=0;i<paras;i++){
    let s=(md?'**머리말'+i+'** ':'')+'실제 분량의 서술이다. 숫자 '+(1000+i*137)+'건. ';
    while(s.length<per)s+='이어지는 문장 '+i+'. ';
    out.push(s.slice(0,per));}
  return out.join('\n\n').slice(0,n);
}
const POSTS=[
 /* 🔴 순환기 — 가장 긴 글(실측 own 802 · others 1399). 방 이름 5개를 적었다 */
 {id:'p-cardio',ym:'2026-09',member:'cardio',kind:'review',status:'ok',parent_id:null,
  summary:'배달 12→5건으로 8월에 세운 목표를 정확히 맞췄고 식단은 28일 기록됐다. 반면 9/3 진료 기록이 로한북에 없다.',
  own:big(802,8,true),
  others:'**로버트(생활)** — 의료가 예산 항목에 없다.\n\n**제작방** — 진료 결과를 넣을 입구가 없다.\n\n'
        +'**재활의학과** — 오십견과 혈당은 같은 레버를 공유한다.\n\n**수연** — K 이중검토가 8/27 이후 없다.\n\n'
        +'**로버트(학습)** — 12/6 JLPT와 12월 초 진료가 같은 주다.',
  ask:big(811,3,false),content:null,target:null,submitted_at:'2026-09-30T10:06:33Z'},
 /* 🔴 사주 — 줄바꿈 없이 한 덩어리로 5개 방에 말했다. 줄 수로 세면 1건이 된다 */
 {id:'p-saju',ym:'2026-09',member:'robert-saju',kind:'review',status:'ok',parent_id:null,
  summary:'9월 예측은 「추석 붕괴」 하나를 조준했고 실측이 그 방향으로 갔다 — 단 mid·self 자기신고다.',
  own:big(527,1,false),
  others:'▷로버트(생활): 적자 51만은 연간 흐름과 일치한다. ▷로버트(학습): 단어581로 학습은 돌아갔다. '
        +'▷제작방: timing 판정 로직 점검 요망. ▷순환기: 9/3 진료 결과 대조 필요. ▷수연: known 무효 1건 반영해달라.',
  ask:big(245,2,false),content:null,target:null,submitted_at:'2026-09-30T10:05:43Z'},
 /* 🔴 수연 — 총평이 258자다. 「한 줄」이 아니다 */
 {id:'p-suyeon',ym:'2026-09',member:'suyeon',kind:'review',status:'ok',parent_id:null,
  summary:'9월은 ‘행동은 있었지만 관측 체계는 아직 덜 닫힌 달’이었다. 학습은 42개 과제 중 25개 완료, '
         +'드릴 18회·시험 3회·단어 581건으로 실제 실행이 확인됐고, 건강도 EMR 6턴과 체중 69→68 기록이 남았다. '
         +'반면 재정은 수입 3,342,106원 대비 지출 3,858,012원으로 515,906원 적자였고, 예산은 확정되지 않았으며 '
         +'고정비는 0건, 타임로그 0건·일지 1건이라 종합 판단에 필요한 관측 공백이 컸다.',
  own:big(622,3,false),
  others:'제작방에는 기능보다 데이터가 쌓이느냐를 보라고 하겠다.\n\n로버트(생활)에는 예산을 먼저 닫으라고 하겠다.\n\n'
        +'로버트(학습)에는 미완료와 실행량을 같이 보라고 하겠다.\n\n로버트(사주)에는 판정 전엔 적중률을 말하지 말라고 하겠다.',
  ask:big(308,2,false),content:null,target:null,submitted_at:'2026-10-01T01:50:58Z'},
 /* 담당 영역만 본 방 — others 가 비었다 */
 {id:'p-study',ym:'2026-09',member:'robert-study',kind:'review',status:'ok',parent_id:null,
  summary:'과제 25/42(59.5%) 완료, 단어 581건·드릴 18회 쌓였지만 모의고사 0회로 실전 검증은 없다.',
  own:big(773,5,false),others:null,ask:big(289,2,false),content:null,target:null,
  submitted_at:'2026-09-30T09:29:00Z'},
 /* ⊘ 해당 없음 */
 {id:'p-rehab',ym:'2026-09',member:'rehab',kind:'review',status:'na',parent_id:null,
  summary:null,own:null,others:null,ask:null,
  content:'9월엔 도수치료만 있었고 평가할 변화가 없었다',submitted_at:'2026-09-30T12:00:00Z'},
 /* 토론 — 대댓글(실측 574~797자) → 로한 해명 → 재대댓글 */
 {id:'p-c1',ym:'2026-09',member:'robert-saju',kind:'comment',status:'ok',parent_id:'p-study',
  content:big(347,2,true),target:null,summary:null,own:null,others:null,ask:null,
  submitted_at:'2026-09-30T13:00:00Z'},
 {id:'p-c2',ym:'2026-09',member:'rohan',kind:'clarify',status:'ok',parent_id:'p-c1',
  content:'교재비는 9월에 현금으로 냈다 — 거래에 안 잡혔다.',target:null,
  summary:null,own:null,others:null,ask:null,submitted_at:'2026-09-30T14:00:00Z'},
 {id:'p-c3',ym:'2026-09',member:'cardio',kind:'comment',status:'ok',parent_id:'p-c2',
  content:big(797,3,true),target:null,summary:null,own:null,others:null,ask:null,
  submitted_at:'2026-09-30T15:00:00Z'},
 {id:'p-c4',ym:'2026-09',member:'rohan',kind:'rate',status:'ok',parent_id:null,target:'robert-study',
  content:'교재비 지적은 실제로 예산 수정에 썼다.',summary:null,own:null,others:null,ask:null,
  submitted_at:'2026-09-30T16:00:00Z'},
 /* 지난 달 — 월을 넘겨도 섞이지 않는지 */
 {id:'p-aug',ym:'2026-08',member:'robert-life',kind:'review',status:'ok',parent_id:null,
  summary:'8월 총평이다.',own:'8월',others:null,ask:null,content:null,target:null,
  submitted_at:'2026-08-31T10:00:00Z'}];

/* 🔴 실측값이다 — 「로그 0건」이 거짓이었다(없는 키를 읽었다). 타임로그 23 · 식단 28 이 진짜다 */
const FACTS={ym:'2026-09','거래건수':183,'수입':3342106,'지출':3858012,'학습과제':42,'과제완료':25,
 '드릴':18,'시험':3,'체크한날':25,'식단':28,'타임로그':23,'체중기록':5,'EMR턴':6,'일지':1,
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
 await p.waitForTimeout(1000);
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 const txt=()=>p.$eval('#v-agora',e=>e.textContent);
 const q=(sel)=>p.$$eval('#v-agora '+sel,es=>es.length);
 const pick=async(v)=>{await p.evaluate(x=>agPick(x),v);await p.waitForTimeout(450);};
 const room=async(v)=>{await p.evaluate(x=>agPickRoom(x),v);await p.waitForTimeout(400);};

 /* ── A) 탭이 성찰에 붙었다 ── */
 ok('A1 사이드 메뉴에 아고라가 있다',await p.$eval('.side',e=>/아고라/.test(e.textContent)));
 ok('A2 일지 바로 뒤에 온다',
    await p.evaluate(()=>{const ms=[...document.querySelectorAll('.side .m')].map(x=>x.dataset.v);
      return ms.indexOf('agora')===ms.indexOf('journal')+1;}));
 ok('A3 VIEW_RENDER 에 등록됐다',await p.evaluate(()=>typeof VIEW_RENDER.agora==='function'));
 let t=await txt();
 ok('A4 목적을 한 줄로 말한다',/같은 한 달을, 일곱 개의 눈으로/.test(t));

 /* ── B) 🔒 ①⑥ 명단 — 미제출을 숨기지 않는다 ── */
 ok('B1 활동 중인 방 7개가 모두 뜬다',(await q('.agro'))===7,String(await q('.agro')));
 ok('B2 활동하지 않는 방은 명단에 없다',!/점술방/.test(t));
 ok('B3 제출한 방은 ✓',(await q('.agro.ok'))===4,String(await q('.agro.ok')));
 ok('B4 해당없음은 ⊘ 로 따로',(await q('.agro.na'))===1,String(await q('.agro.na')));
 ok('B5 미제출은 2칸',(await q('.agro.no'))===2,String(await q('.agro.no')));
 ok('B6 집계를 숫자로 적는다',/제출 4/.test(t)&&/해당없음 1/.test(t)&&/미제출 2/.test(t));
 ok('B7 빈 칸을 숨기지 않는다고 말한다',/숨기지 않는다/.test(t));

 /* ── C) 📊 사실 묶음 — 파생이다 ── */
 const rpc=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='agora_facts'));
 ok('C1 agora_facts 를 DB 에서 가져온다',rpc.length>=1&&rpc[0].args.p_ym==='2026-09',JSON.stringify(rpc[0]||{}));
 ok('C2 숫자 칸 11개',(await q('.agf'))===11,String(await q('.agf')));
 /* 🔒 0 은 드러낸다. 다만 이 달엔 0 인 칸이 없다 — 「로그 0」이 거짓이었기 때문이다 */
 ok('C3 0 인 칸이 없다 (전부 기록이 있었다)',(await q('.agf.zero'))===0,String(await q('.agf.zero')));
 ok('C3b 타임로그가 23일분으로 뜬다',/23/.test(await txt()));
 ok('C3c 식단 칸이 있다',/식단/.test(await txt()));
 ok('C4 파생이라고 못 박는다',/파생이다/.test(t)&&/복사하지 않는다/.test(t));
 ok('C5 「기록 없음」은 「하지 않음」이 아니라고 적는다',/하지 않음/.test(t));
 ok('C6 과제는 완료/전체로 보여준다',/25\/42/.test(t));

 /* ── D) 🔴 ② 격자는 고르는 곳이다 — 눌러도 카드 높이가 변하지 않는다 ── */
 ok('D1 격자에 방 7개가 다 있다 (미제출도)',(await q('.agcard'))===7,String(await q('.agcard')));
 ok('D2 미제출 카드는 따로 표시',(await q('.agcard.no'))===2,String(await q('.agcard.no')));
 ok('D3 해당없음 카드는 따로 표시',(await q('.agcard.na'))===1,String(await q('.agcard.na')));
 ok('D4 하나가 선택돼 있다',(await q('.agcard.on'))===1,String(await q('.agcard.on')));
 ok('D5 <details> 를 쓰지 않는다',(await q('details'))===0,String(await q('details')));
 /* 🔒 이번 결함의 핵심 — 높이가 전부 같고, 눌러도 변하지 않아야 한다 */
 const h0=await p.evaluate(()=>[...document.querySelectorAll('#v-agora .agcard')]
   .map(e=>Math.round(e.getBoundingClientRect().height)));
 ok('D6 카드 높이가 전부 같다',new Set(h0).size===1,JSON.stringify(h0));
 await room('cardio');
 const h1=await p.evaluate(()=>[...document.querySelectorAll('#v-agora .agcard')]
   .map(e=>Math.round(e.getBoundingClientRect().height)));
 ok('D7 🔴 가장 긴 글을 골라도 카드 높이가 변하지 않는다',
    JSON.stringify(h0)===JSON.stringify(h1),JSON.stringify(h0)+' → '+JSON.stringify(h1));
 ok('D8 카드가 1000px 로 늘어나지 않는다',Math.max.apply(null,h1)<200,JSON.stringify(h1));
 /* 🔒 본문은 전체 폭 — 격자 안에 있지 않다 */
 const fw=await p.evaluate(()=>{
   const f=document.querySelector('#v-agora .agfull');
   const g=document.querySelector('#v-agora .aggrid');
   if(!f||!g)return null;
   return {full:Math.round(f.getBoundingClientRect().width),grid:Math.round(g.getBoundingClientRect().width),
     below:f.getBoundingClientRect().top>=g.getBoundingClientRect().bottom-2};});
 ok('D9 본문이 전체 폭이다',fw&&Math.abs(fw.full-fw.grid)<4,JSON.stringify(fw));
 ok('D10 본문이 격자 아래에 온다',fw&&fw.below,JSON.stringify(fw));

 /* ── E) 🔒 ③ 총평 — 카드에선 줄이고 본문에선 전문 ── */
 await room('suyeon'); t=await txt();
 const sm=await p.evaluate(()=>{
   const card=document.querySelector('#v-agora .agcard.on .agsum');
   const full=document.querySelector('#v-agora .agfull .agfsum');
   return {cardCut:card.scrollHeight>card.clientHeight+2,
     fullCut:full.scrollHeight>full.clientHeight+2,fullLen:full.textContent.trim().length};});
 ok('E1 긴 총평은 카드에서 줄인다',sm.cardCut,JSON.stringify(sm));
 ok('E2 🔴 본문에선 총평이 잘리지 않는다',!sm.fullCut,JSON.stringify(sm));
 /* 🔒 보이는 글자 수가 **원문과 같아야** 한다 — 「250자 이상」 같은 어림짐작으로 두면
    원문이 바뀔 때 테스트가 거짓으로 통과한다 */
 const srcLen=POSTS.find(x=>x.id==='p-suyeon').summary.length;
 ok('E3 긴 총평이 원문 그대로 다 보인다 ('+srcLen+'자)',sm.fullLen===srcLen,sm.fullLen+' vs '+srcLen);
 ok('E4 4칸이 전부 나온다',/내 담당 영역/.test(t)&&/다른 영역에 하는 말/.test(t)&&/로한에게 요구하는 것/.test(t));
 ok('E5 「다른 영역에 하는 말」은 눈에 띄게 둔다',(await q('.agsec.agx'))===1,String(await q('.agsec.agx')));
 /* 🔴 [결함] 이 칸에 class="agsec x" 를 줬더니 **모달 닫기 버튼의 전역 .x**
    (display:inline-flex;width:30px;height:30px)를 받아 94px 상자로 쪼그라들고 화면이 겹쳤다.
    t54 는 **개수만 세고 폭을 안 재서** 못 잡았다 — 로한이 클릭 한 번에 찾았다.
    🔒 칸은 존재가 아니라 **치수**로 잰다. 한 글자 클래스는 전역과 부딪친다. */
 const secW=await p.evaluate(()=>{
   const f=document.querySelector('#v-agora .agfull');
   const ss=[...document.querySelectorAll('#v-agora .agfull .sv2')];
   return {full:Math.round(f.getBoundingClientRect().width),
     sv:ss.map(e=>Math.round(e.getBoundingClientRect().width))};});
 ok('E6 🔴 모든 칸이 본문 폭을 채운다 (한 칸만 쪼그라들지 않는다)',
    secW.sv.length>=2&&secW.sv.every(w=>w>secW.full*0.8),JSON.stringify(secW));

 /* ── F) 🔒 ④ 마크다운을 렌더한다 ── */
 await room('cardio'); t=await txt();
 ok('F1 🔴 화면에 ** 가 보이지 않는다',!/\*\*/.test(t),(t.match(/\*\*/g)||[]).length+'개');
 ok('F2 <b> 로 렌더된다',(await q('.agfull b'))>=2,String(await q('.agfull b')));
 ok('F3 대댓글도 마크다운으로 렌더된다',(await q('.agmb b'))>=2,String(await q('.agmb b')));

 /* ── G) 🔒 ⑤ 「다른 영역」은 누구에게 말했나로 센다 ── */
 /* 순환기는 5개 방 이름을 적었다(문단 5) */
 ok('G1 순환기는 5개 방에',
    await p.evaluate(()=>{const c=[...document.querySelectorAll('#v-agora .agcard')]
      .find(e=>/순환기/.test(e.textContent));return /5개 방에/.test(c.textContent);}));
 /* 🔴 사주는 줄바꿈 없이 한 덩어리로 5개 방에 말했다 — 줄 수로 세면 1건이 된다 */
 ok('G2 🔴 줄바꿈 없이 쓴 방도 5개 방으로 센다',
    await p.evaluate(()=>{const c=[...document.querySelectorAll('#v-agora .agcard')]
      .find(e=>/로버트\(사주\)/.test(e.textContent));return /5개 방에/.test(c.textContent);}));
 ok('G3 아이콘으로 누구인지 보여준다',
    await p.evaluate(()=>{const c=[...document.querySelectorAll('#v-agora .agcard')]
      .find(e=>/순환기/.test(e.textContent));
      return /🏠/.test(c.textContent)&&/🛠/.test(c.textContent);}));
 /* 🔒 담당 영역만 본 방은 드러낸다 */
 ok('G4 others 가 비면 「담당 영역만 봤다」',(await q('.agxn.none'))===1&&/담당 영역만 봤다/.test(await txt()));
 ok('G5 본문 머리에도 누구에게인지 적는다',
    /* 🔒 선택자가 어긋나면 **터지지 말고 실패**해야 한다 — 터지면 뒤 검사가 통째로 가려진다 */
    await p.evaluate(()=>{const x=document.querySelector('#v-agora .agsec.agx');
      return !!x&&/다른 영역에 하는 말[\s\S]{0,80}제작방/.test(x.textContent);}));

 /* ── H) 🔒 ⑦ 토론 — 들여쓰기 1단까지 ── */
 t=await txt();
 ok('H1 토론 글 4개(대댓글2·해명1·방평가1)',(await q('.agmsg'))===4,String(await q('.agmsg')));
 ok('H2 로한 해명은 따로 칠한다',(await q('.agmsg.rohan'))===1,String(await q('.agmsg.rohan')));
 ok('H3 방 평가도 따로 칠한다',(await q('.agmsg.rate'))===1,String(await q('.agmsg.rate')));
 ok('H4 누구에게 하는 말인지 적는다',/→/.test(t));
 const depth=await p.evaluate(()=>{
   const ms=[...document.querySelectorAll('#v-agora .agmsg')];
   const lefts=[...new Set(ms.map(m=>Math.round(m.getBoundingClientRect().left)))];
   return {steps:lefts.length,lefts};});
 ok('H5 들여쓰기 단계가 2 이하다 (트리로 안 쌓인다)',depth.steps<=2,JSON.stringify(depth));

 /* ── I) 🙋 ⑧ 로한은 피고가 아니다 ── */
 ok('I1 피고가 아니라고 말한다',/피고가 아니다/.test(t)&&/해명할 의무가 없/.test(t));
 ok('I2 방을 평가할 권한을 알린다',/방을 평가할 권한/.test(t));
 ok('I3 방이 그걸 읽는다고 알린다',/다음 달 평가를 쓰기 전에/.test(t));
 ok('I4 📋 방에 보낼 한 줄이 있다',
    await p.evaluate(()=>{const b=[...document.querySelectorAll('#v-agora button')]
      .find(x=>/방에 보낼 한 줄/.test(x.textContent));
      return !!b&&/agora_review/.test(b.dataset.line||'');}));
 ok('I5 잠금이 방에게만 걸린다고 적는다',/방에게만 걸린다/.test(t)&&/처음부터 전부 본다/.test(t));

 /* ── J) 해명 저장 ── */
 await p.evaluate(()=>agSayModal('p-study'));await p.waitForTimeout(300);
 ok('J1 답할 상대를 보여준다',
    await p.evaluate(()=>/로버트\(학습\)/.test(document.getElementById('modal').textContent)));
 await p.evaluate(()=>{document.getElementById('agBody').value='테스트 해명';agSaySave('p-study');});
 await p.waitForTimeout(400);
 let ins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_posts'));
 ok('J2 agora_posts 에 저장한다',ins.length===1,JSON.stringify(ins[0]||{}));
 ok('J3 kind=clarify · member=rohan',ins.length===1&&ins[0].row.kind==='clarify'&&ins[0].row.member==='rohan',
    JSON.stringify(ins[0]&&ins[0].row));
 ok('J4 답할 글과 묶인다',ins.length===1&&ins[0].row.parent_id==='p-study');
 ok('J5 그 달에 붙는다',ins.length===1&&ins[0].row.ym==='2026-09');

 /* ── K) ⭐ 방 평가 — 되먹임 ── */
 await p.evaluate(()=>agRateModal('robert-life'));await p.waitForTimeout(300);
 ok('K1 조언이 실제로 쓰였는지 묻는다',
    await p.evaluate(()=>/실제로 쓰였나/.test(document.getElementById('modal').textContent)));
 ok('K2 방 목록에서 고른다',
    await p.evaluate(()=>document.querySelectorAll('#agTarget option').length===7));
 await p.evaluate(()=>{document.getElementById('agRateBody').value='긴축 얘기는 세 달째 같은 말이다';agRateSave();});
 await p.waitForTimeout(400);
 ins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_posts'));
 ok('K3 새 rate 는 insert',ins.length===2&&ins[1].row.kind==='rate'&&ins[1].row.target==='robert-life',
    JSON.stringify(ins[1]&&ins[1].row));
 await p.evaluate(()=>agRateModal('robert-study'));await p.waitForTimeout(300);
 ok('K4 이미 쓴 평가는 불러온다',
    await p.evaluate(()=>/예산 수정에 썼다/.test(document.getElementById('agRateBody').value)));
 await p.evaluate(()=>{document.getElementById('agRateBody').value='고쳐 쓴다';agRateSave();});
 await p.waitForTimeout(400);
 const upd=await p.evaluate(()=>window.__upd.filter(x=>x.t==='agora_posts'));
 ok('K5 이미 있으면 덮는다 (insert 가 아니다)',upd.length===1&&upd[0].id==='p-c4',JSON.stringify(upd[0]||{}));

 /* ── L) 해당 없음 — 미제출과 다르다 ── */
 await room('rehab'); t=await txt();
 ok('L1 사유를 보여준다',/평가할 변화가 없었다/.test(t));
 ok('L2 미제출과 다르다고 말한다',/미제출과 다르다/.test(t));
 ok('L3 해당없음 본문은 따로 칠한다',(await q('.agfull.na'))===1,String(await q('.agfull.na')));

 /* ── M) 달을 넘겨도 섞이지 않는다 ── */
 await pick('2026-08'); t=await txt();
 ok('M1 8월 평가만 보인다',/8월 총평이다/.test(t)&&!/배달 12→5건/.test(t));
 ok('M2 8월 토론은 없다',(await q('.agmsg'))===0,String(await q('.agmsg')));
 ok('M3 8월엔 제출 1건',/제출 1/.test(t));
 /* 🔒 사실 묶음은 달마다 다시 가져온다 — 9월 숫자를 8월에 보여주면 거짓말이다 */
 ok('M4 8월 숫자는 9월 것을 재사용하지 않는다',(await q('.agf'))===0&&/불러오는 중/.test(t),String(await q('.agf')));
 await pick('2026-07'); t=await txt();
 ok('M5 평가 없는 달은 어떻게 시작하는지 알려준다',/월간 평가 남겨/.test(t)&&/agora_review/.test(t));

 /* ── N) 좁은 화면 — FM 원칙: 방이 늘어도 표로 본다 ── */
 await pick('2026-09');
 for(const w of [360,768,1000,1250,1500,1920]){
   await p.setViewportSize({width:w,height:1000});await p.waitForTimeout(280);
   const bad=await p.evaluate(()=>{
     const box=document.getElementById('v-agora');
     const over=[...box.querySelectorAll('.agf .fv,.agro,.agrw')]
       .filter(e=>e.scrollWidth>e.clientWidth+2).length;
     const hs=[...box.querySelectorAll('.agcard')].map(e=>Math.round(e.getBoundingClientRect().height));
     return {over,hscroll:box.scrollWidth>box.clientWidth+2,tallest:Math.max.apply(null,hs)};});
   /* 🔒 지켜야 하는 건 「높이가 똑같다」가 아니라 **카드가 폭증하지 않는다**다.
      1열(360px)에선 미제출 카드가 「다른 영역」 줄이 없어 더 짧다 — 그건 자연스럽다. */
   ok('N'+w+' 넘침·가로스크롤 없고 카드가 폭증하지 않는다',
      !bad.over&&!bad.hscroll&&bad.tallest<220,JSON.stringify(bad));
 }
 await p.setViewportSize({width:1500,height:1100});

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
