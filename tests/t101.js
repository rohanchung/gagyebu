/* t101 — 📜 사주 「토정비결」 탭 (v5.13 · 기획방 id 62)
   🔒 T1 L1 세 번째 탭 · sjTab 이 tojeong 을 받는다(빠뜨리면 사주로 되돌아간다) · 대토론 분기(SM 비우기)를 안 탄다
      T2 해 고르기(키가 있는 해만 · 기본 올해) · 「참고 · 채점하지 않는다」 · T3 판 셋 나란히(1000px↑) · 좁으면 칩으로 하나씩
      T4 본문은 mdRender 로만 — 날것 HTML 이 안 들어간다 · 길면 접고 「펼쳐 읽는다 · n자」
      T5 달별 표는 months 가 있는 판이 둘 이상일 때만 · 없는 칸 「—」 · 이번 달 행 칠함 · T6 키가 없으면 그렇다고
      T7 다섯 폭 옆 넘침 0 · 10.5px 미만 0 · T8 사주·대토론 탭은 그대로
   🔒 픽스처는 지어낸 글이다(원문을 테스트에 넣지 않는다) */
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
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1280,height:900}}); await ctx.addInitScript(require('./_fakeseed').saju);
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  const measure=()=>p.evaluate(()=>{const box=document.getElementById('v-saju');
    const small=[...box.querySelectorAll('*')].filter(e=>{if(!e.offsetParent)return false;if(e.closest('svg,rt'))return false;
      const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());return own&&parseFloat(getComputedStyle(e).fontSize)<10.5;})
      .filter(e=>e.closest('.tjwrap')).map(e=>e.className+':'+getComputedStyle(e).fontSize+':'+e.textContent.slice(0,10));
    return {over:document.documentElement.scrollWidth-window.innerWidth,small};});
  const cy=await p.evaluate(()=>new Date().getFullYear());
  const L=n=>Array.from({length:n},(_,i)=>'지어낸 문장 '+(i+1)+'번째 줄이다. **굵게** 쓴 말도 있다.').join('\n\n');
  await p.evaluate(([cy,b1,b2])=>{const R=DB.saju.readings;
    R['tojeong:'+cy]={v:1,year:cy,madeAt:cy+'-01-20',src:'test',versions:[
      {by:'GPT',title:'첫째 판 제목',body:b1+'\n\n<img src=x onerror="window.__xss=1">',months:{1:'일월 글',2:'이월 글',3:'삼월 글'}},
      {by:'Claude',title:'둘째 판 제목',body:'짧은 본문',months:null},
      {by:'Gemini',title:'셋째 판 제목',body:b2,months:{1:'일월 다른 글',12:'십이월 글'}}]};
    R['tojeong:'+(cy-1)]={v:1,year:cy-1,madeAt:(cy-1)+'-01-15',src:'test',versions:[{by:'GPT',title:'지난해 판',body:'지난해 본문',months:null}]};
    DB.ui.sajuTab='tojeong';},[cy,L(14),L(3)]);
  await p.click('.side .m[data-v="saju"]');await p.waitForTimeout(300);
  const T1=await p.evaluate(()=>({tab:sjTab(),tabs:[...document.querySelectorAll('#v-saju .pl1 .tab')].map(x=>x.textContent),on:(document.querySelector('#v-saju .pl1 .tab.on')||{}).textContent,card:document.querySelectorAll('#v-saju .tjcard').length}));
  ok('T1 L1 세 번째 탭 「📜 토정비결」 · 눌러도 사주로 안 돌아간다',T1.tab==='tojeong'&&T1.tabs.length===3&&/토정비결/.test(T1.tabs[2])&&/토정비결/.test(T1.on)&&T1.card===3,JSON.stringify(T1));
  const T2=await p.evaluate(()=>{const t=document.getElementById('v-saju').textContent;return {ys:[...document.querySelectorAll('#v-saju .tjys .sg')].map(x=>x.textContent),on:(document.querySelector('#v-saju .tjys .sg.on')||{}).textContent,ref:/참고 · \d{4}-01-20 작성 · 채점하지 않는다/.test(t)};});
  ok('T2 해 고르기 — 키가 있는 해만 · 기본 올해 · 「참고 · 채점하지 않는다」',T2.ys.length===2&&T2.on===cy+'년'&&T2.ref,JSON.stringify(T2));
  const T3=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#v-saju .tjcard')].map(c=>c.getBoundingClientRect());
    return {row:cs.every(r=>Math.abs(r.top-cs[0].top)<2),vis:cs.every(r=>r.width>200&&r.top<window.innerHeight),t:[...document.querySelectorAll('#v-saju .tjt')].map(x=>x.textContent).join('|'),chips:getComputedStyle(document.querySelector('#v-saju .tjchips')).display};});
  ok('T3 1000px 이상 — 판 셋의 제목·본문 첫 부분이 한 화면에 나란히',T3.row&&T3.vis&&T3.t==='첫째 판 제목|둘째 판 제목|셋째 판 제목'&&T3.chips==='none',JSON.stringify(T3));
  const T4=await p.evaluate(()=>{const b=document.querySelector('#v-saju .tjcard .tjbody');return {b:b.querySelectorAll('b,strong').length,img:document.querySelectorAll('#v-saju .tjbody img').length,xss:!!window.__xss,fold:b.classList.contains('fold'),
    more:(document.querySelector('#v-saju .tjcard .tjmore')||{}).textContent,short:!document.querySelectorAll('#v-saju .tjcard')[1].querySelector('.tjmore')};});
  ok('T4 본문은 mdRender 로 — 굵게는 그리고 날것 HTML 은 안 들어간다',T4.b>=3&&T4.img===0&&!T4.xss,JSON.stringify(T4));
  ok('T4b 긴 본문은 접고 「펼쳐 읽는다 · n자」 · 짧으면 단추 없음',T4.fold&&/펼쳐 읽는다 · [\d,]+자/.test(T4.more)&&T4.short,JSON.stringify(T4));
  await p.click('#v-saju .tjcard .tjmore');await p.waitForTimeout(150);
  ok('T4c 누르면 펼친다',await p.evaluate(()=>!document.querySelector('#v-saju .tjcard .tjbody').classList.contains('fold')));
  const T5=await p.evaluate(()=>{const tb=document.querySelector('#v-saju .tjm');if(!tb)return null;
    return {cols:[...tb.querySelectorAll('thead th')].map(x=>x.textContent),rows:tb.querySelectorAll('tbody tr').length,dash:tb.querySelectorAll('tbody td .mut').length,
      now:(tb.querySelector('tr.now th')||{}).textContent,m1:tb.querySelector('tbody tr td').textContent};});
  ok('T5 달별 표 — months 있는 판 둘만 열로 · 12행 · 없는 칸은 「—」 · 이번 달 칠함',!!T5&&T5.cols.join()==='달,GPT,제미니'&&T5.rows===12&&T5.dash===24-5&&T5.now===(new Date().getMonth()+1)+'월'&&T5.m1==='일월 글',JSON.stringify(T5));
  await p.evaluate(cy=>tjPick(cy-1),cy);await p.waitForTimeout(150);
  ok('T5b 판 하나뿐인 해 — 표가 없다 · 지난해 판이 보인다',await p.evaluate(()=>!document.querySelector('#v-saju .tjm')&&/지난해 판/.test(document.getElementById('v-saju').textContent)));
  await p.evaluate(cy=>tjPick(cy),cy);
  for(const [w,h] of [[1536,820],[1280,720],[1280,854],[854,1280],[360,780]]){
    await p.setViewportSize({width:w,height:h});await p.waitForTimeout(250);await p.evaluate(()=>renderSaju());await p.waitForTimeout(100);
    const m=await measure();ok('T7 '+w+'x'+h+' 옆 넘침 0 · 10.5px 미만 0',m.over<=0&&!m.small.length,JSON.stringify(m).slice(0,200));
  }
  const T3b=await p.evaluate(()=>{const vis=[...document.querySelectorAll('#v-saju .tjcard')].filter(c=>c.offsetParent).length;
    tjVerPick(2);const by=[...document.querySelectorAll('#v-saju .tjcard')].filter(c=>c.offsetParent).map(c=>c.dataset.by);return {vis,by,chips:getComputedStyle(document.querySelector('#v-saju .tjchips')).display};});
  ok('T3c 좁으면 판 칩으로 하나씩',T3b.vis===1&&T3b.by.join()==='Gemini'&&T3b.chips==='block',JSON.stringify(T3b));
  await p.setViewportSize({width:1280,height:900});
  await p.evaluate(()=>{Object.keys(DB.saju.readings).forEach(k=>{if(/^tojeong:/.test(k))delete DB.saju.readings[k];});renderSaju();});
  ok('T6 키가 없으면 「아직 없다 — 사주방이 넣는다」',await p.evaluate(()=>/토정비결이 아직 없다 — 사주방이 넣는다/.test(document.getElementById('v-saju').textContent)));
  const T8=await p.evaluate(()=>{SM.data={x:1};sjSetTab('tojeong');const keep=SM.data;sjSetTab('main');const main=/총운/.test(document.getElementById('v-saju').textContent);
    sjSetTab('summit');const sm=sjTab()==='summit'&&SM.data===null;sjSetTab('main');return {keep:!!keep,main,sm};});
  ok('T8 사주 탭 그대로 · 대토론은 들어갈 때 새로 읽는다 · 토정 탭은 대토론 분기를 안 탄다',T8.keep&&T8.main&&T8.sm,JSON.stringify(T8));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t101 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
