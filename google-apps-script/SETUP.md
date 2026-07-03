# Phase 2 — Google Sheet + RSVP script (your ~15-minute task)

This turns a private Google Sheet into the inbox for RSVPs. Only you (logged
into your Google account) can see it. Do this whenever you have a moment — the
website works without it; it just won't record answers until the URL is pasted in.

## Steps

1. Go to <https://sheets.new> to create a fresh blank Google Sheet.
   Name it something like **"Julian 30th — RSVPs"**.

2. In that Sheet, open **Extensions ▸ Apps Script**. A code editor opens in a new tab.

3. Delete whatever sample code is in `Code.gs`, then **paste the entire contents
   of `Code.gs`** from this folder. Click the **Save** icon (💾).

4. Click **Deploy ▸ New deployment**.
   - Click the gear ⚙ next to "Select type" and choose **Web app**.
   - **Description:** anything (e.g. "RSVP endpoint").
   - **Execute as:** **Me**.
   - **Who has access:** **Anyone**.
     *(This only means "anyone can POST an RSVP" — it does NOT make your Sheet
     public. Nobody can read the responses without your Google login.)*
   - Click **Deploy**.

5. Google will ask you to **authorize** the script the first time. Approve it.
   (You may see a "Google hasn't verified this app" screen — click **Advanced ▸
   Go to … (unsafe)**. It's your own script, so it's safe.)

6. Copy the **Web app URL** it shows you. It looks like:
   `https://script.google.com/macros/s/AKfy……/exec`

7. Send me that URL (or paste it yourself into `site/main.js`, replacing
   `PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE`).

## Your counter of positive responses

Once a few RSVPs come in, the Sheet fills with columns:
`Timestamp | Name | Guests | Attending | Note`

Add these two formulas in any empty cells (e.g. G1 and G2) for live counters:

- **People accepting:**  `=COUNTIF(D:D,"yes")`
- **Total guests coming (sums party sizes):**  `=SUMIF(D:D,"yes",C:C)`

That's your private table + counter, right in the Sheet.
