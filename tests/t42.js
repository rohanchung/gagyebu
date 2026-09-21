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
  const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
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
  for(const t of ['cal','err','word','rec']){
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
  /* ④ 제로데이 — 지난 날인데 학습도 과제도 없는 칸 */
  ok('W9 제로데이 칸이 표시된다',(await p.$$('#v-study .scday.zero')).length>=1);
  /* ⑤ 3일 창 밖은 흐리게 */
  ok('W10 미래 3일 밖은 흐리다',(await p.$$('#v-study .scday.far')).length>=1);
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
  /* ④ 과제 선택 */
  await p.evaluate(()=>stPomoSet('unitId','k1'));await p.waitForTimeout(250);
  ok('X11 과제를 고를 수 있다',(await p.evaluate(()=>stPomoCfg().unitId))==='k1');
  /* ⑤ 시작 — 시작 시각만 저장한다 */
  await p.evaluate(()=>stPomoStart('focus'));await p.waitForTimeout(400);
  const run=await p.evaluate(()=>DB.ui.pomoRun);
  ok('X12 시작 시각을 저장한다 (카운터가 아니다)',!!run&&typeof run.at==='number',JSON.stringify(run));
  ok('X13 남은 시간이 보인다',/^\d{2}:\d{2}$/.test(await p.$eval('#pomoClock',e=>e.textContent.trim())),
     await p.$eval('#pomoClock',e=>e.textContent.trim()));
  ok('X14 고른 과제 제목이 보인다',
     (await p.$eval('#pomoBody',e=>e.textContent)).indexOf('예상어휘 p160')>=0);
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
  ok('X19 어느 과제였는지 남는다',rec.unitId==='k1');
  ok('X20 계획보다 짧으면 cut 표시',rec.cut===true,JSON.stringify(rec));
  ok('X21 날짜가 남는다',rec.date===(await p.evaluate(()=>todayStr())));
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
  ok('Y4 접속사 풀 = slots 갖춘 6건',(await p.evaluate(()=>stGramPool('gconj').length))===6,
     String(await p.evaluate(()=>stGramPool('gconj').length)));
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
  ok('Y11 6문항이 잡혔다',q.n===6,String(q.n));
  ok('Y12 문제에 빈칸이 있다',q.ja.indexOf('（　）')>=0,q.ja);
  ok('Y13 🔴 정답이 문제에 안 남아 있다',q.ja.indexOf(q.ans)<0,q.ja+' / '+q.ans);
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
  ok('Y29 문항 수가 맞다',rec[0].n===6,JSON.stringify(rec[0]));
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

 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
