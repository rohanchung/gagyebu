/* t104 — 📜 토정비결 2판 (v5.16 · 기획방 id 70) — 출처 여럿을 모아 정리하는 자리
   🔒 V1 첫 판은 「내년」(로한: 2027년 예측부터) — 올해 키가 없으면 내년이 기본 · 「시작 전」 · 이번 달 칠 없음
      V2 1280×720 에서 ② 열두 달 띠가 첫 화면에 · V3 합의 = 출처끼리 · 선언한 곳만 분모 · 종합은 안 센다
      V4 갈림/한목소리가 글자로 · 달별 없는 출처 열은 전부 「—」 · V5 띠 칸 → 그 달 줄
      V6 본문은 mdRender 로만 · V7 괘가 갈리면 「출처마다 괘가 다르다」 · V8 출처 칩(우리 방/외부)
      V9 종합 없음 → 「아직 정리하지 않았다 — 출처 n곳」 · V10 출처 2·5·8 × 다섯 폭 옆 넘침 0 · 10.5px 미만 0 · 360 띠 6×2
      V11 좁으면 달 하나씩 ◀ ▶ · V12 1판 해는 그대로 · V13 올해 2판이면 이번 달 금테 · V14 그리기가 데이터를 바꾸지 않는다
   🔒 픽스처는 지어낸 글이다(실제 운세 문장을 넣지 않는다 — 공개 저장소) */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{}}; const at=new Date().toISOString();
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv.pref={data:{},rev:1,at};
  function q(name){const st={inKeys:null};const o={select(){return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn!=='kv_save')return Promise.resolve({data:null,error:null});
    const revs={},ats={};
    args.p_changes.forEach(c=>{const cur=S.kv[c.key];S.kv[c.key]={data:c.data,rev:cur?cur.rev+1:1,at:new Date().toISOString()};revs[c.key]=S.kv[c.key].rev;ats[c.key]=S.kv[c.key].at;});
    return Promise.resolve({data:{ok:true,revs,ats},error:null});}
  const ch={on(){return ch;},subscribe(){return ch;}};
  window.supabase={createClient:()=>({from:q,rpc,channel:()=>ch,
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
/* 지어낸 출처 n개 — 1월: 길·길·흉·선언없음·(달별 없음) → 갈림 2/3 · 2월: 셋 다 길 → 한목소리 · 3월: 아무도 안 말함 */
const MK=(y,n,withSynth)=>{
  const L=['good','good','bad',null];
  const src=Array.from({length:n},(_,i)=>{
    const id='s'+(i+1), noMonths=(i===4);
    const months=noMonths?null:{};
    if(months){for(let m=1;m<=12;m++){if(m===3)continue;
      const luck=m===1?L[i%4]:m===2?(i<3?'good':null):(['good','mixed','bad'][(i+m)%3]);
      months[m]={t:'지어낸 '+m+'월 글 — 출처 '+(i+1)+' 이 쓴 긴 문장이다. 두 줄을 넘기면 잘린다. 더 길게 늘여 쓴 지어낸 말이다.',luck};}}
    return {id,who:i===0?'점술부장':i===1?'수연':'가짜업체'+(i-1),kind:i<2?'room':'vendor',gwae:{no:i===2?'222':'111',name:i===2?'다른 괘':'지어낸 괘'},
      title:'출처 '+(i+1)+' 제목',body:'지어낸 본문 '+(i+1)+'.\n\n'+'**굵게** 쓴 줄.\n\n'.repeat(i===0?12:1),months,src:i<2?'우리 방':'가짜 앱 '+i,at:(y-1)+'-11-2'+(i%9)};});
  const synth=withSynth?{by:'점술부장',summary:'지어낸 총평이다. **한 해**를 묶는다.\n\n<img src=x onerror="window.__xss=1">\n\n둘째 단락.\n\n셋째 단락.\n\n넷째 단락.',
    months:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,i===2?{t:'삼월 종합',luck:null}:{t:'종합 '+(i+1)+'월',luck:i===0?'good':['good','mixed','bad'][i%3]}])),
    keys:['가짜 하나','가짜 둘','가짜 셋'],note:'갈린 달은 지어낸 방식으로 정리했다.'}:null;
  return {v:2,year:y,madeAt:(y-1)+'-11-23',updatedAt:(y-1)+'-11-30',gwae:null,sources:src,synth};
};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1280,height:720}}); await ctx.addInitScript(require('./_fakeseed').saju);
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  const cy=await p.evaluate(()=>new Date().getFullYear());
  const MKs=MK.toString();
  await p.evaluate(([cy,mk])=>{const MK=eval('('+mk+')');const R=DB.saju.readings;
    R['tojeong:'+(cy+1)]=MK(cy+1,5,true);
    R['tojeong:'+(cy-1)]={v:1,year:cy-1,madeAt:(cy-1)+'-01-20',src:'test',versions:[{by:'GPT',title:'옛 1판 제목',body:'옛 본문',months:null}]};
    DB.ui.sajuTab='tojeong';delete DB.ui.tjYear;},[cy,MKs]);
  await p.click('.side .m[data-v="saju"]');await p.waitForTimeout(300);
  const measure=()=>p.evaluate(()=>{const box=document.getElementById('v-saju');
    const small=[...box.querySelectorAll('*')].filter(e=>{if(!e.offsetParent)return false;if(e.closest('svg,rt'))return false;
      const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());return own&&parseFloat(getComputedStyle(e).fontSize)<10.5;})
      .filter(e=>e.closest('.tjwrap')).map(e=>e.className+':'+getComputedStyle(e).fontSize+':'+e.textContent.slice(0,10));
    return {over:document.documentElement.scrollWidth-window.innerWidth,small};});

  const V1=await p.evaluate(()=>({y:tjYear(),on:(document.querySelector('#v-saju .tjys .sg.on')||{}).textContent,when:(document.querySelector('#v-saju .tjwhen')||{}).textContent,
    now:document.querySelectorAll('#v-saju .tjst.now,#v-saju .tjm2 tr.now').length,syn:!!document.querySelector('#v-saju .tjsyn:not(.none)')}));
  ok('V1 올해 키가 없으면 내년이 기본 · 「시작 전」 · 이번 달 칠 없음',V1.y===cy+1&&V1.on===(cy+1)+'년'&&/시작 전/.test(V1.when||'')&&V1.now===0&&V1.syn,JSON.stringify(V1));

  const V2=await p.evaluate(()=>{const c=[...document.querySelectorAll('#v-saju .tjst')];const r=c.map(x=>x.getBoundingClientRect());
    return {n:c.length,bottom:Math.max(...r.map(x=>x.bottom)),vh:window.innerHeight,oneRow:r.every(x=>Math.abs(x.top-r[0].top)<2)};});
  ok('V2 1280×720 — 열두 달 띠가 한 줄로 첫 화면에',V2.n===12&&V2.oneRow&&V2.bottom<=V2.vh,JSON.stringify(V2));

  const V3=await p.evaluate(()=>{const c=[...document.querySelectorAll('#v-saju .tjst')];return c.slice(0,3).map(x=>x.textContent);});
  ok('V3 합의 = 출처끼리 · 선언한 곳만 분모 (1월 길 2/3 · 2월 · 3월 「—」)',/1월● 길합의 2\/3/.test(V3[0])&&/3월—/.test(V3[2]),JSON.stringify(V3));

  const V4=await p.evaluate(()=>{const t=document.querySelector('#v-saju .tjm2');if(!t)return null;
    const rows=[...t.querySelectorAll('tbody tr')];const cols=[...t.querySelectorAll('thead th')].map(x=>x.textContent);
    const ci=cols.indexOf('가짜업체3');
    return {cols,r1:rows[0].querySelector('th').textContent,r2:rows[1].querySelector('th').textContent,r3:rows[2].querySelector('th').textContent,
      s5dash:rows.filter(r=>r.children[ci].textContent==='—').length,clamp:getComputedStyle(t.querySelector('.tjct')).webkitLineClamp};});
  ok('V4 표 — 열 = 달·종합·출처들',!!V4&&V4.cols.join()==='달,종합,점술부장,수연,가짜업체1,가짜업체2,가짜업체3',JSON.stringify(V4&&V4.cols));
  ok('V4b 갈린 달 「갈림」 · 다 같은 달 「한목소리」 · 아무도 안 말한 달은 「선언 없음」',!!V4&&/갈림/.test(V4.r1)&&/●2 ○1 · 3곳/.test(V4.r1)&&/한목소리/.test(V4.r2)&&/선언 없음/.test(V4.r3)&&!/갈림|한목소리/.test(V4.r3),JSON.stringify(V4));
  ok('V4c 달별 없는 출처 열은 12칸 전부 「—」 · 긴 글은 두 줄에서 자른다',!!V4&&V4.s5dash===12&&V4.clamp==='2',JSON.stringify(V4));
  await p.click('#v-saju .tjm2 tbody tr:nth-child(4) td:nth-child(3) .tjct');await p.waitForTimeout(150);
  ok('V4d 칸을 누르면 전문 펼침',await p.evaluate(()=>document.querySelector('#v-saju .tjm2 tbody tr:nth-child(4) td:nth-child(3) .tjct').classList.contains('open')));

  await p.click('#v-saju .tjst[data-m="7"]');await p.waitForTimeout(500);
  ok('V5 띠 7월 → 표의 7월 줄로',await p.evaluate(()=>{const r=document.getElementById('tjr7');const b=r.getBoundingClientRect();return r.classList.contains('hit')&&b.top>=0&&b.bottom<=window.innerHeight;}));

  const V6=await p.evaluate(()=>({b:document.querySelectorAll('#v-saju .tjsum b,#v-saju .tjsum strong').length,img:document.querySelectorAll('#v-saju .tjwrap img').length,xss:!!window.__xss,
    fold:document.querySelector('#v-saju .tjsum').classList.contains('fold'),keys:[...document.querySelectorAll('#v-saju .tjkeys span')].map(x=>x.textContent).join('|'),note:/지어낸 방식으로/.test(document.querySelector('#v-saju .tjnote').textContent)}));
  ok('V6 총평은 mdRender 로 — 굵게는 그리고 날것 HTML 은 안 · 길면 접는다 · 키워드 · 정리 메모',V6.b>=1&&V6.img===0&&!V6.xss&&V6.fold&&V6.keys==='가짜 하나|가짜 둘|가짜 셋'&&V6.note,JSON.stringify(V6));

  const V7a=await p.evaluate(()=>(document.querySelector('#v-saju .tjgwb')||{}).textContent);
  await p.click('#v-saju .tjgwb');await p.waitForTimeout(150);
  const V7b=await p.evaluate(()=>(document.querySelector('#v-saju .tjgwl')||{}).textContent||'');
  ok('V7 출처 괘가 갈리면 「출처마다 괘가 다르다 · 펼쳐 보기」 → 출처별 괘',/출처마다 괘가 다르다 · 펼쳐 보기/.test(V7a||'')&&/222/.test(V7b)&&/111/.test(V7b),V7a+' / '+V7b);

  const V8=await p.evaluate(()=>[...document.querySelectorAll('#v-saju .tjsrc')].map(x=>x.className.split(' ')[1]+':'+x.textContent).join('|'));
  ok('V8 출처 칩 — 우리 방 🏛 둘 · 외부 🏷 셋',V8==='r:🏛 점술부장|r:🏛 수연|v:🏷 가짜업체1|v:🏷 가짜업체2|v:🏷 가짜업체3',V8);

  const V14a=await p.evaluate(cy=>JSON.stringify(DB.saju.readings['tojeong:'+(cy+1)]),cy);
  for(const [n,syn] of [[5,true],[2,true],[8,true],[5,false]]){
    await p.evaluate(([cy,mk,n,syn])=>{const MK=eval('('+mk+')');DB.saju.readings['tojeong:'+(cy+1)]=MK(cy+1,n,syn);renderSaju();},[cy,MKs,n,syn]);
    if(!syn){ok('V9 종합 없음 → 「아직 정리하지 않았다 — 출처 5곳이 들어왔다」 · 표는 그대로',await p.evaluate(()=>/아직 정리하지 않았다 — 출처 5곳이 들어왔다/.test(document.getElementById('v-saju').textContent)&&!document.querySelector('#v-saju .tjst')&&!!document.querySelector('#v-saju .tjm2')&&[...document.querySelectorAll('#v-saju .tjm2 thead th')].every(x=>x.textContent!=='종합')));}
    for(const [w,h] of [[1536,820],[1280,720],[1280,854],[854,1280],[360,780]]){
      await p.setViewportSize({width:w,height:h});await p.waitForTimeout(200);await p.evaluate(()=>renderSaju());await p.waitForTimeout(80);
      const m=await measure();ok('V10 출처 '+n+(syn?'':' · 종합 없음')+' · '+w+'x'+h+' 옆 넘침 0 · 10.5px 미만 0',m.over<=0&&!m.small.length,JSON.stringify(m).slice(0,200));
      if(w===360&&syn){const g=await p.evaluate(()=>{const t=[...document.querySelectorAll('#v-saju .tjst')].map(x=>Math.round(x.getBoundingClientRect().top));return [...new Set(t)].length;});
        ok('V10b 360 — 열두 달 띠 6×2 (출처 '+n+')',g===2,g);}
    }
    await p.setViewportSize({width:1280,height:720});
  }
  /* 좁은 화면 — 달 하나씩 */
  await p.evaluate(([cy,mk])=>{const MK=eval('('+mk+')');DB.saju.readings['tojeong:'+(cy+1)]=MK(cy+1,5,true);TJ_M.m=0;},[cy,MKs]);
  await p.setViewportSize({width:854,height:1280});await p.waitForTimeout(200);await p.evaluate(()=>renderSaju());
  const V11a=await p.evaluate(()=>({wide:!!document.querySelector('#v-saju .tjwide').offsetParent,one:!!document.querySelector('#v-saju .tjone').offsetParent,
    m:document.querySelector('#v-saju .tjonehd b').textContent,cells:document.querySelectorAll('#v-saju .tjonec').length,tag:(document.querySelector('#v-saju .tjonehd .tjtag')||{}).textContent}));
  await p.click('#v-saju .tjonehd button[aria-label="다음 달"]');await p.waitForTimeout(150);
  const m2=await p.evaluate(()=>document.querySelector('#v-saju .tjonehd b').textContent);
  await p.click('#v-saju .tjonehd button[aria-label="앞 달"]');await p.click('#v-saju .tjonehd button[aria-label="앞 달"]');await p.waitForTimeout(150);
  const m12=await p.evaluate(()=>document.querySelector('#v-saju .tjonehd b').textContent);
  ok('V11 좁으면 표 대신 달 하나씩 — 종합 + 출처 다섯 세로 · ◀ ▶ (12월↔1월 돈다)',!V11a.wide&&V11a.one&&V11a.m==='1월'&&V11a.cells===6&&V11a.tag==='갈림'&&m2==='2월'&&m12==='12월',JSON.stringify(V11a)+' '+m2+' '+m12);
  await p.evaluate(()=>{TJ_M.m=0;});
  await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(150);

  await p.evaluate(cy=>tjPick(cy-1),cy);await p.waitForTimeout(150);
  const V12=await p.evaluate(()=>({card:document.querySelectorAll('#v-saju .tjcard').length,t:(document.querySelector('#v-saju .tjt')||{}).textContent,syn:!!document.querySelector('#v-saju .tjsyn'),ys:[...document.querySelectorAll('#v-saju .tjys .sg')].map(x=>x.textContent).join()}));
  ok('V12 1판 해는 예전 그대로 (2판 해와 오가도 깨지지 않는다)',V12.card===1&&V12.t==='옛 1판 제목'&&!V12.syn,JSON.stringify(V12));
  await p.evaluate(cy=>tjPick(cy+1),cy);await p.waitForTimeout(150);
  ok('V12b 다시 2판 해',await p.evaluate(()=>!!document.querySelector('#v-saju .tjsyn')&&document.querySelectorAll('#v-saju .tjst').length===12));

  await p.evaluate(([cy,mk])=>{const MK=eval('('+mk+')');DB.saju.readings['tojeong:'+cy]=MK(cy,3,true);delete DB.ui.tjYear;renderSaju();},[cy,MKs]);
  const V13=await p.evaluate(()=>{const cm=new Date().getMonth()+1;return {y:tjYear(),st:(document.querySelector('#v-saju .tjst.now .tjstm')||{}).textContent,tr:(document.querySelector('#v-saju .tjm2 tr.now th')||{}).textContent||'',cm,when:!!document.querySelector('#v-saju .tjwhen')};});
  ok('V13 올해 2판이 있으면 올해가 기본 · 이번 달 칸 금테 · 표 이번 달 줄 칠함',V13.y===cy&&V13.st===V13.cm+'월'&&V13.tr.indexOf(V13.cm+'월')===0&&!V13.when,JSON.stringify(V13));

  await p.evaluate(cy=>{delete DB.saju.readings['tojeong:'+cy];},cy);
  await p.evaluate(([cy,mk])=>{const MK=eval('('+mk+')');DB.saju.readings['tojeong:'+(cy+1)]=MK(cy+1,5,true);tjPick(cy+1);renderSaju();renderSaju();},[cy,MKs]);
  const V14b=await p.evaluate(cy=>JSON.stringify(DB.saju.readings['tojeong:'+(cy+1)]),cy);
  ok('V14 그리기가 데이터를 바꾸지 않는다(합의는 저장하지 않는다)',V14a===V14b&&!/agree|합의/.test(V14b),V14b.length);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t104 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
