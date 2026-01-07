// ======================================================
// dashboard.js (FULL RESTORED VERSION)
// ======================================================

const SUPABASE_URL = "https://sjfkavspjaajyymmfjic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmthdnNwamFhanl5bW1mamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTk4NjksImV4cCI6MjA4MDM3NTg2OX0.kYSG-UNeZV7hwB1ozbQwKNCcGs68FUO1PUrigrUFAkA";
const WORKER_BASE = "https://floral-bar-7a5c.passproduction16.workers.dev";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PAYSTACK_PUBLIC_KEY = "pk_test_12df58e07e4fab48a969987ffe965bd683792a17";
const RENEWAL_FEE = 6000;
const REWARD_AMOUNT = 21600; 
const MAX_LEVEL = 12;

let userProfile = null;

// --- INITIALIZATION ---

async function initializeDashboard(session) {
    if (!session) return;
    try {
        await loadDashboardData(session);
    } catch (e) {
        console.error("Dashboard Load Error:", e);
    }
}

// Check session on page load
(async () => {
    showLoading();
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = "login.html";
            return;
        }
        await initializeDashboard(session);
    } finally {
        hideLoading();
    }
})();

// --- DATA LOADER ---

async function loadDashboardData(session) {
    const token = session.access_token;
    const res = await fetch(`${WORKER_BASE}/api/me`, { 
        headers: { Authorization: `Bearer ${token}` } 
    });
    
    if (!res.ok) throw new Error("Failed to fetch user data");

    const response = await res.json();
    userProfile = response.app_user;

    const { full_name, email, circle, level, earnings, needs_renewal } = userProfile;

    const currentEarnings = Number(earnings ?? 0);
    document.getElementById("earnings").textContent = currentEarnings.toLocaleString('en-NG', { minimumFractionDigits: 2 });

    // --- EMPTY STATE LOGIC ---
    const emptyMsg = document.getElementById("emptyEarningsMsg");
    const withdrawBtn = document.getElementById("withdrawBtn");

    if (currentEarnings <= 0) {
        emptyMsg?.classList.remove('hidden');
        if (withdrawBtn) {
            withdrawBtn.disabled = true;
            withdrawBtn.classList.add('opacity-50', 'cursor-not-allowed');
            withdrawBtn.textContent = "No Earnings to Withdraw";
        }
    } else {
        emptyMsg?.classList.add('hidden');
        if (withdrawBtn) {
            withdrawBtn.disabled = false;
            withdrawBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            withdrawBtn.textContent = "Withdraw Earnings";
        }
    }
    // --- END EMPTY STATE LOGIC ---

    // Update UI
    document.getElementById("name").textContent = full_name || "N/A";
    document.getElementById("email").textContent = email || "N/A";
    document.getElementById("current-circle").textContent = circle ?? 1;
    document.getElementById("current-level").textContent = level ?? 0;
    document.getElementById("earnings").textContent = Number(earnings ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

    // Handle Renewal UI
    const renewalSection = document.getElementById("renewalSection");
    const isInitialOrNeeded = Boolean(needs_renewal) || Number(level) === 0;
    renewalSection.style.display = isInitialOrNeeded ? "block" : "none";
    
    if (isInitialOrNeeded) {
        const nextCircle = needs_renewal ? circle : Number(circle) + 1;
        document.getElementById("renewBtn").textContent = `Renew for ₦${RENEWAL_FEE.toLocaleString()} to start Circle ${nextCircle} Level 1`;
    }

    // Handle Assimilation Button
    const completeLevelBtn = document.getElementById("completeLevelBtn");
    const isMaxLevel = (Number(level) === MAX_LEVEL) && !needs_renewal;
    completeLevelBtn.hidden = !isMaxLevel;
    if (isMaxLevel) {
        completeLevelBtn.textContent = `ASSIMILATE & Start Circle ${Number(circle) + 1}`;
    }
}

// --- BUTTON LISTENERS ---

document.addEventListener("DOMContentLoaded", () => {
    
    // RENEWAL ACTION
    document.getElementById("renewBtn")?.addEventListener("click", () => {
        const handler = PaystackPop.setup({
            key: PAYSTACK_PUBLIC_KEY,
            email: userProfile.email,
            amount: RENEWAL_FEE * 100,
            onClose: () => hideLoading(),
            callback: function(resp) { // Standard function to satisfy Paystack
                showLoading();
                (async () => {
                    try {
                        const { data: { session } } = await supabaseClient.auth.getSession();
                        const verifyRes = await fetch(`${WORKER_BASE}/api/renew`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ payRef: resp.reference })
                        });
                        if (!verifyRes.ok) throw new Error("Verification failed");
                        
                        alert("🎉 Circle Renewed!");
                        await initializeDashboard(session);
                    } catch (e) {
                        alert("Error verifying payment: " + e.message);
                    } finally {
                        hideLoading();
                    }
                })();
            }
        });
        showLoading();
        handler.openIframe();
    });

    // WITHDRAW ACTION (FIXED FOR JSON PARSING)
document.getElementById("withdrawBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to withdraw your full earnings?")) return;
    
    showLoading();
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error("Session expired.");

        const res = await fetch(`${WORKER_BASE}/api/withdraw`, { 
            method: "POST", 
            headers: { 
                "Authorization": `Bearer ${session.access_token}`,
                "Content-Type": "application/json" // Tell the worker to expect JSON
            },
            body: JSON.stringify({}) // Send an empty object to prevent "Unexpected end of JSON"
        });
        
        if (!res.ok) {
            const errorDetail = await res.text(); 
            console.error("Worker Crash Details:", errorDetail);
            
            try {
                const errData = JSON.parse(errorDetail);
                throw new Error(errData.error || "Withdrawal failed.");
            } catch (jsonErr) {
                throw new Error(`Backend Error: ${errorDetail}`);
            }
        }

        alert("✅ Withdrawal request submitted, and will be processed within 7 days.");
        await initializeDashboard(session); 
        
    } catch (e) {
        alert(e.message);
    } finally {
        hideLoading();
    }
});
    // ASSIMILATE ACTION
    document.getElementById("completeLevelBtn")?.addEventListener("click", async () => {
        showLoading();
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const res = await fetch(`${WORKER_BASE}/api/progress`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error("Progress request failed");
            
            alert("Level Up Processed!");
            await initializeDashboard(session);
        } catch (e) {
            alert(e.message);
        } finally {
            hideLoading();
        }
    });

    // LOGOUT
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        showLoading();
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    });
});