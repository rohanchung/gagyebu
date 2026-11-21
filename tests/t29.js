/* t29 — 🛡️ 보험 (v1.7 · v5.14 가짜 픽스처로 다시 씀)
   규칙: 빈 상태부터 먹인다. 시드는 멱등해야 하고, 계약을 지우면 보장이 따라 죽어야 한다.
   🔒 v5.14 — 앱의 보험 씨앗은 비었다(실제 가족 보험이 공개 파일에 있었다 · 핸드오프 id 64).
      계산의 약속(보험료 합 · 특약 불일치 · 실손은 max · 진단비는 sum · 계약 지우면 보장도)은 **지어낸 계약**으로 잰다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],ui:{month:'2026-08'},
 accounts:[],transactions:[],categories:[],cards:[],debts:[],fixed:[],events:[],posts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 journal:[],items:[],logs:[],budgets:{}};

async function boot(st){
  const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
  const c=await b.newContext();
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1200);
  return {b,p,errs};
}


/* 🔒 지어낸 계약 — 사람 셋 × 3 · 이름·숫자 전부 가짜 */
function FAKE_INS(){
  const P=(id,person,insurer,product,premium,riders)=>({id,person,insurer,product,premium,status:'active',riders:riders||[]});
  const C=(id,pid,name,amt)=>({id,pid,cat:'진단',name,amt});
  return {policies:[
    P('fs1','self','가상생명','가상CI보험',100000,[{name:'특약가',prem:60000},{name:'특약나',prem:42000}]),
    P('fs2','self','가상화재','가상건강보험',50000,[{name:'특약다',prem:null}]),
    P('fs3','self','가상우체','가상우체보험',null,[]),
    P('ff1','father','가상화재','가상실손A',30000),P('ff2','father','가상손보','가상실손B',20000),P('ff3','father','가상생명','가상다이렉트건강보험',10000),
    P('fm1','mother','가상우체','가상우체암보험',15000),P('fm2','mother','가상생명','가상암보험',15000),P('fm3','mother','가상손보','가상간편보험',15000)],
  covers:[
    C('k1','fs1','실손질병입원의료비',30000000),C('k2','fs2','실손질병입원의료비',50000000),C('k3','fs1','암 진단비',10000000),
    C('k4','fs1','뇌졸중진단비',10000000),C('k5','fs2','뇌출혈진단비',5000000),C('k6','fs1','허혈성 심장질환',null),
    C('k7','ff1','실손질병입원의료비',50000000),C('k8','ff2','실손질병입원의료비',50000000),C('k9','ff1','암 진단비',20000000),C('k10','ff1','질병입원',30000),
    C('k11','fm1','암 진단비',20000000),C('k12','fm2','암 진단비',20000000),C('k13','fm3','질병입원',20000),C('k14','fm1','상해사망',10000000)]};
}
(async()=>{
/* ── A. 빈 상태에서 부팅 → 🔒 실데이터 씨앗이 없다 — 아무 계약도 심기지 않는다 ── */
{
  const {b,p,errs}=await boot(JSON.parse(JSON.stringify(BASE)));
  await p.click('.m[data-v="insu"]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({pol:DB.insurance.policies.length,cov:DB.insurance.covers.length,seeded:DB.meta.insSeeded,html:document.getElementById('v-insu').innerHTML.length}));
  ok('A1 🔒 빈 계정엔 계약이 심기지 않는다(씨앗이 비었다)',r.pol===0&&r.cov===0,r.pol+'/'+r.cov);
  ok('A4 insSeeded 플래그',r.seeded===2,r.seeded);
  ok('A5 빈 상태도 화면이 그려진다',r.html>500,r.html);
  ok('A7 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}
/* ── A'. 지어낸 계약으로 계산을 잰다 ── */
{
  const st=JSON.parse(JSON.stringify(BASE)); st.meta={insSeeded:2}; st.insurance=FAKE_INS();
  const {b,p,errs}=await boot(st);
  await p.click('.m[data-v="insu"]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({pol:DB.insurance.policies.length,cov:DB.insurance.covers.length,
    self:insPols('self').length,dad:insPols('father').length,mom:insPols('mother').length,html:document.getElementById('v-insu').innerHTML.length}));
  ok('A2 픽스처 계약 9 · 보장 14',r.pol===9&&r.cov===14,r.pol+'/'+r.cov);
  ok('A3 사람마다 3건',r.self===3&&r.dad===3&&r.mom===3,r.self+'/'+r.dad+'/'+r.mom);
  ok('A5b 화면이 그려진다',r.html>2000,r.html);
  ok('A8 월 보험료 합 150,000(미상은 0)',(await p.evaluate(()=>insMonthly('self')))===150000);
  const kb=await p.evaluate(()=>{const x=insPol('fs1');let s=0;x.riders.forEach(r=>{if(r.prem!=null)s+=r.prem;});return {s,prem:x.premium,gap:insPremGap(x)};});
  ok('A9 특약 합 102,000 · 계약 100,000',kb.s===102000&&kb.prem===100000,kb.s+' vs '+kb.prem);
  ok('A9b 불일치 +2,000 을 파생으로 잡는다(맞춰 고치지 않는다)',kb.gap===2000,kb.gap);
  ok('A9c 불일치 경고가 화면에 뜬다',await p.evaluate(()=>document.getElementById('v-insu').innerHTML.indexOf('보험료 불일치')>=0));
  ok('A9d 특약 보험료 미상이면 불일치 0',(await p.evaluate(()=>insPremGap(insPol('fs2'))))===0);
  const rk=await p.evaluate(()=>{const g=k=>INS_RISK.filter(r=>r.k===k)[0];
    return {sS:insRisk('self',g('실손')).amt,sF:insRisk('father',g('실손')).amt,sM:insRisk('mother',g('실손')).amt,
      cS:insRisk('self',g('암 진단')).amt,cF:insRisk('father',g('암 진단')).amt,cM:insRisk('mother',g('암 진단')).amt,
      hS:insRisk('self',g('심장')).amt,bS:insRisk('self',g('뇌')).amt};});
  ok('B1 실손은 max — 3,000만·5,000만 중 5,000만',rk.sS===50000000,rk.sS);
  ok('B2 🔒 두 계약 실손이어도 합산 안 함(비례보상)',rk.sF===50000000,rk.sF);
  ok('B3 실손 없으면 0',rk.sM===0,rk.sM);
  ok('B4·B5 진단비는 계약마다',rk.cS===10000000&&rk.cF===20000000,JSON.stringify(rk));
  ok('B5b 진단비는 sum — 2,000만 + 2,000만',rk.cM===40000000,rk.cM);
  ok('B6 미보유(금액 없음)는 0',rk.hS===0,rk.hS);
  ok('B7 뇌는 max',rk.bS===10000000,rk.bS);
  ok('B8 보장 공백 박스',await p.evaluate(()=>document.getElementById('v-insu').innerHTML.indexOf('보장 공백')>=0));
  const agg=await p.evaluate(()=>({silson:insAgg('실손질병입원의료비'),cancer:insAgg('암 진단비'),
    dadCells:DB.insurance.covers.filter(c=>c.name==='실손질병입원의료비'&&['ff1','ff2'].indexOf(c.pid)>=0).length}));
  ok('B9 실손 max · 진단비 sum · 두 계약 겹침',agg.silson==='max'&&agg.cancer==='sum'&&agg.dadCells===2,JSON.stringify(agg));
  ok('B10 요약표에 세 사람',(await p.evaluate(()=>document.getElementById('v-insu').querySelector('.instbl tbody').querySelectorAll('tr').length))===3);
  ok('B11 꺼진 탭 개념이 없다',await p.evaluate(()=>document.getElementById('v-insu').innerHTML.indexOf('wtab off')<0));
  ok('B12 DB.insurance.on 잔재 제거',await p.evaluate(()=>DB.insurance.on===undefined));
  await p.evaluate(()=>setInsPerson('father'));await p.waitForTimeout(250);
  const c2=await p.evaluate(()=>({ui:DB.ui.insPerson,n:insPols('father').length,cov:insCovs('ff1').length,h:document.getElementById('v-insu').innerHTML}));
  ok('C1 아버지 탭 저장',c2.ui==='father');
  ok('C2 아버지 계약 3건 · 첫 계약 보장 3',c2.n===3&&c2.cov===3,c2.n+'/'+c2.cov);
  ok('C4 계약 이름이 보인다',c2.h.indexOf('가상다이렉트건강보험')>=0);
  ok('C5 계약 카드 3장',(c2.h.match(/data-edinspol=/g)||[]).length===3,(c2.h.match(/data-edinspol=/g)||[]).length);
  await p.evaluate(()=>setInsPerson('mother'));await p.waitForTimeout(250);
  ok('C6 어머니 계약 3건',(await p.evaluate(()=>insPols('mother').length))===3);
  await p.evaluate(()=>setInsPerson('father'));await p.waitForTimeout(200);
  const del=await p.evaluate(()=>{const before=DB.insurance.covers.length,n=insCovs('ff1').length;delInsPol('ff1');
    return {before,n,after:DB.insurance.covers.length,pol:DB.insurance.policies.length,orphan:DB.insurance.covers.filter(c=>!DB.insurance.policies.some(p=>p.id===c.pid)).length};});
  ok('D1 계약 8건',del.pol===8,del.pol);
  ok('D2 보장이 함께 사라진다',del.after===del.before-del.n,del.before+'-'+del.n+' vs '+del.after);
  ok('D3 고아 보장 0',del.orphan===0,del.orphan);

  /* ── E. 계약 추가 ── */
  const add=await p.evaluate(()=>{
    insPolModal(null);
    document.getElementById('ip_person').value='mother';
    document.getElementById('ip_insurer').value='테스트생명';
    document.getElementById('ip_product').value='테스트보험';
    document.getElementById('ip_premium').value='30,000원';
    document.getElementById('ip_start').value='2020-01-15';
    document.getElementById('ip_payTerm').value='10';
    saveInsPol(null);
    const x=DB.insurance.policies.filter(p=>p.insurer==='테스트생명')[0];
    return {prem:x.premium,paidUp:insPaidUp(x),mom:insMonthly('mother'),n:DB.insurance.policies.length};
  });
  ok('E1 보험료 숫자만 추출',add.prem===30000,add.prem);
  ok('E2 납입완료 = 시작+납입기간',add.paidUp==='2030-01-15',add.paidUp);
  ok('E3 어머니 월 보험료 45,000 + 30,000',add.mom===75000,add.mom);
  ok('E4 계약 9건',add.n===9,add.n);

  /* 잘못된 날짜는 거부한다 */
  /* type=date 가 1차 방어, isDateStr 가 2차 방어. 붙여넣기·자동완성으로 뚫릴 수 있으니 둘 다 본다.
     🔒 재물관리 end:'1800' 사고(v1.4)와 같은 종류다 — 연도만 들어와도 통과시키면 안 된다. */
  const bad2=await p.evaluate(()=>{
    const n=DB.insurance.policies.length;
    insPolModal(null);
    const el=document.getElementById('ip_start');
    ok1=(el.type==='date');
    el.type='text'; el.value='1800';
    document.getElementById('ip_insurer').value='불량';
    saveInsPol(null);
    return {added:DB.insurance.policies.length-n,wasDate:ok1};
  });
  ok('E5 시작일 입력칸은 type=date',bad2.wasDate===true,bad2.wasDate);
  ok('E5b 연도만 들어온 시작일 거부',bad2.added===0,bad2.added);

  ok('E6 여전히 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── F. 이미 시드된 상태로 재부팅 → 되살아나지 않는다 (멱등) ── */
{
  const st=JSON.parse(JSON.stringify(BASE));
  st.meta={insSeeded:2};
  st.insurance={policies:[{id:'ipX',person:'self',insurer:'남은것',product:'P',premium:1000,status:'active',riders:[]}],covers:[]};
  const {b,p,errs}=await boot(st);
  await p.click('.m[data-v="insu"]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({pol:DB.insurance.policies.length,cov:DB.insurance.covers.length}));
  ok('F1 시드 재삽입 없음',r.pol===1,r.pol);
  ok('F2 보장도 안 늘어남',r.cov===0,r.cov);
  ok('F3 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── G. 보험 데이터가 통째로 없는 구버전 + 고아 보장 → 정리된다 ── */
{
  const st=JSON.parse(JSON.stringify(BASE));
  st.meta={insSeeded:2};
  st.insurance={policies:[],covers:[{id:'zz',pid:'없는계약',cat:'진단',name:'암 진단비',amt:1000}]};
  const {b,p,errs}=await boot(st);
  await p.click('.m[data-v="insu"]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({cov:DB.insurance.covers.length,h:document.getElementById('v-insu').innerHTML.length}));
  ok('G1 고아 보장 제거',r.cov===0,r.cov);
  ok('G2 계약 0건이어도 화면은 뜬다',r.h>500,r.h);
  ok('G3 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── H. insSeeded=1 세대 → 2 로 올린다 · 🔒 v5.14 씨앗이 비었으니 채울 것이 없다 — 기존 계약은 그대로 ── */
{
  const st=JSON.parse(JSON.stringify(BASE));
  st.meta={insSeeded:1};
  st.insurance={policies:[{id:'fs1',person:'self',insurer:'가상생명',product:'CI',premium:100000,status:'active',riders:[]}],
                covers:[{id:'k6',pid:'fs1',cat:'진단',name:'허혈성 심장질환',amt:null,note:'미보유'}]};
  const {b,p,errs}=await boot(st);
  await p.click('.m[data-v="insu"]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({pol:DB.insurance.policies.length,cov:DB.insurance.covers.length,seeded:DB.meta.insSeeded,kept:insPol('fs1').product}));
  ok('H1 seeded 2로 승격',r.seeded===2,r.seeded);
  ok('H3 🔒 씨앗이 비어 계약이 늘지 않는다',r.pol===1&&r.cov===1,r.pol+'/'+r.cov);
  ok('H7 로한이 고친 값을 덮어쓰지 않는다',r.kept==='CI',r.kept);
  ok('H8 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

console.log('t29 보험 |',pass,'통과 /',fail,'실패');
if(bad.length)console.log('  ✗ '+bad.join('\n  ✗ '));
process.exit(fail?1:0);
})();
