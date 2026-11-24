/* t105 — 🈷 드릴의 한자 뜻(훈음) 병기 (v5.17)   로한(11/24): 「학습 드릴에서 한자 나올 때 한자 뜻도 병기해줘」
   🔒 H1 한자 읽기(k2r) 문제 화면에 글자마다 훈음 · H2 한자→뜻(k2m)·읽기→한자(r2k) 문제 화면엔 없다(훈이 답을 흘린다)
      H3 정답 카드엔 모든 모드에 · H4 표에 없는 글자는 지어내지 않고 건너뛴다 · H5 학습방 kanjiHun 이 앱 표보다 먼저
      H6 표 600자 · 꼴은 「훈 음」 · H7 360·1280 옆 넘침 0 · 10.5px 미만 0 · Z 에러 없음
   🔒 단어는 지어낸 단어장이다(실데이터 아님) */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{}}; const at=new Date().toISOString();
  const words=[{id:'w1',kana:'うでどけい',kanji:'腕時計',ko:'손목시계'},{id:'w2',kana:'がっこう',kanji:'学校',ko:'학교'},{id:'w3',kana:'でんしゃ',kanji:'電車',ko:'전철'},
    {id:'w4',kana:'さくら',kanji:'桜',ko:'벚꽃'},{id:'w5',kana:'みず',kanji:'水',ko:'물'},{id:'w6',kana:'やま',kanji:'山',ko:'산'}];
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv['study/words']={data:words,rev:1,at}; S.kv['study/drills']={data:[],rev:1,at}; S.kv['study/rest']={data:{v:1},rev:1,at}; S.kv.pref={data:{},rev:1,at};
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
  await p.evaluate(()=>{document.querySelector('.side .m[data-v="study"]').click();stTab&&stTab('word');});await p.waitForTimeout(400);
  /* 지금 문항의 단어 · 화면의 훈음 줄 */
  const cur=()=>p.evaluate(()=>{const D=ST_DRILL,w=stWordById(D.ids[D.i]);const q=document.querySelector('#v-study .stdq');
    const k=q&&q.querySelector(':scope > .kjhun'), card=q&&q.querySelector('.oops .kjhun');
    return {kanji:w.kanji,q:k?[...k.children].map(x=>x.textContent).join('|'):null,card:card?[...card.children].map(x=>x.textContent).join('|'):null,
      opt:document.querySelectorAll('#v-study .stdopt .kjhun').length};});
  const exp={'腕時計':'腕팔 완|時때 시|計셀 계','学校':'学배울 학|校학교 교','電車':'電번개 전|車수레 차','水':'水물 수','山':'山메 산','桜':null};

  await p.evaluate(()=>stDrillStart('k2r',6));await p.waitForTimeout(300);
  let seen=0, okQ=true, okCard=true, log=[];
  for(let i=0;i<6;i++){
    const a=await p.evaluate(()=>ST_DRILL.fin);if(a)break;
    const c=await cur(); log.push(JSON.stringify(c));
    if(c.q!==exp[c.kanji])okQ=false;
    await p.evaluate(()=>stDrillGrade(ST_DRILL.opts[ST_DRILL.i][0]));await p.waitForTimeout(60);
    const c2=await cur(); if(c2.card!==exp[c2.kanji]||c2.q!==null)okCard=false;
    seen++; await p.evaluate(()=>stDrillNext());await p.waitForTimeout(40);
  }
  ok('H1 한자 읽기 문제 화면 — 글자마다 훈음 (腕 팔 완 · 時 때 시 · 計 셀 계)',seen>=5&&okQ,log.join(' / '));
  ok('H3 정답 카드에 훈음 · 문제 줄은 사라진다',okCard,log.join(' / '));
  await p.evaluate(()=>{if(!ST_DRILL.fin)stDrillQuit();stDrillClose&&stDrillClose();});await p.waitForTimeout(200);

  for(const mode of ['k2m','r2k']){
    await p.evaluate(m=>stDrillStart(m,6),mode);await p.waitForTimeout(300);
    let leak=0,card=0,n=0;
    for(let i=0;i<6;i++){
      if(await p.evaluate(()=>ST_DRILL.fin))break;
      const c=await cur(); if(c.q!==null||c.opt)leak++;
      await p.evaluate(()=>stDrillGrade(ST_DRILL.opts[ST_DRILL.i][0]));await p.waitForTimeout(60);
      const c2=await cur(); if(c2.card===exp[c2.kanji])card++; n++;
      await p.evaluate(()=>stDrillNext());await p.waitForTimeout(40);
    }
    ok('H2 '+mode+' 문제 화면엔 훈음이 없다(답을 흘린다) · 보기에도 없다',n>=5&&leak===0,leak+'/'+n);
    ok('H3b '+mode+' 정답 카드엔 있다',card===n&&n>=5,card+'/'+n);
    await p.evaluate(()=>{if(!ST_DRILL.fin)stDrillQuit();stDrillClose&&stDrillClose();});await p.waitForTimeout(200);
  }
  const H4=await p.evaluate(()=>({only:kjHunHtml('桜'),mix:kjHunHtml('桜水'),kana:kjHunHtml('さくら'),dup:kjHun('人人').length}));
  ok('H4 표에 없는 글자는 건너뛴다(지어내지 않는다) · 가나는 무시 · 같은 글자 한 번',H4.only===''&&/水/.test(H4.mix)&&!/桜/.test(H4.mix)&&H4.kana===''&&H4.dup===1,JSON.stringify(H4));
  const H5=await p.evaluate(()=>{DB.study.kanjiHun={'桜':'앵두 앵(일: 벚꽃)','水':'물 수(학습방)'};const r=kjHun('桜水').map(x=>x.join('')).join('|');delete DB.study.kanjiHun;return r;});
  ok('H5 학습방 kanjiHun 이 앱 표보다 먼저 · 표에 없는 글자도 채운다',H5==='桜앵두 앵(일: 벚꽃)|水물 수(학습방)',H5);
  const H6=await p.evaluate(()=>{const L=KJ_HUN_SRC.split('|');return {n:L.length,uniq:new Set(L.map(x=>x[0])).size,form:L.filter(x=>!/^.\S+(\s\S+)+/.test(x)).slice(0,5)};});
  ok('H6 표 600자 · 겹침 없음 · 꼴 「훈 음」',H6.n===600&&H6.uniq===600&&!H6.form.length,JSON.stringify(H6));
  /* 크기 — 문제 화면 · 정답 카드 */
  for(const [w,h] of [[1280,720],[360,780]]){
    await p.setViewportSize({width:w,height:h});
    await p.evaluate(()=>stDrillStart('k2r',6));await p.waitForTimeout(300);
    const m1=await p.evaluate(()=>{const s=[...document.querySelectorAll('#v-study .kjhun, #v-study .kjhun *')].filter(e=>e.offsetParent&&parseFloat(getComputedStyle(e).fontSize)<10.5).length;
      return {over:document.documentElement.scrollWidth-window.innerWidth,small:s,has:document.querySelectorAll('#v-study .kjhun').length};});
    await p.evaluate(()=>stDrillGrade(ST_DRILL.opts[ST_DRILL.i][0]));await p.waitForTimeout(80);
    const m2=await p.evaluate(()=>({over:document.documentElement.scrollWidth-window.innerWidth,has:document.querySelectorAll('#v-study .oops .kjhun').length}));
    ok('H7 '+w+'x'+h+' 옆 넘침 0 · 10.5px 미만 0',m1.has===1&&m1.over<=0&&!m1.small&&m2.has===1&&m2.over<=0,JSON.stringify([m1,m2]));
    await p.evaluate(()=>{if(!ST_DRILL.fin)stDrillQuit();stDrillClose&&stDrillClose();});await p.waitForTimeout(150);
  }
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t105 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
