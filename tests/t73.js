/* t73 — 🧩 id 없는 「쌓이는 칸」 병합 (v4.83)
   🔴 activity 는 거의 모든 저장에 한 줄씩 붙는데 줄마다 id 가 없었다 — 두 기기가 각자 쓰면 mrg3 가 「같은 칸 충돌」로 보고
      내 것으로 덮었다(상대 기기 줄 증발 + 매번 덮어쓰기 직전 스냅샷).
   🔒 M1 저장 충돌(kv_save) — 양쪽 활동 줄이 다 산다 · 스냅샷을 찍지 않는다(충돌이 아니다)
      M2 받아오기(kvPull) — 안 보낸 내 줄 + 서버 줄이 다 산다
      M3 최신순 · 200줄
      M4 200줄이 넘쳐 한쪽이 잘라낸 옛 줄은 되살리지 않는다
      M5 netSnapshots — 달(m)별: 내가 바꾼 달은 내 것, 남이 바꾼 달은 서버 것 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const now=()=>new Date().toISOString();
  const S={kv:{},snaps:0}; window.__S=S;
  const seed={transactions:[],budgets:{식비:100},study:{words:[],pomos:[],v:1},goals:[],routines:[],checks:{},timelog:{},meals:{},
    accounts:[],cards:[],schemaVersion:9,actTzFixed:1,   /* 시각 보정(+9h) 이전 작업이 돌지 않게 */
    activity:[{t:'2026-11-06 09:00',m:'아침 기록'}],
    netSnapshots:[{m:'2026-09',a:90,l:50},{m:'2026-10',a:100,l:50}]};
  const at=now();
  Object.keys(seed).forEach(k=>{const v=seed[k];
    if(k==='study'){['words','pomos'].forEach(c=>S.kv['study/'+c]={data:v[c],rev:1,at});S.kv['study/rest']={data:{v:1},rev:1,at};return;}
    S.kv[k]={data:v,rev:1,at};});
  S.kv.pref={data:{},rev:1,at};
  function q(name){const st={cols:'',inKeys:null,gt:null};const o={
    select(c){st.cols=c||'';return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(c,v){st.gt=v;return o},update(){return o},upsert(){return Promise.resolve({})},
    insert(){if(name==='app_state_snap')S.snaps++;return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];
      if(name==='app_kv'){let ks=Object.keys(S.kv);
        if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
        if(st.gt)ks=ks.filter(k=>S.kv[k].at>st.gt);
        const wd=/data/.test(st.cols);
        data=ks.map(k=>wd?{key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}:{key:k,rev:S.kv[k].rev,updated_at:S.kv[k].at});}
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
      const cur=S.kv[c.key];const a=now();S.kv[c.key]={data:JSON.parse(JSON.stringify(c.data)),rev:cur?cur.rev+1:1,at:a};revs[c.key]=S.kv[c.key].rev;ats[c.key]=a;});
    return Promise.resolve({data:{ok:true,revs,ats},error:null});
  }
  window.__other=function(key,fn){const cur=S.kv[key];cur.data=fn(JSON.parse(JSON.stringify(cur.data)));cur.rev++;cur.at=now();};
  const ch={on(){return ch;},subscribe(){return ch;}};
  window.supabase={createClient:()=>({from:q,rpc,channel:()=>ch,
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1800);
  await p.waitForTimeout(1500);
  ok('M0 kv 로 불러왔다',await p.evaluate(()=>KV_ON===true));

  /* M1 — 폰(다른 기기)이 한 줄 쓰는 사이 PC(나)도 한 줄 쓰고 저장 */
  await p.evaluate(()=>{window.__S.snaps=0;
    window.__other('activity',d=>{d.unshift({t:'2026-11-06 15:00',m:'📱 폰에서 뽀모 25분'});return d;});
    DB.activity.unshift({t:'2026-11-06 15:01',m:'💻 PC 에서 거래 추가'});save();});
  await p.waitForTimeout(1800);
  const M1=await p.evaluate(()=>({srv:window.__S.kv.activity.data.map(x=>x.m),db:DB.activity.map(x=>x.m),snaps:window.__S.snaps,
    badge:(document.getElementById('savebadge')||{}).textContent}));
  ok('M1 🔴 저장 충돌에서 양쪽 활동 줄이 다 산다',M1.srv.includes('📱 폰에서 뽀모 25분')&&M1.srv.includes('💻 PC 에서 거래 추가')&&M1.srv.includes('아침 기록'),JSON.stringify(M1));
  ok('M1b 화면(DB)에도 둘 다',M1.db.includes('📱 폰에서 뽀모 25분')&&M1.db.includes('💻 PC 에서 거래 추가'),JSON.stringify(M1.db));
  ok('M1c 충돌로 치지 않는다 — 덮어쓰기 직전 스냅샷 0',M1.snaps===0,M1.snaps);
  ok('M3 최신순',M1.srv[0]==='💻 PC 에서 거래 추가'&&M1.srv[1]==='📱 폰에서 뽀모 25분',JSON.stringify(M1.srv));

  /* M2 — 받아오기: 내 쪽 안 보낸 줄 + 서버 줄 */
  await p.evaluate(()=>{window.__other('activity',d=>{d.unshift({t:'2026-11-06 16:00',m:'📱 폰 두 번째'});return d;});
    DB.activity.unshift({t:'2026-11-06 16:01',m:'💻 안 보낸 줄'});});
  await p.evaluate(async()=>{await kvPull('시험');});await p.waitForTimeout(1500);
  const M2=await p.evaluate(()=>({db:DB.activity.map(x=>x.m),srv:window.__S.kv.activity.data.map(x=>x.m)}));
  ok('M2 🔴 받아오기에서도 둘 다 산다(그리고 다시 저장)',M2.db.includes('📱 폰 두 번째')&&M2.db.includes('💻 안 보낸 줄')&&M2.srv.includes('💻 안 보낸 줄'),JSON.stringify(M2));

  /* M3/M4 — 순수 함수 */
  const U=await p.evaluate(()=>{
    const mk=(n,h)=>({t:'2026-11-0'+h+' 10:'+String(n).padStart(2,'0'),m:'줄'+n});
    const base=[mk(1,1)];
    const s=[];const l=[mk(1,1)];       /* 서버는 넘쳐서 옛 줄 1 을 잘라냈다 */
    const r=mrgLog(base,l,s);
    const big=[];for(let i=0;i<250;i++)big.push({t:'2026-10-'+String(1+(i%28)).padStart(2,'0')+' '+String(i).padStart(4,'0'),m:'x'+i});
    const r2=mrgLog([],big,[]);
    return {trim:r.length,cap:r2.length};});
  ok('M4 한쪽이 잘라낸 옛 줄은 되살리지 않는다',U.trim===0,U.trim);
  ok('M3b 200줄로 자른다',U.cap===200,U.cap);

  /* M5 — 월별 자산: 남은 10월, 나는 11월 */
  await p.evaluate(()=>{window.__S.snaps=0;
    window.__other('netSnapshots',d=>{d.find(x=>x.m==='2026-10').a=111;return d;});
    /* 이번 달 행은 저장마다 원장에서 다시 계산된다(netSnapTouch) — 지난 달로 시험한다 */
    DB.netSnapshots=DB.netSnapshots.map(x=>x.m==='2026-09'?Object.assign({},x,{a:222}):x);save();});
  await p.waitForTimeout(1800);
  const M5=await p.evaluate(()=>({srv:window.__S.kv.netSnapshots.data,snaps:window.__S.snaps}));
  const oct=M5.srv.find(x=>x.m==='2026-10')||{}, nov=M5.srv.find(x=>x.m==='2026-09')||{};
  ok('M5 🔴 달별 병합 — 남이 바꾼 10월(111) · 내가 바꾼 9월(222) 둘 다',oct.a===111&&nov.a===222,JSON.stringify(M5));
  ok('M5b 충돌 스냅샷 0',M5.snaps===0,M5.snaps);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t73 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
