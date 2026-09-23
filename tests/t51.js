/* v4.19 🧾 거래 모달 동선 + 💴 금액 줄바꿈
   로한 ①: "계정과목 바꾸고, 결제수단, 금액 쓰고 끝이라 사실 이게 기타부분(세무·세부계정과목·메모)보다
            더 위에 와야 되는 거 아니냐. 세무 구분도 계정과목에서 거의 정해지니 맞춰서 뜨면 되고.
            세부계정과목도 식비·카페 같은 일회성 소비 과목엔 뜰 필요가 없고."
   로한 ②: "금액 단위가 높아지면 줄바꿈 되는 거 극혐이다."
   🔒 실측 근거(1,052건): 메모 94건(9%) · 세부계정과목 7건(0.7%) · 세무 수동 3건(0.3%).
      매번 쓰는 것이 위, 가끔 쓰는 것이 아래. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

const cats=[
 {id:'c1',name:'식비',type:'expense',deductible:false},
 {id:'c2',name:'카페',type:'expense',deductible:true,taxAccount:'지급수수료'},
 {id:'c3',name:'간식/편의점',type:'expense',deductible:false},
 {id:'c5',name:'강사료',type:'income',incType:'사업소득',taxCode:'940903'},
 {id:'c6',name:'실비환급',type:'income',incType:'기타소득'}];
const tx=[
 {id:'t1',date:'2026-09-20',type:'expense',scope:'personal',cat:'식비',method:'현금',acct:'a1',amt:12000,memo:''},
 /* 기타에 값이 들어 있는 건 — 수정하러 들어오면 펼쳐져야 한다 */
 {id:'t2',date:'2026-09-19',type:'expense',scope:'personal',cat:'식비',method:'현금',acct:'a1',amt:9000,
  memo:'회식 대납',tk:'pass',itemCat:'전자기기'},
 /* 🔴 1,000만 원대 — 통계칸이 쪼개지던 자리 */
 {id:'t3',date:'2026-09-05',type:'income',scope:'personal',cat:'강사료',acct:'a1',amt:13342106,memo:''},
 {id:'t4',date:'2026-09-06',type:'expense',scope:'personal',cat:'식비',method:'현금',acct:'a1',amt:12285940,memo:''}];
const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},
 ui:{month:'2026-09',watchCats:['식비','카페','간식/편의점']},
 accounts:[{id:'a1',name:'우리 슈퍼입출금',type:'bank',group:'현금',balance:500000}],
 cards:[{id:'cd1',name:'우리(K패스)',type:'credit',close:15,pay:25},{id:'cd2',name:'카카오-사업자체크카드',type:'check'}],
 categories:cats,transactions:tx,budgets:{},debts:[],fixed:[],events:[],posts:[],journal:[],items:[],logs:[],
 itemCats:['전자기기','생활용품','건강용품','패션의류','미용','가구','기타'],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words:[],sents:[],units:[],tests:[],errors:[],drills:[],pomos:[],books:[],phases:[],week:{},month:{},logs:{}}};

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1500,height:1000}});
 await c.addInitScript(({st})=>{const store={v:JSON.parse(JSON.stringify(st))};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>d.accept());
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.categories);
 await p.evaluate(()=>{document.getElementById('login').style.display='none';document.getElementById('app').classList.add('on');gotoTab('cal');});
 await p.waitForTimeout(500);
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 /* 보이는 칸을 위에서 아래 순서로 */
 const order=()=>p.evaluate(()=>[...document.querySelectorAll('.modal .field > label, .modal .mx > summary')]
   /* summary 는 접혀 있어도 보인다 — 그것이 접힘의 손잡이다 */
   .filter(e=>(e.tagName==="SUMMARY"||!e.closest("details:not([open])"))&&e.getClientRects().length>0)
   .map(e=>(e.id==='mxSum'?'':e.textContent.trim().split('\n')[0]).replace(/\s+/g,' ').slice(0,10)));
 const at=(a,s)=>a.findIndex(x=>x.indexOf(s)===0);
 const val=(id)=>p.evaluate(x=>{const e=document.getElementById(x);return e?(e.value!==undefined?e.value:e.textContent):null;},id);
 /* ⚠️ 닫힌 <details> 안은 offsetParent 로도 getClientRects 로도 안 걸러진다 —
    크로미움은 content-visibility 로 숨기기 때문에 박스는 그대로 있다(빈 페이지에서도 같다).
    🔒 접힘 여부는 **조상 details 의 open** 으로 본다. */
 const shown=(id)=>p.evaluate(x=>{const e=document.getElementById(x);
   if(!e)return false;
   if(e.closest("details:not([open])"))return false;
   return e.getClientRects().length>0&&e.getBoundingClientRect().height>0;},id);

 /* ── A) 순서 — 매번 쓰는 것이 위 ── */
 await p.evaluate(()=>txnModal(null));await p.waitForTimeout(350);
 let o=await order();
 ok('A1 계정과목 → 결제수단 → 금액 순서',
    at(o,'계정과목')>=0&&at(o,'계정과목')<at(o,'결제수단')&&at(o,'결제수단')<at(o,'금액'),JSON.stringify(o));
 ok('A2 날짜가 금액 바로 뒤',at(o,'날짜')>at(o,'금액'),JSON.stringify(o));
 /* 🔒 핵심 3칸이 「기타」보다 위여야 한다 — 이게 로한의 요구다 */
 ok('A3 금액이 「기타」보다 위',at(o,'기타')>at(o,'금액')&&at(o,'기타')>=0,JSON.stringify(o));
 ok('A4 세무 구분이 접힘 안으로 들어갔다',await shown('taxKindField')===false);
 ok('A5 메모도 접힘 안',await shown('fMemo')===false);
 ok('A6 접혀 있다',(await p.evaluate(()=>!document.getElementById('mxBox').open))===true);

 /* ── B) 세무 구분은 계정과목에서 자동 ── */
 ok('B1 식비(개인) → 개인',(await val('tkAutoLab')).indexOf('개인')===0,await val('tkAutoLab'));
 ok('B2 자동이라고 말한다',/계정과목에서 자동/.test(await val('tkAutoLab')));
 ok('B3 4지선다는 안 보인다',await shown('tkSeg')===false);
 /* 🔒 접혀 있어도 **무엇으로 정해졌는지는 보인다** — 숨기면 잘못 들어가도 모른다 */
 ok('B4 접힌 요약에 세무 구분이 적힌다',/개인/.test(await val('mxSum')),await val('mxSum'));
 await p.evaluate(()=>{selOpt(document.getElementById('fCat'),'카페');
   document.getElementById('fCat').dispatchEvent(new Event('change'));});
 await p.waitForTimeout(250);
 ok('B5 사업경비 과목(카페)으로 바꾸면 사업으로 따라온다',
    (await val('tkAutoLab')).indexOf('사업')===0,await val('tkAutoLab'));
 ok('B6 요약도 따라온다',/사업/.test(await val('mxSum')),await val('mxSum'));
 /* 대분류를 바꿔도 따라온다 */
 await p.evaluate(()=>{selOpt(document.getElementById('fCat'),'식비');
   document.getElementById('fCat').dispatchEvent(new Event('change'));
   [...document.querySelectorAll('.modal .seg button')].find(x=>x.textContent==='사업').click();});
 await p.waitForTimeout(250);
 ok('B7 대분류를 사업으로 바꿔도 따라온다',(await val('tkAutoLab')).indexOf('사업')===0,await val('tkAutoLab'));
 /* 🔒 예외는 손으로 — 「바꾸기」를 눌러야 4지선다가 나온다 */
 await p.evaluate(()=>{document.getElementById('mxBox').open=true;taxKindManual();});
 await p.waitForTimeout(250);
 ok('B8 「바꾸기」를 누르면 4지선다가 열린다',await shown('tkSeg')===true);
 await p.evaluate(()=>{[...document.querySelectorAll('#tkSeg button')].find(x=>x.textContent==='대납·정산').click();});
 await p.waitForTimeout(250);
 ok('B9 직접 고르면 그 값이 박힌다',(await p.evaluate(()=>modal._tk))==='pass');
 /* 🔒 직접 고른 뒤에는 계정과목을 바꿔도 안 덮는다 — 조용히 되돌리면 그게 최악이다 */
 await p.evaluate(()=>{selOpt(document.getElementById('fCat'),'카페');
   document.getElementById('fCat').dispatchEvent(new Event('change'));});
 await p.waitForTimeout(250);
 ok('B10 직접 고른 값은 자동이 덮지 않는다',(await p.evaluate(()=>modal._tk))==='pass');
 ok('B11 직접 고른 것임을 요약이 말한다',/직접/.test(await val('mxSum')),await val('mxSum'));

 /* ── C) 세부계정과목은 재물로 등록할 때만 ── */
 await p.evaluate(()=>{closeModal();txnModal(null);});await p.waitForTimeout(350);
 ok('C1 식비에선 세부계정과목이 안 뜬다',await shown('itemCatField')===false);
 await p.evaluate(()=>{document.getElementById('mxBox').open=true;
   document.getElementById('fAsset').checked=true;itemCatSync();});
 await p.waitForTimeout(250);
 ok('C2 재물 등록을 켜면 뜬다',await shown('itemCatField')===true);
 await p.evaluate(()=>{document.getElementById('fAsset').checked=false;itemCatSync();});
 await p.waitForTimeout(250);
 ok('C3 끄면 다시 숨는다',await shown('itemCatField')===false);

 /* ── D) 수정하러 들어오면 값이 있는 기타는 펼쳐진다 ── */
 await p.evaluate(()=>{closeModal();txnModal('t2');});await p.waitForTimeout(350);
 ok('D1 기타에 값이 있으면 펼쳐서 연다',(await p.evaluate(()=>document.getElementById('mxBox').open))===true);
 ok('D2 수동 세무 구분이 그대로 살아 있다',(await p.evaluate(()=>modal._tk))==='pass');
 ok('D3 4지선다가 펼쳐져 있다',await shown('tkSeg')===true);
 ok('D4 세부계정과목도 값이 있으면 보인다',await shown('itemCatField')===true);
 ok('D5 그 값이 그대로다',(await val('fItemCat'))==='전자기기');
 /* 새 거래는 접혀 있다 */
 await p.evaluate(()=>{closeModal();txnModal(null);});await p.waitForTimeout(300);
 ok('D6 새 거래는 접혀 있다',(await p.evaluate(()=>!document.getElementById('mxBox').open))===true);

 /* ── E) ⚠️ [결함] 수입으로 바꾸면 카드 칸이 사라져야 한다 ── */
 await p.evaluate(()=>{selOpt(document.getElementById('fMethod'),'우리(K패스)');methodChange();
   document.getElementById('fAmt').value='300000';instPreview();});
 await p.waitForTimeout(250);
 ok('E1 신용카드 지출이면 결제 성격·할부가 뜬다',
    (await shown('payKindField'))&&(await shown('instField')));
 await p.evaluate(()=>{[...document.querySelectorAll('.modal .seg button')].find(x=>x.textContent==='수입').click();});
 await p.waitForTimeout(300);
 /* 옛 코드는 income 에서 early return 이라 카드 칸이 켜진 채 남았다 — 수입에 카드값·할부는 없다 */
 ok('E2 수입으로 바꾸면 결제 성격이 사라진다',await shown('payKindField')===false);
 ok('E3 할부 칸도 사라진다',await shown('instField')===false);
 ok('E4 결제수단 자체가 사라진다',await shown('methodField')===false);
 ok('E5 입금계좌로 바뀐다',/입금계좌/.test(await val('acctLabel')),await val('acctLabel'));

 /* ── F) 저장이 예전처럼 동작한다 ── */
 await p.evaluate(()=>{closeModal();txnModal(null);
   selOpt(document.getElementById('fCat'),'카페');
   document.getElementById('fCat').dispatchEvent(new Event('change'));
   selOpt(document.getElementById('fMethod'),'카카오-사업자체크카드');methodChange();
   document.getElementById('fAmt').value='4500';
   document.getElementById('fDate').value='2026-09-23';
   saveTxn(null);});
 await p.waitForTimeout(500);
 const saved=await p.evaluate(()=>{const a=DB.transactions;return a[a.length-1];});
 ok('F1 저장된다',saved&&saved.amt===4500&&saved.cat==='카페',JSON.stringify(saved));
 ok('F2 자동으로 정해진 세무 구분이 같이 저장된다',saved&&saved.tk==='biz',JSON.stringify(saved&&saved.tk));

 /* ── G) 💴 금액이 길어져도 쪼개지거나 잘리지 않는다 ── */
 for(const w of [1920,1500,1440,1330,1180,1024,900,600,400,360]){
   await p.setViewportSize({width:w,height:900});await p.waitForTimeout(260);
   const bad=await p.evaluate(()=>{
     const out=[];
     document.querySelectorAll('#v-cal .stat .sv').forEach(e=>{
       const cs=getComputedStyle(e), lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.4;
       const lines=Math.round(e.getBoundingClientRect().height/lh);
       if(lines>1||e.scrollWidth-e.clientWidth>1)out.push(e.textContent.trim()+'/'+lines+'/'+(e.scrollWidth-e.clientWidth));});
     return out;});
   ok('G'+w+' 금액이 한 줄이고 안 잘린다',bad.length===0,JSON.stringify(bad));
 }
 await p.setViewportSize({width:1500,height:1000});await p.waitForTimeout(250);

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
