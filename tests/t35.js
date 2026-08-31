/* t35 — 📊 월별 자산 스냅샷 (v2.4)
   ⚠️ v2.3까지 netSnapshots 는 시드 6건이 전부였고 쓰는 코드가 없었다.
      추세 그래프가 2026-07 에 멈춰 있었고, 마이그레이션 보장조차 없어 빈 배열이면 모달이 죽었다.
   🔒 핵심 불변식 셋:
      ① 이번 달 행만 갱신한다. **지난 달 행은 절대 안 덮는다.**
      ② 값이 그대로면 저장하지 않는다(쓸데없는 서버 왕복 금지).
      ③ 총부채는 파생 불가라 반드시 기록돼야 한다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE=(snaps)=>({schemaVersion:7,ui:{month:'2026-08'},
 goals:[],routines:[],checks:{},rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],
 fixed:[],events:[],posts:[],budgets:{},cards:[],categories:[],transactions:[],
 netSnapshots:snaps,
 debts:[{id:'d1',name:'정책자금',balance:39900000}],
 accounts:[
  {id:'a1',name:'우리',group:'현금성',mode:'auto',hist:[{date:'2026-08-31',amount:308458}]},
  {id:'a2',name:'세이프박스',group:'현금성',mode:'auto',hist:[{date:'2026-08-31',amount:1482988}]},
  {id:'a3',name:'ETF',group:'투자',mode:'manual',hist:[{date:'2026-08-31',amount:166600}]},
  {id:'a4',name:'노랑우산',group:'저축',mode:'manual',hist:[{date:'2026-08-31',amount:2400000}]},
  {id:'a5',name:'외환',group:'외환',mode:'manual',hist:[{date:'2026-08-31',amount:1459059}]}],
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};window.__saves=0;
   function mk(t){let _m=null,_p=null;
    const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;window.__saves++;return Promise.resolve({data:[{updated_at:store.at}]});}return q},
     eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
     update(p){_m='update';_p=p;return q},
     upsert(r){store.v=r.data;store.at=r.updated_at;window.__saves++;return Promise.resolve({})},
     order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
     delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
    return q;}
   window.supabase={createClient:()=>({from:t=>mk(t),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  return {b,p,errs};
}
const TM=p=>p.evaluate(()=>todayStr().slice(0,7));

(async()=>{
 /* ── A. 첫 기록 생성 ── */
 {
  const {b,p,errs}=await boot(BASE([]));
  const m=await TM(p);
  const rows=await p.evaluate(()=>DB.netSnapshots);
  ok('A1 이번 달 행 생성',rows.length===1&&rows[0].m===m,JSON.stringify(rows));
  const r=rows[0];
  ok('A2 총자산 = 계좌 합',r.a===308458+1482988+166600+2400000+1459059,r.a);
  ok('A3 총부채 = 부채 + 카드미결제',r.l===39900000,r.l);
  ok('A4 그룹별 현금성',r.cash===308458+1482988,r.cash);
  ok('A5 그룹별 투자',r.inv===166600,r.inv);
  ok('A6 그룹별 저축',r.sav===2400000,r.sav);
  ok('A7 그룹별 외환',r.fx===1459059,r.fx);
  ok('A8 갱신일 기록',!!r.at&&r.at.length===10,r.at);
  /* 🔒 접속만으로는 저장하지 않는다 — updated_at 을 밀면 다른 탭과 헛된 충돌이 난다.
     대신 save() 안에서 갱신되므로 거래 하나만 써도 같이 올라간다. */
  ok('A9 접속만으로는 저장 안 함',(await p.evaluate(()=>window.__saves))===0,await p.evaluate(()=>window.__saves));
  await p.evaluate(()=>save());await p.waitForTimeout(700);
  ok('A9b save() 하면 올라간다',(await p.evaluate(()=>window.__saves))>=1);
  ok('A10 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── B. 🔒 지난 달은 덮지 않는다 ── */
 {
  const past=[{m:'2026-02',a:4243477,l:42698252},{m:'2026-07',a:5039817,l:39137329}];
  const {b,p,errs}=await boot(BASE(JSON.parse(JSON.stringify(past))));
  const m=await TM(p);
  const rows=await p.evaluate(()=>DB.netSnapshots);
  ok('B1 지난 달 2건 보존',rows.filter(x=>x.m==='2026-02'||x.m==='2026-07').length===2);
  const feb=rows.find(x=>x.m==='2026-02');
  ok('B2 2026-02 값 그대로',feb.a===4243477&&feb.l===42698252,JSON.stringify(feb));
  const jul=rows.find(x=>x.m==='2026-07');
  ok('B3 2026-07 값 그대로',jul.a===5039817&&jul.l===39137329,JSON.stringify(jul));
  ok('B4 이번 달만 추가',rows.length===3&&rows.some(x=>x.m===m),rows.length);
  ok('B5 월 오름차순 정렬',JSON.stringify(rows.map(x=>x.m))===JSON.stringify(rows.map(x=>x.m).slice().sort()));
  ok('B6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── C. 🔒 값이 같으면 저장하지 않는다 ── */
 {
  const {b,p}=await boot(BASE([]));
  const saved=await p.evaluate(()=>{const n=window.__saves;return {n,again:netSnapTouch()};});
  ok('C1 두 번째 호출은 false',saved.again===false,JSON.stringify(saved));
  const after=await p.evaluate(()=>window.__saves);
  ok('C2 저장 횟수 안 늘어남',after===saved.n,after+' vs '+saved.n);
  /* 자산이 바뀌면 다시 true */
  const ch=await p.evaluate(()=>{DB.accounts[0].hist.push({date:'2026-08-31',amount:999999});return netSnapTouch();});
  ok('C3 값이 바뀌면 true',ch===true);
  ok('C4 갱신된 값 반영',(await p.evaluate(()=>DB.netSnapshots[DB.netSnapshots.length-1].a))===999999+1482988+166600+2400000+1459059);
  await b.close();
 }

 /* ── D. 추세 모달 ── */
 {
  const past=[];for(let i=1;i<=14;i++)past.push({m:'2025-'+String(i).padStart(2,'0'),a:1000000*i,l:2000000});
  const {b,p,errs}=await boot(BASE(past.slice(0,12)));
  await p.click('.m[data-v="dash"]');await p.waitForTimeout(400);
  await p.evaluate(()=>metricModal('net'));await p.waitForTimeout(300);
  const txt=await p.$eval('.modal',e=>e.textContent);
  ok('D1 모달 열림',txt.indexOf('순자산')>=0);
  ok('D2 기간·개월수 표기',/\d{4}-\d{2} ~ \d{4}-\d{2} · \d+개월/.test(txt),txt.slice(0,120));
  ok('D3 최근 12개월만',txt.indexOf('12개월')>=0,txt.slice(0,120));
  ok('D4 최종 갱신일 안내',txt.indexOf('최종')>=0);
  ok('D5 지난 달 미갱신 원칙 명시',txt.indexOf('덮지 않는다')>=0);
  ok('D6 콘솔 에러 0',errs.length===0,errs.join('|'));
  await b.close();
 }

 /* ── E. 🔒 빈 배열 방어 (v2.3 은 여기서 죽었다) ── */
 {
  const st=BASE([]);
  const {b,p,errs}=await boot(st);
  await p.evaluate(()=>{DB.netSnapshots=[];});
  await p.click('.m[data-v="dash"]');await p.waitForTimeout(300);
  await p.evaluate(()=>metricModal('assets'));await p.waitForTimeout(300);
  const txt=await p.$eval('.modal',e=>e.textContent);
  ok('E1 죽지 않고 안내를 띄운다',txt.indexOf('아직 기록이 없다')>=0,txt.slice(0,100));
  ok('E2 콘솔 에러 0',errs.length===0,errs.join('|'));
  /* 마이그레이션 보장 */
  const mig=await p.evaluate(()=>{const d=migrateDB({schemaVersion:7});return Array.isArray(d.netSnapshots);});
  ok('E3 마이그레이션이 필드를 보장',mig===true);
  await b.close();
 }

 /* ── F. 상한 ── */
 {
  const many=[];for(let y=1990;y<2026;y++)for(let i=1;i<=12;i++)many.push({m:y+'-'+String(i).padStart(2,'0'),a:1,l:1});
  const {b,p}=await boot(BASE(many));
  const n=await p.evaluate(()=>DB.netSnapshots.length);
  ok('F1 상한 420 적용',n<=420,n);
  ok('F2 최신 것이 남는다',(await p.evaluate(()=>DB.netSnapshots[DB.netSnapshots.length-1].m))===(await TM(p)));
  await b.close();
 }

 console.log('t35  pass='+pass+' fail='+fail);
 if(bad.length)console.log(bad.map(x=>'  ✗ '+x).join('\n'));
 process.exit(fail?1:0);
})();
