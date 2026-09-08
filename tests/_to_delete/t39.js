/* t39 — 🎯 과락 게이지 · ❌ 오답노트 (v2.9)
   🔒 불변식 넷:
      ① 총점은 **파생**이다 — 과목 점수만 저장한다. 총점을 같이 저장하면 두 숫자가 어긋날 자리가 생긴다.
      ② 과락은 총점과 **독립**이다 — 총점이 합격선을 넘어도 한 과목이 과락이면 불합격이다.
      ③ 오답은 **2회 연속** 맞아야 회수된다. X 하나면 0 으로 되돌아간다.
      ④ 시험일은 **추측하지 않는다** — 비어 있으면 D-day 를 아예 안 그린다.
   ⚠️ 스펙이 명시적으로 요구: **빈 배열·빈 객체 상태에서 렌더가 죽지 않아야 한다.**
      지금 로한의 실데이터가 정확히 그 상태다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE=(st)=>Object.assign({schemaVersion:7,ui:{month:'2026-09'},
 goals:[{id:'gc',code:'C',kind:'year',period:'2026',title:'JLPT N4',due:'2026-12-06',
   metric:{type:'binary',target:0},status:'active',parentId:null,progress:0}],
 routines:[],checks:{},meals:{},
 study:{books:[],plan:{},logs:{},tests:[],cfg:{target:{}}},
 rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],netSnapshots:[],
 fixed:[],events:[],posts:[],budgets:{},debts:[],accounts:[],cards:[],categories:[],
 transactions:[],timelog:{},
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}},st||{});

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
/* 모의고사 한 건을 모달을 통해 넣는다 — 저장 경로 자체를 검증한다 */
const addMock=(p,lang,listen,title)=>p.evaluate(([l,s,ti])=>{
  stTestModal(null);
  document.getElementById('st_kind').value='mock'; stTestKindChg();
  document.getElementById('st_title').value=ti;
  if(l!=null)document.getElementById('st_p_lang').value=String(l);
  if(s!=null)document.getElementById('st_p_listen').value=String(s);
  stSaveTest(null);},[lang,listen,title]);

(async()=>{
 /* ── A. 빈 상태에서 죽지 않는다 (스펙 명시 요구) ── */
 {
  const {b,p,errs}=await boot(BASE());
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('A1 탭 5개',(await p.$$('#v-study .logtabs button')).length===5);
  ok('A2 모의고사 없으면 안내',txt.indexOf('모의고사 기록이 없다')>=0);
  /* 🔒 시험일을 추측하지 않는다 */
  /* ⚠️ 연간 목표의 D-day 는 goals 것이라 별개다. 여기선 **시험 게이지의** D-day 만 본다. */
  ok('A3 시험일 미설정이면 게이지에 D-day 없음',
    txt.indexOf('시험일 설정')>=0&&(await p.evaluate(()=>stExam().date))==='');
  ok('A4 기본 시험 이름',txt.indexOf('JLPT N4')>=0);
  for(const t of ['err','test','plan','book','now']){
    await p.evaluate(x=>setStTab(x),t);await p.waitForTimeout(250);}
  ok('A5 전 탭 렌더 · 콘솔 에러 0',errs.length===0,errs.join('|'));
  ok('A6 errors 서랍 생성',(await p.evaluate(()=>Array.isArray(DB.study.errors)))===true);
  await b.close();
 }

 /* ── B. 시험 설정 · D-day ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>{stExam().date='2026-12-06';save();renderStudy();});
  await p.waitForTimeout(400);
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('B1 D-day 표시',/D-\d+/.test(txt),txt.slice(0,120));
  ok('B2 기준값은 JLPT N4 공식값',
    (await p.evaluate(()=>JSON.stringify([stExam().pass,stExam().parts.map(x=>[x.max,x.cut])])))
    ==='[90,[[120,38],[60,19]]]');
  ok('B3 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── C. 과락 게이지 — 총점이 넘어도 과락이면 불합격 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await addMock(p,72,15,'9월 모의');await p.waitForTimeout(600);
  const t=await p.evaluate(()=>DB.study.tests[0]);
  ok('C1 kind=mock 저장',t.kind==='mock');
  ok('C2 과목 점수만 저장',JSON.stringify(t.parts)==='{"lang":72,"listen":15}');
  /* 🔒 총점은 파생 — 저장하지 않는다 */
  ok('C3 총점을 저장 안 함',t.total===0&&t.score===0,JSON.stringify([t.total,t.score]));
  const v=await p.evaluate(()=>stMockVerdict(DB.study.tests[0]));
  ok('C4 총점은 합',v.sum===87);
  ok('C5 청해 과락',v.fails.length===1&&v.fails[0].k==='listen',JSON.stringify(v.fails));
  ok('C6 불합격',v.pass===false);
  const txt=await p.$eval('#v-study',e=>e.textContent);
  ok('C7 화면에 과락 사유',txt.indexOf('청해 과락')>=0,txt.slice(0,300));
  ok('C8 막대 2개',(await p.$$('#v-study .gbar')).length===2);
  ok('C9 과락선·목표선 각 2개',(await p.$$('#v-study .gbar i.cut')).length===2
    &&(await p.$$('#v-study .gbar i.goal')).length===2);
  /* 🔒 총점 110 인데 청해 15 라서 불합격 — 로한이 매일 봐야 한다는 바로 그 경우 */
  await addMock(p,95,15,'10월 모의');await p.waitForTimeout(600);
  const v2=await p.evaluate(()=>stMockVerdict(stLastMock()));
  ok('C10 총점 110 > 합격선 90 인데',v2.sum===110&&v2.sum>90);
  ok('C11 청해 과락이라 불합격',v2.pass===false&&v2.fails[0].k==='listen');
  /* 둘 다 넘으면 합격권 */
  await addMock(p,72,40,'11월 모의');await p.waitForTimeout(600);
  const v3=await p.evaluate(()=>stMockVerdict(stLastMock()));
  ok('C12 둘 다 과락 넘고 총점도 넘으면 합격권',v3.pass===true,JSON.stringify(v3));
  ok('C13 최신 모의만 게이지에',(await p.$eval('#v-study',e=>e.textContent)).indexOf('11월 모의')>=0);
  ok('C14 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── D. 옛 기록·주간 확인은 모의고사가 아니다 ── */
 {
  const {b,p,errs}=await boot(BASE({study:{books:[],plan:{},logs:{},cfg:{target:{}},errors:[],
    tests:[{id:'old',date:'2026-08-01',title:'옛 기록',total:20,score:16}]}}));
  ok('D1 parts 없는 옛 기록은 모의고사 아님',(await p.evaluate(()=>stMocks().length))===0);
  ok('D2 게이지는 안내문',(await p.$eval('#v-study',e=>e.textContent)).indexOf('모의고사 기록이 없다')>=0);
  /* 주간 확인은 문항수/맞은수 축을 그대로 쓴다 */
  await p.evaluate(()=>{stTestModal(null);
    document.getElementById('st_kind').value='weekly';stTestKindChg();
    document.getElementById('st_title').value='주간';
    document.getElementById('st_total').value='20';
    document.getElementById('st_score').value='18';
    stSaveTest(null);});
  await p.waitForTimeout(600);
  const w=await p.evaluate(()=>DB.study.tests.filter(x=>x.title==='주간')[0]);
  ok('D3 주간은 문항 축',w.total===20&&w.score===18&&w.kind==='weekly');
  ok('D4 주간에 parts 없음',w.parts===null||w.parts===undefined);
  ok('D5 여전히 모의고사 0',(await p.evaluate(()=>stMocks().length))===0);
  ok('D6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── E. 오답노트 — 2회 연속이어야 회수 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>setStTab('err'));await p.waitForTimeout(400);
  const add=(q,k)=>p.evaluate(([q,k])=>{stErrModal(null);
    document.getElementById('se_kind').value=k;
    document.getElementById('se_q').value=q;
    document.getElementById('se_my').value='たべて';
    document.getElementById('se_ans').value='たべた';
    stSaveErr(null);},[q,k]);
  await add('食べます의 た형','conj');await p.waitForTimeout(500);
  let e=await p.evaluate(()=>DB.study.errors[0]);
  ok('E1 추가',e.q.indexOf('食べます')>=0&&e.kind==='conj');
  ok('E2 시작은 미회수 · hits 0',e.hits===0&&e.cleared===false);
  const id=e.id;
  await p.evaluate(x=>stErrHit(x,1),id);await p.waitForTimeout(400);
  e=await p.evaluate(()=>DB.study.errors[0]);
  /* 🔒 한 번 맞았다고 지우면 운으로 맞은 것까지 지운다 */
  ok('E3 1회 정답으론 회수 안 됨',e.hits===1&&e.cleared===false);
  ok('E4 최근 확인일 기록',e.lastSeen===(await p.evaluate(()=>todayStr())));
  await p.evaluate(x=>stErrHit(x,1),id);await p.waitForTimeout(400);
  e=await p.evaluate(()=>DB.study.errors[0]);
  ok('E5 2회 연속이면 회수',e.hits===2&&e.cleared===true);
  await p.evaluate(x=>stErrHit(x,0),id);await p.waitForTimeout(400);
  e=await p.evaluate(()=>DB.study.errors[0]);
  ok('E6 틀리면 0 으로 되돌아간다',e.hits===0&&e.cleared===false);
  ok('E7 미회수 1건',(await p.evaluate(()=>stErrOpen().length))===1);
  /* 분류별 집계 */
  await add('日曜日 읽기','kanji');await p.waitForTimeout(500);
  ok('E8 분류별 집계',JSON.stringify(await p.evaluate(()=>stErrCount()))==='{"conj":1,"kanji":1}');
  ok('E9 탭 뱃지에 미회수 수',(await p.$eval('#v-study .logtabs',e=>e.textContent)).indexOf('오답 2')>=0);
  /* 복습 뽑기 — 미회수만, 정답은 빼고 */
  await p.evaluate(x=>{stErrHit(x,1);stErrHit(x,1);},id);await p.waitForTimeout(500);
  ok('E10 회수 후 미회수 1건',(await p.evaluate(()=>stErrOpen().length))===1);
  await p.evaluate(()=>stErrSheet());await p.waitForTimeout(400);
  const sheet=await p.$eval('#se_sheet',e=>e.value);
  ok('E11 미회수만 뽑는다',sheet.indexOf('日曜日')>=0&&sheet.indexOf('食べます')<0,sheet);
  ok('E12 정답은 안 넣는다',sheet.indexOf('たべた')<0,sheet);
  ok('E13 분류를 붙인다',sheet.indexOf('[한자]')>=0,sheet);
  await p.evaluate(()=>closeModal());await p.waitForTimeout(300);
  /* 삭제 */
  await p.evaluate(x=>stDelErr(x),id);await p.waitForTimeout(500);
  ok('E14 삭제',(await p.evaluate(()=>DB.study.errors.length))===1);
  ok('E15 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── F. 방어 ── */
 {
  const {b,p,errs}=await boot(BASE());
  /* 만점 초과는 막는다 */
  await addMock(p,999,10,'말도 안 되는 점수');await p.waitForTimeout(500);
  ok('F1 만점 초과 거부',(await p.evaluate(()=>DB.study.tests.length))===0);
  /* 과목 점수 하나도 없으면 거부 */
  await addMock(p,null,null,'빈 모의');await p.waitForTimeout(500);
  ok('F2 과목 점수 없으면 거부',(await p.evaluate(()=>DB.study.tests.length))===0);
  /* 한 과목만 넣어도 받는다 — 아직 청해를 안 쳤을 수 있다 */
  await addMock(p,72,null,'언어지식만');await p.waitForTimeout(600);
  const v=await p.evaluate(()=>stMockVerdict(stLastMock()));
  ok('F3 한 과목만도 받는다',v.sum===72);
  /* ⚠️ 안 친 과목을 0 으로 치지 않는다 — 그러면 없는 과락이 생긴다 */
  ok('F4 안 친 과목은 과락 판정 안 함',v.fails.length===0,JSON.stringify(v.fails));
  ok('F5 화면에 — 로 표시',(await p.$eval('#v-study',e=>e.textContent)).indexOf('—')>=0);
  /* 잘못된 시험일은 막는다 */
  ok('F6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
