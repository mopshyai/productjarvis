# Open in Jarvis (from Jira or Linear)

Use this flow to open ProductJarvis with an issue or ticket context pre-filled so you don’t start from a blank slate.

---

## How it works

1. In Jira or Linear, copy the issue **title** (and optionally the **description**).
2. Open Jarvis and go to the Command Bar. Use one of the options below so the command bar is pre-filled.
3. Adjust the text if needed and run the command (e.g. generate PRD + tickets).

---

## Option 1: Direct link (manual)

Replace `YOUR_APP_URL`, `TITLE`, and optionally `BODY` with your app URL and the issue text (URL-encoded).

**Pattern:**

```
YOUR_APP_URL/workspace/command?source=jira&title=TITLE&body=BODY
```

Example (after encoding):

```
https://app.productjarvis.com/workspace/command?source=jira&title=Add%20two-way%20Notion%20sync&body=As%20a%20user%20I%20want%20...
```

Use your actual ProductJarvis origin (e.g. `https://app.productjarvis.com` or your Vite dev URL). You must be signed in; otherwise you’ll be sent to auth first.

---

## Option 2: Bookmarklet (quick open)

Create a bookmark with the following as the URL. When you click it, you’ll be prompted for title and body (or just title), then sent to Jarvis with the command bar pre-filled.

```javascript
javascript:(function(){
  var t=prompt('Issue title (paste from Jira/Linear):');
  if(!t) return;
  var b=prompt('Issue description (optional):','');
  var base='https://app.productjarvis.com';
  var q='?source=jira&title='+encodeURIComponent(t);
  if(b) q+='&body='+encodeURIComponent(b);
  window.open(base+'/workspace/command'+q,'_blank');
})();
```

Replace `https://app.productjarvis.com` with your actual app URL if different. For Linear, you can change `source=jira` to `source=linear` in the bookmarklet if you want the “Opened from Linear” hint.

---

## Query parameters

| Param   | Required | Description |
|--------|----------|-------------|
| `source` | No   | `jira` or `linear`. Used for the “Opened from …” hint. |
| `title`  | Yes* | Pre-fills the command bar. URL-encode the issue title. |
| `body`   | No   | Optional description; can be appended to the pre-fill. URL-encode. |

\* If only `body` is present, it can be used as the pre-fill (implementation may use `title` or `body` for the initial value).
