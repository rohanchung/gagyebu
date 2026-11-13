/* t90 — 📅 cal-sync ICS 해석기 단위 테스트 (daily-view-spec D2)
   🔒 가짜 이름만 쓴다(학사 캘린더에는 실제 학생 이름이 있다 — daily-design §5-5)
   I1 종일 하루 · I2 종일 여러 날(DTEND 는 하루 뺀다) · I3 시각(TZID 서울) · I4 Z 시각 → 서울 날짜 · I5 떠 있는 시각 = 서울
   I6 줄 접힘·이스케이프 · I7 [분류] 떼기(첫 대괄호만) · R1 주 반복 BYDAY + COUNT · R2 EXDATE 빠짐 · R3 RECURRENCE-ID 회차 수정 · R4 회차 취소
   R5 월 반복 서수(2번째 화) · R6 연 반복(오래된 시작도 창에서만) · R7 UNTIL · W1 창 밖은 빠진다 · C1 STATUS:CANCELLED 는 빠진다 · V1 VALARM 은 무시 */
const path=require('path');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const ICS=`BEGIN:VCALENDAR
VERSION:2.0
X-WR-TIMEZONE:Asia/Seoul
BEGIN:VEVENT
UID:a1
DTSTART;VALUE=DATE:20261121
DTEND;VALUE=DATE:20261122
SUMMARY:친구 결혼식
END:VEVENT
BEGIN:VEVENT
UID:a2
DTSTART;VALUE=DATE:20261202
DTEND;VALUE=DATE:20261205
SUMMARY:[시험] 기말고사
END:VEVENT
BEGIN:VEVENT
UID:a3
DTSTART;TZID=Asia/Seoul:20261118T140000
DTEND;TZID=Asia/Seoul:20261118T150000
SUMMARY:[클리닉] 홍길동
LOCATION:본관 3층\\, 201호
DESCRIPTION:첫 줄\\n둘째 줄
END:VEVENT
BEGIN:VEVENT
UID:a4
DTSTART:20261118T160000Z
DTEND:20261118T170000Z
SUMMARY:[전화 상담] [기타] 김철수
END:VEVENT
BEGIN:VEVENT
UID:a5
DTSTART:20261119T093000
DURATION:PT45M
SUMMARY:떠 있는 시각
END:VEVENT
BEGIN:VEVENT
UID:a6
DTSTART;TZID=Asia/Seoul:20261116T190000
DTEND;TZID=Asia/Seoul:20261116T200000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6
EXDATE;TZID=Asia/Seoul:20261118T190000
SUMMARY:[클리닉] 반복 수업
END:VEVENT
BEGIN:VEVENT
UID:a6
RECURRENCE-ID;TZID=Asia/Seoul:20261123T190000
DTSTART;TZID=Asia/Seoul:20261123T200000
DTEND;TZID=Asia/Seoul:20261123T210000
SUMMARY:[클리닉] 반복 수업(시간 바뀜)
END:VEVENT
BEGIN:VEVENT
UID:a6
RECURRENCE-ID;TZID=Asia/Seoul:20261125T190000
STATUS:CANCELLED
SUMMARY:[클리닉] 반복 수업
END:VEVENT
BEGIN:VEVENT
UID:a7
DTSTART;VALUE=DATE:20261110
RRULE:FREQ=MONTHLY;BYDAY=2TU
SUMMARY:둘째 화요일 회의
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:알림이 일정 제목을 덮지 않는다
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:a8
DTSTART;VALUE=DATE:19900101
RRULE:FREQ=YEARLY
SUMMARY:신정
END:VEVENT
BEGIN:VEVENT
UID:a9
DTSTART;VALUE=DATE:20261101
RRULE:FREQ=DAILY;INTERVAL=3;UNTIL=20261110
SUMMARY:사흘마다
END:VEVENT
BEGIN:VEVENT
UID:b1
DTSTART;VALUE=DATE:20250101
SUMMARY:창 밖 옛 일정
END:VEVENT
BEGIN:VEVENT
UID:b2
DTSTART;VALUE=DATE:20261126
STATUS:CANCELLED
SUMMARY:취소된 일정
END:VEVENT
BEGIN:VEVENT
UID:b3
DTSTART;VALUE=DATE:20261127
SUMMARY:아주 긴 제목이 다음 줄로 접혀서 들어오는 경우를 시험하는 일
 정이다
END:VEVENT
END:VCALENDAR`;
(async()=>{
 try{
  const mod=await import('file:///'+path.join(__dirname,'..','supabase','functions','cal-sync','ics.mjs').replace(/\\/g,'/'));
  const rows=mod.parseIcs(ICS,{from:'2026-08-15',to:'2027-12-31'});
  const by=(uid)=>rows.filter(r=>r.uid===uid);
  const a1=by('a1')[0], a2=by('a2')[0], a3=by('a3')[0], a4=by('a4')[0], a5=by('a5')[0];
  ok('I1 종일 하루',a1&&a1.all_day&&a1.d0==='2026-11-21'&&a1.d1==='2026-11-21'&&a1.inst==='',JSON.stringify(a1));
  ok('I2 종일 여러 날(DTEND 12/05 → d1 12/04)',a2&&a2.d0==='2026-12-02'&&a2.d1==='2026-12-04'&&a2.cat==='시험'&&a2.title==='기말고사',JSON.stringify(a2));
  ok('I3 시각(TZID 서울) → UTC 05:00',a3&&!a3.all_day&&a3.t0==='2026-11-18T05:00:00.000Z'&&a3.t1==='2026-11-18T06:00:00.000Z'&&a3.d0==='2026-11-18',JSON.stringify(a3));
  ok('I4 Z 시각 16:00Z = 서울 11/19 01:00 → d0 11/19',a4&&a4.d0==='2026-11-19'&&a4.t0==='2026-11-18T16:00:00.000Z',JSON.stringify(a4));
  ok('I5 떠 있는 시각 = 서울 · DURATION 45분',a5&&a5.t0==='2026-11-19T00:30:00.000Z'&&a5.t1==='2026-11-19T01:15:00.000Z',JSON.stringify(a5));
  ok('I6 이스케이프(\\, \\n)·줄 접힘',a3&&a3.loc==='본관 3층, 201호'&&a3.note==='첫 줄\n둘째 줄'&&(by('b3')[0]||{}).title==='아주 긴 제목이 다음 줄로 접혀서 들어오는 경우를 시험하는 일정이다',JSON.stringify([a3&&a3.loc,(by('b3')[0]||{}).title]));
  ok('I7 [분류] 는 첫 대괄호만 뗀다',a4&&a4.cat==='전화 상담'&&a4.title==='[기타] 김철수'&&a3.cat==='클리닉'&&a3.title==='홍길동',JSON.stringify([a4&&a4.cat,a4&&a4.title]));
  const a6=by('a6').sort((x,y)=>x.inst<y.inst?-1:1), ins=a6.map(r=>r.inst);
  /* COUNT=6: 11/16 월 · 11/18 수 · 11/23 월 · 11/25 수 · 11/30 월 · 12/02 수 → 18 은 EXDATE · 25 는 취소 · 23 은 시간 바뀜 */
  ok('R1 주 반복 월·수 COUNT 6 (18 빠짐 · 25 취소 → 4회)',JSON.stringify(ins)===JSON.stringify(['20261116T190000','20261123T190000','20261130T190000','20261202T190000']),JSON.stringify(ins));
  ok('R2 EXDATE 회차가 없다',ins.indexOf('20261118T190000')<0);
  const o23=a6.find(r=>r.inst==='20261123T190000');
  ok('R3 회차 수정 — 시각·제목이 바뀐다',o23&&o23.t0==='2026-11-23T11:00:00.000Z'&&o23.title==='반복 수업(시간 바뀜)',JSON.stringify(o23));
  ok('R4 회차 취소는 빠진다',ins.indexOf('20261125T190000')<0);
  const a7=by('a7').map(r=>r.d0);
  ok('R5 월 반복 둘째 화요일',a7[0]==='2026-11-10'&&a7[1]==='2026-12-08'&&a7[2]==='2027-01-12',JSON.stringify(a7.slice(0,3)));
  const a8=by('a8').map(r=>r.d0);
  ok('R6 연 반복 — 오래된 시작도 창 안만',JSON.stringify(a8)===JSON.stringify(['2027-01-01']),JSON.stringify(a8));
  const a9=by('a9').map(r=>r.d0);
  ok('R7 사흘마다 UNTIL 11/10',JSON.stringify(a9)===JSON.stringify(['2026-11-01','2026-11-04','2026-11-07','2026-11-10']),JSON.stringify(a9));
  ok('W1 창 밖 일정은 빠진다',by('b1').length===0);
  ok('C1 STATUS:CANCELLED 는 빠진다',by('b2').length===0);
  ok('V1 VALARM 안의 DESCRIPTION 이 일정 메모를 덮지 않는다',(by('a7')[0]||{}).note===null,JSON.stringify(by('a7')[0]));
  const again=mod.parseIcs(ICS,{from:'2026-08-15',to:'2027-12-31'});
  ok('M1 두 번 돌려도 같다(멱등)',JSON.stringify(again)===JSON.stringify(rows));
  const keys=new Set(rows.map(r=>r.uid+'|'+r.inst));
  ok('K1 (uid, inst) 가 겹치지 않는다 — 기본키',keys.size===rows.length,rows.length+' vs '+keys.size);
 }catch(e){fail++;bad.push('예외 '+e.message);}
 console.log('t90 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
