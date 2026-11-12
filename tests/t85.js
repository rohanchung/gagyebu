/* t85 — 🎯 조사 짝 보기 · 🔊 조사 듣기 · 🃏 문법 오답 카드(gref) (v4.95 · 학습사 v35·v36)
   🔒 P1 자동 조사 문항의 오답은 뜻이 바뀌는 짝부터(に → で) · P2 は↔が 는 여전히 서로 오답이 아니다
      A1 듣기 모드는 조사 채우기와 같은 문항 수 · A2 음성이 있으면 칸이 그려진다 · A3 새 문항이면 문장 전체(띄어쓰기 없이)를 읽는다
      A4 느리게 = 0.6 · A5 카운터는 문장(sents) — 단어 카운터는 그대로
      C1 🔴 틀리면 카드: 정답 뜻·역할 · 고른 것이 안 되는 이유(vs) · 함정 · 해설 · 문장 속 단어(gloss)
      C2 vs 가 없으면 두 역할을 나란히 · C3 맞히면 초록 카드 + 나머지 보기의 뜻 · C4 「표기@cat」이 먼저
      W1 gloss 없는 문장도 단어장에서 찾는다(行きませんか → 行く) · K1 문법도 picks{id,chose,ans} 를 남긴다 */
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
  await ctx.addInitScript(()=>{window.__spk=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'ja-JP',name:'J'}],speak(u){window.__spk.push({t:u.text,r:u.rate});},cancel(){}}});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,writable:true,value:function(t){this.text=t;}});});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  await p.evaluate(()=>{
    const S=DB.study;
    S.words=[{id:'k1',kana:'でんしゃ',kanji:'電車',ko:'전철'},{id:'k2',kana:'いく',kanji:'行く',ko:'가다'},{id:'k3',kana:'まいにち',kanji:'毎日',ko:'매일'},{id:'k4',kana:'のる',kanji:'乗る',ko:'타다'}];
    S.sents=[
      {id:'s1',ja:'わたしは 毎日 電車に 乗ります。',ko:'나는 매일 전철을 탑니다.',slots:[{kind:'particle',target:'に',opts:['で','を','が'],why:'타는 대상은 に'}],
        gloss:[{w:'電車',ko:'전철',base:'でんしゃ',kanji:'電車'},{w:'乗ります',ko:'타다',base:'のる',kanji:'乗る',note:'ます형'}]},
      {id:'s2',ja:'あした 東京に 行きませんか。',ko:'내일 도쿄에 가지 않겠습니까?'},
      {id:'s3',ja:'先生は 本を 読みます。',ko:'선생님은 책을 읽습니다.'}];
    S.gref={v:1,items:{
      'に':{cat:'particle',ko:'에 · 에게',role:'도착점 · 타는 대상',trap:'電車に のる — 한국어 「을」인데 に',vs:{'で':'で는 동작 장소, に는 도착점'},ex:'電車に のる'},
      'で':{cat:'particle',ko:'에서 · 로',role:'동작 장소 · 수단'},
      'を':{cat:'particle',ko:'을 · 를',role:'목적어'},
      'でも':{cat:'particle',ko:'라도'},'でも@conj':{cat:'conj',ko:'하지만'}}};
  });
  /* P — 짝 보기 */
  const P=await p.evaluate(()=>{let hit=0,twin=0;for(let k=0;k<30;k++){const q=stGPartQ(stSentById('s2'),{i:1,p:'に',why:''});if(q.opts.indexOf('で')>=0)hit++;}
    for(let k=0;k<30;k++){const q=stGPartQ(stSentById('s3'),{i:0,p:'は',why:''});if(q.opts.indexOf('が')>=0||q.opts.indexOf('も')>=0)twin++;}
    return {hit,twin};});
  ok('P1 に 문항엔 언제나 で 가 보기에',P.hit===30,JSON.stringify(P));
  ok('P2 は 문항엔 が·も 가 안 섞인다',P.twin===0,JSON.stringify(P));
  /* A — 듣기 */
  const A=await p.evaluate(async()=>{
    const n1=stGramItems('gpart').length, n2=stGramItems('gpart-a').length;
    DB.ui.studyTab='word'; document.querySelector('.side .m[data-v="study"]').click(); await new Promise(r=>setTimeout(r,300));
    const btn=[...document.querySelectorAll('.gmode button')].some(b=>/조사 듣기/.test(b.textContent));
    window.__spk=[]; stDrillStart('gpart-a',2); await new Promise(r=>setTimeout(r,400));
    const s=stDrillItem(ST_DRILL,ST_DRILL.i), spk=window.__spk.slice(), play=!!document.querySelector('#v-study .gplay');
    stSpeakSent(true); const slow=window.__spk[window.__spk.length-1];
    const w0=JSON.stringify(DB.study.words.map(w=>w.m||null)), seen0=+s.seen||0;
    stDrillGrade(stGramQ(ST_DRILL,ST_DRILL.i).ans);
    const w1=JSON.stringify(DB.study.words.map(w=>w.m||null));
    return {n1,n2,btn,spk,ja:String(s.ja).replace(/\s+/g,''),play,slow,seenUp:(+s.seen||0)===seen0+1,wSame:w0===w1};});
  ok('A1 듣기 모드 = 조사 채우기와 같은 문항 수',A.n1>0&&A.n1===A.n2,A.n1+'/'+A.n2);
  ok('A2 음성이 있으면 「🔊 조사 듣기」 칸',A.btn);
  ok('A3 🔴 새 문항이면 문장 전체를 한 번 읽는다(띄어쓰기 없이)',A.spk.length===1&&A.spk[0].t===A.ja&&A.play,JSON.stringify(A.spk));
  ok('A4 느리게 = 0.6',A.slow&&A.slow.r===0.6,JSON.stringify(A.slow));
  ok('A5 카운터는 문장 — 단어 카운터는 그대로',A.seenUp&&A.wSame);
  await p.evaluate(()=>{stDrillQuit();stDrillClose();});
  /* C — 카드 */
  const C=await p.evaluate(async()=>{
    stDrillStart('gpart',3);
    let guard=0; while(ST_DRILL.ids[ST_DRILL.i]!=='s1'||!(stGramQ(ST_DRILL,ST_DRILL.i).ans==='に')){ if(++guard>10)return null; ST_DRILL.i=(ST_DRILL.i+1)%ST_DRILL.ids.length; }
    stDrillGrade('で'); await new Promise(r=>setTimeout(r,100));
    const c1=document.querySelector('#v-study .gcard'); const t1=c1?c1.textContent:'';
    const ok1=c1&&!c1.classList.contains('okc');
    stDrillNext(); return {t1,ok1};});
  ok('C1 🔴 틀리면 카드 — 정답 뜻·역할 · 고른 것이 안 되는 이유 · 함정 · 해설 · 문장 속 단어',
    !!C&&C.ok1&&/에 · 에게/.test(C.t1)&&/도착점/.test(C.t1)&&/で는 동작 장소, に는 도착점/.test(C.t1)&&/함정/.test(C.t1)&&/한국어 「을」인데 に/.test(C.t1)&&/타는 대상은 に/.test(C.t1)&&/문장 속 단어/.test(C.t1)&&/のる/.test(C.t1)&&/나는 매일 전철을 탑니다/.test(C.t1),C&&C.t1.slice(0,400));
  const C2=await p.evaluate(()=>{const h=stGramCard(stSentById('s1'),{ans:'に',ja:'わたしは 毎日 電車（　） 乗ります。',opts:['に','を','で','が']},{ok:false,my:'を'},'gpart');
    const h3=stGramCard(stSentById('s1'),{ans:'に',ja:'わたしは 毎日 電車（　） 乗ります。',opts:['に','を','で','が']},{ok:true,my:'に'},'gpart');
    return {h,h3,c4a:(stGref('でも','conj')||{}).ko,c4b:(stGref('でも','particle')||{}).ko};});
  ok('C2 vs 가 없으면 두 역할을 나란히',/도착점 · 타는 대상/.test(C2.h)&&/목적어/.test(C2.h),C2.h.slice(0,300));
  ok('C3 맞히면 초록 카드 + 나머지 보기의 뜻',/okc/.test(C2.h3)&&/나머지 보기/.test(C2.h3)&&/을 · 를/.test(C2.h3)&&/에서 · 로/.test(C2.h3));
  ok('C4 「표기@cat」 먼저 · 없으면 표기',C2.c4a==='하지만'&&C2.c4b==='라도',JSON.stringify(C2.c4a+'|'+C2.c4b));
  const W=await p.evaluate(()=>stSentGloss(stSentById('s2')).map(g=>g.kana+':'+g.ko));
  ok('W1 gloss 없는 문장도 단어장에서(行きませんか → 行く)',W.indexOf('いく:가다')>=0,JSON.stringify(W));
  const K=await p.evaluate(()=>{stDrillQuit();const d=DB.study.drills.filter(x=>x.mode==='gpart').slice(-1)[0];stDrillClose();return d&&d.picks;});
  ok('K1 문법도 picks{id,chose,ans}',Array.isArray(K)&&K.some(x=>x.id==='s1'&&x.chose==='で'&&x.ans==='に'),JSON.stringify(K));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t85 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
