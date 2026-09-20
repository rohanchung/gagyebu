/* v4.13 문법 드릴 — 조사(gpart)·부사(gadv) 분리. 학습방 v17·v18.
   🔒 실제 예문 39개(2026-09-19 DB)를 그대로 넣는다 — 오탐(この·それに·そこで·姉妹かも…)은 실데이터에서만 보인다(v2.6) */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const JA=["あしたは 日曜日です。 それなら、 みんなで 散歩に 行きませんか。","わたしの 家庭は いつも にぎやかです。 でも 今朝は とても 静かでした。","先輩が 会社を 早退しました。 なぜなら 病気に なったからです。","受付に 荷物を 届けて ください。","この 文章は 複雑です。 それに 字も 汚いです。","お兄さんは 野球が 得意です。 でも 水泳は 苦手です。","バスが 来ませんでした。 そこで 地下鉄に 乗り換えました。","部屋の 電気を 消しました。 それから 部屋を 出ました。","校長先生が おいでに なりました。 では、 会議室へ 行きましょう。","うっかり して 指輪を なくしました。 それで 警察に 届けました。",
 "その 映画は 長いです。 けれども、 とても おもしろかったです。","旅行は 楽しかったです。 しかし 疲れましたね。","私は その くすりを 飲みました。 すると ねむく なって きました。","雨が 降って いました。 そこで、 タクシーで 帰りました。","この かばんは 軽いです。 そして、 使いやすいです。","たろうは ゆうしょくを 食べて、 それから しゅくだいを しました。","電車が おくれました。 それで 今朝は ちこくしました。","準備が できました。 それでは 出発しましょう。","来週に しましょうか。 それとも 再来週の ほうが いいですか。","あしたは 休みです。 それなら、 食事に 行きませんか。","ニンジンと トマト、 それに リンゴを ください。","もう 子どもじゃ ないんだよ。 だから ひとりで やりなさい。","さむい 日が つづきました。 ですから かぜを ひきました。","その 日は 雨だった。 だが サッカーの 試合は 行われた。","日本語には 米を 言いあらわす 方法が たくさん ある。 たとえば、 イネ、 お米、 ご飯などだ。","私は その パーティーに 行きたいのです。 でも 行けません。","みなさん、 席に 着いて ください。 では、 テストを 始めます。","あの ふたりは 姉妹かも しれません。 なぜなら とても よく にて いるからです。","そこへは バス または 電車で 行けます。",
 "バスが なかなか 来ません。","あの 人の 言って いる ことは ぜんぜん 分かりません。","今日 聞いた ことは けっして だれにも 話しません。","週末なので、 道が 混みそうです。 そろそろ 出かけましょう。","やっと 5時までに 仕事を 終える ことが できました。","みなさん、 もうすぐ コンサートが 始まりますから、 会場に 入って ください。","パーティーの 準備は ほとんど 終わりました。","問題を 読む 前に まず 説明を 聞いて ください。","ここまで 来るのに ずいぶん 時間が かかりました。","オンライン授業が ある ことを すっかり 忘れて いました。"];
const ids=JA.map((_,i)=>i<10?'r0'+String(i+1).padStart(2,'0'):i<29?'s'+String(i-9).padStart(3,'0'):'t'+String(i-28).padStart(3,'0'));
const sents=JA.map((ja,i)=>{const s={id:ids[i],src:'x',ja,ko:'번역'+i,slots:[]};
  if(ids[i]==='r005')s.slots=[{kind:'conj',target:'それに',opts:['それで','だから','でも'],why:'첨가'},{kind:'particle',target:'も',why:'字も — 첨가의 も'}];
  if(ids[i]==='s004')s.slots=[{kind:'conj',target:'そこで',opts:['それに','でも','すると'],why:'결과'}];
  if(ids[i]==='t001')s.slots=[{kind:'adv',target:'なかなか',opts:['ぜんぜん','けっして','ほとんど'],why:'부정과 함께'}];
  if(ids[i]==='t003')s.slots=[{kind:'adv',target:'けっして',opts:['なかなか','ぜんぜん','そろそろ'],why:'금지·부정'}];
  return s;});
const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},
 ui:{month:'2026-09'},accounts:[],transactions:[],categories:[],cards:[],debts:[],journal:[],items:[],logs:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,sents,words:[{id:'w1',kana:'かばん',kanji:'',ko:'가방'},{id:'w2',kana:'くすり',kanji:'薬',ko:'약'}],units:[],drills:[]}};
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
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.study&&DB.study.sents);await p.waitForTimeout(500);
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 const cand=id=>p.evaluate(i=>stGParticles(stSentById(i)).map(c=>stGTokens(stSentById(i))[c.i]),id);

 /* ① 오탐이 막힌다 — 실측에서 틀린 문항이 됐던 것들 */
 const all=await p.evaluate(()=>stSents().map(s=>stGParticles(s).map(c=>stGTokens(s)[c.i].replace(/[、。]$/,''))).flat());
 const BAD=['この','その','あの','いつも','とても','でも','それに','それから','だから','ですから','では','それでは','それで','そこで','だが','または','すると','やっと','けれども','姉妹かも','週末なので','来るのに','5時までに'];
 const leaked=BAD.filter(x=>all.includes(x));
 ok('A1 실측 오탐 23종이 후보에 없다',leaked.length===0,JSON.stringify(leaked));
 ok('A2 후보 수가 넉넉하다(70↑)',all.length>=70,String(all.length));
 const r5=await cand('r005');
 ok('A3 r005: 文章は·字も 만',r5.length===2&&r5.includes('文章は')&&r5.includes('字も'),JSON.stringify(r5));
 const r7=await cand('r007');
 ok('A4 r007: そこで 은 조사가 아니다',!r7.includes('そこで')&&r7.includes('バスが')&&r7.includes('地下鉄に'),JSON.stringify(r7));
 ok('A5 단어장에 있는 히라가나 명사(かばん)는 후보',(await cand('s005')).includes('かばんは'));
 ok('A6 대명사(わたし)는 후보',(await cand('r002')).includes('わたしの'));

 /* ② 문항 — 끝을 가리고, 정답이 둘 되는 오답을 뺀다 */
 const qs=await p.evaluate(()=>{const out=[];for(let k=0;k<300;k++){const q=stGPartQ(stSentById('r001'));out.push(q);}return out;});
 ok('B1 어절 끝을 가린다(あしたは→あした（　）)',qs.some(q=>q.ja.startsWith('あした（　）')),qs[0].ja);
 ok('B2 보기 4개·정답 포함·중복 없음',qs.every(q=>q.opts.length===4&&q.opts.includes(q.ans)&&new Set(q.opts).size===4));
 ok('B3 は 가 답이면 が·も 가 오답에 없다',qs.filter(q=>q.ans==='は').every(q=>!q.opts.includes('が')&&!q.opts.includes('も')));
 ok('B4 に 가 답이면 へ 가 오답에 없다',qs.filter(q=>q.ans==='に').every(q=>!q.opts.includes('へ')));
 ok('B5 구두점은 빈칸 뒤에 남는다',await p.evaluate(()=>{for(let k=0;k<200;k++){const q=stGPartQ(stSentById('s004'));if(q.ans==='で'&&q.ja.includes('タクシー（　）'))return true;}return false;}));
 const r5q=await p.evaluate(()=>{const a=[];for(let k=0;k<50;k++)a.push(stGPartQ(stSentById('r005')));return a;});
 ok('B6 수동 슬롯이 우선(r005 는 늘 も, 해설 포함)',r5q.every(q=>q.ans==='も'&&q.why.includes('첨가')&&q.ja.includes('字（　）')));

 /* ③ 접속사·부사 분리 */
 const pc=await p.evaluate(()=>({conj:stGramPool('gconj').map(s=>s.id),adv:stGramPool('gadv').map(s=>s.id),part:stGramPool('gpart').length,ord:stGramPool('gord').length}));
 ok('C1 접속사 풀에 부사가 안 섞인다',pc.conj.length===2&&!pc.conj.includes('t001')&&!pc.conj.includes('t003'),JSON.stringify(pc.conj));
 ok('C2 부사 풀',pc.adv.length===2&&pc.adv.includes('t001'),JSON.stringify(pc.adv));
 ok('C3 조사 풀(예문 단위)',pc.part>=30,String(pc.part));
 ok('C4 어순 풀 유지',pc.ord>=20,String(pc.ord));
 const q=await p.evaluate(()=>stGMkQ(stSentById('t001'),'gadv'));
 ok('C5 부사 문항 — なかなか 를 가린다',q.ans==='なかなか'&&q.ja.includes('（　）'),JSON.stringify(q));

 /* ④ 화면 — 네 모드 버튼 · 조사/부사 드릴이 끝까지 돈다(어순 화면으로 새지 않는다) */
 await p.evaluate(()=>{document.getElementById('login').style.display='none';document.getElementById('app').classList.add('on');gotoTab('study');setStTab('word');});
 await p.waitForTimeout(300);
 const btns=await p.evaluate(()=>[...document.querySelectorAll('.gmode button')].map(x=>x.textContent));
 ok('D1 문법 모드 4개',btns.length===4&&['조사','접속사','부사','문장'].every(k=>btns.some(t=>t.includes(k))),JSON.stringify(btns));
 for(const m of ['gpart','gadv']){
   await p.evaluate(mm=>stDrillStart(mm,2),m);await p.waitForTimeout(200);
   const view=await p.evaluate(()=>({gbl:!!document.querySelector('#v-study .gbl'),star:!!document.querySelector('#v-study .gslot'),n:document.querySelectorAll('#v-study .stdopt button').length}));
   ok('D2-'+m+' 빈칸 화면(어순 아님)·보기 4',view.gbl&&!view.star&&view.n===4,JSON.stringify(view));
   for(let k=0;k<2;k++){await p.evaluate(()=>{const b=document.querySelector('#v-study .stdopt button');b.click();});await p.waitForTimeout(120);
     await p.evaluate(()=>{const b=[...document.querySelectorAll('#v-study button')].find(x=>/다음|결과/.test(x.textContent));b&&b.click();});await p.waitForTimeout(120);}
   const rec=await p.evaluate(()=>DB.study.drills[DB.study.drills.length-1]);
   ok('D3-'+m+' 끝까지 풀면 기록 1건',rec&&rec.mode===m&&rec.n===2,JSON.stringify(rec));
 }
 ok('D4 채점이 예문 카운터에 쌓인다',await p.evaluate(()=>stSents().some(s=>(+s.seen||0)>0)));

 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
