/* 📅 로한북 cal-sync — ICS 해석기 (daily-design.md §5-3 · 핸드오프 daily-view-spec D2)
   🔒 순수 JS(ESM) — Deno(Edge Function)와 Node(tests/t90.js)가 같은 파일을 읽는다. 바깥 라이브러리 없음.
   다루는 것: 줄 접힘 · 이스케이프 · VALUE=DATE(종일) · TZID · Z · 시각만(떠 있는 시각 = 서울)
             · DTEND/DURATION · RRULE(DAILY·WEEKLY·MONTHLY·YEARLY · INTERVAL · COUNT · UNTIL · BYDAY(서수 포함) · BYMONTHDAY · BYMONTH)
             · EXDATE · RECURRENCE-ID(회차 수정) · STATUS:CANCELLED
   돌려주는 것: [{uid, inst, title, cat, all_day, d0, d1, t0, t1, loc, note}] — 창(from~to · 서울 날짜) 과 겹치는 것만
   🔒 종일 일정의 DTEND 는 「다음 날」이다(RFC 5545) → d1 = DTEND − 1일 */
export const TZ_DEFAULT = 'Asia/Seoul';

function unfold(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}
function unesc(v) {
  return String(v || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}
/* 「NAME;P1=a;P2=b:VALUE」 → {name, params, value} */
function parseLine(line) {
  let i = 0, inQ = false;
  for (; i < line.length; i++) { const c = line[i]; if (c === '"') inQ = !inQ; else if (c === ':' && !inQ) break; }
  const head = line.slice(0, i), value = line.slice(i + 1);
  const parts = head.split(';'), name = parts.shift().toUpperCase(), params = {};
  parts.forEach(p => { const k = p.indexOf('='); if (k > 0) params[p.slice(0, k).toUpperCase()] = p.slice(k + 1).replace(/^"|"$/g, ''); });
  return { name, params, value };
}
const pad = n => String(n).padStart(2, '0');
function ymd(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
/* 서울(또는 tz)의 벽시계 → UTC ms. Intl 로 그 순간의 시차를 구해 두 번 맞춘다(서머타임 경계도 맞는다) */
const DTF = {};
function tzParts(ms, tz) {
  const f = DTF[tz] || (DTF[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const o = {}; f.formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; });
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
}
function wallToUtc(y, m, d, h, mi, s, tz) {
  let guess = Date.UTC(y, m - 1, d, h, mi, s);
  for (let k = 0; k < 2; k++) {
    const p = tzParts(guess, tz), asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    guess -= (asUtc - Date.UTC(y, m - 1, d, h, mi, s));
  }
  return guess;
}
function okTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; } }
/* 날짜·시각 값 하나 → {allDay, y,m,d,h,mi,s, tz, utc} */
function parseDT(value, params, tzFallback) {
  const v = String(value || '').trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (params && params.VALUE === 'DATE' || m[4] === undefined) return { allDay: true, y, m: mo, d, h: 0, mi: 0, s: 0 };
  const h = +m[4], mi = +m[5], s = +(m[6] || 0);
  let tz = (params && params.TZID) || tzFallback || TZ_DEFAULT;
  if (!okTz(tz)) tz = TZ_DEFAULT;
  const utc = m[7] ? Date.UTC(y, mo - 1, d, h, mi, s) : wallToUtc(y, mo - 1 + 1, d, h, mi, s, tz);
  /* Z 시각은 벽시계를 tz 로 다시 읽는다(반복을 서울 벽시계로 펼치기 위해) */
  let wall = { y, m: mo, d, h, mi, s };
  if (m[7]) { const p = tzParts(utc, tz); wall = { y: p.y, m: p.m, d: p.d, h: p.h, mi: p.mi, s: p.s }; }
  return { allDay: false, ...wall, tz, utc };
}
function addDaysYmd(s, n) { const t = new Date(s + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function dowOf(s) { return new Date(s + 'T00:00:00Z').getUTCDay(); }
function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
function seoulDay(ms, tz) { const p = tzParts(ms, tz || TZ_DEFAULT); return ymd(p.y, p.m, p.d); }
function parseDuration(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(v || '').trim());
  if (!m) return null;
  const sec = ((+m[2] || 0) * 7 * 86400) + ((+m[3] || 0) * 86400) + ((+m[4] || 0) * 3600) + ((+m[5] || 0) * 60) + (+m[6] || 0);
  return (m[1] === '-' ? -1 : 1) * sec * 1000;
}
const DOWS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function parseRule(v) {
  const r = {}; String(v || '').split(';').forEach(p => { const k = p.indexOf('='); if (k > 0) r[p.slice(0, k).toUpperCase()] = p.slice(k + 1); });
  const out = { freq: r.FREQ, interval: Math.max(1, +r.INTERVAL || 1), count: r.COUNT ? +r.COUNT : null, until: null, byday: null, bymonthday: null, bymonth: null, wkst: DOWS[r.WKST] != null ? DOWS[r.WKST] : 1 };
  if (r.UNTIL) { const u = /^(\d{4})(\d{2})(\d{2})/.exec(r.UNTIL); if (u) out.until = ymd(+u[1], +u[2], +u[3]); }
  if (r.BYDAY) out.byday = r.BYDAY.split(',').map(x => { const m = /^([+-]?\d+)?([A-Z]{2})$/.exec(x.trim()); return m ? { n: m[1] ? +m[1] : 0, d: DOWS[m[2]] } : null; }).filter(Boolean);
  if (r.BYMONTHDAY) out.bymonthday = r.BYMONTHDAY.split(',').map(Number).filter(n => n);
  if (r.BYMONTH) out.bymonth = r.BYMONTH.split(',').map(Number).filter(n => n);
  return out;
}
function dim(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
/* 그 달에서 그 요일의 몇 번째인가(앞에서 · 뒤에서) */
function nthOfMonth(s) { const d = +s.slice(8, 10), y = +s.slice(0, 4), m = +s.slice(5, 7); return { f: Math.floor((d - 1) / 7) + 1, b: -(Math.floor((dim(y, m) - d) / 7) + 1) }; }
function weekIndex(s, wkst) { const back = (dowOf(s) - wkst + 7) % 7; return addDaysYmd(s, -back); }
function ruleMatch(rule, start, day) {
  const sy = +start.slice(0, 4), sm = +start.slice(5, 7), sd = +start.slice(8, 10);
  const y = +day.slice(0, 4), m = +day.slice(5, 7), d = +day.slice(8, 10), w = dowOf(day);
  const bydayOk = (allowNth) => !rule.byday || rule.byday.some(b => { if (b.d !== w) return false; if (!b.n || !allowNth) return true; const k = nthOfMonth(day); return b.n === k.f || b.n === k.b; });
  const mdayOk = () => !rule.bymonthday || rule.bymonthday.some(n => n > 0 ? n === d : (dim(y, m) + n + 1) === d);
  if (rule.bymonth && rule.bymonth.indexOf(m) < 0) return false;
  switch (rule.freq) {
    case 'DAILY': return daysBetween(start, day) % rule.interval === 0 && bydayOk(false) && mdayOk();
    case 'WEEKLY': {
      const wk = Math.round(daysBetween(weekIndex(start, rule.wkst), weekIndex(day, rule.wkst)) / 7);
      if (wk % rule.interval !== 0) return false;
      return rule.byday ? bydayOk(false) : w === dowOf(start);
    }
    case 'MONTHLY': {
      const mm = (y - sy) * 12 + (m - sm); if (mm % rule.interval !== 0) return false;
      if (rule.byday || rule.bymonthday) return bydayOk(true) && mdayOk();
      return d === sd;
    }
    case 'YEARLY': {
      if ((y - sy) % rule.interval !== 0) return false;
      if (!rule.bymonth && m !== sm) return false;
      if (rule.byday || rule.bymonthday) return bydayOk(true) && mdayOk();
      return d === sd;
    }
  }
  return false;
}
function splitCat(summary) {
  const s = String(summary || '').trim(), m = /^\[([^\]]{1,20})\]\s*(.*)$/.exec(s);
  return m ? { cat: m[1].trim(), title: m[2].trim() || m[1].trim() } : { cat: null, title: s };
}
/* 한 VEVENT 의 한 회차 → 행 */
function toRow(ev, inst, st, durMs, override) {
  const e = override || ev, sc = splitCat(e.summary);
  const row = { uid: ev.uid, inst, title: sc.title, cat: sc.cat, all_day: !!st.allDay, loc: e.loc || null, note: e.note || null, d0: null, d1: null, t0: null, t1: null };
  if (st.allDay) {
    row.d0 = ymd(st.y, st.m, st.d);
    const days = Math.max(1, Math.round(durMs / 86400000));
    row.d1 = addDaysYmd(row.d0, days - 1);
  } else {
    const t0 = st.utc, t1 = st.utc + Math.max(0, durMs);
    row.t0 = new Date(t0).toISOString(); row.t1 = new Date(t1).toISOString();
    row.d0 = seoulDay(t0); row.d1 = seoulDay(Math.max(t0, t1 - 1));
  }
  return row;
}
function instKey(st) { return st.allDay ? ymd(st.y, st.m, st.d).replace(/-/g, '') : (ymd(st.y, st.m, st.d).replace(/-/g, '') + 'T' + pad(st.h) + pad(st.mi) + pad(st.s)); }

export function parseIcs(text, opt) {
  opt = opt || {};
  const from = opt.from, to = opt.to;               /* 'YYYY-MM-DD' (서울) · 둘 다 포함 */
  const lines = unfold(text).split('\n');
  const evs = []; let cur = null, depth = 0, calTz = null;
  for (const raw of lines) {
    if (!raw) continue;
    const L = parseLine(raw);
    if (L.name === 'BEGIN' && L.value.toUpperCase() === 'VEVENT') { cur = { ex: [], rdate: [] }; depth = 0; continue; }
    if (L.name === 'BEGIN' && cur) { depth++; continue; }                       /* VALARM 같은 안쪽 묶음은 건너뛴다 */
    if (L.name === 'END' && cur && depth > 0) { depth--; continue; }
    if (L.name === 'END' && L.value.toUpperCase() === 'VEVENT') { if (cur) evs.push(cur); cur = null; continue; }
    if (L.name === 'X-WR-TIMEZONE' && !cur) { calTz = L.value.trim(); continue; }
    if (!cur || depth > 0) continue;
    switch (L.name) {
      case 'UID': cur.uid = L.value.trim(); break;
      case 'SUMMARY': cur.summary = unesc(L.value); break;
      case 'LOCATION': cur.loc = unesc(L.value); break;
      case 'DESCRIPTION': cur.note = unesc(L.value); break;
      case 'STATUS': cur.status = L.value.trim().toUpperCase(); break;
      case 'DTSTART': cur.dts = L; break;
      case 'DTEND': cur.dte = L; break;
      case 'DURATION': cur.dur = L.value; break;
      case 'RRULE': cur.rrule = L.value; break;
      case 'EXDATE': L.value.split(',').forEach(v => cur.ex.push({ value: v, params: L.params })); break;
      case 'RECURRENCE-ID': cur.rid = L; break;
    }
  }
  const tzF = (calTz && okTz(calTz)) ? calTz : TZ_DEFAULT;
  /* 회차 수정(RECURRENCE-ID)은 본 일정 밑으로 */
  const base = {}, overrides = {};
  evs.forEach(e => {
    if (!e.uid) return;
    if (e.rid) {   /* 회차 수정·취소 — 취소 기록은 DTSTART 가 없을 수 있다 */ const k = parseDT(e.rid.value, e.rid.params, tzF); if (k) (overrides[e.uid] = overrides[e.uid] || {})[instKey(k)] = e; }
    else if (e.dts) base[e.uid] = e;
  });
  const out = [];
  const inWin = r => (!from || r.d1 >= from) && (!to || r.d0 <= to);
  Object.keys(base).forEach(uid => {
    const e = base[uid];
    if (e.status === 'CANCELLED') return;
    const st = parseDT(e.dts.value, e.dts.params, tzF); if (!st) return;
    let durMs;
    if (e.dte) { const en = parseDT(e.dte.value, e.dte.params, tzF); durMs = en ? (st.allDay ? daysBetween(ymd(st.y, st.m, st.d), ymd(en.y, en.m, en.d)) * 86400000 : en.utc - st.utc) : 0; }
    else if (e.dur) durMs = parseDuration(e.dur) || 0;
    else durMs = st.allDay ? 86400000 : 0;
    if (st.allDay && durMs <= 0) durMs = 86400000;
    const ov = overrides[uid] || {};
    if (!e.rrule) {
      const r = toRow(e, '', st, durMs); if (inWin(r)) out.push(r); return;
    }
    const rule = parseRule(e.rrule); if (!rule.freq) return;
    const exset = {}; e.ex.forEach(x => { const k = parseDT(x.value, x.params, st.tz || tzF); if (k) exset[st.allDay ? instKey({ ...k, allDay: true }) : instKey(k)] = 1; });
    const start = ymd(st.y, st.m, st.d);
    const end = rule.until && (!to || rule.until < to) ? rule.until : (to || addDaysYmd(start, 400));
    /* COUNT 가 없으면 창 시작까지 건너뛴다(오래된 연례 일정이 1990 년부터 돌지 않게) — 맞춤 여부는 start 기준이라 그대로다 */
    let day = (!rule.count && from && from > start) ? addDaysYmd(from, -40) : start;
    if (day < start) day = start;
    let n = 0, guard = 0;
    while (day <= end && guard++ < 20000) {
      if (ruleMatch(rule, start, day)) {
        n++;
        if (rule.count && n > rule.count) break;
        const y = +day.slice(0, 4), m = +day.slice(5, 7), d = +day.slice(8, 10);
        const occ = st.allDay ? { allDay: true, y, m, d, h: 0, mi: 0, s: 0 }
          : { allDay: false, y, m, d, h: st.h, mi: st.mi, s: st.s, tz: st.tz, utc: wallToUtc(y, m, d, st.h, st.mi, st.s, st.tz) };
        const k = instKey(occ);
        if (!exset[k]) {
          const o = ov[k];
          if (o) {
            if (o.status !== 'CANCELLED') {
              const ost = o.dts ? parseDT(o.dts.value, o.dts.params, tzF) : occ;
              let od = durMs; if (o.dte) { const oe = parseDT(o.dte.value, o.dte.params, tzF); if (oe && ost) od = ost.allDay ? daysBetween(ymd(ost.y, ost.m, ost.d), ymd(oe.y, oe.m, oe.d)) * 86400000 : oe.utc - ost.utc; }
              const r = toRow(e, k, ost || occ, od, o); if (inWin(r)) out.push(r);
            }
          } else { const r = toRow(e, k, occ, durMs); if (inWin(r)) out.push(r); }
        }
      }
      day = addDaysYmd(day, 1);
    }
  });
  return out;
}
export const _t = { splitCat, parseRule, ruleMatch, wallToUtc, seoulDay };
