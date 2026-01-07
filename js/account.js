/*********************************
 * SUPABASE CONFIG
 *********************************/
const SUPABASE_URL = "https://sjfkavspjaajyymmfjic.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZmthdnNwamFhanl5bW1mamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTk4NjksImV4cCI6MjA4MDM3NTg2OX0.kYSG-UNeZV7hwB1ozbQwKNCcGs68FUO1PUrigrUFAkA";

// ✅ IMPORTANT: renamed to avoid conflict
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/*********************************
 * DOM ELEMENTS
 *********************************/
const form = document.getElementById("accountForm");
const msg = document.getElementById("message");
const submitBtn = form?.querySelector("button");

/*********************************
 * HELPERS
 *********************************/
function resetSubmitButton(originalText = "Save Account Details") {
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

/*********************************
 * LOAD USER + PREFILL DATA
 *********************************/
async function loadUserAndPrefill() {
  const { data, error } = await supabaseClient.auth.getUser();
  const user = data?.user || null;

  if (error || !user) {
    msg.textContent = "You must be logged in to view this page.";
    msg.className = "text-red-600 text-center";
    if (form) form.style.display = "none";
    return null;
  }

  try {
    const { data: profile, error: profileError } =
      await supabaseClient
        .from("user_accounts")
        .select("bank, account_number, account_name")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (profile) {
      document.getElementById("bank").value = profile.bank || "";
      document.getElementById("accountNumber").value =
        profile.account_number || "";
      document.getElementById("accountName").value =
        profile.account_name || "";
    }
  } catch (err) {
    console.error(err);
    msg.textContent = "Error loading existing account details.";
    msg.className = "text-red-600 text-center";
  }

  return user;
}

/*********************************
 * AUTH STATE LISTENER
 *********************************/
function authListener() {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      msg.textContent = "You must be logged in to view this page.";
      msg.className = "text-red-600 text-center";
      if (form) form.style.display = "none";
    } else {
      if (form) form.style.display = "";
      loadUserAndPrefill();
    }
  });
}

/*********************************
 * INITIALIZE
 *********************************/
if (form) {
  loadUserAndPrefill();
  authListener();

  /*********************************
   * FORM SUBMIT
   *********************************/
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { data, error } = await supabaseClient.auth.getUser();
    const user = data?.user || null;
    if (error || !user) return;

    const bank = document.getElementById("bank").value.trim();
    const accountNumberInput = document
      .getElementById("accountNumber")
      .value.trim();
    const accountNameInput = document
      .getElementById("accountName")
      .value.trim();

    // VALIDATION (Nigeria)
    if (accountNumberInput.length !== 10 || !/^\d+$/.test(accountNumberInput)) {
      msg.textContent = "Account number must be exactly 10 digits.";
      msg.className = "text-red-600 text-center";
      return;
    }

    if (!bank || !accountNameInput) {
      msg.textContent = "All fields are required.";
      msg.className = "text-red-600 text-center";
      return;
    }

    // Loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div class="flex items-center justify-center">
          <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="white" stroke-width="4"></circle>
            <path class="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Saving...
        </div>
      `;
    }

    try {
      const { error: upsertError } = await supabaseClient
        .from("user_accounts")
        .upsert(
          {
            id: user.id,
            bank,
            account_number: accountNumberInput,
            account_name: accountNameInput,
          },
          { onConflict: "id" }
        );

      if (upsertError) throw upsertError;

      msg.textContent = "Account details saved!";
      msg.className = "text-green-600 text-center";

      resetSubmitButton();

      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 1200);
    } catch (err) {
      console.error(err);
      msg.textContent = "Error saving details.";
      msg.className = "text-red-600 text-center";
      resetSubmitButton();
    }
  });
}
