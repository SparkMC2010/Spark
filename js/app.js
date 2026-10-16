const STORAGE_KEY = "ahmed-arabi-platform-content-v1";
const $ = (selector) => document.querySelector(selector);
const grid = $("#contentGrid");
const emptyState = $("#emptyState");
const adminModal = $("#adminModal");
const detailModal = $("#detailModal");
const form = $("#contentForm");
let contents = loadContents();
let activeFilter = "all";
let activeItemId = null;
let toastTimer;

const typeNames = { lesson: "حصة / درس", video: "فيديو", notes: "ملخص / مذكرة" };
const typeIcons = { lesson: "▤", video: "▶", notes: "✎" };

function loadContents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}
function saveContents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contents));
    return true;
  } catch (error) {
    showToast("المتصفح لم يستطع حفظ المحتوى. جرّب حذف بعض البيانات.");
    return false;
  }
}
function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function formatDate(value) {
  try { return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
  catch { return ""; }
}
function render() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("ar");
  const grade = $("#gradeFilter")?.value || "all";
  const filtered = contents.filter((item) => {
    const matchesType = activeFilter === "all" || item.type === activeFilter;
    const text = `${item.title} ${item.subject} ${item.description}`.toLocaleLowerCase("ar");
    return matchesType && text.includes(query) && (grade === "all" || (item.grade || "4 ابتدائي") === grade);
  });
  grid.innerHTML = filtered.map((item) => `
    <article class="content-card">
      <div class="card-cover">
        <span class="type-badge">${typeNames[item.type]}</span>
        <span class="cover-icon">${typeIcons[item.type]}</span>
      </div>
      <div class="card-body">
        <span class="card-subject">${safeText(item.grade || "4 ابتدائي")} · ${safeText(item.subject || "محتوى تعليمي")}</span>
        <h3>${safeText(item.title)}</h3>
        <p>${safeText(item.description || "افتح المحتوى لعرض التفاصيل.")}</p>
        <div class="card-bottom"><span class="card-date">${formatDate(item.createdAt)}</span><button class="card-open" data-open="${safeText(item.id)}">عرض المحتوى ←</button></div>
      </div>
    </article>`).join("");
  emptyState.classList.toggle("show", filtered.length === 0);
  grid.style.display = filtered.length ? "grid" : "none";
  $("#statLessons").textContent = new Intl.NumberFormat("ar-EG").format(contents.filter(x => x.type === "lesson").length);
  $("#statVideos").textContent = new Intl.NumberFormat("ar-EG").format(contents.filter(x => x.type === "video" || x.videoUrl).length);
  $("#statNotes").textContent = new Intl.NumberFormat("ar-EG").format(contents.filter(x => x.type === "notes" || x.fileUrl).length);
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function openAdmin() {
  adminModal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => form.elements.title.focus(), 30);
}
function closeAdmin() {
  adminModal.hidden = true;
  document.body.style.overflow = "";
}
function closeDetail() {
  detailModal.hidden = true;
  $("#detailVideo").innerHTML = "";
  document.body.style.overflow = "";
  activeItemId = null;
}
function getYouTubeEmbed(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsed.pathname.slice(1))}`;
    if (parsed.hostname.endsWith("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.match(/\/embed\/([^/]+)/)?.[1] || parsed.pathname.match(/\/shorts\/([^/]+)/)?.[1];
      if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }
  } catch {}
  return null;
}
function openDetail(id) {
  const item = contents.find(x => x.id === id);
  if (!item) return;
  activeItemId = id;
  $("#detailTitle").textContent = item.title;
  $("#detailSubject").textContent = `${typeNames[item.type]} · ${item.subject || "محتوى تعليمي"}`;
  $("#detailDescription").textContent = item.description || "لا توجد ملاحظات إضافية لهذا المحتوى.";
  const videoBox = $("#detailVideo");
  videoBox.innerHTML = "";
  if (item.videoUrl) {
    const embed = getYouTubeEmbed(item.videoUrl);
    if (embed) {
      const iframe = document.createElement("iframe");
      iframe.src = embed;
      iframe.title = `فيديو: ${item.title}`;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      videoBox.appendChild(iframe);
    } else if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(item.videoUrl)) {
      const video = document.createElement("video");
      video.src = item.videoUrl;
      video.controls = true;
      video.playsInline = true;
      video.textContent = "متصفحك لا يدعم تشغيل الفيديو.";
      videoBox.appendChild(video);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "video-placeholder";
      const text = document.createElement("strong");
      text.textContent = "الفيديو مرفق بالرابط";
      const link = document.createElement("a");
      link.href = item.videoUrl; link.target = "_blank"; link.rel = "noopener"; link.className = "button button-gold"; link.textContent = "فتح الفيديو ↗";
      placeholder.append(text, link);
      videoBox.appendChild(placeholder);
    }
    videoBox.hidden = false;
  } else {
    videoBox.innerHTML = '<div class="video-placeholder"><div style="font-size:30px">✎</div><strong>محتوى الدرس</strong><p>يمكنك إضافة رابط فيديو عند إنشاء المحتوى.</p></div>';
  }
  const file = $("#detailFile");
  if (item.fileUrl) { file.href = item.fileUrl; file.hidden = false; } else { file.hidden = true; file.removeAttribute("href"); }
  detailModal.hidden = false;
  document.body.style.overflow = "hidden";
}

["#openAdminTop", "#openAdminHero", "#openAdminLibrary", "#openAdminEmpty"].forEach(sel => $(sel).addEventListener("click", openAdmin));
$("#closeModal").addEventListener("click", closeAdmin);
$("#cancelModal").addEventListener("click", closeAdmin);
$("#closeDetail").addEventListener("click", closeDetail);
$("#doneDetail").addEventListener("click", closeDetail);
adminModal.addEventListener("click", (e) => { if (e.target === adminModal) closeAdmin(); });
detailModal.addEventListener("click", (e) => { if (e.target === detailModal) closeDetail(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeAdmin(); closeDetail(); } });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  if (!title) { showToast("اكتب عنوان الدرس الأول."); return; }
  const item = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    type: String(data.get("type") || "lesson"),
    subject: String(data.get("subject") || "").trim(),
    grade: String(data.get("grade") || "4 ابتدائي"),
    description: String(data.get("description") || "").trim(),
    videoUrl: String(data.get("videoUrl") || "").trim(),
    fileUrl: String(data.get("fileUrl") || "").trim(),
    createdAt: new Date().toISOString()
  };
  contents.unshift(item);
  saveContents();
  render();
  form.reset();
  closeAdmin();
  showToast("تم حفظ المحتوى على هذا الجهاز بنجاح.");
});

grid.addEventListener("click", (e) => {
  const button = e.target.closest("[data-open]");
  if (button) openDetail(button.dataset.open);
});
$("#searchInput").addEventListener("input", render);
$("#gradeFilter").addEventListener("change", render);
$("#gateForm").addEventListener("submit", (e) => { e.preventDefault(); if ($("#studentCode").value.trim() === "2468") { $("#studentGate").remove(); sessionStorage.setItem("student-demo-unlocked", "1"); } else { showToast("كود الدخول غير صحيح."); } });
if (sessionStorage.getItem("student-demo-unlocked") === "1") $("#studentGate").remove();
document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b === button));
    render();
  });
});
$("#deleteContent").addEventListener("click", () => {
  if (!activeItemId) return;
  if (!confirm("متأكد إنك عايز تحذف المحتوى ده؟")) return;
  contents = contents.filter(item => item.id !== activeItemId);
  saveContents();
  closeDetail();
  render();
  showToast("تم حذف المحتوى.");
});
$("#year").textContent = new Date().getFullYear();

const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");
menuToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
render();
