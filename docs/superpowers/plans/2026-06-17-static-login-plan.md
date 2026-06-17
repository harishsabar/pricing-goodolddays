# Static Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static login gate with hardcoded credentials to the Catat Harga SPA.

**Architecture:** Login is implemented as a new view in the existing `navigate()` system. Session state stored in `localStorage`. On init, check for session — if absent, show login view; if present, show entry list.

**Tech Stack:** Vanilla JS, Tailwind CSS (CDN), Supabase JS SDK

## Global Constraints

- Credentials hardcoded as `STATIC_USER` constant in `app.js`
- Session key in `localStorage`: `auth`
- Login view ID: `view-login`
- Follow existing code patterns (inline event handlers, `navigate()`, view sections)

---

### Task 1: Add Login View HTML & Update Header

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: N/A
- Produces: `<section id="view-login">` with form fields `#login-username`, `#login-password`, `#login-error`, form ID `#login-form`
- Produces: `<button id="btn-logout">` in header

- [ ] **Step 1: Add login view section after `<body>` and before header**

Insert the login view as the first `.view` section after `<div id="app">`:

```html
<!-- VIEW: Login -->
<section id="view-login" class="view">
  <div class="min-h-[80vh] flex items-center justify-center">
    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 w-full max-w-sm">
      <h1 class="text-xl font-bold text-gray-800 text-center mb-1">Catat Harga</h1>
      <p class="text-sm text-gray-500 text-center mb-5">Masuk untuk melanjutkan</p>
      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input type="text" id="login-username" required class="w-full border rounded-lg px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" id="login-password" required class="w-full border rounded-lg px-3 py-2 text-sm">
        </div>
        <p id="login-error" class="text-red-500 text-sm hidden"></p>
        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Masuk</button>
      </form>
    </div>
  </div>
</section>
```

Add this right after `<div class="max-w-lg mx-auto px-4 py-4" id="app">` and before the header.

- [ ] **Step 2: Update header with logout button**

Change the header to:

```html
<header class="flex items-center justify-between mb-4">
  <h1 class="text-xl font-bold text-gray-800">Catat Harga</h1>
  <div class="flex items-center gap-2">
    <nav class="flex gap-2 text-sm" id="main-nav">
      <button onclick="navigate('entry-list')" class="text-blue-600 hover:underline" id="nav-entry">Entry</button>
      <button onclick="navigate('toko-list')" class="text-blue-600 hover:underline" id="nav-toko">Toko</button>
    </nav>
    <button id="btn-logout" onclick="logout()" class="text-red-500 text-sm hover:underline hidden">Keluar</button>
  </div>
</header>
```

- [ ] **Step 3: Verify the HTML structure is valid**

Open `index.html` in a browser — login view should render (though JS not wired yet), header should show nav and hidden logout button.

### Task 2: Add Login/Logout Logic in app.js

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `#view-login`, `#login-form`, `#login-username`, `#login-password`, `#login-error`, `#btn-logout`, `#main-nav` from Task 1
- Produces: `STATIC_USER` constant, `login()`, `logout()`, updated `DOMContentLoaded` handler

- [ ] **Step 1: Add STATIC_USER constant and login/logout functions**

Add after the Supabase config section (after line 5 in `app.js`):

```js
// === AUTH ===
const STATIC_USER = { username: 'admin', password: 'admin123' };

function login(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  if (username === STATIC_USER.username && password === STATIC_USER.password) {
    localStorage.setItem('auth', 'true');
    errorEl.classList.add('hidden');
    navigate('entry-list');
  } else {
    errorEl.textContent = 'Username atau password salah';
    errorEl.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('auth');
  navigate('login');
}
```

- [ ] **Step 2: Update navigate() to handle header visibility**

Find the `navigate` function (line 12-18). Update it to toggle header elements based on view:

```js
function navigate(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById('view-' + view).classList.remove('hidden');

  const isLogin = view === 'login';
  document.getElementById('main-nav').classList.toggle('hidden', isLogin);
  document.getElementById('btn-logout').classList.toggle('hidden', isLogin);

  if (view === 'entry-list') { loadEntries(); loadFilterOptions(); }
  if (view === 'toko-list') { loadTokoList(); }
  if (view === 'add-entry') { resetForm(); loadFormOptions(); }
}
```

- [ ] **Step 3: Wire login form submit and update DOMContentLoaded**

At the bottom of `app.js`, replace the existing init:

```js
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', login);

  if (localStorage.getItem('auth')) {
    navigate('entry-list');
  } else {
    navigate('login');
  }
});
```

- [ ] **Step 4: Verify by manually testing against success criteria**

Open `index.html` in browser:
1. Should show login screen (no nav, no app data)
2. Enter wrong creds → should see error message
3. Enter admin/admin123 → should redirect to entry list (nav & logout visible)
4. Refresh page → should stay on entry list (session persisted)
5. Click "Keluar" → should return to login screen, nav hidden
