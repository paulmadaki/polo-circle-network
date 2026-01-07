// admin.js
// Direct connection to Supabase for withdrawal status updates.

const SUPABASE_URL = "https://sjfkavspjaajyymmfjic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmthdnNwamFhanl5bW1mamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTk4NjksImV4cCI6MjA4MDM3NTg2OX0.kYSG-UNeZV7hwB1ozbQwKNCcGs68FUO1PUrigrUFAkA";
const WORKER_BASE = "https://floral-bar-7a5c.passproduction16.workers.dev";

// Initialize Supabase Client
const supabaseClient =
  window.__supabaseClient__ ||
  (window.__supabaseClient__ = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

// --- HELPER FUNCTIONS ---
function toggleLoading(on) {
    try {
        const ov = document.getElementById('loadingOverlay');
        if (!ov) return;
        if (window.__loadingTimeoutId) { clearTimeout(window.__loadingTimeoutId); window.__loadingTimeoutId = null; }
        if (on) {
            ov.classList.remove('hidden');
            ov.style.display = 'flex';
            window.__loadingTimeoutId = setTimeout(() => {
                try { ov.classList.add('hidden'); ov.style.display = 'none'; } catch(e){}
                window.__loadingTimeoutId = null;
            }, 30000);
        } else {
            ov.classList.add('hidden');
            ov.style.display = 'none';
        }
    } catch (e) { console.error('toggleLoading error', e); }
}

async function ensureAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return window.location.href = "login.html";
    
    const token = session.access_token;
    let res;
    try {
        res = await fetch(`${WORKER_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` }});
    } catch (err) {
        console.error('ensureAdmin fetch error', err);
        alert('Failed to contact server to verify admin status.');
        return null;
    }

    if (!res.ok) {
        window.location.href = "login.html";
        return null;
    }

    const j = await res.json().catch(e=>{ console.error('json parse /api/me', e); return null; });
    const user = j?.app_user;
    if (!user || !user.is_admin) {
        alert("Not authorized");
        window.location.href = "login.html";
        return null;
    }
    return { token, user };
}

// --- RENDERING FUNCTIONS ---

function renderUsersTable(users) {
    if (!Array.isArray(users) || users.length === 0) {
        return '<p>No users found.</p>';
    }

    let html = `
        <p class="text-3xl font-bold mb-3">${users.length}</p>
        <p class="text-xs text-gray-500 mb-4">Total Registered Users</p>
        <div class="overflow-y-auto h-48 border border-gray-200 rounded">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;

    users.forEach(user => {
        const isAdmin = user.is_admin ? 
            '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Yes</span>' : 
            '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">No</span>';

        html += `
            <tr>
                <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-900">${user.email || 'N/A'}</td>
                <td class="px-3 py-1 whitespace-nowrap">${isAdmin}</td>
                <td class="px-3 py-1 whitespace-nowrap text-xs text-gray-500">${user.id ? user.id.substring(0, 8) + '...' : 'N/A'}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    return html;
}

function renderWithdrawalsTable(withdrawals) {
    const pendingRequests = withdrawals.filter(req => req.status === 'pending');
    const requestsToDisplay = withdrawals; 

    if (!Array.isArray(requestsToDisplay) || requestsToDisplay.length === 0) {
        return '<p>No withdrawal records found.</p>';
    }
    
    let html = `
        <p class="text-3xl font-bold mb-3">${pendingRequests.length}</p>
        <p class="text-xs text-gray-500 mb-4">Total Pending Requests</p>
        <div class="overflow-y-auto h-48 border border-gray-200 rounded">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed By / Date</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;

    requestsToDisplay.forEach(req => {
        const userDetails = req.uid; 
        const userName = userDetails?.full_name || 'N/A';
        const userEmail = userDetails?.email || 'N/A';
        const isPending = req.status === 'pending';
        const amountDisplay = typeof req.amount === 'number' ? `₦${req.amount.toLocaleString()}` : 'N/A';
        
        let processedInfo = 'N/A';
        if (req.processed_at) {
            const date = new Date(req.processed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const adminIdShort = req.approved_by_uid ? req.approved_by_uid.substring(0, 4) + '...' : 'System';
            processedInfo = `${req.status.toUpperCase()} by ${adminIdShort} on ${date}`;
        }

        // UPDATE: Handle the 'paid' class for the UI
        let statusClass = 'text-gray-500';
        if (req.status === 'approved' || req.status === 'paid') statusClass = 'text-green-600 font-semibold';
        if (req.status === 'pending') statusClass = 'text-yellow-600 font-semibold';
        if (req.status === 'rejected') statusClass = 'text-red-600 font-semibold';

        const safeEmail = encodeURIComponent(userEmail || '');
        const amtNum = typeof req.amount === 'number' ? req.amount : 0;
        
        // UPDATE: Changed status from 'approved' to 'paid' for the button action
        const actions = isPending ? `
            <button onclick="openConfirmModal('${req.id}','paid', ${amtNum}, '${safeEmail}')" class="text-green-600 hover:text-green-800 text-xs font-semibold mr-2 px-2 py-1 border border-green-600 rounded">Mark Paid</button>
            <button onclick="openRejectModal('${req.id}', ${amtNum}, '${safeEmail}')" class="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 border border-red-600 rounded">Reject</button>
        ` : `<span class="${statusClass}">Reviewed</span>`;

        html += `
            <tr>
                <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-900">
                    <strong>${userName}</strong> <br/>
                    <span class="text-xs text-gray-500">${userEmail}</span>
                </td>
                <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-900">${amountDisplay}</td>
                <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-700">${req.rejection_reason ? req.rejection_reason : '-'}</td>
                <td class="px-3 py-1 whitespace-nowrap text-xs ${statusClass}">${req.status.toUpperCase()}</td>
                <td class="px-3 py-1 whitespace-nowrap text-xs text-gray-500">${processedInfo}</td>
                <td class="px-3 py-1 whitespace-nowrap">${actions}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    return html;
}

function renderPaymentsTable(payments) {
    if (!Array.isArray(payments) || payments.length === 0) {
        return '<p>No payments found.</p>';
    }
    
    let html = `
        <p class="text-3xl font-bold mb-3">${payments.length}</p>
        <p class="text-xs text-gray-500 mb-4">Total Payments Recorded</p>
        <div class="overflow-y-auto h-48 border border-gray-200 rounded">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;

    payments.forEach(payment => {
        const idDisplay = payment.id ? payment.id.substring(0, 8) + '...' : 'N/A';
        const amountDisplay = typeof payment.amount === 'number' ? `₦${payment.amount.toLocaleString()}` : 'N/A'; 
        const dateDisplay = payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A';

        html += `
            <tr>
                <td class="px-3 py-1 whitespace-nowrap text-xs text-gray-500">${idDisplay}</td>
                <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-900 font-medium">${amountDisplay}</td>
                <td class="px-3 py-1 whitespace-nowrap text-sm text-gray-500">${dateDisplay}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    return html;
}

// --- ACTION HANDLER (Updated for "paid" and clean columns) ---

async function updateWithdrawalStatus(withdrawalId, newStatus, reason) {
    try {
        toggleLoading(true);

        const { data: { user } } = await supabaseClient.auth.getUser();
        const adminAuthUid = user?.id;

        if (!adminAuthUid) throw new Error("Could not retrieve logged-in administrator ID.");

        // UPDATE: Construct update object carefully
        // .trim() ensures no accidental spaces violate the database CHECK constraint
        const updateObj = {
            status: newStatus.trim(), 
            processed_at: new Date().toISOString(),
            approved_by_uid: adminAuthUid
        };

        // Only include rejection_reason if the column exists and status is rejected
        if (newStatus === 'rejected' && reason) {
            updateObj.rejection_reason = reason.trim();
        }

        const { error } = await supabaseClient
            .from('withdrawals')
            .update(updateObj)
            .eq('id', withdrawalId)
            .eq('status', 'pending'); // Safety: only update if still pending

        if (error) {
            // Handle common errors specifically
            if (error.message.includes('rejection_reason')) {
                throw new Error("Database missing 'rejection_reason' column. Please add it via SQL Editor.");
            }
            throw new Error(error.message);
        }

        alert(`Withdrawal updated to ${newStatus.toUpperCase()}.`);
        loadAdminData();

    } catch (error) {
        console.error('Status update error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        toggleLoading(false);
    }
}

// --- Modal & Helper UI Handlers ---
function openConfirmModal(withdrawalId, newStatus, amount, encodedEmail) {
    const email = encodedEmail ? decodeURIComponent(encodedEmail) : 'N/A';
    const msg = `Change status of ${email} to ${newStatus.toUpperCase()}?`;
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const proceedBtn = document.getElementById('confirmProceedBtn');
    
    if (!modal || !msgEl || !proceedBtn) return alert('UI Modal elements missing from HTML');
    
    msgEl.textContent = msg;
    proceedBtn.onclick = async () => {
        closeConfirmModal();
        await updateWithdrawalStatus(withdrawalId, newStatus);
    };
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function openRejectModal(withdrawalId, amount, encodedEmail) {
    const email = encodedEmail ? decodeURIComponent(encodedEmail) : 'N/A';
    const modal = document.getElementById('rejectModal');
    const ctx = document.getElementById('rejectContext');
    const reasonEl = document.getElementById('rejectReason');
    const proceedBtn = document.getElementById('rejectProceedBtn');
    
    if (!modal || !reasonEl || !proceedBtn) return alert('UI Reject Modal elements missing');
    
    ctx.textContent = `Reject withdrawal for ${email} (₦${amount.toLocaleString()}). Reason:`;
    reasonEl.value = '';
    proceedBtn.onclick = async () => {
        const reason = reasonEl.value.trim() || null;
        closeRejectModal();
        await updateWithdrawalStatus(withdrawalId, 'rejected', reason);
    };
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closeRejectModal() {
    const modal = document.getElementById('rejectModal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

// Logout 
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'logoutBtn') {
        (async () => {
            try { toggleLoading(true); await supabaseClient.auth.signOut(); window.location.href = 'login.html'; }
            catch (err) { alert('Logout failed'); }
            finally { toggleLoading(false); }
        })();
    }
});

// --- MAIN DATA LOADER ---

async function loadAdminData() {
    const info = await ensureAdmin();
    if (!info) return;
    const { token } = info;
    try {
        toggleLoading(true);
        const endpoints = [
            { url: `${WORKER_BASE}/api/admin/users`, el: 'adminUsers' },
            { url: `${WORKER_BASE}/api/admin/payments`, el: 'allPayments' },
            { url: `${WORKER_BASE}/api/admin/withdrawals`, el: 'pendingWithdrawals' }
        ];

        const results = await Promise.all(endpoints.map(e =>
            fetch(e.url, { headers: { Authorization: `Bearer ${token}` } }).then(async r => {
                const txt = await r.text().catch(()=>null);
                let body = null;
                try { body = txt ? JSON.parse(txt) : null; } catch(e){ body = txt; }
                return { ok: r.ok, status: r.status, body, el: e.el, url: e.url };
            }).catch(err => ({ ok: false, status: 0, body: null, el: e.el, url: e.url }))
        ));

        for (const r of results) {
            const container = document.getElementById(r.el);
            if (!container) continue;
            if (!r.ok) {
                container.textContent = `Error loading ${r.el}`;
                continue;
            }

            if (r.el === 'adminUsers') container.innerHTML = renderUsersTable(r.body);
            else if (r.el === 'pendingWithdrawals') container.innerHTML = renderWithdrawalsTable(r.body);
            else if (r.el === 'allPayments') container.innerHTML = renderPaymentsTable(r.body);
        }
    } catch (err) {
        console.error("loadAdminData error:", err);
    } finally {
        toggleLoading(false);
    }
}

loadAdminData();