/* t89 — ⚡ 드릴 페이지 속도 (v5.00) · 로한: 「드릴 페이지가 DB 가 많아져서 그런가 좀 느려졌다」
   실측 전: 드릴 탭 1.7초 · 문법 칸 1.9초 · 조사 드릴 시작 1.4초 · 답 하나 0.3초
   원인 ① studyDB() 가 부를 때마다 단어·예문 전부를 다시 정리 ② 조사 후보가 문장마다 가나 목록을 새로 ③ 개수만 셀 때도 정렬 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2];
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
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  const R=await p.evaluate(()=>{
    const S=DB.study, t=todayStr(), K='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわを';
    const rk=i=>K[i%K.length]+K[(i*7)%K.length]+K[(i*13)%K.length];
    S.words=[];for(let i=0;i<1149;i++){S.words.push({id:'w'+i,kana:rk(i),kanji:i%3?'漢'+i:'',ko:'뜻'+i+', 의미'+(i%50),m:{r2m:{seen:i%5,miss:i%3,streak:i%4,lastSeen:addDays(t,-(i%9)),retestOn:addDays(t,(i%5)-2)}}});}
    S.sents=[];for(let i=0;i<543;i++){S.sents.push({id:'s'+i,ja:'東京'+i+'に 行きます。 学校で 友だちと 本を 読みました。',ko:'문장 '+i,seen:i%4,miss:i%2,
      slots:i%6?[]:[{kind:'particle',target:'に',opts:['で','を','が'],why:'x'},{kind:'conj',target:'それから',opts:['しかし','だから','でも'],why:'y'}]});}
    S.drills=[];for(let i=0;i<110;i++)S.drills.push({id:'d'+i,date:addDays(t,-(i%20)),mode:['r2m','k2r','gpart'][i%3],n:20,correct:14,ids:S.words.slice(i,i+20).map(w=>w.id),wrongIds:[]});
    DB.ui.studyTab='word'; DB.ui.stdMode='r2m';
    const tm=(f)=>{const a=performance.now();f();return Math.round(performance.now()-a);};
    const out={};
    document.querySelector('.side .m[data-v="study"]').click();
    out.renderStudy_word=tm(()=>renderStudy());
    out.stGoal_r2m=tm(()=>stGoal('r2m'));
    out.stDrillPool_r2m=tm(()=>stDrillPool('r2m'));
    out.stGramItems_gpart=tm(()=>stGramItems('gpart'));
    out.stGramGoal_gpart=tm(()=>stGramGoal('gpart'));
    out.stGramBox=tm(()=>stGramBox());
    out.stPaneWord=tm(()=>stPaneWord());
    stDrillStart('r2m',20); out.drillStart_r2m=0;
    out.render_in_r2m=tm(()=>renderStudy());
    const w=stWordById(ST_DRILL.ids[0]); out.grade_r2m=tm(()=>stDrillGrade(String(w.ko)));
    out.next_r2m=tm(()=>stDrillNext());
    stDrillQuit(); stDrillClose();
    out.start_gpart=tm(()=>stDrillStart('gpart',10));
    out.render_in_gpart=tm(()=>renderStudy());
    out.grade_gpart=tm(()=>stDrillGrade(stGramQ(ST_DRILL,ST_DRILL.i).ans));
    stDrillQuit(); stDrillClose();
    out.save=tm(()=>save());
    out.studyDB=tm(()=>{for(let i=0;i<100;i++)studyDB();});
    /* 캐시가 바뀐 묶음을 놓치지 않는다 — 서버에서 새 배열이 오면 다시 정리 */
    S.words=S.words.map(w=>Object.assign({},w,{m:undefined},{seen:3,miss:1}));
    const fresh=studyDB().words[0]; out.migrated=!!(fresh.m&&fresh.m.r2m&&fresh.seen===undefined);
    S.sents.push({id:'sx',ja:'新しい 文',ko:'새'}); out.pushed=Array.isArray(studyDB().sents.find(x=>x.id==='sx').slots);
    return out;});
  ok('P1 ⚡ 드릴 탭 그리기 < 300ms(단어 1,149 · 예문 543)',R.renderStudy_word<300,R.renderStudy_word);
  ok('P2 ⚡ 문법 칸 < 300ms',R.stGramBox<300,R.stGramBox);
  ok('P3 ⚡ 조사 드릴 시작 < 300ms · 답 하나 < 80ms',R.start_gpart<300&&R.grade_gpart<80,R.start_gpart+'/'+R.grade_gpart);
  ok('P4 ⚡ 단어 드릴 답 하나 < 80ms',R.grade_r2m<80,R.grade_r2m);
  ok('C1 🔒 새 배열이 오면 다시 정리한다(m.r2m 이행)',R.migrated,JSON.stringify(R));
  ok('C2 🔒 배열에 넣으면 다시 정리한다(slots 보장)',R.pushed);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t89 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
