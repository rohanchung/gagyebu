/* t102 — 🏆 견문록 「복고티」 · 「올해의 작품」 (v5.13 · 기획방 id 63)
   🔒 G1 goty 줄이 있을 때만 L2 앞에 칩 둘 · G2 해마다 한 판(최근 위) · 수상작 🏆 + 명조 + 봉랍 · 후보는 시간 긴 순 · 막대 + 「106.3시간」
      G3 시간 없는 후보는 막대 없이 · G4 수상작 없는 해 「후보 n — 아직 뽑지 않았다」 · 수상작만 있는 해 「후보 기록 없음」
      G5 일반 목록에 note 가 보인다(두 줄 자름) · 🏆/후보 표시 · 수상작은 방패 자리에 🏆
      G6 고치기 창 — 시간·시상·수상 · 한 해 한 판 수상작은 하나 · G7 다섯 폭 옆 넘침 0 · 10.5px 미만 0
   🔒 픽스처는 지어낸 이름이다(노션 원문을 싣지 않는다) */
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
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  const measure=()=>p.evaluate(()=>{
    const small=[...document.querySelectorAll('#v-life .lffolio *')].filter(e=>{if(!e.offsetParent)return false;
      const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());return own&&parseFloat(getComputedStyle(e).fontSize)<10.5;})
      .map(e=>e.className+':'+getComputedStyle(e).fontSize+':'+e.textContent.slice(0,10));
    return {over:document.documentElement.scrollWidth-window.innerWidth,small};});
  await p.evaluate(()=>{const L=lifeDB(),n=new Date().toISOString();let k=0;
    const add=(o)=>L.seen.push(Object.assign({id:'s'+(k++),createdAt:n,updatedAt:n,deletedAt:null,genre:'게임',medium:'',grade:null,note:''},o));
    add({date:'2025',title:'가상 게임 왕관',goty:{year:2025,won:true,board:'game'},hours:120});
    [['후보 가',106.3],['후보 나',80],['후보 다',55.5],['후보 라',null],['후보 마',30],['후보 바',12],['후보 사',null],['후보 아',3]].forEach(c=>add({date:'2025',title:c[0],hours:c[1],goty:{year:2025,won:false,board:'game'}}));
    add({date:'2024',title:'작년 왕관',goty:{year:2024,won:true,board:'game'},hours:null});
    add({date:'2024',title:'작년 후보 하나',hours:40,goty:{year:2024,won:false,board:'game'}});
    add({date:'2024',title:'작년 후보 둘',hours:20,goty:{year:2024,won:false,board:'game'}});
    add({date:'2026',title:'올해 후보 하나',hours:50,goty:{year:2026,won:false,board:'game'}});
    add({date:'2026',title:'올해 후보 둘',hours:null,goty:{year:2026,won:false,board:'game'}});
    add({date:'2019',title:'옛 왕관',goty:{year:2019,won:true,board:'game'}});
    add({date:'2024',title:'가상 드라마',genre:'드라마',goty:{year:2024,won:true,board:'contents'}});
    add({date:'2024-05-01',title:'메모 있는 책',genre:'책',grade:'A',note:'지어낸 메모 한 줄이다. 아주 길게 써서 두 줄에서 잘리는지 본다. '.repeat(6)});
    DB.ui.lfGenre='';});
  await p.click('.side .m[data-v="life"]');await p.waitForTimeout(300);
  await p.evaluate(()=>pfL1Set('life','seen'));await p.waitForTimeout(200);
  const G1=await p.evaluate(()=>[...document.querySelectorAll('#v-life .pl2 .chp')].map(x=>x.textContent));
  ok('G1 L2 장르 칩 앞에 「🏆 복고티」 「🏆 올해의 작품」',/복고티/.test(G1[0])&&/올해의 작품/.test(G1[1])&&/전체/.test(G1[2]),JSON.stringify(G1));
  const G5=await p.evaluate(()=>{const rows=[...document.querySelectorAll('#v-life .lfseen')];const r=rows.find(x=>/메모 있는 책/.test(x.textContent));const nt=r&&r.querySelector('.lfnote');
    const w=rows.find(x=>/가상 게임 왕관/.test(x.textContent)),c=rows.find(x=>/후보 가/.test(x.textContent));
    return {note:!!nt&&/지어낸 메모/.test(nt.textContent),cut:!!nt&&nt.textContent.length>150&&nt.getBoundingClientRect().height<=parseFloat(getComputedStyle(nt).lineHeight)*2+2,w:w&&w.textContent,wc:w&&w.querySelector('.lfcrest').textContent,c:c&&c.textContent,n:rows.length};});
  ok('G5 🔴 일반 목록에 note 가 보인다 · 두 줄에서 자른다',G5.note&&G5.cut,JSON.stringify(G5).slice(0,200));
  ok('G5b 수상작은 🏆 연도 · 방패 자리에 🏆 · 후보는 「후보 2025」 · 시간',/🏆 2025/.test(G5.w)&&G5.wc==='🏆'&&/후보 2025/.test(G5.c)&&/106\.3시간/.test(G5.c),JSON.stringify(G5).slice(0,240));
  await p.evaluate(()=>lfGenreSet(-2));await p.waitForTimeout(150);
  const G2=await p.evaluate(()=>{const ys=[...document.querySelectorAll('#v-life .lfgy')];
    return {years:ys.map(y=>y.querySelector('.lfy').textContent),
      y25:{w:(ys[1].querySelector('.lfgwt')||{}).textContent,seal:(ys[1].querySelector('.lfgseal')||{}).textContent,crest:(ys[1].querySelector('.lfgw .lfcrest')||{}).textContent,
        c:[...ys[1].querySelectorAll('.lfgc')].map(x=>x.querySelector('.lfgct').textContent),bars:ys[1].querySelectorAll('.lfgbar').length,h:(ys[1].querySelector('.lfgc .lfgh')||{}).textContent,
        nohr:[...ys[1].querySelectorAll('.lfgc.nohr')].map(x=>x.textContent),serif:getComputedStyle(ys[1].querySelector('.lfgwt')).fontFamily},
      y26:ys[0].textContent,y19:ys[3].textContent,act:(document.querySelector('#v-life .pl2 .chp.on')||{}).textContent};});
  ok('G2 해마다 한 판 · 최근 해가 위',G2.years.join()==='2026,2025,2024,2019'&&/복고티/.test(G2.act),JSON.stringify(G2.years));
  ok('G2b 수상작 🏆 + 명조 제목 + 「복고티」 봉랍',G2.y25.w==='가상 게임 왕관'&&G2.y25.seal==='복고티'&&G2.y25.crest==='🏆'&&/Myeongjo|Serif|Batang|serif/.test(G2.y25.serif),JSON.stringify(G2.y25).slice(0,200));
  ok('G2c 후보는 시간 긴 순 · 막대 + 「106.3시간」',G2.y25.c.slice(0,6).join()==='후보 가,후보 나,후보 다,후보 마,후보 바,후보 아'&&G2.y25.bars===6&&G2.y25.h==='106.3시간',JSON.stringify(G2.y25.c));
  ok('G3 시간 없는 후보는 막대 없이 이름만(맨 뒤)',G2.y25.nohr.join()==='후보 라,후보 사',JSON.stringify(G2.y25.nohr));
  ok('G4 수상작 없는 해 — 「후보 2 — 아직 뽑지 않았다」',/후보 2 — 아직 뽑지 않았다/.test(G2.y26),G2.y26.slice(0,60));
  ok('G4b 수상작만 있는 해 — 「후보 기록 없음」(뽑았는데 후보를 안 남긴 해)',/후보 기록 없음/.test(G2.y19)&&!/아직 뽑지 않았다/.test(G2.y19),G2.y19);
  await p.evaluate(()=>lfGenreSet(-3));await p.waitForTimeout(150);
  ok('G2d 「올해의 작품」 판은 그 판 줄만 · 봉랍 「올해의 작품」',await p.evaluate(()=>{const t=document.querySelector('#v-life .lffolio').textContent;return /가상 드라마/.test(t)&&!/가상 게임 왕관/.test(t)&&/올해의 작품/.test((document.querySelector('#v-life .lfgseal')||{}).textContent||'');}));
  const G6=await p.evaluate(()=>{const x=lifeDB().seen.find(q=>q.title==='후보 나');lfModal('seen',x.id);
    const f={h:document.getElementById('lf_hours').value,b:document.getElementById('lf_gboard').value,y:document.getElementById('lf_gyear').value,w:document.getElementById('lf_gwon').checked};
    document.getElementById('lf_hours').value='81.5';lfSave();const a={h:x.hours,g:JSON.stringify(x.goty)};
    lfModal('seen',x.id);document.getElementById('lf_gwon').checked=true;let msg='';const ka=window.alert;window.alert=m=>{msg=m;};lfSave();window.alert=ka;closeModal();
    return {f,a,msg,still:x.goty.won};});
  ok('G6 고치기 창에 시간·시상·해·수상 · 저장하면 hours 숫자',G6.f.h==='80'&&G6.f.b==='game'&&G6.f.y==='2025'&&!G6.f.w&&G6.a.h===81.5&&G6.a.g==='{"year":2025,"won":false,"board":"game"}',JSON.stringify(G6));
  ok('G6b 🔒 한 해 한 판에 수상작은 하나 — 둘째를 막는다',/이미 있다/.test(G6.msg)&&G6.still===false,JSON.stringify(G6));
  for(const [w,h] of [[1536,820],[1280,720],[1280,854],[854,1280],[360,780]]){
    await p.setViewportSize({width:w,height:h});await p.waitForTimeout(250);
    for(const g of [-2,-1]){await p.evaluate(g=>lfGenreSet(g),g);await p.waitForTimeout(80);
      const m=await measure();ok('G7 '+w+'x'+h+(g===-2?' 복고티':' 목록')+' 옆 넘침 0 · 10.5px 미만 0',m.over<=0&&!m.small.length,JSON.stringify(m).slice(0,200));}
  }
  await p.setViewportSize({width:1280,height:900});
  await p.evaluate(()=>{lifeDB().seen.forEach(x=>{x.goty=null;});lfGenreSet(-1);});
  ok('G1b goty 줄이 없으면 칩이 없다',await p.evaluate(()=>![...document.querySelectorAll('#v-life .pl2 .chp')].some(x=>/복고티|올해의 작품/.test(x.textContent))));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t102 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
