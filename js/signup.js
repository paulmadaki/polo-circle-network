// signup.js
// Required in HTML: supabase-js v2 + Paystack inline script
// <script src="https://unpkg.com/@supabase/supabase-js"></script>
// <script src="https://js.paystack.co/v1/inline.js"></script>
//
// Set these client-side constants:
const SUPABASE_URL = "https://sjfkavspjaajyymmfjic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmthdnNwamFhanl5bW1mamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTk4NjksImV4cCI6MjA4MDM3NTg2OX0.kYSG-UNeZV7hwB1ozbQwKNCcGs68FUO1PUrigrUFAkA";
const WORKER_BASE = "https://floral-bar-7a5c.passproduction16.workers.dev";
const PAYSTACK_TEST_PUBLIC_KEY = "pk_live_98e672f88208c8d3bb0c4bc7439883ad7e29ad94";
const AMOUNT_NGN = 6000;

const supabaseClient =
  window.__supabaseClient__ ||
  (window.__supabaseClient__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

const form = document.getElementById("registerForm");
const submitBtn = form.querySelector('button[type="submit"]');

function setSubmitting(x) { if (submitBtn) submitBtn.disabled = x; }

// Small helper: prefer global `showLoading`, fallback to toggling `#loadingOverlay`
function toggleLoading(on) {
  try {
    const ov = document.getElementById('loadingOverlay');
    if (!ov) return;
    if (window.__loadingTimeoutId) { clearTimeout(window.__loadingTimeoutId); window.__loadingTimeoutId = null; }
    if (on) {
      ov.classList.remove('hidden');
      ov.style.display = 'flex';
      console.debug('toggleLoading: show');
      window.__loadingTimeoutId = setTimeout(() => {
        console.warn('toggleLoading: fallback hide after timeout');
        try { ov.classList.add('hidden'); ov.style.display = 'none'; } catch(e){}
        window.__loadingTimeoutId = null;
      }, 30000);
    } else {
      ov.classList.add('hidden');
      ov.style.display = 'none';
      console.debug('toggleLoading: hide');
    }
  } catch (e) { console.error('toggleLoading error', e); }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setSubmitting(true);
  toggleLoading(true);

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const location = document.getElementById("location").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();

  if (!fullName || !email || !password) {
    alert("Please fill name, email and password.");
    setSubmitting(false);
    return;
  }

    try {
      // Ensure Paystack script loaded
      if (typeof PaystackPop === 'undefined' || typeof PaystackPop.setup !== 'function') {
        alert('Payment system not loaded. Please try again later.');
        setSubmitting(false);
        return;
      }

      // Launch Paystack
      const payRef = `REG-${Date.now()}-${Math.floor(Math.random()*100000)}`;
      const handler = PaystackPop.setup({
        key: PAYSTACK_TEST_PUBLIC_KEY,
        email,
        amount: AMOUNT_NGN * 100,
        ref: payRef,
        onClose: function () { alert("Payment window closed."); setSubmitting(false); toggleLoading(false); },
        // Paystack expects a plain function reference for 'callback'. Wrap async logic inside an IIFE.
        callback: function (resp) {
          (async function () {
            try {
              // send details to Worker which verifies payment and creates supabase user
              const registerRes = await fetch(`${WORKER_BASE}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, fullName, location, whatsapp, payRef: resp.reference })
              });
              const jr = await registerRes.json();
              if (!registerRes.ok) throw new Error(jr?.error || "Registration failed");

              // now sign-in on client to get session
              const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
              if (error) throw error;

              // redirect to dashboard
              window.location.href = "dashboard.html";
            } catch (err) {
              console.error("Registration error:", err);
              alert("Registration failed. Contact support.");
              setSubmitting(false);
              toggleLoading(false);
            }
          })();
        }
      });
      handler.openIframe();
    } catch (err) {
      console.error(err);
      alert(err.message || "Payment failed");
      setSubmitting(false);
    }
});
