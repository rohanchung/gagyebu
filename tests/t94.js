/* t94 — 🔁 업무 반복 · 📐 계획 윤곽 (v5.06 · work-v2-spec E3)
   🔒 N 다음 해당일·말일·깨진 rep · A 다음 회차 1건(정해진 id) · B 두 번 끝내도 하나 · C/E 되돌리기(손 안 댄 것만 거둠) · D 늦게 끝내도 안 쌓임 · F 안 하기로도 다음 회차 · G 상세 · H/I/J 윤곽(빈 칸만 · 저장 안 함 · 미래 날 · 끝낸 것 제외) */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
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
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);

  const N=await p.evaluate(()=>({
    w1:wkRepNext({every:'week',dow:[1,3]},'2026-11-16'),   /* 월 → 수 */
    w2:wkRepNext({every:'week',dow:[1]},'2026-11-16'),     /* 월 → 다음 월 */
    m1:wkRepNext({every:'month',d:31},'2026-11-15'),       /* 11월엔 31일이 없다 → 30일 */
    m2:wkRepNext({every:'month',d:31},'2026-11-30'),       /* → 12/31 */
    m3:wkRepNext({every:'month',d:30},'2027-01-31'),       /* 2월 → 말일 28 */
    bad:[wkRepOk({every:'week',dow:[]}),wkRepOk({every:'week',dow:[9]}),wkRepOk({every:'month',d:0}),wkRepOk({every:'day'}),wkRepOk('매주'),wkRepOk(null)]}));
  ok('N1 다음 해당일 — 매주(수·다음 월) · 매달 31일(말일로)',N.w1==='2026-11-18'&&N.w2==='2026-11-23'&&N.m1==='2026-11-30'&&N.m2==='2026-12-31'&&N.m3==='2027-02-28',JSON.stringify(N));
  ok('N2 극단 — 깨진 rep 는 반복 없음으로 본다',N.bad.every(x=>x===null),JSON.stringify(N.bad));

  const A=await p.evaluate(()=>{const t=todayStr();
    const x=wkAdd({title:'원비 정산',day:t,at:'10:00',dur:30,rep:{every:'week',dow:[dowOf(t)]},sub:[{id:'s1',t:'통장 확인',done:true}]}); save();
    wkToggle(x.id);
    const nx=wkLive().filter(q=>q.title==='원비 정산'&&q.id!==x.id);
    const n=nx[0];
    return {k:nx.length,id:n&&n.id,want:x.id+'~'+addDays(t,7).replace(/-/g,''),day:n&&n.day,at:n&&n.at,sub:n&&n.sub.map(q=>q.t+(q.done?'✓':'')).join(),rep:n&&JSON.stringify(n.rep),runs:n&&(n.runs||[]).length,xday:x.day===t,xid:x.id};});
  ok('A1 끝내면 다음 회차 1건 — id = 처음id~YYYYMMDD · 7일 뒤 · 시각·rep 물려받고 체크리스트는 다 안 한 것으로',
     A.k===1&&A.id===A.want&&A.at==='10:00'&&A.sub==='통장 확인'&&A.runs===0&&A.xday,JSON.stringify(A));

  const B=await p.evaluate(xid=>{const n0=wkLive().length; const x=wkById(xid); x.status='todo'; x.doneAt=null; wkToggle(xid);   /* 두 번째 기기가 같은 회차를 끝냄 흉내 */
    return {same:wkLive().length===n0};},A.xid);
  ok('B1 🔴 같은 회차를 다시 끝내도 다음 회차가 둘 생기지 않는다(정해진 id)',B.same,JSON.stringify(B));

  const C=await p.evaluate(xid=>{wkToggle(xid); const x=wkById(xid), n=wkById(x.repNext||'')||wkDB().tasks.find(q=>q.from===xid);
    return {st:x.status,del:!!(n&&n.deletedAt)};},A.xid);
  ok('C1 되돌리기 — 손 안 댄 다음 회차는 거둔다(deletedAt)',C.st==='todo'&&C.del,JSON.stringify(C));

  const D=await p.evaluate(()=>{const t=todayStr();
    const x=wkAdd({title:'월말 보고',day:addDays(t,-20),rep:{every:'month',d:5}}); save(); wkToggle(x.id);
    const n=wkLive().find(q=>q.from===x.id); wkToggle(x.id); const keep1=!!wkById(n.id).deletedAt;
    wkToggle(x.id); const n2=wkLive().find(q=>q.from===x.id&&!q.deletedAt);
    return {nd:n&&n.day, after:n&&n.day>t, keep1, n2:!!n2};});
  ok('D1 늦게 끝내면 다음 회차는 오늘 뒤 첫 해당일 — 지나간 회차를 쌓지 않는다',D.after,JSON.stringify(D));

  const E=await p.evaluate(()=>{const t=todayStr();
    const x=wkAdd({title:'상담 준비',day:t,rep:{every:'week',dow:[dowOf(t)]}}); save(); wkToggle(x.id);
    const n=wkLive().find(q=>q.from===x.id); wkById(n.id).title='상담 준비(고침)'; wkStamp(wkById(n.id));
    wkToggle(x.id); return {kept:!wkById(n.id).deletedAt};});
  ok('E1 손댄 다음 회차는 되돌려도 둔다',E.kept,JSON.stringify(E));

  const F=await p.evaluate(()=>{const t=todayStr();
    const x=wkAdd({title:'안 할 반복',day:t,rep:{every:'month',d:1}}); save(); x.status='todo';
    wkDrop(x.id); const n=wkLive().find(q=>q.from===x.id); return {n:!!n,drop:wkById(x.id).status==='drop'};});
  ok('F1 「안 하기로」 해도 다음 회차는 생긴다',F.n&&F.drop,JSON.stringify(F));

  const G=await p.evaluate(()=>{gotoTab('work'); const r=document.querySelectorAll('#v-work .wkrep').length;
    wkModal(null,{}); document.getElementById('wk_t').value='반복 날짜 없음'; document.getElementById('wk_d').value='';
    document.querySelector('input[name="wk_rep"][value="week"]').checked=true; wkRepUi(); document.querySelector('#wk_rep_w input[value="2"]').checked=true;
    const n0=wkLive().length; wkSave(null); const n1=wkLive().length; closeModal();
    wkModal(null,{}); document.getElementById('wk_t').value='매주 화목'; document.getElementById('wk_d').value=todayStr();
    document.querySelector('input[name="wk_rep"][value="week"]').checked=true; wkRepUi();
    document.querySelectorAll('#wk_rep_w input').forEach(i=>i.checked=(i.value==='2'||i.value==='4')); wkSave(null);
    const x=wkLive().find(q=>q.title==='매주 화목'); return {r,noDay:n1===n0,rep:x&&JSON.stringify(x.rep)};});
  ok('G1 상세에서 반복 고르기 · 예정일 없이 반복은 거절 · 행에 🔁',G.r>=1&&G.noDay&&G.rep==='{"every":"week","dow":[2,4]}',JSON.stringify(G));
  ok('G2 🔒 달력에 앞날 회차를 미리 그리지 않는다 — 있는 것은 다음 1건뿐',await p.evaluate(()=>wkLive().filter(q=>/^매주 화목/.test(q.title)).length===1));

  /* 계획 윤곽 */
  const H=await p.evaluate(()=>{const t=todayStr(); delete DB.timelog[t];
    wkAdd({title:'교육청 방문',day:t,at:'14:00',dur:60}); tlPut(t,{s:87,e:87,tag:'meal',title:'간식',code:null}); save();
    dayOpenTab(t,'log'); renderDaily();
    const q=i=>document.querySelector('#v-daily .tlgrid .tlq[data-tlq="'+i+'"]');
    const cls=[84,85,86,87,88,89].map(i=>q(i)?q(i).className:'');
    const em=q(84)&&q(84).querySelector('.plt'), st=tlStrip(t,6);
    return {cls,em:em&&em.textContent,strip:/class="pl"/.test(st),saved:JSON.stringify(DB.timelog[t]).indexOf('교육청')<0};});
  ok('H1 시각 있는 업무는 로그 그리드 빈 칸에 점선 윤곽 · 기록 있는 칸(87)은 기록이 이긴다',
     H.cls[0].includes('plan')&&H.cls[2].includes('plan')&&!H.cls[3].includes('plan')&&H.cls[4].includes('plan')&&H.cls[5].includes('plan')&&H.em==='교육청 방문',JSON.stringify(H));
  ok('H2 띠에도 윤곽 · 🔒 윤곽은 저장하지 않는다',H.strip&&H.saved,JSON.stringify(H));

  const I=await p.evaluate(()=>{const f=addDays(todayStr(),2); wkAdd({title:'미래 회의',day:f,at:'09:00',dur:30}); save();
    dayOpenTab(f,'log'); renderDaily(); const v=document.getElementById('v-daily');
    const g=v.querySelector('.tlgrid.fut'); const pl=g?g.querySelectorAll('.tlq.plan').length:0;
    return {note:/아직 오지 않은 날/.test(v.textContent),pl,tl:!DB.timelog[f]};});
  ok('I1 미래 날: 「아직 오지 않은 날」 + 윤곽만 있는 그리드 · 🔒 타임로그는 안 쓰인다',I.note&&I.pl===3&&I.tl,JSON.stringify(I));

  const J=await p.evaluate(()=>{const t=todayStr(); const ev=DB.timelog[t]; const x=wkAdd({title:'끝낸 일정',day:t,at:'20:00',dur:30}); x.status='done'; save();
    return Object.keys(wkPlanSlots(t)).some(k=>wkPlanSlots(t)[k].x.id===x.id);});
  ok('J1 끝낸 업무는 윤곽을 그리지 않는다',!J);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t94 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
