# Cowork prompt: final checks before sending the Secret Santa links

Paste everything below the line into Cowork.

---

Please do some final checks on our family Secret Santa website using my browser, where I'm signed in to Vercel, Supabase and WhatsApp Web. The live site is https://family-secret-santa-two.vercel.app. Work through the four parts in order and stop to ask me if anything doesn't match what you see.

**Part 1: Tidy the Vercel settings**

1. Go to vercel.com, make sure the team at the top left is "Adam Hughes Studio's projects", and open the project `family-secret-santa`.
2. Open **Settings > Build and Deployment** (on older layouts, **Settings > General**).
3. Set **Root Directory** to `secret-santa`. If the folder picker still doesn't list it, type it into the field. Save.
4. In **Build and Output Settings**, turn **off** the overrides for **Build Command** and **Output Directory** so both are empty. This matters: with the new root directory, an Output Directory of `secret-santa` would point at a folder that doesn't exist and break the site. Leave Framework Preset as "Other". Save.
5. Go to **Deployments**, open the menu on the latest production deployment and choose **Redeploy**. Wait for **Ready**.
6. In a private or incognito window, check:
   - https://family-secret-santa-two.vercel.app shows the Secret Santa page with snow and the present animation
   - https://family-secret-santa-two.vercel.app/og.jpg shows a picture of a present bursting open
   - https://family-secret-santa-two.vercel.app/README.md shows a 404 page (it used to be visible)
   If the main page is broken, go back to step 3, set Root Directory back to `./`, set Output Directory to `secret-santa` and Build Command to `echo "static site"`, redeploy, and tell me.
7. Open **Settings > Deployment Protection** and confirm **Vercel Authentication** is off for production. Don't change anything else.

**Part 2: Check the Supabase cost**

8. Go to supabase.com, open the organisation "AdamHughesStudio", then **Billing** (or **Usage**).
9. Tell me what the project `secret-santa` is costing or is expected to cost this month. Don't change the plan, compute size or anything else.

**Part 3: Test a throwaway game in a real browser**

10. In a normal window, open https://family-secret-santa-two.vercel.app and wait for the present animation to finish.
11. Under "Organising this year?", fill in:
    - Name your game: `Cowork test`
    - Your name: `Organiser`
    - Everyone else: `Test One`, `Test Two`, `Test Three`
    - Budget: leave on £50
    - Gift swap day: 25 December 2026
    - PIN: `1357`
12. Tap **Create game and draw names**. You should see "Drawing the names in secret", then a red gift tag, then an Organiser section listing Test One, Test Two and Test Three, each with a Copy button. Write down the 6 character game code shown at the bottom of the Organiser section.
13. Click **Copy** next to Test One. Open a private or incognito window, paste just the web address part of what was copied (it ends in `?k=` followed by letters and numbers) and open it. Check that it goes straight to a red tag saying "To: Test One", and that tapping the tag flips it to "You're buying for" someone, with "Spend up to £50". Check that no list of other people's names appears anywhere on that page.
14. Back in the organiser window, reload. Test One should now say "Seen their person".

**Part 4: Check the WhatsApp preview card (don't send anything)**

15. Open web.whatsapp.com and open the chat called "Message yourself" (or my own name, marked "You"). If there's no such chat, stop and ask me.
16. Paste Test One's link into the message box, but **do not press send**. Wait about 5 seconds. A preview card should appear above the box with a picture of a present bursting open, the title "Secret Santa" and the line "Your Secret Santa is ready! Tap to find out who you're buying for."
17. Take note of what appears, then clear the message box so nothing is sent.

**Rules**

- Don't send any WhatsApp message to anyone, including me.
- Don't create any game other than "Cowork test", and don't touch any other Vercel or Supabase project.
- Don't buy, upgrade or change any plan. If anything asks for payment, stop and tell me.
- If a step doesn't match what you see, describe it and ask before guessing.

**When you're done, tell me:**
- the result of each check in steps 6, 7, 13, 14 and 16 (worked or didn't, and what you saw)
- the Supabase cost from step 9
- the game code from step 12, so Claude Code can delete the test game
- anything you did differently from these steps
