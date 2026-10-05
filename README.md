# Yearly Budget Tracker: web version

The tracker as a website that runs entirely in each visitor's browser. Their figures never reach your server: they're saved where they choose on their first visit.

| Where it's saved | Works on | Notes |
|---|---|---|
| **A folder on this computer** | Chrome and Edge on Windows, Mac or Linux | `tracker-data.json` plus a `Backups` folder with a copy from each of the last 30 days. These are the same files as the Windows app, so both can use the same folder. |
| **Google Drive** | Every browser, phones included | The same file inside "Yearly Budget Tracker" in their Drive, with daily backups. A copy stays on the device, so the tracker opens offline and uploads once it's back online. |
| **Only in this browser** | Every browser | Saved in the browser's own storage, with copies from the last 14 days. Clearing browsing data deletes it, so the tracker reminds people to download a backup. |

Visitors can switch at any time in **Settings › Where your data is saved › Change where it's saved…**, and their data moves with them.

The site works offline after the first visit, and people can install it from the browser's address bar ("Install app"). On a phone, use "Add to Home Screen".

---

## Part 1: Put the site on GitHub Pages (free, about 10 minutes)

1. Create a free account at **github.com** if you don't have one.
2. Click **+ › New repository**. Name it, for example, `budget-tracker`, set it to **Public** (needed for free Pages), and click **Create repository**.
3. On the new repository's page, click **uploading an existing file**. Drag in **everything inside** the `yearly-budget-tracker-web` folder from the zip: `index.html`, `config.js`, `sw.js` and the folders `js`, `vendor`, `fonts`, `icons`, and so on. Don't drag the folder itself. Then click **Commit changes**.
   - The `.nojekyll` file is hidden on Windows and Mac. If it doesn't get uploaded, the site still works.
4. Go to **Settings › Pages**. Under *Build and deployment*, pick **Deploy from a branch**, then branch **main**, folder **/ (root)**, and click **Save**.
5. After a minute, the page shows the site's address, for example `https://yourname.github.io/budget-tracker/`. Open it and check it works. The folder and browser options work straight away; Google Drive comes in Part 3.

## Part 2: Your own domain

Google no longer sells domains; its domain business moved to Squarespace in 2023. Cloudflare, Porkbun and Namecheap are cheaper, at about 10–15 € a year for a `.com`. Any of them works.

1. Buy the domain, for example `mybudget.com`.
2. On GitHub: **Settings › Pages › Custom domain**. Type `www.mybudget.com` and click **Save**. GitHub adds a `CNAME` file to the repository; leave it there.
3. At the company you bought the domain from, open its DNS settings and add:
   - a **CNAME** record: name `www`, value `yourname.github.io`
   - four **A** records: name `@` (the bare domain), values `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`
   - On Cloudflare, set these records to **DNS only** (grey cloud), at least until HTTPS works.
4. Back on GitHub's Pages settings, wait for the DNS check to go green. That can take from a few minutes to a few hours. Then tick **Enforce HTTPS**.
5. Recommended: in your GitHub account (not the repository), go to **Settings › Pages › Add a domain** and verify it. This stops anyone else from pointing it at their own site.

The site must be on **https** for the folder option, offline mode and Google sign-in to work. GitHub provides this for free.

## Part 3: Turn on Google Drive (about 20 minutes, free)

You'll create a "sign-in client" that lets your site ask Google for access to a visitor's Drive.

1. Go to **console.cloud.google.com** and sign in. At the top, click the project picker, then **New project**. Name it `Budget Tracker` and click **Create**, then make sure it's selected.
2. **APIs & Services › Library**: search for **Google Drive API**, open it and click **Enable**.
3. **Google Auth Platform** (in older menus, *OAuth consent screen*) › **Get started**:
   - **App name:** `Yearly Budget Tracker`. **User support email:** your email.
   - **Audience:** **External**.
   - **Contact information:** your email. Accept the policy and click **Create**.
4. **Branding** (same section):
   - Application home page: `https://www.mybudget.com`
   - Privacy policy: `https://www.mybudget.com/privacy.html` (the site already includes this page)
   - Authorised domains: `mybudget.com`
   - A logo is optional, but adding one means Google has to review it. Leave it out at first.
5. **Data access › Add or remove scopes**: tick `.../auth/drive.file` ("See, edit, create and delete only the specific Google Drive files you use with this app") and click **Update**, then **Save**. That's the only permission the site uses.
6. **Clients › Create client**:
   - Application type: **Web application**. Name: `Website`.
   - **Authorised JavaScript origins:** add `https://www.mybudget.com`, and `https://mybudget.com` if people might use the bare domain. To test on GitHub's own address first, also add `https://yourname.github.io`.
   - Leave **Authorised redirect URIs** empty, then click **Create**.
   - Copy the **Client ID**. It looks like `1234567890-abc123.apps.googleusercontent.com`.
7. On GitHub, open `config.js` in your repository, click the pencil icon and paste the ID between the quotes:
   ```js
   googleClientId: '1234567890-abc123.apps.googleusercontent.com',
   ```
   Then click **Commit changes**. Within a minute or two, the Google Drive option turns on for everyone.
8. **Testing and publishing:**
   - While the app's *Publishing status* is **Testing**, only people listed under **Audience › Test users** can sign in (up to 100). Add your own Gmail address there and try it.
   - When you're happy, go to **Audience › Publish app**. Because the site only uses `drive.file`, Google doesn't need a security review. If you added a logo or want the app name shown on the consent screen, Google will ask you to verify the domain. Do that in Google Search Console by adding a TXT record at your DNS provider. It usually takes a few days.
   - Until then, people outside your test list see a "Google hasn't verified this app" warning, or can't sign in.

**How Drive behaves for visitors:**
- **Signing in:** Google gives a site without its own server about an hour of access at a time. When the tracker opens, it loads straight away from the copy on the device and shows **"Connect Google Drive"** at the bottom. One click (usually without typing anything) brings it up to date.
- **Saving:** changes are saved on the device immediately and go to Drive a couple of seconds later.
- **Changes on two devices:** if the Drive file was changed on another device after this one last synced, the tracker asks which version to keep. It keeps the other one as a backup in Drive's `Backups` folder, so nothing is lost.

## AI for reading statements (nothing to set up on your side)

The **Do it with AI** and **Read statements with AI** buttons work on the website too. The first time someone uses them, the tracker asks which AI to use:

| Option | What they need | Cost |
|---|---|---|
| **Claude** | An Anthropic API key from console.anthropic.com › API keys | Pay per use, usually a few cents per statement |
| **ChatGPT** | An OpenAI API key from platform.openai.com › API keys | Pay per use. A ChatGPT Plus subscription doesn't include API use. |
| **Gemini** | A Google AI Studio key from aistudio.google.com › Get API key | Has a free tier, but on it Google may use what's sent to improve its products. A paid key is better for bank statements. |
| **Copy and paste** | Nothing | Free. The tracker shows the request, they paste it into ChatGPT (a Plus account works), Claude or Gemini, then paste the answer back. Scanned pages and photos can't go this way. |

How it works:
- **Checking the key:** the tracker checks the key and asks the service which models it offers. It picks a sensible default, which can be changed in **Settings › Reading statements with AI**.
- **Where things go:** the key is kept only in that browser (or only until the tab closes, if they untick "Remember"). Statements go straight from the browser to the service they chose, never through your site.
- **Checking the answer:** every answer goes through the same checks and review screen as on the Claude website before anything is saved.

About "Sign in with ChatGPT": OpenAI announced it at DevDay (29 September 2026) for 16 approved partner apps only. Your site can't use it yet. If OpenAI opens it to all developers, it could be added as another option.

## Part 4: Updating the site later

Build a new version and upload the changed files to the repository the same way, letting them replace the old ones. Your `config.js` with the Client ID is kept as it is. Visitors get the new version the next time they open the site while online.

Data files keep the same format as the Windows app, and new versions can always read older files.

## What's in the folder

| File | What it is |
|---|---|
| `index.html` | The tracker |
| `config.js` | Your settings (the Google Client ID) |
| `js/web-shim.js` | Saving: folder, Google Drive or browser |
| `js/web-ai.js` | Reading statements with Claude, ChatGPT or Gemini (the visitor's own key), or copy and paste |
| `js/web-boot.js`, `sw.js` | Offline support |
| `vendor/` | The Excel and PDF readers, served by the site itself |
| `fonts/`, `icons/`, `manifest.webmanifest` | Fonts, app icons, install details |
| `privacy.html` | Privacy page, in English and Spanish |

The page only allows scripts from your own site plus Google's sign-in script. It can only send data to Google Drive and, when a visitor uses their own key, to Anthropic, OpenAI or Google's Gemini API. The browser enforces this, so even a mistake in the code couldn't send figures anywhere else.
