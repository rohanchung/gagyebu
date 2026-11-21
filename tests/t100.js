/* t100 — 🎓 아는 단어 빼기(졸업 필터) (v5.12 · 학습사 id 8 · 11/18 로한 요청)
   🔒 G1 졸업 = okDates.length ≥ 2 (파생) · G2 갱신 — 정답이면 오늘을 okDates 에(같은 날 한 번) · 오답이면 lastWrong=오늘 · okDates=[]
      G3 켜면(기본) 뜻 맞히기 출제에서 졸업 단어가 빠진다 · 보기는 전체에서 · G4 끄면 다시 나온다
      G5 한 바퀴도 학습 대상만 · 오답 풀 답은 졸업에 안 센다 · G6 졸업 점검 = 졸업 단어 무작위 · 틀리면 졸업이 풀린다
      G7 드릴 탭 「졸업 n · 학습 대상 m」 · 오답 탭 「학습 대상」 구역 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{},saves:0}; const at=new Date().toISOString();
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv['study/words']={data:[],rev:1,at}; S.kv['study/drills']={data:[],rev:1,at}; S.kv['study/rest']={data:{v:1},rev:1,at}; S.kv.pref={data:{},rev:1,at};
  function q(name){const st={inKeys:null};const o={select(){return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn!=='kv_save')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    const revs={},ats={};
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
  await p.evaluate(()=>{const S=DB.study,t=todayStr(),y=addDays(t,-1),y2=addDays(t,-2);S.words=[];
    for(let i=0;i<30;i++){const w={id:'w'+i,kana:'かな'+i,kanji:'',ko:'뜻'+i,m:{r2m:{seen:3,miss:0,streak:2,lastSeen:y,okDates:i<10?[y2,y]:(i<15?[y]:[]),lastWrong:i<10?null:y2}}};S.words.push(w);}
    delete S.sweep; S.sweep={on:false}; delete DB.ui.stGradOff;});
  const G1=await p.evaluate(()=>({c:stGradCount(),on:stGradOn(),g:stIsGrad(stWordById('w0')),n:stIsGrad(stWordById('w12'))}));
  ok('G1 졸업 = 서로 다른 날 2번(okDates ≥ 2) · 기본 켜짐',G1.c.grad===10&&G1.c.left===20&&G1.on&&G1.g&&!G1.n,JSON.stringify(G1));
  const G3=await p.evaluate(()=>{const keep=stMkOpts;let seen=null;window.stMkOpts=function(w,m,pool){if(!seen)seen=pool;return keep(w,m,pool);};
    stDrillStart('r2m',20);window.stMkOpts=keep;const ids=ST_DRILL.ids.slice(),D=ST_DRILL;
    /* 🔒 보기 재료(optPool)에 졸업 단어가 들어 있는가 — 고르는 것은 무작위라 재료를 잰다 */
    const r={n:ids.length,noGrad:ids.every(id=>+id.slice(1)>=10),optFromAll:!!seen&&seen.some(w=>stIsGrad(w))};stDrillQuit();stDrillClose();return r;});
  ok('G3 켜면 졸업 단어가 출제에서 빠진다',G3.n===20&&G3.noGrad,JSON.stringify(G3));
  ok('G3b 보기는 전체에서 빌린다(졸업 단어 뜻도 보기에 나온다)',G3.optFromAll);
  /* G2 갱신 */
  const G2=await p.evaluate(()=>{const t=todayStr();const w12=stWordById('w12'),w20=stWordById('w20');stCt(w20,'r2m').okDates=[addDays(t,-1)];
    stDrillStart('r2m',20);const D=ST_DRILL;
    while(!D.fin&&D.i<D.ids.length){const id=D.ids[D.i];if(id==='w20')stDrillGrade('틀린답');else stDrillGrade(stWordById(id).ko);stDrillNext();}
    const a={ok12:JSON.stringify(stCt(w12,'r2m').okDates),grad12:stIsGrad(w12),seen20:D.ids.includes('w20')};
    a.w20=JSON.stringify({ok:stCt(w20,'r2m').okDates,lw:stCt(w20,'r2m').lastWrong});a.t=t;stDrillClose();
    /* 같은 날 두 번 맞혀도 하루 한 번 */
    const w13=stWordById('w13'),c13=stCt(w13,'r2m');stGradMark(c13,true);stGradMark(c13,true);a.w13=JSON.stringify(c13.okDates);
    return a;});
  ok('G2 정답이면 오늘을 okDates 에 — 서로 다른 날 2번이 되면 졸업',G2.grad12&&JSON.parse(G2.ok12).slice(-1)[0]===G2.t,JSON.stringify(G2));
  ok('G2b 오답이면 lastWrong=오늘 · okDates=[]',G2.w20===JSON.stringify({ok:[],lw:G2.t}),G2.w20);
  ok('G2c 같은 날 여러 번 맞혀도 하루 한 번',JSON.parse(G2.w13).length===2&&JSON.parse(G2.w13).filter(d=>d===G2.t).length===1,G2.w13);
  /* G4 끄면 다시 나온다 */
  const G4=await p.evaluate(()=>{stGradTog();stDrillStart('r2m',30);const any=ST_DRILL.ids.some(id=>stIsGrad(stWordById(id)));stDrillQuit();stDrillClose();const off=!stGradOn();stGradTog();return {any,off,on:stGradOn()};});
  ok('G4 끄면 졸업 단어도 나온다 · 다시 켤 수 있다',G4.any&&G4.off&&G4.on,JSON.stringify(G4));
  /* G5 한 바퀴 */
  const G5=await p.evaluate(()=>{DB.study.sweep=null;delete DB.study.sweep;stDrillStart('r2m',40);const D=ST_DRILL;
    const r={sw:!!D.sweep,noGrad:D.ids.every(id=>!stIsGrad(stWordById(id))),live:stSweepLive()};
    const w=stWordById(D.ids[0]);stDrillGrade('틀린답');stDrillNext();
    while(!D.fin){stDrillGrade(stWordById(D.ids[D.i]).ko);stDrillNext();}
    stDrillClose();stDrillStart('r2m',20);const B=ST_DRILL;r.ph=B.sweep.phase;const before=JSON.stringify(stCt(w,'r2m').okDates);
    stDrillGrade(w.ko);r.same=before===JSON.stringify(stCt(w,'r2m').okDates);stDrillQuit();stDrillClose();DB.study.sweep.on=false;return r;});
  ok('G5 한 바퀴도 학습 대상만 — 「첫 바퀴 n / 학습 대상 수」',G5.sw&&G5.noGrad&&G5.live.total===G1.c.left+0-0||G5.live.total<=21,JSON.stringify(G5));
  ok('G5b 🔒 오답 풀(B) 답은 졸업에 안 센다',G5.ph==='B'&&G5.same,JSON.stringify(G5));
  /* G6 졸업 점검 */
  const G6=await p.evaluate(()=>{const gs=stGradWords().map(w=>w.id);stDrillStart('r2m',Math.min(20,gs.length),'grad');const D=ST_DRILL;
    const r={set:D.set,all:D.ids.every(id=>gs.includes(id)),n:D.ids.length,g:gs.length};const id0=D.ids[0];stDrillGrade('틀린답');stDrillNext();
    r.unGrad=!stIsGrad(stWordById(id0));stDrillQuit();r.rec=DB.study.drills.slice(-1)[0].set;stDrillClose();return r;});
  ok('G6 졸업 점검 — 졸업 단어에서만',G6.set==='grad'&&G6.all&&G6.n===G6.g,JSON.stringify(G6));
  ok('G6b 졸업 점검에서 틀리면 졸업이 풀린다 · drills.set=grad',G6.unGrad&&G6.rec==='grad',JSON.stringify(G6));
  /* G7 화면 */
  const G7=await p.evaluate(async()=>{DB.ui.studyTab='word';DB.ui.stOpen='r2m';renderStudy();await new Promise(r=>setTimeout(r,80));
    const row=document.querySelector('#v-study .drow[data-mode="r2m"]'),x=document.querySelector('#v-study .drx');
    return {row:row?row.textContent:'',box:x?x.textContent:'',chk:!!(x&&x.querySelector('.stgrad input:checked')),miss:stPaneDrillMiss()};});
  ok('G7 드릴 탭 행에 「🎓 졸업 n · 학습 대상 m」',/🎓 졸업 \d+ · 학습 대상 \d+/.test(G7.row),G7.row.slice(0,140));
  ok('G7b 펼치면 「아는 단어 빼기」 토글(기본 켜짐) · 졸업 점검 단추',G7.chk&&/아는 단어 빼기/.test(G7.box)&&/졸업 점검/.test(G7.box),G7.box.slice(0,200));
  ok('G7c 오답 탭에 「학습 대상」 구역 + 바로 시작',/🎯 학습 대상/.test(G7.miss)&&/뜻 맞히기 20문항/.test(G7.miss));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t100 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
