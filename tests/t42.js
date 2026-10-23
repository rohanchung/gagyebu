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

let __BR=null;
async function boot(st){
  /* ⏱ v4.48 — 🔴 여기서 **블록마다 크로미움을 새로 띄웠다**(이 파일만 29번).
     기동 ~2초 × 29 = 1분이 그냥 날아갔다. 테스트가 느린 게 아니라 **준비가 느렸다**.
     🔒 브라우저는 하나, **context 만 새로** 만든다 — 쿠키·스토리지는 context 단위라
        격리는 그대로다. 상태는 addInitScript 로 매번 새로 넣으니 섞이지 않는다.
     🔒 b 자리에 context 를 돌려준다 — 호출부의 await b.close() 가 **그대로** 돈다.
        (context 에도 close 가 있다. 호출부를 29군데 고치지 않아도 된다) */
  if(!__BR)__BR=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const b=__BR;
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
  /* ⏱ 🔒 **뜰 때까지**만 기다린다. 1500ms 를 꽉 기다릴 이유가 없다 —
     보통 300~600ms 면 뜨고, 안 뜨면 1500ms 를 기다려도 어차피 실패한다. */
  await p.goto('file://'+file);
  await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.study,null,{timeout:15000});
  await p.click('.m[data-v="study"]');await p.waitForTimeout(500);
  return {b:c,p,errs,dlg};
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
  for(const t of ['err','plan','word','home']){await p.evaluate(x=>setStTab(x),t);await p.waitForTimeout(250);}
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

 /* ── D. 채널 — 장소로 고른다.
    ⚠️ v3.7 에서 '오늘' 탭이 캘린더로 바뀌었다. 채널 **탭 필터**는 사라지고
       캘린더 우측 목록의 **칩**으로 장소를 보여준다(하루 3~4건이라 필터까지는 불필요).
       stCh·stOpenUnits·stOtherUnits 는 데일리와 함수 검증에 계속 쓴다. ── */
 {
  const st=BASE();
  const TD=new Date();
  const tds=TD.getFullYear()+'-'+String(TD.getMonth()+1).padStart(2,'0')+'-'+String(TD.getDate()).padStart(2,'0');
  st.study.units=[
   {id:'u1',ch:'academy',type:'vocab',title:'학원A',mins:10,due:'2026-09-13',day:tds,backlog:false,status:'todo',carried:0},
   {id:'u2',ch:'academy',type:'kanji',title:'학원B',mins:10,due:'2026-09-10',day:tds,backlog:false,status:'todo',carried:2},
   {id:'u3',ch:'home',type:'listen',title:'집A',mins:20,due:'2026-09-14',day:tds,backlog:false,status:'todo',carried:0},
   {id:'u4',ch:'move',type:'vocab',title:'이동A',mins:10,due:'2026-09-13',day:tds,backlog:false,status:'todo',carried:0}];
  const {b,p,errs}=await boot(st);
  await p.evaluate(()=>setStCh('academy'));await p.waitForTimeout(400);
  ok('D1 학원 과제 2건',(await p.evaluate(()=>stOpenUnits('academy').length))===2);
  ok('D2 마감 가까운 것부터',(await p.evaluate(()=>stOpenUnits('academy')[0].id))==='u2');
  /* 🔒 다른 채널 것을 지우지 않는다 — 있다는 건 알아야 한다 */
  ok('D3 다른 채널 2건',(await p.evaluate(()=>stOtherUnits('academy').length))===2);
  /* 🔒 장소는 **칩으로** 보인다 — 필터가 없어도 눈으로 고를 수 있어야 한다 */
  const sideTxt=await p.$eval('#v-study .calside',e=>e.textContent);
  ok('D4 우측 목록에 장소 칩이 보인다',
     ['학원','집','이동'].every(x=>sideTxt.indexOf(x)>=0),sideTxt.slice(0,160));
  ok('D5 이월 뱃지',(await p.$$('#v-study .stcar')).length===1);
  await p.evaluate(()=>setStCh('home'));await p.waitForTimeout(400);
  ok('D6 채널 전환',(await p.evaluate(()=>stOpenUnits('home').length))===1);
  ok('D7 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── E. unit 체크 — 켜고 끄기 · 오늘 끝낸 것은 남는다 ── */
 {
  const st=BASE();
  const TD2=new Date();
  const tds2=TD2.getFullYear()+'-'+String(TD2.getMonth()+1).padStart(2,'0')+'-'+String(TD2.getDate()).padStart(2,'0');
  st.study.units=[{id:'u1',ch:'academy',type:'vocab',title:'학원A',mins:10,due:'2026-09-13',
    day:tds2,backlog:false,status:'todo',carried:0}];
  const {b,p,errs}=await boot(st);
  const d=await T(p);
  await p.evaluate(()=>stToggleUnit('u1'));await p.waitForTimeout(500);
  ok('E1 완료로 바뀐다',(await p.evaluate(()=>stUnitById('u1').status))==='done');
  ok('E2 완료일 기록',(await p.evaluate(()=>stUnitById('u1').doneAt))===d);
  ok('E3 logs 에 남는다',(await p.evaluate(x=>DB.study.logs[x].unitIds[0],d))==='u1');
  /* ⚠️ [결함·스크린샷] 완료하면 목록에서 사라졌다. 오늘 한 것이 안 보이면 되돌릴 수도 없다 */
  ok('E4 오늘 끝낸 것에 남는다',(await p.evaluate(()=>stDoneToday().length))===1);
  /* ⚠️ [결함·스크린샷] v3.0 에서 완료하면 목록에서 사라졌다. 오늘 한 것이 안 보이면 되돌릴 수도 없다.
     v3.7 캘린더에선 같은 날짜 목록에 **완료 표시로 남는다** — 섹션을 따로 두지 않는다 */
  ok('E5 완료한 것이 목록에 남아 있다',(await p.$$('#v-study .calside .stu.done')).length===1,
     String((await p.$$('#v-study .calside .stu')).length));
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
    ({id,lv:'N4',src:'b1:155',kana,kanji,ko,cat,flag,seen,miss,streak:0,lastSeen:last});
  const ago=(n)=>{const d=new Date(Date.now()-n*86400000);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const st=BASE();
  st.study.words=[
   /* ⚠️ v3.6 — 미출제(seen 0)는 100점 + 동점 랜덤이라 **순서가 안 정해진다.**
      순서를 검증하는 픽스처는 전부 seen>0 · lastSeen 제각각으로 둬야 결정적이 된다. */
   W('w1','にもつ','荷物','짐','sino',true,4,0,ago(3)),
   W('w2','あんぜん','安全','안전','sino',false,5,3,ago(1)),
   W('w3','はなび','花火','불꽃놀이','native',true,2,1,ago(2)),
   W('w4','ほうりつ','法律','법률','sino',false,1,0,ago(5)),
   W('w5','こくさい','国際','국제','sino',false,6,0,ago(4)),
   W('w6','あせ','汗','땀','native',false,3,0,ago(0))];
  const {b,p,errs,dlg}=await boot(st);
  ok('K1 탭 4개',(await p.$$('#v-study .logtabs button')).length===4);
  await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(350);
  const wtxt=await p.$eval('#v-study',e=>e.textContent);
  ok('K2 단어 수·체크 수 표시',wtxt.indexOf('6개')>=0&&wtxt.indexOf('책 체크 2')>=0,wtxt.slice(0,160));
  /* ① 🚫 랜덤 금지 — 순서가 고정이어야 한다.
     v3.6 식: miss*10 + 경과일(최대7). flag 는 0점이다 —
     w1·w3 가 flag:true 인데도 miss 없으면 앞으로 안 온다. */
  ok('K3 출제 순서 = miss → 오래 안 본 것 (flag 는 0점)',
     (await p.evaluate(()=>stDrillPool('k2r').map(w=>w.id).join(','))) === 'w2,w3,w4,w5,w1,w6',
     await p.evaluate(()=>stDrillPool('k2r').map(w=>w.id).join(',')));
  /* 미구현 모드는 누를 수 없다 */
  /* v3.3 — 4모드 전부 구현됐다. 막히는 건 **낼 단어가 없는 모드**뿐이다.
     이 픽스처엔 가타카나가 없으니 kata 하나만 disabled 여야 한다. */
  /* ⚠️ v3.9 — 같은 탭에 문법 칸(.gmode)이 생겼다. **단어 칸만** 세야 한다 */
  ok('K4 kata 만 막혀 있다 (가타카나 0건)',
     (await p.$$('#v-study .stdmode:not(.gmode) button[disabled]')).length===1,
     String((await p.$$('#v-study .stdmode button[disabled]')).length));
  await p.evaluate(()=>stDrillStart('k2r',3));await p.waitForTimeout(350);
  ok('K5 3문항 · 첫 문항은 miss 최다',
     (await p.evaluate(()=>ST_DRILL.ids.join(',')))==='w2,w3,w4',
     await p.evaluate(()=>ST_DRILL.ids.join(',')));
  ok('K6 보기 4개 · 정답 포함',
     (await p.evaluate(()=>ST_DRILL.opts[0].length===4&&ST_DRILL.opts[0].indexOf('あんぜん')>=0))===true,
     JSON.stringify(await p.evaluate(()=>ST_DRILL.opts[0])));
  /* 보기를 실제로 눌러서 채점된다 — 함수만 맞고 화면이 안 붙은 사고가 4회+ 있었다 */
  const btn=(await p.$$('#v-study .stdopt button'));
  let hit=null;
  for(const el of btn){if((await el.textContent()).trim()==='あんぜん')hit=el;}
  ok('K7 정답 버튼이 화면에 있다',!!hit);
  if(hit){await hit.click();await p.waitForTimeout(300);}
  ok('K8 정답 → seen+1 · miss 유지(streak 1) · lastSeen 오늘',
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
              &&d.wrongIds.join(',')==='w3,w4'&&d.date===todayStr()&&typeof d.secs==='number';}))===true,
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
   /* ⚠️ 순서가 아니라 **구성**을 본다 — v3.6 부터 미출제 동점은 랜덤으로 섞인다 */
   ok('N8 kata pool = 가타카나 4건 (cat 무시)',
      (await p.evaluate(()=>stDrillPool('kata').map(w=>w.id).sort().join(',')))==='t1,t2,t3,t4',
      await p.evaluate(()=>stDrillPool('kata').map(w=>w.id).sort().join(',')));
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
  ok('O2 kata 는 막혀 있다 (0건)',
     (await p.$$('#v-study .stdmode:not(.gmode) button[disabled]')).length===1,
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
  const W=(id,kana,kanji,ko,extra)=>Object.assign({id,lv:'N4',src:'b1:157',kana,kanji,ko,
    cat:'native',flag:false,seen:0,miss:0,lastSeen:null,streak:0},extra||{});
  const st=BASE();
  /* ⚠️ v1 이 반드시 첫 문항이어야 한다(읽힌 문자열을 검사하므로).
     미출제 동점은 랜덤이니 seen·miss 로 순서를 못 박는다. */
  st.study.words=[W('v1','あく','開く','열리다',{seen:3,miss:9,lastSeen:'2026-01-01'}),
    W('v2','あける','開ける','열다',{seen:3}),
    W('v3','あげる','上げる','올리다',{seen:3}),W('v4','いれる','入れる','넣다',{seen:3}),
    W('v5','おちる','落ちる','떨어지다',{seen:3})];
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
  /* ⚠️ 날짜를 박아 쓰면 **테스트가 며칠 뒤에 깨진다.**
     9/11 에 'lastSeen:2026-09-11'(=오늘)로 짠 걸 9/15 에 돌리자 경과일이 4일이 되어 순서가 바뀌었다.
     🔒 경과일이 정렬에 들어가는 함수는 **오늘 기준 상대 날짜**로 먹인다. */
  const ago=(n)=>{const d=new Date(Date.now()-n*86400000);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  st.study.words=[
   W('q1','あめ','비',{miss:3,seen:10,lastSeen:ago(0)}),    /* 30 + 0 = 30 */
   W('q2','あし','발',{flag:true,seen:2,lastSeen:ago(0)}),   /* 0 + 3 + 0 = 3 */
   W('q3','あす','내일',{seen:5,lastSeen:ago(10)}),          /* 0 + 0 + 7(상한) = 7 */
   W('q4','あせ','땀',{seen:1,lastSeen:null}),               /* 미출제 = 7, seen 1 */
   W('q5','あく','열리다',{seen:9,lastSeen:null})];           /* 미출제 = 7, seen 9 */
  const {b,p,errs}=await boot(st);
  const today=await p.evaluate(()=>todayStr());
  const sc=await p.evaluate((d)=>{const f={};stWords().forEach(w=>f[w.id]=stWordScore(w,d));return f;},today);
  ok('Q1 miss 가 10배로 지배한다',sc.q1===30,JSON.stringify(sc));
  /* v3.6 — flag 가중치를 뺐다(콜드스타트 편향). V 블록이 이걸 본격적으로 잠근다 */
  ok('Q2 flag 는 0점 (v3.6에서 제거)',sc.q2===0,JSON.stringify(sc));
  ok('Q3 안 본 날수는 7에서 멈춘다',sc.q3===7,JSON.stringify(sc));
  ok('Q4 lastSeen 이 null 이면 7',sc.q4===7&&sc.q5===7,JSON.stringify(sc));
  const order=await p.evaluate(()=>stDrillPool('r2m').map(w=>w.id).join(','));
  /* ⚠️ q4·q5 는 `lastSeen:null` 이지만 `seen>0` 이라 **미출제가 아니다** — 100점을 못 받는다.
     미출제 판정은 `seen==0` 이다. lastSeen 이 null 이면 경과일만 최대(7)로 잡힌다.
     q1=30 / q4·q3·q5=7(동점 → seen 오름: 1,5,9) / q2=0 */
  ok('Q5 정렬 = miss → 경과일 → seen 오름',order==='q1,q4,q3,q5,q2',order);
  /* 🔒 miss=0 단어가 영영 안 나오는 문제가 해결됐는지 — 경과일이 정렬을 주도한다 */
  ok('Q6 오늘 본 flag 단어가 꼴찌로 밀린다',order.indexOf('q2')>order.indexOf('q3'));
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


 /* ── S. 🎯 오답 선택지 규칙 · 4지선다 고정 · 「모르겠다」 (v3.5) ──
    🔴 **객관식의 난도는 오답이 100% 결정한다.**
    v3.4 는 '같은 글자수 우선 → 랜덤'이라 「いがく」에 「おちゃ·うりば·おっと」가 떴다.
    글자가 안 겹치면 눈감고 맞히고, 그러면 miss 가 안 쌓여 출제 가중식과 주간 판정이 죽는다. */
 {
  const W=(id,kana,kanji,ko,extra)=>Object.assign({id,lv:'N4',src:'b1:150',kana,kanji,ko,
    cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null},extra||{});
  const st=BASE();
  st.study.words=[
   /* 같은 한자, 다른 읽기 — k2r 1순위 오답 */
   W('s1','あく','開く','열리다',{sub:'자동사',miss:9}),
   W('s2','ひらく','開く','펴다'),
   /* 청탁 변형 대상 */
   W('s3','うでどけい','腕時計','손목시계'),
   /* 편집거리 1 무리 — 소리 모드 1순위 오답 */
   W('s4','あせ','汗','땀'),W('s5','あめ','雨','비'),W('s6','あし','足','발'),W('s7','あす','明日','내일'),
   /* 자·타동사 짝 */
   W('s8','おこる','起こる','일어나다',{sub:'자동사'}),
   W('s9','おこす','起こす','일으키다',{sub:'타동사'}),
   /* 멀리 떨어진 단어들 — 예전 로직이면 이것들이 오답으로 왔다 */
   W('s10','ゆうびんきょく','郵便局','우체국'),W('s11','れいぞうこ','冷蔵庫','냉장고'),
   W('s12','しょうがっこう','小学校','초등학교'),W('s13','うりば','売場','매장')];
  const {b,p,errs,dlg}=await boot(st);
  await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(300);

  /* ① k2r — 같은 한자의 다른 읽기가 1순위 */
  const o1=await p.evaluate(()=>stMkOpts(stWordById('s1'),'k2r',stDrillPool('k2r')));
  ok('S1 같은 한자의 다른 읽기가 보기에 들어간다',o1.indexOf('ひらく')>=0,JSON.stringify(o1));
  ok('S2 정답도 보기에 있다',o1.indexOf('あく')>=0,JSON.stringify(o1));
  /* ② 청탁·촉음 변형 — 실제로 틀린 패턴을 오답으로 만든다 */
  const vs=await p.evaluate(()=>stKanaVariants('うでどけい'));
  ok('S3 청탁 변형 생성 (うでどけい→うでとけい)',vs.indexOf('うでとけい')>=0,JSON.stringify(vs.slice(0,6)));
  ok('S4 다른 청탁도 만든다 (こくさい→こくざい)',
     (await p.evaluate(()=>stKanaVariants('こくさい').indexOf('こくざい')>=0))===true);
  ok('S5 원본은 변형 목록에 없다',vs.indexOf('うでどけい')<0);
  /* 🔒 사전에 없는 가짜 읽기가 실제 오답으로 쓰여야 한다 — もんだい1 이 원래 그렇게 낸다 */
  ok('S6 변형이 실제 오답으로 쓰인다',
     (await p.evaluate(()=>{
       const pool=stDrillPool('k2r'), real={};
       pool.forEach(x=>real[x.kana]=1);
       return stMkOpts(stWordById('s3'),'k2r',pool)
         .filter(x=>x!=='うでどけい').some(x=>!real[x]);
     }))===true,
     JSON.stringify(await p.evaluate(()=>stMkOpts(stWordById('s3'),'k2r',stDrillPool('k2r')))));

  /* ③ 오답이 정답과 가까운가 — 정량. v3.4 는 실데이터에서 3.33 이었다 */
  const far=await p.evaluate(()=>{
    function lev(a,b){a=String(a||'');b=String(b||'');const m=a.length,n=b.length;if(!m)return n;if(!n)return m;
      let cur=[];for(let j=0;j<=n;j++)cur[j]=j;
      for(let i=1;i<=m;i++){let prev=cur[0];cur[0]=i;
        for(let j=1;j<=n;j++){const t=cur[j];cur[j]=Math.min(cur[j]+1,cur[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=t;}}
      return cur[n];}
    const pool=stDrillPool('k2r');let tot=0,cnt=0;
    pool.forEach(w=>{
      stMkOpts(w,'k2r',pool).filter(o=>o!==w.kana).forEach(o=>{tot+=lev(w.kana,o);cnt++;});
    });
    return cnt?tot/cnt:99;
  });
  ok('S7 오답 평균 편집거리 2.5 이하',far<=2.5,String(Math.round(far*100)/100));

  /* ④ 소리 모드 — 읽기 1글자 차이 / 자타동사 짝 */
  const o5=await p.evaluate(()=>stMkOpts(stWordById('s4'),'r2m',stDrillPool('r2m')));
  ok('S8 읽기 1글자 차이 단어의 뜻이 오답으로 온다',
     ['비','발','내일'].some(x=>o5.indexOf(x)>=0),JSON.stringify(o5));
  const pair=await p.evaluate(()=>stPairWords(stWordById('s8'),stDrillPool('r2m')).map(x=>x.id));
  ok('S9 자·타동사 짝을 찾는다',pair.indexOf('s9')>=0,JSON.stringify(pair));
  const o6=await p.evaluate(()=>stMkOpts(stWordById('s8'),'r2m',stDrillPool('r2m')));
  ok('S10 자·타동사 짝의 반대쪽 뜻이 보기에 들어간다',o6.indexOf('일으키다')>=0,JSON.stringify(o6));

  /* ⑤ 전 모드 4지선다 고정 — 입력칸이 없다 */
  await p.evaluate(()=>stDrillStart('k2r',4));await p.waitForTimeout(350);
  ok('S11 입력칸이 없다',(await p.$$('#v-study #stdAns')).length===0);
  ok('S12 보기 버튼 4개',(await p.$$('#v-study .stdopt button')).length===4);
  ok('S13 직접입력 토글이 사라졌다',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('직접입력')<0);

  /* ⑥ 「모르겠다」 — 오답과 동일 처리. 찍기 제거가 목적 */
  const before=await p.evaluate(()=>{const w=stWordById(ST_DRILL.ids[0]);return {m:+w.miss||0,s:+w.streak||0};});
  ok('S14 모르겠다 버튼이 있다',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('모르겠다')>=0);
  await p.evaluate(()=>stDrillDunno());await p.waitForTimeout(300);
  const after=await p.evaluate(()=>{const w=stWordById(ST_DRILL.res[0].id);return {m:+w.miss||0,s:+w.streak||0};});
  ok('S15 모르겠다 = miss+1 · streak 0',after.m===before.m+1&&after.s===0,JSON.stringify({before,after}));
  ok('S16 res 에 dunno 표시',(await p.evaluate(()=>ST_DRILL.res[0].dunno))===true);
  ok('S17 오답으로 집계된다',(await p.evaluate(()=>ST_DRILL.res[0].ok))===false);

  /* ⑦ drills 에 dunno 집계 */
  for(let i=0;i<3;i++){
    await p.evaluate(()=>stDrillNext());await p.waitForTimeout(200);
    await p.evaluate(()=>{const w=stWordById(ST_DRILL.ids[ST_DRILL.i]);stDrillGrade(stDrillA(w,ST_DRILL.mode));});
    await p.waitForTimeout(200);
  }
  await p.evaluate(()=>stDrillNext());await p.waitForTimeout(400);
  ok('S18 drills 에 dunno 1건 기록',(await p.evaluate(()=>DB.study.drills[0].dunno))===1,
     JSON.stringify(await p.evaluate(()=>DB.study.drills[0])));
  ok('S19 결과 화면에 모르겠다 표시',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('모르겠다')>=0);
  await p.evaluate(()=>stDrillClose());await p.waitForTimeout(250);
  /* dunno 가 0 이면 키를 만들지 않는다 — 빈 서랍 금지 */
  await p.evaluate(()=>stDrillStart('k2r',2));await p.waitForTimeout(300);
  for(let i=0;i<2;i++){
    await p.evaluate(()=>{const w=stWordById(ST_DRILL.ids[ST_DRILL.i]);stDrillGrade(stDrillA(w,ST_DRILL.mode));});
    await p.waitForTimeout(200);
    await p.evaluate(()=>stDrillNext());await p.waitForTimeout(200);
  }
  ok('S20 dunno 0 이면 키를 안 만든다',
     (await p.evaluate(()=>!('dunno' in DB.study.drills[1])))===true,
     JSON.stringify(await p.evaluate(()=>DB.study.drills[1])));
  ok('S21 에러 0',errs.length===0,errs.join('|'));
  ok('S22 alert 없음',dlg.length===0,dlg.join('|'));
  await b.close();
 }

 /* ── T. 세트 크기 20 기본 · 단어 4개 미만이면 막는다 ── */
 {
  const W=(id,kana,kanji,ko)=>({id,lv:'N4',src:'b1:150',kana,kanji,ko,cat:'native',
    flag:false,seen:0,miss:0,streak:0,lastSeen:null});
  /* 단어 3개 — 4지선다를 못 만든다 */
  {
   const st=BASE();
   st.study.words=[W('a1','あめ','雨','비'),W('a2','あし','足','발'),W('a3','あす','明日','내일')];
   const {b,p,errs}=await boot(st);
   await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(300);
   ok('T1 4개 미만이면 시작되지 않는다',
      (await p.evaluate(()=>{stDrillStart('k2r',3);return ST_DRILL===null;}))===true);
   ok('T2 모드 카드가 전부 막혀 있다',
      (await p.$$('#v-study .stdmode button:not([disabled])')).length===0);
   ok('T3 이유를 말해준다',
      (await p.$eval('#v-study',e=>e.textContent)).indexOf('4개 이상 필요')>=0);
   ok('T4 에러 0',errs.length===0,errs.join('|'));
   await b.close();
  }
  /* 단어 30개 — 기본 20문항 */
  {
   const st=BASE();
   st.study.words=[];
   for(let i=0;i<30;i++)st.study.words.push(W('b'+i,'かな'+i,'漢'+i,'뜻'+i));
   st.ui.goalDate='2026-09-15'; st.ui.dailyTab='study';
   const {b,p,errs}=await boot(st);
   await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(300);
   ok('T5 기본 세트는 20문항',
      (await p.evaluate(()=>{stDrillStart('k2r');return ST_DRILL.ids.length;}))===20);
   await p.evaluate(()=>stDrillClose());await p.waitForTimeout(250);
   ok('T6 20문항 시작 버튼이 있다',
      (await p.$eval('#v-study',e=>e.textContent)).indexOf('20문항 시작')>=0);
   await p.click('.m[data-v="daily"]');await p.waitForTimeout(500);
   ok('T7 데일리 진입점도 20문항',
      (await p.$eval('#v-daily',e=>e.textContent)).indexOf('20문항')>=0);
   ok('T8 에러 0',errs.length===0,errs.join('|'));
   await b.close();
  }
 }


 /* ── U. 🔴 동기화 충돌 — 학습 데이터 유실 방지 (v3.6) ──
    사고: `words` 96건이 **두 번** 사라졌다. 낙관적 잠금은 정상이었고,
    충돌 확인창이 `study` 를 **비교 목록에 넣지 않아** "저쪽에만 96건"이 화면에 안 떴다.
    로한은 잃을 게 없다고 보고 덮어쓰기를 눌렀다.
    🔒 새 컬렉션을 만들면 SYNC_COLS 에 등록하는 것까지가 한 작업이다. */
 {
  const W=(id,kana,ko)=>({id,lv:'N4',src:'b1:150',kana,kanji:null,ko,cat:'native',
    flag:false,seen:0,miss:0,streak:0,lastSeen:null});
  const st=BASE();
  st.study.words=[W('w1','あめ','비'),W('w2','あし','발'),W('w3','あす','내일'),W('w4','あせ','땀')];
  const {b,p,errs}=await boot(st);
  /* ① study 가 비교 목록에 등록돼 있는가 */
  const cols=await p.evaluate(()=>SYNC_COLS.map(c=>c.p?c.p.join('.'):c.k));
  ok('U1 단어가 비교 목록에 있다',cols.indexOf('study.words')>=0,JSON.stringify(cols));
  ok('U2 문법 예문·과제·오답도 있다',
     ['study.sents','study.units','study.errors'].every(x=>cols.indexOf(x)>=0),JSON.stringify(cols));
  /* ② 중첩 경로를 읽는다 */
  ok('U3 중첩 경로를 꺼낸다',
     (await p.evaluate(()=>syncGet(DB,{p:['study','words']}).length))===4);
  /* ③ 서버에만 있는 레코드를 흡수한다 */
  const absorbed=await p.evaluate(()=>{
    const srv=JSON.parse(JSON.stringify(DB));
    srv.study.words.push({id:'w9',lv:'N4',src:'b1:158',kana:'かう',kanji:'飼う',ko:'기르다',
      cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null});
    srv.study.words.push({id:'w8',lv:'N4',src:'b1:199',kana:'そこで',kanji:null,ko:'그래서',
      cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null});
    return {n:syncAbsorb(srv),after:DB.study.words.length,ids:DB.study.words.map(w=>w.id)};
  });
  ok('U4 서버에만 있던 2건을 흡수한다',absorbed.n===2&&absorbed.after===6,JSON.stringify(absorbed));
  ok('U5 흡수된 id 가 들어왔다',absorbed.ids.indexOf('w9')>=0&&absorbed.ids.indexOf('w8')>=0);
  /* ④ 흡수 후 손실 0 — 물어볼 이유가 없다 */
  ok('U6 흡수하면 사라질 게 없다',
     (await p.evaluate(()=>{
       const srv=JSON.parse(JSON.stringify(DB));
       return syncLoss(srv);
     }))===0);
  /* ⑤ 앱이 지울 수 있는 배열은 흡수하지 않는다 — 삭제가 되살아나면 안 된다 */
  ok('U7 오답은 흡수 대상이 아니다',
     (await p.evaluate(()=>{
       const C=SYNC_COLS.filter(c=>c.p&&c.p[1]==='errors')[0];
       return !!(C&&!C.absorb);
     }))===true);
  ok('U8 단어·예문·과제는 흡수 대상이다',
     (await p.evaluate(()=>['words','sents','units'].every(k=>{
       const C=SYNC_COLS.filter(c=>c.p&&c.p[1]===k)[0]; return C&&C.absorb===true;})))===true);
  /* ⑥ 진짜 사라질 게 있으면 센다 */
  const loss=await p.evaluate(()=>{
    const srv=JSON.parse(JSON.stringify(DB));
    srv.study.errors.push({id:'e9',kind:'vocab',q:'서버에만',myAns:'',ans:'',note:'',hits:0,lastSeen:null,cleared:false});
    srv.transactions.push({id:'t9',date:'2026-09-16',amt:1000});
    return syncLoss(srv);
  });
  ok('U9 흡수 못 하는 손실은 센다 (오답1 + 거래1)',loss===2,String(loss));
  /* ⑦ diff 텍스트에 경고가 들어간다 */
  const dt=await p.evaluate(()=>{
    const srv=JSON.parse(JSON.stringify(DB));
    srv.study.errors.push({id:'e9',kind:'vocab',q:'서버에만있는오답',myAns:'',ans:'',note:'',hits:0,lastSeen:null,cleared:false});
    return syncDiffText(DB,srv);
  });
  ok('U10 diff 에 오답이 뜬다',dt.indexOf('오답')>=0,dt.slice(0,200));
  ok('U11 사라진다고 경고한다',dt.indexOf('덮어쓰면 사라진다')>=0,dt.slice(0,200));
  ok('U12 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── V. ⚖️ 출제 가중치 v12 — flag 제거 · 미출제 최우선 ──
    실측: 313건 중 출제된 47건의 91%가 flag:true, 266건이 한 번도 안 나왔다.
    초기엔 miss 가 전부 0이라 flag 가 유일한 차별 요소가 되어 영구히 박힌다. */
 {
  const W=(id,kana,ko,extra)=>Object.assign({id,lv:'N4',src:'b1:150',kana,kanji:null,ko,
    cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null},extra||{});
  const ago=(n)=>{const d=new Date(Date.now()-n*86400000);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const st=BASE();
  st.study.words=[
   W('v1','あめ','비',{flag:true,seen:5,lastSeen:ago(0)}),      /* flag 지만 출제됨 → 0 + 0 + 0 = 0 */
   W('v2','あし','발',{seen:0,lastSeen:null}),                   /* 미출제 → 100 + 0 + 7 = 107 */
   W('v3','あす','내일',{miss:3,seen:9,lastSeen:ago(0)}),        /* 0 + 30 + 0 = 30 */
   W('v4','あせ','땀',{seen:2,lastSeen:ago(10)}),                /* 0 + 0 + 7 = 7 */
   W('v5','あく','열리다',{flag:true,seen:0,lastSeen:null})];     /* 미출제 → 107 (flag 는 0점) */
  const {b,p,errs}=await boot(st);
  const today=await p.evaluate(()=>todayStr());
  const sc=await p.evaluate((d)=>{const f={};stWords().forEach(w=>f[w.id]=stWordScore(w,d));return f;},today);
  /* 🔒 flag 가 점수에 1점도 관여하지 않는다 */
  ok('V1 flag 는 점수에 관여하지 않는다',sc.v1===0,JSON.stringify(sc));
  ok('V2 미출제는 100점 + 경과일 7 = 107',sc.v2===107&&sc.v5===107,JSON.stringify(sc));
  ok('V3 miss 는 10배',sc.v3===30,JSON.stringify(sc));
  ok('V4 경과일은 7에서 멈춘다',sc.v4===7,JSON.stringify(sc));
  /* 🔒 미출제가 miss 3 보다 앞선다 — 커버리지가 먼저다 */
  const order=await p.evaluate(()=>stDrillPool('r2m').map(w=>w.id));
  ok('V5 미출제 2건이 맨 앞',['v2','v5'].indexOf(order[0])>=0&&['v2','v5'].indexOf(order[1])>=0,
     JSON.stringify(order));
  ok('V6 그 다음이 miss 최다',order[2]==='v3',JSON.stringify(order));
  ok('V7 오늘 본 flag 단어가 꼴찌',order[4]==='v1',JSON.stringify(order));
  /* 미출제 동점은 랜덤 — 같은 pool 을 여러 번 부르면 순서가 섞인다 */
  /* ⚠️ [결함·테스트] 표본이 12회였다. 동점이 2건이면 순서가 2가지뿐이라
     전부 같게 나올 확률이 2*(1/2)^12 = 약 1/2048 — CI 에서 가짜 빨간불이 뜬다.
     🔒 **거짓 실패가 한 번 뜨면 그 다음부터 아무도 CI 를 안 본다.** 표본을 40 으로 올렸다(약 2e-12). */
  const shuffled=await p.evaluate(()=>{
    const runs=[];for(let i=0;i<40;i++)runs.push(stDrillPool('r2m').slice(0,2).map(w=>w.id).join(','));
    return runs.filter((v,i,a)=>a.indexOf(v)===i).length;
  });
  ok('V8 미출제 동점은 랜덤으로 섞인다',shuffled>=2,String(shuffled));
  /* 화면이 단계를 말해준다 */
  await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(300);
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('V9 커버리지 단계라고 알린다',txt.indexOf('커버리지 단계')>=0,txt.slice(0,160));
  await p.evaluate(()=>{stWords().forEach(w=>{if(!w.seen)w.seen=1;});renderStudy();});
  await p.waitForTimeout(300);
  const txt2=await p.$eval('#v-study',e=>e.textContent);
  ok('V10 다 돌면 약점 집중 단계로 바뀐다',txt2.indexOf('약점 집중 단계')>=0,txt2.slice(0,160));
  ok('V11 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }


 /* ── W. 📅 학습 캘린더 (v3.7) — '오늘' 탭을 대체한다 ──
    🔒 가치는 제로데이 시각화다. 미달은 전부 '안 한 날'에서 나왔고 빈칸이 숫자보다 강하게 작동한다.
    🔒 계획 편집 도구가 아니다 — 미래는 3일까지만(3일 롤링 창 원칙 v6). */
 {
  const ago=(n)=>{const d=new Date(Date.now()-n*86400000);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const fwd=(n)=>ago(-n);
  const U=(id,ch,ti,day,stt)=>({id,phase:'P1',ch,type:'vocab',title:ti,mins:10,
    due:fwd(3),day,backlog:false,status:stt||'todo',carried:0});
  const st=BASE();
  st.study.units=[U('c1','academy','오늘것A',ago(0)),U('c2','home','오늘것B',ago(0),'done'),
    U('c3','move','어제것',ago(1)),U('c4','home','내일것',fwd(1)),U('c5','home','먼미래',fwd(9))];
  /* 학습 시간: timelog 1칸(30분) + 뽀모 25분 */
  st.timelog[ago(1)]=[{s:20,e:20,tag:'work',tag2:'study'}];
  /* 시작 시각 고정(15:00) — 칸 단위 계산(v4.12)이라 '지금-24h' 면 실행 시각에 따라 timelog 칸과 겹친다 */
  st.study.pomos=[{id:'p1',date:ago(1),mins:25,at:new Date(ago(1)+'T15:00:00').toISOString(),plan:25,unitId:'c3'}];
  st.study.logs[ago(1)]={unitIds:[],coach:'어제 동사 구간 진입했다. 난도 올라가니 하루 1p로 낮춘다.'};
  const {b,p,errs}=await boot(st);
  /* ① 탭이 4개고 맨 왼쪽이 캘린더 */
  const tabs=await p.$$eval('#v-study .logtabs button',es=>es.map(e=>e.textContent.trim()));
  ok('W1 탭 4개',tabs.length===4,JSON.stringify(tabs));
  ok('W2 맨 왼쪽이 캘린더',tabs[0].indexOf('캘린더')>=0,JSON.stringify(tabs));
  ok('W3 오늘 탭이 없다',tabs.every(t=>t.indexOf('오늘')<0),JSON.stringify(tabs));
  ok('W4 옛 home 값은 캘린더로 흘린다',
     (await p.evaluate(()=>{DB.ui.studyTab='home';return stTab();}))==='cal');
  /* ② D-day 는 전 탭 공통 헤더 */
  for(const t of ['cal','err','word','plan']){
    await p.evaluate(x=>setStTab(x),t);await p.waitForTimeout(220);
    const has=await p.$$eval('#v-study .sthead',es=>es.length);
    ok('W5-'+t+' D-day 헤더가 있다',has===1,String(has));
  }
  await p.evaluate(()=>setStTab('cal'));await p.waitForTimeout(300);
  /* ③ 격자 + 날짜별 학습시간 */
  ok('W6 월 격자가 그려진다',(await p.$$('#v-study .scal .scday')).length>=28);
  ok('W7 학습시간 = timelog + 뽀모',
     (await p.evaluate(x=>stStudyMins(x),ago(1)))===55,
     String(await p.evaluate(x=>stStudyMins(x),ago(1))));
  ok('W8 뽀모만 따로도 센다',(await p.evaluate(x=>stPomoMinsOn(x),ago(1)))===25);
  /* ③-2 v4.16 — 🔒 칸 안에서 **클릭 없이** 그날 과제의 수행여부를 읽는다.
     로한: "과거에 뭘 했는지를 일일이 클릭해서 봐야 하는 게 불편해."
     ⚠️ 달이 넘어가도 깨지지 않게, 볼 날짜의 달로 먼저 옮긴다(t42 는 매일 돈다). */
  const cellOf=async(ds)=>{
    await p.evaluate(x=>setStCalYM(x.slice(0,7)),ds);await p.waitForTimeout(250);
    return p.$eval('#v-study .scday[onclick*="'+ds+'"]',e=>({
      txt:e.textContent,
      marks:[...e.querySelectorAll('.scui')].map(x=>(x.className.replace('scui','').trim()||'-')+':'+x.querySelector('b').textContent),
      titles:[...e.querySelectorAll('.scui span')].map(x=>x.textContent)}));
  };
  {
    const c0=await cellOf(ago(0));
    ok('W8b 오늘 칸에 그날 과제가 다 적힌다',
       c0.titles.indexOf('오늘것A')>=0&&c0.titles.indexOf('오늘것B')>=0,JSON.stringify(c0.titles));
    ok('W8c 끝낸 것은 ✓',c0.marks.indexOf('ok:✓')>=0,JSON.stringify(c0.marks));
    /* 🔒 오늘 아직 안 한 것은 ✗ 가 아니다 — 오전 9시의 미완을 실패로 칠하면 화면이 거짓말을 한다 */
    ok('W8d 오늘 미완은 ✗ 가 아니라 ·',
       c0.marks.indexOf('-:·')>=0&&c0.marks.every(m=>m.indexOf('✗')<0),JSON.stringify(c0.marks));
    const c1=await cellOf(ago(1));
    ok('W8e 지난 날 미완은 ✗ 로 드러난다',c1.marks.indexOf('no:✗')>=0,JSON.stringify(c1.marks));
    const c2=await cellOf(fwd(1));
    ok('W8f 미래 미완은 ·',c2.marks.length===1&&c2.marks[0]==='-:·',JSON.stringify(c2.marks));
    /* 🔒 다 못 넣으면 몇 개가 남았는지 적는다 — 그냥 잘라내면 화면이 거짓말을 한다 */
    await p.evaluate(x=>{for(let i=0;i<5;i++)DB.study.units.push({id:'z'+i,phase:'P1',ch:'home',
      type:'vocab',title:'넘침'+i,mins:5,day:x,backlog:false,status:'todo',carried:0});
      renderStudy();},ago(1));
    await p.waitForTimeout(300);
    const cm=await cellOf(ago(1));
    ok('W8g 칸이 넘치면 +N 을 적는다',/\+\d/.test(cm.txt)&&cm.marks.length<=4,JSON.stringify(cm.marks));
    await p.evaluate(()=>{DB.study.units=DB.study.units.filter(u=>String(u.id).indexOf('z')!==0);renderStudy();});
    await p.waitForTimeout(250);
  }
  await p.evaluate(()=>setStCalYM(todayStr().slice(0,7)));await p.waitForTimeout(250);
  /* ④ 제로데이 — 지난 날인데 학습도 과제도 없는 칸
     ⚠️ [테스트 결함] 이번 달 격자에서만 세면 **매달 1일에 깨진다** — 그날엔 이번 달에
        '지난 날'이 하나도 없다. W10·W22 와 같은 종류다 → 지난달로 옮겨서 센다.
        지난달은 통째로 과거라 날짜와 무관하게 성립한다. */
  const _ymZ=await p.evaluate(()=>stCalYM());
  await p.evaluate(()=>stCalMove(-1));await p.waitForTimeout(280);
  ok('W9 제로데이 칸이 표시된다',(await p.$$('#v-study .scday.zero')).length>=1);
  await p.evaluate(x=>setStCalYM(x),_ymZ);await p.waitForTimeout(280);
  /* ⑤ 3일 창 밖은 흐리게
     ⚠️ [테스트 결함 · 2026-09-28 발견] 이번 달 격자에서만 셌더니, **월말에는 이번 달에
        「오늘+3일 이후」 칸이 하나도 없어서** 깨졌다(9/28 에 9월은 30일까지뿐이다).
        W22 를 고칠 때 같은 종류를 봤는데 여기를 안 고쳤다 → **다음 달로 옮겨서 센다.**
        다음 달은 통째로 창 밖이라 날짜와 무관하게 성립한다. */
  const _ym0=await p.evaluate(()=>stCalYM());
  await p.evaluate(()=>stCalMove(1));await p.waitForTimeout(280);
  ok('W10 미래 3일 밖은 흐리다',(await p.$$('#v-study .scday.far')).length>=1);
  await p.evaluate(x=>setStCalYM(x),_ym0);await p.waitForTimeout(280);
  /* ⑥ 날짜 클릭 → 우측 패널이 그날 것으로 */
  await p.evaluate(x=>setStCalSel(x),ago(1));await p.waitForTimeout(350);
  let side=await p.$eval('#v-study .calside',e=>e.textContent);
  ok('W11 그날 과제가 우측에 뜬다',side.indexOf('어제것')>=0,side.slice(0,140));
  ok('W12 다른 날 과제는 안 뜬다',side.indexOf('오늘것A')<0);
  /* ⑦ 학습방 멘트 */
  ok('W13 학습방 멘트가 뜬다',side.indexOf('하루 1p로 낮춘다')>=0,side.slice(0,200));
  ok('W14 멘트 칸이 있다',(await p.$$('#v-study .sccoach')).length===1);
  await p.evaluate(x=>setStCalSel(x),ago(0));await p.waitForTimeout(300);
  side=await p.$eval('#v-study .calside',e=>e.textContent);
  ok('W15 멘트 없는 날은 없다고 말한다',side.indexOf('학습방 멘트 없음')>=0);
  /* ⑧ 판정 지표가 우측 하단으로 옮겨졌다 */
  ok('W16 과락 게이지',side.indexOf('과락')>=0||side.indexOf('미측정')>=0,side.slice(0,200));
  ok('W17 오답 요약',side.indexOf('오답')>=0);
  ok('W18 이번 주 요약',side.indexOf('이번 주')>=0);
  /* ⑨ 3일 창 밖 — 🔒 올라온 과제를 숨기지는 않는다(숨기면 거짓말이다).
     비었을 때만 '계획을 안 만든다'고 말하고, 창 밖에서는 뽀모를 주지 않는다 */
  await p.evaluate(x=>setStCalSel(x),fwd(9));await p.waitForTimeout(300);
  side=await p.$eval('#v-study .calside',e=>e.textContent);
  ok('W19 창 밖이라도 올라온 과제는 숨기지 않는다',side.indexOf('먼미래')>=0,side.slice(0,180));
  ok('W19b 창 밖은 뽀모 버튼을 안 준다',side.indexOf('뽀모 시작')<0,side.slice(0,180));
  await p.evaluate(x=>setStCalSel(x),fwd(11));await p.waitForTimeout(300);
  side=await p.$eval('#v-study .calside',e=>e.textContent);
  ok('W19c 과제 없는 창 밖은 계획이 없다고 알린다',side.indexOf('오늘+2일')>=0,side.slice(0,180));
  ok('W20 그래도 안 죽는다',errs.length===0,errs.join('|'));
  /* ⑩ 월 이동 — 🔒 기준은 **오늘의 달**이다.
     ⚠️ [테스트 결함 · 2026-09-21 발견] 앞 단계가 오늘+11일을 고르고 끝난다.
        setStCalSel 은 다른 달을 고르면 월까지 옮기므로, 그 달을 기준으로 잡으면
        **매달 20일 이후에만 깨지는 테스트**가 된다. 9/19 엔 통과하고 9/21 에 깨졌다.
        앱은 멀지다 — 테스트가 자기 전제를 틀리게 잡았다. */
  await p.evaluate(()=>setStCalSel(todayStr()));await p.waitForTimeout(300);
  const ym=await p.evaluate(()=>todayStr().slice(0,7));
  ok('W20b 오늘 달에서 시작한다',(await p.evaluate(()=>stCalYM()))===ym);
  await p.evaluate(()=>stCalMove(-1));await p.waitForTimeout(300);
  ok('W21 지난달로 이동',(await p.evaluate(()=>stCalYM()))!==ym);
  await p.evaluate(()=>setStCalSel(todayStr()));await p.waitForTimeout(300);
  ok('W22 오늘로 돌아온다',(await p.evaluate(()=>stCalYM()))===ym);
  /* ⑪ 🔒 모바일에서 **격자가 먼저** 온다
     ⚠️ [결함] .calwrap 이 가계부 규칙(column-reverse)을 물려받아 400px 에서 격자가 화면 맨 아래로
        갔다. 캘린더 탭을 눌렀는데 캘린더를 보려면 스크롤을 해야 했다 — 이 화면의 존재 이유가 격자다. */
  await p.setViewportSize({width:400,height:900});await p.waitForTimeout(400);
  const ord=await p.evaluate(()=>{
    const w=document.querySelector('#v-study .calwrap');
    const g=w.querySelector('.calmain').getBoundingClientRect().top;
    const s=w.querySelector('.calside').getBoundingClientRect().top;
    return {dir:getComputedStyle(w).flexDirection,gridFirst:g<s};});
  ok('W23 모바일은 격자가 위',ord.gridFirst===true,JSON.stringify(ord));
  ok('W24 가계부의 역순 규칙을 물려받지 않는다',ord.dir==='column',JSON.stringify(ord));
  await p.setViewportSize({width:1440,height:1200});await p.waitForTimeout(300);
  ok('W25 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── X. ⏱ 뽀모도로 (v3.7) ──
    🔒 길이는 자유다(로한). 프리셋 + 직접입력.
    🔒 setInterval 카운트가 아니라 **시작 시각 + 경과 계산** — 탭을 벗어나도 정확해야 한다.
    🔒 기록은 study.pomos 에 분 단위. timelog(한 칸 30분)는 건드리지 않는다. */
 {
  const ago=(n)=>{const d=new Date(Date.now()-n*86400000);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const st=BASE();
  st.study.units=[{id:'k1',phase:'P1',ch:'home',type:'vocab',title:'예상어휘 p160',mins:10,
    due:ago(-3),day:ago(0),backlog:false,status:'todo',carried:0}];
  const {b,p,errs,dlg}=await boot(st);
  /* ① 탭이 아니라 캘린더 안의 버튼에서 뜬다 */
  ok('X1 캘린더에 뽀모 버튼이 있다',
     (await p.$eval('#v-study .calside',e=>e.textContent)).indexOf('뽀모 시작')>=0);
  ok('X2 전체화면 오버레이가 닫혀 있다',
     (await p.$eval('#pomoOv',e=>e.classList.contains('on')))===false);
  await p.evaluate(()=>stPomoOpen(todayStr()));await p.waitForTimeout(350);
  ok('X3 열린다',(await p.$eval('#pomoOv',e=>e.classList.contains('on')))===true);
  /* ② 프리셋 — 25/5, 50/10 이 있어야 한다(로한: "10/3 고정이면 못 쓴다"의 반대편) */
  const pres=await p.$$eval('#pomoBody .pmpre',es=>es.map(e=>e.textContent.trim()));
  ok('X4 프리셋에 25/5 와 50/10 이 있다',
     pres.indexOf('25/5')>=0&&pres.indexOf('50/10')>=0,JSON.stringify(pres));
  ok('X5 10/3 도 있다',pres.indexOf('10/3')>=0,JSON.stringify(pres));
  ok('X6 기본값은 25/5',(await p.evaluate(()=>stPomoCfg().focus))===25);
  /* ③ 직접입력 — 자유롭게 */
  await p.evaluate(()=>stPomoSet('focus',37));await p.waitForTimeout(250);
  ok('X7 임의 길이도 받는다 (37분)',(await p.evaluate(()=>stPomoCfg().focus))===37);
  ok('X8 범위를 벗어나면 잘린다',
     (await p.evaluate(()=>{stPomoSet('focus',999);return stPomoCfg().focus;}))===180);
  await p.evaluate(()=>stPomoPre(50,10));await p.waitForTimeout(250);
  ok('X9 프리셋을 누르면 둘 다 바뀐다',
     (await p.evaluate(()=>{const c=stPomoCfg();return c.focus===50&&c.brk===10;}))===true);
  ok('X10 고른 프리셋이 표시된다',(await p.$$('#pomoBody .pmpre.on')).length===1);
  /* ④ ⏱ v4.49 — 🔴 과제를 **더 묻지 않는다**. 고른 값이 그대로 박혀 9건이 전부 같은 과제로 적혔다
     (서버 실측: pomos 12건 전부 unitId:'u031'). 누르면 바로 시작한다. */
  ok('X11 과제를 묻지 않는다 (고르는 칸이 없다)',
     (await p.$$('#pomoBody .pmsel')).length===0);
  ok('X11b 설정에 unitId 가 없다',
     (await p.evaluate(()=>!('unitId' in stPomoCfg())))===true);
  /* ⑤ 시작 — 시작 시각만 저장한다 */
  await p.evaluate(()=>stPomoStart('focus'));await p.waitForTimeout(400);
  const run=await p.evaluate(()=>DB.ui.pomoRun);
  ok('X12 시작 시각을 저장한다 (카운터가 아니다)',!!run&&typeof run.at==='number',JSON.stringify(run));
  ok('X13 남은 시간이 보인다',/^\d{2}:\d{2}$/.test(await p.$eval('#pomoClock',e=>e.textContent.trim())),
     await p.$eval('#pomoClock',e=>e.textContent.trim()));
  ok('X14 진행 화면에 과제 이름이 없다 (물어본 적이 없으니 보일 수도 없다)',
     (await p.$eval('#pomoBody',e=>e.textContent)).indexOf('예상어휘 p160')<0);
  /* 🔒 경과는 시각 차이로 계산한다 — 시간을 앞으로 돌려도 맞아야 한다 */
  const el=await p.evaluate(()=>{DB.ui.pomoRun.at=Date.now()-7*60*1000;return stPomoElapsedSec();});
  ok('X15 경과를 시각 차이로 계산한다 (7분)',el>=418&&el<=422,String(el));
  /* ⑥ 일시정지 — 멈춘 동안은 안 쌓인다 */
  await p.evaluate(()=>stPomoPause());await p.waitForTimeout(600);
  const pa=await p.evaluate(()=>stPomoElapsedSec());
  await p.waitForTimeout(700);
  const pb=await p.evaluate(()=>stPomoElapsedSec());
  ok('X16 멈추면 시간이 안 흐른다',pa===pb,pa+' vs '+pb);
  await p.evaluate(()=>stPomoResume());await p.waitForTimeout(250);
  ok('X17 다시 흐른다',(await p.evaluate(()=>!DB.ui.pomoRun.paused))===true);
  /* ⑦ 중단해도 그때까지 기록 — 0으로 버리지 않는다 */
  await p.evaluate(()=>{DB.ui.pomoRun.at=Date.now()-12*60*1000;DB.ui.pomoRun.acc=0;stPomoStop();});
  await p.waitForTimeout(400);
  const rec=await p.evaluate(()=>DB.study.pomos[0]);
  ok('X18 중단분이 기록된다 (12분)',!!rec&&rec.mins===12,JSON.stringify(rec));
  ok('X19 과제를 저장하지 않는다 (빈 서랍도 안 만든다)',!('unitId' in rec),JSON.stringify(rec));
  ok('X20 계획보다 짧으면 cut 표시',rec.cut===true,JSON.stringify(rec));
  /* ⏱ v4.49 — 🔒 **파생은 저장하지 않는다.** 날짜는 at 하나에서만 나온다.
     🔴 전엔 date 를 박아 저장했고, DB.ui.pomo.date 가 9/22 로 굳어 10월 기록 9건이
        전부 9/22 로 적혔다(서버 실측). 저장하지 않으면 어긋날 자리가 없다. */
  ok('X21 날짜를 저장하지 않는다',!('date' in rec),JSON.stringify(rec));
  ok('X21b 날짜는 at 에서 나온다',
     (await p.evaluate(()=>stPomoDate(DB.study.pomos[0])))===(await p.evaluate(()=>todayStr())));
  /* v4.12 — 뽀모는 timelog 에 남긴다(로한: 미리 채운 로그에 반영이 안 된다). 세기는 뽀모 분이라 부풀지 않는다 */
  ok('X22 timelog 에 뽀모 study 블록이 남는다',
     (await p.evaluate(()=>Object.values(DB.timelog||{}).some(a=>a.some(b=>b.tag==='study'&&/^뽀모/.test(b.title))))));
  ok('X23 학습시간에는 합산된다',(await p.evaluate(()=>stStudyMins(todayStr())))===12);
  /* ⑧ 1분 미만은 기록하지 않는다 */
  await p.evaluate(()=>{stPomoStart('focus');DB.ui.pomoRun.at=Date.now()-20*1000;stPomoStop();});
  await p.waitForTimeout(300);
  ok('X24 1분 미만은 안 남긴다',(await p.evaluate(()=>DB.study.pomos.length))===1);
  /* ⑨ 새로고침해도 이어진다 — 진행 상태를 ui 에 들고 있다 */
  await p.evaluate(()=>{stPomoStart('focus');DB.ui.pomoRun.at=Date.now()-3*60*1000;});
  await p.waitForTimeout(250);
  ok('X25 진행 상태가 ui 에 남는다',(await p.evaluate(()=>!!DB.ui.pomoRun))===true);
  ok('X26 빈 서랍을 안 만든다 (과제 없으면 unitId 키 없음)',
     (await p.evaluate(()=>{DB.ui.pomo.unitId='';stPomoStart('focus');
       DB.ui.pomoRun.at=Date.now()-5*60*1000;stPomoStop();
       const r=DB.study.pomos[DB.study.pomos.length-1];return !('unitId' in r);}))===true);
  /* ⑩ ⏱ v4.48 — 🔴 설정 시간이 지나도 **공부 중이다**.
     로한: 「25분으로 설정해놓으면 공부하다가 그 시간이 지나잖아? 그럼 자동으로 쉬는 시간으로 바껴. 공부하고 있는데.」
     🔒 저절로 넘어가지 않는다 · 지난 시간도 기록에 들어간다 · 넘기는 건 사람이 누른다. */
  await p.evaluate(()=>{DB.study.pomos=[];DB.timelog={};
    DB.ui.pomo={focus:25,brk:5,date:todayStr(),unitId:''};
    stPomoStart('focus');DB.ui.pomoRun.at=Date.now()-31*60*1000;});
  await p.evaluate(()=>stPomoTick());await p.waitForTimeout(250);
  const ov=await p.evaluate(()=>DB.ui.pomoRun);
  ok('X28 25분이 지나도 집중이다 (휴식으로 안 넘어간다)',!!ov&&ov.phase==='focus',JSON.stringify(ov));
  ok('X29 소리는 울렸다고 표시한다 (매 틱마다 울지 않게)',ov.rang===true);
  ok('X30 지난 뒤에도 기록은 0건이다 (혼자 끊지 않았다)',
     (await p.evaluate(()=>DB.study.pomos.length))===0);
  ok('X31 지난 시간은 + 로 보여준다',
     /^\+\d{2}:\d{2}$/.test(await p.$eval('#pomoClock',e=>e.textContent.trim())),
     await p.$eval('#pomoClock',e=>e.textContent.trim()));
  ok('X32 연장 중이라고 글자로 말한다 (색만으로 말하지 않는다)',
     (await p.$eval('#pomoBody',e=>e.textContent)).indexOf('연장 중')>=0);
  /* 🔒 두 번 울지 않는다 */
  await p.evaluate(()=>{stPomoTick();stPomoTick();});
  ok('X33 여전히 집중 · 기록 0건',
     (await p.evaluate(()=>DB.ui.pomoRun&&DB.ui.pomoRun.phase==='focus'&&DB.study.pomos.length===0))===true);
  /* ⑪ 뽀모 종료를 누르면 — 지난 시간까지 기록하고 휴식으로 */
  await p.evaluate(()=>stPomoEnd());await p.waitForTimeout(300);
  const rc2=await p.evaluate(()=>DB.study.pomos[DB.study.pomos.length-1]);
  ok('X34 끝내면 **지난 시간까지** 기록된다 (31분)',!!rc2&&rc2.mins===31,JSON.stringify(rc2));
  ok('X35 계획(25)보다 길었으니 cut 이 아니다',!rc2.cut,JSON.stringify(rc2));
  ok('X36 학습시간에 31분이 들어간다',(await p.evaluate(()=>stStudyMins(todayStr())))===31);
  ok('X37 끝내면 휴식이 시작된다',
     (await p.evaluate(()=>DB.ui.pomoRun&&DB.ui.pomoRun.phase==='brk'))===true);
  /* ⑫ 휴식도 저절로 안 끝난다 — 종료를 누르면 다음 뽀모 */
  await p.evaluate(()=>{DB.ui.pomoRun.at=Date.now()-9*60*1000;stPomoTick();});
  await p.waitForTimeout(250);
  ok('X38 쉬는 시간이 지나도 저절로 안 끝난다',
     (await p.evaluate(()=>DB.ui.pomoRun&&DB.ui.pomoRun.phase==='brk'))===true);
  ok('X39 휴식은 기록하지 않는다 (기록은 1건 그대로)',
     (await p.evaluate(()=>DB.study.pomos.length))===1);
  await p.evaluate(()=>stPomoEnd());await p.waitForTimeout(300);
  ok('X40 휴식 종료를 누르면 다음 뽀모가 시작된다',
     (await p.evaluate(()=>DB.ui.pomoRun&&DB.ui.pomoRun.phase==='focus'))===true);
  ok('X41 새 뽀모는 0초부터 센다',(await p.evaluate(()=>stPomoElapsedSec()))<5);
  /* 🔒 한도를 묻는 함수는 하나다 */
  ok('X42 stPomoLim 이 단계별 한도를 말한다',
     (await p.evaluate(()=>{const f=stPomoLim(DB.ui.pomoRun);
       const b=stPomoLim({phase:'brk',brk:5,focus:25});return f===25*60&&b===5*60;}))===true);
  await p.evaluate(()=>{DB.ui.pomoRun=null;});
  /* ⑬ ⏱ v4.49 — 🔴 [실측 재현] 서버에 있던 썩음을 그대로 박는다.
     2026-10-20 서버: pomos 12건 중 9건이 date:'2026-09-22' 인데 at 은 10/15~10/20 이었다.
     DB.ui.pomo.date 가 9/22 로 굳어 그 뒤 모든 기록에 따라붙었다.
     그 결과 두 가지 거짓말이 동시에 났다:
       ① 9/22 에 167분 — 아무것도 안 한 날에 공부한 것으로 보였다
       ② 10/16 은 뽀모 분(70분)이 빠진 채 timelog 칸으로 210분으로 부풀었다
     🔒 둘 다 「날짜를 저장했다」는 한 가지 원인에서 나왔다. */
  const rot=await p.evaluate(()=>{
    DB.study.pomos=[
      {id:'r1',date:'2026-09-22',mins:26,plan:25,unitId:'u031',tl:true,at:'2026-10-16T00:59:32.543Z'},
      {id:'r2',date:'2026-09-22',mins:2, plan:10,unitId:'u031',tl:true,at:'2026-10-16T01:28:42.071Z'}];
    /* 그 뽀모가 timelog 에 남긴 블록(실제 서버 값) */
    DB.timelog={'2026-10-16':[{s:19,e:20,tag:'study',title:'뽀모'}]};
    studyDB();                         /* 정정이 돈다 */
    return {
      dateGone:DB.study.pomos.every(x=>!('date' in x)),
      minsKept:DB.study.pomos.map(x=>x.mins),
      atKept:DB.study.pomos.every(x=>!!x.at),
      unitKept:DB.study.pomos.every(x=>x.unitId==='u031'),
      derived:DB.study.pomos.map(x=>stPomoDate(x)),
      oct16:stStudyMins('2026-10-16'),
      sep22:stStudyMins('2026-09-22'),
      minsOn16:stPomoMinsOn('2026-10-16')};});
  ok('X43 썩은 date 를 치운다 (파생은 저장하지 않는다)',rot.dateGone,JSON.stringify(rot));
  ok('X44 🔒 분은 한 톨도 안 버린다',JSON.stringify(rot.minsKept)==='[26,2]',JSON.stringify(rot.minsKept));
  ok('X45 🔒 시각(at)도 그대로 둔다',rot.atKept===true);
  ok('X46 🔒 옛 기록의 unitId 는 지우지 않는다 (새로 안 쓸 뿐이다)',rot.unitKept===true);
  ok('X47 날짜가 제 날로 돌아온다 (10/16)',
     JSON.stringify(rot.derived)==='["2026-10-16","2026-10-16"]',JSON.stringify(rot.derived));
  ok('X48 🔴 9/22 에 얹혀 있던 분이 빠진다 (안 한 날은 0분)',rot.sep22===0,String(rot.sep22));
  ok('X49 🔴 10/16 은 부풀지 않는다 — 칸 30분이 아니라 뽀모 분(28분)',
     rot.oct16===28,String(rot.oct16)+' (칸으로 세면 60분이 된다)');
  ok('X50 그날 뽀모 분도 at 기준이다',rot.minsOn16===28,String(rot.minsOn16));
  /* ⑭ at 이 없는 옛 기록 — 🔒 단서가 date 뿐이라 **버리지 않는다** */
  const old=await p.evaluate(()=>{
    DB.study.pomos=[{id:'o1',date:'2026-09-01',mins:40}];
    DB.timelog={}; studyDB();
    return {kept:DB.study.pomos[0].date,d:stPomoDate(DB.study.pomos[0]),
            mins:stStudyMins('2026-09-01')};});
  ok('X51 at 이 없으면 date 를 지킨다',old.kept==='2026-09-01',JSON.stringify(old));
  ok('X52 그 분도 센다 (칸은 몰라도 분은 안다)',old.mins===40,String(old.mins));
  /* ⑮ 🔴 못 남겼는데 「남겼다」고 적지 않는다 */
  const lie=await p.evaluate(()=>{
    const bad={id:'b1',mins:25};          /* at 이 없다 — 어느 칸인지 모른다 */
    stPomoLog(bad);
    const good={id:'g1',mins:25,at:new Date().toISOString()};
    stPomoLog(good);
    return {bad:('tl' in bad),good:good.tl===true};});
  ok('X53 🔒 못 남겼으면 tl 을 안 찍는다 (소급이 다시 볼 수 있어야 한다)',lie.bad===false,JSON.stringify(lie));
  ok('X54 남겼으면 찍는다',lie.good===true);
  /* ⑯ 제목은 「뽀모」 하나다 */
  const ttl=await p.evaluate(()=>{
    DB.timelog={}; DB.study.pomos=[];
    DB.ui.pomo={focus:25,brk:0};
    stPomoStart('focus');DB.ui.pomoRun.at=Date.now()-25*60*1000;stPomoEnd();
    const all=[];Object.keys(DB.timelog).forEach(k=>(DB.timelog[k]||[]).forEach(b=>all.push(b)));
    return all.map(b=>b.title);});
  ok('X55 timelog 제목은 「뽀모」다',JSON.stringify(ttl)==='["뽀모"]',JSON.stringify(ttl));
  ok('X27 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── Y. 📖 문법 드릴 (v3.9) — 예문에서 자동 출제 ──
    🔒 콘텐츠는 학습방(sents), 문항 생성·채점은 앱. 실데이터 19건 중 함정이 있는 6건을 픽스처로 썼다.
    🔒 가리기는 **어절 경계 우선**이어야 한다 — 「では」를 물을 때 같은 문장의 「それでは」 안쪽이 먼저 걸리면
       엉뚱한 자리가 가려지고 문항이 거짓말을 한다. */
 {
  const S=(id,ja,ko,target,opts,why)=>({id,ja,ko,lv:'N4',src:'b1:199',
    seen:0,miss:0,streak:0,lastSeen:null,
    slots:[{kind:'conj',target,opts,why:why||'해설'}]});
  const st=BASE();
  st.study.sents=[
    S('s002','旅行は 楽しかったです。 しかし 疲れましたね。','여행은 즐거웠습니다. 그러나 지쳤습니다.',
      'しかし',['それで','そして','だから'],'앞뒤가 대비되므로 역접'),
    S('s008','準備が できました。 それでは 出発しましょう。','준비가 되었습니다. 그러면 출발합시다.',
      'それでは',['それとも','それから','なぜなら']),
    /* 🔴 함정: 「では」가 「それでは」의 부분문자열이다 */
    S('s017','それでは 席に 着いて ください。 では、 テストを 始めます。','그럼 자리에 앉아 주세요. 그럼, 시험을 시작하겠습니다.',
      'では',['だが','たとえば','なぜなら']),
    S('s019','そこへは バス または 電車で 行けます。','거기에는 버스 또는 전철로 갈 수 있습니다.',
      'または',['それに','そして','だから']),
    S('s004','雨が 降って いました。 そこで、 タクシーで 帰りました。','비가 오고 있었습니다. 그래서 택시로 돌아갔습니다.',
      'そこで',['それで','だから','しかし']),
    S('s012','もう 子どもじゃ ないんだよ。 だから ひとりで やりなさい。','이제 어린애가 아니야. 그러니까 혼자서 하렴.',
      'だから',['それで','そこで','けれども'])];
  /* 🔒 slots 없는 예문 — 어순 문제(gord)는 slots 없이도 돌아야 한다 */
  st.study.sents.push({id:'s900',ja:'きょうは とても いい 天気です。',ko:'오늘은 매우 좋은 날씨입니다.',
    lv:'N4',src:'b1:201',seen:0,miss:0,streak:0,lastSeen:null});
  /* 🔒 3어절 — 어순 문제가 성립하지 않는다. 풀에서 빠져야 한다 */
  st.study.sents.push({id:'s901',ja:'あめが ふって いる',ko:'비가 오고 있다',
    lv:'N4',src:'b1:201',seen:0,miss:0,streak:0,lastSeen:null});
  const {b,p,errs}=await boot(st);
  await p.evaluate(()=>setStTab('word'));await p.waitForTimeout(350);
  /* ① 탭은 계속 4개 · 라벨만 '드릴'로 */
  const tabs=await p.$$eval('#v-study .logtabs button',es=>es.map(e=>e.textContent.trim()));
  ok('Y1 탭은 여전히 4개',tabs.length===4,JSON.stringify(tabs));
  ok('Y2 단어 탭이 드릴 탭이 됐다',tabs[2].indexOf('드릴')>=0,JSON.stringify(tabs));
  ok('Y3 문법 칸이 같은 탭에 있다',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('📖 문법')>=0);
  /* ② 풀 — 조건별로 갈린다 */
  /* 🔒 v4.45 — 개수를 박아두면 예문이 하나 늘거나 빠질 때마다 깨진다.
     세어야 할 것은 **개수가 아니라 자격**이다 — slots 를 갖췄고 답이 새지 않는 것만 들어온다. */
  ok('Y4 접속사 풀은 자격을 갖춘 것만',
     await p.evaluate(()=>{var P=stGramPool('gconj');return P.length>0&&P.every(function(x){return stGSlots(x,'conj').length>0;});}),'');
  ok('Y5 어순 풀 = 4어절 이상 7건',(await p.evaluate(()=>stGramPool('gord').length))===7,
     String(await p.evaluate(()=>stGramPool('gord').length)));
  ok('Y6 3어절은 어순 풀에서 빠진다',
     (await p.evaluate(()=>stGramPool('gord').some(x=>x.id==='s901')))===false);
  ok('Y7 slots 없는 예문도 어순은 된다',
     (await p.evaluate(()=>stGramPool('gord').some(x=>x.id==='s900')))===true);
  ok('Y8 slots 없는 예문은 접속사에서 빠진다',
     (await p.evaluate(()=>stGramPool('gconj').some(x=>x.id==='s900')))===false);
  /* ③ 🔴 어절 경계 가리기 — 부분문자열 함정 */
  const mask=await p.evaluate(()=>stGMask('それでは 席に 着いて ください。 では、 テストを 始めます。','では'));
  ok('Y9 어절 경계에서 가린다 (それでは 를 안 건드린다)',
     mask.indexOf('それでは')===0&&mask.indexOf('（　）、')>0,mask);
  ok('Y10 가린 자리는 한 곳뿐',(mask.match(/（　）/g)||[]).length===1,mask);
  /* ④ 접속사 문항 — 정답이 문제에 남아 있으면 안 된다 */
  await p.evaluate(()=>stDrillStart('gconj',6));await p.waitForTimeout(400);
  const q=await p.evaluate(()=>{const D=ST_DRILL,x=stGramQ(D,D.i);
    return {ja:x.ja,ans:x.ans,opts:x.opts,n:D.ids.length};});
  /* 🔴 v4.45 — 「それでは 席に 着いて ください。（　）、…」 정답 「では」는
     빈칸을 제대로 가려도 **정답이 문장 앞에 그대로 남는다**(어절 경계를 지키니 당연하다).
     고르는 문제가 아니라 베끼는 문제라 풀에서 뺀다 → 6개 중 하나가 빠져 5개다. */
  ok('Y11 답이 새는 예문을 뺀 만큼만 잡힌다',q.n===5,String(q.n));
  ok('Y11b 🔒 답이 새는 예문은 풀에서 빠진다',
     (await p.evaluate(()=>stGramPool('gconj').some(x=>/それでは 席に/.test(x.ja))))===false);
  ok('Y12 문제에 빈칸이 있다',q.ja.indexOf('（　）')>=0,q.ja);
  ok('Y13 🔴 정답이 문제에 안 남아 있다',q.ja.indexOf(q.ans)<0,q.ja+' / '+q.ans);
  /* ══ 🔒 v4.45 전수 검사 — 랜덤 샘플로는 **있는지 없는지** 알 수 없다 ══
     로한: "자꾸 일본어 학습 쪽에서 뻑이 나는거야. 확실히 대비를 해"
     이틀 연속 같은 결함이 **다른 자리**에서 터졌다(유의표현 → 슬롯 문항).
     둘 다 랜덤이 그 항목을 뽑을 때만 드러나서, 고친 뒤에도 **남은 자리가 있는지 몰랐다**.
     🔒 「정답이 문제에 남으면 안 된다」는 샘플링할 이유가 없는 불변식이다.
        모든 모드 × 모든 예문 × 모든 슬롯을 **전수로** 돈다. 그러면 한 번에 다 걸린다.
     (gord 어순은 빈칸이 없는 모드라 제외 — 보기가 문장 토막 자체다) */
  const leak=await p.evaluate(()=>{
    const bad=[];
    ST_GMODES.forEach(function(m){
      if(m.k==='gord')return;
      let pool=[]; try{ pool=stGramPool(m.k); }catch(e){ bad.push(m.k+' 풀 예외: '+e.message); return; }
      pool.forEach(function(sn){
        let items=[null];
        if(ST_GKIND[m.k])items=stGSlots(sn,ST_GKIND[m.k]).map(function(sl){return {slot:sl};});
        else if(m.k==='gpart')items=stGParticles(sn).map(function(c){return {cand:c};});
        items.forEach(function(it){
          let qq=null;
          try{ qq=stGMkQ(sn,m.k,it); }catch(e){ bad.push(m.k+' 예외: '+e.message); return; }
          if(!qq||qq.ja==null||qq.ans==null)return;
          /* 🔒 한 글자 정답(조사·종조사)은 문장 어디에나 나온다 — 그 규칙이 안 맞는다 */
          if(String(qq.ans).length<2)return;
          if(String(qq.ja).indexOf(String(qq.ans))>=0)
            bad.push(m.k+' | '+qq.ja+' | 답:'+qq.ans);
        });
      });
    });
    return bad;
  });
  ok('Y13a 🔒 전수 — 어떤 모드·어떤 예문도 정답이 문제에 남지 않는다',
     leak.length===0, leak.slice(0,3).join(' // ')+(leak.length>3?(' 외 '+(leak.length-3)+'건'):''));
  /* 🔒 전수가 **실제로 돌았는지**도 잰다 — 0건을 돌고 「통과」라 하면 그게 거짓이다 */
  const swept=await p.evaluate(()=>{
    let n=0;
    ST_GMODES.forEach(function(m){ if(m.k==='gord')return;
      try{ n+=stGramPool(m.k).length; }catch(e){} });
    return n;});
  ok('Y13b 전수가 빈 채로 통과하지 않았다',swept>=10,String(swept));
  ok('Y14 보기 4개',q.opts.length===4,JSON.stringify(q.opts));
  ok('Y15 보기에 정답이 있다',q.opts.indexOf(q.ans)>=0,JSON.stringify(q.opts));
  ok('Y16 보기에 중복이 없다',new Set(q.opts).size===4,JSON.stringify(q.opts));
  /* 🔒 답하기 전에 한국어 번역을 보여주지 않는다 — 번역에 정답이 적혀 있다 */
  const pre=await p.$eval('#v-study',e=>e.textContent);
  const ko=await p.evaluate(()=>stDrillItem(ST_DRILL,ST_DRILL.i).ko);
  ok('Y17 🔴 채점 전엔 번역이 안 보인다',pre.indexOf(ko)<0,ko);
  ok('Y18 채점 전엔 해설도 안 보인다',pre.indexOf('💡')<0);
  /* ⑤ 채점 — 정답 */
  await p.evaluate(()=>stDrillGrade(stGramQ(ST_DRILL,ST_DRILL.i).ans));await p.waitForTimeout(350);
  let post=await p.$eval('#v-study',e=>e.textContent);
  ok('Y19 맞으면 ○',post.indexOf('○ 맞음')>=0,post.slice(0,120));
  ok('Y20 채점 후엔 번역이 보인다',post.indexOf(ko)>=0);
  ok('Y21 🔒 맞히면 해설은 안 띄운다',post.indexOf('💡')<0,post.slice(0,200));
  const c1=await p.evaluate(()=>{const s=stSentById(ST_DRILL.ids[0]);
    return {seen:s.seen,miss:s.miss,streak:s.streak,last:s.lastSeen};});
  ok('Y22 예문 카운터가 단어와 같은 필드로 올라간다',
     c1.seen===1&&c1.miss===0&&c1.streak===1&&!!c1.last,JSON.stringify(c1));
  /* ⑥ 채점 — 오답이면 해설이 뜬다 */
  await p.evaluate(()=>stDrillNext());await p.waitForTimeout(250);
  await p.evaluate(()=>{const x=stGramQ(ST_DRILL,ST_DRILL.i);
    stDrillGrade(x.opts.filter(o=>o!==x.ans)[0]);});await p.waitForTimeout(350);
  post=await p.$eval('#v-study',e=>e.textContent);
  ok('Y23 틀리면 ✗',post.indexOf('✗ 틀림')>=0);
  ok('Y24 🔒 틀렸을 때만 해설이 뜬다',post.indexOf('💡')>=0,post.slice(0,220));
  const c2=await p.evaluate(()=>{const s=stSentById(ST_DRILL.ids[1]);
    return {seen:s.seen,miss:s.miss,streak:s.streak};});
  ok('Y25 틀리면 miss+1 · streak 0',c2.seen===1&&c2.miss===1&&c2.streak===0,JSON.stringify(c2));
  /* ⑦ 모르겠다 — 단어와 같은 처리 */
  await p.evaluate(()=>stDrillNext());await p.waitForTimeout(250);
  await p.evaluate(()=>stDrillDunno());await p.waitForTimeout(300);
  ok('Y26 모르겠다는 오답과 같게 센다',
     (await p.evaluate(()=>ST_DRILL.res[2].dunno))===true);
  /* ⑧ 끝까지 — 기록 1건 */
  for(let i=0;i<6;i++){
    await p.evaluate(()=>{const D=ST_DRILL;if(!D||D.fin)return;
      if(D.show){stDrillNext();return;}stDrillGrade(stGramQ(D,D.i).ans);});
    await p.waitForTimeout(60);
  }
  await p.evaluate(()=>{const D=ST_DRILL;if(D&&!D.fin)stDrillQuit();});await p.waitForTimeout(400);
  const rec=await p.evaluate(()=>DB.study.drills);
  ok('Y27 드릴 기록 1건',rec.length===1,JSON.stringify(rec));
  ok('Y28 모드가 gconj 로 남는다',rec[0].mode==='gconj',JSON.stringify(rec[0]));
  ok('Y29 문항 수가 기록과 맞다',rec[0].n===q.n,JSON.stringify(rec[0])+' / 낸 문항 '+q.n);
  ok('Y30 모르겠다 수가 남는다',rec[0].dunno===1,JSON.stringify(rec[0]));
  ok('Y31 결과 화면이 뜬다',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('결과')>=0);
  /* ⑨ 어순 문항 — 정답은 원래 순서의 ★ 자리 */
  await p.evaluate(()=>{stDrillClose();stDrillStart('gord',7);});await p.waitForTimeout(400);
  const g=await p.evaluate(()=>{const D=ST_DRILL;
    return D.qs.map(x=>({star:x.star,win:x.win,opts:x.opts,ans:x.ans}));});
  ok('Y32 어순 7문항',g.length===7,String(g.length));
  ok('Y33 🔒 정답은 원래 순서의 ★ 자리',g.every(x=>x.ans===x.win[x.star]),JSON.stringify(g[0]));
  ok('Y34 ★는 2~3번째다 (양 끝을 묻지 않는다)',g.every(x=>x.star===1||x.star===2),
     JSON.stringify(g.map(x=>x.star)));
  ok('Y35 보기는 창의 4어절 그대로',
     g.every(x=>x.win.slice().sort().join('|')===x.opts.slice().sort().join('|')),JSON.stringify(g[0]));
  ok('Y36 보기 4개',g.every(x=>x.opts.length===4));
  const gtxt=await p.$eval('#v-study',e=>e.textContent);
  ok('Y37 ★ 자리를 물어본다',gtxt.indexOf('★')>=0);
  ok('Y38 채점 전엔 번역이 안 보인다',
     gtxt.indexOf(await p.evaluate(()=>stDrillItem(ST_DRILL,ST_DRILL.i).ko))<0);
  await p.evaluate(()=>stDrillGrade(stGramQ(ST_DRILL,ST_DRILL.i).ans));await p.waitForTimeout(350);
  ok('Y39 어순도 정상 채점된다',
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('○ 맞음')>=0);
  /* ⑩ 빈 상태 — 예문 0건이어도 죽지 않는다 */
  await p.evaluate(()=>{stDrillClose();DB.study.sents=[];renderStudy();});await p.waitForTimeout(350);
  const emp=await p.$eval('#v-study',e=>e.textContent);
  ok('Y40 예문 0건이면 학습방이 올린다고 말한다',emp.indexOf('학습방에서 올린다')>=0,emp.slice(0,200));
  ok('Y41 0건이면 시작 버튼이 막힌다',
     (await p.$$eval('#v-study .stdmode button.off',es=>es.length))>=2);
  ok('Y42 빈 상태에서 시작해도 안 죽는다',
     (await p.evaluate(()=>{stDrillStart('gconj',20);return ST_DRILL===null;}))===true);
  ok('Y43 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── Z. 🔤 폰트 (v3.9) — 로한: "싹다 프린텐다드로. 볼드는 프리텐다드 볼드로" ──
    🔒 글꼴은 --sans / --ja / --serif 세 변수로만 정한다. 파일 안에 폰트 이름을 직접 쓰면
       다음에 바꿀 때 빠지는 자리가 생긴다(이번에 SVG 안에 박힌 한 군데가 실제로 있었다). */
 {
  const {b,p,errs}=await boot(BASE());
  const v=await p.evaluate(()=>{
    const cs=getComputedStyle(document.documentElement);
    return {sans:cs.getPropertyValue('--sans').trim(),
            ja:cs.getPropertyValue('--ja').trim(),
            serif:cs.getPropertyValue('--serif').trim(),
            body:getComputedStyle(document.body).fontFamily,
            syn:getComputedStyle(document.body).fontSynthesis||
                getComputedStyle(document.body).webkitFontSynthesis||''};
  });
  ok('Z1 --sans 가 Pretendard 로 시작한다',/^'Pretendard Variable'/.test(v.sans),v.sans);
  ok('Z2 body 가 --sans 를 쓴다',v.body.indexOf('Pretendard Variable')>=0,v.body);
  ok('Z3 Cinzel·고운바탕은 남아 있지 않다',
     !/Cinzel|Gowun/.test(v.sans+v.ja+v.serif+v.body),v.serif);
  ok('Z4 --serif 도 Pretendard 다 (로한: 싹다)',v.serif.indexOf('Pretendard')>=0,v.serif);
  /* 🔒 가짜 볼드 금지 — 브라우저가 굵게 '그리면' Pretendard Bold 가 아니다 */
  ok('Z5 font-synthesis 를 끈다',/none/.test(v.syn),JSON.stringify(v.syn));
  /* 🇯🇵 일본어는 일본어로 디자인된 글자체가 먼저 온다 — 한자 자형이 시험지와 달라진다 */
  ok('Z6 --ja 는 일본어 폰트가 앞에 온다',/^'Pretendard JP Variable'/.test(v.ja),v.ja);
  ok('Z7 --ja 체인에 OS 일본어 폰트가 있다',/Yu Gothic|Hiragino|Noto Sans JP/.test(v.ja),v.ja);
  /* 폰트 이름을 직접 쓴 자리가 없어야 한다 (변수만 쓴다) */
  const hard=await p.evaluate(()=>{
    let n=0;
    for(const sh of document.styleSheets){
      let rs; try{rs=sh.cssRules;}catch(e){continue;}
      if(!rs)continue;
      for(const r of rs){
        const t=r.cssText||'';
        if(/font-family/.test(t)&&/Malgun|Segoe UI|Pretendard/.test(t)
           &&!/--sans|--ja|--serif|@font-face/.test(t))n++;
      }
    }
    return n;
  });
  ok('Z8 CSS 에 폰트 이름을 직접 박은 규칙이 없다',hard===0,String(hard));
  /* 일본어가 들어가는 칸이 --ja 를 쓴다 */
  await p.evaluate(()=>{DB.study.words=[{id:'w1',lv:'N4',src:'b1:1',kana:'あめ',kanji:'雨',ko:'비',
    cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null}];
    DB.study.sents=[{id:'s1',ja:'雨が 降って いました。 そこで、 タクシーで 帰りました。',ko:'비가 왔다',
      lv:'N4',src:'b1:199',seen:0,miss:0,streak:0,lastSeen:null,
      slots:[{kind:'conj',target:'そこで',opts:['それで','だから','しかし'],why:'해설'}]}];
    setStTab('word');stDrillStart('gconj',1);});
  await p.waitForTimeout(450);
  const jaFont=await p.evaluate(()=>{
    const e=document.querySelector('#v-study .gja');
    return e?getComputedStyle(e).fontFamily:'(없음)';});
  ok('Z9 문법 문제 칸이 --ja 를 쓴다',jaFont.indexOf('Pretendard JP Variable')>=0,jaFont);
  const optFont=await p.evaluate(()=>{
    const e=document.querySelector('#v-study .stdopt button');
    return e?getComputedStyle(e).fontFamily:'(없음)';});
  ok('Z10 보기 버튼도 --ja 를 쓴다',optFont.indexOf('Pretendard JP Variable')>=0,optFont);
  ok('Z11 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── 📝 CTX. 문맥규정 드릴 (v4.50 · 학습방 v22·v23) ──
    로한: *"이 문장에 내가 모르는게 없었으면 좋겠거든. … 정답을 클릭하고 다음엔 각각의 단어에
    하이라이트 되면서 4지선다로 뜻을 물어보는거지. 사실상 문제는 1문제이지만 하부 문제까지 하면 5-6문제"*
    🔒 픽스처는 **서버 실물**이다(x71-01·09·05). 짧게 만든 가짜로는 이 결함이 안 나온다. */
 {
  const CTX=[
   {id:'x71-01',ja:'テストの けっかを 聞いて、すこし あんしん しました。',
    ko:'시험 결과를 듣고 조금 안심했습니다.',lv:'N4',src:'b1:71',seen:0,miss:0,streak:0,lastSeen:null,
    gloss:[{w:'テスト',ko:'시험, 테스트',base:'テスト',orig:'test'},
           {w:'けっか',ko:'결과',unk:true,base:'けっか',kanji:'結果',wordId:'w0859'},
           {w:'聞いて',ko:'듣다',base:'きく',note:'て형 (く→いて)',kanji:'聞く'},
           {w:'すこし',ko:'조금',base:'すこし',kanji:'少し',wordId:'w0690'},
           {w:'あんしん',ko:'안심',base:'あんしん',kanji:'安心',wordId:'w0595'},
           {w:'しました',ko:'하다',base:'する',note:'ます형 과거'}],
    slots:[{kind:'ctx',form:'noun',target:'あんしん',wordId:'w0595',
            opts:['あんてい','せつめい','でんとう'],why:'결과를 듣고 마음이 놓였다는 뜻이라 안심.'}],
    koOpts:['시험 설명을 듣고 조금 안심했습니다.','시험 결과를 듣고 조금 실망했습니다.',
            '시험 결과를 말하고 조금 안심했습니다.']},
   {id:'x71-09',ja:'ネットニュースに、わたしの クラブの かつどうが のりました。',
    ko:'인터넷 뉴스에 우리 동아리 활동이 실렸습니다.',lv:'N4',src:'b1:71',seen:0,miss:0,streak:0,lastSeen:null,
    gloss:[{w:'ネットニュース',ko:'인터넷 뉴스',base:'ネットニュース',orig:'net + news'},
           {w:'クラブ',ko:'동아리, 클럽',base:'クラブ',orig:'club'},
           {w:'かつどう',ko:'활동',unk:true,base:'かつどう',kanji:'活動',wordId:'w1041'},
           {w:'のりました',ko:'실리다',base:'のる',note:'ます형 과거',kanji:'載る',wordId:'w1038'}],
    slots:[{kind:'ctx',form:'masu-past',target:'のりました',wordId:'w1038',
            opts:['のせました','あけました','つきました'],why:'載る는 자동사라 が가 온다.'}],
    koOpts:['인터넷 뉴스를 보고 우리 동아리에 가입했습니다.','인터넷 뉴스에 우리 동아리 활동을 실었습니다.',
            '인터넷 뉴스에 우리 동아리 활동이 취소되었습니다.']},
   {id:'x71-05',ja:'いえから バスていまで とおくて、とても ふべんです。',
    ko:'집에서 버스 정류장까지 멀어서 아주 불편합니다.',lv:'N4',src:'b1:71',seen:0,miss:0,streak:0,lastSeen:null,
    gloss:[{w:'いえ',ko:'집',base:'いえ',kanji:'家'},
           {w:'バスてい',ko:'버스 정류장',base:'バスてい',orig:'bus + 停',kanji:'バス停'},
           {w:'とおくて',ko:'멀다',base:'とおい',note:'い형용사 연결',kanji:'遠い',wordId:'w0713'},
           {w:'ふべん',ko:'불편함',base:'ふべん',kanji:'不便',wordId:'w1000'}],
    slots:[{kind:'ctx',form:'noun',target:'ふべん',wordId:'w1000',
            opts:['だいじ','てきとう','ねっしん'],why:'멀어서 → 불편.'}],
    koOpts:['집에서 버스 정류장까지 가까워서 아주 편리합니다.','집에서 버스 정류장까지 멀어서 아주 즐겁습니다.',
            '집에서 역까지 멀어서 아주 불편합니다.']}];
  const CW=[
   {id:'w0595',kana:'あんしん',kanji:'安心',ko:'안심',pos:'noun',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'w0859',kana:'けっか',kanji:'結果',ko:'결과',pos:'noun',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'w0690',kana:'すこし',kanji:'少し',ko:'조금',pos:'adv',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'w1041',kana:'かつどう',kanji:'活動',ko:'활동',pos:'noun',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'w1038',kana:'のる',kanji:'載る',ko:'실리다',pos:'verb',vgroup:1,homophone:true,seen:0,miss:0,streak:0,lastSeen:null},
   {id:'w0728',kana:'のる',kanji:'乗る',ko:'타다',pos:'verb',vgroup:1,homophone:true,seen:0,miss:0,streak:0,lastSeen:null},
   {id:'w0713',kana:'とおい',kanji:'遠い',ko:'멀다',pos:'adj-i',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'w1000',kana:'ふべん',kanji:'不便',ko:'불편함',pos:'noun',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx01',kana:'けいけん',kanji:'経験',ko:'경험',pos:'noun',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx02',kana:'きかい',kanji:'機会',ko:'기회',pos:'noun',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx03',kana:'せつめい',kanji:'説明',ko:'설명',pos:'noun',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx04',kana:'ゆっくり',ko:'천천히',pos:'adv',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx05',kana:'すぐ',ko:'바로',pos:'adv',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx06',kana:'たまに',ko:'때때로',pos:'adv',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx07',kana:'ちかい',kanji:'近い',ko:'가깝다',pos:'adj-i',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx08',kana:'たかい',kanji:'高い',ko:'비싸다',pos:'adj-i',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx09',kana:'ひろい',kanji:'広い',ko:'넓다',pos:'adj-i',seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx10',kana:'かえる',kanji:'帰る',ko:'돌아가다',pos:'verb',vgroup:1,seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx11',kana:'あける',kanji:'開ける',ko:'열다',pos:'verb',vgroup:2,seen:0,miss:0,streak:0,lastSeen:null},
   {id:'wx12',kana:'つく',kanji:'着く',ko:'도착하다',pos:'verb',vgroup:1,seen:0,miss:0,streak:0,lastSeen:null}];
  const st=BASE();
  st.study.sents=JSON.parse(JSON.stringify(CTX));
  st.study.words=JSON.parse(JSON.stringify(CW));
  const {b,p,errs}=await boot(st);
  await p.evaluate(()=>{gotoTab('study');setStTab('word');});
  await p.waitForTimeout(350);
  /* ① 모드가 생겼고 문항 수를 정직하게 말한다 */
  ok('CTX1 문맥규정 모드가 있다',(await p.evaluate(()=>stGModeOK('gctx')))===true);
  ok('CTX2 ctx 슬롯 3문항을 센다',(await p.evaluate(()=>stGramItems('gctx').length))===3);
  ok('CTX3 시작 칸에 모드가 보인다',
     (await p.$eval('#v-study .gmode',e=>e.textContent)).indexOf('문맥규정')>=0);
  /* ② 🔒 문장은 가나 그대로 — 한자를 덧붙이지 않는다(v22 핵심) */
  const q1=await p.evaluate(()=>stGMkQ(stSentById('x71-09'),'gctx',{slot:stGSlot(stSentById('x71-09'),'ctx')}));
  ok('CTX4 빈칸이 뚫린다',q1&&q1.ja.indexOf('（　）')>=0,JSON.stringify(q1&&q1.ja));
  ok('CTX5 🔒 정답이 문제에 남아 있지 않다',q1&&q1.ja.indexOf('のりました')<0,JSON.stringify(q1&&q1.ja));
  ok('CTX6 보기 4개',q1&&q1.opts.length===4,JSON.stringify(q1&&q1.opts));
  /* ③ 하부 문항 — 🔴 로한이 말한 「5-6문제」가 실제로 나오는지 */
  const Q01="stGMkQ(stSentById('x71-01'),'gctx',{slot:stGSlot(stSentById('x71-01'),'ctx')})";
  const subs=await p.evaluate(()=>stCtxSubs(stSentById('x71-01'),
     stGMkQ(stSentById('x71-01'),'gctx',{slot:stGSlot(stSentById('x71-01'),'ctx')}))
     .map(x=>({k:x.kind,w:x.w||'',n:x.opts.length,unk:!!(x.g&&x.g.unk)})));
  /* 📝 v4.52 — 문장 속 단어 5 + 보기 4 + 번역 1. 보기 중 단어은행에 없는 건 빠진다 */
  ok('CTX7 한 문장이 하부 여러 문항이 된다 (단어 + 보기 + 번역)',
     subs.filter(x=>x.k==='word').length>=4&&subs.some(x=>x.k==='opt')&&subs.some(x=>x.k==='ko'),
     JSON.stringify(subs));
  /* 📝 v4.52 — 정답 단어는 **문장 쪽에서는** 안 묻는다(같은 자리를 두 번 묻는 꼴이라).
     대신 **보기 쪽에서 한 번** 묻는다 — 빈칸을 맞혔다고 뜻을 아는 건 아니다(문맥으로 찍을 수 있다).
     🔒 어느 쪽이든 **두 번은 안 묻는다**. */
  ok('CTX8 정답 단어를 문장 쪽에서 또 묻지 않는다',
     !subs.some(x=>x.k==='word'&&x.w==='あんしん'),JSON.stringify(subs));
  ok('CTX8b 대신 보기 쪽에서 정확히 한 번 묻는다',
     subs.filter(x=>x.w==='あんしん').length===1,JSON.stringify(subs.filter(x=>x.w==='あんしん')));
  /* 📝 v4.61 — 학습방 v27 #1: 번역을 **맨 앞에**. 문장을 통째로 이해하는지 먼저 잰다 */
  ok('CTX9 맨 앞은 문장 번역이다 (v27)',subs[0].k==='ko',JSON.stringify(subs[0]));
  ok('CTX10 하부도 전부 4지선다',subs.every(x=>x.n===4),JSON.stringify(subs.map(x=>x.n)));
  /* 🔒 v4.50 — 로한: "형광펜 신경쓰지말고, 걍 내 말대로 해"
     문장에 나온 **순서 그대로** 묻는다. unk 로 앞에 끌어오면 읽는 흐름이 끊긴다. */
  const order=await p.evaluate(()=>{
    const s=stSentById('x71-01');
    const want=stCtxGloss(s).map(g=>g.w).filter(w=>w!=='あんしん');
    const q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    const got=stCtxSubs(s,q).filter(x=>x.kind==='word').map(x=>x.w);
    return {want:want,got:got};});
  ok('CTX11 문장에 나온 순서 그대로 묻는다',
     JSON.stringify(order.got)===JSON.stringify(order.want),JSON.stringify(order));
  ok('CTX11b 묻기 전에 🖍 로 힌트를 주지 않는다',
     (await p.evaluate(()=>{
       const s=stSentById('x71-01');
       const it=stCtxSubs(s,stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')}))[0];
       ST_DRILL={mode:'gctx',ids:[s.id],qs:[{ans:'あんしん',ja:s.ja,opts:[],why:''}],
         i:0,res:[{id:s.id,ok:true,my:'あんしん'}],show:true,fin:false,start:Date.now(),
         sub:{list:[it],j:0,show:false,bad:0}};
       const h=stCtxRun(); ST_DRILL=null; return h.indexOf('🖍')<0;}))===true);
  /* ④ 🔴 unk 가 0개인 문장도 하부가 나온다 — 스펙 v23(unk 만)을 그대로 따르면 0이 된다 */
  const s05=await p.evaluate(()=>({
     unk:(stSentById('x71-05').gloss||[]).filter(g=>g.unk).length,
     subs:stCtxSubs(stSentById('x71-05'),
       stGMkQ(stSentById('x71-05'),'gctx',{slot:stGSlot(stSentById('x71-05'),'ctx')})).length}));
  ok('CTX12 🔴 형광펜이 0개인 문장도 전 단어를 묻는다',s05.unk===0&&s05.subs>=3,JSON.stringify(s05));
  /* ⑤ 🔒 전수 검사 — 모든 ctx 문장 × 모든 하부문항. 샘플링하지 않는다(v4.45 교훈) */
  const sweep=await p.evaluate(()=>{
    const bad=[], seen={};
    stSents().forEach(function(s){
      const sl=stGSlot(s,'ctx'); if(!sl)return;
      const q=stGMkQ(s,'gctx',{slot:sl});
      if(!q){bad.push(s.id+':문항없음');return;}
      if(String(q.ja).indexOf(String(q.ans))>=0)bad.push(s.id+':정답이 문제에 남았다');
      if(q.opts.length!==4)bad.push(s.id+':보기 '+q.opts.length);
      if(new Set(q.opts).size!==4)bad.push(s.id+':보기 중복');
      stCtxSubs(s,q).forEach(function(it){
        if(it.opts.length!==4)bad.push(s.id+'/'+(it.w||'ko')+':보기 '+it.opts.length);
        if(new Set(it.opts).size!==4)bad.push(s.id+'/'+(it.w||'ko')+':보기 중복');
        if(it.opts.indexOf(it.ans)<0)bad.push(s.id+'/'+(it.w||'ko')+':정답이 보기에 없다');
        if(it.kind==='word'){
          if(stCtxHits(s.ja,it.w)!==1)bad.push(s.id+'/'+it.w+':문장에 '+stCtxHits(s.ja,it.w)+'번');
        }
        /* 📝 v4.52 — 보기 문항: 보기에 있던 말이어야 하고, 뜻이 정확해야 한다 */
        if(it.kind==='opt'){
          if(q.opts.indexOf(it.w)<0)bad.push(s.id+'/'+it.w+':보기에 없는 말');
          const ws=stOptWords(it.w,q,s);
          if(!ws.length)bad.push(s.id+'/'+it.w+':단어은행에 없는데 물었다');
          else if(stKoJoin(ws)!==it.ans)bad.push(s.id+'/'+it.w+':뜻이 다르다');
          /* 🔒 v4.60 — 같은 소리의 다른 뜻이 **오답으로** 나오면 안 된다 */
          stWordsByKana(it.w).forEach(function(h){
            if(it.opts.some(function(o){return o!==it.ans&&stNorm(o)===stNorm(h.ko);}))
              bad.push(s.id+'/'+it.w+':같은 소리의 다른 뜻('+h.ko+')이 오답에 섞였다');
          });
        }
        /* 🔒 같은 말을 두 번 묻지 않는다 */
        if(it.kind!=='ko'){
          /* 📝 v4.61 — 기본형(꼴)과 뜻은 다른 질문이다. 종류까지 묶어 센다 */
          const key=(it.kind==='base'?'base:':'')+stNorm(it.w);
          seen[s.id]=seen[s.id]||{};
          if(seen[s.id][key])bad.push(s.id+'/'+it.w+':두 번 물었다');
          seen[s.id][key]=1;
        }
      });
    });
    return bad;});
  ok('CTX13 🔒 전수: 정답 노출·보기 중복·하이라이트 전부 깨끗',sweep.length===0,JSON.stringify(sweep));
  /* ⑥ 실제로 돌려본다 — 빈칸 맞히고 해설, 그다음 하부 사슬 */
  await p.evaluate(()=>stDrillStart('gctx',3));
  await p.waitForTimeout(350);
  const ans=await p.evaluate(()=>stGramQ(ST_DRILL,0).ans);
  const sid=await p.evaluate(()=>ST_DRILL.ids[ST_DRILL.i]);   /* 🔒 순서가 랜덤이다 — 읽어둔다 */
  await p.evaluate(a=>stDrillGrade(a),ans);
  await p.waitForTimeout(300);
  const whyTxt=await p.$eval('#v-study .stdq',e=>e.textContent);
  /* 🔴 v4.51 [결함] 여기서 해설을 통째로 띄웠다. 그 표에 문장의 모든 단어 뜻이 적혀 있는데,
     그걸 보여준 다음에 「이 단어 뜻은?」을 물으면 **방금 본 표를 보고 맞힌다.**
     로한: "정답을 누르고, 정답만 정오답을 알려주고, 구성요소 물어보고, 그다음 최종 정리된걸"
     🔒 채점 직후에는 빈칸의 정오답만. 해설은 점검이 **끝난 뒤** 정리 화면에서. */
  ok('CTX14 🔴 채점 직후엔 단어 분해표가 없다 (보고 맞히면 점검이 아니다)',
     whyTxt.indexOf('단어 분해')<0,whyTxt.slice(0,120));
  ok('CTX14b 보기의 뜻도 아직 안 보여준다',whyTxt.indexOf('보기의 뜻')<0);
  ok('CTX14c 정답은 말해준다 (정오답은 즉시)',
     /맞음|틀림/.test(whyTxt)&&whyTxt.indexOf(ans)>=0,whyTxt.slice(0,80));
  /* 🔒 묻기 전 화면에 **하부 정답이 하나도 안 보인다** — 전수로 본다 */
  const leak=await p.evaluate(i=>{
    const s=stSentById(i), q=stGramQ(ST_DRILL,ST_DRILL.i);
    const txt=document.querySelector('#v-study .stdq').textContent;
    return stCtxSubs(s,q).filter(function(it){return txt.indexOf(it.ans)>=0;})
      .map(function(it){return (it.w||'ko')+'→'+it.ans;});},sid);
  ok('CTX14d 🔒 묻기 전 화면에 하부 정답이 새지 않는다 (전수)',leak.length===0,JSON.stringify(leak));
  /* 🔴 보기가 활용형(のせました)이면 words(사전형 のる) 조회가 안 된다 — **그게 정상이다**.
     드릴 순서는 랜덤이라 어느 문장이 먼저 올지 모른다 → 사전형 보기를 쓰는 문장으로 직접 단언한다. */
  const why01=await p.evaluate(()=>stCtxWhy(stSentById('x71-01'),
     stGMkQ(stSentById('x71-01'),'gctx',{slot:stGSlot(stSentById('x71-01'),'ctx')})));
  ok('CTX15 해설 자체는 만들어진다 (정리 화면용 · 사전형 보기)',why01.indexOf('보기의 뜻')>=0&&why01.indexOf('설명')>=0,
     why01.slice(0,80));
  const why09=await p.evaluate(()=>stCtxWhy(stSentById('x71-09'),
     stGMkQ(stSentById('x71-09'),'gctx',{slot:stGSlot(stSentById('x71-09'),'ctx')})));
  /* 📝 v4.52 — 🔴 전엔 못 찾은 보기를 **조용히 뺐다**. 그러면 「이 보기는 뜻을 모른다」는
     사실까지 사라진다 — 학습방이 그걸 보고 단어은행에 넣어야 한다. 이제 줄로 남긴다. */
  ok('CTX15b 못 찾은 보기도 「단어은행에 없다」로 남긴다',
     why09.indexOf('보기의 뜻')>=0&&why09.indexOf('단어은행에 없다')>=0,why09.slice(0,120));
  ok('CTX16 다음은 「문장 점검」이다',whyTxt.indexOf('문장 점검')>=0);
  await p.evaluate(()=>stCtxGo());await p.waitForTimeout(300);
  ok('CTX17 점검 화면으로 들어간다',(await p.evaluate(()=>!!(ST_DRILL.sub&&ST_DRILL.sub.list.length)))===true);
  /* 🔴 v4.53 — 칠하는 게 아니라 **가린다**. 로한: "4지선다로 보여주니까 문장상에서
     추론이 돼서 엄청 쉬워진다" — 실측 빈칸 0/3 인데 구성요소 13/15 였다. */
  /* 📝 v4.61 — 첫 문항은 번역이라 문장이 보이는 게 맞다. **틀려서 열린 진단**이 문장을 가리는지 본다 */
  const first=await p.evaluate(()=>{const it=ST_DRILL.sub.list[0];
    return {kind:it.kind,words:ST_DRILL.sub.list.filter(x=>x.kind==='word').length,wrong:it.opts.filter(o=>o!==it.ans)[0]};});
  /* 🔴 v4.63 — 로한: 「번역 맞추기가 존나 쉬워 … 무조건 구성요소 물어봐야돼」 → 구성요소는 처음부터 목록에 있다 */
  ok('CTX17b 첫 문항은 번역이고, 구성요소는 처음부터 목록에 있다 (v4.63)',first.kind==='ko'&&first.words>0,JSON.stringify(first));
  await p.evaluate(a=>{stCtxGrade(a);stCtxNext();},first.wrong);await p.waitForTimeout(200);
  ok('CTX17c 🔍 번역을 틀리면 진단이 바로 뒤에 열린다',
     (await p.evaluate(()=>{const it=ST_DRILL.sub.list[ST_DRILL.sub.j];return !!(it&&it.diag);}))===true);
  const hide=await p.evaluate(()=>{
    const it=ST_DRILL.sub.list[ST_DRILL.sub.j];
    const q=document.querySelector('#v-study .gja').textContent;
    return {q:q,w:it.w,ja:stDrillItem(ST_DRILL,ST_DRILL.i).ja,kind:it.kind};});
  ok('CTX18 🔴 묻는 단어만 띄운다 (문장은 가린다)',
     hide.q.trim()===String(hide.w).trim(),JSON.stringify(hide));
  ok('CTX18a 문장이 화면에 없다',
     (await p.$eval('#v-study .stdq',e=>e.textContent)).indexOf(hide.ja)<0);
  ok('CTX18f 하이라이트 자체가 사라졌다 (칠할 자리가 없다)',
     (await p.$$('#v-study .ghl')).length===0);
  /* 하부를 전부 맞힌다 → 통과 */
  const walk=async()=>{
    for(let k=0;k<48;k++){
      const st=await p.evaluate(()=>{
        const S=ST_DRILL&&ST_DRILL.sub; if(!S)return null;
        return {j:S.j,n:S.list.length,show:!!S.show,ans:S.list[S.j]?S.list[S.j].ans:null};});
      if(!st)return;
      if(!st.show)await p.evaluate(a=>stCtxGrade(a),st.ans);
      else await p.evaluate(()=>stCtxNext());
      await p.waitForTimeout(90);
    }
  };
  /* 📝 v4.61 — 위(CTX17c)에서 진단을 열려고 번역을 **일부러 틀렸다**. 그 문장은 통과가 아닌 게 맞다.
     🔒 「전부 맞히면 통과」는 같은 문장으로 **처음부터 다시** 잰다 */
  await p.evaluate(i=>{
    const s=stSentById(i); delete s.comp;
    const q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    ST_DRILL={mode:'gctx',ids:[i],qs:[q],i:0,res:[{id:i,ok:true,my:q.ans}],
      show:true,fin:false,start:Date.now()};
    stCtxGo();},sid);
  await walk();
  /* 🔴 v4.51 — 점검이 끝나면 **정리 화면**이다. 여기서 처음 해설이 펼쳐진다 */
  const sum=await p.evaluate(()=>({on:!!(ST_DRILL&&ST_DRILL.sum),
     txt:document.querySelector('#v-study .stdq').textContent}));
  ok('CTX18b 점검이 끝나면 정리 화면으로 간다 (바로 다음 문항이 아니다)',sum.on===true);
  ok('CTX18c 정리에서 비로소 단어 분해표가 펼쳐진다',sum.txt.indexOf('단어 분해')>=0,sum.txt.slice(0,100));
  ok('CTX18d 정리에 번역과 숙달 상태가 있다',
     /숙달|통과/.test(sum.txt),sum.txt.slice(-90));
  await p.evaluate(()=>stCtxSumNext());await p.waitForTimeout(200);
  ok('CTX18e 「다음 문장」을 누르면 정리가 닫힌다',
     (await p.evaluate(()=>!(ST_DRILL&&ST_DRILL.sum)))===true);
  const c1=await p.evaluate(i=>stCompOf(stSentById(i)),sid);
  ok('CTX19 전부 맞히면 통과가 1 쌓인다',c1.streak===1&&!c1.mastered,JSON.stringify(c1));
  ok('CTX20 통과한 날을 적어둔다 (「다른 날」을 판정하려면 필요하다)',
     c1.last===(await p.evaluate(()=>todayStr())),JSON.stringify(c1));
  /* ⑦ 🔒 같은 날 또 통과해도 숙달이 되지 않는다 — 「서로 다른 날 2연속」이다 */
  const same=await p.evaluate(i=>{const s=stSentById(i);stCompMark(s,true);return stCompOf(s);},sid);
  ok('CTX21 🔒 같은 날 두 번은 숙달이 아니다',same.streak===1&&!same.mastered,JSON.stringify(same));
  const nextDay=await p.evaluate(i=>{
    const s=stSentById(i); s.comp.last='2000-01-01';
    stCompMark(s,true); return stCompOf(s);},sid);
  ok('CTX22 다른 날 통과하면 숙달이다',nextDay.streak===2&&nextDay.mastered===true,JSON.stringify(nextDay));
  /* ⑧ 하나라도 틀리면 연속이 끊긴다 */
  const brk=await p.evaluate(i=>{
    const s=stSents().filter(function(x){return x.id!==i;})[0];
    stCompMark(s,true);stCompMark(s,false);return stCompOf(s);},sid);
  ok('CTX23 🔒 하나라도 틀리면 0 으로 돌아간다',brk.streak===0,JSON.stringify(brk));
  /* ⑨ 단어 카운터 — 하부 오답이 words 에 쌓인다 */
  const wc=await p.evaluate(()=>{
    const w=stWordById('w0859'), before=+w.miss||0;
    stCtxWordHit({wordId:'w0859'},false);
    return {before:before,after:+stWordById('w0859').miss||0,seen:+stWordById('w0859').seen||0};});
  ok('CTX24 하부 오답이 단어에 쌓인다',wc.after===wc.before+1&&wc.seen>=1,JSON.stringify(wc));
  /* ⑩ 🔒 본문항 수가 하부로 부풀지 않는다 */
  ok('CTX25 🔒 「3문항」이면 빈칸이 3개다 (하부로 부풀리지 않는다)',
     /* 📝 v4.61 — 위에서 한 문장짜리로 다시 시작했으니 **새로 열어** 잰다 */
     (await p.evaluate(()=>{ST_DRILL=null;stDrillStart('gctx',3);const n=ST_DRILL?ST_DRILL.ids.length:-1;ST_DRILL=null;return n;}))===3);
  /* ⑪ 동음이의어 병기 */
  const hom=await p.evaluate(()=>stCtxWhy(stSentById('x71-09'),stGMkQ(stSentById('x71-09'),'gctx',{slot:stGSlot(stSentById('x71-09'),'ctx')})));
  ok('CTX26 동음이의어를 병기한다 (載る↔乗る)',hom.indexOf('乗る')>=0&&hom.indexOf('같은 소리')>=0);
  /* ⑫ 숙달 지표 */
  /* 🔒 드릴을 닫고 봐야 시작 칸이 나온다 — 드릴 중엔 그 화면이 판을 차지한다 */
  await p.evaluate(()=>{ST_DRILL=null;setStTab('word');renderStudy();});await p.waitForTimeout(300);
  const stat=await p.evaluate(()=>stCtxStat());
  ok('CTX27 숙달 집계는 파생이다 (3문장 중 1개 숙달)',stat.n===3&&stat.mastered===1,JSON.stringify(stat));
  ok('CTX28 화면이 숙달을 말한다 (.mstbar — 🔴 .ctxbar 는 목표 진척 막대가 이미 쓰는 이름이었다)',
     (await p.$$('#v-study .mstbar')).length===1&&
     (await p.$eval('#v-study',e=>e.textContent)).indexOf('문맥구성 숙달')>=0);
  /* ⑬ 📝 로한 질문(푸쉬 전): "각 단어 별로 내가 정답 고르면 **바로 그자리에서** 정오답
     가려내야돼. 다 선택하고 제출 하면 나오는게 아니라. 그리고 **그 오답 데이터들도 모아져야**되고"
     🔒 ① 고르는 즉시 채점 — 제출 단추가 없다
     🔒 ② 틀린 것은 단어은행 + 드릴 기록 **둘 다**에 남는다.
        🔴 처음 구현은 words.miss 만 올렸다. wordId 가 없는 항목(54 중 24)은 아무데도
           안 쌓였고, 창을 닫으면 '무엇을 틀렸는지'가 통째로 사라졌다. */
  await p.evaluate(()=>{ST_DRILL=null;DB.study.drills=[];
    stSents().forEach(function(x){delete x.comp;});
    stWords().forEach(function(w){w.miss=0;w.seen=0;w.streak=0;w.lastSeen=null;});
    stDrillStart('gctx',1);});
  await p.waitForTimeout(300);
  const sid2=await p.evaluate(()=>ST_DRILL.ids[0]);
  await p.evaluate(()=>stDrillGrade(stGramQ(ST_DRILL,0).ans));
  await p.evaluate(()=>stCtxGo());await p.waitForTimeout(250);
  /* ① 제출 단추가 없다 — 보기를 누르기 전에는 ○/✗ 도 없다 */
  const pre=await p.evaluate(()=>({
    submit:/제출/.test(document.querySelector('#v-study').textContent),
    mark:document.querySelectorAll('#v-study .stdmark').length,
    opts:document.querySelectorAll('#v-study .stdopt button').length}));
  ok('CTX30 제출 단추가 없다 (모아서 내지 않는다)',pre.submit===false,JSON.stringify(pre));
  ok('CTX31 고르기 전엔 정오답 표시가 없다',pre.mark===0&&pre.opts===4,JSON.stringify(pre));
  /* 🔴 일부러 **틀리게** 고른다 — 그 자리에서 ✗ 가 떠야 한다 */
  /* 📝 v4.61 — 첫 문항이 번역이 됐다. 번역은 맞히고(진단이 안 열린다) 다음 보기에서 틀린다 */
  await p.evaluate(()=>{const it=ST_DRILL.sub.list[0];stCtxGrade(it.ans);stCtxNext();});
  await p.waitForTimeout(150);
  const bad1=await p.evaluate(()=>{
    const it=ST_DRILL.sub.list[ST_DRILL.sub.j];
    return {w:it.w,ans:it.ans,wrong:it.opts.filter(o=>o!==it.ans)[0],
            bank:!!(it.g&&it.g.wordId),wid:(it.g||{}).wordId||''};});
  await p.evaluate(a=>stCtxGrade(a),bad1.wrong);
  await p.waitForTimeout(200);
  const post=await p.evaluate(()=>({
    mark:(document.querySelector('#v-study .stdmark')||{}).textContent||'',
    body:document.querySelector('#v-study .stdq').textContent}));
  ok('CTX32 🔴 고른 즉시 그 자리에서 틀렸다고 말한다',/틀림/.test(post.mark),JSON.stringify(post.mark));
  ok('CTX33 내 답과 정답을 같이 보여준다',
     post.body.indexOf(bad1.ans)>=0&&post.body.indexOf(bad1.wrong)>=0);
  ok('CTX34 어디에 쌓였는지 말한다',
     /단어은행/.test(post.body),post.body.slice(-120));
  /* ② 단어은행 카운터 — wordId 가 있을 때만 */
  if(bad1.bank){
    const wc2=await p.evaluate(i=>{const w=stWordById(i);return {miss:+w.miss||0,seen:+w.seen||0,streak:+w.streak||0};},bad1.wid);
    ok('CTX35 틀림이 단어은행에 즉시 쌓인다',wc2.miss===1&&wc2.seen===1&&wc2.streak===0,JSON.stringify(wc2));
  }else{
    ok('CTX35 (이 항목은 단어은행에 없다 — 기록 쪽에서 잡는다)',true);
  }
  /* 세션 집계가 즉시 쌓인다 */
  const sa=await p.evaluate(()=>JSON.parse(JSON.stringify(ST_DRILL.subAll||{})));
  ok('CTX36 세션 집계에 바로 들어간다 (번역 맞힘 1 + 보기 틀림 1)',
     sa.n===2&&sa.bad===1&&sa.wrong.length===1,JSON.stringify(sa));
  ok('CTX37 무엇을·어떻게 틀렸는지 남는다 (내 답까지)',
     sa.wrong[0].q===bad1.w&&sa.wrong[0].ans===bad1.ans&&sa.wrong[0].my===bad1.wrong,
     JSON.stringify(sa.wrong[0]));
  ok('CTX38 어느 문장이었는지도 남는다',sa.wrong[0].sid===sid2,JSON.stringify(sa.wrong[0]));
  ok('CTX39 🔒 단어은행에 없으면 그 사실을 적는다 (조용히 흘리지 않는다)',
     bad1.bank?(sa.wrong[0].wordId===bad1.wid&&!('nobank' in sa.wrong[0]))
              :(sa.wrong[0].nobank===true&&!('wordId' in sa.wrong[0])),JSON.stringify(sa.wrong[0]));
  /* 나머지 하부를 전부 틀리게 밀어 끝까지 간다 */
  for(let k=0;k<48;k++){
    const st2=await p.evaluate(()=>{
      const S=ST_DRILL&&ST_DRILL.sub; if(!S)return null;
      const it=S.list[S.j];
      return {show:!!S.show,wrong:it?it.opts.filter(o=>o!==it.ans)[0]:null};});
    if(!st2)break;
    if(!st2.show)await p.evaluate(a=>stCtxGrade(a),st2.wrong);
    else await p.evaluate(()=>stCtxNext());
    await p.waitForTimeout(80);
  }
  /* 🔒 정리 화면을 닫아야 기록이 쌓인다(마지막 문항이면 stDrillFinish 로 간다) */
  if(await p.evaluate(()=>!!(ST_DRILL&&ST_DRILL.sum)))
    await p.evaluate(()=>stCtxSumNext());
  await p.waitForTimeout(150);
  /* ③ 🔴 드릴 기록에 남는다 — 창을 닫아도 사라지지 않는다 */
  const rec3=await p.evaluate(()=>DB.study.drills[DB.study.drills.length-1]);
  /* 📝 v4.61 — 번역은 맞히고(진단이 안 열린다) 나머지는 전부 틀렸다 */
  ok('CTX40 🔴 드릴 기록에 하부 집계가 남는다 (번역 1 맞힘 · 나머지 전부 틀림)',
     !!(rec3&&rec3.sub&&rec3.sub.n>=2&&rec3.sub.bad===rec3.sub.n-1),JSON.stringify(rec3&&rec3.sub));
  ok('CTX41 🔴 틀린 항목 목록이 남는다 (오답노트 재료)',
     !!(rec3&&rec3.subWrong&&rec3.subWrong.length===rec3.sub.bad),
     JSON.stringify(rec3&&(rec3.subWrong||[]).map(x=>x.q)));
  ok('CTX42 🔒 본문항 수는 하부로 부풀지 않는다 (1문항 그대로)',rec3.n===1,JSON.stringify({n:rec3.n,sub:rec3.sub}));
  ok('CTX43 전부 틀렸으니 숙달이 아니다',
     (await p.evaluate(i=>stCompOf(stSentById(i)).streak,sid2))===0);
  /* ④ 화면이 하부를 말한다 */
  await p.evaluate(()=>{ST_DRILL=null;setStTab('word');renderStudy();});
  await p.waitForTimeout(250);
  ok('CTX44 최근 드릴 줄이 하부도 말한다',
     /점검\(직전 접촉\) \d+\/\d+/.test(await p.$eval('#v-study',e=>e.textContent)));
  /* ⑤ 🔒 전부 맞힌 세션에는 하부 오답 서랍을 만들지 않는다 */
  await p.evaluate(()=>{DB.study.drills=[];stDrillStart('gctx',1);});
  await p.waitForTimeout(250);
  await p.evaluate(()=>stDrillGrade(stGramQ(ST_DRILL,0).ans));
  await p.evaluate(()=>stCtxGo());await p.waitForTimeout(200);
  for(let k=0;k<48;k++){
    const st3=await p.evaluate(()=>{
      const S=ST_DRILL&&ST_DRILL.sub; if(!S)return null;
      return {show:!!S.show,ans:S.list[S.j]?S.list[S.j].ans:null};});
    if(!st3)break;
    if(!st3.show)await p.evaluate(a=>stCtxGrade(a),st3.ans);
    else await p.evaluate(()=>stCtxNext());
    await p.waitForTimeout(80);
  }
  if(await p.evaluate(()=>!!(ST_DRILL&&ST_DRILL.sum)))
    await p.evaluate(()=>stCtxSumNext());
  await p.waitForTimeout(150);
  const rec4=await p.evaluate(()=>DB.study.drills[DB.study.drills.length-1]);
  ok('CTX45 ⚠️ 다 맞히면 빈 서랍을 안 만든다',
     !!rec4.sub&&rec4.sub.bad===0&&!('subWrong' in rec4),JSON.stringify(rec4.sub));
  /* ⑰ 📝 v4.52 — 🔴 보기의 뜻을 **보여주기만** 했다.
     로한: "보기는 무슨 뜻인지 안물어본다. 보기의 뜻을 다 알거라고 생각하면 안되잖아.
     맞든 틀리든 **무조건 다 물어봐야지**" — 보기 4개는 시험에 실제로 나오는 선택지다. */
  const opq=await p.evaluate(()=>{
    const s=stSentById('x71-01');
    const q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    const subs=stCtxSubs(s,q);
    const asked=subs.filter(x=>x.kind==='opt').map(x=>x.w);
    const bankable=q.opts.filter(o=>stOptWords(o,q,s).length>0);
    return {opts:q.opts,asked:asked,bankable:bankable,ans:q.ans,
      right:subs.filter(x=>x.kind==='opt'&&x.right).map(x=>x.w),
      order:subs.map(x=>x.kind)};});
  ok('CTX46 🔴 단어은행에 있는 보기는 **전부** 묻는다',
     opq.bankable.length>0&&opq.bankable.every(o=>opq.asked.indexOf(o)>=0),JSON.stringify(opq));
  ok('CTX47 정답이었던 보기도 묻는다 (맞혔다고 뜻을 아는 건 아니다)',
     opq.asked.indexOf(opq.ans)>=0&&opq.right.length===1,JSON.stringify({asked:opq.asked,ans:opq.ans}));
  /* 📝 v4.61 — 순서가 「번역 → (진단) → 보기」 가 됐다(학습방 v27) */
  ok('CTX48 순서는 번역 → 진단(단어·기본형) → 보기다',
     opq.order[0]==='ko'&&opq.order[opq.order.length-1]==='opt'
     &&opq.order.lastIndexOf('word')<opq.order.indexOf('opt'),JSON.stringify(opq.order));
  /* 🔒 묻기 전에 정답/오답인지 말하지 않는다 */
  const ophtml=await p.evaluate(()=>{
    const s=stSentById('x71-01');
    const q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    const it=stCtxSubs(s,q).filter(x=>x.kind==='opt'&&x.right)[0];
    ST_DRILL={mode:'gctx',ids:[s.id],qs:[q],i:0,res:[{id:s.id,ok:true,my:q.ans}],
      show:true,fin:false,start:Date.now(),sub:{list:[it],j:0,show:false,bad:0}};
    const pre=stCtxRun();
    ST_DRILL.sub.show=true;ST_DRILL.sub.ok=true;ST_DRILL.sub.my=it.ans;
    const post=stCtxRun(); ST_DRILL=null;
    return {pre:pre,post:post,ans:it.ans};});
  /* 🔴 내 단언이 틀렸었다: 정답 **뜻**은 4지선다 보기 안에 당연히 들어 있다(그게 4지선다다).
     볼 것은 「이게 빈칸의 정답이었다」는 **말**을 미리 흘리지 않는가 하나다. */
  ok('CTX49 🔒 묻기 전엔 그게 정답이었다고 말하지 않는다',
     ophtml.pre.indexOf('빈칸의 정답')<0,ophtml.pre.slice(0,120));
  ok('CTX50 답한 뒤에는 말해준다',ophtml.post.indexOf('빈칸의 정답')>=0);
  ok('CTX51 보기 문항엔 하이라이트가 없다 (문장에 없는 말이다)',ophtml.pre.indexOf('ghl')<0);
  /* 🔒 못 물은 보기는 정리에서 **줄로 남는다** — 조용히 빼면 모른다는 사실까지 사라진다 */
  const miss=await p.evaluate(()=>{
    const s=stSentById('x71-09');
    return stCtxWhy(s,stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')}));});
  ok('CTX52 단어은행에 없는 보기도 줄은 남긴다',
     miss.indexOf('단어은행에 없다')>=0,miss.slice(0,100));
  /* ⑱ 🔴 v4.53 학습방 v24 — **힌트로 맞힌 정답은 증거가 아니다.**
     로한: "히라가나만 있을 땐 모르던 게 구성요소마다 4지선다로 보여주니까
     문장상에서 추론이 돼서 엄청 쉬워진다. … 추측으로 맞추는거지"
     실측(10/21): 빈칸 0/3(전부 모르겠다) · 구성요소 13/15(87%).
     🔴 그 정답들이 words 카운터에 「맞힘」으로 쌓여 5개 단어(けっか·てちょう·あたためる·
        まいにち·あたらしい)가 streak:1 이 됐고, 단어 드릴의 「미출제 우선」에서 빠졌다. */
  const asym=await p.evaluate(()=>{
    const w=stWordById('w0859');
    w.seen=0;w.miss=0;w.streak=0;w.lastSeen=null;delete w.retestOn;
    stCtxWordHit({wordId:'w0859'},true);              /* 힌트로 맞힘 */
    const after=JSON.parse(JSON.stringify(stWordById('w0859')));
    stCtxWordHit({wordId:'w0859'},false);             /* 틀림 */
    const bad=JSON.parse(JSON.stringify(stWordById('w0859')));
    return {ok:after,bad:bad};});
  ok('CTX53 🔴 힌트로 맞힌 정답은 카운터를 건드리지 않는다',
     asym.ok.seen===0&&asym.ok.streak===0&&!asym.ok.lastSeen,JSON.stringify(asym.ok));
  ok('CTX54 🔒 「미출제 우선」에서 빠지지 않는다 (seen 이 0 그대로)',asym.ok.seen===0);
  ok('CTX55 틀린 것은 그대로 센다',asym.bad.miss===1&&asym.bad.streak===0&&asym.bad.seen===1,
     JSON.stringify(asym.bad));
  ok('CTX56 🔁 틀리면 **내일** 문맥 없이 다시 묻는다',
     asym.bad.retestOn===(await p.evaluate(()=>addDays(todayStr(),1))),JSON.stringify(asym.bad));
  /* ⑲ 재점검 — 🔒 문맥 없는 r2m 에서 맞혀야 「알게 됐다」 */
  const rt=await p.evaluate(()=>{
    const w=stWordById('w0859');
    w.seen=1;w.miss=1;w.streak=0;w.retestOn=addDays(todayStr(),-1);   /* 어제부터 밀린 재점검 */
    const due=stRetestDue(w);
    const score=stWordScore(w,todayStr());
    const other=stWordById('wx01'); other.seen=0;other.miss=0;delete other.retestOn;
    const scoreFresh=stWordScore(other,todayStr());
    return {due:due,score:score,scoreFresh:scoreFresh};});
  ok('CTX57 재점검이 밀렸으면 due 다',rt.due===true);
  ok('CTX58 🔒 재점검이 **미출제보다도** 먼저다',rt.score>rt.scoreFresh,
     JSON.stringify(rt));
  /* 🔒 문맥 없는 r2m 에서 맞히면 풀린다 */
  const pass=await p.evaluate(()=>{
    const w=stWordById('w0859');
    w.retestOn=todayStr(); w.streak=0;
    ST_DRILL={mode:'r2m',ids:['w0859'],opts:[[]],i:0,res:[],show:false,fin:false,start:Date.now()};
    stDrillRecord(true,'결과',false);
    const a=JSON.parse(JSON.stringify(stWordById('w0859')));
    ST_DRILL=null; return a;});
  ok('CTX59 🔁 문맥 없이 맞히면 재점검이 풀린다',!('retestOn' in pass),JSON.stringify(pass));
  ok('CTX60 그때 비로소 streak 가 오른다',pass.streak===1,JSON.stringify(pass));
  const fail=await p.evaluate(()=>{
    const w=stWordById('w0859');
    w.retestOn=todayStr(); w.streak=0;
    ST_DRILL={mode:'r2m',ids:['w0859'],opts:[[]],i:0,res:[],show:false,fin:false,start:Date.now()};
    stDrillRecord(false,'엉뚱',false);
    const a=JSON.parse(JSON.stringify(stWordById('w0859')));
    ST_DRILL=null; return a;});
  ok('CTX61 틀리면 내일 또 묻는다',
     fail.retestOn===(await p.evaluate(()=>addDays(todayStr(),1))),JSON.stringify(fail));
  /* 🔒 문맥이 있는 모드(gctx)에서는 재점검이 안 풀린다 */
  const notClear=await p.evaluate(()=>{
    const w=stWordById('w0859'); w.retestOn=todayStr();
    stCtxWordHit({wordId:'w0859'},true);
    return JSON.parse(JSON.stringify(stWordById('w0859')));});
  ok('CTX62 🔒 문맥 안에서 맞혀도 재점검은 안 풀린다',
     notClear.retestOn===(await p.evaluate(()=>todayStr())),JSON.stringify(notClear));
  /* ⑳ 모르는 단어(unk)를 문장에서 만나면 그 자체로 재점검 사유 */
  const unkSet=await p.evaluate(()=>{
    stWords().forEach(function(w){delete w.retestOn;});
    const s=stSentById('x71-01');
    const q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    ST_DRILL={mode:'gctx',ids:[s.id],qs:[q],i:0,res:[{id:s.id,ok:true,my:q.ans}],
      show:true,fin:false,start:Date.now()};
    stCtxGo();
    const out=stWords().filter(w=>w.retestOn).map(w=>w.id);
    ST_DRILL=null; return out;});
  ok('CTX63 🔁 문장에서 만난 모르는 단어는 내일 다시 묻는다 (けっか)',
     unkSet.indexOf('w0859')>=0,JSON.stringify(unkSet));
  /* ㉑ ⌨ v4.54 — 키보드. 로한: "마우스 클릭하는 것 조차 손만 아프다"
     1·2·3·4 고르기 / 스페이스 모르겠다 / 엔터 다음. 🔒 **눌러서** 잰다. */
  await p.evaluate(()=>{ST_DRILL=null;DB.study.drills=[];
    stSents().forEach(x=>{delete x.comp;});
    stWords().forEach(w=>{w.seen=0;w.miss=0;w.streak=0;w.lastSeen=null;delete w.retestOn;});
    stDrillStart('gctx',2);});
  await p.waitForTimeout(300);
  const before=await p.evaluate(()=>({
    opts:[...document.querySelectorAll('#v-study .stdopt button')].map(b=>b.textContent.trim()),
    ans:stGramQ(ST_DRILL,ST_DRILL.i).ans}));
  ok('KEY1 보기에 번호가 보인다',
     (await p.$$('#v-study .stdopt button .optk')).length===4,JSON.stringify(before.opts));
  /* 🔒 2번 키를 누르면 **두 번째** 보기를 고른 것이다 */
  const second=await p.evaluate(()=>
    document.querySelectorAll('#v-study .stdopt button')[1].textContent.replace(/^\s*2\s*/,'').trim());
  await p.keyboard.press('2');await p.waitForTimeout(250);
  const g1=await p.evaluate(()=>({show:!!ST_DRILL.show,my:(ST_DRILL.res[0]||{}).my}));
  ok('KEY2 ⌨ 숫자키로 고른다 (2 → 두 번째 보기)',g1.show&&g1.my===second,
     JSON.stringify({got:g1.my,want:second}));
  /* 🔒 채점 뒤엔 숫자가 안 먹는다 — 다음 문항 답을 모르고 찍게 되면 안 된다 */
  await p.keyboard.press('1');await p.waitForTimeout(150);
  ok('KEY3 🔒 채점 뒤엔 숫자가 안 먹는다',
     (await p.evaluate(()=>ST_DRILL.res.length))===1);
  /* 엔터로 다음 — 문맥규정이라 「문장 점검」으로 간다 */
  await p.keyboard.press('Enter');await p.waitForTimeout(300);
  ok('KEY4 ⌨ 엔터로 넘어간다',
     (await p.evaluate(()=>!!(ST_DRILL.sub||ST_DRILL.sum)))===true);
  /* 점검 화면에서도 숫자·스페이스가 산다 */
  const inSub=await p.evaluate(()=>!!(ST_DRILL.sub&&ST_DRILL.sub.list.length));
  if(inSub){
    await p.keyboard.press(' ');await p.waitForTimeout(250);
    ok('KEY5 ⌨ 스페이스가 「모르겠다」다 (점검에서도)',
       (await p.evaluate(()=>!!(ST_DRILL.sub&&ST_DRILL.sub.show&&ST_DRILL.sub.ok===false)))===true);
    await p.keyboard.press('Enter');await p.waitForTimeout(250);
    ok('KEY6 점검도 엔터로 넘어간다',
       (await p.evaluate(()=>!(ST_DRILL.sub&&ST_DRILL.sub.show)))===true);
  }else{ ok('KEY5 (점검 문항이 없는 문장이었다)',true); ok('KEY6 (같음)',true); }
  /* 🔒 글을 쓰는 중에는 키가 문항을 건드리지 않는다 */
  const typed=await p.evaluate(()=>{
    const i=document.createElement('input');document.body.appendChild(i);i.focus();
    const busy=stKeyBusy(); i.remove(); return busy;});
  ok('KEY7 🔒 입력칸에 쓰는 중이면 드릴 키를 안 먹는다',typed===true);
  const inModal=await p.evaluate(()=>{
    openModal('<div>x</div>'); const b=stKeyBusy(); closeModal(); return b;});
  ok('KEY8 🔒 모달이 떠 있으면 드릴 키가 아니다',inModal===true);
  await p.evaluate(()=>{ST_DRILL=null;renderStudy();});
  /* ㉒ 🤖 v4.54 자동 생성 — 로한: "10문항 중에서도 내가 **2-3번 맞추면** 문장 생성 해야겠다.
     똑같은 문장을 계속하니 확실히 도움이 되는데, 이제 **완전히 맞춘건 별로 도움이 안된다**"
     🔒 새 문장을 만들지 않는다 — 이미 있는 예문에 빈칸을 뚫는다. */
  await p.evaluate(CTXIN=>{
    ST_DRILL=null;
    /* 다른 kind 로만 쓰이던 예문 둘을 넣는다 — 여기서 ctx 문항이 나와야 한다 */
    DB.study.sents=JSON.parse(JSON.stringify(CTXIN)).concat([
      {id:'g1',ja:'きょうは しゅくだいが おおくて たいへんです。',ko:'오늘은 숙제가 많아서 힘듭니다.',
       lv:'N4',src:'b1:200',seen:0,miss:0,streak:0,lastSeen:null,
       slots:[{kind:'conj',target:'おおくて',opts:['すくなくて','ちかくて','とおくて'],why:'…'}]},
      {id:'g2',ja:'まいにち けいけんを つみたいです。',ko:'매일 경험을 쌓고 싶습니다.',
       lv:'N4',src:'b1:201',seen:0,miss:0,streak:0,lastSeen:null,slots:[]}]);
    stSents().forEach(x=>{delete x.comp;});},CTX);
  const need0=await p.evaluate(()=>({need:stAutoNeed(),items:stGramItems('gctx').length}));
  ok('AUTO1 🔒 쓸모 있는 수동 문항이 모자랄 때만 채운다 (3개뿐이라 7개 필요)',
     need0.need===7,JSON.stringify(need0));
  /* 🔴 v4.55 — 🔴 [결함 재발 방지] 기준을 **숙달**로 걸었더니 자동이 영원히 안 돌았다.
     로한: "아니 지금 몇번을 했는데 새문장 언제 생기냐 도대체"
     실측(10/21 서버): ctx 10문장을 전부 3~5번 맞혔는데 mastered 는 10개 다 false.
     숙달은 「서로 다른 날 2연속 + 하부 전부 정답」이라 **하루 안에는 구조상 불가능**하다.
     🔒 기준은 **맞힌 횟수(seen-miss)** 여야 한다. 서버 상태를 그대로 넣어 확인한다. */
  const real=await p.evaluate(()=>{
    stSents().forEach(function(x){
      if(!stGSlots(x,'ctx').length)return;
      x.seen=4; x.miss=0;                              /* 4번 내서 4번 맞혔다 */
      x.comp={streak:1,mastered:false,last:todayStr()}; /* 그래도 숙달은 아니다 */
    });
    return {got:stSents().filter(x=>stGSlots(x,'ctx').length).map(x=>stCtxGot(x)),
            mastered:stSents().filter(x=>stCompOf(x).mastered).length,
            need:stAutoNeed(),auto:stAutoItems().length};});
  ok('AUTO1b 🔴 숙달이 0이어도 **맞힌 횟수**로 자동이 돈다',
     real.mastered===0&&real.need===10,JSON.stringify(real));
  ok('AUTO1c 실제로 문항이 나온다 (재료가 있는 만큼)',real.auto>=1,JSON.stringify(real));
  const made=await p.evaluate(()=>stAutoItems().map(x=>({id:x.s.id,t:x.slot.target,
     n:x.slot.opts.length,auto:!!x.slot.auto})));
  ok('AUTO2 🤖 있는 예문에서 문항이 나온다',made.length>=1,JSON.stringify(made));
  ok('AUTO3 보기가 3개 붙는다 (2지선다를 안 만든다)',
     made.every(x=>x.n===3),JSON.stringify(made));
  ok('AUTO4 손으로 올린 문항이 있는 문장은 건드리지 않는다',
     made.every(x=>['g1','g2'].indexOf(x.id)>=0),JSON.stringify(made));
  /* 🔒 전수 — 자동 문항도 정답이 문제에 남으면 안 된다 */
  const asweep=await p.evaluate(()=>{
    const bad=[];
    stAutoItems().forEach(function(it){
      const q=stGMkQ(it.s,'gctx',it);
      if(!q){bad.push(it.s.id+':문항없음');return;}
      if(String(q.ja).indexOf(String(q.ans))>=0)bad.push(it.s.id+':정답이 문제에 남았다');
      if(q.ja.indexOf('（　）')<0)bad.push(it.s.id+':빈칸이 없다');
      if(q.opts.length!==4)bad.push(it.s.id+':보기 '+q.opts.length);
      if(new Set(q.opts).size!==4)bad.push(it.s.id+':보기 중복');
      if(!q.auto)bad.push(it.s.id+':자동 표시가 없다');
      q.opts.forEach(function(o){
        if(o!==q.ans&&String(it.s.ja).indexOf(o)>=0)bad.push(it.s.id+'/'+o+':오답이 문장에 이미 있다');
      });
    });
    return bad;});
  ok('AUTO5 🔒 전수: 정답 노출·보기 중복·오답 누수 없음',asweep.length===0,JSON.stringify(asweep));
  /* 🔒 자동 문항은 숙달을 쌓지 않는다 */
  const noComp=await p.evaluate(()=>{
    const it=stAutoItems()[0]; if(!it)return null;
    const q=stGMkQ(it.s,'gctx',it);
    ST_DRILL={mode:'gctx',ids:[it.s.id],qs:[q],i:0,res:[{id:it.s.id,ok:true,my:q.ans}],
      show:true,fin:false,start:Date.now(),sub:{list:[],j:0,show:false,bad:0}};
    stCtxDone();
    const c=stCompOf(stSentById(it.s.id)); ST_DRILL=null;
    return {id:it.s.id,streak:c.streak,mastered:c.mastered};});
  ok('AUTO6 🔒 자동 문항은 숙달을 안 쌓는다 (점검이 반쪽이라)',
     !noComp||noComp.streak===0,JSON.stringify(noComp));
  /* 🔴 v4.55 — 전엔 앞에서부터 집어 **늘 같은 문장**이 나왔다. 많이 맞힌 건 뒤로 간다 */
  const fresh=await p.evaluate(()=>{
    stSents().forEach(function(x){x.seen=0;x.miss=0;delete x.comp;});
    const g1=stSentById('g1'); g1.seen=5; g1.miss=0;   /* 다섯 번 맞힌 문장 */
    return {live:stCtxLive(g1),picked:stAutoItems().map(x=>x.s.id)};});
  ok('AUTO9 🔒 이미 2번 맞힌 문장은 자동에서도 빠진다',
     fresh.live===false&&fresh.picked.indexOf('g1')<0,JSON.stringify(fresh));
  /* 🔒 숙달이 늘면 자동분이 준다 — 로한이 원한 방향 그대로 */
  const less=await p.evaluate(()=>{
    stSents().filter(x=>stGSlots(x,'ctx').length).forEach(function(x){
      x.seen=0;x.miss=0;delete x.comp;});
    const before=stAutoNeed();
    stSents().filter(x=>stGSlots(x,'ctx').length).forEach(function(x){
      x.seen=2;x.miss=0;});            /* 2번 맞혔다 — 더 내도 도움이 안 된다 */
    return {before:before,after:stAutoNeed()};});
  ok('AUTO7 🔴 2번 맞힌 만큼 자동으로 더 채운다',less.after>less.before,JSON.stringify(less));
  /* 🔒 수동 미숙달이 충분하면 자동은 0 */
  const zero=await p.evaluate(()=>{
    const keep=DB.study.sents;
    const many=[];
    for(let i=0;i<12;i++)many.push({id:'m'+i,ja:'テストの けっかを 聞いて、すこし あんしん しました。',
      ko:'…',lv:'N4',src:'b1:71',seen:0,miss:0,streak:0,lastSeen:null,
      slots:[{kind:'ctx',target:'あんしん',opts:['あんてい','せつめい','でんとう'],why:'…'}]});
    many.forEach(function(x){x.seen=0;x.miss=0;});   /* 아직 한 번도 안 맞혔다 */
    DB.study.sents=many;
    const r={need:stAutoNeed(),items:stAutoItems().length};
    DB.study.sents=keep; return r;});
  ok('AUTO8 🔒 아직 안 맞힌 수동 문항이 많으면 자동으로 안 만든다',
     zero.need===0&&zero.items===0,JSON.stringify(zero));
  /* ㉓ 🔴 v4.56 — 한 세트는 10문항이다.
     로한: "내가 문장을 계속 만들라고 했지 **무조건 낸 문장을 다 시험 보게 하면 어케해**.
     10문항 기준으로, 그 문제 중에 10문항을 골라서 내야지. 나중에 그럼 **100문항 내면
     맨날 100문항 풀게할꺼냐**?"  🔒 풀과 세트는 다른 것이다. */
  const big=await p.evaluate(()=>{
    /* 수동 30문항을 만든다 — 아직 한 번도 안 맞힌 것으로 */
    const many=[];
    for(let i=0;i<30;i++)many.push({id:'b'+i,
      ja:'テストの けっかを 聞いて、すこし あんしん しました。',ko:'…',lv:'N4',src:'b1:71',
      seen:0,miss:0,streak:0,lastSeen:null,
      slots:[{kind:'ctx',target:'あんしん',opts:['あんてい','せつめい','でんとう'],why:'…'}]});
    DB.study.sents=many;
    const pool=stGramItems('gctx').length;
    stDrillStart('gctx',Math.min(ST_SET,pool));
    const set=ST_DRILL?ST_DRILL.ids.length:-1;
    ST_DRILL=null;
    return {pool:pool,set:set,ST_SET:ST_SET};});
  ok('SET1 풀은 30문항이다 (정직하게 센다)',big.pool===30,JSON.stringify(big));
  ok('SET2 🔴 한 세트는 10문항이다 (풀이 커져도)',big.set===10,JSON.stringify(big));
  /* 화면 단추가 세트 크기로 시작하는지 — 숫자를 손으로 적지 않는다 */
  const btn=await p.evaluate(()=>{
    setStTab('word');renderStudy();
    const b=[...document.querySelectorAll('.gmode button')]
      .filter(x=>x.textContent.indexOf('문맥규정')>=0)[0];
    return b?b.getAttribute('onclick'):'(없음)';});
  ok('SET3 시작 단추가 세트 크기로 연다',/stDrillStart\('gctx',10\)/.test(btn),btn);
  /* 🔴 자동이 **실제로 세트에 들어온다** — 수동이 다 차면 영원히 안 나오던 자리 */
  const mix=await p.evaluate(CTXIN=>{
    DB.study.sents=JSON.parse(JSON.stringify(CTXIN)).concat([
      {id:'g1',ja:'きょうは しゅくだいが おおくて たいへんです。',ko:'오늘은 숙제가 많아서 힘듭니다.',
       lv:'N4',src:'b1:200',seen:0,miss:0,streak:0,lastSeen:null,slots:[]},
      {id:'g2',ja:'まいにち けいけんを つみたいです。',ko:'매일 경험을 쌓고 싶습니다.',
       lv:'N4',src:'b1:201',seen:0,miss:0,streak:0,lastSeen:null,slots:[]}]);
    /* 수동 3개를 전부 2번씩 맞혔다 — 서버의 지금 상태와 같은 꼴 */
    stSents().forEach(function(x){
      if(stGSlots(x,'ctx').length){x.seen=4;x.miss=0;x.comp={streak:1,mastered:false,last:todayStr()};}
    });
    const items=stGramItems('gctx');
    return {total:items.length,auto:items.filter(x=>x.auto).length,
            manual:items.filter(x=>!x.auto).map(x=>x.s.id)};},CTX);
  ok('SET4 🔴 다 맞힌 수동 문항은 풀에서 빠진다',mix.manual.length===0,JSON.stringify(mix));
  ok('SET5 🔴 그 자리를 자동이 채운다 (전엔 영원히 안 나왔다)',mix.auto>=1,JSON.stringify(mix));
  /* 🔒 아직 덜 맞힌 교재 문장은 자동보다 앞이다 */
  const order2=await p.evaluate(()=>{
    stSents().forEach(function(x){
      if(stGSlots(x,'ctx').length){x.seen=0;x.miss=0;delete x.comp;}});
    const items=stGramItems('gctx');
    const firstAuto=items.findIndex(x=>x.auto);
    const lastManual=items.map(x=>!!x.auto).lastIndexOf(false);
    return {firstAuto:firstAuto,lastManual:lastManual,n:items.length};});
  ok('SET6 🔒 수동이 자동보다 앞이다',
     order2.firstAuto<0||order2.firstAuto>order2.lastManual,JSON.stringify(order2));
  /* ㉔ 🧭 v4.57 전략 탭 — 로한: "학습방이 날 합격시키기 위한 전략을 짜는 곳과
     나 행동과 매칭해서 전략 밑에 로그형태로 계속 그가 체크하게 하는거지"
     "지금 내가 학습방 플랜대로 안하고 있으니까 이게 유명무실하거든?" */
  const tabs2=await p.evaluate(()=>{ST_DRILL=null;setStTab('plan');renderStudy();
    return [...document.querySelectorAll('#v-study .logtabs button')].map(b=>b.textContent.trim());});
  ok('PLAN1 탭은 여전히 4개다 (400px 제약)',tabs2.length===4,JSON.stringify(tabs2));
  ok('PLAN2 캘린더 / 전략 / 드릴 / 오답 순이다',
     tabs2[0].indexOf('캘린더')>=0&&tabs2[1].indexOf('전략')>=0
     &&tabs2[2].indexOf('드릴')>=0&&tabs2[3].indexOf('오답')>=0,JSON.stringify(tabs2));
  ok('PLAN3 🔒 옛 「기록」 탭 값은 전략으로 흘러간다 (빈 화면을 주지 않는다)',
     (await p.evaluate(()=>{DB.ui.studyTab='rec';return stTab();}))==='plan');
  const empty=await p.$eval('#v-study',e=>e.textContent);
  ok('PLAN4 전략이 없으면 **무엇을 넣어야 하는지** 알려준다',
     empty.indexOf('study.strategy')>=0&&empty.indexOf('ctxMastered')>=0,empty.slice(0,120));
  ok('PLAN5 기록(시험)이 전략 탭 안으로 들어왔다',empty.indexOf('📝 기록')>=0);
  /* 🔴 v4.59 — 학습방이 **실제로 올린 모양**(서버 실측 17칸)으로 넣는다.
     로한: "학습방에서 전략을 올렸다는데 반영이 안되어있다"
     🔴 내가 짠 goal/pillars/log 로만 읽어서 **있는데 「없다」고 했다**. 그게 거짓말이다. */
  const plan=await p.evaluate(()=>{
    DB.study.strategy={v:1,by:'로버트(학습)',setAt:'2026-10-22',
      headline:'합격 확률은 아직 수치로 말할 수 없다. 10/25 M1이 첫 측정이다.',
      kpis:[{id:'k1',label:'학습시간 (주)',target:'10.5h 이상',cur:'10/15~22: 12.0h/8일'},
            {id:'k2',label:'문맥구성 첫 시도',target:'70%',cur:'40% (4/10)'}],
      bottlenecks:[{id:'b1',title:'가나만 보고 알아보지 못한다',
        evidence:'한자가 보이면 72~83%, 가나·소리만 보이면 61~63%, 문맥구성 40%'}],
      status:[{k:'vocab1',area:'본책 1장 문자·어휘',progress:'p14~77 (47%)',
        measure:'문맥구성 확인문제 첫 시도 4/10',risk:'high'}],
      plan:[{from:'2026-10-22',to:'2026-10-24',title:'M1 준비',
        items:['문맥구성 드릴(처음 보는 문장 34개)','청해 15분/일']}],
      rules:[{id:'r1',title:'주간 체크포인트',rule:'달성이 70% 미만이면 이월하지 않고 범위를 줄인다'}],
      principles:['쪽수가 아니라 처음 보는 문항의 첫 시도 정답률로 센다'],
      pending:[{id:'a1',q:'점수 목표 재배분',rec:'언어·독해 66 + 청해 34',status:'대기'}],
      unknown:['영역별 문항 수 (본책에 없다)'],
      md:'# JLPT N4 합격 전략\n시험 12/6(일) · D-45'};
    renderStudy();
    return {txt:document.querySelector('#v-study').textContent,
            rows:document.querySelectorAll('#v-study .plrow').length,
            items:document.querySelectorAll('#v-study .plitems li').length,
            md:!!document.querySelector('#v-study .stramd')};});
  ok('PLAN6 🔴 학습방이 올린 전략이 **보인다** (한 줄 결론)',
     plan.txt.indexOf('10/25 M1이 첫 측정')>=0,plan.txt.slice(0,160));
  ok('PLAN7 지표·병목·현황·계획·규칙·미정이 전부 그려진다',plan.rows>=7,String(plan.rows));
  ok('PLAN8 지표는 학습방이 적은 값을 그대로 보여준다',
     plan.txt.indexOf('10/15~22: 12.0h/8일')>=0&&plan.txt.indexOf('10.5h 이상')>=0);
  ok('PLAN9 병목의 근거까지 보여준다',plan.txt.indexOf('61~63%')>=0);
  ok('PLAN10 위험도가 말로 보인다',plan.txt.indexOf('위험')>=0);
  ok('PLAN11 계획의 할 일이 펼쳐진다',plan.items===2,String(plan.items));
  ok('PLAN11b 🔒 모르는 것을 숨기지 않는다',
     plan.txt.indexOf('영역별 문항 수')>=0&&plan.txt.indexOf('점수 목표 재배분')>=0);
  ok('PLAN11c 원문도 볼 수 있다',plan.md===true);
  /* 🔒 학습방이 적은 값과 앱이 센 숫자를 **섞지 않는다** */
  ok('PLAN12 앱이 센 숫자는 따로 칸을 둔다',plan.txt.indexOf('앱이 센 숫자')>=0);
  const der=await p.evaluate(()=>{
    const a=stMetric('ctxMastered');
    return {v:a&&a.v,saved:JSON.stringify(DB.study.strategy).indexOf('"cur":0')>=0,
            unknown:stMetric('내가모르는지표'),has:stStraHas()};});
  ok('PLAN13 지표는 그때그때 센다 (전략에 써넣지 않는다)',
     der.saved===false&&typeof der.v==='number',JSON.stringify(der));
  ok('PLAN13b 모르는 지표는 null 이다',der.unknown===null);
  /* 🔴 「비었다」 판정은 한 곳에서 — 있는데 없다고 말하지 않게 */
  const judge=await p.evaluate(()=>{
    const keep=DB.study.strategy;
    const out={};
    DB.study.strategy={v:1,by:'로버트(학습)'};            /* 머리만 있고 알맹이가 없다 */
    out.onlyHead=stStraHas();
    DB.study.strategy={v:1,kpis:[{id:'k1',label:'x',target:'y'}]};
    out.onlyKpis=stStraHas();
    DB.study.strategy={v:1,headline:'한 줄'};
    out.onlyHeadline=stStraHas();
    DB.study.strategy=keep; return out;});
  ok('PLAN14 알맹이가 없으면 비었다고 본다',judge.onlyHead===false,JSON.stringify(judge));
  ok('PLAN15 🔴 한 칸이라도 있으면 **있다고 본다** (kpis 만 있어도)',judge.onlyKpis===true);
  ok('PLAN16 한 줄 결론만 있어도 있다고 본다',judge.onlyHeadline===true);
  /* ㉕ ⏱ v4.57 뽀모 메모 + 수정·삭제 */
  const note=await p.evaluate(()=>{
    DB.study.pomos=[];DB.timelog={};DB.ui.pomo={focus:25,brk:0};
    stPomoOpen();
    const has=!!document.getElementById('pmNote');
    const el=document.getElementById('pmNote'); if(el)el.value='문맥구성 p77';
    stPomoStart('focus');
    const run=DB.ui.pomoRun.note;
    DB.ui.pomoRun.at=Date.now()-50*60*1000;        /* 🔴 켜놓고 밥 먹고 왔다 */
    stPomoEnd();
    const r=DB.study.pomos[0];
    return {hasInput:has,run:run,note:r&&r.note,mins:r&&r.mins,id:r&&r.id,
            title:Object.values(DB.timelog)[0]&&Object.values(DB.timelog)[0][0].title};});
  ok('PMN1 시작 칸에 메모 입력칸이 있다',note.hasInput===true);
  ok('PMN2 쓴 메모가 기록에 남는다',note.note==='문맥구성 p77',JSON.stringify(note));
  ok('PMN3 타임로그 제목에도 붙는다',/^뽀모 · 문맥구성 p77/.test(String(note.title||'')),String(note.title));
  ok('PMN4 🔴 켜놓고 간 50분이 그대로 찍힌다 (이게 로한이 겪은 것)',note.mins===50,String(note.mins));
  /* 🔒 고치면 분과 타임로그가 같이 바뀐다 */
  const fixed=await p.evaluate(id=>{
    const before=stStudyMins(stPomoDate(stPomoById(id)));
    stPomoSetMins(id,25);
    const r=stPomoById(id), ds=stPomoDate(r);
    let blocks=0;Object.keys(DB.timelog).forEach(k=>(DB.timelog[k]||[]).forEach(b=>{
      if(/^뽀모/.test(String(b.title||'')))blocks++;}));
    return {before:before,after:stStudyMins(ds),mins:r.mins,cut:!!r.cut,blocks:blocks};},note.id);
  ok('PMN5 ⏱ 분을 고칠 수 있다',fixed.mins===25,JSON.stringify(fixed));
  ok('PMN6 🔴 학습시간이 따라 줄어든다 (타임로그 자국을 안 치우면 안 준다)',
     fixed.after<fixed.before&&fixed.after===25,JSON.stringify(fixed));
  ok('PMN7 계획(25)과 같아졌으니 중단 표시가 빠진다',fixed.cut===false,JSON.stringify(fixed));
  /* 🔒 남의 글씨는 안 지운다 */
  const mine=await p.evaluate(id=>{
    const r=stPomoById(id), ds=stPomoDate(r);
    tlPut(ds,{s:0,e:1,tag:'work',title:'채움',code:null});   /* 손으로 쓴 칸 */
    stPomoSetMins(id,30);
    const keep=(DB.timelog[ds]||[]).some(b=>b.title==='채움');
    return {keep:keep};},note.id);
  ok('PMN8 🔒 손으로 써넣은 칸은 건드리지 않는다',mine.keep===true,JSON.stringify(mine));
  /* 삭제 */
  const del=await p.evaluate(id=>{
    stPomoDel(id);
    let blocks=0;Object.keys(DB.timelog).forEach(k=>(DB.timelog[k]||[]).forEach(b=>{
      if(/^뽀모/.test(String(b.title||'')))blocks++;}));
    return {n:DB.study.pomos.length,blocks:blocks};},note.id);
  ok('PMN9 🗑 지울 수 있다',del.n===0,JSON.stringify(del));
  ok('PMN10 지우면 타임로그의 뽀모 자국도 간다',del.blocks===0,JSON.stringify(del));
  /* 🔒 0분으로 고치는 건 지우는 것과 같다 */
  const zeroMin=await p.evaluate(()=>{
    DB.study.pomos=[{id:'z1',mins:12,plan:25,at:new Date(Date.now()-12*60*1000).toISOString()}];
    stPomoSetMins('z1',0);
    return DB.study.pomos.length;});
  ok('PMN11 0분은 기록이 아니다 (지워진다)',zeroMin===0,String(zeroMin));
  /* ㉖ 🔴 v4.58 — 로한: "고치기 버튼을 눌러도 **반응이 없다**"
     JSON.stringify 를 두 번 걸어 id 가 따옴표째 넘어갔고, 못 찾아 **조용히 아무 일도 안 했다.**
     🔒 이 유형은 **눌러봐야만** 드러난다 — 화면에 버튼은 멀쩡히 보인다. */
  await p.evaluate(()=>{
    ST_DRILL=null;
    const t=todayStr();
    DB.study.pomos=[{id:'p\"q1',mins:50,plan:25,note:'따옴표 든 id',at:new Date(Date.now()-50*60*1000).toISOString()},
                    {id:'p2',mins:20,plan:25,at:new Date(Date.now()-20*60*1000).toISOString()}];
    DB.timelog={};
    setStTab('cal'); setStCalSel(t); renderStudy();});
  await p.waitForTimeout(300);
  ok('CLK1 기록 단추가 뜬다',
     (await p.$eval('#v-study .pmbar',e=>e.textContent)).indexOf('뽀모 기록')>=0);
  ok('CLK2 그날 건수를 적는다',
     (await p.$eval('#v-study .pmbar',e=>e.textContent)).indexOf('2')>=0);
  /* 🔒 목록 줄을 **실제로 눌러** 고치기 모달이 뜨는지 */
  /* 🔒 보이는지 먼저 재고, 클릭은 요소에 직접 건다 — 가시성 문제로 단언이 흐려지지 않게 */
  const vis=await p.evaluate(()=>{
    const e=document.querySelector('#v-study .pmline');
    return {has:!!e,shown:!!(e&&e.offsetParent),
            n:document.querySelectorAll('#v-study .pmline').length,
            side:!!document.querySelector('#v-study .calside'),
            bar:!!document.querySelector('#v-study .pmbar')};});
  ok('CLK2b 기록 줄이 화면에 보인다',vis.has&&vis.shown&&vis.n===2,JSON.stringify(vis));
  await p.evaluate(()=>document.querySelector('#v-study .pmline').click());
  await p.waitForTimeout(250);
  const mod=await p.evaluate(()=>({on:document.getElementById('ov').classList.contains('on'),
     txt:document.getElementById('modal').textContent,
     val:(document.getElementById('pmEdM')||{}).value}));
  ok('CLK3 🔴 줄을 누르면 고치기가 뜬다 (id 에 따옴표가 있어도)',
     mod.on===true&&mod.txt.indexOf('뽀모 고치기')>=0,JSON.stringify(mod).slice(0,120));
  ok('CLK4 그 기록의 분이 들어가 있다',mod.val==='50',JSON.stringify(mod.val));
  await p.evaluate(()=>closeModal());
  /* 🔒 기록 단추도 눌러본다 */
  await p.evaluate(()=>{[...document.querySelectorAll('#v-study .pmbar button')]
    .filter(b=>b.textContent.indexOf('뽀모 기록')>=0)[0].click();});
  await p.waitForTimeout(250);
  const logm=await p.evaluate(()=>({on:document.getElementById('ov').classList.contains('on'),
     rows:document.querySelectorAll('.pmerow').length,
     txt:document.getElementById('modal').textContent}));
  ok('CLK5 🔴 기록 단추가 먹는다',logm.on===true&&logm.txt.indexOf('뽀모 기록')>=0);
  ok('CLK6 줄마다 바로 고칠 수 있다 (2줄)',logm.rows===2,String(logm.rows));
  /* 🔒 모달 안에서 고치면 반영된다 */
  const saved=await p.evaluate(()=>{
    const id='p2';
    document.getElementById('pme_m_'+id).value='35';
    document.getElementById('pme_n_'+id).value='문맥구성';
    stPomoRowSave(id);
    const r=stPomoById(id); return {mins:r.mins,note:r.note};});
  ok('CLK7 모달에서 고친 값이 들어간다',saved.mins===35&&saved.note==='문맥구성',JSON.stringify(saved));
  await p.evaluate(()=>closeModal());
  /* 🔒 전수 — 화면의 모든 onclick 이 **구문상 성립**하는가.
     ⚠️ 처음엔 「역슬래시+따옴표가 있으면 결함」으로 봤는데 **그 단언이 틀렸다** —
        id 에 따옴표가 들어 있으면 \" 가 **정상**이다(stPomoEdit("p\\"q1")).
     🔒 따옴표가 깨지면 구문이 무너진다. 그걸 잰다. 값이 맞는지는 CLK3·CLK4 가 본다.
     🔒 **실행하지 않는다** — 구문만 본다(누르면 모달이 뜨고 화면이 바뀐다). */
  const bad=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('#v-study [onclick]').forEach(function(e){
      const a=e.getAttribute('onclick')||'';
      try{ new Function(a); }catch(err){ out.push(a.slice(0,70)); }
    });
    return out;});
  ok('CLK8 🔒 전수: 모든 onclick 이 구문상 성립한다',bad.length===0,JSON.stringify(bad));
  /* ㉗ 📅 v4.58 — 열면 오늘이다 */
  const cal=await p.evaluate(()=>{
    setStCalSel('2026-09-22');
    const picked=stCalSel();
    ST_CAL_SEL=null;                       /* 새로 연 것과 같은 상태 */
    return {picked:picked,fresh:stCalSel(),today:todayStr(),
            saved:!!(DB.ui&&DB.ui.stCalSel)};});
  ok('CLK9 고른 날짜는 그 자리에서 유지된다',cal.picked==='2026-09-22',JSON.stringify(cal));
  ok('CLK10 🔴 새로 열면 **오늘**이다 (9/22 가 눌러앉지 않는다)',cal.fresh===cal.today,JSON.stringify(cal));
  ok('CLK11 🔒 고른 날짜를 서버에 저장하지 않는다',cal.saved===false,JSON.stringify(cal));
  /* 🔒 과제 리스트는 접혀 있다 — 지워진 게 아니다 */
  const fold=await p.evaluate(()=>{
    const t=todayStr();
    DB.study.units=[{id:'u1',title:'과제 하나',day:t,status:'todo',backlog:false,ch:'voc',mins:20}];
    setStCalSel(t); renderStudy();
    const d=document.querySelector('#v-study .unitfold');
    return {has:!!d,open:d?d.open:null,txt:d?d.textContent:''};});
  ok('CLK12 과제 리스트는 접혀 있다 (지운 게 아니다)',
     fold.has===true&&fold.open===false,JSON.stringify({has:fold.has,open:fold.open}));
  ok('CLK13 몇 건인지는 말해준다',fold.txt.indexOf('1건')>=0,fold.txt.slice(0,60));
  /* ㉘ 🔴 v4.60 — 로한: "하루를 선택지에 **꽃 밖에 없었다**. 누가봐도 동사형인거 같은데"
     はる 가 단어은행에 둘(봄·붙이다)인데 **첫 번째(봄)를 집어** 정답 뜻이 「봄」이 됐고,
     오답은 명사에서 뽑혀 「꽃」이 나왔다. 🔒 서버 실물 모양 그대로 재현한다. */
  const homo=await p.evaluate(()=>{
    ST_DRILL=null;
    const add=[{id:'h1',kana:'はる',kanji:'春',ko:'봄',pos:'noun'},
               {id:'h2',kana:'はる',kanji:'貼る',ko:'붙이다',pos:'verb',vgroup:1},
               {id:'h3',kana:'はな',kanji:'花',ko:'꽃',pos:'noun'},
               {id:'h4',kana:'なつ',kanji:'夏',ko:'여름',pos:'noun'},
               {id:'h5',kana:'あき',kanji:'秋',ko:'가을',pos:'noun'},
               {id:'h6',kana:'おる',ko:'있다 (いる의 겸양어)',pos:'verb'},
               {id:'h7',kana:'おる',ko:'접다, 꺾다',pos:'verb'},
               {id:'h8',kana:'とる',ko:'집다, 쥐다',pos:'verb'},
               {id:'h9',kana:'とる',ko:'(사진을) 찍다',pos:'verb'},
               {id:'h10',kana:'つる',ko:'낚다',pos:'verb'},
               {id:'h11',kana:'かう',ko:'사다',pos:'verb'},
               {id:'h12',kana:'よむ',ko:'읽다',pos:'verb'},
               {id:'h13',kana:'かく',ko:'쓰다',pos:'verb'},
               {id:'h14',kana:'わすれる',ko:'잊다, 망각하다',pos:'verb'}]
      .map(w=>Object.assign({seen:0,miss:0,streak:0,lastSeen:null},w));
    DB.study.words=DB.study.words.filter(w=>['はる','はな','なつ','あき','おる','とる','つる','かう','よむ','かく']
      .indexOf(w.kana)<0&&w.kana!=='わすれる').concat(add);
    const s={id:'x76-01',ja:'だいじな メモは かべに はると、わすれなくて べんりです。',
      ko:'중요한 메모는 벽에 붙이면 잊지 않아서 편리합니다.',lv:'N4',src:'b1:76',
      seen:0,miss:0,streak:0,lastSeen:null,
      slots:[{kind:'ctx',target:'はる',wordId:'h2',opts:['おる','とる','つる'],why:'…'}],
      gloss:[{w:'かべ',base:'かべ',ko:'벽'},{w:'わすれなくて',base:'わすれる',ko:'잊다, 망각하다',wordId:'h14'}],
      koOpts:['중요한 메모는 벽에서 떼면 잊지 않아서 편리합니다.',
              '중요한 메모는 벽에 붙이면 잊어버려서 불편합니다.',
              '중요한 책은 벽에 붙이면 잊지 않아서 편리합니다.']};
    DB.study.sents=[s];
    const q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    const subs=stCtxSubs(s,q);
    const pick=w=>subs.filter(x=>x.kind==='opt'&&x.w===w)[0]||null;
    return {haru:pick('はる'),toru:pick('とる'),oru:pick('おる'),
      ko:subs.filter(x=>x.kind==='ko')[0],word:subs.filter(x=>x.kind==='word'&&x.w==='わすれなくて')[0],
      why:stCtxWhy(s,q)};});
  ok('HOM1 🔴 はる(빈칸 정답)의 뜻은 「붙이다」다 — 「봄」이 아니다',
     homo.haru&&homo.haru.ans==='붙이다',JSON.stringify(homo.haru&&homo.haru.ans));
  ok('HOM2 🔴 오답에 「꽃」 같은 명사가 안 나온다 (동사에서 뽑는다)',
     homo.haru&&homo.haru.opts.every(o=>['꽃','여름','가을'].indexOf(o)<0),JSON.stringify(homo.haru&&homo.haru.opts));
  ok('HOM3 🔒 같은 소리의 다른 뜻(봄)은 오답에도 안 나온다 — 가나만 보고 봄을 골라도 틀린 게 아니다',
     homo.haru&&homo.haru.opts.indexOf('봄')<0,JSON.stringify(homo.haru&&homo.haru.opts));
  ok('HOM4 🔒 뜻이 여럿이면 하나를 찍지 않고 합친다 (とる)',
     homo.toru&&homo.toru.ans==='집다, 쥐다 / (사진을) 찍다',JSON.stringify(homo.toru&&homo.toru.ans));
  ok('HOM5 정리 화면 보기 표도 はる 를 「붙이다」로 적는다',
     homo.why.indexOf('붙이다')>=0&&homo.why.indexOf('>봄<')<0,homo.why.slice(0,160));
  /* 🔴 v4.60 — 스크린샷: 번역 보기가 「중요한메모는벽에붙이면…」 처럼 **붙어 나왔다**.
     비교용 stNorm(공백·쉼표 제거)을 화면에도 그대로 썼다 */
  ok('SPC1 🔴 번역 보기에 띄어쓰기가 살아 있다',
     homo.ko&&homo.ko.opts.every(o=>o.indexOf(' ')>=0),JSON.stringify(homo.ko&&homo.ko.opts));
  ok('SPC2 단어 뜻 보기의 쉼표도 살아 있다',
     homo.word&&homo.word.ans==='잊다, 망각하다',JSON.stringify(homo.word&&homo.word.ans));
  /* 🔒 원문으로 보여줘도 채점은 그대로 맞는다(비교는 stNorm) */
  const grade=await p.evaluate(()=>{
    const s=DB.study.sents[0], q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    const it=stCtxSubs(s,q).filter(x=>x.kind==='ko')[0];
    ST_DRILL={mode:'gctx',ids:[s.id],qs:[q],i:0,res:[{id:s.id,ok:true,my:q.ans}],
      show:true,fin:false,start:Date.now(),sub:{list:[it],j:0,show:false,bad:0}};
    stCtxGrade(it.ans);
    const ok1=ST_DRILL.sub.ok; ST_DRILL=null; return ok1;});
  ok('SPC3 원문 그대로 골라도 정답으로 채점된다',grade===true);
  /* ㉙ 📝 v4.61 학습방 v27 — 활용형 → 기본형 · 번역 먼저 */
  const bq=await p.evaluate(()=>{
    ST_DRILL=null;
    DB.study.words=DB.study.words.filter(w=>['かう','かつ'].indexOf(w.kana)<0)
      .concat([{id:'bq1',kana:'かう',ko:'사다',pos:'verb',seen:0,miss:0,streak:0,lastSeen:null},
               {id:'bq2',kana:'かざる',ko:'장식하다',pos:'verb',seen:0,miss:0,streak:0,lastSeen:null}]);
    const a=stCtxBaseQ({w:'かざって',base:'かざる',ko:'장식하다'});
    const b=stCtxBaseQ({w:'かって',base:'かつ',ko:'이기다'});
    const none=stCtxBaseQ({w:'あつまりました',base:'あつまる',ko:'모이다'});
    const w0=JSON.parse(JSON.stringify(stWordById('bq2')));
    return {a:a,b:b,none:none,w0:w0};});
  ok('BASE1 활용형이면 기본형 문항이 생긴다 (かざって → かざる)',
     bq.a&&bq.a.kind==='base'&&bq.a.ans==='かざる'&&bq.a.opts.length===4,JSON.stringify(bq.a));
  ok('BASE2 🔒 오답은 틀린 활용 규칙으로 되돌린 꼴이다 (って → う·つ)',
     bq.a&&bq.a.opts.indexOf('かざう')>=0&&bq.a.opts.indexOf('かざつ')>=0,JSON.stringify(bq.a&&bq.a.opts));
  ok('BASE3 🔒 진짜 있는 동사는 오답에서 뺀다 (かって 는 かう 일 수도 있다)',
     bq.b&&bq.b.opts.indexOf('かう')<0,JSON.stringify(bq.b&&bq.b.opts));
  ok('BASE4 규칙이 결정적이지 않은 꼴(〜ました)은 아직 묻지 않는다',bq.none===null);
  /* 🔒 기본형 문항은 단어 카운터를 안 건드린다 — 재는 것이 뜻이 아니라 꼴이다 */
  const bqc=await p.evaluate(q=>{
    const s={id:'bq-s',ja:'へやに はなを かざって います。',ko:'방에 꽃을 장식하고 있습니다.',
      seen:0,miss:0,streak:0,lastSeen:null,slots:[{kind:'ctx',target:'はな',opts:['いぬ','ほん','くつ'],why:'…'}],
      gloss:[{w:'かざって',base:'かざる',ko:'장식하다',wordId:'bq2'}],koOpts:['a 1','b 2','c 3']};
    DB.study.sents=[s];
    const it=stCtxBaseQ(s.gloss[0]);
    ST_DRILL={mode:'gctx',ids:[s.id],qs:[{ans:'はな',ja:'',opts:[],why:''}],i:0,res:[{id:s.id,ok:true,my:'はな'}],
      show:true,fin:false,start:Date.now(),sub:{list:[it],j:0,show:false,bad:0}};
    stCtxGrade(it.opts.filter(o=>o!==it.ans)[0]);
    const w=stWordById('bq2'); const rec=(ST_DRILL.subAll.wrong||[])[0];
    ST_DRILL=null;
    return {miss:+w.miss||0,seen:+w.seen||0,base:!!(rec&&rec.base)};},null);
  ok('BASE5 🔒 기본형을 틀려도 단어 카운터는 그대로다 (뜻과 꼴을 한 숫자로 섞지 않는다)',
     bqc.miss===bq.w0.miss&&bqc.seen===bq.w0.seen,JSON.stringify({before:bq.w0,after:bqc}));
  ok('BASE6 기록에는 「꼴을 못 되돌렸다」로 남는다',bqc.base===true,JSON.stringify(bqc));
  /* 번역을 맞히면 진단이 안 열린다 */
  const gate=await p.evaluate(()=>{
    const s=DB.study.sents[0];
    const q=stGMkQ(s,'gctx',{slot:stGSlot(s,'ctx')});
    ST_DRILL={mode:'gctx',ids:[s.id],qs:[q],i:0,res:[{id:s.id,ok:true,my:q.ans}],
      show:true,fin:false,start:Date.now()};
    stCtxGo();
    const before=ST_DRILL.sub.list.map(x=>x.kind);
    stCtxGrade(ST_DRILL.sub.list[0].ans);
    const after=ST_DRILL.sub.list.map(x=>x.kind);
    ST_DRILL=null; return {before:before,after:after};});
  /* 🔴 v4.63 — 뒤집었다. 번역은 아는 단어 한두 개로 유추가 된다 — 맞혀도 구성요소를 건너뛰지 않는다 */
  ok('DIAG1 🔴 번역을 맞혀도 구성요소(기본형·뜻)를 묻는다 (v4.63)',
     gate.before[0]==='ko'&&gate.after.indexOf('word')>0&&gate.after.indexOf('base')>0&&gate.after.join()===gate.before.join(),JSON.stringify(gate));
  ok('CTX29 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
