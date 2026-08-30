/* t34 — 📋 로그 페이지 재편 + 핸드오프 게시판 (v2.3)
   ⚠️ v2.2까지 로그 페이지는 성격이 다른 다섯을 세로로 쌓아둔 곳이었고,
      체인지로그가 분량을 먹어 아래쪽은 스크롤에 묻혔다.
   🔒 핵심 불변식 셋:
      ① 핸드오프는 DB 에 저장되지 않는다 (원본은 handoffs 테이블).
      ② 본문은 innerHTML 로 들어가므로 반드시 이스케이프가 먼저다.
      ③ logs2 데이터는 UI 를 내려도 지워지지 않는다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const HO=[
 {id:4,slug:'rehab-shoulder',version:1,room:'재활의학과',title:'오른쪽 어깨 오십견 재활 경과',
  status:'오십견 확진 · 주사 4회 종료',doc_date:'2026-08-28',
  body:'# 핸드오프\n\n## 0. 한 줄\n**오십견 확진.** 주사 4회 종료.\n\n## 1. 진단\n- 병목 = `내회전`\n- 견갑 전방경사 동반\n\n---\n\n1. 첫째\n2. 둘째\n',
  updated_at:'2026-08-28T00:00:00Z'},
 {id:3,slug:'austerity',version:1,room:'로버트(생활)',title:'긴급재정명령',
  status:'실행 개시',doc_date:'2026-08-25',body:'## 요약\n긴축 개시.',updated_at:'2026-08-25T00:00:00Z'},
 {id:1,slug:'tax-2024',version:2,room:'로버트(생활)',title:'2024귀속 종소세 과세예고 대응',
  status:'세무사 위임 완료',doc_date:'2026-08-24',body:'본문',updated_at:'2026-08-24T00:00:00Z'},
 {id:2,slug:'xss',version:1,room:'심리&정신&점술방',title:'주입 <b>시험</b>',
  status:'<i>상태</i>',doc_date:'2026-08-23',
  body:'<img src=x onerror="window.__PWN=1">\n<script>window.__PWN2=1<\/script>\n**굵게**',
  updated_at:'2026-08-23T00:00:00Z'}];

const BASE=()=>({schemaVersion:7,ui:{month:'2026-08'},
 goals:[],routines:[],checks:{},rewards:[],rewardCards:{},journal:[],items:[],
 logs2:[{id:'g1',date:'2026-08-04',title:'정책자금 거치연장 요청',body:'진행중'},
        {id:'g2',date:'2026-07-28',title:'방 개설 & 전면 진단',body:'개설'}],
 activity:[{t:'2026-08-28 09:10',m:'거래 추가 · 식비'},{t:'2026-08-28 08:02',m:'계좌 수정'},
           {t:'2026-08-27 22:40',m:'루틴 순서 · R1 ▲'}],
 fixed:[],events:[],posts:[],budgets:{},debts:[],accounts:[],cards:[],categories:[],transactions:[],
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}});

async function boot(st,opt){
  opt=opt||{};
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s,ho,hoErr})=>{
   const store={v:s};window.__store=store;
   /* handoffs 는 다른 테이블이다 — 스텁도 테이블별로 갈라야 실제와 같다 */
   function mk(tbl){
     let _m=null,_p=null;
     const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},
      eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
      update(p){_m='update';_p=p;return q},
      upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},
      order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
      delete(){return q},in(){return q},
      then(a){
        if(tbl==='handoffs'){window.__hoHits=(window.__hoHits||0)+1;
          return Promise.resolve(hoErr?{data:null,error:{message:'permission denied for table handoffs'}}:{data:ho,error:null}).then(a);}
        return Promise.resolve({data:[],error:null}).then(a);}};
     return q;
   }
   window.supabase={createClient:()=>({from:(t)=>mk(t),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
  },{s:st,ho:HO,hoErr:!!opt.err});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1300);
  await p.click('.m[data-v="log"]');await p.waitForTimeout(600);
  return {b,p,errs};
}

(async()=>{
 /* ── A. 탭 프레임 ── */
 {
  const {b,p,errs}=await boot(BASE());
  const tabs=await p.$$eval('.logtabs button',es=>es.map(e=>e.textContent.trim()));
  ok('A1 탭 4개',tabs.length===4,tabs.length);
  ok('A2 핸드오프 탭 존재',tabs.some(t=>t.indexOf('핸드오프')>=0),JSON.stringify(tabs));
  ok('A3 활동 탭 존재',tabs.some(t=>t.indexOf('활동')>=0));
  ok('A4 백업·복원 탭 존재',tabs.some(t=>t.indexOf('백업')>=0));
  ok('A5 버전 탭 존재',tabs.some(t=>t.indexOf('버전')>=0));
  const on=await p.$eval('.logtabs button.on',e=>e.textContent.trim());
  ok('A6 기본은 핸드오프',on.indexOf('핸드오프')>=0,on);
  /* 구 UI 가 남아 있으면 안 된다 */
  ok('A7 재정경제부 로그 섹션 제거',!(await p.$eval('#v-log',e=>e.textContent)).includes('재정경제부'));
  ok('A8 logs2 데이터는 보존',(await p.evaluate(()=>DB.logs2.length))===2);
  ok('A9 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── B. 핸드오프 목록 ── */
 {
  const {b,p,errs}=await boot(BASE());
  const cards=await p.$$('.hocard');
  ok('B1 카드 4건',cards.length===4,cards.length);
  const chips=await p.$$eval('.horoom span',es=>es.map(e=>e.textContent.trim()));
  ok('B2 전체 칩 + 방 3개',chips.length===4,JSON.stringify(chips));
  ok('B3 전체 칩에 건수',chips[0].indexOf('4')>=0,chips[0]);
  const t1=await p.$eval('.hocard .hotit',e=>e.textContent);
  ok('B4 최신(08-28)이 맨 위',t1.indexOf('오십견')>=0,t1);
  ok('B5 status 노출',(await p.$eval('.hocard .hosta',e=>e.textContent)).indexOf('주사 4회')>=0);
  const meta=await p.$eval('.hocard .horow',e=>e.textContent);
  ok('B6 방·날짜 표시',meta.indexOf('재활의학과')>=0&&meta.indexOf('2026-08-28')>=0,meta);
  /* v2 인 문서만 버전 표기 */
  const rows=await p.$$eval('.hocard .horow',es=>es.map(e=>e.textContent));
  ok('B7 v1은 버전 표기 안 함',rows[0].indexOf('v1')<0,rows[0]);
  ok('B8 v2는 버전 표기',rows.some(r=>r.indexOf('v2')>=0),JSON.stringify(rows));
  /* 🔒 저장하지 않는다 */
  ok('B9 DB에 핸드오프 미저장',(await p.evaluate(()=>JSON.stringify(DB).indexOf('오십견')))<0);
  ok('B10 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── C. 방 필터 ── */
 {
  const {b,p}=await boot(BASE());
  await p.evaluate(()=>setHoRoom('로버트(생활)'));await p.waitForTimeout(250);
  ok('C1 필터 후 2건',(await p.$$('.hocard')).length===2);
  ok('C2 칩 on 표시',(await p.$$('.horoom span.on')).length===1);
  await p.evaluate(()=>setHoRoom('로버트(생활)'));await p.waitForTimeout(250);
  ok('C3 같은 칩 재클릭 → 해제',(await p.$$('.hocard')).length===4);
  await p.evaluate(()=>setHoRoom('없는방'));await p.waitForTimeout(250);
  ok('C4 빈 결과 안내',(await p.$eval('#v-log',e=>e.textContent)).indexOf('핸드오프가 없다')>=0);
  await b.close();
 }

 /* ── D. 본문 모달 + 마크다운 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.click('.hocard');await p.waitForTimeout(350);
  const md=await p.$eval('.mdbody',e=>e.innerHTML);
  ok('D1 모달 열림',!!(await p.$('.mdbody')));
  ok('D2 h1 렌더',md.indexOf('mdh1')>=0);
  ok('D3 h2 렌더',md.indexOf('mdh2')>=0);
  ok('D4 볼드 렌더',md.indexOf('<b>오십견 확진.</b>')>=0,md.slice(0,200));
  ok('D5 코드 렌더',md.indexOf('<code>내회전</code>')>=0);
  ok('D6 불릿 렌더',(md.match(/<ul class="mdul">/g)||[]).length===1);
  ok('D7 번호목록 렌더',md.indexOf('<ol class="mdul">')>=0);
  ok('D8 구분선 렌더',md.indexOf('mdhr')>=0);
  const head=await p.$eval('.modal .mut',e=>e.textContent);
  ok('D9 머리말에 방·날짜',head.indexOf('재활의학과')>=0&&head.indexOf('2026-08-28')>=0,head);
  ok('D10 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── E. 🔒 주입 방어 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>hoModal(2));await p.waitForTimeout(350);
  ok('E1 onerror 미실행',(await p.evaluate(()=>window.__PWN))===undefined);
  ok('E2 script 미실행',(await p.evaluate(()=>window.__PWN2))===undefined);
  const md=await p.$eval('.mdbody',e=>e.innerHTML);
  ok('E3 img 태그가 텍스트로',md.indexOf('&lt;img')>=0,md.slice(0,120));
  ok('E4 script 태그가 텍스트로',md.indexOf('&lt;script')>=0);
  ok('E5 이스케이프 후에도 볼드는 동작',md.indexOf('<b>굵게</b>')>=0);
  const h3=await p.$eval('.modal h3',e=>e.innerHTML);
  ok('E6 제목도 이스케이프',h3.indexOf('&lt;b&gt;')>=0,h3);
  ok('E7 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── F. 활동 탭 ── */
 {
  const {b,p}=await boot(BASE());
  await p.evaluate(()=>setLogTab('act'));await p.waitForTimeout(300);
  const txt=await p.$eval('#v-log',e=>e.textContent);
  ok('F1 날짜 그룹 2개',txt.indexOf('2026-08-28')>=0&&txt.indexOf('2026-08-27')>=0);
  ok('F2 건수 표기',txt.indexOf('2건')>=0,txt.slice(0,200));
  ok('F3 전체 건수 표기',txt.indexOf('3건')>=0);
  ok('F4 탭 상태 저장',(await p.evaluate(()=>DB.ui.logTab))==='act');
  await b.close();
 }

 /* ── G. 버전 탭 ── */
 {
  const {b,p}=await boot(BASE());
  await p.evaluate(()=>setLogTab('ver'));await p.waitForTimeout(300);
  const shown=await p.$$eval('#v-log .sec > div',es=>es.filter(e=>e.offsetParent!==null&&e.querySelector('.pill')).length);
  ok('G1 기본 3건만 펼침',shown===3,shown);
  /* ⚠️ '#v-log button' 은 탭 버튼을 먼저 잡는다 — 처음 이걸로 짜서 탭이 바뀌어버렸다 */
  ok('G2 더보기 버튼',(await p.$eval('#verMore',e=>e.textContent)).indexOf('더 보기')>=0);
  await p.click('#verMore');await p.waitForTimeout(300);
  const all=await p.$$eval('#verRest > div',es=>es.length);
  ok('G3 펼치면 나머지 노출',all>0&&(await p.$eval('#verRest',e=>e.style.display))!=='none',all);
  ok('G4 접기 버튼으로 바뀜',(await p.$eval('#verMore',e=>e.textContent)).indexOf('접기')>=0);
  ok('G4b 탭은 그대로 버전',(await p.evaluate(()=>DB.ui.logTab))==='ver');
  ok('G5 현재 버전 2.3',(await p.$eval('#v-log',e=>e.textContent)).indexOf('v2.3')>=0);
  await b.close();
 }

 /* ── H. 백업 탭 ── */
 {
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>setLogTab('bak'));await p.waitForTimeout(400);
  const txt=await p.$eval('#v-log',e=>e.textContent);
  ok('H1 백업 섹션',txt.indexOf('JSON 내려받기')>=0);
  ok('H2 스냅샷 섹션',txt.indexOf('스냅샷')>=0);
  ok('H3 snaplist 존재',!!(await p.$('#snaplist')));
  ok('H4 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── I. 🔒 실패 처리 — RLS 정책이 없으면 이 화면이 뜬다 ── */
 {
  const {b,p,errs}=await boot(BASE(),{err:1});
  await p.waitForTimeout(500);
  const txt=await p.$eval('#v-log',e=>e.textContent);
  ok('I1 실패를 조용히 넘기지 않는다',txt.indexOf('읽지 못했다')>=0,txt.slice(0,160));
  ok('I2 원인 노출',txt.indexOf('permission denied')>=0);
  ok('I3 다시 시도 버튼',txt.indexOf('다시 시도')>=0);
  ok('I4 빈 목록으로 위장하지 않음',(await p.$$('.hocard')).length===0);
  ok('I5 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── J. 재요청 횟수 — 탭을 오갈 때마다 서버를 때리면 안 된다 ── */
 {
  const {b,p}=await boot(BASE());
  const n1=await p.evaluate(()=>window.__hoHits||0);
  await p.evaluate(()=>setLogTab('act'));await p.waitForTimeout(200);
  await p.evaluate(()=>setLogTab('ho'));await p.waitForTimeout(400);
  const n2=await p.evaluate(()=>window.__hoHits||0);
  ok('J1 최초 1회만 조회',n1===1,n1);
  ok('J2 탭 복귀 시 재조회 안 함',n2===1,n2);
  await p.evaluate(()=>hoLoad(1));await p.waitForTimeout(400);
  ok('J3 강제 새로고침은 조회함',(await p.evaluate(()=>window.__hoHits))===2);
  await b.close();
 }

 console.log('t34  pass='+pass+' fail='+fail);
 if(bad.length)console.log(bad.map(x=>'  ✗ '+x).join('\n'));
 process.exit(fail?1:0);
})();
