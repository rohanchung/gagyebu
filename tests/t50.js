/* v4.17 🗝️ 예산 — 월 전환 · 생활방 한마디 · 2·3열 컴팩트
   로한: "예산 영역을 현실화한다. 상단에서 월을 바꾸고, 로버트(생활)가 한마디 남길 공간을 만들고,
          한 줄로 쭉 만들지 말고 최소 2,3줄로 컴팩트하게 스크롤 내리지 않고 현황이 보이게."
   🔒 실데이터 모양 그대로 쓴다(2026-09-23 DB): 지출 분류 32개 중 예산은 11개뿐이고,
      예산 밖에서 예산 합계보다 많은 돈이 나간다. 그게 이 화면이 풀어야 할 문제다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

/* [분류, 예산, 9월실적, 8월실적] — 실측값 */
const R=[
 ['월세',420000,0,420000],['식비',300000,228594,211010],['관리비',150000,142690,140960],
 ['배달',100000,59800,208900],['카페',100000,58810,82890],['통신비',73000,0,72870],
 ['선물',50000,604000,78800],['의류&미용',50000,110000,10000],['간식/편의점',50000,75170,71240],
 ['생활용품',50000,28990,577778],['교통비',30000,69800,29650],
 ['이자비용',0,502944,145784],['의료',0,308400,541600],['비즈니스',0,212890,89090],
 ['국민연금',0,140220,140220],['건강보험',0,122020,122020],['기타',0,60000,38295],
 ['Chatgpt',0,42652,12090],['Youtube',0,40649,20742],['취미비용',0,22000,30332],
 ['Claude',0,14130,28241],['세금/공과금',0,0,956330],['Gopro',0,0,0],['Capcut',0,0,0],
 ['제이엔씨',0,0,0],['빈티지119',0,0,0],['CAPGO',0,0,0],['Google',0,0,9168],
 ['사보험',0,0,67143],['Neflicx',0,0,0],['노란우산',0,0,0],['이자',0,0,0]];
const categories=R.map((r,i)=>({id:'c'+i,name:r[0],type:'expense'}));
categories.push({id:'ci',name:'강사료',type:'income',incType:'사업소득'});
const budgets={}; R.forEach(r=>{if(r[1]>0)budgets[r[0]]=r[1];});
const transactions=[]; let k=0;
const push=(date,cat,amt)=>{if(amt>0)transactions.push({id:'t'+(k++),date,type:'expense',cat,amt,method:'현금',acc:'a1'});};
R.forEach(r=>{push('2026-09-10',r[0],r[2]);push('2026-08-10',r[0],r[3]);});
/* 🔒 7월도 있어야 한다 — 실데이터엔 7·8·9월이 있고, '지난 달 자동 고정'은 거래가 있는 달만 굳힌다 */
push('2026-07-10','식비',180000); push('2026-07-10','카페',61000);
const NOTE='9월 긴축 중간 점검. 선물 604,000 은 추석 지출이라 일회성으로 본다.\n이자비용·의료·국민연금·건강보험은 예산 밖인데 매달 나간다.';

const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-09'},
 accounts:[{id:'a1',name:'주계좌',type:'bank',balance:0}],cards:[{id:'cd1',name:'현금',type:'check'}],
 categories,transactions,budgets,budgetNote:{'2026-09':NOTE},
 debts:[],fixed:[],events:[],posts:[],journal:[],items:[],logs:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words:[],sents:[],units:[],tests:[],errors:[],drills:[],pomos:[],books:[],phases:[],week:{},month:{},logs:{}}};

/* 손으로 계산한 기대값 — 앱이 낸 걸 옮겨 적으면 테스트가 아니다 */
const TOTBUD=420000+300000+150000+100000+100000+73000+50000+50000+50000+50000+30000;   /* 1,373,000 */
const INACT =0+228594+142690+59800+58810+0+604000+110000+75170+28990+69800;            /* 1,377,854 */
const OUTACT=502944+308400+212890+140220+122020+60000+42652+40649+22000+14130;         /* 1,465,905 */

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1400,height:1000}});
 await c.addInitScript(({st})=>{const store={v:JSON.parse(JSON.stringify(st))};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.budgets);
 await p.evaluate(()=>{document.getElementById('login').style.display='none';document.getElementById('app').classList.add('on');gotoTab('budget');});
 await p.waitForTimeout(500);
 const R2=[];const ok=(n,v,x)=>R2.push({n,v:!!v,x});
 const txt=()=>p.$eval('#v-budget',e=>e.textContent);
 const cards=(sel)=>p.$$eval(sel||'#v-budget .bcard',es=>es.map(e=>({
   name:(e.querySelector('.bn')||{}).textContent||'',
   act:(e.querySelector('.ba b')||{}).textContent||'',
   bud:(e.querySelector('.bin')||{}).value,
   out:e.classList.contains('out'),over:e.classList.contains('over')})));

 /* ── A) 월 전환 ── */
 ok('A1 상단에 월이 뜬다',/2026년 9월/.test(await txt()),(await txt()).slice(0,40));
 await p.evaluate(()=>budMove(-1));await p.waitForTimeout(300);
 ok('A2 ◀ 로 지난달',(await p.evaluate(()=>DB.ui.month))==='2026-08'&&/2026년 8월/.test(await txt()));
 /* 🔒 8월 실적으로 다시 그려져야 한다 — 월만 바뀌고 숫자가 그대로면 화면이 거짓말이다 */
 const aug=await cards();
 const augFood=aug.find(x=>x.name==='식비');
 ok('A3 숫자도 그 달로 바뀐다(8월 식비 211,010)',augFood&&/211,010/.test(augFood.act),JSON.stringify(augFood));
 ok('A4 예산은 그대로다 — 기준값 하나다',augFood&&augFood.bud==='300000',JSON.stringify(augFood));
 /* 🔒 확정 예산이 없는 지난 달은 "지금 기준을 대본 것"이라고 화면이 말해야 한다 */
 ok('A5 그렇게 적혀 있다',/지금 기준 예산을 대본 것/.test(await txt()),(await txt()).slice(0,60));
 await p.evaluate(()=>budMove(1));await p.waitForTimeout(300);
 ok('A6 ▶ 로 되돌아온다',(await p.evaluate(()=>DB.ui.month))==='2026-09');
 /* 🔒 월은 재정 탭이 공유한다 — 예산에서 옮기면 가계부도 옮겨져야 한다 */
 await p.evaluate(()=>budMove(-2));await p.waitForTimeout(300);
 ok('A7 월은 재정 전체가 공유한다',(await p.evaluate(()=>DB.ui.month))==='2026-07');
 await p.evaluate(()=>budThisMonth());await p.waitForTimeout(300);
 ok('A8 「이번 달」로 돌아온다',(await p.evaluate(()=>DB.ui.month))===new Date().toISOString().slice(0,7));
 await p.evaluate(()=>{DB.ui.month='2026-09';save();renderBudget();});await p.waitForTimeout(300);

 /* ── B) 생활방 한마디 ── */
 let t=await txt();
 ok('B1 로버트(생활) 칸이 있다',/로버트\(생활\)/.test(t));
 ok('B2 그 달 메모가 뜬다',/긴축 중간 점검/.test(t));
 /* 🔒 앱은 읽기만 한다 — 학습 캘린더의 학습방 멘트와 같은 규칙 */
 ok('B3 앱에 메모 입력칸이 없다',
    (await p.$$('#v-budget .bnote textarea, #v-budget .bnote input')).length===0);
 ok('B4 읽기 전용이라고 적혀 있다',/읽기만 한다/.test(t));
 await p.evaluate(()=>{DB.ui.month='2026-08';save();renderBudget();});await p.waitForTimeout(250);
 ok('B5 메모 없는 달은 없다고 말한다',/메모가 없다/.test(await txt()));
 await p.evaluate(()=>{DB.ui.month='2026-09';save();renderBudget();});await p.waitForTimeout(250);

 /* ── C) 레이아웃 — 한 줄 나열이 아니다 ── */
 const cols=()=>p.$eval('#v-budget .bgrid',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
 ok('C1 데스크톱은 3열',(await cols())===3,String(await cols()));
 /* 🔴 [결함·2026-09-23] 모바일 규칙을 기본 정의 **앞**에 뒀더니 400px 에서도 3열이 나와
      입력칸이 잘렸다. 미디어쿼리는 구체성을 안 올린다 — 같은 구체성이면 뒤가 이긴다. */
 await p.setViewportSize({width:400,height:900});await p.waitForTimeout(400);
 ok('C2 모바일은 2열 (1열로 떨구지 않는다)',(await cols())===2,String(await cols()));
 const ovf=await p.evaluate(()=>{
   const e=document.getElementById('v-budget');
   const bad=[...e.querySelectorAll('.bcard')].filter(x=>x.scrollWidth>x.clientWidth+1).length;
   return {page:document.documentElement.scrollWidth-document.documentElement.clientWidth,bad:bad};});
 ok('C3 가로로 넘치지 않는다',ovf.page<=0&&ovf.bad===0,JSON.stringify(ovf));
 await p.setViewportSize({width:1400,height:1000});await p.waitForTimeout(400);

 /* ── D) 예산 안 / 밖 / 조용 ── */
 const all=await cards();
 ok('D1 예산 잡힌 11개가 카드로 뜬다',all.filter(x=>!x.out).length===11,String(all.filter(x=>!x.out).length));
 ok('D2 예산 밖 10개가 따로 묶인다',all.filter(x=>x.out).length===10,String(all.filter(x=>x.out).length));
 /* 🔒 정렬은 '얼마나 어긋났나' — 현실화하려고 보는 화면이다 */
 const inNames=all.filter(x=>!x.out).map(x=>x.name);
 ok('D3 초과가 큰 것이 맨 앞(선물)',inNames[0]==='선물',JSON.stringify(inNames.slice(0,3)));
 ok('D4 안 쓴 것이 맨 뒤(월세·통신비)',
    ['월세','통신비'].every(n=>inNames.indexOf(n)>=inNames.length-2),JSON.stringify(inNames));
 ok('D5 예산 밖은 금액 큰 순(이자비용)',all.filter(x=>x.out)[0].name==='이자비용');
 /* 🔒 조용한 분류는 숨기지 않고 **접는다** — 개수를 적으면 거짓말이 아니다 */
 t=await txt();
 ok('D6 조용한 분류는 개수를 적고 접어둔다',/조용한 분류/.test(t)&&/11개/.test(t),'');
 await p.evaluate(()=>budToggleIdle());await p.waitForTimeout(300);
 ok('D7 펼치면 나온다',(await cards()).length===32,String((await cards()).length));
 await p.evaluate(()=>budToggleIdle());await p.waitForTimeout(300);

 /* ── E) 숫자 — 🔒 '예산 잔여'는 예산 **안** 실적으로만 잰다 ── */
 const stats=await p.$$eval('#v-budget .stat',es=>es.map(e=>({
   l:e.querySelector('.sl').textContent,v:e.querySelector('.sv').textContent})));
 const sv=(l)=>(stats.find(x=>x.l===l)||{}).v||'';
 const num=(s)=>+String(s).replace(/[^0-9-]/g,'');
 ok('E1 예산 합계',num(sv('예산 합계'))===TOTBUD,sv('예산 합계'));
 ok('E2 예산 안 지출',num(sv('예산 안 지출'))===INACT,sv('예산 안 지출'));
 ok('E3 예산 밖 지출',num(sv('예산 밖 지출'))===OUTACT,sv('예산 밖 지출'));
 /* ⚠️ 옛 화면은 예산 밖까지 빼고 '예산 잔여'라 불렀다 — 숫자는 맞지만 이름이 거짓이었다.
    예산을 다 지켜도 예산 밖 때문에 '초과'로 떴다. */
 ok('E4 예산 잔여 = 예산합계 − 예산 안 실적 (예산 밖을 빼지 않는다)',
    num(sv('예산 잔여'))===TOTBUD-INACT,sv('예산 잔여')+' ≠ '+(TOTBUD-INACT));
 ok('E5 총지출은 둘을 합친 값',num(sv('이 달 총지출'))===INACT+OUTACT,sv('이 달 총지출'));
 ok('E6 왜 초과했는지 한 줄로 말한다',/예산이 현실을 안 덮고 있다/.test(await txt()));

 /* ── F) 편집 ── */
 await p.evaluate(()=>{const i=[...document.querySelectorAll('#v-budget .bin')]
   .find(x=>x.dataset.budcat==='의료'); i.value='300000';
   i.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.waitForTimeout(350);
 ok('F1 예산을 넣으면 저장된다',(await p.evaluate(()=>DB.budgets['의료']))===300000);
 const after=await cards();
 ok('F2 예산 밖에서 위 칸으로 올라간다',
    after.filter(x=>!x.out).some(x=>x.name==='의료')&&!after.filter(x=>x.out).some(x=>x.name==='의료'));
 /* 🔒 v4.18 — **빈칸이 '예산 없음'이고, 0 은 '0원 예산'이다.** 둘은 다른 말이다(H 블록에서 더 본다) */
 await p.evaluate(()=>{const i=[...document.querySelectorAll('#v-budget .bin')]
   .find(x=>x.dataset.budcat==='의료'); i.value='';
   i.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.waitForTimeout(350);
 ok('F3 빈칸을 넣으면 키를 지운다(빈 서랍 금지)',
    (await p.evaluate(()=>Object.prototype.hasOwnProperty.call(DB.budgets,'의료')))===false);
 ok('F4 예산 없는 칸은 빈칸이다 (0 이 박혀 있지 않다)',
    (await cards()).filter(x=>x.out).every(x=>x.bud===''),
    JSON.stringify((await cards()).filter(x=>x.out).slice(0,3)));

 /* ── G) v4.18 🗝️ 월별 예산 이력 — 생활방 v2 요청 ──
    생활방: "budgets 는 월 구분 없는 평면 객체다. **예산을 바꾸면 과거 기준이 사라진다.**"
    실제로 9/23 예산 전면 개정으로 9월 실적이 10월 예산에 재단됐다. */
 await p.evaluate(()=>{DB.ui.month='2026-09';DB.budgetsM=undefined;delete DB.budgetsM;save();renderBudget();});
 await p.waitForTimeout(300);
 ok('G1 기본은 기준 예산이라고 말한다',/기준 예산/.test(await txt()));
 /* 🔒 지난 달을 고정하면 기준을 바꿔도 안 흔들린다 */
 await p.evaluate(()=>{DB.ui.month='2026-08';save();renderBudget();budFreeze();});
 await p.waitForTimeout(350);
 ok('G2 이 달로 고정하면 그 달 예산이 박힌다',
    (await p.evaluate(()=>DB.budgetsM&&DB.budgetsM['2026-08']&&DB.budgetsM['2026-08']['식비']))===300000);
 ok('G3 화면이 확정본이라고 말한다',/이 달 확정 예산/.test(await txt()));
 /* 기준을 바꿔도 고정된 8월은 그대로 */
 await p.evaluate(()=>{DB.ui.month='2026-09';save();renderBudget();
   const i=[...document.querySelectorAll('#v-budget .bin')].find(x=>x.dataset.budcat==='식비');
   i.value='170000'; i.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.waitForTimeout(400);
 ok('G4 기준은 바뀐다',(await p.evaluate(()=>DB.budgets['식비']))===170000);
 ok('G5 고정된 8월은 안 흔들린다',
    (await p.evaluate(()=>DB.budgetsM['2026-08']['식비']))===300000);
 /* 🔒 기준을 바꾸면 **굳지 않은 지난 달**은 옛 값으로 자동으로 굳는다 —
    버튼을 누르게 만들면 안 누르고, 그럼 과거가 또 사라진다 */
 ok('G6 굳지 않았던 지난 달(7월)이 옛 값으로 자동 고정된다',
    (await p.evaluate(()=>DB.budgetsM['2026-07']&&DB.budgetsM['2026-07']['식비']))===300000,
    JSON.stringify(await p.evaluate(()=>Object.keys(DB.budgetsM||{}))));
 ok('G7 이번 달은 안 굳힌다 — 진행 중이라 기준을 따라가야 한다',
    (await p.evaluate(()=>!!(DB.budgetsM&&DB.budgetsM['2026-09'])))===false);
 /* 고정된 달에서 고치면 그 달만 바뀐다 */
 await p.evaluate(()=>{DB.ui.month='2026-08';save();renderBudget();
   const i=[...document.querySelectorAll('#v-budget .bin')].find(x=>x.dataset.budcat==='식비');
   i.value='999000'; i.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.waitForTimeout(400);
 ok('G8 고정된 달을 고치면 그 달만 바뀐다',
    (await p.evaluate(()=>DB.budgetsM['2026-08']['식비']))===999000
    &&(await p.evaluate(()=>DB.budgets['식비']))===170000);
 await p.evaluate(()=>budUnfreeze());await p.waitForTimeout(350);
 ok('G9 고정 해제하면 기준으로 돌아온다',
    (await p.evaluate(()=>!!(DB.budgetsM&&DB.budgetsM['2026-08'])))===false
    &&/기준 예산/.test(await txt()));

 /* ── H) 🔒 0원 예산은 '예산 없음'이 아니다 (생활방: 선물 0 = "경조사 시 조정") ── */
 await p.evaluate(()=>{DB.ui.month='2026-09';DB.budgets['선물']=0;save();renderBudget();});
 await p.waitForTimeout(350);
 const gift=(await cards()).find(x=>x.name==='선물');
 ok('H1 0원 예산은 예산 밖이 아니다',gift&&!gift.out,JSON.stringify(gift));
 ok('H2 칸에 0 이 적힌다 (빈칸이 아니다)',gift&&gift.bud==='0',JSON.stringify(gift));
 ok('H3 0원인데 썼으면 초과다',gift&&gift.over,JSON.stringify(gift));
 ok('H4 0원 예산이라고 말해준다',/쓰면 안 된다/.test(await txt()));
 /* 빈칸은 여전히 키를 지운다 */
 await p.evaluate(()=>{const i=[...document.querySelectorAll('#v-budget .bin')]
   .find(x=>x.dataset.budcat==='선물'); i.value='';
   i.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.waitForTimeout(350);
 ok('H5 빈칸은 키를 지운다 (예산 없음)',
    (await p.evaluate(()=>Object.prototype.hasOwnProperty.call(DB.budgets,'선물')))===false);
 ok('H6 그러면 예산 밖으로 내려간다',(await cards()).find(x=>x.name==='선물').out);

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 for(const r of R2)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R2.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
