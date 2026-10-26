/* t58 — 🧾 거래 추가 모달 v4.64
   로한: 「거래추가 누르면 무조건 빚갚기가 떠 · 교토비는 후불이 기본값 · 생활용품도 적요 ·
          즉시/후불·금액 한 줄 · 주거래통장이 기본값인데 카카오뱅크가 뜨고 있어 — 종합 사고를 좀 하라고」
   🔒 불변식:
      A 주거래는 mainAcct 하나가 답한다 — 지출 출금·이체 출발·수입 입금이 전부 같은 계좌.
        목록 첫 번째(세이프박스)를 집지 않는다. ⭐주거래(a.main)가 이름 추론을 이긴다.
      B 빚 갚기 칸은 빚 관련 계정과목(이자)일 때만. 빚에 묶인 거래를 고칠 땐 보인다.
      C 교통비 + 카드 = 후불 기본(신규만). 수정 중엔 끼어들지 않는다. 지갑은 언제나 즉시.
      D 음식이 아닌 지출은 같은 자리에 적요 칸 — 값은 memo 하나, 기타 메모는 숨긴다.
      E 이체: 출발=주거래, 도착=그 출발에서 사람이 가장 자주 보낸 곳(자동 충전 제외), 같은 계좌 저장 거부.
      F 금액 콤마·날짜 칩·Enter 저장. */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const T=(o)=>Object.assign({id:'t'+Math.random().toString(36).slice(2,8),date:'2026-10-01',type:'expense',scope:'personal',amt:1000},o);
const ST={schemaVersion:7,ui:{month:'2026-10'},
 accounts:[
  {id:'safe',name:'카카오뱅크 세이프박스',group:'현금성',mode:'auto',hist:[{date:'2026-09-01',amount:50000}],opening:{date:'2026-09-01',amount:50000}},
  {id:'kakao',name:'카카오뱅크-입출금통장',group:'현금성',mode:'auto',hist:[{date:'2026-09-01',amount:100000}],opening:{date:'2026-09-01',amount:100000}},
  {id:'sup',name:'우리 SUPER주거래 통장',group:'현금성',mode:'auto',hist:[{date:'2026-09-01',amount:300000}],opening:{date:'2026-09-01',amount:300000}},
  {id:'boss',name:'우리 우리동네사장님',group:'현금성',mode:'auto',hist:[{date:'2026-09-01',amount:20000}],opening:{date:'2026-09-01',amount:20000}},
  {id:'wal',name:'네이버페이',group:'현금성',mode:'auto',fundedBy:'sup',hist:[{date:'2026-09-01',amount:0}],opening:{date:'2026-09-01',amount:0}}],
 cards:[{id:'c1',name:'우리(K패스)',type:'check',acct:'sup'},{id:'c2',name:'네이버페이(이체)',type:'check',acct:'wal'},{id:'c3',name:'삼성 탭탭오',type:'credit',acct:'sup'}],
 categories:[{id:'k1',name:'카페',type:'expense',isFood:true},{id:'k2',name:'식비',type:'expense',isFood:true},{id:'k3',name:'교통비',type:'expense'},
   {id:'k4',name:'생활용품',type:'expense'},{id:'k5',name:'이자비용',type:'expense'},{id:'k6',name:'통신비',type:'expense'},{id:'k7',name:'기타수입',type:'income'}],
 debts:[{id:'d1',name:'소상공인대환',principal0:1000000,balance:1000000}],
 transactions:[
   T({cat:'카페',method:'우리(K패스)'}),T({cat:'카페',method:'우리(K패스)'}),T({cat:'카페',method:'우리(K패스)'}),
   T({cat:'생활용품',method:'우리(K패스)',memo:'다이소 수납함',date:'2026-10-05'}),T({cat:'생활용품',method:'우리(K패스)',memo:'세제',date:'2026-10-03'}),
   T({cat:'교통비',method:'우리(K패스)'}),
   T({id:'old',cat:'교통비',method:'우리(K패스)',date:'2026-09-02'}),
   T({id:'dbt',cat:'통신비',method:'이체',acct:'sup',debtId:'d1',debtPrin:0}),
   T({type:'transfer',cat:'이체',from:'kakao',to:'sup',date:'2026-10-10'}),T({type:'transfer',cat:'이체',from:'kakao',to:'sup',date:'2026-10-11'}),
   T({type:'transfer',cat:'이체',from:'sup',to:'boss',date:'2026-10-12'}),
   T({type:'transfer',cat:'이체',from:'sup',to:'wal',linkId:'L1',date:'2026-10-13'}),T({type:'transfer',cat:'이체',from:'sup',to:'wal',linkId:'L2',date:'2026-10-14'})],
 goals:[],routines:[],checks:{},meals:{},study:{books:[],plan:{},logs:{},tests:[],cfg:{target:{}},errors:[]},
 rewards:[],rewardCards:{},journal:[],items:[],logs2:[],activity:[],netSnapshots:[],
 fixed:[],events:[],posts:[],budgets:{},itemCats:[],timelog:{},
 health:{labDates:[],labTypes:[],labMeds:[],metrics:[],labValues:{},catOrder:[],wImport2026:1,weights:[],events:[]}};

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const c=await b.newContext({viewport:{width:1440,height:1000}});
  await c.addInitScript(({s})=>{const store={v:s};
   function mk(){let _m=null,_p=null;
    const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},
     eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},
     update(p){_m='update';_p=p;return q},upsert(r){store.v=r.data;return Promise.resolve({})},
     order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},
     delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
    return q;}
   window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{s:ST});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const dlg=[];p.on('dialog',d=>{dlg.push(String(d.message()));d.accept();});
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  const V=(id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?(e.style.display===''?'block':e.style.display):'missing';},id);

  /* ── A 주거래 ── */
  await p.evaluate(()=>{txnModal(null);const s=document.getElementById('fMethod');s.value='이체';methodChange();});
  ok('A1 🔴 지출 출금계좌 기본 = 주거래(SUPER) — 목록 첫 번째(세이프박스)가 아니다',(await p.evaluate(()=>document.getElementById('fAcct').value))==='sup');
  await p.evaluate(()=>setType(document.querySelector('.seg button:nth-child(3)'),'transfer'));
  ok('A2 🔴 이체 출발 기본 = 주거래',(await p.evaluate(()=>document.getElementById('fFrom').value))==='sup');
  ok('A3 수입 입금 = 주거래 (같은 함수)',await p.evaluate(()=>{setType(document.querySelector('.seg button:nth-child(2)'),'income');return document.getElementById('fAcct').value==='sup';}));
  ok('A4 ⭐주거래 표시가 이름 추론을 이긴다',await p.evaluate(()=>{acctById('kakao').main=true;const r=mainAcct().id==='kakao';delete acctById('kakao').main;return r&&mainAcct().id==='sup';}));
  await p.evaluate(()=>closeModal());

  /* ── B 빚 갚기 ── */
  await p.evaluate(()=>{txnModal(null);catPick('카페');});
  ok('B1 🔴 카페 지출엔 빚 갚기 칸이 없다',(await V('debtField'))==='none');
  await p.evaluate(()=>catPick('이자비용'));
  ok('B2 이자비용이면 빚 갚기 칸이 뜬다',(await V('debtField'))==='block');
  await p.evaluate(()=>{const d=document.getElementById('fDebt');d.value='d1';debtPick();catPick('카페');});
  ok('B3 계정과목을 바꿔 칸이 사라지면 고른 빚도 풀린다',await p.evaluate(()=>document.getElementById('fDebt').value===''));
  await p.evaluate(()=>{closeModal();txnModal('dbt');});
  ok('B4 🔒 빚에 묶인 거래는 계정과목이 무엇이든 칸이 보인다',(await V('debtField'))==='block');
  await p.evaluate(()=>closeModal());

  /* ── C 교통비 후불 기본 ── */
  await p.evaluate(()=>{txnModal(null);const s=document.getElementById('fMethod');s.value='우리(K패스)';methodChange();catPick('교통비');});
  ok('C1 🔴 교통비 + K패스 = 후불이 눌려 있다',await p.evaluate(()=>document.querySelector('#payKindSeg button:nth-child(2)').classList.contains('on')));
  await p.evaluate(()=>catPick('생활용품'));
  ok('C2 다른 계정과목으로 바꾸면 카드 기본(즉시)으로 돌아간다',await p.evaluate(()=>document.querySelector('#payKindSeg button:nth-child(1)').classList.contains('on')));
  await p.evaluate(()=>{catPick('교통비');document.getElementById('fAmt').value='1,450';saveTxn(null);});
  const saved=await p.evaluate(()=>{const t=DB.transactions[DB.transactions.length-1];return {credit:t.credit,cr:txnIsCredit(t),amt:t.amt};});
  ok('C3 저장도 같은 판정 — credit:true 로 남고 후불로 계산된다',saved.credit===true&&saved.cr===true,JSON.stringify(saved));
  ok('C4 콤마 금액이 숫자로 저장된다',saved.amt===1450,JSON.stringify(saved));
  await p.evaluate(()=>{txnModal(null);catPick('교통비');const s=document.getElementById('fMethod');s.value='우리(K패스)';methodChange();setPayKind(document.querySelector('#payKindSeg button'),0);catPick('생활용품');catPick('교통비');});
  ok('C5 로한이 즉시를 누르면 그 값이 이긴다',await p.evaluate(()=>document.querySelector('#payKindSeg button:nth-child(1)').classList.contains('on')));
  await p.evaluate(()=>{closeModal();txnModal('old');});
  ok('C6 🔒 옛 교통비(후불 표시 없음)를 열면 즉시 그대로 — 수정 중엔 끼어들지 않는다',await p.evaluate(()=>document.querySelector('#payKindSeg button:nth-child(1)').classList.contains('on')));
  await p.evaluate(()=>{saveTxn('old');});
  ok('C7 열었다 저장해도 credit 이 생기지 않는다',await p.evaluate(()=>!('credit' in DB.transactions.filter(t=>t.id==='old')[0])));
  await p.evaluate(()=>{txnModal(null);catPick('교통비');const s=document.getElementById('fMethod');s.value='네이버페이(이체)';methodChange();s.value='우리(K패스)';methodChange();});
  ok('C8 지갑을 거쳐 카드로 바꿔도 교통비 후불 기본이 산다',await p.evaluate(()=>document.querySelector('#payKindSeg button:nth-child(2)').classList.contains('on')));
  await p.evaluate(()=>{const s=document.getElementById('fMethod');s.value='네이버페이(이체)';methodChange();});
  ok('C9 지갑은 교통비여도 즉시',await p.evaluate(()=>payKindCredit(cardBy('네이버페이(이체)'))===false));
  await p.evaluate(()=>closeModal());

  /* ── D 적요 ── */
  await p.evaluate(()=>{txnModal(null);catPick('생활용품');});
  ok('D1 🔴 생활용품이면 계정과목 밑에 적요 칸',(await V('noteField'))==='block');
  ok('D2 기타 안 메모는 숨긴다(두 군데 쓰지 않는다)',(await V('memoField'))==='none');
  ok('D3 같은 계정과목 최근 적요가 자동완성으로 뜬다(최신 순)',await p.evaluate(()=>[...document.querySelectorAll('#noteList option')].map(o=>o.value).join('|')==='다이소 수납함|세제'));
  await p.evaluate(()=>{document.getElementById('fNote').value='물티슈';catPick('카페');});
  ok('D4 음식으로 바꾸면 적요는 숨고 먹은 것 칸이 뜬다',(await V('noteField'))==='none'&&(await V('foodField'))==='block');
  ok('D5 쓰던 적요는 메모로 옮겨 간다(안 버린다)',await p.evaluate(()=>document.getElementById('fMemo').value==='물티슈'));
  await p.evaluate(()=>{catPick('생활용품');document.getElementById('fNote').value='휴지';document.getElementById('fAmt').value='3,000';saveTxn(null);});
  await p.evaluate(()=>{closeModal();txnModal(null);catPick('교통비');});
  ok('D7 🔴 교통비엔 「무엇을 샀나」가 없다(매번 같은 것을 낸다) — 메모는 기타 안에',(await V('noteField'))==='none'&&(await V('memoField'))==='block');
  await p.evaluate(()=>catPick('통신비'));
  ok('D8 통신비(고정비)도 없다',(await V('noteField'))==='none');
  await p.evaluate(()=>{const c=catByName('교통비');closeModal();catModal(c.id);document.getElementById('k_note').checked=true;saveCat(c.id);txnModal(null);catPick('교통비');});
  ok('D9 계정과목 편집에서 켜면 뜬다(체크가 추론을 이긴다)',(await V('noteField'))==='block'&&(await p.evaluate(()=>catByName('교통비').noteAsk===true)));
  await p.evaluate(()=>{const c=catByName('교통비');closeModal();catModal(c.id);document.getElementById('k_note').checked=false;saveCat(c.id);txnModal(null);catPick('생활용품');});
  ok('D6 적요가 memo 로 저장된다',await p.evaluate(()=>DB.transactions[DB.transactions.length-1].memo==='휴지'));

  /* ── E 이체 ── */
  await p.evaluate(()=>{txnModal(null);setType(document.querySelector('.seg button:nth-child(3)'),'transfer');});
  ok('E1 🔴 도착 기본 = 주거래에서 사람이 가장 자주 보낸 곳(자동 충전 2건은 세지 않는다)',(await p.evaluate(()=>document.getElementById('fTo').value))==='boss');
  await p.evaluate(()=>{const f=document.getElementById('fFrom');f.value='kakao';trFromChange();});
  ok('E2 출발을 바꾸면 도착이 따라온다',(await p.evaluate(()=>document.getElementById('fTo').value))==='sup');
  await p.evaluate(()=>{const f=document.getElementById('fFrom');f.value='safe';trFromChange();});
  ok('E3 기록 없는 출발이면 도착을 비워 둔다(엉뚱한 계좌를 박지 않는다)',(await p.evaluate(()=>document.getElementById('fTo').value))==='');
  ok('E0 🔴 이체에서도 금액 칸이 보인다(지출 줄과 같이 숨지 않는다)',await p.evaluate(()=>!!document.getElementById('fAmt').offsetParent&&document.querySelectorAll('#fAmt').length===1));
  const chips=await p.evaluate(()=>[...document.querySelectorAll('#trRoutes .dchip')].map(x=>x.dataset.fr+'>'+x.dataset.to));
  ok('E4 경로 칩 — 자주 쓴 순, 자동 충전 제외',chips[0]==='kakao>sup'&&chips.indexOf('sup>wal')<0,JSON.stringify(chips));
  await p.evaluate(()=>{trRoute('sup','boss');trSwap();});
  ok('E5 ⇄ 맞바꾸기',await p.evaluate(()=>document.getElementById('fFrom').value==='boss'&&document.getElementById('fTo').value==='sup'));
  await p.evaluate(()=>{document.getElementById('fAmt').value='5,000';trPreview();});
  ok('E6 이체 후 잔액 미리보기',await p.evaluate(()=>/21,000.*16,000/.test(document.getElementById('trPrev').textContent)));
  const n0=await p.evaluate(()=>DB.transactions.length);
  await p.evaluate(()=>{document.getElementById('fTo').value='boss';saveTxn(null);});
  ok('E7 같은 계좌끼리는 저장 거부',(await p.evaluate(()=>DB.transactions.length))===n0&&dlg.some(m=>/같/.test(m)));
  await p.evaluate(()=>{closeModal();const t=DB.transactions.filter(x=>x.type==='transfer'&&!x.linkId)[0];txnModal(t.id);});
  ok('E8 저장된 이체를 열어도 금액 칸이 보이고 값이 있다',await p.evaluate(()=>!!document.getElementById('fAmt').offsetParent&&document.getElementById('fAmt').value==='1,000'));
  await p.evaluate(()=>{setType(document.querySelector('.seg button:nth-child(1)'),'expense');});
  ok('E9 지출로 돌아가면 금액 칸이 결제수단 줄로 돌아온다',await p.evaluate(()=>document.getElementById('fAmt').closest('.txrow')!==null));
  await p.evaluate(()=>closeModal());

  /* ── F 날짜·Enter ── */
  await p.evaluate(()=>{txnModal(null);txDay(-1);});
  ok('F1 [어제] 칩',await p.evaluate(()=>document.getElementById('fDate').value===addDays(todayStr(),-1)&&document.querySelector('.txdate .dchip[data-dd="-1"]').classList.contains('on')));
  await p.evaluate(()=>{catPick('생활용품');document.getElementById('fAmt').value='2,000';});
  const n1=await p.evaluate(()=>DB.transactions.length);
  await p.focus('#fAmt');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  ok('F2 금액 칸에서 Enter = 저장',(await p.evaluate(()=>DB.transactions.length))===n1+1);
  await p.evaluate(()=>{txnModal(null);const a=document.getElementById('fAmt');a.value='1234567';amtFmt(a);});
  ok('F3 금액 천 단위 콤마',await p.evaluate(()=>document.getElementById('fAmt').value==='1,234,567'));
  ok('F4 계정과목 칩 — 많이 쓴 순',await p.evaluate(()=>{const u=usageBy('cat');const n=[...document.querySelectorAll('#fCatChips .dchip')].map(x=>u[x.dataset.cat]||0);return n.length>=3&&n.every((v,i)=>!i||n[i-1]>=v);}));
  await p.evaluate(()=>closeModal());

  /* 휴대폰 폭 */
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>{txnModal(null);const s=document.getElementById('fMethod');s.value='우리(K패스)';methodChange();});
  ok('G1 390px 가로 넘침 없음',await p.evaluate(()=>{const m=document.getElementById('modal')||document.querySelector('.modal');return document.documentElement.scrollWidth<=innerWidth&&(!m||m.scrollWidth<=m.clientWidth+1);}));

  /* 계정과목 편집 — 추론과 같으면 키를 안 남긴다 */
  const cat=await p.evaluate(()=>{const c=catByName('생활용품');closeModal();catModal(c.id);document.getElementById('k_post').checked=true;saveCat(c.id);
    const a=catByName('생활용품').postpaid===true;catModal(c.id);document.getElementById('k_post').checked=false;saveCat(c.id);
    const b=!('postpaid' in catByName('생활용품'));const t=catByName('교통비');catModal(t.id);saveCat(t.id);
    return {a:a,b:b,t:!('postpaid' in catByName('교통비'))&&isPostCat('교통비')};});
  ok('H1 「후불 기본」 체크가 저장된다',cat.a,JSON.stringify(cat));
  ok('H2 🔒 추론과 같아지면 키를 지운다(빈 서랍 금지)',cat.b&&cat.t,JSON.stringify(cat));
  ok('Z 콘솔 에러 0',errs.length===0,errs.join('|'));
 }finally{await b.close();}
 console.log(fail?('✗ 실패 '+fail+'/'+(pass+fail)+'\n  '+bad.join('\n  ')):('전부 통과 ('+pass+'건)'));
 process.exit(fail?1:0);
})();
