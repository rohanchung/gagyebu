/* t54 🏛 아고라 — v5.10 회의석 · 조회 · 상소 · 책상 (agora-design.md §20~24 · 핸드오프 id 58)
   정본: agora-design.md · DB: db/20260930_agora.sql · db/20261015_agora_v2.sql
   🔒 옛 회의장·말풍선·기록창을 재던 약속을 **새 화면에서 같은 약속으로** 잰다(지우지 않고 옮겼다)
      ① 미제출을 숨기지 않는다 — 빈 자리는 점선 원으로 남고 **눌리지 않는다**
      ② 「해당 없음」은 말한 것이다 — 흐린 초상이지만 **눌린다**
      ③ 어조는 색과 글자로 보인다 — 다섯 어조 + na + 빈 자리 + 안 온 차례 + 없던 차례를 전부 밟는다
      ④ 숫자 실패를 삼키지 않는다 — 책상이 「못 가져왔다 — 이유」를 적는다
      ⑤ 한 번 눌러 한 가신의 글을 다 읽는다(토막·넘기기 없음 · 원칙 59)
      ⑥ 청에 답하면 회의석 「청」 · 조회 「답 전」 · 책상 목록이 한꺼번에 바뀐다
      ⑦ 앱은 남의 글을 고치지 않는다 — 요약을 짓지 않고 원문을 자르기만 한다
      ⑧ 분량은 실측으로 재현한다 — 총평 400~620 · 다른 영역 950~1,150 · 청 530~710 · 소관 1,190 · 간언 440~830 */
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

/* 🔬 실측 분량을 그대로 쓴다 — 가신들은 보고서를 쓴다 */
function big(n,paras,md){
  const out=[];const per=Math.max(30,Math.floor(n/Math.max(1,paras)));
  for(let i=0;i<paras;i++){
    let s=(md?'**머리말'+i+'** ':'')+'실제 분량의 서술이다. 숫자 '+(1000+i*137)+'건. ';
    while(s.length<per)s+='이어지는 문장 '+i+'. ';
    out.push(s.slice(0,per));}
  return out.join('\n\n').slice(0,n);
}
/* 청 — 번호 목록으로 쓴다(실측 530~710자) */
function asks(n,k){const per=Math.floor(n/k);const a=[];
  for(let i=0;i<k;i++){let s=(i+1)+'. 청'+i+' — 이렇게 해 주시옵소서. ';while(s.length<per)s+='까닭 '+i+'. ';a.push(s.slice(0,per));}
  return a.join('\n');}
const OTH5='**로버트(생활)** — 의료가 예산 항목에 없다. '+big(190,1)+'\n\n**제작방** — 진료 결과를 넣을 입구가 없다. '+big(190,1)
  +'\n\n**재활의학과** — 오십견과 혈당은 같은 레버를 공유한다. '+big(190,1)+'\n\n**수연** — K 이중검토가 8/27 이후 없다. '+big(190,1)
  +'\n\n**로버트(학습)** — 12/6 JLPT와 12월 초 진료가 같은 주다. '+big(150,1);
const POSTS=[
 /* 🔒 다섯 어조를 전부 밟는다 — v4.33 TONE[tone] 오타는 plain 만 밟아서 살아 있었다 */
 {id:'p-cardio',ym:'2026-09',member:'cardio',kind:'review',status:'ok',parent_id:null,tone:'plead',
  summary:'배달 12→5건으로 8월에 세운 목표를 정확히 맞췄고 식단은 28일 기록됐다. 반면 9/3 진료 기록이 로한북에 없다. '+big(420,1),
  own:big(1190,8,true),others:OTH5,ask:asks(640,3),content:null,target:null,submitted_at:'2026-09-30T10:06:33Z'},
 /* 🔴 사주 — 줄바꿈 없이 한 덩어리로 5개 방에 말했다. 줄 수로 세면 1건이 된다 */
 {id:'p-saju',ym:'2026-09',member:'robert-saju',kind:'review',status:'ok',parent_id:null,tone:'praise',
  summary:'9월 예측은 「추석 붕괴」 하나를 조준했고 실측이 그 방향으로 갔다 — 단 mid·self 자기신고다. '+big(380,1),
  own:big(527,1,false),
  others:'▷로버트(생활): 적자는 연간 흐름과 일치한다. ▷로버트(학습): 단어581로 학습은 돌아갔다. '
        +'▷제작방: timing 판정 로직 점검 요망. ▷순환기: 9/3 진료 결과 대조 필요. ▷수연: known 무효 1건 반영해달라. '+big(700,1),
  ask:'그날의 일을 그날 적어 주시옵소서. '+big(500,1),content:null,target:null,submitted_at:'2026-09-30T10:05:43Z'},
 {id:'p-suyeon',ym:'2026-09',member:'suyeon',kind:'review',status:'ok',parent_id:null,tone:'worry',
  summary:'9월은 ‘행동은 있었지만 관측 체계는 아직 덜 닫힌 달’이었다. 학습은 42개 과제 중 25개 완료, '
         +'드릴 18회·시험 3회·단어 581건으로 실제 실행이 확인됐고, 건강도 EMR 6턴과 체중 기록이 남았다. '
         +'반면 재정은 수입 3,000,000원 대비 지출 3,500,000원으로 500,000원 적자였고, 예산은 확정되지 않았으며 '
         +'고정비는 0건, 타임로그 0건·일지 1건이라 종합 판단에 필요한 관측 공백이 컸다. Stats 와 Status 는 영문자 s 를 지키는지 본다.',
  own:big(622,3,false),
  others:'제작방에는 기능보다 데이터가 쌓이느냐를 보라고 하겠다.\n\n로버트(생활)에는 예산을 먼저 닫으라고 하겠다.\n\n'
        +'로버트(학습)에는 미완료와 실행량을 같이 보라고 하겠다.\n\n로버트(사주)에는 판정 전엔 적중률을 말하지 말라고 하겠다. '+big(800,2),
  ask:asks(560,2),content:null,target:null,submitted_at:'2026-10-01T01:50:58Z'},
 /* 담당 영역만 본 방 — others 가 비었다 */
 {id:'p-study',ym:'2026-09',member:'robert-study',kind:'review',status:'ok',parent_id:null,tone:'grave',
  summary:'과제 25/42(59.5%) 완료, 단어 581건·드릴 18회 쌓였지만 모의고사 0회로 실전 검증은 없다. '+big(480,1),
  own:big(773,5,false),others:null,ask:asks(600,3),content:null,target:null,
  submitted_at:'2026-09-30T09:29:00Z'},
 {id:'p-maker',ym:'2026-09',member:'maker',kind:'review',status:'ok',parent_id:null,tone:'plain',
  summary:'판을 다섯 번 올렸다. '+big(400,1),own:big(300,1),others:'**수연** — 검수 기준을 같이 맞추자. '+big(960,2),
  ask:asks(540,2),content:null,target:null,submitted_at:'2026-09-30T11:00:00Z'},
 /* ⊘ 해당 없음 */
 {id:'p-rehab',ym:'2026-09',member:'rehab',kind:'review',status:'na',parent_id:null,
  summary:null,own:null,others:null,ask:null,
  content:'9월엔 도수치료만 있었고 평가할 변화가 없었다',submitted_at:'2026-09-30T12:00:00Z'},
 /* 토론 — 간언(실측 440~830자) → 로한 해명 → 재간언 */
 {id:'p-c1',ym:'2026-09',member:'robert-saju',kind:'comment',status:'ok',parent_id:'p-study',tone:'worry',
  content:big(480,2,true),target:null,summary:null,own:null,others:null,ask:null,
  submitted_at:'2026-09-30T13:00:00Z'},
 {id:'p-c2',ym:'2026-09',member:'rohan',kind:'clarify',status:'ok',parent_id:'p-c1',
  content:'교재비는 9월에 현금으로 냈다 — 거래에 안 잡혔다.',target:null,
  summary:null,own:null,others:null,ask:null,submitted_at:'2026-09-30T14:00:00Z'},
 {id:'p-c3',ym:'2026-09',member:'cardio',kind:'comment',status:'ok',parent_id:'p-c2',tone:'grave',
  content:big(797,3,true),target:null,summary:null,own:null,others:null,ask:null,
  submitted_at:'2026-09-30T15:00:00Z'},
 {id:'p-c4',ym:'2026-09',member:'rohan',kind:'rate',status:'ok',parent_id:null,target:'robert-study',
  content:'교재비 지적은 실제로 예산 수정에 썼다.',summary:null,own:null,others:null,ask:null,
  submitted_at:'2026-09-30T16:00:00Z'},
 /* 지난 달 — 달을 넘겨도 섞이지 않는지 */
 {id:'p-aug',ym:'2026-08',member:'robert-life',kind:'review',status:'ok',parent_id:null,
  summary:'8월 총평이다.',own:'8월',others:null,ask:null,content:null,target:null,
  submitted_at:'2026-08-31T10:00:00Z'}];

/* 🔴 「로그 0건」이 거짓이었다(없는 키를 읽었다) — 타임로그·식단 칸이 있어야 한다. 🔒 v5.14 금액은 지어낸 것이다(id 64) */
const FACTS={ym:'2026-09',phase:'full','기간':'2026-09-01 ~ 2026-09-30','일수':30,
 '그달일수':30,'기간진행률':100,'예산단위':'월 — 이 숫자는 한 달치다',
 '거래건수':183,'수입':3000000,'지출':3500000,'학습과제':42,'과제완료':25,
 '드릴':18,'시험':3,'체크한날':25,'식단':28,'타임로그':23,'체중기록':5,'EMR턴':6,'일지':1,
 '예산밖지출':500000,'뽀모':{'회':17,'분':422,'중단':4},'드릴상세':{'일수':8,'회':18,'문항':360,'정답':220,'정답률':61.1},
 '주의':'「기록 없음」은 「하지 않음」이 아니다.'};

const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-09',agYm:'2026-09',agView:'hall'},
 accounts:[{id:'a1',name:'주계좌',type:'bank',group:'현금'}],cards:[{id:'cd1',name:'현금',type:'check'}],
 categories:[{id:'c1',name:'식비',type:'expense'}],transactions:[],
 budgets:{},debts:[],fixed:[],events:[],posts:[],items:[],logs:[],journal:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words:[],sents:[],units:[],tests:[],errors:[],drills:[],pomos:[],books:[],
   phases:[],week:{},month:{},logs:{}}};
/* 📢 🔒 전체 공지와 한 방 공지를 가른다 */
const NOTICES=[
 {id:'n1',title:'카드 결제일이 바뀌었다',body:'삼성 탭탭오 결제일을 25일 → 5일로 바꿨다.',
  targets:[],effective:'2026-10-01',until:null,closed_at:null,created_at:'2026-10-01T00:00:00Z'},
 {id:'n2',title:'심초음파 일정',body:'12월 진료 때 같이 본다.',
  targets:['cardio'],effective:'2026-10-02',until:null,closed_at:null,created_at:'2026-10-02T00:00:00Z'},
 {id:'n3',title:'지난 공지',body:'끝났다.',targets:[],effective:'2026-09-01',until:null,
  closed_at:'2026-09-20T00:00:00Z',created_at:'2026-09-01T00:00:00Z'}];
const ACKS=[{notice_id:'n1',member:'suyeon',applied:'예산 비교를 월 기준으로 바꿨다',
  acked_at:'2026-10-03T00:00:00Z'}];

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1500,height:1000}});
 await c.addInitScript(({st,mem,posts,facts,notices,acks})=>{
   const store={v:JSON.parse(JSON.stringify(st))};window.__ins=[];window.__upd=[];window.__rpc=[];
   const tbl={agora_members:mem,agora_posts:posts,agora_notices:notices,agora_acks:acks};
   window.__tbl=tbl;
   let _m=null,_p=null;
   function mk(name){
     const q={
       select(){ if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}
         if(tbl[name])return Object.assign(Promise.resolve({data:tbl[name].slice(),error:null}),q); return q;},
       order(){ if(tbl[name])return Object.assign(Promise.resolve({data:tbl[name].slice(),error:null}),q); return q;},
       eq(k,v){ if(_m==='aupd'){_m=null;window.__upd.push({t:name,patch:_p,id:v});
           (tbl[name]||[]).forEach(function(x){if(x.id===v)Object.assign(x,_p);});
           return Promise.resolve({data:[],error:null});} return q;},
       limit(){return q}, in(){return q}, delete(){return q},
       maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
       update(pp){ if(name==='agora_posts'){_m='aupd';_p=pp;return q;} _m='update';_p=pp;return q;},
       upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},
       /* 🔒 서버처럼 넣은 글을 돌려준다 — 다시 불러와도 답이 남아야 「한꺼번에 바뀐다」를 잴 수 있다 */
       insert(row){window.__ins.push({t:name,row:row});
         if(name==='agora_posts')tbl[name].push(Object.assign({id:'srv-'+tbl[name].length,status:'ok',submitted_at:'2026-10-05T09:00:00Z'},row));
         return Promise.resolve({data:[],error:null})},
       then(a){return Promise.resolve({data:(tbl[name]||[]).slice(),error:null}).then(a)}};
     return q;}
   window.supabase={createClient:()=>({from:(n)=>mk(n),
     rpc:(fn,args)=>{window.__rpc.push({fn,args});
       return Promise.resolve({data:(fn==='agora_facts'&&args.p_ym==='2026-09')?facts:null,error:null});},
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),
       onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
 },{st:STATE,mem:MEM,posts:POSTS,facts:FACTS,notices:NOTICES,acks:ACKS});
 const p=await c.newPage(),errs=[];
 /* 🔒 15일 미만이면 차례는 **지난 달 월말** — 픽스처가 2026-09 월말이라 10/5 로 고정한다 */
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
 const q=(sel)=>p.$$eval('#v-agora '+sel,es=>es.length);
 const sel=async(v,a)=>{await p.evaluate(([x,y])=>agSel(x,y),[v,a||null]);await p.waitForTimeout(250);};
 const pick=async(v)=>{await p.evaluate(x=>agPick(x),v);await p.waitForTimeout(450);};
 const SEATS='#v-agora .agst[data-slug]:not(.all)';

 /* ── A) 자리와 틀 ── */
 ok('A1 사이드 메뉴에 아고라가 있다',await p.$eval('.side',e=>/아고라/.test(e.textContent)));
 ok('A2 일지 바로 뒤에 온다',
    await p.evaluate(()=>{const ms=[...document.querySelectorAll('.side .m')].map(x=>x.dataset.v);
      return ms.indexOf('agora')===ms.indexOf('journal')+1;}));
 ok('A3 VIEW_RENDER 에 등록됐다',await p.evaluate(()=>typeof VIEW_RENDER.agora==='function'));
 let t=await txt();
 ok('A4 목적을 한 줄로 말한다',/가신 일곱이 같은 기간을 아뢴다/.test(t));
 const turn=await p.evaluate(()=>({ym:agYm(),ph:agPhase(),t:agTurn()}));
 ok('A5 기본값이 오늘의 차례다 — 10/5 면 지난 달 월말',turn.ym==='2026-09'&&turn.ph==='full',JSON.stringify(turn));
 /* 🔒 원칙 60 — 보기는 하나다. [회의장|문서] 탭을 걷었고 DB.ui.agView 는 읽지 않는다(값은 지우지 않는다) */
 ok('A6 [회의장|문서] 탭이 없다',(await q('.pl1'))===0&&!/📄 문서/.test(t),String(await q('.pl1')));
 ok('A7 DB.ui.agView 를 읽지 않되 지우지도 않는다',
    await p.evaluate(()=>typeof agView==='undefined'&&typeof agSetView==='undefined'&&DB.ui.agView==='hall'));
 ok('A8 옛 회의장·말풍선·기록창이 없다',
    (await q('#aghall,#agbub,#aglog,.agpanel,.agtabs,.aggrid,.agcard'))===0,String(await q('#aghall,#agbub,#aglog')));
 ok('A9 걷은 함수가 남지 않았다',await p.evaluate(()=>['agHallHtml','agLay','agSeatXY','agTorch','agLord','agBub','agStep','agSeq','agChunk',
   'agSpeak','agLogHtml','agTab','agPanelInner','agHallBind','agOnResize','agRoster','agGrid','agFull','agTools','agHallFactsNote']
   .filter(n=>typeof window[n]!=='undefined').length===0));

 /* ── B) 회의석 — 🔒 ①② 빈 자리는 눌리지 않고 na 는 눌린다 ── */
 const bench=await p.evaluate(()=>{
   const ss=[...document.querySelectorAll('#v-agora .agst[data-slug]')];
   return {all:ss.filter(x=>x.classList.contains('all')).length,
     seats:ss.filter(x=>!x.classList.contains('all')).map(x=>({s:x.dataset.slug,empty:x.classList.contains('empty'),na:x.classList.contains('na'),
       dis:x.disabled,t:x.textContent,bd:!!x.querySelector('.agbd'),nt:!!x.querySelector('.agnt1'),svg:!!x.querySelector('svg')}))};});
 ok('B1 맨 앞 🛡 조회 + 가신 일곱',bench.all===1&&bench.seats.length===7,JSON.stringify(bench.seats.map(x=>x.s)));
 ok('B2 자리 순서는 sort 그대로',bench.seats.map(x=>x.s).join()==='robert-life,robert-study,robert-saju,suyeon,maker,cardio,rehab');
 ok('B3 활동하지 않는 방은 앉지 않는다',!/점술방/.test(t));
 const empty=bench.seats.filter(x=>x.empty);
 ok('B4 🔒 미제출은 빈 자리로 남는다(숨기지 않는다)',empty.length===1&&empty[0].s==='robert-life'&&!empty[0].svg,JSON.stringify(empty));
 ok('B5 🔒 빈 자리는 눌리지 않는다',empty.every(x=>x.dis));
 ok('B6 빈 자리에 「미제출」이라 적는다',/미제출/.test(empty[0].t),empty[0].t);
 const na=bench.seats.filter(x=>x.na);
 ok('B7 🔒 해당 없음은 흐린 초상 — 눌린다',na.length===1&&na[0].s==='rehab'&&!na[0].dis&&na[0].svg&&/아뢸 것 없음/.test(na[0].t),JSON.stringify(na));
 /* 🔒 어조는 색 **과** 글자로 */
 const toneTxt={cardio:'간곡히','robert-saju':'기껍게',suyeon:'염려하여','robert-study':'엄중히',maker:'담담히'};
 ok('B8 🔒 어조가 글자로 보인다(다섯 전부)',Object.keys(toneTxt).every(s=>bench.seats.find(x=>x.s===s).t.indexOf(toneTxt[s])>=0),
    JSON.stringify(bench.seats.map(x=>x.t)));
 ok('B9 어조가 색으로도 보인다',await p.evaluate(()=>{
   const cs=[...document.querySelectorAll('#v-agora .agbench .agtone:not(.t-none) i')].map(i=>getComputedStyle(i).backgroundColor);
   return cs.length===5&&new Set(cs).size===5;}));
 /* 청 배지 — 답이 없는 청. 학습사는 타래 안에서 답했다(p-c2 뿌리 = p-study) */
 const bd=bench.seats.filter(x=>x.bd).map(x=>x.s).sort().join();
 ok('B10 금빛 「청」 = 청이 있고 답이 없다',bd==='cardio,maker,robert-saju,suyeon',bd);
 /* 📢 = 받들지 않은 분부 — n1(전체)을 수연만 받들었다 · 빈 자리엔 달지 않는다 */
 const nt=bench.seats.filter(x=>x.nt).map(x=>x.s).sort().join();
 ok('B11 📢 = 받들지 않은 분부가 있다',nt==='cardio,maker,rehab,robert-saju,robert-study',nt);
 ok('B12 회의석 초상은 그림 한 벌(agFigure)을 쓴다 — 이미지 파일이 없다',
    (await q('.agbench img,.agbench image'))===0&&(await q('.agbench .agfig'))===6,String(await q('.agbench .agfig')));

 /* ── C) 조회 — 여섯의 보고가 한 장에 ── */
 const rows=await p.evaluate(()=>[...document.querySelectorAll('#agfolio .agrow')].map(r=>({s:r.dataset.slug,
   cls:r.className,lead:(r.querySelector('.aglead')||{}).textContent||'',ask:(r.querySelector('.agask1')||{}).textContent||'',
   st:(r.querySelector('.agrst')||{}).textContent||'',btn:r.tagName==='BUTTON'})));
 ok('C1 일곱 줄(빈 자리 포함)',rows.length===7,String(rows.length));
 /* 🔒 엄중한 것부터 — grave → plead → worry → plain → praise · 해당 없음 · 빈 자리 맨 아래 */
 ok('C2 🔒 엄중한 것부터 놓는다',rows.map(r=>r.s).join()==='robert-study,cardio,suyeon,maker,robert-saju,rehab,robert-life',rows.map(r=>r.s).join());
 ok('C3 빈 자리 줄은 눌리지 않는다',!rows[6].btn&&/미제출/.test(rows[6].lead),JSON.stringify(rows[6]));
 /* 🔒 원칙 63 — 앱이 요약을 짓지 않는다. 줄은 원문(마크다운만 벗긴 것)이고 CSS 로 자른다 */
 const lead=await p.evaluate(()=>{const e=document.querySelector('#agfolio .agrow[data-slug="suyeon"] .aglead');
   return {t:e.textContent,cut:e.scrollHeight>e.clientHeight+2,src:agPlain(agReviewOf('2026-09','suyeon').summary)};});
 ok('C4 🔒 총평은 원문 그대로 — 앱이 줄여 쓰지 않는다',lead.t===lead.src,lead.t.length+' vs '+lead.src.length);
 ok('C5 총평은 두 줄에서 CSS 로 자른다',lead.cut,JSON.stringify(lead.cut));
 ok('C6 🔴 agPlain 이 영문자 s 를 지우지 않는다',/Stats 와 Status/.test(lead.t),lead.t.slice(-40));
 ok('C7 첫 청 한 줄이 붙는다',/청 2/.test(rows.find(r=>r.s==='suyeon').ask)&&/이렇게 해 주시옵소서/.test(rows.find(r=>r.s==='suyeon').ask));
 ok('C8 답 전 / 답했다 ✓ 가 보인다',/답 전/.test(rows.find(r=>r.s==='cardio').st)&&/답했다/.test(rows.find(r=>r.s==='robert-study').st));
 ok('C9 오간 말 수가 보인다',/오간 말 3/.test(rows.find(r=>r.s==='robert-study').st),rows.find(r=>r.s==='robert-study').st);
 ok('C10 머리 한 줄 — 아뢴 수 · 빈 자리 · 청 가운데 답한 수',
    await p.evaluate(()=>{const x=document.querySelector('#agfolio .agttl2').textContent;
      return /다섯이 아뢰었고/.test(x)&&/하나는 아뢸 것이 없다/.test(x)&&/한 자리가 비었다\(미제출\)/.test(x)&&/답을 내린 상소 1\/5/.test(x);}),
    await p.$eval('#agfolio .agttl2',e=>e.textContent));
 ok('C11 해당 없음 줄은 사유를 보인다',/평가할 변화가 없었다/.test(rows.find(r=>r.s==='rehab').lead));
 /* 🔒 「답을 기다리는 청」을 붉은색·경고로 칠하지 않는다(§5) */
 ok('C12 답 전 표시가 붉지 않다',await p.evaluate(()=>{const e=document.querySelector('#agfolio .agpill.g');
   const c=getComputedStyle(e).color.match(/\d+/g).map(Number);return !(c[0]>150&&c[1]<90&&c[2]<90);}));

 /* ── D) 상소 — 한 번 눌러 다 읽는다(원칙 59) ── */
 await p.click('#agfolio .agrow[data-slug="cardio"]'); await p.waitForTimeout(300);
 t=await txt();
 const cr=POSTS.find(x=>x.id==='p-cardio');
 const pet=await p.evaluate(()=>{const f=document.getElementById('agfolio');
   return {h2:(f.querySelector('.agh2')||{}).textContent,anc:[...f.querySelectorAll('.aganc button')].map(b=>b.textContent),
     sum:(f.querySelector('#ag-a1 .aglead0')||{}).textContent||'',ask:(f.querySelector('.agaskb')||{}).textContent||'',
     oth:(f.querySelector('#ag-a3 .agbody')||{}).textContent||'',tg:[...f.querySelectorAll('#ag-a3 .agtgw')].map(x=>x.textContent),
     sel:(DB.ui||{}).agSel,on:(document.querySelector('#v-agora .agst.on')||{}).dataset.slug};});
 ok('D1 줄을 누르면 그 가신의 상소',pet.h2==='의사(순환기) 아뢰옵니다'&&pet.sel==='cardio'&&pet.on==='cardio',JSON.stringify([pet.h2,pet.sel,pet.on]));
 ok('D2 닻 — 총평·청·다른 가신에게·소관·오간 말',pet.anc.length===5&&/청 3/.test(pet.anc[1])&&/다른 가신에게 5/.test(pet.anc[2]),JSON.stringify(pet.anc));
 ok('D3 🔒 총평 전문 — 자르지 않는다',pet.sum.replace(/\s/g,'')===cr.summary.replace(/\s/g,''),pet.sum.length+' vs '+cr.summary.length);
 ok('D4 청 전문이 금빛 상자에',pet.ask.replace(/\s/g,'').length>=cr.ask.replace(/\s|\d\./g,'').length-10,pet.ask.length+'');
 ok('D5 다른 가신에게 원문',pet.oth.replace(/\s|\*/g,'').length>=OTH5.replace(/\s|\*/g,'').length-5,pet.oth.length+' vs '+OTH5.length);
 ok('D6 🔴 지목된 가신 메달 다섯(줄 수가 아니라 이름으로 센다)',pet.tg.length===5,JSON.stringify(pet.tg));
 ok('D7 🔒 마크다운으로 렌더 — ** 가 글자로 안 보인다',!/\*\*/.test(t)&&(await q('#agfolio .agbody b'))>=5);
 const fold=await p.evaluate(()=>{const b=document.querySelector('#ag-a4 .agfold');return {t:b.textContent,body:!!document.querySelector('#ag-a4 .agbody')};});
 ok('D8 소관은 접혀 있고 분량을 적는다',/펼쳐 읽는다 · 1,190자/.test(fold.t)&&!fold.body,JSON.stringify(fold));
 await p.click('#ag-a4 .agfold'); await p.waitForTimeout(200);
 ok('D9 펼치면 전문이 나온다',await p.evaluate(()=>{const e=document.querySelector('#ag-a4 .agbody');return !!e&&e.textContent.replace(/\s|\*/g,'').length>700;}));
 /* 사주 — 줄바꿈 없이 한 덩어리로 다섯에게 */
 await sel('robert-saju');
 ok('D10 🔴 줄바꿈 없이 쓴 가신도 다섯으로 센다',(await q('#ag-a3 .agtgw'))===5,String(await q('#ag-a3 .agtgw')));
 await p.click('#ag-a3 .agtgw >> text=수연'); await p.waitForTimeout(250);
 ok('D11 수신자 메달을 누르면 그 가신의 상소로',await p.evaluate(()=>DB.ui.agSel==='suyeon'&&/수연 아뢰옵니다/.test(document.querySelector('.agh2').textContent)));
 /* 빈 자리를 지목했으면 메달은 있되 눌리지 않는다 */
 ok('D12 지목된 빈 자리 메달은 눌리지 않는다',await p.evaluate(()=>{const b=[...document.querySelectorAll('#ag-a3 .agtgw')].find(x=>/생활사/.test(x.textContent));return !!b&&b.disabled;}));
 /* ‹ › — 빈 자리를 건너뛴다 */
 const nav=await p.evaluate(()=>[...document.querySelectorAll('.agnav button')].map(b=>b.textContent));
 ok('D13 ‹ 앞 가신 / 뒤 가신 › (빈 자리는 건너뛴다)',nav.length===2&&/사주사/.test(nav[0])&&/제작사/.test(nav[1]),JSON.stringify(nav));
 /* 오간 말 — 타래 */
 await sel('robert-study');
 const talk=await p.evaluate(()=>{const ss=[...document.querySelectorAll('#ag-a5 .agsay')];
   return {n:ss.length,me:ss.filter(x=>x.classList.contains('me')).length,
     lefts:[...new Set(ss.filter(x=>!x.classList.contains('me')).map(x=>Math.round(x.getBoundingClientRect().left)))],
     to:ss.map(x=>(x.querySelector('.agsh')||{}).textContent),b:document.querySelectorAll('#ag-a5 .agbb b').length,
     rate:(document.querySelector('#ag-a2 .agreply.rate')||{}).textContent||''};});
 ok('D14 오간 말 — 그 평가가 뿌리인 타래 셋',talk.n===3,String(talk.n));
 ok('D15 로한의 말은 오른쪽 봉랍(R)',talk.me===1,String(talk.me));
 ok('D16 🔒 들여쓰기 없음 — 「→ 누구에게」로 적는다',talk.lefts.length===1&&talk.to.every(x=>/→/.test(x)),JSON.stringify(talk));
 ok('D17 간언도 마크다운으로 렌더된다',talk.b>=4,String(talk.b));
 ok('D18 평은 청 아래 그 자리에 보인다',/예산 수정에 썼다/.test(talk.rate),talk.rate);
 ok('D19 타래 안에서 답했으면 그렇다고 적는다',/답했다 ✓ — 아래 「오간 말」/.test(await txt()));
 /* 🔒 고른 방의 타래만 — 다른 가신을 고르면 그 타래는 사라진다 */
 await sel('maker');
 ok('D20 다른 가신을 고르면 그 타래는 안 보인다',(await q('#ag-a5 .agsay'))===0&&/아직 오간 말이 없다/.test(await txt()));
 /* 해당 없음 */
 await sel('rehab'); t=await txt();
 ok('D21 해당 없음 상소는 사유를 보인다',/평가할 변화가 없었다/.test(t)&&/미제출과 다르다/.test(t));
 /* 🔒 빈 자리는 눌러도 아무 일이 없다 */
 await sel('robert-life');
 ok('D22 🔒 빈 자리를 불러도 상소가 열리지 않는다',await p.evaluate(()=>DB.ui.agSel==='rehab'));
 await p.click('#v-agora .agst.all'); await p.waitForTimeout(250);
 ok('D23 🛡 조회를 누르면 전체로 돌아온다',await p.evaluate(()=>DB.ui.agSel===''&&!!document.querySelector('#agfolio .agttl')));

 /* ── E) 🔒 ⑥ 청에 답하면 세 자리가 한꺼번에 바뀐다 ── */
 await p.click('#agfolio .agrow[data-slug="suyeon"]'); await p.waitForTimeout(250);
 const cm=await p.evaluate(()=>({seg:[...document.querySelectorAll('#ag-a2 .agcmp .sg')].map(x=>x.textContent),
   ph:(document.getElementById('agcmp')||{}).placeholder||'',under:!!document.querySelector('#ag-a2 .agaskb + .agcmp')}));
 ok('E1 청 바로 아래에 [답을 내린다 | 이 조언을 평한다] + 글상자 하나',cm.under&&cm.seg.length===2&&/답을 내린다/.test(cm.seg[0])&&/평한다/.test(cm.seg[1]),JSON.stringify(cm));
 ok('E2 🔒 「안 써도 된다」를 지우지 않는다',/안 써도 된다/.test(cm.ph),cm.ph);
 const before=await p.evaluate(()=>({bd:!!document.querySelector('.agst[data-slug="suyeon"] .agbd'),
   wait:[...document.querySelectorAll('#agwait .agwl')].map(x=>x.dataset.slug)}));
 await p.fill('#agcmp','예산 비교는 월 기준으로 하자. 보름치를 월 예산에 바로 대지 마라.');
 await p.click('#ag-a2 .agcmp .btn'); await p.waitForTimeout(700);
 let ins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_posts'));
 ok('E3 agora_posts 에 해명(clarify)으로 저장한다 — agSaySave 그대로',ins.length===1&&ins[0].row.kind==='clarify'&&ins[0].row.member==='rohan'
    &&ins[0].row.parent_id==='p-suyeon'&&ins[0].row.ym==='2026-09'&&ins[0].row.phase==='full',JSON.stringify(ins[0]&&ins[0].row));
 const after=await p.evaluate(()=>({bd:!!document.querySelector('.agst[data-slug="suyeon"] .agbd'),
   wait:[...document.querySelectorAll('#agwait .agwl')].map(x=>x.dataset.slug),
   reply:(document.querySelector('#ag-a2 .agreply')||{}).textContent||''}));
 ok('E4 답이 청 아래 봉랍과 함께 보인다',/월 기준으로 하자/.test(after.reply),after.reply);
 ok('E5 🔒 회의석 「청」이 꺼지고 책상 목록에서 빠진다(한꺼번에)',before.bd&&!after.bd&&before.wait.indexOf('suyeon')>=0&&after.wait.indexOf('suyeon')<0,
    JSON.stringify([before,after]));
 await p.click('#v-agora .agst.all'); await p.waitForTimeout(250);
 ok('E6 조회 줄도 답했다 ✓ 로 바뀐다',/답했다/.test(await p.$eval('#agfolio .agrow[data-slug="suyeon"] .agrst',e=>e.textContent)));
 ok('E7 머리 한 줄의 답한 수도 바뀐다',/답을 내린 상소 2\/5/.test(await p.$eval('#agfolio .agttl2',e=>e.textContent)));

 /* ── F) ⭐ 평 — 차례마다 하나, 다시 쓰면 덮는다 ── */
 await sel('robert-study');
 await p.click('#ag-a2 .agcmp .sg[data-seg="rate"]'); await p.waitForTimeout(200);
 ok('F1 이미 쓴 평은 글상자에 불러온다',/예산 수정에 썼다/.test(await p.$eval('#agcmp',e=>e.value)));
 await p.fill('#agcmp','고쳐 쓴다');
 await p.click('#ag-a2 .agcmp .btn'); await p.waitForTimeout(600);
 const upd=await p.evaluate(()=>window.__upd.filter(x=>x.t==='agora_posts'));
 ok('F2 이미 있으면 덮는다(insert 가 아니다) — agRateSave 그대로',upd.length===1&&upd[0].id==='p-c4'&&upd[0].patch.content==='고쳐 쓴다',JSON.stringify(upd[0]||{}));
 await sel('cardio');
 await p.click('#ag-a2 .agcmp .sg[data-seg="rate"]'); await p.waitForTimeout(200);
 await p.fill('#agcmp','배달 지적은 실제로 줄이는 데 썼다');
 await p.click('#ag-a2 .agcmp .btn'); await p.waitForTimeout(600);
 ins=await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_posts'));
 ok('F3 새 평은 insert · kind=rate · target',ins.length===2&&ins[1].row.kind==='rate'&&ins[1].row.target==='cardio',JSON.stringify(ins[1]&&ins[1].row));
 ok('F4 평을 써도 청은 「답 전」이다(평은 답이 아니다)',await p.evaluate(()=>!!document.querySelector('.agst[data-slug="cardio"] .agbd')));
 /* 빈 내용은 보내지 않는다 */
 await p.click('#ag-a2 .agcmp .sg[data-seg="ans"]'); await p.waitForTimeout(150);
 await p.fill('#agcmp','   '); await p.click('#ag-a2 .agcmp .btn'); await p.waitForTimeout(300);
 ok('F5 빈 답은 보내지 않는다',(await p.evaluate(()=>window.__ins.length))===2);
 /* 쓰던 글은 다시 그려져도 남는다 */
 await p.fill('#agcmp','쓰다 만 답'); await p.evaluate(()=>{document.getElementById('agcmp').dispatchEvent(new Event('input'));renderAgora();});
 ok('F6 다시 그려져도 쓰던 글이 남는다',(await p.$eval('#agcmp',e=>e.value))==='쓰다 만 답');

 /* ── G) 책상 — 답을 기다리는 청 · 숫자 · 분부 ── */
 const desk=await p.evaluate(()=>({wait:[...document.querySelectorAll('#agwait .agwl')].map(x=>x.dataset.slug),
   head:document.querySelector('#agwait h4').textContent,facts:document.getElementById('agfacts').textContent,
   sc:document.querySelectorAll('#agfacts .agsc').length,z:document.querySelectorAll('#agfacts .z').length,
   nt:document.querySelectorAll('#agnotice .agnti').length,ntt:document.getElementById('agnotice').textContent}));
 ok('G1 답을 기다리는 청 — 어조 순',desk.wait.join()==='cardio,maker,robert-saju',desk.wait.join());
 ok('G2 🔒 머리에 「안 써도 된다」',/안 써도 된다/.test(desk.head),desk.head);
 await p.click('#agwait .agwl[data-slug="maker"]'); await p.waitForTimeout(300);
 ok('G3 누르면 그 상소의 청으로',await p.evaluate(()=>DB.ui.agSel==='maker'&&!!document.getElementById('ag-a2')));
 ok('G4 📜 숫자 다섯 묶음을 펼친 줄로',desk.sc===5,String(desk.sc));
 ok('G5 기간과 진행률을 머리에',/2026-09-01 ~ 2026-09-30/.test(desk.facts)&&/100%/.test(desk.facts));
 ok('G6 실측 숫자 — 과제 25/42 · 타임로그 23 · 식단 28 · 예산 밖 · 뽀모 · 드릴 일수',
    /25\/42/.test(desk.facts)&&/타임로그 23/.test(desk.facts)&&/식단 28/.test(desk.facts)&&/예산밖지출 ₩500,000/.test(desk.facts)&&/17회 · 422분/.test(desk.facts)&&/18회 · 8일 · 61.1%/.test(desk.facts),desk.facts.slice(0,200));
 ok('G7 0 인 칸이 없을 땐 붉은 것도 없다',desk.z===0,String(desk.z));
 ok('G8 파생이다 · 「기록 없음」은 「하지 않음」이 아니다',/파생이다/.test(desk.facts)&&/하지 않음/.test(desk.facts));
 await p.evaluate(()=>{AG.facts.d=Object.assign({},AG.facts.d,{'시험':0});renderAgora();});
 ok('G9 0 은 붉게',(await q('#agfacts .z'))===1&&/시험/.test(await p.$eval('#agfacts .z',e=>e.textContent)));
 /* 🔒 ④ 숫자 실패를 삼키지 않는다 */
 await p.evaluate(()=>{AG.facts={ym:agYm(),phase:agPhase(),d:null,err:'permission denied'};renderAgora();});
 const bad=await p.$eval('#agfacts',e=>e.textContent);
 ok('G10 🔒 숫자를 못 가져오면 그렇다고 — 이유까지',/못 가져왔다/.test(bad)&&/permission denied/.test(bad),bad.slice(0,80));
 ok('G11 방마다 다른 숫자를 든다고 경고한다',/방마다 다른 숫자/.test(bad));
 await p.evaluate(()=>{AG.facts=null;renderAgora();});
 const wt=await p.$eval('#agfacts',e=>e.textContent);
 ok('G12 아직 못 받았을 땐 불러오는 중 — 실패와 가른다',/불러오는 중/.test(wt)&&!/못 가져왔다/.test(wt),wt);
 await p.evaluate(()=>agLoadFacts()); await p.waitForTimeout(300);
 /* 📢 분부 */
 ok('G13 유효한 분부만(닫힌 것 제외)',desk.nt===2,String(desk.nt));
 ok('G14 n/m 받들었다 — 전체는 7, 한 방은 1이 분모',/1\/7 받들었다/.test(desk.ntt)&&/0\/1 받들었다/.test(desk.ntt));
 ok('G15 🔒 아직인 가신을 관직명으로 적는다',/아직: 학습사 · 사주사 · 제작사 · 의사\(순환기\)/.test(desk.ntt)||/아직:[^✓]*의사\(순환기\)/.test(desk.ntt),desk.ntt.slice(0,160));
 ok('G16 받든 내용을 적는다(「읽었음」이 아니다)',/예산 비교를 월 기준으로 바꿨다/.test(desk.ntt));
 ok('G17 ＋ 분부 내리기 · 📋 방에 보낼 한 줄 · 닫기',/분부 내리기/.test(desk.ntt)&&(await q('#agnotice .agntx'))===2&&
    await p.evaluate(()=>/agora_pending/.test(([...document.querySelectorAll('#agnotice button')].find(b=>/보낼 한 줄/.test(b.textContent))||{}).dataset.line||'')));
 ok('G18 받들지 않으면 상소를 못 올린다고 말한다',/상소·간언을 올릴 수 없다/.test(desk.ntt));
 await p.evaluate(()=>agNoticeModal()); await p.waitForTimeout(250);
 const nm=await p.evaluate(()=>({제목:!!document.getElementById('agNtT'),내용:!!document.getElementById('agNtB'),
   끝:!!document.getElementById('agNtU'),대상:document.querySelectorAll('.agntc').length}));
 ok('G19 분부 쓰기 모달 — 대상은 방마다(안 고르면 전체)',nm.제목&&nm.내용&&nm.끝&&nm.대상===7,JSON.stringify(nm));
 await p.evaluate(()=>{document.getElementById('agNtT').value='테스트';document.getElementById('agNtB').value='내용이다';
   document.querySelectorAll('.agntc')[0].checked=true; agNoticeSave();});
 await p.waitForTimeout(350);
 const nrpc=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='agora_notice'));
 ok('G20 분부는 agora_notice() 로 보낸다',nrpc.length===1&&nrpc[0].args.p_targets.length===1,JSON.stringify(nrpc[0]||{}));
 ok('G21 🔒 테이블에 직접 insert 하지 않는다',(await p.evaluate(()=>window.__ins.filter(x=>x.t==='agora_notices').length))===0);
 await p.evaluate(()=>{AG.nt=null;agLoadNotices();}); await p.waitForTimeout(400);
 await p.evaluate(()=>{AG.ntErr='notices blocked';renderAgora();});
 ok('G22 분부를 못 가져오면 그렇다고',/분부를 못 가져왔다/.test(await p.$eval('#agnotice',e=>e.textContent))&&/notices blocked/.test(await p.$eval('#agnotice',e=>e.textContent)));
 await p.evaluate(()=>{AG.ntErr='';AG.nt=null;agLoadNotices();}); await p.waitForTimeout(400);

 /* ── H) 단계 · 달 ── */
 const po=await p.evaluate(()=>{const full=agOf('2026-09','review').length;agSetPhase('mid');
   const mid=agOf('2026-09','review').length;agSetPhase('full');return {full,mid};});
 ok('H1 옛 글(phase 없음)은 그믐으로 센다',po.full===6,String(po.full));
 ok('H2 보름으로 넘기면 옛 글이 안 섞인다',po.mid===0,String(po.mid));
 await p.waitForTimeout(300);
 const fr=await p.evaluate(()=>window.__rpc.filter(x=>x.fn==='agora_facts'));
 ok('H3 숫자에 단계를 넘긴다',fr.some(x=>x.args.p_phase==='mid')&&fr.some(x=>x.args.p_phase==='full'));
 await p.click('#v-agora .agst.all'); await p.waitForTimeout(200);
 await pick('2026-08'); t=await txt();
 ok('H4 8월은 8월 글만',/8월 총평이다/.test(t)&&!/배달 12→5건/.test(t));
 ok('H5 8월 숫자는 9월 것을 쓰지 않는다',/불러오는 중/.test(await p.$eval('#agfacts',e=>e.textContent))&&!/2026-09-01/.test(t));
 await pick('2026-07'); t=await txt();
 ok('H6 아무도 안 아뢴 지난 차례는 어떻게 시작하는지 적는다',/월말평가 남겨/.test(t)&&/agora_review\(\)/.test(t));
 ok('H7 📋 한 줄은 단계에 맞는 함수',await p.evaluate(()=>/agora_review\(/.test(agLine('2026-07'))));
 await pick('2026-09');

 /* ── U) 🕐 안 온 차례 · 없던 차례를 「미제출」이라 부르지 않는다 ── */
 const when=await p.evaluate(()=>({지난:agWhen('2026-09','full'),안온:agWhen('2026-10','full'),중간:agWhen('2026-10','mid'),
   없던:agWhen('2026-09','mid'),미래:agWhen('2026-11','full')}));
 ok('U1 지난 차례는 past',when.지난==='past',JSON.stringify(when));
 ok('U2 안 온 차례는 soon',when.안온==='soon'&&when.중간==='soon'&&when.미래==='soon',JSON.stringify(when));
 ok('U3 중간평가가 없던 달은 none',when.없던==='none',JSON.stringify(when));
 ok('U4 지난 차례엔 안내 띠가 없다',(await q('.agsoon'))===0,String(await q('.agsoon')));
 await p.evaluate(()=>{AG.ym=null;AG.phase=null;DB.ui.agYm='2026-10';DB.ui.agPhase='full';renderAgora();}); await p.waitForTimeout(300);
 const soon=await p.evaluate(()=>({띠:[...document.querySelectorAll('.agsoon')].map(e=>e.textContent).join(' '),
   자리:[...document.querySelectorAll('#v-agora .agst.empty')].map(e=>e.textContent),
   줄:[...document.querySelectorAll('#agfolio .agrow.empty .aglead')].map(e=>e.textContent)}));
 ok('U5 안 온 차례는 그렇다고 적는다',/아직 오지 않은 차례/.test(soon.띠)&&/아무도 쓸 수 없다/.test(soon.띠),soon.띠.slice(0,60));
 ok('U6 🔒 빈 자리 이름표가 「미제출」이 아니다',soon.자리.length===7&&soon.자리.every(x=>/아직/.test(x)&&!/미제출/.test(x)),JSON.stringify(soon.자리.slice(0,2)));
 ok('U7 조회 줄도 「미제출」이라 하지 않는다',soon.줄.length===7&&soon.줄.every(x=>/아직 오지 않은 차례다/.test(x)),JSON.stringify(soon.줄[0]));
 await p.evaluate(()=>{AG.ym=null;AG.phase=null;DB.ui.agYm='2026-09';DB.ui.agPhase='mid';renderAgora();}); await p.waitForTimeout(300);
 const none=await p.evaluate(()=>{const bt=[...document.querySelectorAll('.agph button')].find(x=>/보름/.test(x.textContent));
   return {띠:[...document.querySelectorAll('.agsoon')].map(e=>e.textContent).join(' '),막힘:!!(bt&&bt.disabled),보임:!!bt,
     자리:[...document.querySelectorAll('#v-agora .agst.empty')].map(e=>e.textContent),
     줄:[...document.querySelectorAll('#agfolio .agrow.empty .aglead')].map(e=>e.textContent)};});
 ok('U8 없던 차례는 그렇다고 적는다',/없던 차례/.test(none.띠)&&/제도가 없었다/.test(none.띠),none.띠.slice(0,50));
 ok('U9 보름 단추는 막히되 보인다',none.막힘&&none.보임,JSON.stringify(none));
 ok('U10 자리·줄도 없던 차례라고 말한다',none.자리.every(x=>/없던 차례/.test(x))&&none.줄.every(x=>/없던 차례다/.test(x)),JSON.stringify([none.자리[0],none.줄[0]]));
 await p.evaluate(()=>{AG.ym=null;AG.phase=null;DB.ui.agYm='2026-09';DB.ui.agPhase='full';renderAgora();}); await p.waitForTimeout(300);

 /* ── V) 👤 글이 0건인 것과 일곱이 미제출인 것은 다르다 ── */
 await p.evaluate(()=>{USER=USER||{};USER.email="rohan@example.com";});
 const had=await p.evaluate(()=>{window.__keep=AG.posts;AG.posts=[];renderAgora();return window.__keep.length;});
 const acct=await p.evaluate(()=>({띠:[...document.querySelectorAll('.agsoon')].filter(e=>/👤/.test(e.textContent)).map(e=>e.textContent).join(' '),
   자리:document.querySelectorAll('#v-agora .agst[data-slug]:not(.all)').length}));
 ok('V1 글이 0건이면 0건이라고 말한다',/아고라 기록이 한 건도 없다/.test(acct.띠));
 ok('V2 보고 있는 계정을 적는다',/@/.test(acct.띠));
 ok('V3 명단이 계정과 무관함을 말한다',/계정과 무관하게 같게 보인다/.test(acct.띠));
 ok('V4 그래도 자리는 그려진다(숨기지 않는다)',acct.자리===7,String(acct.자리));
 await p.evaluate(()=>{AG.posts=window.__keep;renderAgora();});
 ok('V5 글이 있으면 그 안내는 사라진다',(await p.evaluate(()=>[...document.querySelectorAll('.agsoon')].filter(e=>/한 건도 없다/.test(e.textContent)).length))===0&&had>0);
 ok('V6 바닥에 보고 있는 계정을 늘 적는다',/@/.test(await p.evaluate(()=>{footWho();return document.getElementById('footWho').textContent;})));

 /* ── X) ⏱ 끝나지 않는 것도 실패다 ── */
 const stuck=await p.evaluate(()=>{AG.mem=null;AG.loading=true;renderAgora();
   const bb=[...document.querySelectorAll('#v-agora button')].filter(x=>/다시 시도/.test(x.textContent));
   return {안내:/불러오는 중/.test(document.getElementById('v-agora').textContent),손잡이:bb.length,
     이유:/응답이 멈춘 것이다/.test(document.getElementById('v-agora').textContent)};});
 ok('X1 불러오는 중에도 다시 시도 손잡이',stuck.손잡이===1,JSON.stringify(stuck));
 ok('X2 오래 걸리면 이유를 적겠다고 미리 말한다',stuck.안내&&stuck.이유);
 const dead=await p.evaluate(async()=>{window.__from=SB.from;AG_WAIT=250;
   SB.from=function(t){if(t==='agora_members')return {select:function(){return {order:function(){return new Promise(function(){});}};}};return window.__from(t);};
   AG.mem=null;AG.loading=false;AG.err='';agLoad();await new Promise(r=>setTimeout(r,900));
   return {err:AG.err,loading:AG.loading,화면:document.getElementById('v-agora').textContent};});
 ok('X3 끝나지 않으면 실패로 적는다',/응답하지 않는다/.test(dead.err)&&/agora_members/.test(dead.err)&&/다시 로그인/.test(dead.err),dead.err.slice(0,60));
 ok('X4 🔒 AG.loading 이 박히지 않는다',dead.loading===false);
 ok('X5 영원히 「불러오는 중」에 머물지 않는다',!/불러오는 중…/.test(dead.화면.slice(0,400)),dead.화면.slice(0,120));
 const back2=await p.evaluate(async()=>{SB.from=window.__from;AG_WAIT=12000;AG.mem=null;AG.loading=false;AG.err='';agLoad();
   await new Promise(r=>setTimeout(r,600));return {mem:(AG.mem||[]).length,err:AG.err};});
 ok('X6 막힌 게 풀리면 다시 불러온다',back2.mem>=7&&!back2.err,JSON.stringify(back2));
 await p.waitForTimeout(300);

 /* ── Y) 🔒 AG.posts===null(아직 모름)과 [](없음)을 가른다 ── */
 const slow=await p.evaluate(async()=>{window.__from=SB.from;let 풀기;
   SB.from=function(t){if(t==='agora_posts')return {select:function(){return {order:function(){
     return new Promise(function(res){풀기=function(){res({data:window.__keep2,error:null});};});}};}};return window.__from(t);};
   window.__keep2=AG.posts;AG.mem=null;AG.posts=null;AG.loading=false;AG.err='';agLoad();
   await new Promise(r=>setTimeout(r,500));renderAgora();
   const 중간={mem:AG.mem?AG.mem.length:null,posts:AG.posts,화면:document.getElementById('v-agora').textContent,
     자리:document.querySelectorAll('#v-agora .agst[data-slug]').length};
   풀기();await new Promise(r=>setTimeout(r,500));SB.from=window.__from;
   return {중간,끝:{posts:(AG.posts||[]).length,자리:document.querySelectorAll('#v-agora .agst[data-slug]:not(.all)').length}};});
 ok('Y1 🔒 명단만 왔을 땐 회의석을 그리지 않는다',slow.중간.mem>0&&slow.중간.자리===0,slow.중간.mem+'/'+slow.중간.자리);
 ok('Y2 아직 안 받은 글은 null 이다(0건이 아니다)',slow.중간.posts===null);
 ok('Y3 그동안 불러오는 중이라고 말한다',/불러오는 중/.test(slow.중간.화면));
 ok('Y4 글이 오면 그린다',slow.끝.posts>0&&slow.끝.자리===7,JSON.stringify(slow.끝));
 const diag=await p.evaluate(()=>{const km=AG.mem,kp=AG.posts;AG.posts=null;const 아직=agNoneHtml();AG.posts=[];const 영건=agNoneHtml();
   AG.mem=km;AG.posts=kp;return {아직,영건};});
 ok('Y5 진단 줄도 「아직」과 「0건」을 가른다',diag.아직===''&&/0건/.test(diag.영건));
 const fail=await p.evaluate(async()=>{SB.from=function(t){if(t==='agora_posts')return {select:function(){return {order:function(){
     return Promise.resolve({data:null,error:{message:'끊김'}});}};}};return window.__from(t);};
   AG.mem=null;AG.posts=null;AG.loading=false;AG.err='';agLoad();await new Promise(r=>setTimeout(r,600));
   const out={posts:AG.posts,화면:document.getElementById('v-agora').textContent};
   SB.from=window.__from;AG.mem=null;AG.posts=null;AG.loading=false;AG.err='';agLoad();await new Promise(r=>setTimeout(r,600));return out;});
 ok('Y6 실패하면 빈 것으로 확정한다',Array.isArray(fail.posts)&&fail.posts.length===0);
 ok('Y7 🔒 실패가 「불러오는 중」에 가려지지 않는다',/끊김/.test(fail.화면)&&!/불러오는 중…/.test(fail.화면.slice(0,300)));
 await p.waitForTimeout(300);

 /* ── Z) 😠 🔒 ③ 어떤 어조 · 어떤 상태에서도 그려진다 ── */
 const zf=await p.evaluate(()=>{const bad=[];
   ['plain','praise','worry','grave','plead','엉뚱한값',undefined].forEach(function(t){['ok','na','no'].forEach(function(s){
     try{agFigure(agLookOf('suyeon'),s,{tone:t,bare:1});agFigure(agLookOf('maker'),s,{tone:t,notice:true,star:true});}catch(e){bad.push(t+'/'+s+': '+e.message);}});});
   return bad;});
 ok('Z1 다섯 어조 × 세 상태 — 초상이 그려진다',zf.length===0,JSON.stringify(zf));
 const zr=await p.evaluate(()=>{const keep=AG.posts.map(x=>x.tone),bad=[];
   ['praise','worry','grave','plead','plain'].forEach(function(t){
     AG.posts.forEach(function(x){x.tone=t;});
     ['',...agSeats().map(m=>m.slug)].forEach(function(s){
       try{DB.ui.agSel=s;renderAgora();
         if(!document.querySelectorAll('#v-agora .agst[data-slug]').length)bad.push(t+'/'+s+': 회의석 0');
         if(!document.querySelector('#agfolio .agin').textContent.trim())bad.push(t+'/'+s+': 양피지 빔');}
       catch(e){bad.push(t+'/'+s+': '+e.message);}});});
   AG.posts.forEach(function(x,i){x.tone=keep[i];});DB.ui.agSel='';renderAgora();return bad;});
 ok('Z2 어느 어조로 아뢰어도 회의석·조회·상소가 다 그려진다',zr.length===0,JSON.stringify(zr.slice(0,3)));

 /* ── W) 다섯 폭 — 옆 넘침 0 · 10.5px 미만 0 · 높이 ── */
 const W5=[[1536,820],[1280,720],[1280,854],[854,1280],[360,780]];
 const measure=()=>p.evaluate(()=>{
   const box=document.getElementById('v-agora');
   const small=[...box.querySelectorAll('*')].filter(e=>{
     if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return false;
     if(e.closest('svg'))return false;
     const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
     return own&&parseFloat(getComputedStyle(e).fontSize)<10.5;}).map(e=>e.className+':'+getComputedStyle(e).fontSize+':'+e.textContent.slice(0,12));
   return {over:document.documentElement.scrollWidth-window.innerWidth,small};});
 for(const [w,h] of W5){
   await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(350);
   await p.evaluate(()=>{DB.ui.agSel='';renderAgora();window.scrollTo(0,0);}); await p.waitForTimeout(250);
   const m0=await measure();
   await p.evaluate(()=>{DB.ui.agSel='cardio';AG_UI.own={};renderAgora();}); await p.waitForTimeout(250);
   const m1=await measure();
   ok('W'+w+'x'+h+' 옆 넘침 0 · 10.5px 미만 글자 0 (조회·상소)',m0.over<=0&&m1.over<=0&&!m0.small.length&&!m1.small.length,
      JSON.stringify({o:[m0.over,m1.over],s:m0.small.concat(m1.small).slice(0,4)}));
   /* 🔒 1000px 이상 — 어느 가신을 열어도 회의석이 화면에 남는다(양피지가 안에서 구른다) */
   const keepB=await p.evaluate(async()=>{const f=document.getElementById('agfolio');f.scrollTop=f.scrollHeight;
     window.scrollTo(0,document.body.scrollHeight);await new Promise(r=>setTimeout(r,120));
     const b=document.getElementById('agbench').getBoundingClientRect();
     return {top:Math.round(b.top),bot:Math.round(b.bottom),vh:window.innerHeight,inner:f.scrollHeight>f.clientHeight+2,pageY:Math.round(window.scrollY)};});
   ok('W'+w+'x'+h+' 🔒 글을 끝까지 굴려도 회의석이 화면에 남는다',keepB.top>=0&&keepB.bot<=keepB.vh,JSON.stringify(keepB));
   if(w>=1000)ok('W'+w+'x'+h+' 양피지가 안에서 구르고 페이지는 안 구른다',keepB.inner&&keepB.pageY<=2,JSON.stringify(keepB));
   await p.evaluate(()=>{DB.ui.agSel='';renderAgora();window.scrollTo(0,0);}); await p.waitForTimeout(200);
 }
 /* 🔒 1536×820 조회에서 아뢴 여섯 줄이 스크롤 없이 · 1280×720 은 다섯 */
 for(const [w,h,need] of [[1536,820,6],[1280,720,5]]){
   await p.setViewportSize({width:w,height:h}); await p.waitForTimeout(350);
   await p.evaluate(()=>{DB.ui.agSel='';renderAgora();window.scrollTo(0,0);}); await p.waitForTimeout(250);
   const vis=await p.evaluate(()=>{const f=document.getElementById('agfolio').getBoundingClientRect();
     return [...document.querySelectorAll('#agfolio .agrow:not(.empty)')].filter(r=>{const b=r.getBoundingClientRect();return b.top>=f.top-1&&b.bottom<=f.bottom+1&&b.bottom<=window.innerHeight;}).length;});
   ok('W'+w+'x'+h+' 조회 — 아뢴 가신 '+need+'줄이 스크롤 없이 보인다',vis>=need,String(vis));
 }
 /* 폰 — 회의석은 옆으로 구르고 위에 붙는다 */
 await p.setViewportSize({width:360,height:780}); await p.waitForTimeout(300);
 await p.evaluate(()=>renderAgora()); await p.waitForTimeout(200);
 const ph=await p.evaluate(()=>{const b=document.getElementById('agbench');return {pos:getComputedStyle(b).position,sx:b.scrollWidth>b.clientWidth,ox:getComputedStyle(b).overflowX};});
 ok('W폰 회의석이 옆으로 구르고 위에 붙는다',ph.pos==='sticky'&&ph.sx&&ph.ox==='auto',JSON.stringify(ph));
 /* 🔒 다시 그려져도 읽던 자리를 지킨다 — 숫자·분부가 늦게 와서 다시 그려질 때 맨 위로 튀지 않는다 */
 await p.setViewportSize({width:1536,height:820}); await p.waitForTimeout(300);
 const keepS=await p.evaluate(async()=>{DB.ui.agSel='cardio';renderAgora();const f=document.getElementById('agfolio');f.scrollTop=400;
   renderAgora();await new Promise(r=>setTimeout(r,50));return document.getElementById('agfolio').scrollTop;});
 ok('W 다시 그려져도 읽던 자리를 지킨다',keepS>=390,String(keepS));

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 const F=R.filter(r=>!r.v);
 if(F.length)console.error(F.map(r=>'✗ '+r.n+(r.x?'  → '+r.x:'')).join('\n'));
 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
