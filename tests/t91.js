/* t91 — 📅 구글 일정 표시 (v5.01 · daily-view-spec D3)
   🔒 B1 3일짜리 종일이 세 칸에 한 줄로 · 토→일로 주가 바뀌면 다음 줄에서 이어지고 제목을 다시 쓴다 · B2 같은 일정은 그 주 안에서 같은 줄
      G1 같은 캘린더·분류·시각 = ×N 한 줄 · G2 🔴 달력 칸(월·주)에 학생 이름이 없다 · 그 날 표에만 · G3 하루 8건도 칸을 안 넘긴다
      T1 캘린더를 끄면 월간·주간·그 날 표에서 같이 사라진다(기기에 기억) · S1 동기화가 늦으면 ⚠ · 주소 없는 캘린더는 점선
      P1 폰 월간 = 막대 5px(글자 없음) · 점 · Z 에러 없음 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const CALFAKE=()=>{
  const p=n=>String(n).padStart(2,'0'), now=new Date(), Y=now.getFullYear(), M=now.getMonth()+1, ym=Y+'-'+p(M);
  /* 이 달 8일 뒤 첫 토요일(그 주 → 다음 주로 넘어가는 3일짜리) */
  let d=8; while(new Date(Date.UTC(Y,M-1,d)).getUTCDay()!==6)d++;
  const sat=ym+'-'+p(d), mon=ym+'-'+p(d+2), wed=ym+'-'+p(d+4), wedT=(h)=>new Date(Y,M-1,d+4,h,0,0).toISOString();
  const ev=[{src:'ac',uid:'x1',inst:'',title:'기말고사',cat:'시험',all_day:true,d0:sat,d1:mon,t0:null,t1:null,loc:null,note:null},
    {src:'hd',uid:'h1',inst:'',title:'쉬는 날',cat:null,all_day:true,d0:mon,d1:mon,t0:null,t1:null,loc:null,note:null}];
  ['가나다','라마바','사아자','차카타','파하갸','냐댜랴'].forEach((nm,i)=>ev.push({src:'ac',uid:'c'+i,inst:'',title:nm,cat:'클리닉',all_day:false,d0:wed,d1:wed,t0:wedT(14),t1:wedT(15),loc:'본관',note:null}));
  ev.push({src:'me',uid:'m1',inst:'',title:'부동산 임장',cat:null,all_day:false,d0:wed,d1:wed,t0:wedT(10),t1:wedT(11),loc:null,note:'메모 줄'});
  ev.push({src:'ac',uid:'c9',inst:'',title:'다른학생',cat:'전화 상담',all_day:false,d0:wed,d1:wed,t0:wedT(16),t1:wedT(16),loc:null,note:null});
  const old=new Date(Date.now()-3.5*3600000).toISOString();
  const src=[{key:'me',name:'내 일정',color:'#3f6fd8',show:true,ord:0,last_sync_at:old,last_status:'ok 5건'},
    {key:'ac',name:'채움 학사',color:'#d8a13f',show:true,ord:1,last_sync_at:old,last_status:'ok 45건'},
    {key:'hd',name:'휴일',color:'#d64545',show:true,ord:2,last_sync_at:old,last_status:'주소 없음 — x'}];
  window.__CAL={sat,mon,wed,d};
  const mk=(data)=>{const q={select(){return q},eq(){return q},is(){return q},lte(){return q},gte(){return q},order(){return q},limit(){return q},then(a,b){return Promise.resolve({data,error:null}).then(a,b);}};return q;};
  const wrap=()=>{const sb=window.supabase; if(!sb||sb.__cw)return; const cc=sb.createClient; sb.createClient=function(){const c=cc.apply(this,arguments), f=c.from;
    c.from=function(n){return n==='cal_events'?mk(ev):(n==='cal_sources'?mk(src):f.call(c,n));}; c.functions={invoke(){return Promise.resolve({data:{ok:true},error:null});}}; return c;}; sb.__cw=1;};
  wrap();
};
const FAKE=()=>{
  const S={kv:{},saves:0}; window.__S=S; const at=new Date().toISOString();
  const words=[];for(let i=0;i<60;i++)words.push({id:'w'+i,kana:'か'+i,kanji:'漢'+i,ko:'뜻'+i});
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
  const ctx=await b.newContext({viewport:{width:1280,height:720}});
  await ctx.addInitScript(FAKE);
  await ctx.addInitScript(CALFAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  await p.evaluate(()=>{document.querySelector('.side .m[data-v="daily"]').click();dviewSet('month');}); await p.waitForTimeout(600);
  const B=await p.evaluate(()=>{const C=window.__CAL, cell=ds=>document.querySelector('#v-daily .dmon .gcell[data-gcal="'+ds+'"]');
    const bars=[C.sat,addDays(C.sat,1),C.mon].map(ds=>{const c=cell(ds);const b=c?[...c.querySelectorAll('.cbar')].filter(x=>!x.classList.contains('emp')):[];return b.map(x=>({cls:x.className,t:x.textContent.trim()}));});
    const lane=ds=>{const c=cell(ds);return c?[...c.querySelectorAll('.dmbars .cbar')].findIndex(x=>/시험/.test(x.title)):-9;};
    return {bars,l1:lane(addDays(C.sat,1)),l2:lane(C.mon)};});
  ok('B1 🔴 3일 종일 = 세 칸에 이어진다 · 토 시작 · 일요일(다음 주)에 이어서 제목 다시',B.bars[0][0]&&/cs/.test(B.bars[0][0].cls)&&B.bars[0][0].t==='시험'&&B.bars[1][0]&&/cont/.test(B.bars[1][0].cls)&&B.bars[1][0].t==='시험'&&B.bars[2].some(x=>/ce/.test(x.cls)),JSON.stringify(B));
  ok('B2 같은 일정은 그 주 안에서 같은 줄',B.l1===B.l2&&B.l1>=0,B.l1+'/'+B.l2);
  const G=await p.evaluate(()=>{const C=window.__CAL, c=document.querySelector('#v-daily .dmon .gcell[data-gcal="'+C.wed+'"]'), mt=c.textContent;
    const r=c.getBoundingClientRect(), last=[...c.children].pop().getBoundingClientRect();
    dviewSet('week'); setGoalDate(C.wed); dayOpenSet(false); const col=[...document.querySelectorAll('#v-daily .dwc')].find(x=>x.querySelector('.dvh').dataset.gcal===C.wed), wt=col?col.textContent:'';
    dayOpenTo(C.wed); const dr=document.querySelector('#v-daily .ddraw').textContent; dayOpenSet(false);
    return {mt,wt,dr,fit:last.bottom<=r.bottom+1};});
  ok('G1 같은 분류·시각 = 「14:00 클리닉 ×6」 한 줄',/14:00\s*클리닉\s*×6/.test(G.mt)&&/14:00\s*클리닉\s*×6/.test(G.wt),G.mt.slice(0,200));
  const names=['가나다','라마바','사아자','차카타','파하갸','냐댜랴','다른학생'];
  ok('G2 🔴 달력 칸(월·주)에 학생 이름 없음 · 그 날 표에만',names.every(n=>G.mt.indexOf(n)<0&&G.wt.indexOf(n)<0)&&names.every(n=>G.dr.indexOf(n)>=0)&&/부동산 임장/.test(G.mt)&&/전화 상담/.test(G.mt),JSON.stringify({m:G.mt.slice(0,160),w:G.wt.slice(0,160)}));
  ok('G3 하루 8건 — 칸을 안 넘긴다',G.fit);
  const T=await p.evaluate(()=>{const C=window.__CAL; dviewSet('month'); calToggle('ac');
    const m=document.querySelector('#v-daily .dmon .gcell[data-gcal="'+C.wed+'"]').textContent; dviewSet('week'); const w=document.querySelector('#v-daily .dwk').textContent;
    dayOpenTo(C.wed); const dr=document.querySelector('#v-daily .ddraw').textContent; dayOpenSet(false); const mem=JSON.parse(localStorage.getItem('rb_ui')||'{}').calOff; calToggle('ac'); dviewSet('month');
    return {m:/클리닉|시험/.test(m),w:/클리닉/.test(w),dr:/가나다/.test(dr),mem};});
  ok('T1 끄면 세 화면에서 같이 사라진다 · 기기에 기억',!T.m&&!T.w&&!T.dr&&T.mem&&T.mem.ac===1,JSON.stringify(T));
  const S=await p.evaluate(()=>({warn:(document.querySelector('#v-daily .calwarn')||{}).textContent||'',miss:!!document.querySelector('#v-daily .calchip.miss'),chips:document.querySelectorAll('#v-daily .calchip').length}));
  ok('S1 늦으면 ⚠ 3시간 전 · 주소 없는 캘린더는 점선',/⚠ 3시간 전/.test(S.warn)&&S.miss&&S.chips===3,JSON.stringify(S));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
  const c2=await b.newContext({viewport:{width:360,height:780},hasTouch:true,isMobile:true});await c2.addInitScript(FAKE);await c2.addInitScript(CALFAKE);
  const q=await c2.newPage();await q.route('**/*supabase*',r=>r.abort());await q.goto('file://'+file);await q.waitForTimeout(2500);
  await q.evaluate(()=>{document.querySelector('.side .m[data-v="daily"]').click();dviewSet('month');});await q.waitForTimeout(500);
  const P=await q.evaluate(()=>{const C=window.__CAL,c=document.querySelector('#v-daily .dmon .gcell[data-gcal="'+C.wed+'"]'),b=document.querySelector('#v-daily .cbar:not(.emp)');
    return {bh:b?Math.round(b.getBoundingClientRect().height):-1,bt:b?getComputedStyle(b).fontSize:'',dots:c.querySelectorAll('.dmdots i').length,ov:document.documentElement.scrollWidth>innerWidth+1};});
  ok('P1 폰 월간 — 막대 5px·글자 없음 · 점 · 넘침 0',P.bh===5&&P.bt==='0px'&&P.dots>=2&&!P.ov,JSON.stringify(P));
  await c2.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t91 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
