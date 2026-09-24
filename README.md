# The Teen Take: how to put it live and update it weekly

This folder is the whole blog. Cloudflare builds and hosts it for free. Each week you add one text file and the site updates itself, including the Library page.

What's inside:
- `content/posts/`: one file per article (Markdown). **This is the only folder you touch each week.**
- `content/upcoming.json`: the "Coming up" list.
- `content/site.json`: blog name, the "Currently…" card, the sticky note, and the site address.
- `functions/` and `lib/`: comments and reactions (runs on Cloudflare).
- `schema.sql`: sets up the comments database (run once).
- `static/`: styles and scripts. `build.js` turns everything into the website.

---

## Part 1: One-time setup (about 20 minutes)

### 1. Put the folder on GitHub (free)
1. Sign in at github.com and click **New repository**. Name it `the-teen-take`, choose **Private**, and click **Create repository**.
2. On the new page, click **uploading an existing file**. Drag in everything inside this folder (not the folder itself) and click **Commit changes**.

### 2. Connect it to Cloudflare Pages (free)
1. Sign in at dash.cloudflare.com and open **Workers & Pages**, then **Create**.
2. Choose the **Pages** tab, then **Connect to Git**. If you only see Workers, click the "Looking to deploy Pages?" link.
3. Pick the `the-teen-take` repository.
4. Enter these build settings:
   - Framework preset: **None**
   - Build command: `node build.js`
   - Build output directory: `dist`
5. Click **Save and Deploy**. After about a minute the site is live at `https://the-teen-take.pages.dev`. If that name is taken, Cloudflare gives you a slightly different one.

### 3. Create the comments database (free)
1. In Cloudflare, go to **Storage & Databases**, then **D1**, then **Create database**. Name it `teen-take-db`.
2. Open the database and click the **Console** tab. Paste in everything from `schema.sql` and click **Execute**.

### 4. Connect the database and set a moderation password
1. Go to **Workers & Pages**, open **the-teen-take**, and click **Settings**, then **Bindings**, then **Add**, then **D1 database**.
   - Variable name: `DB`
   - Database: `teen-take-db`
   - Save.
2. Go to **Settings**, then **Variables and Secrets**, then **Add**. Add two **Secrets**:
   - `ADMIN_TOKEN`: your moderation password. Make it long and don't share it.
   - `SALT`: any random words, such as `purple-toaster-river-42`.
3. Go to **Deployments**, open the menu on the latest one, and click **Retry deployment**. The settings only apply to a new deploy.

### 5. Fix the site address
If Cloudflare gave you an address other than `the-teen-take.pages.dev`, edit `content/site.json` on GitHub and change the `"url"` line to match. The share links use it.

### 6. Test it
- Open a post, tap a reaction, and leave a test comment.
- Go to `/admin/` on your site, for example `https://the-teen-take.pages.dev/admin/`. Enter your password and approve the comment. It now shows on the post.

**Optional:** in Cloudflare, **Custom domains** lets you use a real name such as `theteentake.com`. You buy it once a year through Cloudflare.

---

## Part 2: Every week (5 minutes)

### Publish a new article
1. On GitHub, open `content/posts/` and click **Add file**, then **Create new file**.
2. Name it with the date and a few words, such as `2026-09-28-why-i-started-this-blog.md`.
3. Copy everything from `_TEMPLATE.md`, paste it in, and fill it in:
   ```
   ---
   title: Why I'm Starting This Blog
   date: 2026-09-28
   category: Personal
   dek: One sentence that makes people want to read it.
   tags: writing, goals, grade 8
   takeaways: Point one | Point two | Point three
   note: optional little handwritten note
   ---

   ## A subheading

   A paragraph. Leave an empty line between paragraphs.

   > A big pull quote.
   ```
   Suggested categories: Brand Watch, Opinion, Reviews, Copy Lab, Research, Personal.
   Formatting: `**bold**`, `*italic*`, `[link text](https://…)`, `- bullet`.
4. Click **Commit changes**. About a minute later the post is live. It appears on the home page as "Latest post" and in the Library.

### Other weekly touches
- **Coming up list:** edit `content/upcoming.json`. Items dated after the latest post show automatically.
- **"Currently…" card:** edit `content/site.json`.
- **Comments:** check `/admin/` and approve or delete. Nothing appears on the site until approved.

**Fixing a typo:** open the post file on GitHub, click the pencil icon, edit, and commit.
**Taking a post down:** rename the file so it starts with `_` (for example `_2026-09-28-….md`) or delete it.

If a build fails, Cloudflare's **Deployments** page shows why. The message names the file and what's missing, such as `date must look like 2026-09-28`. The old version stays live until the fix goes in.

---

## Safety settings already built in
- **Comments:** every comment waits for your approval. Links in comments are blocked, bots are filtered, and each visitor can post at most 3 comments per 10 minutes.
- **Personal data:** no emails or accounts are collected. Readers give an optional first name only. IP addresses aren't stored, only a scrambled code used to stop double-votes and spam.
- **Admin page:** hidden from search engines.
- **Writer privacy:** the blog shows no full name, school, town or photos. Keep it that way.
- **Friends-and-family only:** in Cloudflare, go to **Zero Trust**, then **Access**, and add an application for your site that allows only listed email addresses. It's free for up to 50 people.
