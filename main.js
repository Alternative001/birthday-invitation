/* =========================================================================
   Julian at Thirty — invitation logic
   =========================================================================
   RSVP responses are sent to a Google Sheet via a Google Apps Script Web App.
   Paste the Web App URL you get from Google (Phase 2) between the quotes below.
   Until it is set, the form still works locally (shows the thank-you) but no
   response is recorded.
   ------------------------------------------------------------------------- */
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbwoe17u0RRSom0XzL56JVFn7U76uws4Zd25jxFFfVgwetzccVt_ZdWpOXTeaP_9Fgeh/exec";

/* ----------------------------- state ----------------------------- */
const state = { attending: "yes" };

/* ----------------------------- personal invitation ----------------------------- */
// Personal links: ?to=Anna — or for couples/groups, repeat the param: ?to=Ina&to=Hannes
// (renders as "Ina & Hannes"). Without the param the site shows the general version.
const inviteNames = new URLSearchParams(location.search)
  .getAll("to")
  .map((s) => s.replace(/[<>&"]/g, "").trim())
  .filter(Boolean)
  .slice(0, 4);
const inviteName = inviteNames.join(" & ").slice(0, 60);

if (inviteName) {
  const eyebrow = document.getElementById("hero-eyebrow");
  if (eyebrow) eyebrow.textContent = "An invitation for";
  const nameEl = document.getElementById("hero-name");
  if (nameEl) { nameEl.textContent = inviteName; nameEl.style.display = "block"; }
  // let the script name land on its own beat, then push the rest back
  const sub = document.getElementById("hero-sub");
  if (sub) sub.style.animationDelay = ".95s";
  const h1 = document.querySelector(".hero-frame h1");
  if (h1) h1.style.animationDelay = "1.1s";
  const chug = document.getElementById("rule-chug");
  if (chug) chug.textContent = "…" + inviteName + ", you chug your drink until I look at you like this.";
  const nameField = document.getElementById("rName");
  if (nameField) nameField.value = inviteName;
  const guestsField = document.getElementById("rGuests");
  if (guestsField && inviteNames.length > 1) guestsField.value = String(Math.min(inviteNames.length, 4));
}

/* ----------------------------- gold fizz on "joyfully accepts" ----------------------------- */
function goldFizz(originEl) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = originEl.getBoundingClientRect();
  const colors = ["#c2a878", "#e8d9a0", "#fff6d8", "#a98f63"];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("div");
    const size = 3 + Math.random() * 5;
    p.style.cssText =
      "position:fixed; z-index:80; pointer-events:none; border-radius:50%;" +
      "width:" + size + "px; height:" + size + "px;" +
      "left:" + (rect.left + Math.random() * rect.width) + "px;" +
      "top:" + (rect.top + rect.height / 2) + "px;" +
      "background:" + colors[i % colors.length] + ";" +
      "box-shadow:0 0 " + (4 + Math.random() * 6) + "px rgba(226,192,122,.9);";
    document.body.appendChild(p);
    const dx = (Math.random() - 0.5) * 170;
    const dy = -(60 + Math.random() * 160);
    p.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) scale(.2)", opacity: 0 },
      ],
      { duration: 900 + Math.random() * 700, easing: "cubic-bezier(.16,.84,.44,1)" }
    ).onfinish = () => p.remove();
  }
}

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
btnYes.addEventListener("click", () => { state.attending = "yes"; paintToggles(); goldFizz(btnYes); });
btnNo.addEventListener("click",  () => { state.attending = "no";  paintToggles(); });
paintToggles();

/* ----------------------------- RSVP submit ----------------------------- */
const form   = document.getElementById("rsvp-form");
const done   = document.getElementById("rsvp-done");
const submit = document.getElementById("rSubmit");

function confirmLine(name, guests, attending) {
  if (attending === "no") return "You will be missed dearly — thank you for letting me know.";
  const seats = guests === "1" ? "a seat is saved for you" : guests + " seats are saved for your party";
  return "Wonderful — " + seats + ". See you at Andaliman.";
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

/* ----------------------------- mobile story parallax ----------------------------- */
// on mobile, each story photo sits in a 76vh full-bleed frame, oversized by 40%;
// this nudges it opposite the scroll direction for a parallax feel as it passes through.
const storyImgs = Array.from(document.querySelectorAll(".story-img"));
const isMobileStory = () => window.matchMedia("(max-width: 680px)").matches;

function updateStoryParallax() {
  if (!isMobileStory()) {
    storyImgs.forEach((img) => { img.style.transform = ""; });
    return;
  }
  const vh = window.innerHeight;
  storyImgs.forEach((img) => {
    const rect = img.parentElement.getBoundingClientRect();
    if (rect.bottom < -300 || rect.top > vh + 300) return; // skip work well off-screen
    const center = rect.top + rect.height / 2;
    const offset = (vh / 2 - center) * 0.12;
    img.style.transform = "translateY(" + offset.toFixed(1) + "px)";
  });
}
window.addEventListener("scroll", updateStoryParallax, { passive: true });
window.addEventListener("resize", updateStoryParallax);
updateStoryParallax();

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
