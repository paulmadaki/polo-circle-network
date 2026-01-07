// js/admin-login.js
const SUPABASE_URL = "https://sjfkavspjaajyymmfjic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmthdnNwamFhanl5bW1mamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTk4NjksImV4cCI6MjA4MDM3NTg2OX0.kYSG-UNeZV7hwB1ozbQwKNCcGs68FUO1PUrigrUFAkA";
const WORKER_BASE = "https://floral-bar-7a5c.passproduction16.workers.dev";
const supabaseClient =
  window.__supabaseClient__ ||
  (window.__supabaseClient__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

function showLoading(on) {
  const ov = document.getElementById('loadingOverlay');
  if (!ov) return;
  if (on) { ov.classList.remove('hidden'); ov.style.display = 'flex'; }
  else { ov.classList.add('hidden'); ov.style.display = 'none'; }
}

document.getElementById('signinBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('error');
  errEl.classList.add('hidden'); errEl.textContent = '';

  if (!email || !password) {
    errEl.textContent = 'Please provide both email and password.';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    showLoading(true);
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      console.error('Sign-in error', error);
      errEl.textContent = (error && error.message) ? error.message : 'Sign-in failed';
      errEl.classList.remove('hidden');
      return;
    }

    // We sign in successfully; now verify admin status via the worker
    const token = data.session.access_token;
    const res = await fetch(`${WORKER_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      console.error('/api/me error', res.status, txt);
      errEl.textContent = 'Failed to verify admin status. Please try again.';
      errEl.classList.remove('hidden');
      return;
    }

    const j = await res.json();
    const user = j.app_user;
    if (!user || !user.is_admin) {
      errEl.textContent = 'Your account is not an admin. Request admin access.';
      errEl.classList.remove('hidden');
      return;
    }

    // All good — redirect to admin panel
    window.location.href = 'admin.html';

  } catch (err) {
    console.error(err);
    const errEl = document.getElementById('error');
    errEl.textContent = err.message || 'Unexpected error';
    errEl.classList.remove('hidden');
  } finally {
    showLoading(false);
  }
});
