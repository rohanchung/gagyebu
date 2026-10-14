/* t55 — v4.31 🛟 저장되지 않은 변경을 잃지 않는다
   🔴 사고(2026-10-13): 로한이 10월분 국민연금·건강보험·140만원 이체를 입력했는데
      **서버 스냅샷 55개 전부에 한 건도 없었다.** 서버는 그 입력을 본 적이 없고,
      localStorage 에도 없었다 — localBackup() 은 접속 직후 하루 1회라 입력을 안 남긴다.
   🔴 원인을 특정하지 못했다(저장이 못 닿았는지, 충돌창에서 버렸는지, 창을 닫았는지).
      그래서 **원인을 가리지 않는 그물**을 잰다 — 어느 경로든 데이터가 어딘가 남아야 한다.
   🔒 여기서 증명할 것:
      ① 저장을 보내기 전에 로컬에 박힌다 · 확인되면 지워진다 (평소에 쓰레기를 남기지 않는다)
      ② 저장이 확인되지 않으면 **남는다**
      ③ 다음 접속에 서버 스냅샷으로 건져 올라간다 (그게 영구 보존이다)
      ④ 서버본과 같으면 올리지 않는다 (같은 것을 두 벌 만들지 않는다)
      ⑤ 충돌창에서 「버린다」를 골라도 **내 화면**이 먼저 남는다 (v1.8 은 이쪽을 안 남겼다)
   ⚠️ 자동으로 DB 를 덮지 않는 것까지 잰다 — 그게 v3.6 에 단어 96건을 두 번 날린 짓이다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

const TX=[
 {id:'t1',type:'expense',date:'2026-10-05',cat:'국민연금',method:'이체',amt:140220,memo:''},
 {id:'t2',type:'expense',date:'2026-10-05',cat:'건강보험',method:'이체',amt:122020,memo:''}];
const STATE=()=>({schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-10'},
 accounts:[{id:'a1',name:'우리',type:'bank',balance:1000000}],
 transactions:JSON.parse(JSON.stringify(TX)),
 categories:[{id:'c1',name:'국민연금',type:'expense'},{id:'c2',name:'건강보험',type:'expense'}],
 cards:[],debts:[],journal:[],items:[],logs:[],budgets:{},fixed:[],events:[],posts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words:[],sents:[],units:[],tests:[],errors:[],drills:[],pomos:[],books:[],phases:[],week:{},month:{},logs:{}}});

/* 서버 흉내 — 🔒 app_state 와 app_state_snap 을 **가른다.**
   t49 의 mock 은 테이블을 구분하지 않아 "스냅샷이 올라갔는가"를 볼 수 없다.
   🔒 올라간 스냅샷은 localStorage 에도 적는다 — 새로고침이 끼어도 증거가 남아야 한다. */
function initScript(opt){
  /* 🔒 at(updated_at)을 **처음부터 준다.** null 이면 앱의 LAST_SYNC 가 null 이 되어
     doSave 가 `.eq('updated_at', …)` 를 아예 걸지 않는다 — 낙관적 잠금이 없는 셈이 되어
     충돌 경로를 한 줄도 재지 못한다. */
  const srv={state:{data:JSON.parse(JSON.stringify(opt.st)),at:'2026-10-13T00:00:00.000Z'},
             snaps:[],seq:0,today:new Date().toISOString().slice(0,10),lockFail:false,netFail:false};
  window.__srv=srv;
  /* 🔒 **아무것도 지우지 않는다.** 이 스크립트는 새로고침마다 다시 돈다 —
     여기서 rb_pending 이나 기록을 지우면 앱이 충돌창에서 새로고침하는 순간 증거가 사라진다
     (그래서 F절이 거짓으로 빨개졌다). 격리는 context 가 이미 해 준다. */
  try{
    if(opt.seedPending&&!localStorage.getItem('__booted'))
      localStorage.setItem('rb_pending',JSON.stringify(opt.seedPending));
    localStorage.setItem('__booted','1');
  }catch(e){}
  function snaplog(row){
    try{
      const a=JSON.parse(localStorage.getItem('__snaplog')||'[]');
      a.push({kind:row.kind,note:row.note,
        n:row.data&&row.data.transactions?row.data.transactions.length:-1});
      localStorage.setItem('__snaplog',JSON.stringify(a));
    }catch(e){}
  }
  function stateQ(){
    let mode=null,payload=null,eqs={};
    /* 🔒 netFail = 서버에 **닿지 못하는** 상태. lockFail 만으로는 사고가 재현되지 않는다 —
       충돌로 읽히면 forceSave 가 upsert(조건 없는 쓰기)로 결국 성공해 버린다. */
    const dead=()=>Promise.reject(new Error('network'));
    const q={
      select(){
        if(srv.netFail)return dead();
        if(mode==='update'){
          mode=null;
          /* 낙관적 잠금 — 조건이 안 맞으면 0행. 앱은 이것을 충돌로 읽는다 */
          if(srv.lockFail)return Promise.resolve({data:[],error:null});
          if('updated_at' in eqs&&eqs.updated_at!==srv.state.at)return Promise.resolve({data:[],error:null});
          srv.state.data=JSON.parse(JSON.stringify(payload.data));srv.state.at=payload.updated_at;
          return Promise.resolve({data:[{updated_at:srv.state.at}],error:null});
        }
        return q;},
      eq(k,v){eqs[k]=v;return q;},
      /* 🔒 **깊은 복사를 넘긴다.** 참조를 넘기면 앱의 DB 가 서버 객체와 같은 것이 되어
         DB.transactions.push 가 서버 데이터를 직접 고친다 — 유실 테스트가 전부 거짓이 된다 */
      maybeSingle(){return srv.netFail?dead()
        :Promise.resolve({data:{data:JSON.parse(JSON.stringify(srv.state.data)),
                                updated_at:srv.state.at},error:null});},
      update(p){mode='update';payload=p;eqs={};return q;},
      upsert(row){if(srv.netFail)return dead();
        srv.state.data=JSON.parse(JSON.stringify(row.data));srv.state.at=row.updated_at;
        return Promise.resolve({data:null,error:null});},
      order(){return q;},limit(){return q;},insert(){return Promise.resolve({data:[],error:null});},
      delete(){return q;},in(){return q;},
      then(a){return Promise.resolve({data:[],error:null}).then(a);}};
    return q;}
  function snapQ(){
    const q={
      insert(row){srv.seq++;srv.snaps.push(Object.assign({id:srv.seq},row));snaplog(row);
        return Promise.resolve({data:[{id:srv.seq}],error:null});},
      select(){return q;},eq(){return q;},order(){return q;},limit(){return q;},
      maybeSingle(){return Promise.resolve({data:srv.snaps.filter(function(x){
        return x.kind==='auto'&&x.day===srv.today;})[0]||null,error:null});},
      delete(){return q;},
      in(ids){srv.snaps=srv.snaps.filter(function(x){return ids.indexOf(x.id)<0;});
        return Promise.resolve({data:null,error:null});},
      then(a){return Promise.resolve({data:srv.snaps.map(function(x){
        return {id:x.id,kind:x.kind,taken_at:new Date(1700000000000+x.id*1000).toISOString(),
                day:x.day,note:x.note,bytes:x.bytes};}),error:null}).then(a);}};
    return q;}
  window.supabase={createClient:function(){return{
    from:function(t){return t==='app_state_snap'?snapQ():stateQ();},
    auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1'}}}});},
          signOut:function(){return Promise.resolve({});},
          onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}}};}};
}

async function boot(b,opt){
  const c=await b.newContext({viewport:{width:1280,height:900}});
  await c.addInitScript(initScript,{st:STATE(),seedPending:(opt&&opt.seedPending)||null});
  const p=await c.newPage(),errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',d=>d.accept());          /* alert 가 떠도 테스트가 멈추지 않게 */
  await p.route('https://**/*',r=>r.abort());
  await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
  await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.transactions);
  await p.waitForTimeout(800);
  return {c,p,errs};
}
const snaplog=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('__snaplog')||'[]'));

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 const allErrs=[];
 try{

 /* ══ A) 등록 — 새 종류를 만들고 등록을 빠뜨리면 조용히 사라진다(반복결함 #8) ══ */
 {
  const {c,p,errs}=await boot(b);
  const reg=await p.evaluate(()=>({
    lim:SNAP_LIMIT,
    lab:[snapKindLabel('pending'),snapKindLabel('pre_discard'),snapKindLabel('auto')],
    css:[...document.styleSheets].some(ss=>{try{return [...ss.cssRules].some(r=>
      r.selectorText&&r.selectorText.indexOf('.pill.snk.pending')>=0);}catch(e){return false;}}),
    fns:['pendWrite','pendClear','pendRead','pendRescue','snapDiscardBefore']
         .map(k=>typeof window[k])}));
  ok('A1 pending·pre_discard 가 상한표에 등록돼 있다',
     reg.lim.pending!==undefined&&reg.lim.pre_discard!==undefined,JSON.stringify(reg.lim));
  /* 🔒 못 보낸 변경은 사고의 유일한 증거다 — 다른 종류와 같은 상한을 주면 조용히 밀려난다 */
  ok('A2 pending 은 상한으로 밀려나지 않는다',reg.lim.pending>=999,String(reg.lim.pending));
  ok('A3 라벨이 붙어 있다(종류 문자열이 그대로 노출되지 않는다)',
     reg.lab[0]==='못보낸변경'&&reg.lab[1]==='버리기직전'&&reg.lab[2]==='자동',JSON.stringify(reg.lab));
  ok('A4 못보낸변경 배지에 색이 있다',reg.css,String(reg.css));
  ok('A5 함수가 전부 있다',reg.fns.every(t=>t==='function'),JSON.stringify(reg.fns));
  allErrs.push(...errs);await c.close();
 }

 /* ══ B) 평소 — 저장을 보내기 전에 박고, 확인되면 지운다 ══ */
 {
  const {c,p,errs}=await boot(b);
  const idle=await p.evaluate(()=>localStorage.getItem('rb_pending'));
  ok('B1 평소에는 미저장분이 남아 있지 않다',idle===null,String(idle&&idle.length));
  const w=await p.evaluate(()=>{pendWrite();
    const v=localStorage.getItem('rb_pending');
    return {has:!!v,n:v?JSON.parse(v).data.transactions.length:0,at:v?!!JSON.parse(v).at:false};});
  ok('B2 pendWrite 는 지금 상태를 통째로 박는다',w.has&&w.n===2&&w.at,JSON.stringify(w));
  const after=await p.evaluate(()=>{
    DB.transactions.push({id:'t3',type:'expense',date:'2026-10-13',cat:'이체',amt:1400000,memo:'카뱅'});
    save();
    return new Promise(res=>setTimeout(()=>res({
      pend:localStorage.getItem('rb_pending'),
      srv:window.__srv.state.data.transactions.length}),1500));});
  ok('B3 저장이 확인되면 미저장분을 지운다',after.pend===null,String(after.pend&&after.pend.length));
  ok('B4 서버에 실제로 들어갔다',after.srv===3,String(after.srv));
  allErrs.push(...errs);await c.close();
 }

 /* ══ C) 🔴 사고 — 저장이 확인되지 않으면 **남는다** ══ */
 {
  const {c,p,errs}=await boot(b);
  const st=await p.evaluate(()=>{
    window.__srv.netFail=true;         /* 서버에 닿지 못하는 상태 — 재시도도 전부 실패한다 */
    DB.transactions.push({id:'t9',type:'expense',date:'2026-10-13',cat:'이체',amt:1400000,memo:'카뱅 140만'});
    save();
    return new Promise(res=>setTimeout(()=>{
      const v=localStorage.getItem('rb_pending');
      res({pend:!!v,n:v?JSON.parse(v).data.transactions.length:0,
           srv:window.__srv.state.data.transactions.length,dirty:SAVE_DIRTY});},3000));});
  ok('C1 저장이 안 되면 미저장분이 로컬에 남는다',st.pend&&st.n===3,JSON.stringify(st));
  ok('C2 서버에는 아직 안 들어갔다(사고 상황 그대로)',st.srv===2,String(st.srv));
  /* 🔒 창을 닫으면 막아야 한다 — 이것만으로는 못 지키지만(모바일에선 거의 안 먹는다)
     그래서 위의 로컬 사본이 필요하다 */
  ok('C3 미저장 표시가 켜져 있다(창 닫기 경고)',st.dirty===true,String(st.dirty));
  allErrs.push(...errs);await c.close();
 }

 /* ══ D) 🔴 구조 — 다음 접속에 서버 스냅샷으로 건져 올린다 ══ */
 {
  const lost=STATE();
  lost.transactions.push({id:'t9',type:'expense',date:'2026-10-13',cat:'이체',amt:1400000,memo:'카뱅 140만'});
  const {c,p,errs}=await boot(b,{seedPending:{at:'2026-10-13T05:00:00.000Z',ver:'4.30',data:lost}});
  const log=await snaplog(p);
  const g=await p.evaluate(()=>({
    pend:localStorage.getItem('rb_pending'),
    db:DB.transactions.length,
    srv:window.__srv.state.data.transactions.length}));
  const pend=log.filter(x=>x.kind==='pending');
  ok('D1 못 보낸 변경이 스냅샷으로 올라간다',pend.length===1&&pend[0].n===3,JSON.stringify(log));
  ok('D2 언제 입력한 것인지 적는다',pend.length===1&&/2026-10-13 05:00/.test(pend[0].note||''),
     JSON.stringify(pend[0]&&pend[0].note));
  ok('D3 올린 뒤 로컬에서 지운다(다음 접속에 두 벌이 되지 않게)',g.pend===null,String(g.pend&&g.pend.length));
  /* 🔒 가장 중요한 것 — **자동으로 덮지 않는다.** v3.6 에 단어 96건을 두 번 날린 짓이다 */
  ok('D4 화면을 자동으로 덮지 않는다(보존만 한다)',g.db===2,String(g.db));
  allErrs.push(...errs);await c.close();
 }

 /* ══ E) 서버본과 같으면 올리지 않는다 — 같은 것을 두 벌 만들지 않는다 ══ */
 {
  const {c,p,errs}=await boot(b,{seedPending:{at:'2026-10-13T05:00:00.000Z',ver:'4.30',data:STATE()}});
  const log=await snaplog(p);
  const g=await p.evaluate(()=>localStorage.getItem('rb_pending'));
  ok('E1 내용이 같으면 스냅샷을 만들지 않는다',!log.some(x=>x.kind==='pending'),JSON.stringify(log));
  ok('E2 그래도 로컬은 지운다',g===null,String(g&&g.length));
  allErrs.push(...errs);await c.close();
 }

 /* ══ F) 🔴 충돌창에서 「버린다」를 골라도 내 화면이 먼저 남는다 ══ */
 {
  const {c,p,errs}=await boot(b);
  await p.evaluate(()=>{
    /* 3자 병합이 깨진 상황을 만든다 — 그때만 옛 확인창으로 간다 */
    window.mrg3=function(){throw new Error('강제 실패');};
    window.confirm=function(){return false;};     /* 로한이 「버린다」를 골랐다 */
    /* 🔒 **서버에만 있는 레코드가 있어야** 확인창이 뜬다 —
       잃을 게 0이면 앱은 묻지 않고 저장한다(v3.6: 잃을 게 없는데 묻는 창은 안 읽힌다).
       거래는 흡수 대상이 아니라(앱이 지울 수 있다) loss 로 센다. */
    window.__srv.state.data.transactions.push(
      {id:'srv1',type:'expense',date:'2026-10-12',cat:'식비',method:'이체',amt:9000,memo:'다른 기기'});
    window.__srv.state.at='2026-10-14T00:00:00.000Z';
    DB.transactions.push({id:'t9',type:'expense',date:'2026-10-13',cat:'이체',amt:1400000,memo:'카뱅 140만'});
    save();});
  /* 🔒 여기서 앱은 실제로 새로고침한다 — 그래서 증거를 localStorage 에서 읽는다 */
  await p.waitForTimeout(3000);
  const log=await snaplog(p);
  const disc=log.filter(x=>x.kind==='pre_discard');
  ok('F1 버리기 직전 내 화면이 스냅샷으로 남는다',disc.length===1&&disc[0].n===3,JSON.stringify(log));
  /* 🔒 그리고 **같은 것을 또 건지지 않는다** — pre_discard 를 남긴 뒤 pending 을 지웠으니
     새로고침 뒤 pendRescue 가 다시 올려 두 벌이 되면 안 된다 */
  ok('F2 새로고침 뒤 같은 것을 또 올리지 않는다',!log.some(x=>x.kind==='pending'),JSON.stringify(log));
  allErrs.push(...errs);await c.close();
 }

 for(const r of R)assert.ok(r.v,r.n+(r.x!==undefined?'  → '+r.x:''));
 assert.deepEqual(allErrs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
