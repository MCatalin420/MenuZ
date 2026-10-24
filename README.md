# MenuZ

A restaurant menu platform built with Angular, a Node.js / Express API, and Firebase Authentication + Cloud Firestore. One stable restaurant URL powers its downloadable QR code.

## Run locally

Requires Node.js 20.11+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:4200. The API runs on localhost:3001. Demo mode starts automatically with Olive & Thyme and persists edits to the ignored `data/demo.json` file. It is a shared local demo identity, not authenticated multiuser hosting. The public sample menu is http://localhost:4200/m/olive-and-thyme. QR codes encode the current browser origin; localhost codes are usable only on the same device. Use your deployed HTTPS origin for printed codes.

## Firebase setup

1. Create a Firebase project, enable email/password Authentication, and create Cloud Firestore.
2. Copy `.env.example` to `.env`. Set `APP_MODE=firebase`, `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, and `FIREBASE_AUTH_DOMAIN` using your Firebase web app configuration.
3. Configure Application Default Credentials, or set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON file outside the repository. Never put Admin credentials in frontend code.
4. Deploy `firestore.rules` using your Firebase project tooling. The browser has no direct Firestore access; all menu access goes through the API.
5. Restart `npm run dev`, create an owner account, edit the restaurant settings, and publish the menu. Each owner gets one restaurant with a stable generated ID. Different owner accounts get separate restaurants.

The server verifies Firebase ID tokens (including revocation) and checks restaurant ownership on every save and image upload. Unpublished menus return 404 publicly; unavailable dishes and owner IDs are omitted from the public response. Firestore provides persistent menu storage.

## Dish photo uploads

1. In Firebase Console → Storage, create a bucket if one does not exist. Copy its exact name (without `gs://`) into `FIREBASE_STORAGE_BUCKET` in the root `.env`. Existing buckets may end in `.appspot.com`; newer buckets typically end in `.firebasestorage.app`.
2. For local development, ensure the Admin service account has object write access to this bucket. The deployed function's runtime service account also needs object write access (for example, Storage Object Creator on this bucket).
3. Run `npm run deploy` to publish the API, frontend, and deny-direct-client-access Storage rules. Deployment preparation copies the bucket name into `MENUZ_STORAGE_BUCKET`. Without a configured bucket, Firebase uploads return an explanatory error; other menu features still work.
4. In a dish editor, choose a JPEG, PNG, or WebP file. The preview is local; the original is sent to the API only when you add/update the dish. Save the menu changes afterward to publish the photo reference.

The authenticated upload endpoint is `POST /api/owner/restaurants/:id/images` with a binary `application/octet-stream` body. The server verifies restaurant ownership, limits input to 10 MiB and 25 megapixels, rejects non-photo formats and animated/multipage images, applies EXIF orientation, and resizes to fit within 1200 × 1200 without cropping, stretching, or enlarging. Sharp writes WebP at quality 80 and strips metadata. Only processed WebP bytes are uploaded to Storage; originals stay in request memory and are never stored in the bucket.

Photos use immutable object names under `restaurants/<restaurant-id>/` and cacheable download-token URLs. These URLs are publicly readable by anyone who has the URL, including after a menu is unpublished. Storage rules deny direct SDK reads/writes; Admin uploads bypass rules. In local demo mode, the same processing pipeline saves photos to ignored `data/uploads` instead of Firebase.

To bound memory, each instance processes one photo at a time; concurrent transformations receive a retryable 429 response. Functions use 512 MiB, HTTP concurrency 8, and at most five instances. Original upload traffic and image processing can still incur compute/network costs. Automatic deletion of replaced, removed, or uncommitted processed images is not implemented; these objects remain in Storage until deleted. Do not apply a blanket age-based deletion policy to referenced menu photos.

## Architecture

```text
shared/menu.ts                       Domain data contracts
server/domain/repository.ts          Repository port
server/application/menu-service.ts   Framework-independent use cases
server/infrastructure/repositories.ts Firestore and local JSON adapters
server/app.ts                        HTTP delivery, validation, authentication, composition
server/main.ts                       Local HTTP server entry point
functions/index.ts                   Firebase Cloud Functions entry point
src/app/menu.gateway.ts              HTTP / Firebase client adapter
src/app/app.component.*              Angular presentation
```

Dependencies point from infrastructure toward application and domain. The use cases depend on the repository interface, not Express or Firebase. Public menu URLs use `/m/:restaurantId`; the owner workspace is `/`.

## Verification

```sh
npm run check
npm test
npm run build
```

The tests cover ownership, publication visibility, public field filtering, and owner provisioning. Build output is `dist/menuz/browser`.

## Deploy to Firebase

Angular is served by Firebase Hosting. Requests to `/api/**` are rewritten to the `api` Cloud Function in `europe-west1` (Node.js 22). Other routes fall back to Angular's `index.html`, including QR menu links.

1. Enable the Blaze billing plan for your Firebase project (Cloud Functions requires it), create the default Firestore database, and enable your Authentication providers.
2. Fill in `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, and `FIREBASE_AUTH_DOMAIN` in the root `.env` using your Firebase web app settings. Keep `FIREBASE_AUTH_DOMAIN` as the domain from that configuration.
3. Install the function dependencies and sign the CLI into the correct Google account:

```sh
npm install
npm install --prefix functions
npx firebase login
```

4. Deploy from the repository root:

```sh
npm run deploy
```

This prepares `.firebaserc` and an ignored `functions/.env.<project-id>` from the allowlisted public settings and Storage bucket name, builds both apps, and deploys the `menuz` Functions codebase, Hosting, Firestore rules, and Storage rules. The function always runs in Firebase mode and uses its managed service identity. No service-account JSON, root `.env`, or local demo data is included in the function source. Do not copy `GOOGLE_APPLICATION_CREDENTIALS` into Functions configuration.

5. Open the Hosting URL printed by the CLI. In Firebase Authentication → Settings → Authorized domains, ensure the deployed hostname (typically `<project-id>.web.app`) is allowed before testing Google sign-in. Also authorize any custom domain you use.
6. Sign in, publish your menu, and download the QR code from the deployed site. Existing restaurant IDs remain stable, but QR codes generated on localhost must be downloaded again for the deployed domain.

The CLI deploys the deny-direct-client-access Firestore rules in this repository; this is appropriate for a dedicated MenuZ project. Review existing rules before using a project shared with other applications. Cloud Functions has `maxInstances: 5`; usage can still incur charges on Blaze.

If deployment returns `403 Permission denied`, sign in with a Google account that has deployment access to the project using `npx firebase login`, then retry `npm run deploy`. The Admin service account used for local application access may not have Cloud Functions or Service Usage deployment permissions. The deploy script does not load that local service-account path into the CLI; it uses your CLI login. If your shell already sets `GOOGLE_APPLICATION_CREDENTIALS`, use a deployment shell without that variable when authenticating as your Google user.

To check function TypeScript locally: `npm run check:functions`. To build only the function: `npm run build:functions` (also checks types). Generated `functions/lib` is ignored by Git and rebuilt automatically before deployment.

## Other hosting providers

Host the Angular output with SPA fallback to `index.html`, route `/api/*` to the Node API on the same origin, and set `APP_MODE=firebase` and `NODE_ENV=production`. The development proxy is not used in production. Run the API with `npx tsx server/main.ts` (or compile it in your deployment pipeline); keep the API behind an HTTPS reverse proxy on the same host because it binds to loopback. Configure Firebase authorized domains for your deployed domain. Demo mode refuses to run in production. Set your final domain before printing QR codes and retain restaurant IDs when updating menus.

This initial version does not include billing, analytics, password recovery UI, or multiple restaurants per account. Add rate limiting and operational monitoring at your production gateway.
