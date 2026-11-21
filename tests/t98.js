/* t98 — 🆕 문형 뜻 드릴 gmean · 해설 후리가나 (v5.10 · 학습사 id 8 · 11/16 로한 직접 요청)
   🔒 M1 mean 슬롯만 문항이 된다 · M2 🔴 다른 모드(gform·gpart…)는 mean 슬롯을 빈칸으로 내지 않는다
      M3 출제 — 빈칸 없이 문장 그대로 · target 만 칠한다 · 보기는 한국어 뜻 넷 · 번역·후리가나는 아직 없다
      M4 틀리면 카드 — 칠한 부분 · 번역 · 정답 뜻 · 고른 뜻 · why · 후리가나 · M5 카운터는 문장(sents)
      R1 후리가나는 해설에만 · 送り仮名 꼬리를 떼어 맞춘다 · R2 읽기가 갈리는 한자·숫자 뒤·모르는 한자는 그대로
      R3 gloss 가 단어장보다 먼저 · R4 다른 문법 카드·결과 화면에도 붙는다 · U1 드릴 탭 문법 묶음에 「문형 뜻」 행 */
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
  await p.evaluate(()=>{
    const S=DB.study;
    S.words=[{id:'k1',kana:'りょうしん',kanji:'両親',ko:'부모'},{id:'k2',kana:'あんしん',kanji:'安心',ko:'안심'},
      {id:'k3',kana:'しゃしん',kanji:'写真',ko:'사진'},{id:'k4',kana:'とる',kanji:'撮る',ko:'찍다'},
      /* 읽기가 갈리는 한자 — 行く(い) · 行う(おこな) → 그대로 둔다 */
      {id:'k5',kana:'いく',kanji:'行く',ko:'가다'},{id:'k6',kana:'おこなう',kanji:'行う',ko:'행하다'},
      {id:'k7',kana:'ひ',kanji:'日',ko:'날'},{id:'k8',kana:'でんしゃ',kanji:'電車',ko:'전철'}];
    S.sents=[
      {id:'m1',ja:'両親を 安心させる。',ko:'부모님을 안심시킨다.',src:'rohan:gram-1114',
        slots:[{kind:'mean',target:'させる',ans:'〜하게 하다(시키다)',opts:['〜당하다','〜할 수 있다','억지로 〜하게 되다'],why:'사역 〜させる = 〜하게 하다'}]},
      {id:'m2',ja:'写真を 撮られるのも きらいです。',ko:'사진 찍히는 것도 싫습니다.',src:'rohan:gram-1114',
        slots:[{kind:'mean',target:'撮られる',ans:'찍히다(당하다)',opts:['찍게 하다','찍을 수 있다','찍으려고 하다'],why:'수동 〜られる'}]},
      {id:'m3',ja:'3日に 行きます。 会議を 行います。',ko:'3일에 갑니다. 회의를 합니다.',
        slots:[{kind:'mean',target:'行います',ans:'합니다',opts:['갑니다','옵니다','봅니다'],why:'行う'},
               {kind:'form',target:'に',opts:['で','を','が'],why:'날짜 に'}]},
      /* 🔴 뜻 슬롯만 가진 문장은 문형(gform) 빈칸 문제로 나오면 안 된다 */
      {id:'m4',ja:'電車に 乗らせる。',ko:'전철에 태우게 한다.',gloss:[{w:'電車',base:'でんしゃ',kanji:'電車',ko:'전철'}],
        slots:[{kind:'mean',target:'乗らせる',ans:'태우게 하다',opts:['타다','타게 되다','탈 수 있다'],why:'사역'}]}];
  });
  /* M1·M2 */
  const M=await p.evaluate(()=>({mean:stGramItems('gmean').length,form:stGramItems('gform').map(x=>x.s.id+':'+x.slot.target),
    ok:stGModeOK('gmean')&&stIsGram('gmean'),pq:stGramItems('gpart').every(it=>{const q=stGMkQ(it.s,'gpart',it);return q.ans!=='させる'&&q.ans!=='撮られる';})}));
  ok('M1 mean 슬롯 넷이 문항 넷',M.mean===4&&M.ok,JSON.stringify(M));
  ok('M2 🔴 문형(gform)에는 form 슬롯만 — mean 슬롯이 빈칸으로 안 나온다',M.form.join()==='m3:に',JSON.stringify(M.form));
  ok('M2b 조사 드릴도 뜻 슬롯을 정답으로 묻지 않는다',M.pq);
  /* U1 — 드릴 탭 행 */
  const U=await p.evaluate(async()=>{DB.ui.studyTab='word';document.querySelector('.side .m[data-v="study"]').click();await new Promise(r=>setTimeout(r,300));
    const r=document.querySelector('#v-study .drow[data-mode="gmean"]');return {has:!!r,off:r?r.classList.contains('off'):null,t:r?r.textContent:''};});
  ok('U1 드릴 탭 문법 묶음에 「문형 뜻」 행',U.has&&!U.off&&/문형 뜻/.test(U.t),JSON.stringify(U));
  /* M3 — 출제 화면 */
  const Q=await p.evaluate(async()=>{stDrillStart('gmean',4);await new Promise(r=>setTimeout(r,200));
    const D=ST_DRILL,j=D.ids.indexOf('m1');if(j<0)return null;[D.ids[0],D.ids[j]]=[D.ids[j],D.ids[0]];[D.qs[0],D.qs[j]]=[D.qs[j],D.qs[0]];D.i=0;
    renderStudy();await new Promise(r=>setTimeout(r,100));
    const q=stGramQ(ST_DRILL,ST_DRILL.i), box=document.querySelector('#v-study .stdq');
    return {ja:box.querySelector('.gja').textContent,hl:(box.querySelector('.gja .gmhl')||{}).textContent,ruby:box.querySelectorAll('ruby').length,
      opts:[...box.querySelectorAll('.stdopt button')].map(x=>x.textContent.replace(/^\d/,'')),ans:q.ans,ko:/안심시킨다/.test(box.textContent),
      blank:/（　）/.test(box.textContent),hint:/빨간 부분의 뜻/.test(box.textContent),color:getComputedStyle(box.querySelector('.gmhl')).color};});
  ok('M3a 빈칸 없이 문장 그대로',!!Q&&Q.ja==='両親を 安心させる。'&&!Q.blank,JSON.stringify(Q));
  ok('M3b target 만 붉게 칠한다',Q&&Q.hl==='させる'&&/rgb\(19\d|rgb\(2\d\d/.test(Q.color),Q&&Q.color);
  ok('M3c 보기는 한국어 뜻 넷(정답 포함)',Q&&Q.opts.length===4&&Q.opts.indexOf('〜하게 하다(시키다)')>=0&&Q.ans==='〜하게 하다(시키다)',JSON.stringify(Q&&Q.opts));
  ok('M3d 🔒 출제 화면엔 후리가나·번역이 없다',Q&&Q.ruby===0&&!Q.ko&&Q.hint);
  /* M4 — 틀리면 카드 */
  const C=await p.evaluate(async()=>{const s=stSentById('m1'),seen0=+s.seen||0;stDrillGrade('〜당하다');await new Promise(r=>setTimeout(r,100));
    const c=document.querySelector('#v-study .gcard');
    return {t:c?c.textContent:'',okc:c?c.classList.contains('okc'):null,rb:c?[...c.querySelectorAll('.gcja ruby')].map(r=>r.innerHTML):[],
      hl:c?(c.querySelector('.gcja .gmhl')||{}).textContent:'',seenUp:(+s.seen||0)===seen0+1,miss:+s.miss||0};});
  ok('M4a 틀리면 붉은 카드',C.okc===false,JSON.stringify(C).slice(0,200));
  ok('M4b 칠한 부분 · 번역 · 정답 뜻 · 고른 뜻 · why',/안심시킨다/.test(C.t)&&/〜하게 하다\(시키다\)/.test(C.t)&&/내가 고른 뜻〜당하다/.test(C.t)&&/사역 〜させる/.test(C.t)&&C.hl==='させる',C.t.slice(0,200));
  ok('M4c 🆕 해설엔 후리가나 — 両親(りょうしん) · 安心(あんしん)',C.rb.length===2&&/りょうしん/.test(C.rb[0])&&/あんしん/.test(C.rb[1]),JSON.stringify(C.rb));
  ok('M5 카운터는 문장(seen·miss)',C.seenUp&&C.miss===1,JSON.stringify(C));
  /* R — 후리가나 규칙 */
  const R=await p.evaluate(()=>({
    okuri:stRuby('写真を 撮られる',null),
    amb:stRuby('会議を 行います',null),
    dig:stRuby('3日に',null),
    gl:stRuby(mdEsc('電車に 乗らせる。'),stSentById('m4')),
    tag:stRuby('<span class="gmhl">撮られる</span>',null)}));
  ok('R1 送り仮名 꼬리를 떼어 맞춘다(撮る → 撮=と)',/<ruby>撮<rt>と<\/rt><\/ruby>られる/.test(R.okuri)&&/<ruby>写真<rt>しゃしん<\/rt><\/ruby>/.test(R.okuri),R.okuri);
  ok('R2 🔒 읽기가 갈리는 한자(行)는 그대로',R.amb.indexOf('<ruby>行')<0,R.amb);
  ok('R2b 숫자 뒤(3日)는 그대로 — みっか 를 ひ 로 붙이지 않는다',R.dig==='3日に',R.dig);
  ok('R2c 모르는 한자(会議)는 그대로',R.amb.indexOf('<ruby>会議')<0);
  ok('R3 gloss 로도 읽기를 단다',/<ruby>電車<rt>でんしゃ<\/rt><\/ruby>/.test(R.gl),R.gl);
  ok('R3b 태그 안은 건드리지 않는다',/^<span class="gmhl"><ruby>撮<rt>と<\/rt><\/ruby>られる<\/span>$/.test(R.tag),R.tag);
  /* R4 — 다른 문법 카드 · 결과 화면 */
  const R4=await p.evaluate(()=>stGramCard(stSentById('m3'),{ans:'に',ja:'3日（　） 行きます。 会議を 行います。',opts:['に','で','を','が']},{ok:false,my:'で'},'gform'));
  ok('R4 다른 문법 카드(문형 빈칸)도 해설은 같은 규칙',/gcja/.test(R4)&&R4.indexOf('<ruby>行')<0&&/3日/.test(R4),R4.slice(0,160));
  const F=await p.evaluate(async()=>{for(let k=0;k<6&&!ST_DRILL.fin;k++){if(ST_DRILL.show){stDrillNext();}else{stDrillGrade(stGramQ(ST_DRILL,ST_DRILL.i).ans);}await new Promise(r=>setTimeout(r,60));}
    if(ST_DRILL.show)stDrillNext(); await new Promise(r=>setTimeout(r,120));
    const v=document.getElementById('v-study');return {t:v.textContent,rb:v.querySelectorAll('.stdrow ruby').length,hl:v.querySelectorAll('.stdrow .gmhl').length};});
  ok('R5 결과 화면 — 틀린 문장에 칠한 부분과 후리가나',/결과/.test(F.t)&&F.rb>=2&&F.hl===1,JSON.stringify({rb:F.rb,hl:F.hl}));
  const K=await p.evaluate(()=>{stDrillClose&&stDrillClose();const d=DB.study.drills.filter(x=>x.mode==='gmean').slice(-1)[0];return d;});
  ok('K1 drills 에 mode=gmean · picks{id,chose,ans}',!!K&&Array.isArray(K.picks)&&K.picks.some(x=>x.id==='m1'&&x.chose==='〜당하다'&&x.ans==='〜하게 하다(시키다)'),JSON.stringify(K&&K.picks));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t98 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
