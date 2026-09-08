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
  ok('A1 탭 3개',(await p.$$('#v-study .logtabs button')).length===3);
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('A2 모의고사 안내',txt.indexOf('모의고사를 아직 안 쳤다')>=0);
  ok('A3 미측정 2개',(txt.match(/미측정/g)||[]).length===2,txt.slice(0,200));
  ok('A4 D-day',/D-\d+/.test(txt));
  ok('A5 phase 없으면 알린다',txt.indexOf('구간(phase)이 설정되지 않았다')>=0);
  for(const t of ['err','rec','home']){await p.evaluate(x=>setStTab(x),t);await p.waitForTimeout(250);}
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

 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
