/* t70 — 🧱 v5 P1 키별 저장 (app_kv)
   🔴 로한: 「실시간 저장인데 왜 자꾸 변경의 충돌이 일어나는거야?」 — 모든 데이터가 한 칸(95만 자)이었다.
   🔒 불변식:
      K1 kvSplit → kvJoin 왕복이 손실 없다(ui 제외)
      K2 app_kv 행이 있으면 kv 로 불러온다
      K3 뽀모 한 판 = study/pomos 키만 보낸다
      K4 화면 상태만 바뀌면 서버에 아무것도 안 보낸다(기기 로컬 rb_ui)
      K5 같은 키 충돌 → 그 키만 3자 병합, 양쪽 변경이 다 산다
      K6 다른 키를 남이 고쳐도 내 저장은 충돌하지 않는다
      K7 한 키라도 rev 가 어긋나면 아무것도 안 쓴다(원자성)
      K8 rb_kv=off 이면 옛 길(app_state)
      K9 pref(pomoRun 등)는 서버로 간다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  /* 가짜 서버 — app_kv · kv_save(rev 잠금) · app_state */
  const S=window.__S={kv:{},calls:[],blobWrites:0};
  const seed={transactions:[{id:'t1',type:'expense',amt:1000,date:'2026-11-01',cat:'식비',method:'현금'}],
    budgets:{식비:100,카페:50},study:{words:[{id:'w1',jp:'猫'}],pomos:[{id:'p1',min:25}],v:1},
    goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],
    ui:{logTab:'act',pomo:{focus:25},pomoRun:null},schemaVersion:9};
  window.__seed=seed;
  function put(k,v){S.kv[k]={data:JSON.parse(JSON.stringify(v)),rev:1};}
  /* 서버 kv_split 과 같은 규칙 */
  const KIDS={study:['words','sents','units','drills','errors','pomos','tests','strategy'],health:['labValues','metrics','weights'],insurance:['covers','policies'],saju:['readings']};
  const PREF=['pomoRun','pomo','seenNotes','watchCats'];
  Object.keys(seed).forEach(k=>{const v=seed[k];
    if(k==='ui'){const p={};PREF.forEach(f=>{if(v[f]!==undefined)p[f]=v[f];});put('pref',p);return;}
    if(KIDS[k]){const rest={};Object.keys(v).forEach(c=>{if(KIDS[k].includes(c))put(k+'/'+c,v[c]);else rest[c]=v[c];});put(k+'/rest',rest);return;}
    put(k,v);});
  if(window.__noKv)S.kv={};
  function q(name){const st={name,upd:null};const o={
    select(){return o},eq(){return o},order(){return o},limit(){return o},in(){return o},
    update(v){st.upd=v;if(name==='app_state')S.blobWrites++;return o},upsert(){if(name==='app_state')S.blobWrites++;return Promise.resolve({})},
    insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){ if(name==='app_state')return Promise.resolve({data:{data:seed,updated_at:'2026-11-06T00:00:00Z',ui:seed.ui},error:null});
      return Promise.resolve({data:null,error:null});},
    then(a,b){ let data=[];
      if(name==='app_kv')data=Object.keys(S.kv).map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev}));
      if(name==='app_state'&&st.upd)data=[{updated_at:st.upd.updated_at}];
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn==='kv_verify')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    if(fn!=='kv_save')return Promise.resolve({data:null,error:null});
    const ch=args.p_changes; S.calls.push(ch.map(c=>c.key));
    const conf=[];
    ch.forEach(c=>{const cur=S.kv[c.key];const want=c.rev||0;
      if(cur){if(cur.rev!==want)conf.push({key:c.key,data:JSON.parse(JSON.stringify(cur.data)),rev:cur.rev});}
      else if(want!==0)conf.push({key:c.key,data:null,rev:0});});
    if(conf.length)return Promise.resolve({data:{ok:false,conflicts:conf},error:null});
    const revs={};
    ch.forEach(c=>{ if(c.del){delete S.kv[c.key];revs[c.key]=0;return;}
      const cur=S.kv[c.key];S.kv[c.key]={data:JSON.parse(JSON.stringify(c.data)),rev:cur?cur.rev+1:1};revs[c.key]=S.kv[c.key].rev;});
    return Promise.resolve({data:{ok:true,revs},error:null});
  }
  window.supabase={createClient:()=>({from:q,rpc,
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1800);
  const wait=()=>p.waitForTimeout(900);

  /* K1 — 실제 같은 모양으로 왕복 */
  const K1=await p.evaluate(()=>{const d=JSON.parse(JSON.stringify(DB));const u=d.ui;delete d.ui;
    const j=kvJoin(kvSplit(Object.assign({},d)));return stableStr(j)===stableStr(d);});
  ok('K1 kvSplit→kvJoin 왕복 무손실',K1);
  ok('K2 app_kv 로 불러왔다',await p.evaluate(()=>KV_ON===true));
  ok('K2b 데이터가 그대로',await p.evaluate(()=>DB.study.words.length===1&&DB.budgets.식비===100));

  /* 접속 직후 저장(migrate 등)이 끝나기를 기다린 뒤 호출 기록을 비운다 */
  await wait(); await p.evaluate(()=>{window.__S.calls=[];});
  await p.evaluate(()=>{DB.study.pomos.push({id:'p2',min:25});save();});await wait();
  const c3=await p.evaluate(()=>window.__S.calls);
  ok('K3 🔴 뽀모 한 판 = study/pomos 만',c3.length===1&&c3[0].length===1&&c3[0][0]==='study/pomos',JSON.stringify(c3));
  ok('K3b 서버에 반영',await p.evaluate(()=>window.__S.kv['study/pomos'].data.length===2&&window.__S.kv['study/pomos'].rev===2));

  await p.evaluate(()=>{window.__S.calls=[];DB.ui.logTab='ver';save();});await wait();
  const c4=await p.evaluate(()=>({c:window.__S.calls,loc:JSON.parse(localStorage.getItem('rb_ui')||'{}').logTab}));
  ok('K4 🔴 화면 상태만 바뀌면 서버로 안 보낸다',c4.c.length===0,JSON.stringify(c4.c));
  ok('K4b 기기 로컬에 남는다',c4.loc==='ver',c4.loc);

  /* K5 — 남(생활사)이 budgets.카페 를 고치는 사이 내가 budgets.식비 를 고친다 */
  await p.evaluate(()=>{const s=window.__S.kv.budgets;s.data.카페=77;s.rev++;window.__S.calls=[];
    DB.budgets.식비=200;save();});await p.waitForTimeout(1500);
  const K5=await p.evaluate(()=>({db:DB.budgets,srv:window.__S.kv.budgets.data,calls:window.__S.calls}));
  ok('K5 🔴 같은 키 충돌 → 양쪽 변경이 다 산다',K5.srv.식비===200&&K5.srv.카페===77&&K5.db.카페===77,JSON.stringify(K5));
  ok('K5b 다시 보낸 것도 그 키만',K5.calls.every(x=>x.length===1&&x[0]==='budgets'),JSON.stringify(K5.calls));

  /* K6 — 남이 transactions 를 고쳐도 study 저장은 걸리지 않는다 */
  await p.evaluate(()=>{const s=window.__S.kv.transactions;s.data.push({id:'t9',amt:5,type:'expense',date:'2026-11-06'});s.rev++;
    window.__S.calls=[];DB.study.words.push({id:'w2',jp:'犬'});save();});await wait();
  const K6=await p.evaluate(()=>({calls:window.__S.calls,w:window.__S.kv['study/words'].data.length,t:window.__S.kv.transactions.data.length}));
  ok('K6 🔴 남의 키 변경은 내 저장과 충돌하지 않는다',K6.calls.length===1&&K6.w===2&&K6.t===2,JSON.stringify(K6));

  /* K7 — 원자성: 두 키를 보내는데 하나가 어긋나면 하나도 안 쓴다 (서버 함수 흉내 그대로 확인) */
  const K7=await p.evaluate(async()=>{const S=window.__S;const r1=S.kv.budgets.rev,r2=S.kv['study/pomos'].rev;
    const res=await SB.rpc('kv_save',{p_changes:[{key:'budgets',data:{x:1},rev:r1},{key:'study/pomos',data:[],rev:r2-1}]});
    return {ok:res.data.ok,b:S.kv.budgets.rev===r1,p:S.kv['study/pomos'].data.length};});
  ok('K7 한 키라도 어긋나면 아무것도 안 쓴다',K7.ok===false&&K7.b&&K7.p===2,JSON.stringify(K7));

  /* K9 — pref 는 서버로 */
  await p.evaluate(()=>{window.__S.calls=[];DB.ui.pomoRun={phase:'focus',at:1};save();});await wait();
  ok('K9 pomoRun 은 기기 사이에 나눈다(pref)',await p.evaluate(()=>window.__S.calls.length===1&&window.__S.calls[0][0]==='pref'&&window.__S.kv.pref.data.pomoRun.phase==='focus'));
  ok('K10 저장 실패·충돌 배지 없이 끝났다',await p.evaluate(()=>!/실패|안 됨/.test((document.getElementById('savebadge')||{}).textContent||'')));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();

  /* K8 — 끄기 스위치 */
  const ctx2=await b.newContext({viewport:{width:1200,height:800}});
  await ctx2.addInitScript(()=>{try{localStorage.setItem('rb_kv','off');}catch(e){}});
  await ctx2.addInitScript(FAKE);
  const p2=await ctx2.newPage();await p2.route('**/*supabase*',r=>r.abort());
  await p2.goto('file://'+file);await p2.waitForTimeout(1800);
  await p2.evaluate(()=>{window.__S.calls=[];window.__S.blobWrites=0;DB.budgets.식비=300;save();});await p2.waitForTimeout(900);
  const K8=await p2.evaluate(()=>({kv:KV_ON,calls:window.__S.calls.length,blob:window.__S.blobWrites}));
  ok('K8 rb_kv=off 이면 옛 길(app_state)',K8.kv===false&&K8.calls===0&&K8.blob>=1,JSON.stringify(K8));
  await ctx2.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t70 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
