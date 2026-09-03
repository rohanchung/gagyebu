/* t36 — 🍚 식사 · 💊 복약 용량 · ⇔ 메뉴 접기 · 준비 태그 (v2.5)
   🔒 핵심 불변식 넷:
      ① 복약은 **저장 구조를 안 바꾼다** — labMeds 는 문자열 배열 그대로. 이름·용량은 파생.
      ② 용량 비교는 **단위가 같을 때만** — 12.5mg 과 1정을 비교하면 거짓말이 된다.
      ③ 식사는 **빈 값을 저장하지 않는다** — 30년이면 1만 일이라 빈 서랍이 곧 용량이다.
      ④ 복약 여부는 **새 저장소를 만들지 않는다** — 루틴·체크가 이미 날짜별로 쌓는다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const D='2026-09-03';
const BASE=()=>({schemaVersion:7,ui:{month:'2026-09',date:D},
 goals:[{id:'g1',code:'E',title:'멋진 남자 되기'}],
 routines:[
  {id:'r_am',code:'E1',title:'☀ 아침약',freq:'daily',days:[0,1,2,3,4,5,6],order:1,start:'2026-09-01',goalId:'g1',status:'active'},
  {id:'r_pm',code:'E2',title:'🌙 저녁약',freq:'daily',days:[0,1,2,3,4,5,6],order:2,start:'2026-09-01',goalId:'g1',status:'active'},
  {id:'r_x', code:'B1',title:'오전 스트레칭',freq:'daily',days:[0,1,2,3,4,5,6],order:3,start:'2026-09-01',goalId:'g1',status:'active'}],
 /* ⚠️ checks 는 {due:[코드],done:[코드],miss:{}} 다 — id 가 아니라 **코드** 배열이다.
    처음에 id 로 픽스처를 짰다가 E4 가 잡았다(코드도 같이 틀려 있었다). */
 checks:{'2026-09-02':{due:['E1','E2','B1'],done:['E1','E2'],miss:{}},
         '2026-09-03':{due:['E1','E2','B1'],done:['E1'],miss:{}}},
 meals:{'2026-09-02':{b:'현미밥 김치찌개',l:'라면'}},
 rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],netSnapshots:[],
 fixed:[],events:[],posts:[],budgets:{},debts:[],accounts:[],cards:[],categories:[],transactions:[],timelog:{},
 health:{
  labDates:['2025-09-18','2026-03-12','2026-09-03'],
  labTypes:['외래','외래','외래'],
  labMeds:[
   {am:['엔트레스토 50mg','자디앙듀오 10mg','딜라트렌'],pm:['엔트레스토 50mg']},
   {am:['엔트레스토 100mg','자디앙듀오 10mg','딜라트렌'],pm:['엔트레스토 100mg']},
   {am:['엔트레스토 100mg','자디앙듀오 25mg','아스피린 100mg'],pm:['엔트레스토 1정']}],
  metrics:[{name:'HbA1c',func:'당화혈색소',low:4,high:6,range:'4-6',cat:'대사·당'}],
  labValues:{'HbA1c':[6.4,6.0,null]},catOrder:['대사·당'],
  wImport2026:1,
  weights:[{date:'2026-09-02',kg:68.2}],events:[]}});

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
  return {b,p,errs};
}

(async()=>{
 /* ── A. 💊 복약 파서 ── */
 {
  const {b,p,errs}=await boot(BASE());
  const t=await p.evaluate(()=>[
    medParse('엔트레스토 100mg'), medParse('딜라트렌'),
    medParse('자디앙듀오 12.5mg'), medParse('엔트레스토 1정'), medParse('아스피린100')]);
  ok('A1 이름+용량 분리',t[0].n==='엔트레스토'&&t[0].d==='100mg'&&t[0].v===100,JSON.stringify(t[0]));
  ok('A2 용량 없으면 이름만',t[1].n==='딜라트렌'&&t[1].d===''&&t[1].v===null,JSON.stringify(t[1]));
  ok('A3 소수 용량',t[2].v===12.5&&t[2].u==='mg',JSON.stringify(t[2]));
  ok('A4 정 단위',t[3].u==='정'&&t[3].v===1,JSON.stringify(t[3]));
  ok('A5 공백 없으면 이름 취급',t[4].n==='아스피린100'||t[4].v===null,JSON.stringify(t[4]));
  ok('A6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── B. 💊 증량·감량·신규 표시 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.click('.m[data-v="labs"]');await p.waitForTimeout(600);
  const c0=await p.evaluate(()=>medCellHtml('am',0));
  const c1=await p.evaluate(()=>medCellHtml('am',1));
  const c2=await p.evaluate(()=>medCellHtml('am',2));
  ok('B1 첫 열은 전부 신규 ＋',(c0.match(/mednew/g)||[]).length>=1,c0);
  ok('B2 50→100mg 증량 ▲',c1.indexOf('medup')>=0,c1);
  ok('B3 같은 용량은 표시 없음',(c1.match(/medup|meddn/g)||[]).length===1,c1);
  ok('B4 10→25mg 증량 ▲',c2.indexOf('medup')>=0,c2);
  ok('B5 새 약(아스피린)은 ＋',c2.indexOf('mednew')>=0,c2);
  /* 🔒 단위가 다르면 비교하지 않는다 */
  const p2=await p.evaluate(()=>medCellHtml('pm',2));
  ok('B6 100mg → 1정 은 비교 안 함',p2.indexOf('medup')<0&&p2.indexOf('meddn')<0,p2);
  ok('B7 이름·용량이 분리 렌더',c1.indexOf('medn')>=0&&c1.indexOf('medd')>=0);
  /* 🔒 저장 구조 불변 */
  const raw=await p.evaluate(()=>DB.health.labMeds[1].am);
  ok('B8 저장은 문자열 배열 그대로',Array.isArray(raw)&&typeof raw[0]==='string'&&raw[0]==='엔트레스토 100mg',JSON.stringify(raw));
  ok('B9 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── C. 💊 직전 검사일 불러오기 ── */
 {
  const {b,p}=await boot(BASE());
  await p.click('.m[data-v="labs"]');await p.waitForTimeout(500);
  await p.evaluate(()=>{DB.health.labMeds[2]={am:[],pm:[]};labDate(2);});await p.waitForTimeout(300);
  ok('C1 불러오기 버튼 존재',(await p.$eval('.modal',e=>e.textContent)).indexOf('불러오기')>=0);
  await p.evaluate(()=>medCopyPrev(2));await p.waitForTimeout(200);
  ok('C2 직전 처방이 채워짐',(await p.$eval('#ld_am',e=>e.value)).indexOf('엔트레스토 100mg')>=0);
  ok('C3 첫 열엔 버튼 없음',await p.evaluate(()=>{closeModal();labDate(0);return document.querySelector('.modal').textContent.indexOf('불러오기')<0;}));
  await b.close();
 }

 /* ── D. 🍚 식사 기록 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>setDailyTab('meal'));await p.waitForTimeout(400);
  ok('D1 식사 탭 존재',(await p.$eval('#v-daily',e=>e.textContent)).indexOf('🍚 식사')>=0);
  ok('D2 4칸',(await p.$$('#v-daily textarea[id^=ml_]')).length===4);
  ok('D3 칼로리 칸 없음',(await p.$eval('#v-daily',e=>e.textContent)).indexOf('칼로리')>=0
     &&(await p.$$('#v-daily input[id*=kcal]')).length===0);
  await p.fill('#ml_b','오트밀');await p.fill('#ml_l','');
  await p.evaluate(d=>mealSaveAll(d),D);await p.waitForTimeout(500);
  const m=await p.evaluate(d=>DB.meals[d],D);
  ok('D4 입력값 저장',m&&m.b==='오트밀',JSON.stringify(m));
  /* 🔒 빈 값은 서랍을 만들지 않는다 */
  ok('D5 빈 칸은 키 자체가 없다',m&&m.l===undefined&&m.d===undefined,JSON.stringify(m));
  await p.evaluate(()=>{mealSet('2026-09-05','b','');});
  ok('D6 전부 비면 날짜 서랍째 삭제',(await p.evaluate(()=>DB.meals['2026-09-05']))===undefined);
  await p.evaluate(()=>{mealSet('2026-09-02','b','');mealSet('2026-09-02','l','');});
  ok('D7 기존 날짜도 비면 삭제',(await p.evaluate(()=>DB.meals['2026-09-02']))===undefined);
  ok('D8 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── E. 🩺 캘린더 생활 모드 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(600);
  ok('E1 기본은 가계부 모드',(await p.evaluate(()=>calView()))==='money');
  ok('E2 모드 토글 2개',(await p.$eval('#v-cal',e=>e.textContent)).indexOf('🩺 생활')>=0);
  await p.evaluate(()=>setCalView('life'));await p.waitForTimeout(500);
  ok('E3 상태 저장',(await p.evaluate(()=>DB.ui.calView))==='life');
  const cell2=await p.$eval('.cell[data-date="2026-09-02"]',e=>e.innerHTML);
  ok('E4 복약 알약 2개',(await p.$$('.cell[data-date="2026-09-02"] .cpill')).length===2);
  ok('E5 둘 다 체크 → on',(await p.$$('.cell[data-date="2026-09-02"] .cpill.on')).length===2);
  ok('E6 체중 표시',cell2.indexOf('68.2kg')>=0);
  ok('E7 식사 표시',cell2.indexOf('김치찌개')>=0&&cell2.indexOf('라면')>=0);
  const cell3=await p.$eval('.cell[data-date="2026-09-03"]',e=>e.innerHTML);
  ok('E8 하나만 체크된 날',(await p.$$('.cell[data-date="2026-09-03"] .cpill.on')).length===1,cell3.slice(0,160));
  /* 🔒 복약용 새 저장소 없음 */
  ok('E9 새 복약 저장소 없음',(await p.evaluate(()=>DB.medLog===undefined&&DB.meds===undefined)));
  /* 생활 모드에선 금액을 안 보여준다 */
  ok('E10 생활 모드엔 금액 없음',cell2.indexOf('dsum')<0);
  await p.evaluate(()=>setCalView('money'));await p.waitForTimeout(400);
  ok('E11 가계부로 되돌아옴',(await p.$eval('#v-cal',e=>e.textContent)).indexOf('발생')>=0);
  ok('E12 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── F. 💊 복약 루틴 판별 ── */
 {
  const {b,p}=await boot(BASE());
  const n=await p.evaluate(()=>medRoutines().map(r=>r.code));
  ok('F1 제목에 약 들어간 것만',JSON.stringify(n)===JSON.stringify(['E1','E2']),JSON.stringify(n));
  /* 은퇴 루틴은 제외 */
  await p.evaluate(()=>{DB.routines[1].status='retired';});
  ok('F2 은퇴 루틴 제외',(await p.evaluate(()=>medRoutines().length))===1);
  await b.close();
 }

 /* ── G. ⇔ 사이드바 접기 ── */
 {
  const {b,p,errs}=await boot(BASE());
  ok('G1 기본은 펼침',(await p.evaluate(()=>sideMini()))===false);
  ok('G2 라벨이 아이콘/글자로 갈림',(await p.$$('.side .m .mi')).length>=15,(await p.$$('.side .m .mi')).length);
  const w1=await p.evaluate(()=>document.getElementById('sideBar').offsetWidth);
  await p.click('#sideTog');await p.waitForTimeout(400);
  const w2=await p.evaluate(()=>document.getElementById('sideBar').offsetWidth);
  ok('G3 접으면 좁아진다',w2<w1-100,w1+'→'+w2);
  ok('G4 상태 저장',(await p.evaluate(()=>DB.ui.sideMini))===true);
  ok('G5 글자는 숨고 아이콘은 남는다',await p.evaluate(()=>{
     const m=document.querySelector('.side .m[data-v="daily"]');
     return m.querySelector('.mi').offsetWidth>0 && m.querySelector('.mt').offsetWidth===0;}));
  /* 🔒 두 번 감싸지 않는다 */
  await p.evaluate(()=>{sideWrapLabels();sideWrapLabels();});
  ok('G6 라벨 중복 감싸기 없음',(await p.evaluate(()=>document.querySelectorAll('.side .m[data-v="daily"] .mi').length))===1);
  await p.click('#sideTog');await p.waitForTimeout(400);
  ok('G7 다시 펴진다',(await p.evaluate(()=>document.getElementById('sideBar').offsetWidth))===w1,w1);
  ok('G8 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── H. ⏳ 준비 태그 ── */
 {
  const {b,p}=await boot(BASE());
  const tags=await p.evaluate(()=>TL_TAGS.map(x=>x.k));
  ok('H1 prep 존재',tags.indexOf('prep')>=0,JSON.stringify(tags));
  ok('H2 기타 앞에 온다',tags.indexOf('prep')<tags.indexOf('etc'));
  ok('H3 라벨 준비',(await p.evaluate(()=>tlTag('prep').label))==='준비');
  ok('H4 색 있음',/^#[0-9a-f]{6}$/i.test(await p.evaluate(()=>tlTag('prep').c)));
  await b.close();
 }

 /* ── I. 마이그레이션 ── */
 {
  const {b,p}=await boot(BASE());
  const r=await p.evaluate(()=>{const d=migrateDB({schemaVersion:7});
    return {meals:typeof d.meals, side:d.ui.sideMini};});
  ok('I1 meals 보장',r.meals==='object');
  ok('I2 sideMini 보장',r.side===false);
  /* 동기화 diff 에 식사가 들어갔나 — 빠지면 충돌 설명에서 조용히 사라진다 */
  const dif=await p.evaluate(()=>{
    const a=JSON.parse(JSON.stringify(DB)); a.meals={'2026-09-09':{b:'토스트'}};
    return syncDiffText(DB,a);});
  ok('I3 충돌 설명에 식사 포함',/식사/.test(dif),dif.slice(0,200));
  await b.close();
 }

 console.log('t36  pass='+pass+' fail='+fail);
 if(bad.length)console.log(bad.map(x=>'  ✗ '+x).join('\n'));
 process.exit(fail?1:0);
})();
