# Static Login Feature — Design Spec

## Overview
Add a static (hardcoded) login gate to the Catat Harga SPA. Single user credentials stored in `app.js`. Session persisted via `localStorage`.

## Approach
Login as a **view** using the existing `navigate()` pattern. On init, check `localStorage.auth`. If absent, show login view. After successful login, redirect to entry list. Logout clears state and returns to login.

## Changes

### index.html
- New `<section id="view-login" class="view">` before existing views
  - Centered card layout with app title, username input, password input, submit button, error message area
- Header adjustments:
  - Hide nav buttons (Entry/Toko) on login view
  - Add logout button in header (visible only when logged in)

### app.js
- Add `STATIC_USER` constant: `{ username, password }`
- `DOMContentLoaded` init: check `localStorage.auth` → if absent, `navigate('login'); return;`
- Login form handler: validate against `STATIC_USER`, on success set `localStorage.auth = 'true'`, navigate to entry-list
- Logout function: `localStorage.removeItem('auth')`, navigate to login
- Update `navigate()`: hide/show header elements based on view

### Security
- Client-side gate only. No server-side protection.
- `localStorage` is accessible via browser DevTools — this is accepted as "static login."
- Credentials are plaintext in `app.js`.

## Success Criteria
1. App starts at login screen when no session exists
2. Correct credentials → redirect to entry list
3. Wrong credentials → error message, stay on login
4. After refresh with session → directly to entry list (no login prompt)
5. Logout button works → returns to login screen, cleared session
6. Existing CRUD functionality unchanged
