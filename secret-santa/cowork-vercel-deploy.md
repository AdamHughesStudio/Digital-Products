# Cowork prompt: put the Secret Santa app live on Vercel

Paste everything below the line into Cowork.

---

Please deploy our family Secret Santa web app to Vercel using my browser, where I'm already signed in to Vercel and GitHub.

**What it is:** one static HTML page with no build step. It lives in the `secret-santa` folder of the GitHub repo `adamhughesstudio/digital-products`, on the branch `claude/cool-davinci-fl9vml`. The database is already set up on Supabase, so there are no environment variables to add.

**Steps**

1. Go to vercel.com and make sure the team selected at the top left is "Adam Hughes Studio's projects".
2. Click **Add New > Project** and import the `digital-products` repository.
3. On the configure screen, set:
   - Project name: `family-secret-santa`
   - Framework preset: **Other**
   - Root Directory: click **Edit** and choose `secret-santa`
   - Leave the build command, output directory and install command empty, and add no environment variables.
4. Click **Deploy**. The first deploy builds the repo's default branch, which doesn't contain the `secret-santa` folder yet, so it may fail or show a 404. That's expected; carry on.
5. In the new project, open **Settings > Environments > Production** (on older layouts it's **Settings > Git > Production Branch**) and change the production branch to `claude/cool-davinci-fl9vml`. Save.
6. Go to **Deployments**, click **Create Deployment** (or the "..." menu on the latest deployment, then **Redeploy**), choose the branch `claude/cool-davinci-fl9vml`, and deploy to Production. Wait until the status says **Ready**.
7. Open **Settings > Deployment Protection** and make sure **Vercel Authentication** is turned **off** for production. Family members don't have Vercel accounts, so if it's on they'll hit a login screen. Save if you changed it.

**Check it works**

8. Open the production address (it should be something like `family-secret-santa.vercel.app`) in a private or incognito window so you're not signed in to Vercel.
9. You should see a page headed "Secret Santa" with two cards: "Got a code from the organiser?" and "Organising this year?". If you see a Vercel login page, a 404 or a blank page, go back and check steps 3, 6 and 7.
10. Don't create a test group. The database is live and I'll set the real group up myself.

**Rules**

- Don't change any other Vercel project, and don't change any settings on the GitHub repo.
- Don't buy a domain or upgrade any plan. If anything asks for payment, stop and tell me.
- If a step doesn't match what you see on screen, describe what you see and ask me before guessing.

**When you're done, tell me:**
- the production URL
- whether the check in step 9 passed
- anything you had to do differently from these steps
