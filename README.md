# FastAgent landing page

A static one-page site: plain HTML, CSS and JS with no build step.

## Paste your links

Open `config.js` and fill in:

- `SUPABASE_URL` and `SUPABASE_KEY`: the free waitlist. Emails go into the Supabase table `waitlist` (see them in Supabase → Table Editor). Use the publishable key only, never the secret one.
- `STRIPE_DEPOSIT_URL`: your Stripe Payment Link for the $29 refundable deposit
- `CONTACT_EMAIL`: the footer contact address

Every button on the page reads from that file. Until the Stripe link or contact email is set, that button is simply hidden.

## Preview locally

```bash
cd ~/FastAgent-landing
python3 serve.py
```

Then open http://localhost:8000. `serve.py` is a small preview server that supports the range requests Safari needs to play video.

## Deploy (free)

- **Netlify:** drag the `FastAgent-landing` folder onto app.netlify.com/drop.
- **Vercel:** import the folder as a project. Framework preset: "Other". No build command, output directory `.`.

## Files

- `index.html`, `styles.css`, `main.js`: the page and its demos.
- `config.js`: your links.
- `clips/`: the first 7 seconds of each video, cut without re-encoding and set to start playing instantly. These are what the demo plays, one pair at a time.
- `videos/`: your full-length originals. The page doesn't use them, so you can leave them out when you deploy.
- `posters/`: first frame of each video (540×960), shown before a video loads. `posters/thumbs/` holds the small image used in the schedule step.
- `images/listing/`: small copies of the $289K demo listing's photos, used in the "We extract your photos" step.
- `serve.py`: local preview only. It isn't needed in production.
