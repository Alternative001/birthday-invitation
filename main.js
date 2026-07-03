/* =========================================================================
   Julian at Thirty — invitation logic
   =========================================================================
   RSVP responses are sent to a Google Sheet via a Google Apps Script Web App.
   Paste the Web App URL you get from Google (Phase 2) between the quotes below.
   Until it is set, the form still works locally (shows the thank-you) but no
   response is recorded.
   ------------------------------------------------------------------------- */
const RSVP_ENDPOINT = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

/* ----------------------------- state ----------------------------- */
const state = { attending: "yes" };

/* ----------------------------- countdown ----------------------------- */
// 16 Aug 2026, 1pm Dubai time (UTC+4) == 09:00 UTC
const TARGET = new Date("2026-08-16T13:00:00+04:00").getTime();
const pad = (n) => (n < 10 ? "0" : "") + n;

function tick() {
  let diff = Math.max(0, TARGET - Date.now());
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);    diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("cDays", pad(d)); set("cHours", pad(h)); set("cMins", pad(m)); set("cSecs", pad(s));
}
tick();
setInterval(tick, 1000);

/* ----------------------------- accept / decline toggle ----------------------------- */
const btnYes = document.getElementById("btnYes");
const btnNo  = document.getElementById("btnNo");

function toggleStyle(active, activeBg, activeFg) {
  const base = "flex:1; min-width:0; padding:14px 10px; text-align:center; font-family:'Jost',sans-serif; font-size:11px; letter-spacing:.14em; text-transform:uppercase; cursor:pointer; transition:all .25s ease; border:1px solid #a98f63;";
  return active
    ? base + " background:" + activeBg + "; color:" + activeFg + ";"
    : base + " background:transparent; color:#6a6252;";
}
function paintToggles() {
  btnYes.setAttribute("style", toggleStyle(state.attending === "yes", "#2f3a2c", "#efe9dd"));
  btnNo.setAttribute("style",  toggleStyle(state.attending === "no",  "#8a6d4f", "#efe9dd"));
}
btnYes.addEventListener("click", () => { state.attending = "yes"; paintToggles(); });
btnNo.addEventListener("click",  () => { state.attending = "no";  paintToggles(); });
paintToggles();

/* ----------------------------- RSVP submit ----------------------------- */
const form   = document.getElementById("rsvp-form");
const done   = document.getElementById("rsvp-done");
const submit = document.getElementById("rSubmit");

function confirmLine(name, guests, attending) {
  if (attending === "no") return "You will be missed dearly — thank you for letting me know.";
  const seats = guests === "1" ? "a seat is saved for you" : guests + " seats are saved for your party";
  return "Wonderful — " + seats + ". Full details to follow.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name   = document.getElementById("rName").value.trim();
  const guests = document.getElementById("rGuests").value;
  const note   = document.getElementById("rNote").value.trim();
  const attending = state.attending;
  if (!name) { document.getElementById("rName").focus(); return; }

  // record to the Google Sheet (fire-and-forget; don't block the guest on the network)
  if (RSVP_ENDPOINT && !RSVP_ENDPOINT.startsWith("PASTE_")) {
    submit.disabled = true;
    submit.textContent = "Sending…";
    try {
      await fetch(RSVP_ENDPOINT, {
        method: "POST",
        // text/plain avoids a CORS preflight that Apps Script can't answer
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ name, guests, attending, note }),
      });
    } catch (err) {
      // The write usually still lands; show thanks regardless so a guest is never stuck.
      console.error("RSVP send failed:", err);
    }
  }

  // show the confirmation panel
  document.getElementById("doneName").textContent = name;
  document.getElementById("doneLine").textContent = confirmLine(name, guests, attending);
  form.style.display = "none";
  done.style.display = "block";
  done.scrollIntoView({ behavior: "smooth", block: "center" });
});

/* ----------------------------- add to calendar (.ics, iOS-friendly) ----------------------------- */
const calBtn = document.getElementById("add-cal");
if (calBtn) calBtn.addEventListener("click", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Julian 30th//Brunch//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:julian-30-brunch-20260816@dubai",
    "DTSTAMP:20260703T000000Z",
    "DTSTART:20260816T090000Z",
    "DTEND:20260816T120000Z",
    "SUMMARY:Julian's 30th - Sunday Brunch",
    "LOCATION:Andaliman, One Za'abeel, Dubai",
    "DESCRIPTION:Brunch from 1 to 4 in the afternoon. It's on Julian - just bring yourself.",
    "URL:https://share.google/kqYCrVnFTjfO7gXPy",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Julian's 30th brunch tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Julian-30th-Brunch.ics";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 600);
});

/* ----------------------------- story reveal on scroll ----------------------------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("revealed");
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });
document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

/* ----------------------------- back to top ----------------------------- */
const toTop  = document.getElementById("to-top");
const toTop2 = document.getElementById("to-top-2");
const scrollUp = () => window.scrollTo({ top: 0, behavior: "smooth" });
if (toTop)  toTop.addEventListener("click", scrollUp);
if (toTop2) toTop2.addEventListener("click", scrollUp);

window.addEventListener("scroll", () => {
  const show = window.scrollY > 700;
  if (toTop) {
    toTop.style.opacity = show ? "1" : "0";
    toTop.style.pointerEvents = show ? "auto" : "none";
  }
}, { passive: true });
