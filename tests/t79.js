/* t79 — 💾 드릴 중 저장 묶기 · ↵ 한 번 더 · 👍 엄지 자리 (v4.89)
   로한: 「저장 묶기 하고, 한번더 버튼도 엔터로, 패드에선 다음이 가운데라 불편 — 오른손 엄지 위치로」
   v4.91 P3 패드(hover 있다고 답하는 기기)도 손가락·펜으로 누르면 엄지 자리 · O 오답 카드 가운데·크게
   🔒 B1 드릴 중엔 답마다 서버로 안 보낸다(모아서) · B2 답마다 기기엔 남긴다(rb_pending)
      B3 세트가 끝나면 바로 올린다 · B4 화면을 떠나면 바로 올린다
      E1 결과 화면에서 엔터 = 한 번 더
      P1 컴퓨터는 가운데 그대로 · P2 손가락 화면(hover:none)은 「다음」이 오른쪽 아래에 고정 · 저장 배지는 왼쪽으로 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{},saves:0}; window.__S=S; const at=new Date().toISOString();
  const words=[];for(let i=0;i<12;i++)words.push({id:'w'+i,kana:'か'+i,ko:'뜻'+i,seen:0,miss:0,streak:0});
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv['study/words']={data:words,rev:1,at}; S.kv['study/drills']={data:[],rev:1,at}; S.kv['study/rest']={data:{v:1},rev:1,at}; S.kv.pref={data:{},rev:1,at};
  function q(name){const st={cols:'',inKeys:null};const o={select(c){st.cols=c||'';return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn!=='kv_save')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    S.saves++; const revs={},ats={};
    args.p_changes.forEach(c=>{const cur=S.kv[c.key];S.kv[c.key]={data:c.data,rev:cur?cur.rev+1:1,at:new Date().toISOString()};revs[c.key]=S.kv[c.key].rev;ats[c.key]=S.kv[c.key].at;});
    return Promise.resolve({data:{ok:true,revs,ats},error:null});}
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
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  ok('B0 kv 로 불러왔다',await p.evaluate(()=>KV_ON===true));
  /* B1·B2 — 5문항을 빠르게 */
  await p.evaluate(()=>{DB.ui.stdMode='r2m';stDrillStart('r2m',10);});await p.waitForTimeout(1200);
  const s0=await p.evaluate(()=>window.__S.saves);
  for(let i=0;i<5;i++){
    await p.evaluate(()=>{const w=stWordById(ST_DRILL.ids[ST_DRILL.i]);stDrillGrade(String(w.ko));});await p.waitForTimeout(150);
    await p.evaluate(()=>stDrillNext());await p.waitForTimeout(150);
  }
  await p.waitForTimeout(1200);
  const B=await p.evaluate(()=>({saves:window.__S.saves,pend:(JSON.parse(localStorage.getItem('rb_pending')||'null')||{}).data,badge:(document.getElementById('savebadge')||{}).textContent}));
  ok('B1 🔴 드릴 중엔 답마다 서버로 안 보낸다',B.saves===s0,s0+'→'+B.saves);
  ok('B2 답은 기기에 바로 남는다(rb_pending)',!!(B.pend&&B.pend.study&&B.pend.study.words.filter(w=>w.seen>0).length===5),'');
  ok('B2b 배지가 「모아서 저장」을 말한다',/모아서 저장/.test(B.badge||''),B.badge);
  /* B4 — 화면을 떠나면 바로 */
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await p.waitForTimeout(800);
  const s4=await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});return window.__S.saves;});
  ok('B4 화면을 떠나면 모아 둔 것을 바로 올린다',s4===s0+1,s0+'→'+s4);
  /* B3 — 끝내면 바로 */
  await p.evaluate(()=>{const w=stWordById(ST_DRILL.ids[ST_DRILL.i]);stDrillGrade(String(w.ko));});await p.waitForTimeout(100);
  await p.evaluate(()=>stDrillQuit());await p.waitForTimeout(1200);
  const s3=await p.evaluate(()=>window.__S.saves);
  ok('B3 세트가 끝나면 바로 올린다',s3===s4+1,s4+'→'+s3);
  /* E1 — 결과 화면에서 엔터 */
  const E=await p.evaluate(()=>{const before=ST_DRILL&&ST_DRILL.fin, again=!!document.querySelector('#v-study .stagain');
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    return {before,again,after:ST_DRILL&&!ST_DRILL.fin&&ST_DRILL.i===0};});
  ok('E1 🔴 결과 화면에서 엔터 = 한 번 더',E.before&&E.again&&E.after,JSON.stringify(E));
  /* P1 — 컴퓨터: 가운데 그대로 */
  await p.evaluate(()=>{const w=stWordById(ST_DRILL.ids[0]);stDrillGrade(String(w.ko));});await p.waitForTimeout(200);
  const P1=await p.evaluate(()=>{const n=document.querySelector('#v-study .stnext');return {pos:getComputedStyle(n).position,jc:getComputedStyle(n).justifyContent};});
  ok('P1 컴퓨터는 가운데 그대로',P1.pos==='static'&&P1.jc==='center',JSON.stringify(P1));
  /* P3 — v4.91 패드: hover 가 있다고 답하는 기기라도 손가락·펜으로 누르면 엄지 자리로 · 마우스로 누르면 돌아온다 */
  const pos=()=>p.evaluate(()=>getComputedStyle(document.querySelector('#v-study .stnext')).position);
  await p.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointerup',{pointerType:'pen',bubbles:true})));
  const P3a=await pos(); await p.waitForTimeout(600); const P3b=await pos();
  ok('P3 🔴 패드(펜·손가락)로 누르면 「다음」이 오른쪽 아래로 — 누르는 순간엔 안 움직인다',P3a==='static'&&P3b==='fixed',P3a+'→'+P3b);
  await p.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointerup',{pointerType:'mouse',bubbles:true})));await p.waitForTimeout(600);
  ok('P3b 마우스로 누르면 다시 가운데',(await pos())==='static');
  /* O — v4.91 오답 카드는 가운데 · 크게 */
  await p.evaluate(()=>{stDrillNext();stDrillGrade('틀린답xx');});await p.waitForTimeout(200);
  const O=await p.evaluate(()=>{const c=document.querySelector('#v-study .oops');if(!c)return null;const r=c.getBoundingClientRect(),pr=c.parentElement.getBoundingClientRect();
    return {ta:getComputedStyle(c).textAlign,k:parseFloat(getComputedStyle(c.querySelector('.oopsk')).fontSize),ko:parseFloat(getComputedStyle(c.querySelector('.oopsko')).fontSize),
      mid:Math.abs((r.left+r.right)/2-(pr.left+pr.right)/2)};});
  ok('O1 🔴 오답 카드가 가운데(정렬·위치)',O&&O.ta==='center'&&O.mid<4,JSON.stringify(O));
  ok('O2 글씨가 크다(가나 ≥34 · 뜻 ≥20)',O&&O.k>=34&&O.ko>=20,JSON.stringify(O));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
  /* P2 — 손가락 화면(태블릿): 터치 기기 창에서 연다(hover:none) */
  const ctx2=await b.newContext({viewport:{width:1024,height:768},hasTouch:true});
  await ctx2.addInitScript(FAKE);
  const p2=await ctx2.newPage();await p2.route('**/*supabase*',r=>r.abort());
  await p2.goto('file://'+file);await p2.waitForTimeout(2500);
  await p2.evaluate(()=>{DB.ui.stdMode='r2m';document.querySelector('.side .m[data-v="study"]').click();stDrillStart('r2m',5);});await p2.waitForTimeout(300);
  await p2.evaluate(()=>{const w=stWordById(ST_DRILL.ids[0]);stDrillGrade(String(w.ko));});await p2.waitForTimeout(300);
  const P2=await p2.evaluate(()=>{const n=document.querySelector('#v-study .stnext .btn'), r=n.getBoundingClientRect(), sb=getComputedStyle(document.getElementById('savebadge'));
    return {hov:matchMedia('(hover:none)').matches,pos:getComputedStyle(n.parentElement).position,right:innerWidth-r.right,bottom:innerHeight-r.bottom,w:r.width,h:r.height,sbLeft:sb.left};});
  ok('P2 🔴 손가락 화면: 「다음」이 오른쪽 아래에 고정(엄지 자리)',P2.pos==='fixed'&&P2.right<40&&P2.bottom<40,JSON.stringify(P2));
  ok('P2b 크게(58px 이상)',P2.h>=58&&P2.w>=132,JSON.stringify(P2));
  ok('P2c 저장 배지는 왼쪽으로 비킨다',parseFloat(P2.sbLeft)<40,JSON.stringify(P2));
  await ctx2.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t79 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
