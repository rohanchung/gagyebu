/* t72 — ⚡ v5 P4 동기화·속도
   🔒 S1 처음 켜면 전부 받고, 기기 사본(IndexedDB)을 남긴다
      S2 다시 켜면 판 번호만 묻고 **바뀐 칸만** 받는다
      S3 다른 곳이 바꾼 칸은 열린 탭에 들어온다(kvPull) — 화면도 다시 그린다
      S4 내 쪽에 안 보낸 변경과 서버 변경이 같은 칸이면 3자 병합 → 둘 다 산다 → 다시 저장
      S5 내가 저장한 칸은 다시 받지 않는다
      S6 실시간 신호는 kv_ping 을 구독한다(app_kv 통째가 아니라)
      S7 입력 중이면 화면을 다시 그리지 않는다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  /* 새로고침해도 남는 가짜 서버(localStorage __fk) */
  const now=()=>new Date(Date.now()+ (window.__skew||0)).toISOString();
  let S; try{S=JSON.parse(localStorage.getItem('__fk')||'null');}catch(e){S=null;}
  if(!S){
    const seed={transactions:[{id:'t1',type:'expense',amt:1000,date:'2026-11-01',cat:'식비',method:'현금'}],
      budgets:{식비:100,카페:50},study:{words:[{id:'w1',jp:'猫'}],pomos:[],v:1},
      goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9};
    S={kv:{},fetch:[],subs:[]};
    const at=now();
    Object.keys(seed).forEach(k=>{const v=seed[k];
      if(k==='study'){['words','pomos'].forEach(c=>S.kv['study/'+c]={data:v[c],rev:1,at});S.kv['study/rest']={data:{v:1},rev:1,at};return;}
      S.kv[k]={data:v,rev:1,at};});
    S.kv.pref={data:{},rev:1,at};
  }
  window.__S=S; const persist=()=>{try{localStorage.setItem('__fk',JSON.stringify(S));}catch(e){}};
  window.__persist=persist; S.fetch=[]; S.subs=[];
  function q(name){const st={cols:'',inKeys:null,gt:null};const o={
    select(c){st.cols=c||'';return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(c,v){st.gt=v;return o},update(){return o},upsert(){return Promise.resolve({})},
    insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];
      if(name==='app_kv'){
        let ks=Object.keys(S.kv);
        if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
        if(st.gt)ks=ks.filter(k=>S.kv[k].at>st.gt);
        const withData=/data/.test(st.cols);
        if(withData)S.fetch.push(ks.slice());
        data=ks.map(k=>withData?{key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}:{key:k,rev:S.kv[k].rev,updated_at:S.kv[k].at});
      }
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn==='kv_verify')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    if(fn!=='kv_save')return Promise.resolve({data:null,error:null});
    const ch=args.p_changes, conf=[];
    ch.forEach(c=>{const cur=S.kv[c.key];const want=c.rev||0;
      if(cur){if(cur.rev!==want)conf.push({key:c.key,data:JSON.parse(JSON.stringify(cur.data)),rev:cur.rev});}
      else if(want!==0)conf.push({key:c.key,data:null,rev:0});});
    if(conf.length)return Promise.resolve({data:{ok:false,conflicts:conf},error:null});
    const revs={},ats={};
    ch.forEach(c=>{if(c.del){delete S.kv[c.key];revs[c.key]=0;return;}
      const cur=S.kv[c.key];const at=now();S.kv[c.key]={data:JSON.parse(JSON.stringify(c.data)),rev:cur?cur.rev+1:1,at};revs[c.key]=S.kv[c.key].rev;ats[c.key]=at;});
    persist();
    return Promise.resolve({data:{ok:true,revs,ats},error:null});
  }
  window.__other=function(key,fn){const cur=S.kv[key];cur.data=fn(JSON.parse(JSON.stringify(cur.data)));cur.rev++;cur.at=now();persist();};
  const ch={on(ev,f,cb){S.subs.push(f);return ch;},subscribe(){return ch;}};
  window.supabase={createClient:()=>({from:q,rpc,channel:()=>ch,
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
  const L1=await p.evaluate(()=>({info:KV_LOADINFO,on:KV_ON}));
  ok('S1 처음엔 전부 받는다',L1.on&&L1.info&&L1.info.fetched===L1.info.keys&&L1.info.cached===0,JSON.stringify(L1));
  ok('S6 실시간 신호는 kv_ping 구독',await p.evaluate(()=>window.__S.subs.some(f=>f&&f.table==='kv_ping')));
  await p.waitForTimeout(3500);   /* 기기 사본 저장(2.5초 뒤) + 접속 직후 저장 마무리 */

  /* S3 — 다른 곳(생활사)이 거래를 넣는다 → 열린 탭이 받아 온다 */
  await p.click('.m[data-v="cal"]');await p.waitForTimeout(300);
  await p.evaluate(()=>window.__other('transactions',d=>{d.push({id:'t9',type:'expense',amt:7000,date:'2026-11-02',cat:'카페',method:'현금',memo:'다른곳'});return d;}));
  const n3=await p.evaluate(async()=>{window.__S.fetch=[];return await kvPull('시험');});
  const S3=await p.evaluate(()=>({has:DB.transactions.some(t=>t.id==='t9'),fetch:window.__S.fetch,badge:(document.getElementById('savebadge')||{}).textContent}));
  ok('S3 🔴 다른 곳의 변경이 열린 탭에 들어온다',n3===1&&S3.has,JSON.stringify(S3));
  ok('S3b 바뀐 칸만 받는다(transactions)',S3.fetch.length===1&&S3.fetch[0].length===1&&S3.fetch[0][0]==='transactions',JSON.stringify(S3.fetch));
  ok('S3c 받았다고 알린다',/받아왔다/.test(S3.badge||''),S3.badge);

  /* S4 — 내 화면엔 안 보낸 변경(식비 200), 서버엔 남의 변경(카페 77) — 같은 칸 */
  await p.evaluate(()=>{DB.budgets.식비=200;window.__other('budgets',d=>{d.카페=77;return d;});});
  await p.evaluate(async()=>{await kvPull('시험');});await p.waitForTimeout(1500);
  const S4=await p.evaluate(()=>({db:DB.budgets,srv:window.__S.kv.budgets.data}));
  ok('S4 🔴 같은 칸이면 병합 — 둘 다 산다',S4.db.식비===200&&S4.db.카페===77,JSON.stringify(S4));
  ok('S4b 병합본을 다시 저장한다',S4.srv.식비===200&&S4.srv.카페===77,JSON.stringify(S4.srv));

  /* S5 — 내가 저장한 칸은 다시 받지 않는다 */
  await p.evaluate(()=>{DB.study.pomos.push({id:'p1',min:25});save();});await p.waitForTimeout(1200);
  const S5=await p.evaluate(async()=>{window.__S.fetch=[];const n=await kvPull('시험');return {n,fetch:window.__S.fetch};});
  ok('S5 내 저장은 다시 안 받는다',S5.n===0&&S5.fetch.length===0,JSON.stringify(S5));

  /* S7 — 입력 중이면 다시 그리지 않는다 */
  const S7=await p.evaluate(async()=>{
    const inp=document.createElement('input');inp.id='__typing';document.getElementById('v-cal').appendChild(inp);inp.focus();inp.value='쓰는 중';
    window.__other('transactions',d=>{d.push({id:'t10',type:'expense',amt:1,date:'2026-11-03',cat:'기타',method:'현금'});return d;});
    await kvPull('시험');
    const still=document.getElementById('__typing');
    return {kept:!!still&&still.value==='쓰는 중',got:DB.transactions.some(t=>t.id==='t10')};});
  ok('S7 입력 중이면 화면을 안 다시 그린다(쓰던 글 보존) · 데이터는 받는다',S7.kept&&S7.got,JSON.stringify(S7));

  /* S2 — 닫혀 있는 동안 서버에서 한 칸이 바뀌었다 → 다시 켜면 그 칸만 받는다 */
  await p.waitForTimeout(3200);   /* 기기 사본 갱신 */
  await p.evaluate(()=>window.__other('budgets',d=>{d.배달=30;return d;}));
  await p.reload();await p.waitForTimeout(1800);
  const L2=await p.evaluate(()=>({info:KV_LOADINFO,v:DB.budgets.배달,t9:DB.transactions.some(t=>t.id==='t9'),p1:DB.study.pomos.length,fetch:window.__S.fetch}));
  ok('S2 🔴 다시 켜면 바뀐 칸만 받는다',L2.info&&L2.info.fetched===1&&L2.info.cached===L2.info.keys-1,JSON.stringify(L2));
  ok('S2b 데이터는 전부 최신',L2.v===30&&L2.t9&&L2.p1===1,JSON.stringify(L2));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t72 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
