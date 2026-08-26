/* t32 — 🧾 세무 v2.0
   로한: "CRUD 할 수 있게 해야 하지만 **기본 원칙은 가계부 기반**인 걸 잊으면 안 된다."
   → 이 테스트의 본체는 그 원칙이다.
      · 진행 연도 숫자는 전부 가계부에서 파생된다 (저장되지 않는다)
      · 거래를 고치면 세무 화면이 따라 움직인다
      · 저장하는 것은 가계부에 없는 것뿐 — 과거 신고 원장·매핑 규칙
   ⚠️ 규칙대로 '빈 상태'부터 먹인다. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const Y=new Date().getFullYear();          /* 🔒 날짜를 박지 않는다 — 0820·0821·0825·0826에 네 번 터졌다 */

const T=(o)=>Object.assign({id:'x'+Math.random().toString(36).slice(2,9)},o);
const BASE=()=>({schemaVersion:7,ui:{month:Y+'-08'},
 goals:[],routines:[],checks:{},rewards:[],rewardCards:{},journal:[],items:[],logs:[],
 fixed:[],events:[],posts:[],budgets:{},debts:[],accounts:[{id:'a1',name:'우리',type:'bank'}],cards:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 categories:[
   {id:'c1',name:'채움영어',type:'income',incType:'기타소득'},
   {id:'c2',name:'스마트스토어',type:'income',incType:'사업소득'},
   {id:'c3',name:'기타',type:'income'},
   {id:'c4',name:'Claude',type:'expense',deductible:true,taxAccount:'지급수수료'},
   {id:'c5',name:'국민연금',type:'expense'},
   {id:'c6',name:'비즈니스',type:'expense'}],
 transactions:[
   /* 강사 — 3.3% 떼고 들어온 실입금 (270만 세전) */
   T({type:'income',date:Y+'-02-04',cat:'채움영어',amt:2610900,scope:'business',
      wht:{t:81000,l:8100}}),
   T({type:'income',date:Y+'-03-05',cat:'채움영어',amt:2610900,scope:'business',
      wht:{t:81000,l:8100}}),
   /* 원천징수 안 뗀 소액 */
   T({type:'income',date:Y+'-04-07',cat:'채움영어',amt:120000,scope:'business'}),
   /* 스토어 */
   T({type:'income',date:Y+'-01-05',cat:'스마트스토어',amt:500000,scope:'business'}),
   /* 미분류 — 사업장에 연결 안 된 계정과목 */
   T({type:'income',date:Y+'-03-06',cat:'기타',amt:152500,scope:'business'}),
   /* 대납·정산: 나간 것 3 · 받은 것 2 */
   T({type:'expense',date:Y+'-06-01',cat:'비즈니스',amt:28000,scope:'business',tk:'pass'}),
   T({type:'expense',date:Y+'-06-15',cat:'비즈니스',amt:28000,scope:'business',tk:'pass'}),
   T({type:'expense',date:Y+'-06-29',cat:'비즈니스',amt:28000,scope:'business',tk:'pass'}),
   T({type:'income',date:Y+'-07-01',cat:'기타',amt:56000,scope:'business',tk:'pass'}),
   /* 개인 — 실비보험. 사업으로 새면 안 된다 */
   T({type:'income',date:Y+'-08-11',cat:'기타',amt:69600,scope:'personal'}),
   /* 세금환급 — 소득이 아니다 */
   T({type:'income',date:Y+'-06-10',cat:'기타',amt:190310,scope:'business',tk:'refund'}),
   /* 사업 경비 */
   T({type:'expense',date:Y+'-01-24',cat:'Claude',amt:30000,scope:'business'}),
   T({type:'expense',date:Y+'-02-24',cat:'Claude',amt:30000,scope:'business'}),
   /* 소득공제 — 🔒 경비가 아니다 */
   T({type:'expense',date:Y+'-01-27',cat:'국민연금',amt:140220,scope:'business'})
 ]});

async function boot(st){
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:st});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1300);
  await p.click('.m[data-v="tax"]');await p.waitForTimeout(400);
  return {b,p,errs};
}

(async()=>{
{
  const {b,p,errs}=await boot(BASE());

  /* ── A. 시드 ── */
  const a=await p.evaluate(()=>({
    biz:DB.tax.biz.bizNo, units:DB.tax.units.map(u=>u.code).sort().join(','),
    filings:DB.tax.filings.length, seeded:DB.meta.taxSeeded,
    vat24:vatTypeAt('2024-06-30'), vat25:vatTypeAt('2025-06-30'),
    map:JSON.stringify(DB.tax.catMap)
  }));
  ok('A1 사업자 시드',a.biz==='273-06-02398',a.biz);
  ok('A2 사업장 722000·940903',a.units==='722000,940903',a.units);
  /* 2024 종소세·부가세(간이) / 2025 종소세·부가세 / 2026 부가세 1기 */
  ok('A3 신고 원장 5건',a.filings===5,a.filings);
  ok('A4 과세유형은 이력 — 2024 간이 / 2025 일반',a.vat24==='간이'&&a.vat25==='일반',`${a.vat24}/${a.vat25}`);
  ok('A5 계정과목 매핑 시드',a.map.indexOf('u_lect')>0&&a.map.indexOf('u_holy')>0,a.map);
  ok('A6 JS 에러 0',errs.length===0,errs[0]);

  /* 🔒 940903 은 사업소득이다 — 2024 기납부세액명세서 ⑦ 칸으로 확정 */
  const it=await p.evaluate(()=>DB.categories.filter(c=>c.name==='채움영어')[0].incType);
  ok('A7 채움영어 소득구분이 사업소득으로 교정',it==='사업소득',it);

  /* ── B. 🔒 핵심: 진행 연도는 전부 가계부에서 파생된다 ── */
  const inc=await p.evaluate(y=>{
    const r=taxIncomeByUnit(y);
    return {lect:r.units.u_lect, holy:r.units.u_holy, unmapped:r.unmapped.gross, un:r.unmapped.n};
  },Y);
  /* 2,610,900 + 81,000 + 8,100 = 2,700,000 (세전) × 2 + 120,000 = 5,520,000 */
  ok('B1 강사 세전 5,520,000',inc.lect.gross===5520000,inc.lect.gross);
  ok('B2 실입금은 5,341,800',inc.lect.net===5341800,inc.lect.net);
  ok('B3 원천징수 소득세 162,000',inc.lect.wht===162000,inc.lect.wht);
  ok('B4 원천징수 2건 / 미징수 1건',inc.lect.nWht===2&&inc.lect.n===3,`${inc.lect.nWht}/${inc.lect.n}`);
  ok('B5 스토어 500,000',inc.holy.gross===500000,inc.holy.gross);
  /* 🔒 미분류에는 '기타 152,500' 만. 대납·개인·환급은 애초에 안 들어온다 */
  ok('B6 미분류 152,500 · 1건',inc.unmapped===152500&&inc.un===1,`${inc.unmapped}/${inc.un}`);

  const kinds=await p.evaluate(()=>({
    pass:txTaxKind(DB.transactions.filter(t=>t.tk==='pass')[0]),
    fallbackBiz:txTaxKind({scope:'business'}),
    fallbackPriv:txTaxKind({scope:'personal'})
  }));
  ok('B7 tk 없으면 scope 로 폴백',kinds.fallbackBiz==='biz'&&kinds.fallbackPriv==='priv');
  ok('B8 대납은 tk 로 구분',kinds.pass==='pass');

  /* 🔒 세전은 파생이다 — 저장하지 않는다 */
  const noStore=await p.evaluate(()=>{
    const t=DB.transactions.filter(x=>x.wht)[0];
    return {gross:txGross(t), hasGrossField:t.gross===undefined, amt:t.amt};
  });
  ok('B9 세전 2,700,000 파생',noStore.gross===2700000,noStore.gross);
  ok('B10 🔒 세전을 거래에 저장하지 않는다',noStore.hasGrossField===true);
  ok('B11 🔒 amt 는 통장 값 그대로',noStore.amt===2610900,noStore.amt);

  /* ── C. 대납·정산 짝 맞춤 ── */
  const pt=await p.evaluate(y=>taxPassthru(y),Y);
  ok('C1 나간 것 84,000 (3건)',pt.out===84000&&pt.nOut===3,`${pt.out}/${pt.nOut}`);
  ok('C2 받은 것 56,000 (1건)',pt.inn===56000&&pt.nIn===1,`${pt.inn}/${pt.nIn}`);
  ok('C3 미회수 28,000',pt.open===28000,pt.open);

  /* ── D. 경비 / 소득공제 분리 ── */
  const ex=await p.evaluate(y=>({e:taxExpenseByAccount(y), d:taxDeductFromTxns(y)}),Y);
  ok('D1 경비는 지급수수료 60,000',ex.e.total===60000&&ex.e.by['지급수수료']===60000,JSON.stringify(ex.e.by));
  ok('D2 🔒 국민연금은 경비가 아니다',ex.e.by['국민연금']===undefined);
  ok('D3 국민연금은 소득공제로 잡힌다',ex.d['연금보험료']===140220,JSON.stringify(ex.d));
  /* 🔒 대납 지출(84,000)이 경비로 새면 안 된다 */
  ok('D4 대납 지출이 경비에 안 섞인다',ex.e.total===60000,ex.e.total);

  /* ── E. 화면 ── */
  const ui=await p.evaluate(()=>({h:document.getElementById('v-tax').innerHTML}));
  ok('E1 진행 연도 화면이 그려진다',ui.h.length>1500,ui.h.length);
  ok('E2 미분류 경고가 뜬다',ui.h.indexOf('미분류')>=0);
  ok('E3 대납 블록이 뜬다',ui.h.indexOf('대납·정산')>=0);
  ok('E4 드릴다운 링크가 붙어 있다',(ui.h.match(/data-taxdrill/g)||[]).length>=3,
     (ui.h.match(/data-taxdrill/g)||[]).length);
  ok('E5 🔒 "가계부에서 파생" 원칙이 화면에 적혀 있다',ui.h.indexOf('가계부에서 파생')>=0);
  ok('E6 부가세 자동계산 안 한다고 밝힌다',ui.h.indexOf('자동 계산하지 않는다')>=0);

  /* 드릴다운 → 근거 거래 */
  const dr=await p.evaluate(y=>{
    taxDrill(y,'unit','u_lect');
    const h=document.getElementById('modal').innerHTML;
    const n=(h.match(/data-taxjump/g)||[]).length;
    closeModal(); return {n,h};
  },Y);
  ok('E7 드릴다운에 근거 거래 3건',dr.n===3,dr.n);
  ok('E8 세전 환산이 같이 보인다',dr.h.indexOf('세전')>=0);

  /* ── F. 🔒 거래를 고치면 세무가 따라 움직인다 (가계부 기반의 증명) ── */
  const move=await p.evaluate(y=>{
    const before=taxIncomeByUnit(y).units.u_lect.gross;
    const t=DB.transactions.filter(x=>x.cat==='채움영어'&&x.wht)[0];
    t.amt=2901000; t.wht={t:90000,l:9000};        /* 300만 세전으로 교체 */
    const after=taxIncomeByUnit(y).units.u_lect.gross;
    return {before,after};
  },Y);
  ok('F1 거래를 고치니 세무 집계가 따라온다',move.after-move.before===300000,
     `${move.before} → ${move.after}`);

  /* 카테고리 매핑을 끊으면 미분류로 내려간다 */
  const unmap=await p.evaluate(y=>{
    setTaxCatMap('채움영어','');
    const r=taxIncomeByUnit(y);
    const res={lect:r.units.u_lect, un:r.unmapped.n};
    setTaxCatMap('채움영어','u_lect');
    return res;
  },Y);
  ok('F2 매핑을 끊으면 미분류로 간다',unmap.lect===undefined&&unmap.un===4,`${unmap.un}`);

  /* ── G. 기한은 파생이다 ── */
  const du=await p.evaluate(y=>({
    y2024:taxDues(2024).map(x=>x.kind+' '+x.period+' '+x.due),
    y2026:taxDues(2026).map(x=>x.kind+' '+x.period+' '+x.due)
  }),Y);
  /* 2024 = 간이 → 부가세 연 1회 (다음해 1/25) */
  ok('G1 2024 간이는 부가세 연1회',du.y2024.join('|')==='종소세 귀속 2025-05-31|부가세 연 2025-01-25',du.y2024.join('|'));
  /* 2026 = 일반 → 1기·2기 */
  ok('G2 2026 일반은 1기·2기',du.y2026.join('|')==='종소세 귀속 2027-05-31|부가세 1기 2026-07-25|부가세 2기 2027-01-25',du.y2026.join('|'));

  /* ── H. 세율표는 DB 에 있다 ── */
  const rt=await p.evaluate(()=>({
    a:taxCalcIncome(16109545),          /* 2024 실측: 1,156,431 */
    b:taxCalcIncome(10000000),
    c:taxCalcIncome(100000000),
    n:DB.tax.rates.income.length
  }));
  /* 🔒 원 단위 절사. 반올림하면 1,156,432 가 되어 신고서와 1원 어긋난다. */
  ok('H1 2024 과표 16,109,545 → 산출 1,156,431 (절사)',rt.a===1156431,rt.a);
  ok('H2 1,000만 → 600,000',rt.b===600000,rt.b);
  ok('H3 8,800만 초과 구간이 있다 (v1.9 는 24%까지뿐)',rt.c===19560000,rt.c);
  ok('H4 세율표 8구간',rt.n===8,rt.n);

  ok('Z1 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── I. 아카이브 — 2024 신고서 재현 + 원천징수 대조 ── */
{
  const {b,p,errs}=await boot(BASE());
  await p.evaluate(()=>setTaxView(2024));await p.waitForTimeout(350);
  const h=await p.evaluate(()=>document.getElementById('v-tax').innerHTML);
  ok('I1 2024 사업장 2줄',h.indexOf('722000')>=0&&h.indexOf('940903')>=0);
  ok('I2 단순경비율 74.90% 역산 표기',h.indexOf('74.90%')>=0);
  ok('I3 단순경비율 61.70% 역산 표기',h.indexOf('61.70%')>=0);
  ok('I4 🔴 기납부세액 이중기입을 잡아낸다',h.indexOf('이중기입')>=0);
  ok('I5 경정 블록',h.indexOf('경정')>=0&&h.indexOf('1,533,582')>=0);
  ok('I6 2024 부가세(간이) 카드',h.indexOf('558,556')>=0&&h.indexOf('32,875,313')>=0);

  const f=await p.evaluate(()=>{
    const x=DB.tax.filings.filter(y=>y.id==='tf2024i')[0];
    return {tot:x.f.totalIncome,base:x.f.base,calc:x.f.calc,pre:x.f.prepaid,
            wht:x.wht.tax, ratio:x.f.prepaid/x.wht.tax,
            sum:x.units.reduce((a,u)=>a+u.income,0)};
  });
  ok('I7 사업장 소득금액 합 = 종합소득금액',f.sum===f.tot&&f.tot===18009545,`${f.sum}/${f.tot}`);
  ok('I8 산출세액이 세율표와 맞는다',f.calc===1156431,f.calc);
  ok('I9 기납부 1,511,770 = 영수증 755,885 의 정확히 2배',f.ratio===2,f.ratio);

  await p.evaluate(()=>setTaxView(2025));await p.waitForTimeout(350);
  const h25=await p.evaluate(()=>document.getElementById('v-tax').innerHTML);
  ok('I10 2025 환급 −190,310',h25.indexOf('190,310')>=0);
  ok('I11 ⚠️ 사업소득명세서 미확보를 밝힌다',h25.indexOf('사업소득명세서 미확보')>=0);
  ok('I12 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── J. CRUD — 로한이 직접 고칠 수 있어야 한다 ── */
{
  const {b,p,errs}=await boot(BASE());
  const add=await p.evaluate(()=>{
    taxFilingModal(null,'2023|종소세|귀속');
    document.getElementById('tf_year').value='2023';
    document.getElementById('tf_totalIncome').value='5,000,000';
    document.getElementById('tf_prepaid').value='100000';
    document.getElementById('tf_filed').value='2024-05-20';
    saveTaxFiling(null,'종소세');
    const f=DB.tax.filings.filter(x=>x.year===2023)[0];
    return {n:DB.tax.filings.length, tot:f.f.totalIncome, pre:f.f.prepaid, filed:f.filedDate};
  });
  ok('J1 신고 원장 추가',add.n===6,add.n);
  ok('J2 쉼표 있는 숫자도 읽는다',add.tot===5000000,add.tot);
  ok('J3 신고일 저장',add.filed==='2024-05-20',add.filed);
  const yr=await p.evaluate(()=>taxYears().join(','));
  ok('J4 연도 탭이 자동으로 늘어난다',yr.indexOf('2023')>=0,yr);

  const del=await p.evaluate(()=>{
    const f=DB.tax.filings.filter(x=>x.year===2023)[0];
    delTaxFiling(f.id);
    return DB.tax.filings.length;
  });
  ok('J5 신고 원장 삭제',del===5,del);

  /* 사업장 추가·삭제 + 🔒 유령 매핑 정리 */
  const u=await p.evaluate(()=>{
    taxUnitModal(null);
    document.getElementById('tu_label').value='새사업';
    document.getElementById('tu_code').value='999999';
    saveTaxUnit(null);
    const nu=DB.tax.units.filter(x=>x.code==='999999')[0];
    setTaxCatMap('기타',nu.id);
    const mapped=DB.tax.catMap['기타']===nu.id;
    delTaxUnit(nu.id);
    return {n:DB.tax.units.length, mapped, ghost:DB.tax.catMap['기타']!==undefined};
  });
  ok('J6 사업장 추가·삭제',u.n===2,u.n);
  ok('J7 매핑이 걸렸다가',u.mapped===true);
  ok('J8 🔒 사업장을 지우면 유령 매핑도 지운다',u.ghost===false);

  ok('J9 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── K. 원천징수 역산 — ⚠️ 추정임이 드러나야 한다 ── */
{
  const {b,p,errs}=await boot(BASE());
  const e=await p.evaluate(()=>({
    a:whtEstimate(2610900),      /* 270만 세전 */
    b:whtEstimate(2901000)       /* 300만 세전 */
  }));
  ok('K1 2,610,900 → 세전 2,700,000',e.a.gross===2700000,e.a.gross);
  ok('K2 소득세 81,000 · 지방 8,100',e.a.t===81000&&e.a.l===8100,`${e.a.t}/${e.a.l}`);
  ok('K3 2,901,000 → 세전 3,000,000',e.b.gross===3000000,e.b.gross);
  ok('K4 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── L. 시드 멱등 — 로한이 고친 원장을 되살리지 않는다 ── */
{
  const st=BASE();
  st.meta={taxSeeded:1,incTypeFix:1};
  st.tax={units:[],filings:[],catMap:{},vatHistory:[],biz:{},rates:{}};
  const {b,p,errs}=await boot(st);
  const r=await p.evaluate(()=>({f:DB.tax.filings.length,u:DB.tax.units.length}));
  ok('L1 시드 재삽입 없음',r.f===0&&r.u===0,`${r.f}/${r.u}`);
  ok('L2 빈 세무여도 화면은 뜬다',
     await p.evaluate(()=>document.getElementById('v-tax').innerHTML.length>300));
  ok('L3 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── M. 🔒 신고유형은 '직전연도 수입금액'으로 정해진다 — '올해 소득'이 아니다 ──
   ⚠️ 로한: "올해 소득이 5,800만을 안 넘으니 단순경비율 아니냐"
      결론은 맞을 수 있어도 **기준이 틀렸다.** 2024 사고가 정확히 이 판정 착오였다.
      → 앱은 추측하지 않는다. 로한이 넣기 전엔 '미확정'이다. */
{
  const {b,p,errs}=await boot(BASE());
  const m=await p.evaluate(y=>({
    y2024:taxMethod(2024), y2025:taxMethod(2025), cur:taxMethod(y)
  }),Y);
  ok('M1 2024 = 단순경비율 (신고서)',m.y2024==='단순경비율',m.y2024);
  ok('M2 2025 = 기준경비율 (신고서)',m.y2025==='기준경비율',m.y2025);
  ok('M3 🔒 진행 연도는 미확정 — 추측하지 않는다',m.cur===null,m.cur);

  const h0=await p.evaluate(()=>document.getElementById('v-tax').innerHTML);
  ok('M4 미확정이라고 화면에 뜬다',h0.indexOf('신고유형 미확정')>=0);
  ok('M5 🔒 판정 기준이 직전연도임을 밝힌다',h0.indexOf('직전연도')>=0&&h0.indexOf('올해 소득이 아니다')>=0);
  ok('M6 2024 사고를 근거로 경고한다',h0.indexOf('2024년 사고가 정확히 이 판정 착오')>=0);
  ok('M7 모르면 비워 두라고 말한다',h0.indexOf('추측으로 정하면 2024년이 반복된다')>=0);

  /* 고르면 계산 방식이 바뀐다 */
  const sim=await p.evaluate(y=>{setTaxMethod(y,'단순경비율');
    return document.getElementById('v-tax').innerHTML;},Y);
  ok('M8 단순경비율 → 경비율로 계산',sim.indexOf('61.70%')>=0||sim.indexOf('74.90%')>=0);
  ok('M9 경비율이 매년 고시된다고 경고',sim.indexOf('매년 고시된다')>=0);

  const std=await p.evaluate(y=>{setTaxMethod(y,'기준경비율');
    return document.getElementById('v-tax').innerHTML;},Y);
  ok('M10 기준경비율 → 주요경비+기준경비율 설명',std.indexOf('주요경비')>=0);
  ok('M11 🔒 기준경비율 값이 없다고 밝힌다 (추측 금지)',std.indexOf('기준경비율 값이 없다')>=0);
  ok('M12 증빙이 세금을 줄인다고 알린다',std.indexOf('증빙이 실제로 세금을 줄인다')>=0);

  const bk=await p.evaluate(y=>{setTaxMethod(y,'간편장부');
    return document.getElementById('v-tax').innerHTML;},Y);
  ok('M13 장부 → 실제 경비로 소득금액 계산',bk.indexOf('실제 경비 전부')>=0);

  /* 판정 근거(직전연도 수입금액)를 보여준다 */
  const pr=await p.evaluate(()=>({
    y2025:taxPrevRevenue(2025),      /* 2024 신고서: 33,302,692 + 25,197,306 */
    y2026:taxPrevRevenue(2026)       /* 2025 신고서엔 units 가 없다 → 가계부 폴백 */
  }));
  /* ⚠️ 33,302,692 + 25,197,306 = 58,499,998. 핸드오프의 "58.5M" 은 반올림이었다.
     🔒 대략치를 정확한 값으로 착각하지 마라 — 세금은 2원도 틀린 것이다. */
  ok('M14 직전연도 수입금액을 신고서에서 읽는다',
     pr.y2025&&pr.y2025.amt===58499998&&pr.y2025.src==='신고서',JSON.stringify(pr.y2025));
  ok('M15 신고서에 없으면 가계부로 폴백',!pr.y2026||pr.y2026.src==='가계부',JSON.stringify(pr.y2026));

  await p.evaluate(y=>setTaxMethod(y,''),Y);
  ok('M16 다시 비울 수 있다',await p.evaluate(y=>taxMethod(y)===null,Y));
  ok('M17 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

/* ── N. 부가세 원장 — 증명 원본 3건 ── */
{
  const {b,p,errs}=await boot(BASE());
  const v=await p.evaluate(()=>DB.tax.filings.filter(f=>f.kind==='부가세')
    .map(f=>f.year+'|'+f.period+'|'+f.vat.sales+'|'+f.vat.due).sort().join(' ; '));
  ok('N1 부가세 3건 (2024 간이 · 2025 · 2026 1기)',
     v==='2024|연|32875313|558556 ; 2025|2기(9~12월)|11756000|533895 ; 2026|1기|1621727|1912',v);

  await p.evaluate(()=>setTaxView(2025));await p.waitForTimeout(350);
  const h=await p.evaluate(()=>document.getElementById('v-tax').innerHTML);
  ok('N2 2025 부가세 카드',h.indexOf('11,756,000')>=0&&h.indexOf('533,895')>=0);
  ok('N3 ⚠️ 2025-01~08 공백을 숨기지 않는다',h.indexOf('비어 있다')>=0);
  ok('N4 추측하지 않는다고 명시',h.indexOf('추측하지 않는다')>=0);
  ok('N5 JS 에러 0',errs.length===0,errs[0]);
  await b.close();
}

console.log('t32 세무 |',pass,'통과 /',fail,'실패');
if(bad.length)console.log('  ✗ '+bad.join('\n  ✗ '));
process.exit(fail?1:0);
})();
