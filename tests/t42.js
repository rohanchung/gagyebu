/* t42 — 🎓 학습 v3.0 (제로베이스 · 기획서 v5)
   🔒 불변식 여섯:
      ① 장소로 과제를 고른다. 다른 채널 과제는 **지우지 않고 흐리게** 남긴다.
      ② 학습시간은 timelog 의 tag **또는 tag2**. tag 만 보면 0 시간이 나온다.
      ③ 과락은 총점과 독립. 안 친 과목을 0 으로 치지 않는다.
      ④ 오답은 **2회 연속** 맞아야 회수. X 하나면 0.
      ⑤ 체크는 켜고 끄기 둘 다 된다. 오늘 끝낸 것은 목록에 남는다.
      ⑥ 빈 상태(units·errors·tests 전부 [])에서 죽지 않는다 — 지금이 그 상태였다.
   🚫 문항 본문·채점 엔진은 없다. 출제·채점은 대화방에서 한다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const T=async p=>await p.evaluate(()=>todayStr());

const EXAM={name:'JLPT N4',date:'2026-12-06',enterBy:'13:40',pass:90,
  parts:[{k:'lang',label:'언어지식·독해',max:120,cut:38,goal:60},
         {k:'listen',label:'청해',max:60,cut:19,goal:40}]};
const BASE=(st)=>Object.assign({schemaVersion:7,ui:{month:'2026-09'},
 study:{v:1,exam:JSON.parse(JSON.stringify(EXAM)),phases:[],books:[],units:[],
        week:{},month:{},tests:[],errors:[],logs:{}},
 timelog:{},accounts:[],cards:[],categories:[],transactions:[],meals:{},checks:{},
 goals:[],routines:[],rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],
 netSnapshots:[],fixed:[],events:[],posts:[],budgets:{},debts:[],itemCats:[],
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}},st||{});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1200}});
  await c.addInitScript(({s})=>{const store={v:s};
   function mk(){let _m=null,_p=null;
    const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},
     eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
     update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;return Promise.resolve({})},
     order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
     delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
    return q;}
   window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const dlg=[];p.on('dialog',d=>{dlg.push(String(d.message()));d.accept();});
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  await p.click('.m[data-v="study"]');await p.waitForTimeout(500);
  return {b,p,errs,dlg};
}

(async()=>{
 /* ── A. 빈 상태에서 죽지 않는다 ── */
 {
  const {b,p,errs}=await boot(BASE());
  ok('A1 탭 4개',(await p.$$('#v-study .logtabs button')).length===4);   /* v3.2 단어 탭 추가 */
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('A2 모의고사 안내',txt.indexOf('모의고사를 아직 안 쳤다')>=0);
  ok('A3 미측정 2개',(txt.match(/미측정/g)||[]).length===2,txt.slice(0,200));
  ok('A4 D-day',/D-\d+/.test(txt));
  ok('A5 phase 없으면 알린다',txt.indexOf('구간(phase)이 설정되지 않았다')>=0);
  for(const t of ['err','rec','word','home']){await p.evaluate(x=>setStTab(x),t);await p.waitForTimeout(250);}
  ok('A6 전 탭 렌더 · 에러 0',errs.length===0,errs.join('|'));
  /* 🔒 옛 구조(cfg·plan)는 버린다 */
  ok('A7 v=1 로 표시',(await p.evaluate(()=>DB.study.v))===1);
  await b.close();
 }

 /* ── B. 옛 구조 마이그레이션 — cfg·plan 을 버린다 ── */
 {
  const st=BASE(); st.study={cfg:{exam:{name:'옛',date:'2020-01-01',pass:1,parts:[]},target:{'2026-09':6}},
    plan:{'2026-08-30':{d:{6:{a:'x',p:''}},memo:'x'}},books:[],logs:{},tests:[],errors:[]};
  const {b,p,errs}=await boot(st);
  ok('B1 cfg 삭제',(await p.evaluate(()=>DB.study.cfg))===undefined);
  ok('B2 plan 삭제',(await p.evaluate(()=>DB.study.plan))===undefined);
  ok('B3 exam 기본값 주입',(await p.evaluate(()=>DB.study.exam.pass))===90);
  ok('B4 units·week 서랍 생성',
     (await p.evaluate(()=>Array.isArray(DB.study.units)&&!!DB.study.week))===true);
  ok('B5 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── C. 학습시간 — tag2 를 빠뜨리면 0 이 나온다 ── */
 {
  const st=BASE();
  const {b,p}=await boot(st);
  const d=await T(p);
  await p.evaluate(x=>{DB.timelog[x]=[{s:22,e:23,tag:'work',tag2:'study'},{s:30,e:30,tag:'rest'}];},d);
  /* ⚠️ 로한은 근무 중 학습을 tag:'work' + tag2:'study' 로 이중 기록한다 */
  ok('C1 tag2 도 센다 (2슬롯=60분)',(await p.evaluate(x=>stMinsOn(x),d))===60,
     String(await p.evaluate(x=>stMinsOn(x),d)));
  await p.evaluate(x=>{DB.timelog[x]=[{s:10,e:11,tag:'study'}];},d);
  ok('C2 tag 도 센다',(await p.evaluate(x=>stMinsOn(x),d))===60);
  await p.evaluate(x=>{DB.timelog[x]=[{s:10,e:11,tag:'work'}];},d);
  ok('C3 study 아니면 0',(await p.evaluate(x=>stMinsOn(x),d))===0);
  ok('C4 기록 없으면 0',(await p.evaluate(()=>stMinsOn('2020-01-01')))===0);
  await b.close();
 }

 /* ── D. 채널 — 장소로 고르고, 다른 곳 것은 흐리게 남긴다 ── */
 {
  const st=BASE();
  st.study.units=[
   {id:'u1',ch:'academy',type:'vocab',title:'학원A',mins:10,due:'2026-09-13',status:'todo',carried:0},
   {id:'u2',ch:'academy',type:'kanji',title:'학원B',mins:10,due:'2026-09-10',status:'todo',carried:2},
   {id:'u3',ch:'home',type:'listen',title:'집A',mins:20,due:'2026-09-14',status:'todo',carried:0},
   {id:'u4',ch:'move',type:'vocab',title:'이동A',mins:10,due:'2026-09-13',status:'todo',carried:0}];
  const {b,p,errs}=await boot(st);
  await p.evaluate(()=>setStCh('academy'));await p.waitForTimeout(400);
  ok('D1 학원 과제 2건',(await p.evaluate(()=>stOpenUnits('academy').length))===2);
  ok('D2 마감 가까운 것부터',(await p.evaluate(()=>stOpenUnits('academy')[0].id))==='u2');
  /* 🔒 다른 채널 것을 지우지 않는다 — 있다는 건 알아야 한다 */
  ok('D3 다른 채널 2건',(await p.evaluate(()=>stOtherUnits('academy').length))===2);
  const rows=await p.$$eval('#v-study .stu',es=>es.map(e=>({dim:e.classList.contains('dim'),t:e.textContent})));
  ok('D4 다른 채널은 흐리게',rows.filter(r=>r.dim).length===2,JSON.stringify(rows.map(r=>r.dim)));
  ok('D5 이월 뱃지',(await p.$$('#v-study .stcar')).length===1);
  await p.evaluate(()=>setStCh('home'));await p.waitForTimeout(400);
  ok('D6 채널 전환',(await p.evaluate(()=>stOpenUnits('home').length))===1);
  ok('D7 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── E. unit 체크 — 켜고 끄기 · 오늘 끝낸 것은 남는다 ── */
 {
  const st=BASE();
  st.study.units=[{id:'u1',ch:'academy',type:'vocab',title:'학원A',mins:10,due:'2026-09-13',status:'todo',carried:0}];
  const {b,p,errs}=await boot(st);
  const d=await T(p);
  await p.evaluate(()=>stToggleUnit('u1'));await p.waitForTimeout(500);
  ok('E1 완료로 바뀐다',(await p.evaluate(()=>stUnitById('u1').status))==='done');
  ok('E2 완료일 기록',(await p.evaluate(()=>stUnitById('u1').doneAt))===d);
  ok('E3 logs 에 남는다',(await p.evaluate(x=>DB.study.logs[x].unitIds[0],d))==='u1');
  /* ⚠️ [결함·스크린샷] 완료하면 목록에서 사라졌다. 오늘 한 것이 안 보이면 되돌릴 수도 없다 */
  ok('E4 오늘 끝낸 것에 남는다',(await p.evaluate(()=>stDoneToday().length))===1);
  ok('E5 화면에도 보인다',(await p.$eval('#v-study',e=>e.textContent)).indexOf('오늘 끝낸 것')>=0);
  await p.evaluate(()=>stToggleUnit('u1'));await p.waitForTimeout(500);
  ok('E6 해제도 된다',(await p.evaluate(()=>stUnitById('u1').status))==='todo');
  ok('E7 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── F. 과락 — 총점이 넘어도 과락이면 불합격 ── */
 {
  const st=BASE();
  st.study.tests=[
   {id:'t1',date:'2026-09-20',kind:'mock',scope:'1차',n:0,correct:0,lang:95,listen:15,memo:''},
   {id:'t0',date:'2026-09-10',kind:'weekly',scope:'주간',n:10,correct:8,lang:null,listen:null,memo:''}];
  const {b,p,errs}=await boot(st);
  const v=await p.evaluate(()=>stMockVerdict(stLastMock()));
  ok('F1 총점 110',v.sum===110);
  ok('F2 합격선 90 을 넘는다',v.sum>90);
  ok('F3 그래도 불합격',v.pass===false);
  ok('F4 청해 과락',v.fails.length===1&&v.fails[0].k==='listen');
  ok('F5 화면에 사유',(await p.$eval('#v-study',e=>e.textContent)).indexOf('청해 과락')>=0);
  /* 🔒 주간 확인은 모의고사가 아니다 */
  ok('F6 weekly 는 mock 이 아니다',(await p.evaluate(()=>stMocks().length))===1);
  /* ⚠️ 안 친 과목을 0 으로 치지 않는다 */
  await p.evaluate(()=>{DB.study.tests[0].listen=null;renderStudy();});
  const v2=await p.evaluate(()=>stMockVerdict(stLastMock()));
  ok('F7 안 친 과목은 과락 판정 안 함',v2.fails.length===0&&v2.sum===95,JSON.stringify(v2));
  ok('F8 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── G. 오답 — 2회 연속이어야 회수 ── */
 {
  const st=BASE();
  st.study.errors=[
   {id:'e1',testId:'t1',date:'2026-09-08',kind:'kanji',q:'安全',myAns:'あんてい',ans:'あんぜん',note:'',hits:0,lastSeen:null,cleared:false},
   {id:'e2',testId:'t1',date:'2026-09-08',kind:'vocab',q:'あせ',myAns:'—',ans:'땀',note:'',hits:0,lastSeen:null,cleared:false}];
  const {b,p,errs}=await boot(st);
  await p.evaluate(()=>setStTab('err'));await p.waitForTimeout(400);
  await p.evaluate(()=>stErrHit('e1',1));await p.waitForTimeout(400);
  ok('G1 1회로는 회수 안 됨',(await p.evaluate(()=>stErrById('e1').cleared))===false);
  await p.evaluate(()=>stErrHit('e1',1));await p.waitForTimeout(400);
  ok('G2 2회 연속이면 회수',(await p.evaluate(()=>stErrById('e1').cleared))===true);
  await p.evaluate(()=>stErrHit('e1',0));await p.waitForTimeout(400);
  ok('G3 틀리면 0 으로',(await p.evaluate(()=>stErrById('e1').hits))===0);
  ok('G4 미회수 2건',(await p.evaluate(()=>stErrOpen().length))===2);
  ok('G5 분류별 집계',JSON.stringify(await p.evaluate(()=>stErrCount()))==='{"kanji":1,"vocab":1}');
  /* 회독 목록 — 미회수만, 정답 없이 */
  await p.evaluate(()=>{stErrHit('e1',1);stErrHit('e1',1);});await p.waitForTimeout(400);
  await p.evaluate(()=>stErrSheet());await p.waitForTimeout(400);
  const sh=await p.$eval('#se_sheet',e=>e.value);
  ok('G6 미회수만',sh.indexOf('あせ')>=0&&sh.indexOf('安全')<0,sh);
  ok('G7 정답은 빼고',sh.indexOf('땀')<0,sh);
  await b.close();
 }

 /* ── H. 기록 저장 — mock 만 과목 점수를 받는다 ── */
 {
  const {b,p,errs}=await boot(BASE());
  const put=(kind,f)=>p.evaluate(([kind,f])=>{
    stTestModal(null);
    document.getElementById('st_kind').value=kind; stTestKindChg();
    document.getElementById('st_scope').value='범위';
    if(kind==='mock'){document.getElementById('st_p_lang').value=String(f.lang);
      if(f.listen!=null)document.getElementById('st_p_listen').value=String(f.listen);}
    else{document.getElementById('st_n').value=String(f.n);
      document.getElementById('st_c').value=String(f.c);}
    stSaveTest(null);},[kind,f]);
  await put('mock',{lang:72,listen:40});await p.waitForTimeout(500);
  const t=await p.evaluate(()=>DB.study.tests[0]);
  ok('H1 mock 저장',t.kind==='mock'&&t.lang===72&&t.listen===40,JSON.stringify(t));
  ok('H2 총점은 저장 안 함',t.n===0&&t.correct===0);
  ok('H3 합격권 판정',(await p.evaluate(()=>stMockVerdict(stLastMock()).pass))===true);
  await put('weekly',{n:10,c:8});await p.waitForTimeout(500);
  const w=await p.evaluate(()=>DB.study.tests.filter(x=>x.kind==='weekly')[0]);
  ok('H4 weekly 는 문항 축',w.n===10&&w.correct===8);
  ok('H5 weekly 에 과목 점수 없음',w.lang===null&&w.listen===null,JSON.stringify(w));
  await b.close();
 }

 /* ── I. 데일리 「학습」 탭 — 실행은 여기서 (v3.1) ── */
 {
  const st=BASE();
  const U=(id,ch,ti,mins,day,bk,stt,car)=>({id,phase:'P1',ch,type:'vocab',title:ti,mins,
    due:'2026-09-13',day,backlog:bk,status:stt,doneAt:stt==='done'?day:null,carried:car||0});
  st.study.units=[
   U('u1','academy','어제완료',5,'2026-09-08',false,'done'),
   U('u2','academy','어제미완',10,'2026-09-08',false,'todo',2),
   U('u3','academy','오늘A',20,'2026-09-09',false,'todo'),
   U('u4','move','오늘B',10,'2026-09-09',false,'todo'),
   U('u5','home','내일',20,'2026-09-10',false,'todo'),
   U('u6','home','백로그',20,null,true,'todo')];
  st.ui.goalDate='2026-09-09'; st.ui.dailyTab='study';
  const {b,p,errs}=await boot(st);
  await p.click('.m[data-v="daily"]');await p.waitForTimeout(600);
  /* 🔒 day(실행 예정일)로 거른다 — due(마감)가 아니다 */
  ok('I1 오늘 것만 2건',(await p.evaluate(()=>stUnitsOn('2026-09-09').length))===2,
     JSON.stringify(await p.evaluate(()=>stUnitsOn('2026-09-09').map(u=>u.id))));
  ok('I2 내일 것은 안 보인다',(await p.evaluate(()=>stUnitsOn('2026-09-09').some(u=>u.id==='u5')))===false);
  ok('I3 backlog 는 날짜 목록에서 빠진다',
     (await p.evaluate(()=>stUnitsOn('2026-09-09').some(u=>u.id==='u6')))===false);
  /* ⚠️ 미완은 자동 이월하지 않는다 — 그날 자리에 남고 개수만 뜬다 */
  ok('I4 밀린 것 1건',(await p.evaluate(()=>stOverdue('2026-09-09').length))===1);
  ok('I5 밀린 것이 오늘로 안 옮겨진다',(await p.evaluate(()=>stUnitById('u2').day))==='2026-09-08');
  ok('I6 어제 완료분은 밀린 것이 아니다',
     (await p.evaluate(()=>stOverdue('2026-09-09').some(u=>u.id==='u1')))===false);
  ok('I7 backlog 3섹션',(await p.evaluate(()=>stBacklog().length))===1);
  const t=await p.evaluate(()=>stWeekTally('2026-09-09'));
  ok('I8 주간 총량은 backlog 제외',t.n===5&&t.done===1,JSON.stringify(t));
  ok('I9 주간 분 합계',t.mins===65,String(t.mins));
  const txt=await p.$eval('#v-daily',e=>e.textContent);
  ok('I10 탭 진입점 노출',txt.indexOf('🎓 학습')>=0||txt.indexOf('학습')>=0);
  ok('I11 밀린 것 문구',txt.indexOf('밀린 것 1건')>=0,txt.slice(0,300));
  ok('I12 이월 규칙을 화면이 말한다',txt.indexOf('자동으로 넘어가지 않는다')>=0);
  /* 체크하면 logs 에 들어간다 */
  await p.evaluate(()=>stToggleUnit('u3'));await p.waitForTimeout(500);
  ok('I13 체크 시 logs 기록',(await p.evaluate(()=>DB.study.logs[todayStr()]&&DB.study.logs[todayStr()].unitIds.indexOf('u3')>=0))===true);
  ok('I14 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── J. day·backlog 없는 옛 unit 도 렌더된다 ── */
 {
  const st=BASE();
  st.study.units=[{id:'x1',phase:'P1',ch:'academy',type:'vocab',title:'옛유닛',mins:10,
    due:'2026-09-13',status:'todo',carried:0}];   /* day·backlog 없음 */
  const {b,p,errs}=await boot(st);
  ok('J1 day 기본값 null',(await p.evaluate(()=>DB.study.units[0].day))===null);
  ok('J2 backlog 기본값 false',(await p.evaluate(()=>DB.study.units[0].backlog))===false);
  /* ⚠️ 날짜가 없으면 데일리엔 안 뜨지만 학습 페이지 채널 목록엔 남아야 한다 */
  ok('J3 학습 페이지엔 보인다',(await p.evaluate(()=>stOpenUnits('academy').length))===1);
  ok('J4 데일리엔 안 뜬다',(await p.evaluate(()=>stUnitsOn('2026-09-09').length))===0);
  ok('J5 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }


 /* ── K. 🈶 단어 드릴 (v3.2 · 기획서 v7 PART 2) ──
    🔒 불변식 넷:
       ① 출제는 랜덤이 아니다 — miss 많은 것 → flag → 오래 안 본 것
       ② 채점은 문자열 비교로 끝난다. seen·miss·lastSeen 은 앱이 갱신한다
       ③ 드릴 오답은 errors 로 자동 승격되지 않는다(오답노트 홍수 방지)
       ④ 진행 중 세션은 DB 에 저장되지 않는다 — 끝나면 drills 1건만 남는다 */
 {
  const W=(id,kana,kanji,ko,cat,flag,seen,miss,last)=>
    ({id,lv:'N4',src:'b1:155',kana,kanji,ko,cat,flag,seen,miss,lastSeen:last});
  const st=BASE();
  st.study.words=[
   W('w1','にもつ','荷物','짐','sino',true,0,0,null),
   W('w2','あんぜん','安全','안전','sino',false,5,3,'2026-09-09'),
   W('w3','はなび','花火','불꽃놀이','native',true,2,1,'2026-09-08'),
   W('w4','ほうりつ','法律','법률','sino',false,1,0,'2026-09-07'),
   W('w5','こくさい','国際','국제','sino',false,0,0,null),
   W('w6','あせ','汗','땀','native',false,3,0,'2026-09-10')];
  const {b,p,errs,dlg}=await boot(st);
  ok('K1 탭 4개',(await p.$$('#v-study .logtabs button')).length===4);
  await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(350);
  const wtxt=await p.$eval('#v-study',e=>e.textContent);
  ok('K2 단어 수·체크 수 표시',wtxt.indexOf('6개')>=0&&wtxt.indexOf('책 체크 2')>=0,wtxt.slice(0,160));
  /* ① 🚫 랜덤 금지 — 순서가 고정이어야 한다 */
  ok('K3 출제 순서 = miss → flag → 오래된 것',
     (await p.evaluate(()=>stDrillPool('k2r').map(w=>w.id).join(','))) === 'w2,w3,w1,w5,w4,w6',
     await p.evaluate(()=>stDrillPool('k2r').map(w=>w.id).join(',')));
  /* 미구현 모드는 누를 수 없다 */
  /* v3.3 — 4모드 전부 구현됐다. 막히는 건 **낼 단어가 없는 모드**뿐이다.
     이 픽스처엔 가타카나가 없으니 kata 하나만 disabled 여야 한다. */
  ok('K4 kata 만 막혀 있다 (가타카나 0건)',(await p.$$('#v-study .stdmode button[disabled]')).length===1,
     String((await p.$$('#v-study .stdmode button[disabled]')).length));
  await p.evaluate(()=>stDrillStart('k2r',3));await p.waitForTimeout(350);
  ok('K5 3문항 · 첫 문항은 miss 최다',
     (await p.evaluate(()=>ST_DRILL.ids.join(',')))==='w2,w3,w1');
  ok('K6 보기 4개 · 정답 포함',
     (await p.evaluate(()=>ST_DRILL.opts[0].length===4&&ST_DRILL.opts[0].indexOf('あんぜん')>=0))===true,
     JSON.stringify(await p.evaluate(()=>ST_DRILL.opts[0])));
  /* 보기를 실제로 눌러서 채점된다 — 함수만 맞고 화면이 안 붙은 사고가 4회+ 있었다 */
  const btn=(await p.$$('#v-study .stdopt button'));
  let hit=null;
  for(const el of btn){if((await el.textContent()).trim()==='あんぜん')hit=el;}
  ok('K7 정답 버튼이 화면에 있다',!!hit);
  if(hit){await hit.click();await p.waitForTimeout(300);}
  ok('K8 정답 → seen+1 · miss 유지 · lastSeen 오늘',
     (await p.evaluate(()=>{const w=stWordById('w2');return w.seen===6&&w.miss===3&&w.lastSeen===todayStr();}))===true,
     JSON.stringify(await p.evaluate(()=>stWordById('w2'))));
  ok('K9 정답 표시 후엔 중복 채점 안 된다',
     (await p.evaluate(()=>{stDrillGrade('あんぜん');return stWordById('w2').seen;}))===6);
  await p.evaluate(()=>stDrillNext());await p.waitForTimeout(300);
  await p.evaluate(()=>stDrillGrade('まちがい'));await p.waitForTimeout(300);
  ok('K10 오답 → miss+1',
     (await p.evaluate(()=>{const w=stWordById('w3');return w.seen===3&&w.miss===2;}))===true,
     JSON.stringify(await p.evaluate(()=>stWordById('w3'))));
  /* ⚠️ 공백만 넣은 것은 정답이 아니다 */
  await p.evaluate(()=>stDrillNext());await p.waitForTimeout(250);
  ok('K11 빈 답은 오답',
     (await p.evaluate(()=>{stDrillGrade('   ');return !ST_DRILL.res[2].ok;}))===true);
  await p.evaluate(()=>stDrillNext());await p.waitForTimeout(400);
  ok('K12 드릴 1건 기록 · 집계 정확',
     (await p.evaluate(()=>{const d=DB.study.drills[0];
       return DB.study.drills.length===1&&d.n===3&&d.correct===1&&d.mode==='k2r'
              &&d.wrongIds.join(',')==='w3,w1'&&d.date===todayStr()&&typeof d.secs==='number';}))===true,
     JSON.stringify(await p.evaluate(()=>DB.study.drills)));
  /* ③ 🔒 오답노트 홍수 방지 — 승격은 로버트가 한다 */
  ok('K13 errors 로 자동 승격되지 않는다',(await p.evaluate(()=>DB.study.errors.length))===0);
  /* ④ 🔒 세션 상태는 저장하지 않는다 */
  ok('K14 진행 상태가 study 에 안 남는다',
     (await p.evaluate(()=>{const k=Object.keys(DB.study);
       return k.indexOf('ids')<0&&k.indexOf('res')<0&&k.indexOf('opts')<0;}))===true);
  const rtxt=await p.$eval('#v-study',e=>e.textContent);
  ok('K15 결과 화면 1/3',rtxt.indexOf('1/3')>=0,rtxt.slice(0,200));
  await p.evaluate(()=>stDrillClose());await p.waitForTimeout(300);
  ok('K16 최근 드릴 이력 노출',(await p.$eval('#v-study',e=>e.textContent)).indexOf('최근 드릴')>=0);
  ok('K17 에러 0',errs.length===0,errs.join('|'));
  ok('K18 alert 없음',dlg.length===0,dlg.join('|'));
  await b.close();
 }

 /* ── L. 단어 0개 — 빈 상태에서 입구를 만들지 않는다 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(350);
  const txt=await p.$eval('#v-study',e=>e.textContent);
  /* 🔒 콘텐츠는 학습방 소관 — 앱은 비어 있다는 사실만 정직하게 말한다 */
  ok('L1 안내문',txt.indexOf('학습방에서 올린다')>=0,txt.slice(0,160));
  ok('L2 시작 버튼 없음',(await p.$$('#v-study .stdmode button:not([disabled])')).length===0);
  ok('L3 자주 틀리는 단어 섹션 없음',txt.indexOf('자주 틀리는 단어')<0);
  /* 🔒 words 가 없어도 드릴을 강제로 호출해도 죽지 않는다 */
  ok('L4 빈 pool 에서 시작해도 안 죽는다',
     (await p.evaluate(()=>{stDrillStart('k2r',10);return ST_DRILL===null;}))===true);
  /* 데일리에도 입구가 안 생긴다 */
  await p.evaluate(()=>{DB.ui.dailyTab='study';DB.ui.goalDate=todayStr();renderDaily();});
  await p.click('.m[data-v="daily"]');await p.waitForTimeout(500);
  ok('L5 데일리에 드릴 버튼 없음',(await p.$eval('#v-daily',e=>e.textContent)).indexOf('단어 드릴')<0);
  ok('L6 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── M. words 기본값 주입 · verdict.rate 제거 ── */
 {
  const st=BASE();
  st.study.words=[{id:'w9',kana:'あめ',kanji:'雨',ko:'비'}];   /* seen·miss·lastSeen·cat·flag 없음 */
  st.study.week={'2026-09-06':{setAt:'2026-09-05',unitIds:[],carryIn:[],
    verdict:{rate:0.5,memo:'x',closedAt:null}}};
  const {b,p,errs}=await boot(st);
  const w=await p.evaluate(()=>DB.study.words[0]);
  ok('M1 seen·miss 0',w.seen===0&&w.miss===0,JSON.stringify(w));
  ok('M2 lastSeen null · flag false · cat 빈문자',w.lastSeen===null&&w.flag===false&&w.cat==='',JSON.stringify(w));
  ok('M3 drills 서랍 생성',(await p.evaluate(()=>Array.isArray(DB.study.drills)))===true);
  /* 🔒 파생 가능한 것은 저장하지 않는다 — rate 는 unitIds 에서 파생 */
  ok('M4 verdict.rate 삭제',
     (await p.evaluate(()=>{const v=DB.study.week['2026-09-06'].verdict;
       return !('rate' in v)&&v.memo==='x';}))===true,
     JSON.stringify(await p.evaluate(()=>DB.study.week['2026-09-06'].verdict)));
  ok('M5 빈 서랍 cfg·plan 이 되살아나지 않는다',
     (await p.evaluate(()=>DB.study.cfg===undefined&&DB.study.plan===undefined))===true);
  ok('M6 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }


 /* ── N. 🈶 드릴 4모드 (v3.3) — 실데이터 284건에서 나온 함정 3개 ──
    ① r2k 동음이의어: は→葉·歯 는 뜻 없이는 정답이 유일하지 않다
    ② kata 판정: 업로드 데이터의 cat 에 katakana 가 0건이었다 → kana 문자범위로 파생
    ③ 뜻 답 복수: "사이, 동안" 46건 — 전체 비교로 채점하면 아는 단어를 틀렸다고 한다 */
 {
  const W=(id,kana,kanji,ko,extra)=>Object.assign(
    {id,lv:'N4',src:'b1:150',kana,kanji,ko,cat:'native',flag:false,seen:0,miss:0,lastSeen:null},extra||{});
  /* N-1 r2k — 히라가나 → 한자 */
  {
   const st=BASE();
   st.study.words=[
    W('h1','は','葉','잎',{miss:5,homophone:true}),
    W('h2','は','歯','이빨',{homophone:true}),
    W('h3','あめ','雨','비'),W('h4','あし','足','발, 다리'),
    W('h5','あす','明日','내일'),W('h6','あせ','汗','땀')];
   const {b,p,errs}=await boot(st);
   ok('N1 r2k pool = 한자·읽기 있는 것',(await p.evaluate(()=>stDrillPool('r2k').length))===6);
   await p.evaluate(()=>stDrillStart('r2k',3));await p.waitForTimeout(350);
   ok('N2 첫 문항은 miss 최다',(await p.evaluate(()=>ST_DRILL.ids[0]))==='h1');
   const q=await p.$eval('#v-study .stdq',e=>e.textContent);
   /* 🔒 뜻이 안 보이면 葉·歯 중 뭘 쓰라는지 알 수 없다 */
   ok('N3 r2k 문제에 뜻이 붙는다',q.indexOf('は')>=0&&q.indexOf('잎')>=0,q.slice(0,80));
   ok('N4 정답은 그 단어의 한자',(await p.evaluate(()=>stIsRight(stWordById('h1'),'r2k','葉')))===true);
   ok('N5 동음이의어의 다른 한자는 오답',
      (await p.evaluate(()=>stIsRight(stWordById('h1'),'r2k','歯')))===false);
   ok('N6 k2r 은 뜻을 안 붙인다',(await p.evaluate(()=>stDrillHint(stWordById('h1'),'k2r')))==='');
   /* 🔒 동음이의어를 보기에 **반드시** 넣는다 — 우연에 맡기면 동음이의어 문항이 쉬운 문항이 된다.
      실데이터로 찍어 보니 歯 가 보기에 없었다(v3.3 초안 결함). */
   ok('N6a 같은 읽기의 다른 한자가 보기에 들어간다',
      (await p.evaluate(()=>ST_DRILL.opts[0].indexOf('歯')>=0))===true,
      JSON.stringify(await p.evaluate(()=>ST_DRILL.opts[0])));
   ok('N6b 정답도 보기에 있다',(await p.evaluate(()=>ST_DRILL.opts[0].indexOf('葉')>=0))===true);
   /* 뜻은 보조 텍스트가 아니라 문제의 일부다 — 전용 칸으로 뗀다 */
   ok('N6c 뜻이 전용 칸에 뜬다',
      (await p.$eval('#v-study .stdhint',e=>e.textContent.trim()))==='잎');
   ok('N7 에러 0',errs.length===0,errs.join('|'));
   await b.close();
  }
  /* N-2 kata — 가타카나 → 뜻. ⚠️ cat 을 일부러 틀리게 넣는다 */
  {
   const st=BASE();
   st.study.words=[
    W('t1','ラーメン',null,'라멘',{cat:'native',miss:4}),   /* cat 이 틀렸다 */
    W('t2','テーブル',null,'테이블',{cat:'sino'}),          /* 이것도 틀렸다 */
    W('t3','コート',null,'코트',{cat:''}),
    W('t4','パソコン',null,'컴퓨터',{cat:'katakana'}),
    W('t5','あめ','雨','비')];
   const {b,p,errs}=await boot(st);
   /* 🔒 cat 필드를 믿지 않는다 — kana 문자범위에서 파생한다 */
   ok('N8 kata pool = 가타카나 4건 (cat 무시)',
      (await p.evaluate(()=>stDrillPool('kata').map(w=>w.id).join(',')))==='t1,t2,t3,t4',
      await p.evaluate(()=>stDrillPool('kata').map(w=>w.id).join(',')));
   ok('N9 히라가나 단어는 kata 에 안 들어간다',
      (await p.evaluate(()=>stDrillPool('kata').some(w=>w.id==='t5')))===false);
   ok('N10 kata 문제는 가타카나, 정답은 뜻',
      (await p.evaluate(()=>stDrillQ(stWordById('t1'),'kata')==='ラーメン'&&stDrillA(stWordById('t1'),'kata')==='라멘'))===true);
   await p.evaluate(()=>stDrillStart('kata',2));await p.waitForTimeout(350);
   await p.evaluate(()=>stDrillGrade('라멘'));await p.waitForTimeout(300);
   ok('N11 kata 채점 · seen+1',
      (await p.evaluate(()=>{const w=stWordById('t1');return w.seen===1&&w.miss===4;}))===true);
   ok('N12 에러 0',errs.length===0,errs.join('|'));
   await b.close();
  }
  /* N-3 r2m — 히라가나 → 뜻. 복수 뜻 채점 (v3.4: w2m 폐기 → r2m·k2m 으로 분리) */
  {
   const st=BASE();
   st.study.words=[
    W('m1','あいだ','間','사이, 동안',{miss:9}),
    W('m2','あいさつ',null,'인사'),          /* 한자 없음 */
    W('m3','あし','足','발, 다리'),W('m4','あめ','雨','비'),W('m5','あす','明日','내일')];
   const {b,p,errs}=await boot(st);
   /* 한자 없는 단어도 w2m 에는 들어간다 — 물을 수 있다 */
   /* r2m 은 읽기·뜻만 있으면 된다 — 한자 없는 단어도 물을 수 있다 */
   ok('N13 r2m pool 5건 (한자 없는 것 포함)',(await p.evaluate(()=>stDrillPool('r2m').length))===5);
   ok('N13a k2m 은 한자 있는 4건',(await p.evaluate(()=>stDrillPool('k2m').length))===4);
   ok('N14 k2r·r2k 은 한자 없는 것을 뺀다',
      (await p.evaluate(()=>stDrillPool('k2r').some(w=>w.id==='m2')||stDrillPool('r2k').some(w=>w.id==='m2')))===false);
   const W1=()=>p.evaluate(()=>stWordById('m1'));
   ok('N15 복수 뜻 중 하나만 맞아도 정답',
      (await p.evaluate(()=>stIsRight(stWordById('m1'),'r2m','사이')))===true);
   ok('N16 두 번째 뜻도 정답',(await p.evaluate(()=>stIsRight(stWordById('m1'),'r2m','동안')))===true);
   ok('N17 4지선다의 전체 문자열도 정답',
      (await p.evaluate(()=>stIsRight(stWordById('m1'),'r2m','사이, 동안')))===true);
   ok('N18 공백 무시',(await p.evaluate(()=>stIsRight(stWordById('m1'),'r2m',' 사이 ')))===true);
   ok('N19 틀린 뜻은 오답',(await p.evaluate(()=>stIsRight(stWordById('m1'),'r2m','비')))===false);
   ok('N20 빈 답은 오답',(await p.evaluate(()=>stIsRight(stWordById('m1'),'r2m','')))===false);
   /* ⚠️ k2r 은 부분 일치를 쓰지 않는다 — 읽기는 통째로 맞아야 한다 */
   ok('N21 k2r 은 부분 일치 금지',
      (await p.evaluate(()=>stIsRight(stWordById('m3'),'k2r','あ')))===false);
   await p.evaluate(()=>stDrillStart('r2m',2));await p.waitForTimeout(350);
   await p.evaluate(()=>stDrillGrade('사이'));await p.waitForTimeout(300);
   ok('N22 드릴에서도 부분 일치가 정답으로 잡힌다',
      (await p.evaluate(()=>ST_DRILL.res[0].ok))===true);
   await p.evaluate(()=>{stDrillNext();stDrillGrade('x');stDrillNext();});await p.waitForTimeout(400);
   ok('N23 mode 가 기록된다',(await p.evaluate(()=>DB.study.drills[0].mode))==='r2m');
   ok('N24 에러 0',errs.length===0,errs.join('|'));
   await b.close();
  }
 }

 /* ── O. 모드 기억 · pool 0 모드 차단 ── */
 {
  const W=(id,kana,kanji,ko)=>({id,lv:'N4',src:'b1:150',kana,kanji,ko,cat:'native',
    flag:false,seen:0,miss:0,lastSeen:null});
  const st=BASE();
  st.study.words=[W('a1','あめ','雨','비'),W('a2','あし','足','발'),
    W('a3','あす','明日','내일'),W('a4','あせ','汗','땀')];
  st.study.units=[{id:'u1',phase:'P1',ch:'academy',type:'vocab',title:'오늘것',mins:10,
    due:'2026-09-13',day:'2026-09-11',backlog:false,status:'todo',carried:0}];
  st.ui.goalDate='2026-09-11'; st.ui.dailyTab='study';
  const {b,p,errs}=await boot(st);
  /* v3.4 — 기본은 r2m(학습방이 지목한 최대 약점). a2m 은 TTS 가 없으면 화면에서 사라진다 */
  ok('O1 기본 모드는 r2m',(await p.evaluate(()=>stdMode()))==='r2m');
  ok('O1a TTS 없으면 음성 카드가 없다',
     (await p.evaluate(()=>stTtsReady()))===false&&
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('음성 → 뜻')<0);
  /* 🔒 가타카나가 0건이면 그 모드는 disabled — 누르면 빈 화면이 되는 입구는 안 만든다 */
  const dis=await p.evaluate(()=>{setStTab('word');return null;});
  await p.waitForTimeout(300);
  ok('O2 kata 는 막혀 있다 (0건)',(await p.$$('#v-study .stdmode button[disabled]')).length===1,
     String((await p.$$('#v-study .stdmode button[disabled]')).length));
  ok('O3 나머지 4모드는 열려 있다',
     (await p.$$('#v-study .stdmode button:not([disabled])')).length===4,
     String((await p.$$('#v-study .stdmode button:not([disabled])')).length));
  await p.evaluate(()=>setStdMode('k2m'));await p.waitForTimeout(300);
  ok('O4 고른 모드를 기억한다',(await p.evaluate(()=>stdMode()))==='k2m');
  ok('O5 시작 버튼이 그 모드를 쓴다',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('한자 → 뜻')>=0);
  /* 데일리 진입점도 기억된 모드로 */
  await p.click('.m[data-v="daily"]');await p.waitForTimeout(600);
  ok('O6 데일리 버튼이 기억된 모드 표시',
     (await p.$eval('#v-daily',e=>e.textContent)).indexOf('한자 → 뜻')>=0);
  /* 쓰레기 값이 저장돼 있어도 폴백 */
  await p.evaluate(()=>{DB.ui.stdMode='없는모드';});
  /* 폐기된 w2m 이 저장돼 있어도 폴백된다 — 옛 ui 값이 화면을 깨뜨리지 않는다 */
  ok('O7 알 수 없는 모드는 r2m 로 폴백',(await p.evaluate(()=>stdMode()))==='r2m');
  await p.evaluate(()=>{DB.ui.stdMode='w2m';});
  ok('O7a 폐기된 w2m 도 폴백',(await p.evaluate(()=>stdMode()))==='r2m');
  ok('O8 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }


 /* ── P. 🔊 음성 모드 (v3.4) ──
    🔴 한자를 읽히면 開く 를 ひらく 로 읽어 **틀린 발음을 외운다.** 읽히는 건 언제나 kana.
    🔒 일본어 음성이 없는 기기에서는 카드 자체를 그리지 않는다. */
 {
  const W=(id,kana,kanji,ko)=>({id,lv:'N4',src:'b1:157',kana,kanji,ko,cat:'native',
    flag:false,seen:0,miss:0,lastSeen:null,streak:0});
  const st=BASE();
  st.study.words=[W('v1','あく','開く','열리다'),W('v2','あける','開ける','열다'),
    W('v3','あげる','上げる','올리다'),W('v4','いれる','入れる','넣다'),W('v5','おちる','落ちる','떨어지다')];
  const {b,p,errs}=await boot(st);
  await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(300);
  ok('P1 음성 없으면 a2m 시작도 안 된다',
     (await p.evaluate(()=>{stDrillStart('a2m',3);return ST_DRILL===null;}))===true);
  /* 일본어 음성이 있는 기기를 흉내낸다 */
  await p.evaluate(()=>{
    window.__spoken=[];
    const V=[{lang:'en-US',name:'EN'},{lang:'ja-JP',name:'JA'}];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      getVoices(){return V;},cancel(){},speak(u){window.__spoken.push(u.text);}}});
    window.SpeechSynthesisUtterance=function(t){this.text=t;};
    renderStudy();
  });
  await p.waitForTimeout(300);
  ok('P2 음성이 생기면 카드가 나타난다',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('음성 → 뜻')>=0);
  ok('P3 ja 음성을 고른다',(await p.evaluate(()=>stTtsJa().lang))==='ja-JP');
  await p.evaluate(()=>stDrillStart('a2m',3));await p.waitForTimeout(600);
  ok('P4 a2m pool 5건',(await p.evaluate(()=>stDrillPool('a2m').length))===5);
  /* 🔴 문제 칸에 글자가 없어야 한다 — 보여주면 그냥 r2m 이다 */
  const q=await p.$eval('#v-study .stdk',e=>e.textContent.trim());
  ok('P5 문제에 단어가 안 보인다',q.indexOf('あく')<0&&q.indexOf('開')<0,q);
  /* 🔴 읽힌 것은 kana 여야 한다. 한자가 넘어가면 발음이 틀린다 */
  const spoken=await p.evaluate(()=>window.__spoken.slice());
  ok('P6 뜨면 한 번 읽는다',spoken.length===1,JSON.stringify(spoken));
  ok('P7 읽힌 건 히라가나 (한자 아님)',
     spoken[0]==='あく'&&spoken[0].indexOf('開')<0,JSON.stringify(spoken));
  /* 다시 듣기 — 청해는 한 번에 안 들린다 */
  await p.evaluate(()=>stSpeakCur());await p.waitForTimeout(200);
  ok('P8 다시 듣기가 같은 kana 를 읽는다',
     (await p.evaluate(()=>window.__spoken.length===2&&window.__spoken[1]==='あく'))===true);
  await p.evaluate(()=>stDrillGrade('열리다'));await p.waitForTimeout(300);
  ok('P9 채점된다',(await p.evaluate(()=>ST_DRILL.res[0].ok))===true);
  /* 정답 화면엔 읽기·한자·뜻이 다 나온다 */
  const shown=await p.$eval('#v-study .stdq',e=>e.textContent);
  ok('P10 정답 화면에 읽기·한자가 같이 뜬다',
     shown.indexOf('あく')>=0&&shown.indexOf('開く')>=0,shown.slice(0,120));
  await p.evaluate(()=>stDrillNext());await p.waitForTimeout(500);
  ok('P11 다음 문항도 자동 재생 (문항당 1회)',
     (await p.evaluate(()=>window.__spoken.length))===3,
     String(await p.evaluate(()=>window.__spoken.length)));
  ok('P12 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── Q. 출제 가중치 · streak (학습방 v9 확정식) ──
    score = miss*10 + (flag?3:0) + min(안 본 날수, 7)   · 동점이면 seen 적은 순
    🔒 연속 2회 정답이면 miss 를 1 깎는다 — v3.3 은 누적이라 3번 틀린 단어가 영구히 1순위였다 */
 {
  const W=(id,kana,ko,extra)=>Object.assign({id,lv:'N4',src:'b1:150',kana,kanji:null,ko,
    cat:'native',flag:false,seen:0,miss:0,lastSeen:null,streak:0},extra||{});
  const st=BASE();
  st.study.words=[
   W('q1','あめ','비',{miss:3,seen:10,lastSeen:'2026-09-11'}),   /* 30 + 0 = 30 */
   W('q2','あし','발',{flag:true,seen:2,lastSeen:'2026-09-11'}),  /* 0 + 3 + 0 = 3 */
   W('q3','あす','내일',{seen:5,lastSeen:'2026-09-01'}),          /* 0 + 0 + 7(상한) = 7 */
   W('q4','あせ','땀',{seen:1,lastSeen:null}),                    /* 미출제 = 7, seen 1 */
   W('q5','あく','열리다',{seen:9,lastSeen:null})];                /* 미출제 = 7, seen 9 */
  const {b,p,errs}=await boot(st);
  const sc=await p.evaluate(()=>{const f={};stWords().forEach(w=>f[w.id]=stWordScore(w,'2026-09-11'));return f;});
  ok('Q1 miss 가 10배로 지배한다',sc.q1===30,JSON.stringify(sc));
  ok('Q2 flag 는 3점',sc.q2===3,JSON.stringify(sc));
  ok('Q3 안 본 날수는 7에서 멈춘다',sc.q3===7,JSON.stringify(sc));
  ok('Q4 lastSeen 이 null 이면 7',sc.q4===7&&sc.q5===7,JSON.stringify(sc));
  const order=await p.evaluate(()=>stDrillPool('r2m').map(w=>w.id).join(','));
  /* q1(30) → 7점 동점 3건은 seen 적은 순(q4:1 → q3:5 → q5:9) → q2(3) */
  ok('Q5 정렬 = score 내림 → seen 오름',order==='q1,q4,q3,q5,q2',order);
  /* 🔒 miss=0 단어가 영영 안 나오는 문제가 해결됐는지 — 경과일이 정렬을 주도한다 */
  ok('Q6 오늘 본 단어는 뒤로 밀린다',order.indexOf('q2')>order.indexOf('q3'));
  /* streak — 3번 틀린 단어는 6번 연속 맞혀야 0 */
  await p.evaluate(()=>stDrillStart('r2m',1));await p.waitForTimeout(300);
  ok('Q7 첫 문항은 miss 최다',(await p.evaluate(()=>ST_DRILL.ids[0]))==='q1');
  await p.evaluate(()=>stDrillGrade('비'));await p.waitForTimeout(250);
  ok('Q8 1회 정답: streak 1, miss 그대로',
     (await p.evaluate(()=>{const w=stWordById('q1');return w.streak===1&&w.miss===3&&w.seen===11;}))===true,
     JSON.stringify(await p.evaluate(()=>stWordById('q1'))));
  await p.evaluate(()=>{stDrillStart('r2m',1);});await p.waitForTimeout(300);
  await p.evaluate(()=>stDrillGrade('비'));await p.waitForTimeout(250);
  ok('Q9 2회 연속 정답: miss −1, streak 리셋',
     (await p.evaluate(()=>{const w=stWordById('q1');return w.streak===0&&w.miss===2;}))===true,
     JSON.stringify(await p.evaluate(()=>stWordById('q1'))));
  await p.evaluate(()=>{stDrillStart('r2m',1);});await p.waitForTimeout(300);
  await p.evaluate(()=>stDrillGrade('틀린답'));await p.waitForTimeout(250);
  ok('Q10 오답: miss+1, streak 0',
     (await p.evaluate(()=>{const w=stWordById('q1');return w.miss===3&&w.streak===0;}))===true);
  /* miss 하한 0 */
  await p.evaluate(()=>{const w=stWordById('q2');w.miss=0;w.streak=1;
    stDrillStart('r2m',1);});await p.waitForTimeout(300);
  await p.evaluate(()=>{const w=stWordById(ST_DRILL.ids[0]);w.miss=0;w.streak=1;
    stDrillGrade(String(w.ko).split(',')[0]);});await p.waitForTimeout(250);
  ok('Q11 miss 는 0 아래로 안 내려간다',
     (await p.evaluate(()=>stWords().every(w=>(+w.miss||0)>=0)))===true);
  ok('Q12 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── R. 🔴 동음이의어 — 소리로 뜻을 물으면 정답이 둘이다 ──
    실데이터 313건에 5쌍. 하나만 정답으로 치면 **맞는 답이 오답으로 기록되고
    miss 가 올라가고 출제 알고리즘이 그 문제를 계속 낸다.** */
 {
  const W=(id,kana,kanji,ko)=>({id,lv:'N4',src:'b1:157',kana,kanji,ko,cat:'native',
    flag:false,seen:0,miss:0,lastSeen:null,streak:0,homophone:/^(おる|は)$/.test(kana)});
  const st=BASE();
  st.study.words=[
   W('r1','おる',null,'있다 (いる의 겸양어)'),
   W('r2','おる','折る','접다, 꺾다'),
   W('r3','は','葉','잎'),W('r4','は','歯','이, 치아'),
   W('r5','あめ','雨','비'),W('r6','あし','足','발, 다리'),W('r7','あす','明日','내일')];
  const {b,p,errs}=await boot(st);
  /* ① 소리 모드는 같은 읽기의 모든 뜻을 정답으로 받는다 */
  ok('R1 겸양어 뜻도 정답',(await p.evaluate(()=>stIsRight(stWordById('r2'),'r2m','있다')))===true);
  ok('R2 접다도 정답',(await p.evaluate(()=>stIsRight(stWordById('r1'),'r2m','접다')))===true);
  ok('R3 잎·치아 양쪽 정답',
     (await p.evaluate(()=>stIsRight(stWordById('r3'),'r2m','치아')&&stIsRight(stWordById('r4'),'r2m','잎')))===true);
  ok('R4 관계없는 뜻은 오답',(await p.evaluate(()=>stIsRight(stWordById('r1'),'r2m','비')))===false);
  /* ② 한자를 묻는 모드는 확장하지 않는다 — 한자가 정답을 하나로 고정한다 */
  ok('R5 r2k 는 그 단어의 한자만 정답',
     (await p.evaluate(()=>stIsRight(stWordById('r3'),'r2k','葉')&&!stIsRight(stWordById('r3'),'r2k','歯')))===true);
  ok('R6 k2m 은 확장 안 한다 (한자가 다르면 다른 단어)',
     (await p.evaluate(()=>stIsRight(stWordById('r3'),'k2m','잎')&&!stIsRight(stWordById('r3'),'k2m','치아')))===true);
  /* ③ 4지선다 보기에서 같은 읽기 단어를 빼야 한다 — 안 빼면 보기 두 개가 다 정답 */
  await p.evaluate(()=>{const w=stWordById('r1');w.miss=9;stDrillStart('r2m',1);});
  await p.waitForTimeout(350);
  const opts=await p.evaluate(()=>ST_DRILL.opts[0]);
  const first=await p.evaluate(()=>ST_DRILL.ids[0]);
  ok('R7 첫 문항이 동음이의어',first==='r1',first);
  ok('R8 보기에 같은 읽기의 다른 뜻이 없다',
     opts.indexOf('접다, 꺾다')<0,JSON.stringify(opts));
  ok('R9 보기 4개는 유지된다',opts.length===4,JSON.stringify(opts));
  /* ④ 정답 화면이 '도 정답'이라고 알려준다 — 안 알려주면 채점이 틀린 줄 안다 */
  await p.evaluate(()=>stDrillGrade('접다'));await p.waitForTimeout(300);
  const shown=await p.$eval('#v-study .stdq',e=>e.textContent);
  ok('R10 같은 읽기 안내가 뜬다',shown.indexOf('같은 읽기')>=0&&shown.indexOf('도 정답')>=0,shown.slice(0,160));
  ok('R11 맞는 답이 오답으로 안 잡힌다',
     (await p.evaluate(()=>{const w=stWordById('r1');return w.miss===9&&w.streak===1;}))===true,
     JSON.stringify(await p.evaluate(()=>stWordById('r1'))));
  ok('R12 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
