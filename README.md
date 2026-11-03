# Super Extended

A copy of the Standard Notes **Super** editor, packaged as a custom editor plugin so you can change and extend it.

- Source: [standardnotes/app](https://github.com/standardnotes/app) at commit `f64d5a4` (web app 3.203.0), Lexical 0.49.0.
- The editor code is the upstream code, copied to the same relative paths. Only the parts that need the Standard Notes app internals were replaced (listed below).
- Notes are saved in the same Lexical JSON format as built-in Super notes, so you can switch a note between Super and this plugin.

## Install

In Standard Notes open **Preferences → Plugins → Install Custom Plugin**, paste

```
https://sinpai.github.io/sn-super-extended/ext.json
```

press **Install**, then confirm. To use it on a note: note options → **Change note type** → **Super Extended**.

The site is rebuilt and redeployed by GitHub Actions on every push to `main` (`.github/workflows/deploy.yml`).

## Quick start

```sh
npm install
npm run dev
```

| URL | What it is |
| --- | --- |
| http://localhost:5173/ | Standalone mode. The note is kept in the browser's localStorage. Fastest loop for UI work. |
| http://localhost:5173/dev/host.html | The plugin embedded the way Standard Notes embeds it: same iframe sandbox, same message protocol. Buttons simulate "Prevent editing", edits from another device, renaming, switching notes, Markdown notes and a dark theme. |
| http://localhost:5173/ext.json | Plugin manifest for installing the dev server into Standard Notes. |

Other scripts: `npm run typecheck`, `npm run build`, `npm run preview` (serves `dist/` on port 4173; open `dev/host.html?plugin=http://localhost:4173/` to test the production build in the harness).

## Hosting

### GitHub Pages (this repo)

`.github/workflows/deploy.yml` runs `npm ci` and `npm run build` with `PLUGIN_URL` set to the Pages URL, then publishes `dist/` (including `ext.json`) to https://sinpai.github.io/sn-super-extended/. Pages must be set to **Source: GitHub Actions** (Settings → Pages). A fork gets its own URL automatically.

Updating: push to `main`. Standard Notes loads `index.html` from the same URL each time a note opens, so code changes take effect without reinstalling (reload the app if it cached the old version). Manifest fields such as the name are stored when you install, so changing those needs a reinstall.

### Other hosts

1. Build with the public URL where `dist/` will be served:
   ```sh
   PLUGIN_URL=https://example.com/sn-super-extended/ npm run build
   ```
   This writes `dist/ext.json` pointing at `dist/index.html`. Asset paths are relative, so any sub-path works.
2. Upload the contents of `dist/` to any static HTTPS host (Netlify, Cloudflare Pages, your own server).
3. Install `https://example.com/sn-super-extended/ext.json` in Standard Notes.

Requirements: HTTPS, and `ext.json` must be served with an `Access-Control-Allow-Origin` header (GitHub Pages does this by default). Standard Notes refuses plugin URLs that contain a built-in identifier (anything like `org.standardnotes.…`).

### From your machine (development)

Use `http://localhost:5173/ext.json` while `npm run dev` is running. This works in the desktop app. Browsers may refuse to let the hosted web app (app.standardnotes.com, an HTTPS public site) load a `http://localhost` iframe, because of mixed-content and local-network-access rules. If the editor stays blank in a browser, use the desktop app or the hosted build.

## Plugin identity

`src/plugin/config.ts` holds `identifier` (`com.sn-super-extended.editor`) and `name`. Every note that uses the editor stores the identifier, so pick a final value before you use it for real notes. Changing it later makes those notes open in the plain text editor.

## Switching notes between Super and this plugin

- **Super → Super Extended:** Standard Notes shows its converter. Because the manifest declares `file_type: "json"`, the content is kept unchanged.
- **Super Extended → Super:** in the import dialog, choose **Convert As-Is**. The default **Convert** button treats the JSON as HTML.
- **Plain text / Markdown → Super Extended:** the text is imported (Markdown, or HTML if it looks like HTML) when the note opens. The original text stays until you edit the note; then it is saved as Super JSON.
- If a note contains Super JSON this build can't parse (for example, blocks added in a newer Super), the plugin shows a message and doesn't edit it, so nothing is overwritten.

`note_type` in the manifest is `"unknown"` on purpose. Standard Notes always opens notes with type `"super"` in its built-in editor.

## What's the same, what's different

Unchanged from Super: the toolbar, the `/` block menu, Markdown shortcuts, headings, lists and checklists, quotes, code blocks with highlighting, tables (with cell menu), collapsible sections, dividers, password generator, date/time, images from URL, drag handles, search & replace (Cmd/Ctrl+F), Markdown preview (Cmd/Ctrl+Shift+M), read-only mode when "Prevent editing" is on, and Standard Notes themes.

Different, because a plugin runs in a sandboxed iframe and only sees the note it edits:

| Built-in Super | Super Extended |
| --- | --- |
| Uploading, pasting or dropping a file creates an encrypted Standard Notes file | The file is embedded in the note (base64 `InlineFileNode`, which Super also supports). Files over 2 MB ask for confirmation. |
| Embedded encrypted files and `@`-linked note/tag bubbles render the item | Shown as placeholders. The nodes are preserved and render again in built-in Super. |
| `@` linking, "Create new note from selection", "Save to Files" | Not available (they need the app's item database). |
| Font size / line height follow app preferences | Plugin defaults (Normal). Plugin settings are stored in the plugin's component data, see `usePluginSetting`. |
| Note menu → Export converts to Markdown/HTML/PDF | The app exports the raw JSON for plugin notes. `HeadlessSuperConverter` (including PDF) is bundled if you want to add export to the toolbar. |

## Project layout

```
src/
  main.tsx               Entry point. Picks the Standard Notes bridge (in an iframe) or standalone mode.
  plugin/                Plugin-only code
    host/RelayHost.ts      Bridge to Standard Notes (@standardnotes/component-relay): load, save, lock state
    PluginNoteController.ts  Same member names as upstream NoteViewController
    PluginApplication.ts     The slice of upstream WebApplication the editor uses (platform, keyboard, settings)
    PluginRoot.tsx           Loads the note, imports non-Super text, renders SuperEditor
    config.ts                Identifier, name, limits
  web/javascripts/       Copied from packages/web/src/javascripts (same paths; `@/` points here)
  web/stylesheets/       Copied from packages/web/src/stylesheets
  packages/              Copied subsets of other monorepo packages (icons, ui-services keyboard, ...)
  compat/                Small stand-ins for the @standardnotes/* package entry points
  extensions/            Your own features (e.g. TaskStatus). `@extensions/` points here.
dev/                     Dev host harness (dev/host.html)
upstream/manifest.json   Every tracked upstream file with the hash it was last synced from
scripts/upstream.mjs     status / sync / add / diff against an upstream checkout
```

### Overrides and patches

Upstream files replaced by plugin versions (same path, same exports, header comment explains why):

- `Components/SuperEditor/SuperEditor.tsx`: relay-backed load/save instead of NoteViewController
- `Components/SuperEditor/Plugins/EncryptedFilePlugin/FilePlugin.tsx`: uploads become inline embeds
- `…/EncryptedFilePlugin/Nodes/FileComponent.tsx` and `…/ItemBubblePlugin/Nodes/BubbleComponent.tsx`: placeholders
- `Components/ApplicationProvider.tsx`, `Components/KeyboardServiceProvider.tsx`, `Hooks/usePreference.tsx`, `NativeMobileWeb/useAndroidBackHandler.tsx`

Small patches inside otherwise upstream files are marked with `[sn-super-extended]` (`grep -rn "\[sn-super-extended\]" src`): hidden "Save to Files" buttons (InlineFileComponent, RemoteImageComponent), removed "Create note from selection" toolbar button (ToolbarPlugin), clipboard fallback (copyTextToClipboard), and the Task Status registration (AllNodes, BlockPickerPlugin, ToolbarPlugin).

## Custom blocks in this fork

### Task Status

Three checkbox-style buttons at the start of a line: **To do** (blue), **In progress** (orange), **Done** (green). The selected one is filled with its color and the other two are gray. Click any box to switch.

- Insert it with `/task` in the block menu, or toolbar block-type menu → **Task Status**. It applies to the current line, or to every selected line.
- Enter on a task line starts a new task line (status To do). Enter on an empty task line ends the list. Backspace right after the boxes turns the line back into normal text.
- Works in paragraphs, headings, quotes, list items and table cells. Respects "Prevent editing". Status changes are undoable.
- Stored in the note as `{ "type": "task-status", "status": "todo" | "in-progress" | "done" }`. Markdown export and plain-text copy write `[ ]`, `[/]` and `[x]`.
- Code: `src/extensions/TaskStatus/`. Labels, colors and markers are in `TaskStatuses.ts`; the box look is in `TaskStatus.scss`.
- Registered via `[sn-super-extended]` lines in `Lexical/Nodes/AllNodes.ts`, `BlockPickerPlugin.tsx`, `ToolbarPlugin.tsx` and `SuperEditor.tsx`.

**Compatibility:** built-in Super doesn't know this node type, so a note that contains a task status won't open in the built-in Super editor. Keep using Super Extended for those notes. The note itself isn't changed or lost; it opens normally here again.

## Extending

- **New block** (slash menu / insert menu): follow `src/web/javascripts/Components/SuperEditor/Plugins/Blocks/*.tsx`, then add it to `BlockPickerPlugin/BlockPickerPlugin.tsx` and/or the insert menu in `ToolbarPlugin/ToolbarPlugin.tsx`.
- **New editor behavior** (Lexical plugin): mount it inside `<BlocksEditor>` in `SuperEditor.tsx`, or in `BlocksEditor.tsx` next to the upstream plugins.
- **New node type**: register it in `Lexical/Nodes/AllNodes.ts`. Built-in Super can't open notes that contain node types it doesn't know, so notes using your custom nodes only work in this plugin. Keep `getType()` stable once notes use it.
- **Settings**: `const [value, setValue] = usePluginSetting('key')` (add the key to `PluginSettings` in `src/plugin/PluginPreferences.ts`). Values sync with the plugin item across devices.
- **More access to Standard Notes** (other notes, tags): the component relay supports `streamItems` and creating items, but each needs a permission the user approves. Start in `src/plugin/host/RelayHost.ts`.

## Updating from upstream

```sh
git clone --depth 1 https://github.com/standardnotes/app ../sn-app
npm run upstream:status -- ../sn-app     # what changed upstream vs. locally
npm run upstream:sync -- ../sn-app       # update files you haven't modified
node scripts/upstream.mjs diff ../sn-app packages/web/src/javascripts/Components/SuperEditor/SuperEditor.tsx
node scripts/upstream.mjs add ../sn-app packages/web/src/javascripts/<new/file.tsx>   # start tracking a file
```

`sync` updates files you haven't touched, keeps your changes, and writes conflicting upstream versions to `upstream/conflicts/` for manual merging. For overridden files it only reports that upstream changed. Afterwards, align the Lexical versions in `package.json` with upstream `packages/web/package.json`, then run `npm run typecheck && npm run build`.

## License

AGPL-3.0, the same as Standard Notes, from which this is derived (see `LICENSE`). If you let other people use a hosted copy, the AGPL requires offering them the source code.
