/* t33 — 🩸 피검사 지표 CRUD (v2.1)
   ⚠️ v2.01까지 **검사일은 추가할 수 있는데 지표는 못 만들었다.**
      ALP·폐기능처럼 새 항목이 생기면 로한이 손댈 수 없어 막혔다.
   🔒 핵심 불변식: labDates 길이와 labValues 각 배열 길이가 항상 같아야 한다.
      어긋나면 열이 통째로 밀려서 **다른 날짜의 값으로 읽힌다.** */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE=()=>({schemaVersion:7,ui:{month:'2026-08'},
 goals:[],routines:[],checks:{},rewards:[],rewardCards:{},journal:[],items:[],logs:[],
 fixed:[],events:[],posts:[],budgets:{},debts:[],accounts:[],cards:[],categories:[],transactions:[],
 health:{
   labDates:['2026-03-12','2026-09-03'],
   labTypes:['외래','외래'],
   labMeds:[{am:[],pm:[]},{am:[],pm:[]}],
   metrics:[
     {name:'AST(SGOT)',func:'간기능',low:3,high:45,range:'3-45',cat:'간'},
     {name:'HbA1c',func:'당화혈색소',low:4,high:6,range:'4.0-6.0',cat:'대사·당'}],
   labValues:{'AST(SGOT)':[21,21],'HbA1c':[6.0,6.2]},
   catOrder:['대사·당','간'],
   /* 🔒 wImport2026 = 2026 체중 일회성 임포트 플래그. 없으면 62건이 딸려 들어와
      체중 건수를 세는 단정이 전부 틀어진다. 실제 DB 에는 이미 찍혀 있다. */
   wImport2026:1,
   weights:[],events:[]}});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1300);
  await p.click('.m[data-v="labs"]');await p.waitForTimeout(400);
  return {b,p,errs};
}
/* 🔒 길이 정합 — 이게 깨지면 값이 다른 날짜로 읽힌다 */
const lenOK = p => p.evaluate(()=>{
  const H=DB.health,n=H.labDates.length;
  return H.labTypes.length===n && H.labMeds.length===n &&
    Object.keys(H.labValues).every(k=>H.labValues[k].length===n);});

(async()=>{
{
  const {b,p,errs}=await boot(BASE());
  ok('A1 지표 추가 버튼이 있다',await p.evaluate(()=>!!document.getElementById('labAddMetric')));
  /* 시드 지표가 병합돼 들어온다 — 픽스처 2개 + 시드분. 개수를 박지 않고 정합만 본다. */
  const nm0=await p.evaluate(()=>DB.health.metrics.length);
  ok('A2 지표마다 ✎ 가 붙는다',
     await p.evaluate(n=>document.querySelectorAll('#v-labs [data-labmet]').length===n,nm0),nm0);
  ok('A2b 시드가 병합된다 (픽스처를 지우지 않는다)',
     await p.evaluate(()=>!!labMetric('AST(SGOT)')&&!!labMetric('NT Pro BNP')));
  ok('A3 길이 정합',await lenOK(p));

  /* ── B. 추가 ── */
  const add=await p.evaluate(()=>{
    labMetricModal(null);
    document.getElementById('lm_name').value='ALP';
    document.getElementById('lm_func').value='알칼리성 인산분해효소';
    document.getElementById('lm_cat').value='간';
    document.getElementById('lm_low').value='30';
    document.getElementById('lm_high').value='120';
    document.getElementById('lm_range').value='30-120';
    const before=DB.health.metrics.length;
    saveLabMetric(null);
    const m=labMetric('ALP');
    return {d:DB.health.metrics.length-before, low:m.low, high:m.high, cat:m.cat,
            vlen:DB.health.labValues['ALP'].length,
            allNull:DB.health.labValues['ALP'].every(v=>v===null)};
  });
  ok('B1 지표가 하나 늘어난다',add.d===1,add.d);
  ok('B2 정상범위 30~120',add.low===30&&add.high===120,`${add.low}~${add.high}`);
  ok('B3 🔒 검사일 수만큼 빈 칸이 생긴다',add.vlen===2&&add.allNull===true,`${add.vlen}/${add.allNull}`);
  ok('B4 길이 정합 유지',await lenOK(p));

  /* 🔒 정상범위를 비울 수 있어야 한다 — 폐기능은 예측치 대비 %로 판정한다 */
  const nul=await p.evaluate(()=>{
    labMetricModal(null);
    document.getElementById('lm_name').value='FVC';
    document.getElementById('lm_cat').value='호흡기(PFT)';
    document.getElementById('lm_low').value='';
    document.getElementById('lm_high').value='';
    document.getElementById('lm_range').value='예측치 대비 %';
    saveLabMetric(null);
    const m=labMetric('FVC');
    return {low:m.low, high:m.high, cat:m.cat,
            flagHi:labFlag(m,999), flagLo:labFlag(m,0.1),
            newCat:DB.health.catOrder.indexOf('호흡기(PFT)')>=0};
  });
  ok('B5 정상범위를 비울 수 있다',nul.low===null&&nul.high===null,`${nul.low}/${nul.high}`);
  ok('B6 🔒 범위가 없으면 ↑↓ 를 안 띄운다 (거짓 경고 금지)',nul.flagHi===''&&nul.flagLo==='',
     `${nul.flagHi}/${nul.flagLo}`);
  ok('B7 새 분류가 catOrder 에 들어간다',nul.newCat===true);
  ok('B8 화면에 새 분류가 뜬다',
     await p.evaluate(()=>document.getElementById('v-labs').innerHTML.indexOf('호흡기(PFT)')>=0));

  /* 중복 이름 거부 */
  const dup=await p.evaluate(()=>{
    const n=DB.health.metrics.length;
    labMetricModal(null);
    document.getElementById('lm_name').value='ALP';
    saveLabMetric(null);
    closeModal();
    return DB.health.metrics.length-n;
  });
  ok('B9 같은 이름은 거부',dup===0,dup);

  /* ── C. 🔒 이름을 바꾸면 기록도 따라간다 ── */
  const ren=await p.evaluate(()=>{
    DB.health.labValues['ALP']=[55,58];
    labMetricModal('ALP');
    document.getElementById('lm_name').value='ALP(알칼리성)';
    saveLabMetric('ALP');
    return {old:DB.health.labValues['ALP'], nw:DB.health.labValues['ALP(알칼리성)'],
            m:!!labMetric('ALP(알칼리성)'), gone:!labMetric('ALP')};
  });
  ok('C1 새 이름으로 지표가 옮겨진다',ren.m===true&&ren.gone===true);
  ok('C2 🔒 기록이 따라온다',JSON.stringify(ren.nw)==='[55,58]',JSON.stringify(ren.nw));
  ok('C3 🔒 옛 키가 고아로 남지 않는다',ren.old===undefined);
  ok('C4 길이 정합 유지',await lenOK(p));

  /* ── D. 값 편집 → 판정 ── */
  const flag=await p.evaluate(()=>{
    const m=labMetric('ALP(알칼리성)');
    return {norm:labFlag(m,58), hi:labFlag(m,150), lo:labFlag(m,10)};
  });
  ok('D1 58 은 정상',flag.norm==='',flag.norm);
  ok('D2 150 은 ↑',flag.hi==='hi',flag.hi);
  ok('D3 10 은 ↓',flag.lo==='lo',flag.lo);

  /* FEV1/FVC 처럼 하한만 있는 지표 */
  const oneSide=await p.evaluate(()=>{
    labMetricModal(null);
    document.getElementById('lm_name').value='FEV1/FVC';
    document.getElementById('lm_cat').value='호흡기(PFT)';
    document.getElementById('lm_low').value='70';
    document.getElementById('lm_high').value='100';
    saveLabMetric(null);
    const m=labMetric('FEV1/FVC');
    return {lo:labFlag(m,64), norm:labFlag(m,85)};
  });
  ok('D4 FEV1/FVC 64 는 ↓ (정상 ≥70)',oneSide.lo==='lo',oneSide.lo);
  ok('D5 85 는 정상',oneSide.norm==='',oneSide.norm);

  /* ── E. 삭제 ── */
  const del=await p.evaluate(()=>{
    const n=DB.health.metrics.length;
    delLabMetric('FVC');
    return {n0:n, n1:DB.health.metrics.length, v:DB.health.labValues['FVC']};
  });
  ok('E1 지표가 지워진다',del.n1===del.n0-1,`${del.n0}→${del.n1}`);
  ok('E2 🔒 기록도 같이 지운다 (고아 금지)',del.v===undefined);
  ok('E3 길이 정합 유지',await lenOK(p));

  /* ── F. 🔒 검사일을 추가해도 새 지표가 따라온다 ── */
  const addDate=await p.evaluate(()=>{
    const H=DB.health;
    H.labDates.push('2026-12-01');H.labTypes.push('외래');H.labMeds.push({am:[],pm:[]});
    Object.keys(H.labValues).forEach(k=>H.labValues[k].push(null));
    labResort();
    return H.labDates.length;
  });
  ok('F1 검사일 3개',addDate===3,addDate);
  ok('F2 🔒 길이 정합 유지',await lenOK(p));

  ok('Z1 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── H. 🔒 이번 수정의 본체 — 로한이 만든 지표가 새로고침 후에도 살아 있는가 ──
   ⚠️ v2.01까지 migrateDB 가 **매 로드마다 metrics·catOrder 를 시드로 통째로 덮어썼다.**
      그래서 지표를 추가해도 새로고침 한 번에 사라졌다. UI 가 있었어도 소용없었을 구조다. */
{
  const st=BASE();
  /* 로한이 직접 만든 지표 — 시드에 없는 것들 */
  st.health.metrics.push({name:'ALP',func:'알칼리성 인산분해효소',low:30,high:120,range:'30-120',cat:'간'});
  st.health.metrics.push({name:'FEV1/FVC',func:'1초율',low:70,high:100,range:'≥70%',cat:'호흡기(PFT)'});
  st.health.labValues['ALP']=[55,58];
  st.health.labValues['FEV1/FVC']=[null,64];
  st.health.catOrder.push('호흡기(PFT)');
  /* 로한이 시드 지표의 정상범위를 직접 고쳐 놓은 상태 */
  st.health.metrics[0].high=50;              /* AST 45 → 50 */

  const {b,p,errs}=await boot(st);
  const r=await p.evaluate(()=>({
    alp:labMetric('ALP'), fev:labMetric('FEV1/FVC'),
    ast:labMetric('AST(SGOT)').high,
    vAlp:DB.health.labValues['ALP'], vFev:DB.health.labValues['FEV1/FVC'],
    cat:DB.health.catOrder.indexOf('호흡기(PFT)')>=0,
    seedIn:!!labMetric('NT Pro BNP')
  }));
  ok('H1 🔒 로한이 만든 지표가 살아 있다',!!r.alp&&!!r.fev,`${!!r.alp}/${!!r.fev}`);
  ok('H2 🔒 그 기록도 살아 있다',JSON.stringify(r.vAlp)==='[55,58]'&&JSON.stringify(r.vFev)==='[null,64]',
     JSON.stringify(r.vAlp)+' / '+JSON.stringify(r.vFev));
  ok('H3 🔒 로한이 고친 정상범위를 시드가 덮지 않는다',r.ast===50,r.ast);
  ok('H4 로한이 만든 분류가 살아 있다',r.cat===true);
  ok('H5 시드 지표는 여전히 들어온다',r.seedIn===true);
  ok('H6 길이 정합',await lenOK(p));
  ok('H7 화면에 호흡기 분류가 뜬다',
     await p.evaluate(()=>document.getElementById('v-labs').innerHTML.indexOf('호흡기(PFT)')>=0));
  ok('H8 FEV1/FVC 64 가 ↓ 로 표시된다',
     await p.evaluate(()=>{const m=labMetric('FEV1/FVC');return labFlag(m,64)==='lo';}));
  ok('H9 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── I. 🔒 값 배열 길이가 어긋난 판을 자동 보정한다 ──
   길이가 밀리면 **다른 날짜의 값으로 읽힌다.** 조용히 틀리는 종류의 사고다. */
{
  const st=BASE();
  st.health.metrics.push({name:'짧은지표',func:'',low:null,high:null,range:'',cat:'간'});
  st.health.labValues['짧은지표']=[1];          /* 검사일 2개인데 값 1개 */
  st.health.labValues['AST(SGOT)']=[21,21,99];  /* 검사일 2개인데 값 3개 */
  const {b,p,errs}=await boot(st);
  const r=await p.evaluate(()=>({
    short:DB.health.labValues['짧은지표'], long:DB.health.labValues['AST(SGOT)'],
    n:DB.health.labDates.length}));
  ok('I1 짧으면 null 로 채운다',JSON.stringify(r.short)==='[1,null]',JSON.stringify(r.short));
  ok('I2 길면 잘라낸다',JSON.stringify(r.long)==='[21,21]',JSON.stringify(r.long));
  ok('I3 길이 정합',await lenOK(p));
  ok('I4 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── G. 지표가 하나도 없는 상태에서도 안 죽는다 ── */
{
  const st=BASE();
  st.health.metrics=[]; st.health.labValues={}; st.health.catOrder=[];
  const {b,p,errs}=await boot(st);
  ok('G1 빈 지표여도 화면이 뜬다',
     await p.evaluate(()=>document.getElementById('v-labs').innerHTML.length>200));
  const first=await p.evaluate(()=>{
    labMetricModal(null);
    document.getElementById('lm_name').value='PEF';
    document.getElementById('lm_cat').value='';
    saveLabMetric(null);
    return {cat:labMetric('PEF').cat, len:DB.health.labValues['PEF'].length};
  });
  ok('G2 분류를 안 적으면 기타로',first.cat==='기타',first.cat);
  ok('G3 빈 칸 2개(검사일 수)',first.len===2,first.len);
  ok('G3b 시드는 그래도 들어온다',await p.evaluate(()=>!!labMetric('NT Pro BNP')));
  ok('G4 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── J. 체중 셀 — 로한: "몸무게는 클릭시 반응이 없는데" ──
   ⚠️ v2.1까지 체중 행만 onclick 이 없었고, **날짜가 원 단위로 같아야만** 값이 떴다.
      실측 21열 중 6열이 어긋나 있었다(마지막 열 7일 차). */
{
  const st=BASE();
  st.health.labDates=['2026-03-12','2026-09-03'];
  st.health.labTypes=['외래','외래'];
  st.health.labMeds=[{am:[],pm:[]},{am:[],pm:[]}];
  st.health.labValues={'AST(SGOT)':[21,21],'HbA1c':[6.0,6.2]};
  st.health.weights=[{date:'2026-03-12',kg:68.2},{date:'2026-08-27',kg:67.5}];
  const {b,p,errs}=await boot(st);

  const w=await p.evaluate(()=>({
    exact:labWeightAt('2026-03-12'),
    near:labWeightAt('2026-09-03'),          /* 08-27 과 7일 차 → 붙는다 */
    far:labWeightAt('2026-12-01')            /* 창 밖 → null */
  }));
  ok('J1 정확 일치는 off 0',w.exact&&w.exact.kg===68.2&&w.exact.off===0,JSON.stringify(w.exact));
  ok('J2 🔒 7일 차는 근사로 붙는다',w.near&&w.near.kg===67.5&&w.near.off===7,JSON.stringify(w.near));
  ok('J3 🔒 창(7일) 밖은 안 붙인다 — 몇 달 전 체중을 그날 값처럼 보이면 안 된다',w.far===null,JSON.stringify(w.far));

  const ui=await p.evaluate(()=>{
    const tds=[].slice.call(document.querySelectorAll('#v-labs tbody tr')).find(
      tr=>tr.querySelector('.cM')&&tr.querySelector('.cM').textContent.indexOf('체중')===0);
    return {has:!!tr0(tds), html:tds?tds.innerHTML:''};
    function tr0(x){return x;}
  });
  ok('J4 체중 행이 있다',ui.has===true);
  ok('J5 🔒 체중 셀에 클릭이 붙는다',ui.html.indexOf('labWeightCell')>=0);
  ok('J6 근사면 며칠 차인지 보인다',ui.html.indexOf('7일 차')>=0,ui.html.slice(0,200));

  /* 입력 */
  const put=await p.evaluate(()=>{
    labWeightCell('2026-09-03');
    document.getElementById('lw_kg').value='66.8';
    saveLabWeight('2026-09-03');
    return {n:DB.health.weights.length, m:labWeightAt('2026-09-03')};
  });
  ok('J7 그 날짜로 체중이 새로 들어간다',put.n===3,put.n);
  ok('J8 정확 일치가 근사를 이긴다',put.m.kg===66.8&&put.m.off===0,JSON.stringify(put.m));

  /* 비우면 그 날짜만 지운다 */
  const del=await p.evaluate(()=>{
    labWeightCell('2026-09-03');
    document.getElementById('lw_kg').value='';
    saveLabWeight('2026-09-03');
    return {n:DB.health.weights.length,
            keep:DB.health.weights.some(x=>x.date==='2026-03-12'),
            back:labWeightAt('2026-09-03')};
  });
  ok('J9 비우면 그 날짜만 지운다',del.n===2&&del.keep===true,`${del.n}/${del.keep}`);
  ok('J10 지우면 다시 근사로 떨어진다',del.back&&del.back.off===7,JSON.stringify(del.back));
  ok('J11 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── K. 검사일 ≠ 진료일 ──
   로한: "맨위 탭 날짜는 진료 날짜라 완전히 매칭되지 않는다" */
{
  const {b,p,errs}=await boot(BASE());
  const v=await p.evaluate(()=>{
    labDate(1);
    document.getElementById('ld_date').value='2026-08-27';   /* 채혈일 */
    document.getElementById('ld_visit').value='2026-09-03';  /* 진료일 */
    saveLabDate(1);
    const i=DB.health.labDates.indexOf('2026-08-27');
    return {dates:DB.health.labDates.slice(), visits:DB.health.labVisits.slice(), i,
            h:document.getElementById('v-labs').innerHTML};
  });
  ok('K1 검사일이 바뀐다',v.dates.indexOf('2026-08-27')>=0,v.dates.join(','));
  ok('K2 진료일이 따로 저장된다',v.visits[v.i]==='2026-09-03',JSON.stringify(v.visits));
  ok('K3 헤더에 진료일이 같이 뜬다',v.h.indexOf('진료 09.03')>=0);

  /* 같으면 저장하지 않는다 — 빈 서랍 금지 */
  const same=await p.evaluate(()=>{
    const i=DB.health.labDates.indexOf('2026-08-27');
    labDate(i);
    document.getElementById('ld_visit').value='2026-08-27';
    saveLabDate(i);
    return DB.health.labVisits[DB.health.labDates.indexOf('2026-08-27')];
  });
  ok('K4 🔒 진료일이 검사일과 같으면 저장하지 않는다',same==='',JSON.stringify(same));

  /* 🔒 정렬해도 진료일이 따라간다 — 안 따라가면 남의 진료일이 붙는다 */
  const sorted=await p.evaluate(()=>{
    const H=DB.health;
    const i=H.labDates.indexOf('2026-08-27');
    H.labVisits[i]='2026-09-03';
    H.labDates.push('2020-01-01');H.labTypes.push('외래');H.labMeds.push({am:[],pm:[]});
    H.labVisits.push('');
    Object.keys(H.labValues).forEach(k=>H.labValues[k].push(null));
    labResort();
    const j=H.labDates.indexOf('2026-08-27');
    return {pair:H.labVisits[j], first:H.labDates[0], n:H.labVisits.length};
  });
  ok('K5 정렬 후에도 진료일이 짝을 지킨다',sorted.pair==='2026-09-03',sorted.pair);
  ok('K6 정렬이 실제로 일어났다',sorted.first==='2020-01-01',sorted.first);
  ok('K7 길이 정합',await lenOK(p));
  ok('K8 형식 틀린 검사일 거부',await p.evaluate(()=>{
    const n=DB.health.labDates.length;
    labDate(0);document.getElementById('ld_date').value='2026';saveLabDate(0);
    closeModal();
    return DB.health.labDates.length===n&&DB.health.labDates.indexOf('2026')<0;}));
  ok('K9 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

console.log('t33 피검사 지표 |',pass,'통과 /',fail,'실패');
if(bad.length)console.log('  ✗ '+bad.join('\n  ✗ '));
process.exit(fail?1:0);
})();
