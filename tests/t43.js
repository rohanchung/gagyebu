/* EMR 0단계 — 사실 추출·격리·읽기 전용·반응형. 실제 API 호출 없음. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:null}})}})};});
 await page.route('https://**/*',r=>r.abort());
 await page.goto('file:///'+file.replace(/\\/g,'/').replace(/^\//,''));
 await page.waitForFunction(()=>typeof emrFacts==='function');
 const result=await page.evaluate(()=>{
   const results=[];function check(name,condition){results.push({name,ok:!!condition});}
   DB={health:{},meals:{},transactions:[]};
   const empty=emrFacts({title:'전체'});check('빈 데이터 기록 없음',empty.includes('기록 없음'));
   check('기본 labs 빈 배열',!empty.includes('[피검사'));
   const d=todayStr(),old=addDays(d,-14),future=addDays(d,1),first=addDays(d,-13);
   DB={health:{metrics:[{name:'칼륨',low:0,high:5},{name:'BUN',range:'참고문구'},{name:'빈지표',func:'빈 지표 설명'},{name:'FEV1',range:'예측치 대비 %',func:'노력성 호기량(L) · 예측치 대비 %로 판정한다'}],
     labDates:[d,addDays(d,-30)],labVisits:['',addDays(d,-29)],
     labValues:{'칼륨':[0,4],BUN:[null,10],'빈지표':[null,''],'FEV1':[1.91,null]},labMeds:[{am:['현재약'],pm:[]},{am:['옛약']}],
     weights:Array.from({length:10},(_,i)=>({date:addDays(d,i-8),kg:60+i})),
     events:[{date:d,name:'어깨',symptom:'통증'},{name:'날짜없는 증상'}]},
     meals:{[d]:{b:{p:'제안전용비밀',a:'밥'},s:{a:'아이스크림, 과자 2봉'},l:{a:'<img src=x onerror="window.__xss=1">'}},[first]:{b:{a:'첫날음식'}},[old]:{b:{a:'범위밖음식'}}},
     transactions:[{type:'expense',date:d,food:'밥',slot:'b',amt:987654321},
       {type:'expense',date:d,food:'밥',slot:'l'},{type:'expense',date:d,food:'장보기'},
       {type:'expense',date:d,food:'과자 2봉',slot:'s'},
       {type:'expense',date:d,food:'아이스크림',slot:'s'},
       {type:'expense',date:d,food:'우유',slot:'d'},
       {type:'expense',date:d,food:'빵',slot:'d'},
       {type:'income',date:d,food:'수입음식제외'},
       {type:'expense',date:d,cat:'의료',memo:'병원방문',amt:987654321},
       {type:'expense',date:d,cat:'건강보험',memo:'보험료제외'},
       {type:'expense',date:future,cat:'의료',memo:'미래방문제외'}],
     journal:[{body:'일지비밀'}],saju:{secret:'사주비밀'},accounts:[{name:'계좌비밀'}]};
   const before=JSON.stringify(DB),p={title:'검수',sources:{labs:['칼륨','BUN','없는지표','빈지표','FEV1']}};
   const facts=emrFacts(p),items=dietOn(d),visits=medVisits(addDays(d,-90),d);
   check('동일 끼니 완전일치 합침',items.filter(x=>x.slot==='b'&&x.text==='밥').length===1&&items[0].sources.join(',')==='기록,구매');
   check('다른 끼니 보존',items.some(x=>x.slot==='l'&&x.purchases.includes('밥')));
   check('구매 섭취 미확인',facts.includes('장보기 [구매만 · 섭취 미확인]'));
   check('제안·비건강·금액 제외',!['제안전용비밀','일지비밀','사주비밀','계좌비밀','987654321','보험료제외','수입음식제외'].some(x=>facts.includes(x)));
   check('끼니당 정확히 한 줄',items.filter(x=>x.slot==='s').length===1&&facts.split('\n').filter(x=>x.startsWith(d+' 간식 ')).length===1);
   check('구매는 실제 기록의 근거',facts.includes('간식 아이스크림, 과자 2봉 [기록 · 구매: 과자 2봉, 아이스크림]'));
   check('구매만 있는 끼니 한 줄',facts.includes('저녁 빵, 우유 [구매만 · 섭취 미확인]'));
   check('의료 지출은 방문 아님',facts.includes('[의료 기록')&&facts.includes('의료 지출 · 병원방문')&&facts.includes('의료 지출은 방문을 뜻하지 않는다')&&!facts.includes('[병원 방문'));
   check('빈 지표는 이름과 개수만',facts.includes('최근 6회 값 없는 지표 1개 생략: 빈지표')&&!facts.includes('빈지표 —'));
   check('폐기능 설명 원문 보존',facts.includes('FEV1 — 노력성 호기량(L) · 예측치 대비 %로 판정한다 (참고 예측치 대비 %):'));
   check('0은 빈 지표가 아님',facts.includes('칼륨 —')&&!facts.includes('생략: 칼륨'));
   check('진료일 빈 값 검사일 대체',visits.some(x=>x.date===d&&x.source==='진료일'));
   check('진료일 별도 날짜',visits.some(x=>x.date===addDays(d,-29)&&x.source==='진료일'));
   check('미래 방문 제외',!facts.includes('미래방문제외'));
   check('14일 양끝 경계',facts.includes('첫날음식')&&!facts.includes('범위밖음식'));
   check('기록 시작일은 전체 이력',facts.includes('직접 '+old+'~'));
   check('0 검사값 보존',facts.includes(d+' 0'));
   check('없는 지표 표시',facts.includes('연결 끊김: 없는지표'));
   check('단위 생성 안 함',!facts.includes('mmol'));
   check('최신 약 날짜순 선택',facts.includes('현재약')&&!facts.includes('옛약'));
   check('날짜 없는 증상 표시',facts.includes('날짜 미확인'));
   check('최근 체성분 8개',facts.includes(addDays(d,-7)+' 체중 61')&&!facts.includes(addDays(d,-8)+' 체중 60')&&!facts.includes(future+' 체중'));
   check('결과 결정적',facts===emrFacts(p));
   check('조회는 읽기 전용',JSON.stringify(DB)===before);
   const none=emrFacts({sources:{labs:[],body:false,diet_days:0,visits_days:0,events:false}});
   check('범위 끄기',!['[식이','[의료 기록','[피검사','[체성분','[사고','[현재 복용약'].some(x=>none.includes(x)));
   DB.health.labDates=Array.from({length:8},(_,i)=>addDays(d,i-7));DB.health.labValues['칼륨']=Array.from({length:8},(_,i)=>i);
   const six=emrFacts(p);check('피검사 최근 6회',!six.includes(addDays(d,-7)+' 0')&&six.includes(addDays(d,-5)+' 2'));
   DB.health.labDates=[d];DB.health.labMeds=[{am:['현재약']}];
   document.getElementById('login').style.display='none';document.getElementById('app').classList.add('on');
   gotoTab('emr');
   check('건강 메뉴 첫 항목',document.querySelector('[data-v="emr"]').nextElementSibling.dataset.v==='weight');
   check('화면 사실 원문 일치',document.getElementById('emrFactsText').textContent===emrFacts(emrWholeProblem()));
   check('XSS 텍스트로 렌더',!document.querySelector('#emrFactsText img')&&!window.__xss);
   return results;
 });
 for(const r of result)assert.ok(r.ok,r.name);
 await page.locator('.emrfacts summary').click();assert.equal(await page.locator('.emrfacts').getAttribute('open'),null);
 await page.locator('.emrfacts summary').click();
 await page.getByRole('button',{name:'↻ 현재 기록으로 새로 보기'}).click();
 fs.mkdirSync(path.join(__dirname,'.out'),{recursive:true});
 for(const width of [1440,400]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'가로 넘침 '+width);
   await page.screenshot({path:path.join(__dirname,'.out','emr-'+width+'.png'),fullPage:true});
 }
 assert.deepEqual(errors,[]);
 console.log('전부 통과 ('+(result.length+4)+'건)');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
