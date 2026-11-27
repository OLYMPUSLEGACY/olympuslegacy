
const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const table = document.getElementById("attendanceTable");
const dateFilter = document.getElementById("dateFilter");

let attendanceData = [];

function localDate() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,"0"),
    String(d.getDate()).padStart(2,"0")
  ].join("-");
}

dateFilter.value = localDate();

function showMessage(text, type = "") {
  loginMessage.textContent = text;
  loginMessage.className = type;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  })[c]);
}

function showDashboard(loggedIn) {
  loginPanel.hidden = loggedIn;
  dashboard.hidden = !loggedIn;

  if (loggedIn) loadData();
}

async function checkLogin() {
  const { data } = await db.auth.getSession();
  showDashboard(Boolean(data.session));
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  document.getElementById("loginBtn").disabled = true;
  showMessage("Sedang login...");

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  document.getElementById("loginBtn").disabled = false;

  if (error) {
    showMessage("Email atau password salah.", "error");
    return;
  }

  showMessage("");
  showDashboard(true);
});

document.getElementById("logoutBtn").onclick = async () => {
  await db.auth.signOut();
  showDashboard(false);
};

document.getElementById("loadBtn").onclick = loadData;
dateFilter.addEventListener("change", loadData);

async function loadData() {
  table.innerHTML =
    '<tr><td colspan="5">Memuat data...</td></tr>';

  const { data, error } = await db
    .from("attendance")
    .select("id, attendance_date, status, note, created_at, members(name)")
    .eq("attendance_date", dateFilter.value)
    .order("created_at", { ascending: false });

  if (error) {
    table.innerHTML =
      '<tr><td colspan="5">Gagal memuat data.</td></tr>';
    document.getElementById("tableMessage").textContent =
      "Periksa izin akun admin dan koneksi database.";
    console.error(error);
    return;
  }

  attendanceData = data || [];
  renderTable();
  updateStats();
}

function updateStats() {
  const count = status =>
    attendanceData.filter(item => item.status === status).length;

  document.getElementById("total").textContent =
    attendanceData.length;
  document.getElementById("hadir").textContent = count("Hadir poin diatas 600");
  document.getElementById("hadir").textContent = count("Hadir poin dibawah 600");
}

function renderTable() {
  if (!attendanceData.length) {
    table.innerHTML =
      '<tr><td colspan="5">Belum ada data absensi.</td></tr>';
    return;
  }

  table.innerHTML = attendanceData.map(item => {
    const time = new Date(item.created_at)
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta"
      });

    return `
      <tr data-id="${escapeHTML(item.id)}">
        <td>${escapeHTML(item.members?.name || "-")}</td>
        <td>
          <select class="statusEdit">
            ${["Hadir","Izin","Sakit","Alpa"].map(s =>
              `<option value="${s}" ${item.status === s ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </td>
        <td>${escapeHTML(item.note || "-")}</td>
        <td>${escapeHTML(time)} WIB</td>
        <td>
          <button class="saveBtn" type="button">Simpan</button>
          <button class="deleteBtn" type="button">Hapus</button>
        </td>
      </tr>
    `;
  }).join("");

  table.querySelectorAll(".saveBtn").forEach(btn => {
    btn.onclick = async () => {
      const tr = btn.closest("tr");
      const id = tr.dataset.id;
      const status = tr.querySelector(".statusEdit").value;

      btn.disabled = true;
      const { error } = await db
        .from("attendance")
        .update({ status })
        .eq("id", id);
      btn.disabled = false;

      if (error) {
        alert("Gagal memperbarui data.");
      } else {
        alert("Data berhasil diperbarui.");
        loadData();
      }
    };
  });

  table.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.onclick = async () => {
      const tr = btn.closest("tr");

      if (!confirm("Yakin ingin menghapus absensi ini?")) return;

      btn.disabled = true;
      const { error } = await db
        .from("attendance")
        .delete()
        .eq("id", tr.dataset.id);

      if (error) {
        btn.disabled = false;
        alert("Gagal menghapus data.");
      } else {
        alert("Data berhasil dihapus.");
        loadData();
      }
    };
  });
}

document.getElementById("exportBtn").onclick = () => {
  if (!attendanceData.length) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const rows = [
    ["Tanggal","Nama","Status","Keterangan","Waktu"]
  ];

  attendanceData.forEach(item => {
    rows.push([
      item.attendance_date,
      item.members?.name || "",
      item.status,
      item.note || "",
      new Date(item.created_at).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta"
      })
    ]);
  });

  const csv = rows.map(row =>
    row.map(value =>
      '"' + String(value).replace(/"/g, '""') + '"'
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "absensi-olympus-" + dateFilter.value + ".csv";
  link.click();

  URL.revokeObjectURL(url);
};

db.auth.onAuthStateChange((_event, session) => {
  showDashboard(Boolean(session));
});

checkLogin();
