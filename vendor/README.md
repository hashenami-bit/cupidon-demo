# Third-party code served from our own site

`firebase-10.12.2/` = Firebase web SDK 10.12.2 (app, auth, firestore), downloaded 2026-10-18 from
https://www.gstatic.com/firebasejs/10.12.2/ (Google's official copy). Only his pages load it (her page never does).

Two changes from Google's files, nothing else:
- `firebase-auth.js` and `firebase-firestore.js` import `./firebase-app.js` instead of the gstatic address
- the `//# sourceMappingURL=` lines (debug files we don't host) are removed

SHA-256 of Google's original files (to check a fresh download is the same):
- firebase-app.js       08b83f02859328aabb9acea9370d600ffe739d9e2c251b6668b6f6ff56a2e1d1
- firebase-auth.js      9b2ebba6ffced4657e12300f4187d53c8fc1762e98188e5e2005407a86e926b6
- firebase-firestore.js aecb2b5b722d1a45426326cd144bc025d5bea8c48f3a53eca3914ad587361bd4

Updating (Dependabot can't do this): download the three files of the new version into a NEW folder
`firebase-<version>/`, make the same two changes, change `SDK` in `public/js/store.js`, test sign-in, letter list
and delete in the browser, then remove the old folder. Also open the live home page with Chrome Inspect → Issues:
there must be no "document.cookie" warning (store.js sets an empty `__FIREBASE_DEFAULTS__` so Firebase skips the cookie;
the tests run in demo mode and can't see this).

`qrcode-generator-2.0.4/qrcode.js` = QR Code Generator 2.0.4 by Kazuhiko Arase (MIT licence, see the top of the file),
the file `dist/qrcode.mjs` of the npm package `qrcode-generator@2.0.4`, downloaded 2026-11-14. Content unchanged; only
renamed to `.js` (serve.mjs and hosts serve `.js` as JavaScript; an unknown `.mjs` type would stop the module loading).
Used only by his "sealed" screen (`public/js/qr.js` draws it on a canvas); it makes no network calls and touches no page.
SHA-256: ea91d7118a5395289170da848b7c6758b996163bfbccf312591ab65a4911b7c0
Updating: `npm pack qrcode-generator@<version>` in an empty folder, copy `dist/qrcode.mjs` as `qrcode.js` into a NEW folder
`qrcode-generator-<version>/`, change the import in `public/js/qr.js`, check the QR still scans, remove the old folder.
