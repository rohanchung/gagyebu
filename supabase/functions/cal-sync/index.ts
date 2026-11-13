// 📅 로한북 cal-sync — 구글 캘린더(ICS) → public.cal_events (daily-design.md §5 · 핸드오프 daily-view-spec D2)
// 🔒 주소는 비밀번호다 — 비밀값 CAL_ICS_<KEY> 에서만 읽고, 응답·last_status·로그에 싣지 않는다.
//    예외: 대한민국 휴일(hd)은 구글이 공개한 주소라 기본값으로 둔다(비밀값이 있으면 그것).
// 🔒 쓰기는 이 함수(service role)만 · 앱은 cal_events 를 읽기만 한다(RLS: 본인 select).
// 🔒 받아 오기에 실패하면 「사라짐(gone_at)」을 찍지 않는다 — 일시 장애로 일정이 지워지지 않게.
// 부르는 길: pg_cron 30분 · 앱 ↻({manual:true} · 1분 1회) · verify_jwt 켬
import { parseIcs } from "./ics.mjs";

const PUBLIC_DEFAULT: Record<string, string> = {
  hd: "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics",
};
const DAY = 86400000;
const seoulYmd = (ms: number) => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  const URL_ = Deno.env.get("SUPABASE_URL")!, KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
  const rest = (path: string, init: RequestInit = {}) => fetch(URL_ + "/rest/v1/" + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  let body: { manual?: boolean } = {};
  try { body = await req.json(); } catch (_) { /* 빈 몸 */ }
  const srcRes = await rest("cal_sources?select=user_id,key,last_sync_at&order=ord");
  if (!srcRes.ok) return json({ ok: false, error: "sources " + srcRes.status }, 500);
  const sources: { user_id: string; key: string; last_sync_at: string | null }[] = await srcRes.json();
  const now = Date.now();
  if (body.manual && sources.some((s) => s.last_sync_at && now - Date.parse(s.last_sync_at) < 60000)) {
    return json({ ok: true, skipped: "1분 안에 이미 받아 왔다" });
  }
  const run = new Date(now).toISOString(), from = seoulYmd(now - 90 * DAY), to = seoulYmd(now + 400 * DAY);
  const out: { key: string; status: string; n?: number }[] = [];
  for (const s of sources) {
    const addr = Deno.env.get("CAL_ICS_" + s.key.toUpperCase()) || PUBLIC_DEFAULT[s.key];
    let status = "", n = 0;
    if (!addr) status = "주소 없음 — Supabase Secrets 에 CAL_ICS_" + s.key.toUpperCase();
    else {
      try {
        const r = await fetch(addr, { headers: { "User-Agent": "rohanbook-cal-sync" } });
        if (!r.ok) status = "받기 실패 " + r.status;
        else {
          const text = await r.text();
          if (!/BEGIN:VCALENDAR/.test(text)) status = "ICS 가 아니다";
          else {
            const rows = parseIcs(text, { from, to }).map((e: Record<string, unknown>) => ({ ...e, user_id: s.user_id, src: s.key, updated_at: run, gone_at: null }));
            for (let i = 0; i < rows.length; i += 500) {
              const up = await rest("cal_events?on_conflict=user_id,src,uid,inst", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + 500)) });
              if (!up.ok) throw new Error("저장 실패 " + up.status);
            }
            // 창 안에서 이번에 안 온 것 = 원본에서 사라진 일정(지우지 않고 gone_at)
            const gone = await rest(`cal_events?user_id=eq.${s.user_id}&src=eq.${s.key}&gone_at=is.null&updated_at=lt.${encodeURIComponent(run)}&d1=gte.${from}&d0=lte.${to}`,
              { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ gone_at: run }) });
            if (!gone.ok) throw new Error("사라짐 표시 실패 " + gone.status);
            n = rows.length; status = "ok " + n + "건";
          }
        }
      } catch (e) {
        status = "파싱·저장 실패 — " + String((e as Error).message || e).slice(0, 80).replace(/https?:\/\/\S+/g, "(주소)");
      }
    }
    await rest(`cal_sources?user_id=eq.${s.user_id}&key=eq.${s.key}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_sync_at: run, last_status: status }) });
    out.push({ key: s.key, status, n });
  }
  return json({ ok: true, at: run, sources: out });
});
