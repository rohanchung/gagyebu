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
 {slug:'robert-life' ,title:'생활사',name:'로버트(생활)',provider:'claude',domain:'재정',icon:'🏠',active:true,sort:10},
 {slug:'robert-study',title:'학습사',name:'로버트(학습)',provider:'claude',domain:'JLPT',icon:'📖',active:true,sort:20},
 {slug:'robert-saju' ,title:'사주사',name:'로버트(사주)',provider:'claude',domain:'명리',icon:'🕯️',active:true,sort:30},
 {slug:'suyeon'      ,title:'수연',name:'수연'        ,provider:'openai',domain:'검수',icon:'🔎',active:true,sort:40},
 {slug:'maker'       ,title:'제작사',name:'제작방'      ,provider:'claude',domain:'앱'  ,icon:'🛠',active:true,sort:50},
 {slug:'cardio'      ,title:'의사(순환기)',name:'순환기'      ,provider:'claude',domain:'심장',icon:'❤️',active:true,sort:60},
 {slug:'rehab'       ,title:'의사(그외)',name:'재활의학과'  ,provider:'claude',domain:'어깨',icon:'💪',active:true,sort:70},
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
/* 🔒 실제 agora_facts 는 기간·일수·진행률을 같이 돌려준다(v4.32) — 픽스처도 그 모양이어야
   '보름치를 월 예산과 그냥 비교하지 마라'를 화면이 말하는지 잴 수 있다 */
const FACTS={ym:'2026-09',phase:'full','기간':'2026-09-01 ~ 2026-09-30','일수':30,
 '그달일수':30,'기간진행률':100,'예산단위':'월 — 이 숫자는 한 달치다',
 '거래건수':183,'수입':3342106,'지출':3858012,'학습과제':42,'과제완료':25,
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
/* 📢 v4.32 공지 — 🔒 전체 공지와 한 방 공지를 **가른다.**
   한 방만 알 것을 전체로 띄우면 나머지 방이 상관없는 공지에 「반영했다」를 적고,
   그러면 로한이 보는 숫자가 다시 거짓이 된다. */
const NOTICES=[
 {id:'n1',title:'카드 결제일이 바뀌었다',body:'삼성 탭탭오 결제일을 25일 → 5일로 바꿨다.',
  targets:[],effective:'2026-10-01',until:null,closed_at:null,created_at:'2026-10-01T00:00:00Z'},
 {id:'n2',title:'심초음파 일정',body:'12월 진료 때 같이 본다.',
  targets:['cardio'],effective:'2026-10-02',until:null,closed_at:null,created_at:'2026-10-02T00:00:00Z'},
 /* 🔒 닫힌 공지는 더 챌지 않는다 */
 {id:'n3',title:'지난 공지',body:'끝났다.',targets:[],effective:'2026-09-01',until:null,
  closed_at:'2026-09-20T00:00:00Z',created_at:'2026-09-01T00:00:00Z'}];
const ACKS=[{notice_id:'n1',member:'suyeon',applied:'예산 비교를 월 기준으로 바꿨다',
  acked_at:'2026-10-03T00:00:00Z'}];

 await c.addInitScript(({st,mem,posts,facts,notices,acks})=>{
   const store={v:JSON.parse(JSON.stringify(st))};window.__ins=[];window.__upd=[];window.__rpc=[];
   const tbl={agora_members:mem,agora_posts:posts,agora_notices:notices,agora_acks:acks};
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
 },{st:STATE,mem:MEM,posts:POSTS,facts:FACTS,notices:NOTICES,acks:ACKS});
 const p=await c.newPage(),errs=[];
 /* 🔒 15일 미만이면 차례는 **지난 달 월말** — 픽스처가 2026-09 월말이라 10/5 로 고정한다.
    고정하지 않으면 15일 이후에 돌릴 때 기본이 (이번달, 중간) 으로 바뀌어 전부 빨개진다. */
 await p.clock.setFixedTime(new Date('2026-10-05T09:00:00'));
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
 /* 🔒 아래 절들은 문서 보기를 잰다 — 기본이 회의장이 됐으므로 명시적으로 넘긴다 */
 ok('A0 기본 보기는 회의장이다',await p.evaluate(()=>agView())==='hall',
    await p.evaluate(()=>agView()));
 await p.evaluate(()=>agSetView('doc')); await p.waitForTimeout(400);
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
 ok('A4 목적을 한 줄로 말한다',/같은 기간을, 일곱 개의 눈으로/.test(t));
 /* 🕐 v4.32 — 기본값이 「오늘의 차례」다. 10/5 니까 지난 달 월말이어야 한다 */
 const turn=await p.evaluate(()=>({ym:agYm(),ph:agPhase(),t:agTurn()}));
 ok('A5 기본값이 오늘의 차례다 — 10/5 면 지난 달 월말',
    turn.ym==='2026-09'&&turn.ph==='full',JSON.stringify(turn));

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
 /* 🔒 격자는 **행 단위**로 높이를 맞춘다 — 행이 다르면 8px쯤 차이 나는 게 자연스럽다.
    여기서 지키려는 건 「전부 같다」가 아니라 **한 칸도 폭증하지 않는다**이다(D7·D8 이 본체). */
 ok('D6 카드가 폭증하지 않는다',Math.max.apply(null,h0)<200,JSON.stringify(h0));
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
 /* 🔒 대댓글은 **그 타래가 달린 방**에서 본다 — v4.28 부터 토론이 수신자 기준이다 */
 await room('robert-study');
 ok('F3 대댓글도 마크다운으로 렌더된다',(await q('.agmb b'))>=2,String(await q('.agmb b')));
 await room('cardio');

 /* ── G) 🔒 ⑤ 「다른 영역」은 누구에게 말했나로 센다 ── */
 /* 순환기는 5개 방 이름을 적었다(문단 5) */
 /* 🔴 [결함·2회] 카드마다 「다른 영역에 말한 방」을 아이콘으로 띄웠더니
    로한: 「각 방 밑에 동일하게 뜨는 게 뭐냐 / 각 방 클릭했을 때 정보만 있어야지 다 똑같애」.
    7칸에 비슷한 이모지 줄이 반복되면 일목요연이 아니라 노이즈다.
    🔒 누구에게 말했는지는 **그 방을 클릭한 본문**에만 둔다. 카드엔 예외만 남긴다. */
 const headOf=async()=>p.$eval('#v-agora .agsec.agx .sl2',e=>e.textContent);
 await room('cardio');
 ok('G1 순환기 본문 머리에 5개 방 이름이 적힌다',
    (await headOf()).split('·').length>=5,await headOf());
 /* 🔴 사주는 줄바꿈 없이 한 덩어리로 5개 방에 말했다 — 줄 수로 세면 1건이 된다 */
 await room('robert-saju');
 ok('G2 🔴 줄바꿈 없이 쓴 방도 5개 방으로 센다',
    (await headOf()).split('·').length>=5,await headOf());
 ok('G3 아이콘과 이름을 같이 적는다',/🏠/.test(await headOf())&&/로버트\(생활\)/.test(await headOf()));
 /* 🔒 카드엔 아이콘 줄이 없다 — 7칸이 다 똑같아 보이면 안 된다 */
 await room('cardio');
 ok('G3b 카드엔 「N개 방에」 줄이 없다',!/개 방에/.test(await txt()));
 /* 🔒 담당 영역만 본 방은 드러낸다 */
 ok('G4 others 가 비면 「담당 영역만 봤다」',(await q('.agxn.none'))===1&&/담당 영역만 봤다/.test(await txt()));
 ok('G5 본문 머리에도 누구에게인지 적는다',
    /* 🔒 선택자가 어긋나면 **터지지 말고 실패**해야 한다 — 터지면 뒤 검사가 통째로 가려진다 */
    await p.evaluate(()=>{const x=document.querySelector('#v-agora .agsec.agx');
      return !!x&&/다른 영역에 하는 말[\s\S]{0,80}제작방/.test(x.textContent);}));

 /* ── H) 🔴 토론은 **수신자 기준**이다 (v4.28) ──
    로한: 「학습을 눌렀으면 다른 방애들이 학습방에 이야기한 것들만 떠야지. 수신자 기준으로 정리하라」
    전엔 고른 방과 상관없이 그 달 토론이 전부 떴다 — 방을 고르는 화면인데 아래가 안 바뀌면
    고른 의미가 없다. 🔒 뿌리가 그 방 평가인 타래 + 그 방을 target 으로 한 ⭐ 만 둔다. */
 await room('robert-study'); t=await txt();
 ok('H0 토론 머리에 누구에게 온 말인지 적는다',/로버트\(학습\)에 온 말/.test(t));
 ok('H1 학습 타래 4건만 뜬다(대댓글2·해명1·방평가1)',(await q('.agmsg'))===4,String(await q('.agmsg')));
 /* 🔒 다른 방을 고르면 그 타래는 사라져야 한다 — 안 사라지면 필터가 안 먹은 것이다 */
 await room('cardio');
 ok('H1b 순환기를 고르면 학습 타래는 안 보인다',(await q('.agmsg'))===0,String(await q('.agmsg')));
 ok('H1c 순환기 머리로 바뀐다',/순환기에 온 말/.test(await txt()));
 /* 🔴 미제출 방도 **자기에게 온 말**을 봐야 한다 — 9월 생활방이 그 경우였다(네 방이 지목) */
 await room('robert-life'); t=await txt();
 ok('H1d 미제출 방도 고를 수 있다',(await p.evaluate(()=>(DB.ui||{}).agSel))==='robert-life');
 ok('H1e 미제출이라고 말하되 온 말은 보여준다',/아직 내지 않았다/.test(t)&&/이 방에 온 말/.test(t));
 /* 🔒 「다른 영역에 하는 말」 지목은 타래가 아니라 **남의 평가 본문**에 있다 — 따로 모은다 */
 ok('H1f 이 방을 지목한 평가가 모인다',(await q('.agmenb'))>=2,String(await q('.agmenb')));
 await room('robert-study'); t=await txt();
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
 /* 🔒 v4.32 — 안내가 **단계에 맞는 함수**를 적어야 한다.
    중간평가에 agora_review 를 적어 주면 방이 own 을 쓰다가 거절된다 */
 ok('M5 평가 없는 기간은 어떻게 시작하는지 알려준다',/월말평가 남겨/.test(t)&&/agora_review/.test(t));
 await p.evaluate(()=>agSetPhase('mid')); await p.waitForTimeout(450); t=await txt();
 ok('M5b 중간평가 안내는 agora_mid 를 적는다',
    /중간평가 남겨/.test(t)&&/agora_mid/.test(t)&&!/agora_review[(]/.test(t),'');
 ok('M5c 중간은 세 칸이라고 말한다',/세 칸/.test(t));
 await p.evaluate(()=>agSetPhase('full')); await p.waitForTimeout(450);

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

 /* ══ N) 📢 공지 — 로한이 한 번 적으면 일곱 방이 읽는다 ══ */
 await p.evaluate(()=>{AG.nt=null;agLoadNotices();}); await p.waitForTimeout(500);
 t=await txt();
 ok('N1 공지 띠가 뜬다',/공지/.test(t)&&(await q('.agnt'))===1,String(await q('.agnt')));
 /* 🔒 닫힌 공지는 세지 않는다 */
 ok('N2 유효한 공지만 센다(닫힌 것 제외)',(await q('.agntr'))===2,String(await q('.agntr')));
 ok('N3 공지 제목과 내용이 보인다',/카드 결제일이 바뀌었다/.test(t)&&/25일/.test(t));
 /* 🔒 반영 수를 숫자로 적는다 — 전체 공지는 7방, 한 방 공지는 1방이 분모다 */
 ok('N4 전체 공지는 7방이 분모다',t.indexOf('1/7 반영')>=0,'');
 ok('N5 한 방 공지는 그 방만 분모다',t.indexOf('0/1 반영')>=0,'');
 /* 🔒 미확인 방을 **이름으로** 적는다 — 숫자만 보여주면 누구를 챌지 알 수 없다 */
 ok('N6 미확인 방 이름을 적는다',/미확인/.test(t)&&/순환기/.test(t));
 ok('N7 반영한 내용을 적는다(「읽었음」이 아니다)',/예산 비교를 월 기준으로 바꿨다/.test(t));
 ok('N8 확인 안 하면 평가를 못 쓴다고 말한다',/평가·대댓글을 쓸 수 없다/.test(t));
 /* 쓰기 모달 — 로한만 */
 await p.evaluate(()=>agNoticeModal()); await p.waitForTimeout(250);
 const nm=await p.evaluate(()=>{
   const m=document.getElementById('modal')||document.querySelector('.modal');
   const h=(m&&m.innerHTML)||document.body.innerHTML;
   return {열렸다:/공지 쓰기/.test(h), 제목칸:!!document.getElementById('agNtT'),
     내용칸:!!document.getElementById('agNtB'), 끝날짜:!!document.getElementById('agNtU'),
     대상칸:document.querySelectorAll('.agntc').length};});
 ok('N9 공지 쓰기 모달이 열린다',nm.열렸다&&nm.제목칸&&nm.내용칸,JSON.stringify(nm));
 ok('N10 대상을 방마다 고를 수 있다(안 고르면 전체)',nm.대상칸===7,String(nm.대상칸));
 ok('N11 언제까지 칸이 있다(비우면 계속)',nm.끝날짜,String(nm.끝날짜));
 /* 저장이 **중계 함수**로 가는가 — 🔒 테이블 직접 insert 는 트리거 검사를 건너뛴다 */
 await p.evaluate(()=>{document.getElementById('agNtT').value='테스트';
   document.getElementById('agNtB').value='내용이다';
   document.querySelectorAll('.agntc')[0].checked=true; agNoticeSave();});
 await p.waitForTimeout(350);
 const nrpc=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='agora_notice'));
 ok('N12 공지는 agora_notice() 로 보낸다',nrpc.length===1,JSON.stringify(nrpc[0]||{}));
 ok('N13 고른 대상이 그대로 간다',
    nrpc.length===1&&Array.isArray(nrpc[0].args.p_targets)&&nrpc[0].args.p_targets.length===1,
    JSON.stringify((nrpc[0]||{}).args||{}));
 const nins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_notices'));
 ok('N14 🔒 테이블에 직접 insert 하지 않는다',nins.length===0,JSON.stringify(nins));

 /* ══ O) 🕐 단계가 글을 가른다 ══ */
 const po=await p.evaluate(()=>{
   const full=agOf('2026-09','review').length;
   agSetPhase('mid');
   const mid=agOf('2026-09','review').length;
   agSetPhase('full');
   return {full:full,mid:mid};});
 /* 🔒 phase 가 없는 옛 글은 full 이다 — 중간으로 넘기면 하나도 안 보여야 한다 */
 ok('O1 옛 글(phase 없음)은 월말로 센다',po.full===5,String(po.full));
 ok('O2 중간으로 넘기면 옛 글이 안 섞인다',po.mid===0,String(po.mid));
 await p.waitForTimeout(400);
 const fr=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='agora_facts'));
 ok('O3 facts 에 단계를 넘긴다',fr.some(x=>x.args.p_phase==='mid')&&fr.some(x=>x.args.p_phase==='full'),
    JSON.stringify(fr.map(x=>x.args.p_phase)));

 /* ══ P) 🏰 가신회의 — 보는 화면 ══ */
 await p.evaluate(()=>agSetView('hall')); await p.waitForTimeout(600);
 const hall=await p.evaluate(()=>({
   있다:!!document.getElementById('aghall'),
   svg:document.querySelectorAll('#aghall svg').length,
   /* 🔒 이미지 파일을 쓰지 않는다 — 단일 파일 원칙(§15.1) */
   img:document.querySelectorAll('#aghall img, #aghall image').length,
   자리:document.querySelectorAll('#aghall .agseat').length,
   빈자리:document.querySelectorAll('#aghall .agseat.empty').length,
   해당없음:document.querySelectorAll('#aghall .agseat.na').length,
   두루마리:document.querySelectorAll('#aghall .agscr').length,
   말풍선:!!document.getElementById('agbub')}));
 ok('P1 회의장이 그려진다',hall.있다&&hall.svg===1,JSON.stringify(hall));
 ok('P2 🔒 이미지 파일을 쓰지 않는다(인라인 SVG 뿐)',hall.img===0,String(hall.img));
 /* 로한 + 7방 = 8자리 */
 ok('P3 영주와 일곱 가신이 앉는다',hall.자리===8,String(hall.자리));
 /* 🔒 미제출은 빈 의자로 남긴다 — 숨기면 거짓말이다 */
 ok('P4 미제출은 빈 자리로 보인다',hall.빈자리===2,String(hall.빈자리));
 ok('P5 해당없음은 따로 표시된다',hall.해당없음===1,String(hall.해당없음));
 ok('P6 두루마리가 탁자에 놓인다',hall.두루마리===5,String(hall.두루마리));

 /* 🔒 트리거는 캐릭터다. 할 말 없는 자는 눌리지 않는다 */
 const mute=await p.evaluate(()=>[...document.querySelectorAll('#aghall .agseat')]
   .filter(e=>e.classList.contains('mute')).map(e=>e.dataset.slug));
 ok('P7 할 말 없는 자는 눌리지 않는다',mute.length===2&&mute.includes('robert-life'),JSON.stringify(mute));
 /* 🔒 「해당 없음」은 **말한 것**이다 — 미제출과 가른다 */
 ok('P8 「해당 없음」은 눌린다',!mute.includes('cardio'),JSON.stringify(mute));

 /* 캐릭터를 누르면 처음부터 아뢴다 */
 await p.evaluate(()=>agSpeak('suyeon')); await p.waitForTimeout(250);
 const spoke=await p.evaluate(()=>({
   n:AG_CUR?AG_CUR.seq.length:0, who:AG_CUR?AG_CUR.seq[0].who:'',
   lb:AG_CUR?AG_CUR.seq[0].label:'',
   t:document.getElementById('agbub').textContent,
   on:document.querySelectorAll('#aghall .agseat.on').length}));
 ok('P9 가신을 누르면 아뢴다',spoke.who==='suyeon'&&spoke.lb==='총평',JSON.stringify(spoke).slice(0,120));
 /* 🔴 핵심 — 2,000자를 한 번에 쏟지 않는다 */
 ok('P10 🔒 말풍선은 한 번에 한 토막이다',spoke.n>=8&&spoke.t.length<1200,
    '토막 '+spoke.n+' · 화면 '+spoke.t.length+'자');
 ok('P11 말하는 자리가 밝아진다',spoke.on===1,String(spoke.on));
 const n1=await p.evaluate(()=>{agStep(1);return {i:AG_CUR.i,who:AG_CUR.seq[AG_CUR.i].who};});
 ok('P12 ▶ 로 넘어간다',n1.i===1,JSON.stringify(n1));

 /* 미제출을 눌러도 아무 일이 없어야 한다 */
 const before=await p.evaluate(()=>AG_CUR&&AG_CUR.seq[AG_CUR.i].who);
 await p.evaluate(()=>agSpeak('robert-life')); await p.waitForTimeout(150);
 ok('P13 미제출을 눌러도 말풍선이 안 바뀐다',
    (await p.evaluate(()=>AG_CUR&&AG_CUR.seq[AG_CUR.i].who))===before,String(before));

 /* 📜 두루마리 */
 await p.evaluate(()=>agScrollOpen(0)); await p.waitForTimeout(200);
 const scr=await p.evaluate(()=>({who:AG_CUR.seq[0].who,lb:AG_CUR.seq[0].label,
   t:document.getElementById('agbub').textContent}));
 ok('P14 두루마리를 누르면 그 달 숫자가 뜬다',
    scr.who==='scroll'&&/재정/.test(scr.lb)&&/거래건수/.test(scr.t),JSON.stringify(scr).slice(0,140));
 /* 🔒 기간을 적는다 — 보름치를 월 예산과 그냥 비교하지 않게 */
 ok('P15 두루마리 머리에 기간이 적힌다',/2026-09-01/.test(scr.lb),scr.lb);

 /* 🔒 문서 보기를 없애지 않는다 — 같은 데이터, 두 보기 */
 await p.evaluate(()=>agSetView('doc')); await p.waitForTimeout(400);
 const doc=await p.evaluate(()=>({hall:!!document.getElementById('aghall'),
   grid:document.querySelectorAll('#v-agora .agcard').length}));
 ok('P16 문서 보기로 되돌아간다',!doc.hall&&doc.grid===7,JSON.stringify(doc));
 await p.evaluate(()=>agSetView('hall')); await p.waitForTimeout(400);

 /* ══ Q) 📜 회의 기록창 — 로그는 **그 대목부터** 듣는 입구다 ══ */
 const lg=await p.evaluate(()=>({
   있다:!!document.getElementById('aglog'),
   묶음:[...document.querySelectorAll('#aglog .aglogg')].map(e=>e.textContent.trim().slice(0,6)),
   줄:document.querySelectorAll('#aglog .aglogli').length,
   방줄:document.querySelectorAll('#aglog .aglogli[data-k="room"]').length,
   글줄:document.querySelectorAll('#aglog .aglogli[data-k="post"]').length,
   못누름:[...document.querySelectorAll('#aglog .aglogli.mute')].map(e=>e.dataset.v)}));
 ok('Q1 기록창이 뜬다',lg.있다,String(lg.있다));
 /* 🔒 파트는 **종류로** 가른다 — 방으로 가르면 한 방이 길 때 목록이 무너진다 */
 ok('Q2 평가·간언·분부 세 묶음',lg.묶음.length===3
    &&/평가/.test(lg.묶음[0])&&/간언/.test(lg.묶음[1])&&/분부/.test(lg.묶음[2]),JSON.stringify(lg.묶음));
 /* 🔒 미제출도 줄을 남긴다 — 숨기면 거짓말이다 */
 ok('Q3 일곱 방이 모두 줄을 가진다(미제출 포함)',lg.방줄>=7,String(lg.방줄));
 ok('Q4 간언·분부가 글 줄로 들어간다',lg.글줄>=4,String(lg.글줄));
 /* 🔒 회의장과 로그가 **같이** 막혀야 한다 — 두 곳이 다르게 굴면 고장으로 읽힌다 */
 ok('Q5 할 말 없는 방은 로그에서도 안 눌린다',
    lg.못누름.includes('robert-life')&&lg.못누름.includes('maker'),JSON.stringify(lg.못누름));

 /* 방 줄을 누르면 **처음부터** */
 await p.evaluate(()=>{
   const el=[...document.querySelectorAll('#aglog .aglogli[data-k="room"]')]
     .find(x=>x.dataset.v==='suyeon'); el.click();});
 await p.waitForTimeout(250);
 const fromTop=await p.evaluate(()=>({i:AG_CUR.i,who:AG_CUR.seq[0].who,
   on:document.querySelectorAll('#aglog .aglogli.on').length}));
 ok('Q6 방 줄은 처음부터 듣는다',fromTop.i===0&&fromTop.who==='suyeon',JSON.stringify(fromTop));
 ok('Q7 누른 줄이 켜진다',fromTop.on===1,String(fromTop.on));

 /* 🔴 핵심 — 글 줄은 **그 대목부터** */
 const jump=await p.evaluate(()=>{
   const el=document.querySelector('#aglog .aglogli[data-k="post"]');
   const id=el.dataset.v; el.click();
   const want=(AG.posts||[]).find(x=>x.id===id);
   return {i:AG_CUR.i,n:AG_CUR.seq.length,
     보이는글:AG_CUR.seq[AG_CUR.i].text.slice(0,20),
     원문:String(want&&want.content||'').slice(0,20),
     화자:AG_CUR.seq[AG_CUR.i].who};});
 ok('Q8 🔒 글 줄은 그 대목부터 듣는다',jump.보이는글===jump.원문,JSON.stringify(jump).slice(0,160));
 ok('Q9 중간 대목이면 i 가 0 이 아니다',jump.i>0||jump.n===1,JSON.stringify({i:jump.i,n:jump.n}));

 /* 🔒 회의장에서 눌러도 같은 흐름이다 — 두 입구가 같은 것을 가리킨다 */
 await p.evaluate(()=>agSpeak('rehab')); await p.waitForTimeout(200);
 const both=await p.evaluate(()=>({who:AG_CUR.seq[0].who,
   lb:AG_CUR.seq[0].label,n:AG_CUR.seq.length}));
 ok('Q10 「해당 없음」도 로그에 말이 남는다',both.who==='rehab'&&/해당 없음/.test(both.lb),
    JSON.stringify(both));

 /* 🔒 미리보기는 평문이다 — mdEsc 만 쓰면 ** 가 글자로 보인다(§12 와 같은 자리) */
 const pv=await p.evaluate(()=>[...document.querySelectorAll('#aglog .pv')]
   .map(e=>e.textContent).join(' '));
 ok('Q11 미리보기에 마크다운 기호가 안 보인다',pv.indexOf('**')<0&&pv.indexOf('##')<0,
    pv.slice(0,60));
 /* ══ R) 📱 좁은 화면 — 🔒 좁다고 기능을 빼지 않는다. 배치만 바꾼다(§15.7) ══ */
 await p.evaluate(()=>agSetView('hall')); await p.waitForTimeout(400);
 const wide=await p.evaluate(()=>{
   const v=document.querySelector('#aghall svg').getAttribute('viewBox');
   return {vb:v,tall:agLay().tall,
     seats:document.querySelectorAll('#aghall .agseat').length};});
 ok('R1 넓은 화면은 가로 배치다',!wide.tall&&/1180/.test(wide.vb),JSON.stringify(wide));

 await p.setViewportSize({width:420,height:900}); await p.waitForTimeout(600);
 const narrow=await p.evaluate(()=>{
   const svg=document.querySelector('#aghall svg');
   const v=(svg&&svg.getAttribute('viewBox'))||'';
   return {vb:v,tall:agLay().tall,
     seats:document.querySelectorAll('#aghall .agseat').length,
     scrolls:document.querySelectorAll('#aghall .agscr').length,
     log:!!document.getElementById('aglog'),
     bub:!!document.getElementById('agbub')};});
 /* 🔒 좁으면 탁자를 세로로 세운다 — 680 폭에 긴 탁자를 눕히면 캐릭터가 깨알이 된다 */
 ok('R2 좁으면 세로 배치로 바뀐다',narrow.tall&&/680/.test(narrow.vb),JSON.stringify(narrow));
 /* 🔒 기능을 빼지 않는다 */
 ok('R3 자리 여덟이 그대로 있다',narrow.seats===8,String(narrow.seats));
 ok('R4 두루마리가 그대로 있다',narrow.scrolls===5,String(narrow.scrolls));
 ok('R5 기록창과 말풍선도 남는다',narrow.log&&narrow.bub,JSON.stringify(narrow));

 /* 🔴 세로에서 자리가 화면 밖으로 나가면 안 된다 */
 const fit=await p.evaluate(()=>{
   const Y=agLay(), bad=[];
   agSeats().forEach(function(st){
     const q=agSeatXY(st,Y);
     if(q.x<60||q.x>Y.vb.w-60||q.y<0||q.y>Y.vb.h-90)bad.push(st.m.slug+':'+q.x+','+q.y);});
   return bad;});
 ok('R6 세로에서 자리가 화면 안에 들어온다',fit.length===0,JSON.stringify(fit));

 /* 🔒 이름은 세로에서 **아래 중앙**이다 — 바깥으로 밀면 화면 밖으로 나간다 */
 const nmx=await p.evaluate(()=>[...document.querySelectorAll('#aghall .agnm')]
   .map(e=>+e.getAttribute('x')));
 ok('R7 세로에선 이름이 아래 중앙에 온다',nmx.length>=7&&nmx.every(x=>x===0),JSON.stringify(nmx));

 /* 좁은 화면에서도 눌러서 들을 수 있다 */
 await p.evaluate(()=>agSpeak('suyeon')); await p.waitForTimeout(250);
 const sp=await p.evaluate(()=>({who:AG_CUR&&AG_CUR.seq[0].who,
   n:AG_CUR?AG_CUR.seq.length:0,
   t:document.getElementById('agbub').textContent.length}));
 ok('R8 좁은 화면에서도 아뢴다',sp.who==='suyeon'&&sp.n>=8,JSON.stringify(sp));
 ok('R9 말풍선은 여전히 한 토막이다',sp.t<1200,String(sp.t));

 /* 🔒 되돌아가면 가로로 — 그리고 **듣던 자리를 지킨다** */
 await p.evaluate(()=>{AG_CUR.i=3;agApply();}); await p.waitForTimeout(150);
 await p.setViewportSize({width:1500,height:1200}); await p.waitForTimeout(700);
 const back=await p.evaluate(()=>({tall:agLay().tall,
   vb:document.querySelector('#aghall svg').getAttribute('viewBox'),
   i:AG_CUR?AG_CUR.i:-1,who:AG_CUR&&AG_CUR.seq[AG_CUR.i].who}));
 ok('R10 넓어지면 가로로 돌아온다',!back.tall&&/1180/.test(back.vb),JSON.stringify(back));
 ok('R11 🔒 듣던 자리를 지킨다',back.i===3&&back.who==='suyeon',JSON.stringify(back));

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
