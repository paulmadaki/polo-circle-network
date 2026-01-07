// login.js
const SUPABASE_URL = "https://sjfkavspjaajyymmfjic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmthdnNwamFhanl5bW1mamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTk4NjksImV4cCI6MjA4MDM3NTg2OX0.kYSG-UNeZV7hwB1ozbQwKNCcGs68FUO1PUrigrUFAkA";
const supabaseClient =
  window.__supabaseClient__ ||
  (window.__supabaseClient__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passInput.value;
  if (!email || !password) return alert("Provide email and password");
  loginBtn.disabled = true;
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // on success redirect to dashboard
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("Login failed:", err);
    alert(err.message || "Login failed");
  } finally {
    loginBtn.disabled = false;
  }
});
