/* t29 — 🛡️ 보험 (v1.7)
   규칙: 빈 상태부터 먹인다. 시드는 멱등해야 하고, 계약을 지우면 보장이 따라 죽어야 한다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};

const BASE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],ui:{month:'2026-08'},
 accounts:[],transactions:[],categories:[],cards:[],debts:[],fixed:[],events:[],posts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 journal:[],items:[],logs:[],budgets:{}};

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext();
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1200);
  return {b,p,errs};
}

(async()=>{
/* ── A. 빈 상태에서 부팅 → 시드가 심긴다 ── */
{
  const {b,p,errs}=await boot(JSON.parse(JSON.stringify(BASE)));
  await p.click('.m[data-v="insu"]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({
    pol:DB.insurance.policies.length, cov:DB.insurance.covers.length,
    self:DB.insurance.policies.filter(x=>x.person==='self').length,
    dad:DB.insurance.policies.filter(x=>x.person==='father').length,
    mom:DB.insurance.policies.filter(x=>x.person==='mother').length,
    seeded:DB.meta.insSeeded, html:document.getElementById('v-insu').innerHTML.length,
    orphan:DB.insurance.covers.filter(c=>!DB.insurance.policies.some(p=>p.id===c.pid)).length
  }));
  ok('A1 계약 9건 시드',r.pol===9,r.pol);
  ok('A2 보장 171항목 시드',r.cov===171,r.cov);
  ok('A3 로한 3 / 아버지 3 / 어머니 3',r.self===3&&r.dad===3&&r.mom===3,`${r.self}/${r.dad}/${r.mom}`);
  ok('A4 insSeeded 플래그',r.seeded===2,r.seeded);
  ok('A5 화면이 그려진다',r.html>2000,r.html);
  ok('A6 고아 보장 0',r.orphan===0,r.orphan);
  ok('A7 JS 에러 0',errs.length===0,errs[0]);

  /* 보험료 — 로한 교보 115,700 + 흥국 67,143 = 182,843 (우체국 미상 0) */
  const m=await p.evaluate(()=>insMonthly('self'));
  ok('A8 로한 월 보험료 182,843',m===182843,m);
  /* 특약 보험료 합계가 주계약+특약 총액과 맞는가 (교보 115,700) */
  /* ⚠️ 원문 요약본이 스스로 안 맞는다: 특약 7개 합 45,200 인데 총액은 115,700(=72,500+43,200).
     맞춰서 고치지 않는다. 대신 '불일치'로 드러나야 한다. */
  const kb=await p.evaluate(()=>{const x=insPol('p_self_kyobo');let s=0;x.riders.forEach(r=>{if(r.prem!=null)s+=r.prem;});return {s,prem:x.premium,gap:insPremGap(x)};});
  ok('A9 교보 특약 합계 117,700 · 계약서 115,700',kb.s===117700&&kb.prem===115700,`${kb.s} vs ${kb.prem}`);
  ok('A9b 불일치 +2,000 을 파생으로 잡는다',kb.gap===2000,kb.gap);
  const gapUi=await p.evaluate(()=>document.getElementById('v-insu').innerHTML.indexOf('보험료 불일치')>=0);
  ok('A9c 불일치 경고가 화면에 뜬다',gapUi===true,gapUi);
  const hk=await p.evaluate(()=>insPremGap(insPol('p_self_heungkuk')));
  ok('A9d 흥국은 특약 보험료 미상 → 불일치 0',hk===0,hk);

  /* 시나리오 집계 */
  const rk=await p.evaluate(()=>{
    const g=k=>INS_RISK.filter(r=>r.k===k)[0];
    return {
      silsonSelf:insRisk('self',g('실손')).amt,
      silsonDad:insRisk('father',g('실손')).amt,
      silsonMom:insRisk('mother',g('실손')).amt,
      cancerSelf:insRisk('self',g('암 진단')).amt,
      cancerDad:insRisk('father',g('암 진단')).amt,
      cancerMom:insRisk('mother',g('암 진단')).amt,
      heartSelf:insRisk('self',g('심장')).amt,
      brainSelf:insRisk('뇌'?'self':'self',g('뇌')).amt
    };
  });
  ok('B1 로한 실손 5,000만(max)',rk.silsonSelf===50000000,rk.silsonSelf);
  /* 🔒 아버지는 흥국화재·삼성화재 두 곳에 실손이 있다. 비례보상이라 1억이 아니라 5,000만이어야 한다. */
  ok('B2 아버지 실손 5,000만 — 두 계약이어도 합산 안 함',rk.silsonDad===50000000,rk.silsonDad);
  ok('B3 어머니 실손 없음(0)',rk.silsonMom===0,rk.silsonMom);
  ok('B4 로한 암진단 1,000만',rk.cancerSelf===10000000,rk.cancerSelf);
  ok('B5 아버지 암진단 2,000만',rk.cancerDad===20000000,rk.cancerDad);
  /* 어머니: 우체국 2,000만 + 흥국생명 2,000만. 삼성 간편보험엔 암진단비가 없다. */
  ok('B5b 어머니 암진단 4,000만(2계약 합)',rk.cancerMom===40000000,rk.cancerMom);
  ok('B5c 로한 암진단이 가족 중 가장 얇다',rk.cancerSelf<rk.cancerDad&&rk.cancerSelf<rk.cancerMom,
     `${rk.cancerSelf}/${rk.cancerDad}/${rk.cancerMom}`);
  ok('B6 로한 심장 0 — 미보유',rk.heartSelf===0,rk.heartSelf);
  ok('B7 로한 뇌 1,000만(max)',rk.brainSelf===10000000,rk.brainSelf);

  /* 공백 문구가 화면에 뜨는가 */
  const gap=await p.evaluate(()=>document.getElementById('v-insu').innerHTML.indexOf('보장 공백')>=0);
  ok('B8 로한 보장 공백 박스 노출',gap===true,gap);

  /* 🔒 실손은 중복가입해도 비례보상이다 — 매트릭스 합계에서 더하면 거짓말이 된다.
     아버지는 흥국화재·삼성화재 두 곳에 실손이 있다. 5,000만+5,000만=1억 이 아니라 5,000만이어야 한다. */
  const agg=await p.evaluate(()=>({
    silson:insAgg('실손질병입원의료비'), cancer:insAgg('암 진단비'),
    dadCells:DB.insurance.covers.filter(c=>c.name==='실손질병입원의료비'&&['p_dad_hk','p_dad_ss'].indexOf(c.pid)>=0).map(c=>c.amt)
  }));
  ok('B9 실손은 max 집계',agg.silson==='max',agg.silson);
  ok('B9b 진단비는 sum 집계',agg.cancer==='sum',agg.cancer);
  ok('B9c 아버지 실손이 두 계약에 겹쳐 있다',agg.dadCells.length===2,agg.dadCells.join('/'));
  const famRows=await p.evaluate(()=>document.getElementById('v-insu').querySelector('.instbl tbody').querySelectorAll('tr').length);
  ok('B10 요약표에 세 사람이 다 나온다',famRows===3,famRows);
  const noOff=await p.evaluate(()=>document.getElementById('v-insu').innerHTML.indexOf('wtab off')<0);
  ok('B11 꺼진 탭 개념이 남아 있지 않다',noOff===true);
  const noOn=await p.evaluate(()=>DB.insurance.on===undefined);
  ok('B12 DB.insurance.on 잔재 제거',noOn===true);

  /* ── C. 탭 전환 ── */
  await p.evaluate(()=>setInsPerson('father'));await p.waitForTimeout(250);
  const c2=await p.evaluate(()=>({ui:DB.ui.insPerson,n:insPols('father').length,
    cov:insCovs('p_dad_hk').length,h:document.getElementById('v-insu').innerHTML}));
  ok('C1 아버지 탭 저장',c2.ui==='father');
  ok('C2 아버지 계약 3건',c2.n===3,c2.n);
  ok('C3 흥국화재 보장 27항목',c2.cov===27,c2.cov);
  ok('C4 아버지엔 교보다이렉트',c2.h.indexOf('교보다이렉트건강보험')>=0);
  ok('C5 계약 카드 3장 노출',(c2.h.match(/data-edinspol=/g)||[]).length===3,(c2.h.match(/data-edinspol=/g)||[]).length);
  await p.evaluate(()=>setInsPerson('mother'));await p.waitForTimeout(250);
  const c6=await p.evaluate(()=>({n:insPols('mother').length,cov:insCovs('p_mom_post').length}));
  ok('C6 어머니 계약 3건',c6.n===3,c6.n);
  ok('C7 우체국보험 보장 38항목',c6.cov===38,c6.cov);
  await p.evaluate(()=>setInsPerson('father'));await p.waitForTimeout(200);

  /* ── D. 계약 삭제 → 보장 동반 삭제 ── */
  const del=await p.evaluate(()=>{
    const before=DB.insurance.covers.length, n=insCovs('p_dad_hk').length;
    delInsPol('p_dad_hk');
    return {before,n,after:DB.insurance.covers.length,pol:DB.insurance.policies.length,
            orphan:DB.insurance.covers.filter(c=>!DB.insurance.policies.some(p=>p.id===c.pid)).length};
  });
  ok('D1 계약 8건',del.pol===8,del.pol);
  ok('D2 보장이 함께 사라진다',del.after===del.before-del.n,`${del.before}-${del.n} vs ${del.after}`);
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
  ok('E3 어머니 월 보험료 30,000',add.mom===30000,add.mom);
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

/* ── H. insSeeded=1 세대(로한 것만 심긴 판) → 2로 올리며 아버지·어머니가 채워진다 ── */
{
  const st=JSON.parse(JSON.stringify(BASE));
  st.meta={insSeeded:1};
  st.insurance={policies:[{id:'p_self_kyobo',person:'self',insurer:'교보생명',product:'CI',premium:115700,status:'active',riders:[]}],
                covers:[{id:'c057',pid:'p_self_kyobo',cat:'진단',name:'허혈성 심장질환',amt:null,note:'미보유'}]};
  const {b,p,errs}=await boot(st);
  await p.click('.m[data-v="insu"]');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({
    pol:DB.insurance.policies.length,cov:DB.insurance.covers.length,seeded:DB.meta.insSeeded,
    dad:insPols('father').length,mom:insPols('mother').length,
    dupPol:DB.insurance.policies.filter(x=>x.id==='p_self_kyobo').length,
    dupCov:DB.insurance.covers.filter(c=>c.id==='c057').length,
    kept:insPol('p_self_kyobo').product
  }));
  ok('H1 seeded 2로 승격',r.seeded===2,r.seeded);
  ok('H2 아버지·어머니 채워짐',r.dad===3&&r.mom===3,`${r.dad}/${r.mom}`);
  ok('H3 계약 9건',r.pol===9,r.pol);
  ok('H4 보장 171항목',r.cov===171,r.cov);
  ok('H5 기존 계약 중복 안 됨',r.dupPol===1,r.dupPol);
  ok('H6 기존 보장 중복 안 됨',r.dupCov===1,r.dupCov);
  ok('H7 로한이 고친 값을 덮어쓰지 않는다',r.kept==='CI',r.kept);
  ok('H8 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

console.log('t29 보험 |',pass,'통과 /',fail,'실패');
if(bad.length)console.log('  ✗ '+bad.join('\n  ✗ '));
process.exit(fail?1:0);
})();
