/* v4.14 — 🔤 동사 활용 드릴(vconj, 학습방 v19) + 📖 sents 다목적 재사용(학습방 v20)
   🔒 활용형은 **저장하지 않는다.** vgroup 하나로 앱이 만든다 — 그래서 규칙이 맞는지는 여기서만 증명된다.
   🔒 실데이터에서 온 동사만 쓴다(2026-09-20 DB 107개 중 발췌). 명사 3개(訳·忘れ物·割合)에
      vgroup:1 이 잘못 달려 있는 것도 **그대로** 넣는다 — 검산이 그걸 걸러야 한다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

/* [kana, kanji, ko, vgroup, vnote] — 실데이터 그대로 */
const V=[
 ['かう','飼う','기르다',1],          ['うつ','打つ','치다',1],
 ['とる','取る','잡다',1],            ['のむ','飲む','마시다',1],
 ['ころぶ','転ぶ','넘어지다',1],      ['あく','開く','열리다',1],
 ['ぬぐ','脱ぐ','벗다',1],            ['けす','消す','끄다',1],
 ['きる','切る','자르다',1,'きる 중 切る는 1그룹. 着る와 혼동 주의'],
 ['いらっしゃる','','계시다',1],      ['おっしゃる','','말씀하시다',1],
 ['きる','着る','입다',2,'着る는 2그룹'], ['たりる','足りる','충분하다',2],
 ['でかける','出かける','외출하다',2],['おちる','落ちる','떨어지다',2],
 ['がまんする','我慢する','참다',3]];
/* ⚠️ vgroup 은 달렸지만 동사가 아니다 — 실제로 학습방이 이렇게 올렸다 */
const BAD=[['わけ','訳','이유',1],['わすれもの','忘れ物','분실물',1],['わりあい','割合','비율',1]];
const words=V.concat(BAD).map((a,i)=>{
  const w={id:'w'+(i+1),lv:'N4',src:'p1',kana:a[0],kanji:a[1],ko:a[2],
           cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null,vgroup:a[3]};
  if(a[4])w.vnote=a[4];
  return w;});
/* 동사가 아니고 vgroup 도 없는 보통 단어 — 활용 풀에 새어 들어오면 안 된다 */
words.push({id:'wz',lv:'N4',src:'p1',kana:'かばん',kanji:'',ko:'가방',cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null});

/* 📖 v20 — 한 문장에 조사·접속사가 같이 들어 있다. 두 드릴 모두의 후보여야 한다 */
const sents=[
 {id:'x1',src:'조사 p208',ja:'わたしは 学校に 行きます。 それに 本も 読みます。',ko:'…',
  slots:[{kind:'conj',target:'それに',opts:['それで','だから','でも'],why:'첨가'},
         {kind:'particle',target:'は',why:'주제'},
         {kind:'particle',target:'に',why:'도착점'}]},
 {id:'x2',src:'접속사 p230',ja:'雨が 降って いました。 そこで、 タクシーで 帰りました。',ko:'…',
  slots:[{kind:'conj',target:'そこで',opts:['それに','でも','すると'],why:'결과'}]},
 {id:'x3',src:'부사 p206',ja:'バスが なかなか 来ません。',ko:'…',
  slots:[{kind:'adv',target:'なかなか',opts:['ぜんぜん','けっして','ほとんど'],why:'부정과 함께'}]}];

const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-09'},
 accounts:[],transactions:[],categories:[],cards:[],debts:[],journal:[],items:[],logs:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words,sents,units:[],tests:[],errors:[],drills:[],pomos:[],books:[],phases:[],week:{},month:{},logs:{}}};

/* 기대값 — 손으로 계산한 것이다. 앱이 만든 값을 그대로 옮겨 적으면 테스트가 아니다 */
const EXP={
 'かう':    {masu:'かいます',te:'かって',nai:'かわない',ta:'かった'},
 'うつ':    {masu:'うちます',te:'うって',nai:'うたない',ta:'うった'},
 'とる':    {masu:'とります',te:'とって',nai:'とらない',ta:'とった'},
 'のむ':    {masu:'のみます',te:'のんで',nai:'のまない',ta:'のんだ'},
 'ころぶ':  {masu:'ころびます',te:'ころんで',nai:'ころばない',ta:'ころんだ'},
 'あく':    {masu:'あきます',te:'あいて',nai:'あかない',ta:'あいた'},
 'ぬぐ':    {masu:'ぬぎます',te:'ぬいで',nai:'ぬがない',ta:'ぬいだ'},
 'けす':    {masu:'けします',te:'けして',nai:'けさない',ta:'けした'},
 'たりる':  {masu:'たります',te:'たりて',nai:'たりない',ta:'たりた'},
 'でかける':{masu:'でかけます',te:'でかけて',nai:'でかけない',ta:'でかけた'},
 'おちる':  {masu:'おちます',te:'おちて',nai:'おちない',ta:'おちた'},
 'がまんする':{masu:'がまんします',te:'がまんして',nai:'がまんしない',ta:'がまんした'},
 'いらっしゃる':{masu:'いらっしゃいます',te:'いらっしゃって',nai:'いらっしゃらない',ta:'いらっしゃった'},
 'おっしゃる':{masu:'おっしゃいます',te:'おっしゃって',nai:'おっしゃらない',ta:'おっしゃった'}};

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1280,height:900}});
 await c.addInitScript(({st})=>{const store={v:JSON.parse(JSON.stringify(st))};
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.study&&DB.study.words);
 await p.waitForTimeout(500);
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});

 /* ── A) 활용 규칙 — 그룹 하나로 네 형이 나온다 ── */
 const got=await p.evaluate(()=>{const o={};stWords().forEach(w=>{if(stVerbOK(w))o[w.kana+'|'+(w.kanji||'')]=stVForms(w);});return o;});
 const miss=[];
 Object.keys(EXP).forEach(k=>{
   const hit=Object.keys(got).find(g=>g.split('|')[0]===k&&(k!=='きる'));
   if(!hit)return miss.push(k+' 없음');
   ['masu','te','nai','ta'].forEach(f=>{if(got[hit][f]!==EXP[k][f])miss.push(k+'.'+f+'='+got[hit][f]+'≠'+EXP[k][f]);});
 });
 ok('A1 1·2·3그룹 활용형 14동사 × 4형이 전부 규칙대로',miss.length===0,miss.slice(0,4).join(' / '));
 const kiru=await p.evaluate(()=>{const o={};stWords().filter(w=>w.kana==='きる').forEach(w=>{o[w.kanji]=stVForms(w);});return o;});
 ok('A2 切る(1그룹)는 きって · 着る(2그룹)는 きて — 같은 읽기, 다른 활용',
    kiru['切る'].te==='きって'&&kiru['切る'].nai==='きらない'&&kiru['着る'].te==='きて'&&kiru['着る'].nai==='きない',
    JSON.stringify(kiru));
 ok('A3 경어 ます형은 불규칙(いらっしゃいます) — いらっしゃります 가 아니다',
    got['いらっしゃる|'].masu==='いらっしゃいます');
 /* ⚠️ 行く 는 지금 데이터에 없다. 들어오는 날 조용히 틀리면 안 되니 규칙만 확인한다 */
 ok('A4 行く 예외가 박혀 있다(いって·いった)',
    await p.evaluate(()=>{const f=stVForms({kana:'いく',vgroup:1});return f.te==='いって'&&f.ta==='いった'&&f.nai==='いかない'&&f.masu==='いきます';}));

 /* ── B) 검산 — vgroup 이 달렸어도 동사가 아니면 출제하지 않는다 ── */
 const bad=await p.evaluate(()=>stVerbBad().map(w=>w.kanji||w.kana));
 ok('B1 명사 3개(訳·忘れ物·割合)가 출제에서 빠진다',
    bad.length===3&&['訳','忘れ物','割合'].every(k=>bad.includes(k)),JSON.stringify(bad));
 const pool=await p.evaluate(()=>stVerbPool().map(w=>w.kana+'|'+(w.kanji||'')));
 ok('B2 활용 풀 = 동사 16개뿐(가방·명사 3개 제외)',pool.length===16,String(pool.length));
 ok('B3 vgroup 없는 단어는 안 들어온다',!pool.some(x=>x.startsWith('かばん')));
 /* 🔒 조용히 빼면 학습방이 못 고친다 — 화면이 말해줘야 한다 */
 await p.evaluate(()=>{document.getElementById('login').style.display='none';document.getElementById('app').classList.add('on');gotoTab('study');setStTab('word');});
 await p.waitForTimeout(300);
 const html=await p.evaluate(()=>document.getElementById('v-study').innerHTML);
 ok('B4 제외된 3개를 화면이 드러낸다',/vgroup 은 달렸지만/.test(html)&&/訳/.test(html),'');

 /* ── C) 오답 — 틀린 그룹 규칙을 적용한 형태. 랜덤이 아니다 ── */
 const kau=await p.evaluate(()=>{const w=stWords().find(x=>x.kanji==='飼う');
   return {te:stVMkQ(w,'te'),nai:stVMkQ(w,'nai'),masu:stVMkQ(w,'masu')};});
 ok('C1 買う꼴 て형 오답이 かいて·かんで·かして (학습방 v19 예시 그대로)',
    ['かいて','かんで','かして'].every(x=>kau.te.opts.includes(x))&&kau.te.ans==='かって',JSON.stringify(kau.te.opts));
 ok('C2 ない형 오답에 2그룹 오용(かない)이 있다',kau.nai.ans==='かわない'&&kau.nai.opts.includes('かない'),JSON.stringify(kau.nai.opts));
 ok('C3 ます형 오답에 사전형+ます(かうます)가 있다',kau.masu.ans==='かいます'&&kau.masu.opts.includes('かうます'),JSON.stringify(kau.masu.opts));
 const allq=await p.evaluate(()=>{const out=[];stVerbPool().forEach(w=>{['te','nai','ta','masu'].forEach(f=>{
   const q=stVMkQ(w,f);out.push({k:w.kana+'/'+f,n:q.opts.length,u:new Set(q.opts).size,has:q.opts.indexOf(q.ans)>=0});});});return out;});
 const brk=allq.filter(x=>x.n!==4||x.u!==4||!x.has);
 ok('C4 전 동사 × 4형 = 보기 4개·중복 없음·정답 포함',brk.length===0,JSON.stringify(brk.slice(0,3)));
 ok('C5 vnote 가 문항에 실린다(着る/切る 함정)',
    await p.evaluate(()=>{const w=stWords().find(x=>x.kanji==='切る');return /1그룹/.test(stVMkQ(w,'te').note);}));

 /* ── D) 드릴이 끝까지 돌고 words 카운터에 쌓인다 ── */
 ok('D1 시작 칸이 보인다(동사 16개)',/동사 활용/.test(html)&&/1그룹/.test(html));
 await p.evaluate(()=>stDrillStart('vconj',3));await p.waitForTimeout(250);
 const run=await p.evaluate(()=>({n:document.querySelectorAll('#v-study .stdopt button').length,
   hint:(document.querySelector('#v-study .stdhint')||{}).textContent||'',
   head:(document.querySelector('#v-study .stdk')||{}).textContent||'',
   forms:ST_DRILL.qs.map(q=>q.form)}));
 ok('D2 보기 4개 · 묻는 형이 화면에 있다',run.n===4&&/(て형|ない형|た형|ます형)은\?/.test(run.hint),JSON.stringify(run.hint));
 ok('D3 사전형은 한자·가나를 같이 보여준다',/·/.test(run.head)||/[ぁ-ん]/.test(run.head),run.head);
 ok('D4 한 세트에서 형이 돌아간다(3문항 = 서로 다른 형)',new Set(run.forms).size===3,JSON.stringify(run.forms));
 for(let k=0;k<3;k++){
   await p.evaluate(()=>{document.querySelector('#v-study .stdopt button').click();});await p.waitForTimeout(140);
   await p.evaluate(()=>{const x=[...document.querySelectorAll('#v-study button')].find(y=>/다음|결과/.test(y.textContent));x&&x.click();});await p.waitForTimeout(140);
 }
 const rec=await p.evaluate(()=>DB.study.drills[DB.study.drills.length-1]);
 ok('D5 기록 1건 — mode:vconj · 3문항',rec&&rec.mode==='vconj'&&rec.n===3,JSON.stringify(rec));
 ok('D6 채점이 words 카운터에 쌓인다',await p.evaluate(()=>stWords().some(w=>(+w.seen||0)>0)));
 ok('D7 결과 화면이 뜬다(형 표기 포함)',
    await p.evaluate(()=>{const h=document.getElementById('v-study').innerHTML;return /동사 활용 결과/.test(h);}));
 await p.evaluate(()=>stDrillClose());await p.waitForTimeout(150);

 /* ── E) v20 — sents 는 공용 문항 풀이다 ── */
 const items=await p.evaluate(()=>({
   conj:stGramItems('gconj').map(i=>i.s.id),
   adv:stGramItems('gadv').map(i=>i.s.id),
   part:stGramItems('gpart').map(i=>i.s.id),
   x1p:stGramItems('gpart').filter(i=>i.s.id==='x1').map(i=>stGTokens(i.s)[i.cand.i])}));
 ok('E1 조사 예문(x1)이 접속사 드릴에도 나온다 — src 로 거르지 않는다',
    items.conj.includes('x1')&&items.conj.includes('x2'),JSON.stringify(items.conj));
 ok('E2 한 문장 = 슬롯 개수만큼 문항 (x1 조사 3자리)',
    items.x1p.length===3&&items.x1p.some(t=>/は$/.test(t))&&items.x1p.some(t=>/に$/.test(t)),JSON.stringify(items.x1p));
 ok('E3 조사 문항 수가 예문 수보다 많다',items.part.length>items.conj.length&&items.part.length>=6,String(items.part.length));
 ok('E4 부사는 부사 문장만',items.adv.length===1&&items.adv[0]==='x3',JSON.stringify(items.adv));
 /* 🔒 같은 문장을 연달아 내지 않는다 — 슬롯 3개짜리 문장이 세트 앞을 다 먹으면 안 된다 */
 const rr=await p.evaluate(()=>stGramPick('gpart',6).map(i=>i.s.id));
 ok('E5 라운드로빈 — 앞 3문항이 서로 다른 문장',new Set(rr.slice(0,3)).size===3,JSON.stringify(rr));
 ok('E6 6문항을 다 쓴다(슬롯을 버리지 않는다)',rr.length===6,JSON.stringify(rr));
 /* 같은 문장이 두 번 나와도 **다른 자리**를 묻는다 */
 const qq=await p.evaluate(()=>stGramPick('gpart',6).filter(i=>i.s.id==='x1').map(i=>stGMkQ(i.s,'gpart',i).ja));
 ok('E7 같은 문장이 다시 나오면 다른 자리를 가린다',new Set(qq).size===qq.length&&qq.length>=2,JSON.stringify(qq));
 const box=await p.evaluate(()=>{renderStudy();return document.getElementById('v-study').innerHTML;});
 ok('E8 화면 숫자가 문항 수다(예문 수가 아니다)',/조사 채우기/.test(box)&&/6문항/.test(box),'');

 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
