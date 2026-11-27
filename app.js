
async function loadMembers() {
    const memberSelect = document.getElementById("member");

    if (!memberSelect) {
        console.error("Elemen member tidak ditemukan.");
        return;
    }

    memberSelect.innerHTML =
        '<option value="">Memuat nama anggota...</option>';

    const { data, error } = await db
        .from("members")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: true });

    if (error) {
        console.error("Gagal mengambil anggota:", error);

        memberSelect.innerHTML =
            '<option value="">Gagal memuat anggota</option>';

        return;
    }

    if (!data || data.length === 0) {
        memberSelect.innerHTML =
            '<option value="">Belum ada anggota aktif</option>';

        return;
    }

    memberSelect.innerHTML =
        '<option value="">Pilih nama anggota</option>';

    data.forEach((item) => {
        const option = document.createElement("option");

        option.value = item.id;
        option.textContent = item.name;

        memberSelect.appendChild(option);
    });

    console.log("Anggota berhasil dimuat:", data);
}

// ==================================
// TANGGAL OTOMATIS INDONESIA
// ==================================

function updateToday() {
    const dateElement = document.getElementById("today");

    if (!dateElement) return;

    dateElement.textContent =
        new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date());
}

// ==================================
// JALANKAN SAAT HALAMAN DIBUKA
// ==================================

document.addEventListener("DOMContentLoaded", () => {
    loadMembers();
    updateToday();

    // Perbarui tanggal setiap menit
    setInterval(updateToday, 60000);
});
