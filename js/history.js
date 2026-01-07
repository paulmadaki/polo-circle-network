// ======================================================
// history.js (HISTORY PAGE LOGIC)
// ======================================================

// ----------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------
const SUPABASE_URL = "https://sjfkavspjaajyymmfjic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmthdnNwamFhanl5bW1mamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTk4NjksImV4cCI6MjA4MDM3NTg2OX0.kYSG-UNeZV7hwB1ozbQwKNCcGs68FUO1PUrigrUFAkA";

const supabaseClient =
  window.__supabaseClient__ ||
  (window.__supabaseClient__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

// ----------------------------------------------------------
// AUTH FLOW (Simplified for History Page)
// ----------------------------------------------------------

async function initHistoryPage() {
    console.log("History Page: Checking session...");
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        // Essential: Set the session for RLS-protected data fetching
        supabaseClient.auth.setSession(session); 
        console.log("History Page: Session active. Loading data.");
        
        // Use Promise.allSettled to ensure one table failure doesn't crash the other
        const results = await Promise.allSettled([
            loadPaymentsTable(session), 
            loadWithdrawalsTable(session) 
        ]);
        
        results.filter(r => r.status === 'rejected').forEach(r => 
            console.error("LOG: History load failed:", r.reason)
        );

    } else {
        // Redirect if not logged in
        console.log("History Page: No session found. Redirecting to login.");
        window.location.href = "login.html";
    }
}

// ----------------------------------------------------------
// DATA LOADERS (ROBUST)
// ----------------------------------------------------------

async function loadPaymentsTable(session) {
    if (!session) return;
    const uid = session.user.id;
    const table = document.getElementById("paymentsTable");
    table.innerHTML = `<tr><td colspan="5" class="text-center p-3 text-gray-500">Loading payments...</td></tr>`;

    try {
        const { data, error } = await supabaseClient
            .from("withdrawals")
            .select("*")
            .eq("uid", uid)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Payments load error:", error);
            table.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 p-3">Failed to load payments. Error: ${error.message} (Check RLS!)</td></tr>`;
            return; 
        }

        if (!data || data.length === 0) {
            table.innerHTML = `<tr><td colspan="4" class="text-center p-3 text-gray-500">No payments found</td></tr>`;
            return;
        }

        table.innerHTML = data.map(p => `
            <tr>
                <td class="px-4 py-2 whitespace-nowrap">${Number(p.amount ?? 0).toLocaleString()}</td>
                <td class="px-4 py-2 whitespace-nowrap ${statusColor(p.status)}">${p.status || 'N/A'}</td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${p.rejection_reason ? p.rejection_reason : '-'}</td>
                <td class="px-4 py-2 whitespace-nowrap">${p.reference || "-"}</td>
                <td class="px-4 py-2 whitespace-nowrap">${formatDate(p.created_at)}</td>
            </tr>
        `).join("");
    } catch (e) {
        console.error("CRITICAL RUNTIME ERROR in loadPaymentsTable:", e);
        table.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 p-3">CRITICAL ERROR: Failed to process payment data.</td></tr>`;
        throw e;
    }
}

async function loadWithdrawalsTable(session) {
    if (!session) return;
    const uid = session.user.id;
    const table = document.getElementById("withdrawalsTable");
    table.innerHTML = `<tr><td colspan="5" class="text-center p-3 text-gray-500">Loading withdrawals...</td></tr>`;


    try {
        const { data, error } = await supabaseClient
            .from("withdrawals")
            .select("*")
            .eq("uid", uid)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Withdrawals load error:", error);
            table.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 p-3">Failed to load withdrawals. Error: ${error.message} (Check RLS!)</td></tr>`;
            return; 
        }

        if (!data || data.length === 0) {
            table.innerHTML = `<tr><td colspan="4" class="text-center p-3 text-gray-500">No withdrawals yet</td></tr>`;
            return;
        }

        table.innerHTML = data.map(w => `
            <tr>
                <td class="px-4 py-2 whitespace-nowrap">${Number(w.amount ?? 0).toLocaleString()}</td>
                <td class="px-4 py-2 whitespace-nowrap ${statusColor(w.status)}">${w.status || 'N/A'}</td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${w.rejection_reason ? w.rejection_reason : '-'}</td>
                <td class="px-4 py-2 whitespace-nowrap">${w.reference || "-"}</td>
                <td class="px-4 py-2 whitespace-nowrap">${formatDate(w.created_at)}</td>
            </tr>
        `).join("");
    } catch (e) {
        console.error("CRITICAL RUNTIME ERROR in loadWithdrawalsTable:", e);
        table.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 p-3">CRITICAL ERROR: Failed to process withdrawal data.</td></tr>`;
        throw e;
    }
}

// ----------------------------------------------------------
// HELPERS
// ----------------------------------------------------------
function formatDate(date) {
    if (!date) return '';
    try { return new Date(date).toLocaleString(); } catch (e) { return String(date); }
}

function statusColor(status = "") {
    status = status.toLowerCase();
    if (status === "pending") return "text-yellow-600";
    if (status === "approved" || status === "success") return "text-green-600";
    if (status === "rejected" || status === "failed") return "text-red-600";
    return "text-gray-600";
}

// ----------------------------------------------------------
// INITIALIZE
// ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", initHistoryPage);