/* t93 — 🗂 업무 묶음 · 🎯 목표 연결 · ☑ 체크리스트 (v5.05 · work-v2-spec E2)
   🔒 A L1 셋 · 묶음 미리 안 만듦 · B 제안 단추 · C 상세 저장 · D 다 채워도 안 끝남 · E 묶음 카드 · F 보관(빠지고 업무는 그대로 · 삭제 없음) · G 들인 시간 · H 극단 */
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

  const A=await p.evaluate(()=>{gotoTab('work');pfL1Set('work','proj');
    const tabs=[...document.querySelectorAll('#v-work .tabs .tab')].map(t=>t.dataset.tab), v=document.getElementById('v-work').textContent;
    const btn=[...document.querySelectorAll('#v-work .wkempty button')].map(b=>b.textContent);
    return {tabs,empty:/묶음이 없다/.test(v),btn,n:wkDB().projects.length};});
  ok('A1 L1 = 할 일 · 묶음 · 끝낸 것',JSON.stringify(A.tabs)===JSON.stringify(['todo','proj','done']),JSON.stringify(A.tabs));
  ok('A2 🔒 묶음을 앱이 미리 만들지 않는다 — 빈 상태에 제안 단추만',A.empty&&A.n===0&&A.btn.some(t=>/채움/.test(t))&&A.btn.some(t=>/행정/.test(t)),JSON.stringify(A));

  const B=await p.evaluate(()=>{const b=[...document.querySelectorAll('#v-work .wkempty button')].find(x=>/채움/.test(x.textContent)); b.click();
    const P=wkDB().projects; return {n:P.length,name:P[0]&&P[0].name,card:document.querySelectorAll('#v-work .wkpc').length};});
  ok('B1 「+ 채움」 → 묶음 1개 · 카드',B.n===1&&B.name==='채움'&&B.card===1,JSON.stringify(B));

  /* 상세 — 묶음·목표·체크리스트 */
  const C=await p.evaluate(()=>{const y=todayStr().slice(0,4);
    DB.goals=(DB.goals||[]).concat([{id:'gY1',kind:'year',period:y,code:'Y1',title:'학원 확장',status:'active'}]);
    const pj=wkDB().projects[0].id;
    wkModal(null,{day:todayStr()});
    document.getElementById('wk_t').value='교육청 서류';
    document.getElementById('wk_pj').value=pj; document.getElementById('wk_goal').value='gY1';
    const add=t=>{document.getElementById('wk_subt').value=t;wkSubAdd();};
    add('사업자등록증'); add('임대차 계약서'); add('도면');
    wkSubTog(0); document.getElementById('wk_subt').value='인감';   /* 엔터 안 누른 줄 */
    wkSave(null);
    const x=wkLive().find(q=>q.title==='교육청 서류');
    pfL1Set('work','todo');
    const row=document.querySelector('#v-work .wkrow[data-wk="'+x.id+'"]');
    return {pj:x.proj===pj,goal:x.goalId,sub:x.sub.map(q=>q.t+(q.done?'✓':'')),meta:row?row.querySelector('.wkmeta').textContent:'',st:x.status,id:x.id};});
  ok('C1 상세에서 묶음 · 목표 · 체크리스트 저장 (엔터 안 친 줄도)',C.pj&&C.goal==='gY1'&&C.sub.join()==='사업자등록증✓,임대차 계약서,도면,인감',JSON.stringify(C));
  ok('C2 행에 ☑ 1/4 · 🎯 Y1 · 묶음 칩',/☑ 1\/4/.test(C.meta)&&/🎯 Y1/.test(C.meta)&&/채움/.test(C.meta),C.meta);

  const D=await p.evaluate(id=>{wkModal(id); for(let i=0;i<4;i++){const q=modal._wksub[i];if(!q.done)wkSubTog(i);} wkSave(id);
    const x=wkById(id); const meta=document.querySelector('#v-work .wkrow[data-wk="'+id+'"] .wkmeta').textContent; return {st:x.status,meta};},C.id);
  ok('D1 🔒 체크리스트를 다 채워도 업무는 혼자 끝나지 않는다',D.st==='todo'&&/☑ 4\/4/.test(D.meta),JSON.stringify(D));

  /* 묶음 카드 — 남은/끝낸 · 마감 · 들인 시간 */
  const E=await p.evaluate(id=>{const pj=wkDB().projects[0].id, t=todayStr();
    const y=wkAdd({title:'원생 명단 정리',day:t,due:addDays(t,2),proj:pj}); const z=wkAdd({title:'끝낸 일',day:t,proj:pj}); z.status='done'; z.doneAt=new Date().toISOString();
    wkLogRun(wkById(id),{at:new Date(Date.now()-3*3600000).toISOString(),mins:40});
    save(); pfL1Set('work','proj'); const c=document.querySelector('#v-work .wkpc[data-pj="'+pj+'"]'); return c?c.textContent:'';},C.id);
  ok('E1 묶음 카드 — 남은 2 · 끝낸 1 · 가장 가까운 마감 · ⏱ 들인 시간',/남은 2/.test(E)&&/끝낸 1/.test(E)&&/D-2/.test(E)&&/⏱ 40m/.test(E),E);

  /* 보관 */
  const F=await p.evaluate(id=>{const pj=wkDB().projects[0].id; wkPjArch(pj,true);
    const card=document.querySelectorAll('#v-work .wkpage > .wkpcs > .wkpc').length, arch=/보관한 묶음 1/.test(document.getElementById('v-work').textContent);
    pfL1Set('work','todo'); const chips=[...document.querySelectorAll('#v-work .chips .chp')].map(c=>c.textContent);
    const row=!!document.querySelector('#v-work .wkrow[data-wk="'+id+'"]');
    wkModal(null,{}); const opts=[...document.getElementById('wk_pj').options].map(o=>o.textContent); closeModal();
    wkModal(id); const cur=document.getElementById('wk_pj').value===pj; closeModal();
    return {card,arch,chips,row,opts,cur,still:wkDB().projects.length};},C.id);
  ok('F1 보관 — 카드는 「보관한 묶음」으로 · 칩·새 업무 고르기에서 빠진다',F.card===0&&F.arch&&!F.chips.some(c=>/채움/.test(c))&&!F.opts.some(o=>/^채움/.test(o)),JSON.stringify(F));
  ok('F2 🔒 보관해도 업무는 할 일에 그대로 · 그 업무 상세엔 보관 묶음이 선택된 채 · 삭제 없음',F.row&&F.cur&&F.still===1,JSON.stringify(F));

  const G=await p.evaluate(()=>{pfL1Set('work','done'); return document.getElementById('v-work').textContent;});
  ok('G1 끝낸 것 탭에 「들인 시간」 칸',/들인 시간/.test(G),G.slice(0,200));

  const H=await p.evaluate(()=>{const x=wkAdd({title:'깨진 데이터',day:todayStr()}); x.sub='깨짐'; x.goalId='없는목표'; x.proj='없는묶음'; renderWork(); pfL1Set('work','todo');
    wkModal(x.id); const ok1=!!document.getElementById('wk_subs'); closeModal(); pfL1Set('work','proj'); return ok1;});
  ok('H1 극단 — sub 가 배열 아님 · 없는 목표·묶음을 가리켜도 그린다',H);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t93 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
