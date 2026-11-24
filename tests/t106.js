/* t106 — 📚 v5.18 학습부장 요청 넷 (학습 핸드오프 id 8 · 11/19 · 11/24)
   🔒 P 문형만(gpat): P1 문형 + 접속 · 보기 4 · 같은 묶음 먼저 · P2 맞히면 patterns 카운터 · P3 카드에 같은 묶음 대비 · P4 처음 보는 것 → miss 순
      P5 뜻 → 문형 방향 · 기록 rev · P6 기록 mode=gpat · picks · P7 하루 메뉴 행이 gpat 로 이어진다
   🔒 B 문법 빈칸(gblank): B1 접속사·부사·문형 슬롯 합 · B2 칩으로 한 종류 · B3 문항에 종류 꼬리표
   🔒 G 문법 포인트(gpoints): G1 해설 카드에 포인트 전부(번호) · G2 빈칸 정답이 든 것에 「빈칸」 · G3 문장에 칠함 · G4 포인트 없는 문장은 예전 그대로
   🔒 K 한자 읽기 보기: K1 같은 모라 + 같은 첫 글자(裏 → う○ 두 박) · K2 가짜 읽기 없음 · K3 동음 제외
   🔒 T 탭: T1 메인 6 순서 · T2 360 옆 넘침 0 · 10.5px 미만 0 · Z 에러 없음
   🔒 지어낸 데이터(문형·예문은 교재 문장이 아니다) */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{}}; const at=new Date().toISOString();
  const W=(id,kana,kanji,ko,x)=>Object.assign({id,kana,kanji,ko,cat:'native'},x||{});
  const words=[W('k1','うら','裏','뒤'),W('k2','うで','腕','팔'),W('k3','うみ','海','바다'),W('k4','うた','歌','노래'),W('k5','うし','牛','소'),
    W('k6','れいぞうこ','冷蔵庫','냉장고',{cat:'sino'}),W('k7','うでどけい','腕時計','손목시계'),W('k8','かお','顔','얼굴'),W('k9','はし','橋','다리'),W('k10','はし','箸','젓가락'),
    W('k11','あめ','雨','비'),W('k12','きっぷ','切符','표')];
  const pats=[];
  [['toko','〜たところだ','막 〜했다'],['toko','〜るところだ','막 〜하려는 참이다'],['toko','〜ているところだ','〜하고 있는 중이다'],['toko','〜たことがある','〜한 적이 있다'],
   ['bakari','〜たばかりだ','〜한 지 얼마 안 됐다'],['bakari','〜だけ','〜만(한정)'],['bakari','〜しか〜ない','〜밖에 〜않다'],['bakari','〜ばかり','〜만(잔뜩)']]
   .forEach((x,i)=>pats.push({id:'p'+(i+1),grp:x[0],f:x[1],conn:'지어낸 접속 '+(i+1),m:x[2],ex:'지어낸 예문 '+(i+1)+'。',exKo:'지어낸 번역 '+(i+1),seen:0,miss:0,streak:0,lastSeen:null}));
  pats[5].seen=3;pats[5].miss=2;pats[5].lastSeen='2026-01-01'; pats[6].seen=3;pats[6].miss=0;pats[6].lastSeen='2026-01-02';
  const sl=(kind,target,opts,why)=>({kind,target,opts,why});
  const sents=[
    {id:'g1',ja:'あめが ふりました。それで、 いえに いました。',ko:'비가 왔습니다. 그래서 집에 있었습니다.',slots:[sl('conj','それで',['しかし','でも','または'],'원인→결과')],
      gpoints:[{f:'が',m:'〜이/가(주어)'},{f:'それで',m:'그래서(원인 → 결과)'},{f:'いました',m:'있었습니다(いる 과거)'}]},
    {id:'g2',ja:'たぶん あした ゆきが ふるでしょう。',ko:'아마 내일 눈이 오겠지요.',slots:[sl('adv','たぶん',['きっと','ぜんぜん','もう'],'추측 부사')]},
    {id:'g3',ja:'いま ついた ところです。',ko:'지금 막 도착했습니다.',slots:[sl('form','ところです',['ばかりです','ことです','はずです'],'た+ところ')]},
    {id:'g4',ja:'でも、 わたしは いきません。',ko:'하지만 저는 안 갑니다.',slots:[sl('conj','でも',['それで','だから','それに'],'역접')]}];
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv['study/words']={data:words,rev:1,at}; S.kv['study/sents']={data:sents,rev:1,at}; S.kv['study/drills']={data:[],rev:1,at};
  S.kv['study/rest']={data:{v:1,patterns:pats},rev:1,at}; S.kv.pref={data:{},rev:1,at};
  S.kv['study/strategy']={data:{v:3,daily:{weekday:[{mode:'r2m',sets:6,what:'가나→뜻'},{mode:'gpat',sets:2,what:'문형만'},{mode:'gmean',sets:2,what:'문형 뜻'}]}},rev:1,at};
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
  await p.evaluate(()=>{document.querySelector('.side .m[data-v="study"]').click();setStTab('word');});await p.waitForTimeout(400);

  /* T 탭 */
  const T1=await p.evaluate(()=>[...document.querySelectorAll('#v-study .dgrp[data-grp="main"] .drow')].map(r=>r.dataset.mode).join());
  ok('T1 메인 6 = 하루 메뉴 순서',T1==='r2m,gpart,gpat,gmean,gctx,k2r',T1);

  /* P 문형만 */
  ok('P4 처음 보는 것 → miss 많은 순 → 오래된 순',await p.evaluate(()=>{const o=stPatPool().map(x=>x.id);return o.slice(-2).join()==='p6,p7'&&o.slice(0,6).every(id=>!['p6','p7'].includes(id));}),
     await p.evaluate(()=>stPatPool().map(x=>x.id).join()));
  await p.click('#v-study .drow[data-mode="gpat"] .drgo');await p.waitForTimeout(300);
  const P1=await p.evaluate(()=>{const D=ST_DRILL,pt=stDrillItem(D,D.i),q=stGramQ(D,D.i);
    const same=q.opts.filter(o=>o!==q.ans).filter(o=>stPats().some(x=>x.m===o&&x.grp===pt.grp)).length;
    return {mode:D.mode,n:D.ids.length,f:(document.querySelector('#v-study .pqf')||{}).textContent,f0:pt.f,conn:(document.querySelector('#v-study .pconn')||{}).textContent,
      opts:document.querySelectorAll('#v-study .stdopt button').length,has:q.opts.includes(pt.m),same};});
  ok('P1 문형 + 접속 · 보기 4(정답 포함) · 오답 3개 모두 같은 묶음',P1.mode==='gpat'&&P1.n===8&&P1.f===P1.f0&&/지어낸 접속/.test(P1.conn||'')&&P1.opts===4&&P1.has&&P1.same===3,JSON.stringify(P1));
  const P2=await p.evaluate(()=>{const D=ST_DRILL,pt=stDrillItem(D,D.i);stDrillGrade(stGramQ(D,D.i).ans);
    const card=document.querySelector('#v-study .oops');return {seen:pt.seen,streak:pt.streak,last:pt.lastSeen===todayStr(),mStr:typeof pt.m==='string'&&!!pt.m,sib:card?card.querySelectorAll('.psib > div').length:-1,
      ex:/지어낸 예문/.test(card?card.textContent:''),grp:/같은 묶음/.test(card?card.textContent:'')};});
  ok('P2 맞히면 patterns 카운터가 오른다(seen·streak·lastSeen)',P2.seen===1&&P2.streak===1&&P2.last,JSON.stringify(P2));
  ok('P2b 🔴 문형의 뜻(m 글자)이 카운터 정리에 지워지지 않는다',P2.mStr,JSON.stringify(P2));
  ok('P3 정답 카드 — 예문 · 같은 묶음 3개 대비',P2.ex&&P2.grp&&P2.sib===3,JSON.stringify(P2));
  /* 하나 틀리고 끝까지 */
  await p.evaluate(()=>{stDrillNext();const D=ST_DRILL,q=stGramQ(D,D.i);stDrillGrade(q.opts.find(o=>o!==q.ans));});await p.waitForTimeout(100);
  const P3b=await p.evaluate(()=>{const t=(document.querySelector('#v-study .oopsvs')||{}).textContent||'';return t;});
  ok('P3b 틀리면 「내가 고른 것」의 정체(문형 + 뜻)',/내가 고른 것/.test(P3b)&&/〜/.test(P3b),P3b);
  const P6=await p.evaluate(()=>{while(ST_DRILL&&!ST_DRILL.fin){const D=ST_DRILL;if(D.show){stDrillNext();continue;}stDrillGrade(stGramQ(D,D.i).ans);}
    const r=DB.study.drills[DB.study.drills.length-1];return {allM:stPats().length===8&&DB.study.patterns.every(x=>typeof x.m==='string'&&!x.m.r2m),mode:r.mode,n:r.n,c:r.correct,picks:r.picks&&r.picks.length,rev:!!r.rev,res:!!document.querySelector('#v-study .stbig')};});
  ok('P6 기록 mode=gpat · n 8 · 7 정답 · 틀린 것 picks · 문형 8개 뜻 그대로',P6.allM&&P6.mode==='gpat'&&P6.n===8&&P6.c===7&&P6.picks===1&&!P6.rev&&P6.res,JSON.stringify(P6));
  await p.evaluate(()=>{stDrillClose();stPatRevTog();stDrillStart('gpat',4);});await p.waitForTimeout(200);
  const P5=await p.evaluate(()=>{const D=ST_DRILL,pt=stDrillItem(D,D.i),q=stGramQ(D,D.i);const qm=(document.querySelector('#v-study .pqm')||{}).textContent;
    const ok1=q.ans===pt.f&&q.opts.every(o=>/〜/.test(o))&&qm===pt.m;stDrillQuit();const r=DB.study.drills[DB.study.drills.length-1];stDrillClose();stPatRevTog();return {ok1,rev:!!D.rev};});
  ok('P5 뜻 → 문형 방향(보기가 문형) · rev 표시',P5.ok1&&P5.rev,JSON.stringify(P5));
  const P7=await p.evaluate(()=>{const r=document.querySelector('#v-study .smrow[data-mode="gpat"]');return r?{t:r.textContent,go:!r.querySelector('.drgo').disabled}:null;});
  ok('P7 하루 메뉴 「문형만」 행 · ▶ 열림 · 오늘 한 세트 셈',!!P7&&/문형만/.test(P7.t)&&/1 \/ 2세트/.test(P7.t)&&P7.go,JSON.stringify(P7));

  /* B 문법 빈칸 */
  const B=await p.evaluate(()=>{const all=stGramItems('gblank').length,c=stGramItems('gconj').length,a=stGramItems('gadv').length,f=stGramItems('gform').length;
    stBlankPick('conj');const only=stGramItems('gblank').length;stBlankPick('');const back=stGramItems('gblank').length;return {all,c,a,f,only,back};});
  ok('B1 문법 빈칸 = 접속사 + 부사 + 문형 문항',B.all===B.c+B.a+B.f&&B.all===4,JSON.stringify(B));
  ok('B2 칩으로 한 종류만 · 「전부」로 되돌린다',B.only===B.c&&B.back===B.all,JSON.stringify(B));
  await p.evaluate(()=>stDrillStart('gblank',4));await p.waitForTimeout(200);
  const B3=await p.evaluate(()=>{const q=stGramQ(ST_DRILL,ST_DRILL.i);return {kind:q.kind,tag:(document.querySelector('#v-study .gkind')||{}).textContent||''};});
  ok('B3 문항에 종류 꼬리표(접속사·부사·문형 빈칸)',['conj','adv','form'].includes(B3.kind)&&/(접속사|부사|문형) 빈칸/.test(B3.tag),JSON.stringify(B3));

  /* G 문법 포인트 — g1(포인트 셋 · 빈칸 それで) 이 나올 때까지 */
  const G=await p.evaluate(()=>{let out=null,other=null;
    while(ST_DRILL&&!ST_DRILL.fin){const D=ST_DRILL;if(D.show){stDrillNext();continue;}const id=D.ids[D.i];stDrillGrade(stGramQ(D,D.i).ans);
      const c=document.querySelector('#v-study .oops');
      const r={id,pts:c.querySelectorAll('.gpt').length,ans:[...c.querySelectorAll('.gpt.ans')].map(x=>x.textContent).join('|'),hl:c.querySelectorAll('.gpthl').length,hlAns:c.querySelectorAll('.gpthl.ans').length,
        cap:(c.querySelector('.gpts .oopscap')||{}).textContent||''};
      if(id==='g1')out=r; else if(!other)other=r;}
    return {out,other};});
  ok('G1 해설 카드에 문장 속 포인트 전부(3개 · 번호)',!!G.out&&G.out.pts===3&&/포인트 3/.test(G.out.cap),JSON.stringify(G));
  ok('G2 빈칸 정답(それで)이 든 포인트에만 「빈칸」',!!G.out&&/^2それで/.test(G.out.ans)&&/빈칸/.test(G.out.ans)&&G.out.ans.split('|').length===1,JSON.stringify(G.out));
  ok('G3 완성문에 포인트 셋을 칠한다 · 빈칸 것은 진하게',!!G.out&&G.out.hl===3&&G.out.hlAns===1,JSON.stringify(G.out));
  ok('G4 포인트 없는 문장은 목록이 없다(예전 해설 그대로)',!!G.other&&G.other.pts===0,JSON.stringify(G.other));
  await p.evaluate(()=>stDrillClose());

  /* K 한자 읽기 보기 */
  const K=await p.evaluate(()=>{const pool=stDrillPool('k2r'),real={};pool.forEach(x=>real[x.kana]=1);let fake=0,hom=0,res=[];
    for(let i=0;i<30;i++){const o=stMkOpts(stWordById('k1'),'k2r',pool);res.push(o);o.forEach(x=>{if(!real[x])fake++;});}
    for(let i=0;i<20;i++){const o=stMkOpts(stWordById('k9'),'k2r',pool);if(o.filter(x=>x==='はし').length>1)hom++;}
    const shape=res.every(o=>o.every(x=>x.length===2&&x[0]==='う'));
    const vary=new Set(res.map(o=>o.slice().sort().join())).size;
    return {shape,fake,hom,vary,ex:res[0]};});
  ok('K1 裏(うら) 보기 = 두 박 · う로 시작하는 실제 단어(うで·うみ·うた·うし)',K.shape&&K.vary>1,JSON.stringify(K));
  ok('K2 가짜 읽기(장음·탁음만 바꾼 것) 0',K.fake===0,K.fake);
  ok('K3 같은 읽기(はし 橋·箸)는 보기에 두 번 안 나온다',K.hom===0,K.hom);

  /* T2 폰 */
  await p.setViewportSize({width:360,height:780});await p.waitForTimeout(200);
  for(const step of ['tab','gpat-q','gpat-card']){
    if(step==='gpat-q')await p.evaluate(()=>stDrillStart('gpat',3));
    if(step==='gpat-card')await p.evaluate(()=>stDrillGrade(stGramQ(ST_DRILL,ST_DRILL.i).opts[0]));
    await p.evaluate(()=>renderStudy());await p.waitForTimeout(150);
    const m=await p.evaluate(()=>{const box=document.getElementById('v-study');
      const small=[...box.querySelectorAll('.pqf,.pconn,.pqm,.gkind,.gpt,.gpt *,.psib,.psib *,.dghid,.drow *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<10.5).map(e=>e.className+':'+getComputedStyle(e).fontSize);
      return {over:document.documentElement.scrollWidth-window.innerWidth,small};});
    ok('T2 360 '+step+' 옆 넘침 0 · 10.5px 미만 0',m.over<=0&&!m.small.length,JSON.stringify(m));
  }
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t106 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
