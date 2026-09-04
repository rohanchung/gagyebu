/* t38 — 🎓 학습 페이지 (v2.7 · A단계)
   🔒 핵심 불변식 넷:
      ① 목표는 goals 가 하나의 진실이다 — 학습 페이지는 **읽기만** 한다.
      ② 교재 진도는 **파생**이다(시작값 + 매일 기록). 저장하지 않는다.
      ③ 루틴 자동 체크는 **켜기만 하고 끄지 않는다** — 손으로 켠 체크를 날리면 안 된다.
      ④ 빈 서랍을 남기지 않는다.
   ⚠️ [실책 기록] v2.6 끼니 연동이 실제로는 안 보였다. 코드는 맞았지만
      **실제 DB 의 식비·카페 카테고리에 isFood 플래그가 꺼져 있었다.**
      픽스처만 켜두고 통과 판정했다 — 플래그로 켜지는 기능은 실데이터를 확인해야 한다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE=()=>({schemaVersion:7,ui:{month:'2026-09'},
 goals:[
  {id:'gc',code:'C',kind:'year',period:'2026',title:'JLPT N4',due:'2026-12-06',
   metric:{type:'binary',target:0},status:'active',parentId:null,progress:0},
  {id:'gc9',code:'C.9',kind:'milestone',period:'2026-09',title:'일 6뽀모 달성',due:'2026-09-30',
   metric:{type:'binary',target:0},status:'active',parentId:'gc',progress:0,manual:true}],
 routines:[
  {id:'rc',code:'C.8a',title:'아침 8시-12시전 학습 뽀모 수행',freq:'daily',days:[0,1,2,3,4,5,6],
   order:1,start:'2026-09-01',goalId:'gc',status:'active'},
  {id:'rx',code:'B1',title:'오전 스트레칭',freq:'daily',days:[0,1,2,3,4,5,6],
   order:2,start:'2026-09-01',goalId:'gc',status:'active'}],
 checks:{},meals:{},study:{books:[],plan:{},logs:{},tests:[],cfg:{target:{}}},
 rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],netSnapshots:[],
 fixed:[],events:[],posts:[],budgets:{},debts:[],accounts:[],cards:[],categories:[],transactions:[],timelog:{},
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};
   function mk(t){let _m=null,_p=null;
    const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},
     eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
     update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;return Promise.resolve({})},
     order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
     delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
    return q;}
   window.supabase={createClient:()=>({from:t=>mk(t),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  await p.click('.m[data-v="study"]');await p.waitForTimeout(500);
  return {b,p,errs};
}
const T=p=>p.evaluate(()=>todayStr());

(async()=>{
 /* ── A. 페이지·탭 ── */
 {
  const {b,p,errs}=await boot(BASE());
  ok('A1 메뉴 존재',(await p.$$('.side .m[data-v="study"]')).length===1);
  ok('A2 탭 4개',(await p.$$('#v-study .logtabs button')).length===4);   /* v2.8 주간 추가 */
  ok('A3 기본은 현황',(await p.evaluate(()=>stTab()))==='now');
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('A4 연간 목표를 읽어온다',txt.indexOf('JLPT N4')>=0);
  ok('A5 월간 눈금도',txt.indexOf('일 6뽀모')>=0);
  /* 🔒 여기서 목표를 고치지 않는다는 걸 밝힌다 */
  ok('A6 읽기 전용임을 명시',txt.indexOf('목표·루틴')>=0&&txt.indexOf('읽기만')>=0);
  ok('A7 D-day 표시',/D-\d+/.test(txt),txt.slice(0,200));
  ok('A8 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── B. 목표 뽀모: 설정 우선, 없으면 눈금에서 읽는다 ── */
 {
  const {b,p}=await boot(BASE());
  const r=await p.evaluate(()=>stTargetSrc('2026-09'));
  ok('B1 눈금 제목에서 6 추출',r.n===6,JSON.stringify(r));
  ok('B2 출처를 밝힌다',r.src.indexOf('C.9')>=0,r.src);
  await p.evaluate(()=>stSetTarget('2026-09',8));await p.waitForTimeout(300);
  const r2=await p.evaluate(()=>stTargetSrc('2026-09'));
  ok('B3 설정이 우선',r2.n===8&&r2.src==='설정',JSON.stringify(r2));
  await p.evaluate(()=>stSetTarget('2026-09',0));await p.waitForTimeout(300);
  ok('B4 0 이면 설정 제거 후 눈금으로',(await p.evaluate(()=>stTargetSrc('2026-09').n))===6);
  ok('B5 빈 서랍 없음',(await p.evaluate(()=>Object.keys(DB.study.cfg.target).length))===0);
  /* 눈금이 없는 달은 0 */
  ok('B6 눈금 없는 달은 0',(await p.evaluate(()=>stTargetSrc('2026-11').n))===0);
  await b.close();
 }

 /* ── C. 뽀모 · 🔗 루틴 자동 체크 ── */
 {
  const {b,p,errs}=await boot(BASE());
  const d=await T(p);
  await p.evaluate(x=>{for(let i=0;i<5;i++)stAddPomo(x,1);},d);await p.waitForTimeout(600);
  ok('C1 5뽀모 기록',(await p.evaluate(x=>stPomo(x),d))===5);
  ok('C2 목표 미달이면 체크 안 함',(await p.evaluate(x=>checkGet(x,'C.8a'),d))===false);
  await p.evaluate(x=>stAddPomo(x,1),d);await p.waitForTimeout(600);
  ok('C3 6뽀모 달성 → 학습 루틴 자동 체크',(await p.evaluate(x=>checkGet(x,'C.8a'),d))===true);
  /* 🔒 학습 루틴만 — 다른 루틴은 건드리지 않는다 */
  ok('C4 무관한 루틴은 그대로',(await p.evaluate(x=>checkGet(x,'B1'),d))===false);
  /* 🔒 줄여도 해제하지 않는다 */
  await p.evaluate(x=>stAddPomo(x,-3),d);await p.waitForTimeout(600);
  ok('C5 뽀모 줄어도 체크 유지',(await p.evaluate(x=>checkGet(x,'C.8a'),d))===true);
  ok('C6 뽀모는 줄었다',(await p.evaluate(x=>stPomo(x),d))===3);
  /* 0 이면 서랍째 삭제 */
  await p.evaluate(x=>stAddPomo(x,-5),d);await p.waitForTimeout(600);
  ok('C7 0 이면 로그 삭제',(await p.evaluate(x=>DB.study.logs[x],d))===undefined);
  ok('C8 음수로 안 내려간다',(await p.evaluate(x=>stPomo(x),d))===0);
  ok('C9 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── D. 📚 교재 · 🔒 진도는 파생 ── */
 {
  const {b,p,errs}=await boot(BASE());
  const d=await T(p);
  await p.evaluate(()=>setStTab('book'));await p.waitForTimeout(400);
  await p.evaluate(()=>{stBookModal(null);
    document.getElementById('sb_title').value='N4 문법';
    document.getElementById('sb_total').value='120';
    document.getElementById('sb_start').value='45';
    stSaveBook(null);});
  await p.waitForTimeout(600);
  ok('D1 교재 추가',(await p.evaluate(()=>DB.study.books.length))===1);
  ok('D2 시작값이 곧 현재값',(await p.evaluate(()=>stBookDone(DB.study.books[0])))===45);
  ok('D3 진행률',(await p.evaluate(()=>stBookPct(DB.study.books[0])))===38);
  /* 진도 기록 → 파생값이 올라간다 */
  await p.evaluate(x=>{const id=DB.study.books[0].id;stProgModal(x);
    document.getElementById('sp_'+id).value='5';stSaveProg(x);},d);
  await p.waitForTimeout(600);
  ok('D4 기록만큼 누적',(await p.evaluate(()=>stBookDone(DB.study.books[0])))===50);
  /* 🔒 book.done 을 저장하지 않는다 */
  ok('D5 done 을 저장 안 함',(await p.evaluate(()=>DB.study.books[0].done))===undefined);
  ok('D6 로그에 남는다',(await p.evaluate(x=>Object.keys(DB.study.logs[x].prog).length,d))===1);
  /* 삭제는 기록을 지우지 않는다 */
  await p.evaluate(()=>stDelBook(DB.study.books[0].id));await p.waitForTimeout(600);
  ok('D7 목록에서만 뺀다',(await p.evaluate(()=>DB.study.books[0].status))==='done');
  ok('D8 진도 기록은 남는다',(await p.evaluate(x=>!!DB.study.logs[x].prog,d))===true);
  ok('D9 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── E. 예상 완료일 ── */
 {
  const {b,p}=await boot(BASE());
  const d=await T(p);
  await p.evaluate(()=>{DB.study.books.push({id:'b1',title:'N4 단어',unit:'개',total:1000,start:0,status:'active'});});
  ok('E1 기록 없으면 계산 안 함',(await p.evaluate(()=>stPace(stBookById('b1'))))===null);
  /* 14일 동안 140개 → 하루 10개 → 남은 860개 → 86일 */
  await p.evaluate(x=>{for(let i=0;i<14;i++){const ds=addDays(x,-i);
    DB.study.logs[ds]={prog:{b1:10}};}},d);
  const pc=await p.evaluate(()=>stPace(stBookById('b1')));
  ok('E2 하루 속도',pc.perDay===10,JSON.stringify(pc));
  ok('E3 남은 일수',pc.days===86,JSON.stringify(pc));
  ok('E4 완료 예정일',pc.eta===(await p.evaluate(x=>addDays(x,86),d)));
  await b.close();
 }

 /* ── F. 📝 테스트 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>setStTab('test'));await p.waitForTimeout(400);
  ok('F1 빈 안내',(await p.$eval('#v-study',e=>e.textContent)).indexOf('아직 테스트 기록이 없다')>=0);
  await p.evaluate(()=>{stTestModal(null);
    document.getElementById('st_title').value='N4 문법 1~3과';
    document.getElementById('st_total').value='20';
    document.getElementById('st_score').value='16';
    stSaveTest(null);});
  await p.waitForTimeout(600);
  ok('F2 기록됨',(await p.evaluate(()=>DB.study.tests.length))===1);
  ok('F3 점수 계산',(await p.evaluate(()=>stPct(DB.study.tests[0])))===80);
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('F4 화면 표시',txt.indexOf('16/20')>=0&&txt.indexOf('80%')>=0,txt.slice(0,200));
  /* ⚠️ 맞은 수 > 문항 수 방지 */
  ok('F5 점수가 문항보다 크면 거부',await p.evaluate(()=>{
     stTestModal(null);
     document.getElementById('st_title').value='x';
     document.getElementById('st_total').value='10';
     document.getElementById('st_score').value='20';
     const n=DB.study.tests.length; stSaveTest(null);
     return DB.study.tests.length===n;}));
  /* 🔒 문제 본문 필드가 없다 */
  ok('F6 문제 본문 필드 없음',await p.evaluate(()=>{stTestModal(null);
     return !document.getElementById('st_body')&&!document.getElementById('st_questions');}));
  ok('F7 결과만 남긴다고 명시',(await p.$eval('#v-study',e=>e.textContent)).indexOf('결과')>=0);
  ok('F8 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── H. 📅 주간 플랜 (B단계) ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>setStTab('plan'));await p.waitForTimeout(400);
  const ws=await p.evaluate(()=>weekStart(todayStr()));
  ok('H1 이번 주가 기본',(await p.evaluate(()=>stWeek()))===ws);
  ok('H2 7일 행',(await p.$$('#v-study .swrow')).length===7);
  ok('H3 제안·실제 각 7칸',(await p.$$('#v-study textarea[id^=sw_p]')).length===7
     &&(await p.$$('#v-study textarea[id^=sw_a]')).length===7);
  /* 저장 */
  await p.evaluate(w=>{
    document.getElementById('sw_memo').value='N4 문법 3~5과';
    document.getElementById('sw_p0').value='문법 3과 · 2뽀모';
    document.getElementById('sw_a0').value='문법 3과 · 2뽀모';
    document.getElementById('sw_p1').value='단어 100개';
    stPlanSave(w);},ws);
  await p.waitForTimeout(600);
  const pl=await p.evaluate(w=>DB.study.plan[w],ws);
  ok('H4 주간 목표 저장',pl&&pl.memo==='N4 문법 3~5과',JSON.stringify(pl));
  ok('H5 제안·실제 분리 저장',pl.d['0'].p==='문법 3과 · 2뽀모'&&pl.d['0'].a==='문법 3과 · 2뽀모');
  ok('H6 실제 빈 칸은 p 만',pl.d['1'].p==='단어 100개'&&pl.d['1'].a==='');
  /* 🔒 빈 서랍 없음 */
  ok('H7 안 쓴 요일은 키 없음',pl.d['3']===undefined,JSON.stringify(Object.keys(pl.d)));
  /* 주 이동 */
  await p.evaluate(()=>stWeekMove(-1));await p.waitForTimeout(400);
  ok('H8 지난 주로 이동',(await p.evaluate(()=>stWeek()))===(await p.evaluate(w=>addDays(w,-7),ws)));
  ok('H9 지난 주는 비어 있다',(await p.$eval('#sw_memo',e=>e.value))==='');
  await p.evaluate(w=>setStWeek(w),ws);await p.waitForTimeout(400);
  /* ⤵ 제안대로 했다 */
  await p.evaluate(()=>stPlanCopy(stWeek()));await p.waitForTimeout(200);
  ok('H10 제안이 실제로 복사',(await p.$eval('#sw_a1',e=>e.value))==='단어 100개');
  /* 🔒 이미 다르게 적은 칸은 안 덮는다 */
  await p.evaluate(()=>{document.getElementById('sw_a1').value='단어 40개';stPlanCopy(stWeek());});
  await p.waitForTimeout(200);
  ok('H11 다르게 적은 칸 유지',(await p.$eval('#sw_a1',e=>e.value))==='단어 40개');
  /* 전부 비우면 서랍째 삭제 */
  await p.evaluate(w=>{document.getElementById('sw_memo').value='';
    for(let i=0;i<7;i++){document.getElementById('sw_p'+i).value='';document.getElementById('sw_a'+i).value='';}
    stPlanSave(w);},ws);
  await p.waitForTimeout(600);
  ok('H12 빈 주는 삭제',(await p.evaluate(w=>DB.study.plan[w],ws))===undefined);
  ok('H13 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── I. ⏰ 리듬 넛지 ── */
 {
  const {b,p}=await boot(BASE());
  const dow=await p.evaluate(()=>dowOf(todayStr()));
  const nd=await p.evaluate(()=>stNudge().map(x=>x.k));
  /* 일요일이면 주간 넛지가 떠야 한다 */
  ok('I1 일요일에만 주간 넛지',(nd.indexOf('week')>=0)===(dow===0),'dow='+dow+' '+JSON.stringify(nd));
  /* 이번 주 플랜을 적으면 넛지가 사라진다 */
  if(dow===0){
    await p.evaluate(()=>{stPlanMemo(weekStart(todayStr()),'채움');});
    ok('I2 플랜을 적으면 사라진다',(await p.evaluate(()=>stNudge().map(x=>x.k))).indexOf('week')<0);
  } else ok('I2 (일요일 아님 — 건너뜀)',true);
  /* 월말 넛지: 다음 달 눈금이 없으면 뜬다 */
  const nearEnd=await p.evaluate(()=>daysBetween(todayStr(),lastDayOfYM(todayStr().slice(0,7)))<=2);
  ok('I3 월말에만 월간 넛지',(nd.indexOf('month')>=0)===nearEnd,'nearEnd='+nearEnd+' '+JSON.stringify(nd));
  /* 🔒 날짜 산수를 직접 하지 않는다 — 12월에도 다음 달이 나와야 한다 */
  ok('I4 연말 넘김',(await p.evaluate(()=>ymAdd('2026-12',1)))==='2027-01');
  await b.close();
 }

 /* ── G. 마이그레이션 ── */
 {
  const {b,p}=await boot(BASE());
  const r=await p.evaluate(()=>{const d=migrateDB({schemaVersion:7});
    return {s:typeof d.study,bk:Array.isArray(d.study.books),lg:typeof d.study.logs,
            ts:Array.isArray(d.study.tests),cf:typeof d.study.cfg.target};});
  ok('G1 study 보장',r.s==='object'&&r.bk&&r.lg==='object');
  ok('G2 tests 보장',r.ts===true);
  ok('G3 cfg.target 보장',r.cf==='object');
  ok('G4 plan 보장',(await p.evaluate(()=>typeof migrateDB({schemaVersion:7}).study.plan))==='object');
  await b.close();
 }

 console.log('t38  pass='+pass+' fail='+fail);
 if(bad.length)console.log(bad.map(x=>'  ✗ '+x).join('\n'));
 process.exit(fail?1:0);
})();
