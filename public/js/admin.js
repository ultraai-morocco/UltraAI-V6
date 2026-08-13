/* =========================================
   UltraAI - ADMIN
========================================= */

function getAdminTokenPayload() {

    const token = localStorage.getItem("token");

    if (!token) return null;

    try {

        const parts = token.split(".");

        if (parts.length !== 3) return null;

        const payload =
            JSON.parse(
                atob(
                    parts[1]
                        .replace(/-/g, "+")
                        .replace(/_/g, "/")
                )
            );

        return payload;

    } catch (error) {

        console.error(
            "Admin token decode error:",
            error
        );

        return null;
    }
}


/* =========================================
   ADMIN BUTTON
========================================= */

async function isUltraAIAdmin() {

    const token =
        localStorage.getItem("token");

    if (!token) return false;

    try {

        const response =
            await fetch(
                "/admin-reports/check",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        return (
            response.ok &&
            data.success === true &&
            data.isAdmin === true
        );

    } catch (error) {

        console.error(
            "Admin check error:",
            error
        );

        return false;
    }
}


async function addAdminMenuButton() {

    const nav =
        document.querySelector(".side-nav");

    if (!nav) return;

    const isAdmin =
        await isUltraAIAdmin();

    if (!isAdmin) return;

    if (
        document.getElementById(
            "adminMenuButton"
        )
    ) {
        return;
    }

    const button =
        document.createElement("button");

    button.id =
        "adminMenuButton";

    button.innerHTML = `
        <span>👑</span>
        <b>الإدارة</b>
    `;

    button.onclick = function () {

        closePageMenu();

        setTimeout(() => {

            loadPage("admin");

        }, 120);
    };

    nav.appendChild(button);
}

/* =========================================
   ADMIN PAGE
========================================= */

async function loadAdminPage() {

    if (!(await isUltraAIAdmin())) {

        alert(
            "🚫 غير مسموح لك بالدخول إلى لوحة الإدارة."
        );

        loadPage("home");

        return;
    }

    await loadAdminReports();
    await loadAdminUsers();
    await loadAdminBannedUsers();
}


/* =========================================
   REPORTS
========================================= */

async function loadAdminReports() {

    const list =
        document.getElementById(
            "adminReportsList"
        );

    if (!list) return;

    const token =
        localStorage.getItem("token");

    list.innerHTML = `
        <div class="admin-loading">
            جاري تحميل الإبلاغات...
        </div>
    `;

    try {

        const response =
            await fetch(
                "/admin-reports",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (response.status === 401) {

            list.innerHTML = `
                <div class="admin-error">
                    جلسة الدخول غير صالحة.
                </div>
            `;

            return;
        }

        if (response.status === 403) {

            list.innerHTML = `
                <div class="admin-error">
                    🚫 غير مسموح لك.
                </div>
            `;

            return;
        }

        if (!data.success) {

            list.innerHTML = `
                <div class="admin-error">
                    ${escapeAdminHTML(
                        data.message ||
                        "تعذر تحميل الإبلاغات"
                    )}
                </div>
            `;

            return;
        }

        const reports =
            Array.isArray(data.reports)
                ? data.reports
                : [];

        const total =
            document.getElementById(
                "adminReports"
            );

        const pending =
            document.getElementById(
                "adminPending"
            );

        if (total)
            total.textContent = reports.length;

        if (pending) {

            pending.textContent =
                reports.filter(
                    r =>
                        r.status === "pending"
                ).length;
        }

        if (!reports.length) {

            list.innerHTML = `
                <div class="admin-empty">
                    <div>✅</div>
                    <strong>لا توجد إبلاغات</strong>
                    <p>حالياً ما كاين حتى بلاغ.</p>
                </div>
            `;

            return;
        }

        list.innerHTML =
            reports
                .slice()
                .reverse()
                .map(createReportCard)
                .join("");

    } catch (error) {

        console.error(
            "Admin reports error:",
            error
        );

        list.innerHTML = `
            <div class="admin-error">
                تعذر الاتصال بالسيرفر.
            </div>
        `;
    }
}


/* =========================================
   USERS
========================================= */

async function loadAdminUsers() {

    const list =
        document.getElementById(
            "adminUsersList"
        );

    const count =
        document.getElementById(
            "adminUsers"
        );

    if (!list) return;

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch(
                "/admin-reports/users",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            list.innerHTML = `
                <div class="admin-error">
                    ${
                        escapeAdminHTML(
                            data.message ||
                            "تعذر تحميل الحسابات"
                        )
                    }
                </div>
            `;

            return;
        }

        const users =
            Array.isArray(data.users)
                ? data.users
                : [];

    adminUsersCache = users;

    setupAdminUserSearch();

        if (count)
            count.textContent = users.length;

        if (!users.length) {

            list.innerHTML = `
                <div class="admin-empty">
                    لا توجد حسابات.
                </div>
            `;

            return;
        }

        filterAdminUsers();

    } catch (error) {

        console.error(
            "Admin users error:",
            error
        );

        list.innerHTML = `
            <div class="admin-error">
                تعذر الاتصال بالسيرفر.
            </div>
        `;
    }
}



/* =========================================
   USER SEARCH + FILTER
========================================= */

let adminUsersCache = [];

function setupAdminUserSearch() {
    const list = document.getElementById("adminUsersList");
    if (!list || document.getElementById("adminUsersSearchBox")) return;

    const box = document.createElement("div");

    box.id = "adminUsersSearchBox";

    box.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 15px;">
            <input
                id="adminUserSearch"
                type="search"
                placeholder="🔎 بحث بالاسم أو الإيميل أو ID..."
                oninput="filterAdminUsers()"
                style="flex:1;min-width:220px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:inherit;outline:none;"
            >

            <select
                id="adminUserStatusFilter"
                onchange="filterAdminUsers()"
                style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:inherit;outline:none;"
            >
                <option value="all">👥 الكل</option>
                <option value="active">🟢 نشط</option>
                <option value="banned">🔴 محظور</option>
            </select>

            <button
                type="button"
                onclick="clearAdminUserSearch()"
                style="padding:12px 16px;border:0;border-radius:12px;cursor:pointer;"
            >
                🔄 مسح
            </button>
        </div>

        <div id="adminUserSearchCount"
             style="margin-bottom:12px;opacity:.75;font-size:13px;">
        </div>
    `;

    list.parentNode.insertBefore(box, list);
}

function filterAdminUsers() {
    const searchInput = document.getElementById("adminUserSearch");
    const statusFilter = document.getElementById("adminUserStatusFilter");
    const count = document.getElementById("adminUserSearchCount");
    const list = document.getElementById("adminUsersList");

    if (!list) return;

    const query = String(searchInput?.value || "").trim().toLowerCase();
    const status = statusFilter?.value || "all";

    const filtered = adminUsersCache.filter(user => {
        const username = String(user.username || "").toLowerCase();
        const email = String(user.email || "").toLowerCase();
        const id = String(user.id || "").toLowerCase();

        const matchesSearch =
            !query ||
            username.includes(query) ||
            email.includes(query) ||
            id.includes(query);

        const matchesStatus =
            status === "all" ||
            (status === "banned" && user.banned === true) ||
            (status === "active" && user.banned !== true);

        return matchesSearch && matchesStatus;
    });

    if (count) {
        count.textContent =
            `عرض ${filtered.length} من ${adminUsersCache.length} حساب`;
    }

    if (!filtered.length) {
        list.innerHTML = `
            <div class="admin-empty">
                <div>🔎</div>
                <strong>ما لقيّنا حتى حساب</strong>
                <p>جرب اسم أو إيميل أو ID آخر.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(createUserCard).join("");
}

function clearAdminUserSearch() {
    const searchInput = document.getElementById("adminUserSearch");
    const statusFilter = document.getElementById("adminUserStatusFilter");

    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";

    filterAdminUsers();
}

/* =========================================
   USER CARD
========================================= */

function openAdminUserDetails(userId) {
    const user = adminUsersCache.find(
        u => String(u.id) === String(userId)
    );

    if (!user) {
        alert("الحساب غير موجود.");
        return;
    }

    const existing = document.getElementById("adminUserDetailsModal");
    if (existing) existing.remove();

    const username = escapeAdminHTML(user.username || "-");
    const email = escapeAdminHTML(user.email || "-");
    const phone = escapeAdminHTML(user.phone || "-");
    const id = escapeAdminHTML(String(user.id || "-"));

    const created = user.createdAt
        ? new Date(user.createdAt).toLocaleString("ar-MA")
        : "-";

    const status = user.banned === true
        ? "🔴 محظور"
        : "🟢 نشط";

    const notificationsCount =
        Array.isArray(user.notifications)
            ? user.notifications.length
            : 0;

    const unreadNotificationsCount =
        Array.isArray(user.notifications)
            ? user.notifications.filter(
                n => n && n.read !== true
            ).length
            : 0;

    const lastActivity =
        user.lastActivityAt ||
        user.updatedAt ||
        user.lastLoginAt ||
        null;

    const lastActivityText =
        lastActivity
            ? new Date(lastActivity).toLocaleString("ar-MA")
            : "غير متوفر";


    const modal = document.createElement("div");
    modal.id = "adminUserDetailsModal";
    modal.className = "admin-user-details-modal";

    modal.innerHTML = `
        <div class="admin-user-details-overlay"
             onclick="closeAdminUserDetails()"></div>

        <div class="admin-user-details-card">
            <button
                type="button"
                class="admin-user-details-close"
                onclick="closeAdminUserDetails()">
                ✕
            </button>

            <div class="admin-user-details-icon">👤</div>

            <h2>${username}</h2>

            <div class="admin-user-detail-row">
                <span>📧 البريد</span>
                <strong>${email}</strong>
            </div>

            <div class="admin-user-detail-row">
                <span>📱 الهاتف</span>
                <strong>${phone}</strong>
            </div>

            <div class="admin-user-detail-row">
                <span>🆔 ID</span>
                <strong>${id}</strong>
            </div>

            <div class="admin-user-detail-row">
                <span>📅 التسجيل</span>
                <strong>${escapeAdminHTML(created)}</strong>
            </div>

            <div class="admin-user-detail-row">
                <span>الحالة</span>
                <strong>${status}</strong>
            </div>

            <div class="admin-user-detail-row">
                <span>🔔 التنبيهات</span>
                <strong>${notificationsCount}</strong>
            </div>

            <div class="admin-user-detail-row">
                <span>🔴 غير المقروءة</span>
                <strong>${unreadNotificationsCount}</strong>
            </div>

            <div class="admin-user-detail-row">
                <span>🕐 آخر نشاط</span>
                <strong>${escapeAdminHTML(lastActivityText)}</strong>
            </div>

            <div class="admin-user-details-actions">
                <button
                    type="button"
                    onclick="warnAdminUser('${id}'); closeAdminUserDetails();">
                    ⚠️ إرسال تنبيه
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    loadAdminUserStats(userId);


}


async function loadAdminUserStats(userId) {
    const conversationsEl =
        document.getElementById(
            "adminUserConversationsCount"
        );

    if (conversationsEl) {
        conversationsEl.textContent = "جاري...";
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        if (conversationsEl) conversationsEl.textContent = "-";
        return;
    }

    try {
        const response = await fetch(
            `/admin-reports/users/${encodeURIComponent(userId)}/stats`,
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            if (conversationsEl) {
                conversationsEl.textContent = "-";
            }

            console.error(
                "Admin user stats error:",
                data.message
            );

            return;
        }

        const stats =
            data.stats || {};

        if (conversationsEl) {
            conversationsEl.textContent =
                String(stats.conversations ?? 0);
        }

    } catch (error) {
        if (conversationsEl) {
            conversationsEl.textContent = "-";
        }

        if (notificationsEl) {
            notificationsEl.textContent = "-";
        }

        if (unreadNotificationsEl) {
            unreadNotificationsEl.textContent = "-";
        }

        console.error(
            "Admin user stats request error:",
            error
        );
    }
}

function closeAdminUserDetails() {
    const modal = document.getElementById("adminUserDetailsModal");
    if (modal) modal.remove();
}

window.openAdminUserDetails = openAdminUserDetails;
window.closeAdminUserDetails = closeAdminUserDetails;

function createUserCard(user) {

    const username =
        escapeAdminHTML(
            user.username || "-"
        );

    const email =
        escapeAdminHTML(
            user.email || "-"
        );

    const id =
        escapeAdminHTML(
            String(user.id || "-")
        );

    const created =
        user.createdAt
            ? new Date(
                user.createdAt
            ).toLocaleString("ar-MA")
            : "-";

    const isMe =
        String(user.id) ===
        String(
            getAdminTokenPayload()?.id
        );

    const banned =
        user.banned === true;

    let action = "";

    if (isMe) {

        action = `
            <span class="admin-user-admin">
                👑 Admin
            </span>
        `;

    } else if (banned) {

        action = `
            <button
                class="admin-ban-button admin-unban"
                onclick="unbanAdminUser('${id}')">
                🔓 فك الحظر
            </button>
        `;

    } else {

        action = `
            <button
                class="admin-ban-button"
                onclick="banAdminUser('${id}')">
                🚫 حظر
            </button>
        `;
    }

    return `
        <div class="admin-user-card">

            <div class="admin-user-avatar">
                👤
            </div>

            <div class="admin-user-data">

                <strong>
                    ${username}
                </strong>

                <span>
                    ${email}
                </span>

                <small>
                    ID: ${id}
                </small>

                <small>
                    التسجيل: ${created}
                </small>

                ${
                    banned
                        ? `
                        <small class="admin-banned-status">
                            🔴 الحساب محظور
                        </small>
                        `
                        : `
                        <small class="admin-active-status">
                            🟢 الحساب نشط
                        </small>
                        `
                }

                <div class="admin-user-actions">
                    <button
                                                                      type="button"
                                                                      class="admin-user-details-button"
                                                                      onclick="openAdminUserDetails('${id}')">
                                                                      👁️ تفاصيل
                                                                  </button>

                                                                  ${action}
                </div>

            </div>

        </div>
    `;
}


async function banAdminUser(userId) {

    if (!confirm(
        "⚠️ واش متأكد بغيتي تحظر هاد الحساب؟"
    )) {
        return;
    }

    await changeAdminBanStatus(
        userId,
        "ban"
    );
}


async function unbanAdminUser(userId) {

    if (!confirm(
        "واش بغيتي تفك الحظر على هاد الحساب؟"
    )) {
        return;
    }

    await changeAdminBanStatus(
        userId,
        "unban"
    );
}


async function changeAdminBanStatus(
    userId,
    action
) {

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("خاصك تسجل الدخول.");
        return;
    }

    try {

        const response =
            await fetch(
                `/admin-reports/users/${encodeURIComponent(userId)}/${action}`,
                {
                    method: "POST",
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            alert(
                data.message ||
                "تعذر تنفيذ العملية."
            );

            return;
        }

        alert(
            data.message ||
            "تم تنفيذ العملية بنجاح."
        );

        await loadAdminUsers();
        await loadAdminBannedUsers();

    } catch (error) {

        console.error(
            "Admin ban action error:",
            error
        );

        alert(
            "تعذر الاتصال بالسيرفر."
        );
    }
}


/* =========================================
   REPORT CARD
========================================= */

function createReportCard(report) {

    const reason =
        escapeAdminHTML(
            report.reason || "بدون سبب"
        );

    const message =
        escapeAdminHTML(
            report.originalMessage?.message ||
            report.message ||
            "بدون نص"
        );

    const reporter =
        report.reporter || null;

    const owner =
        report.messageOwner || null;

    const reporterName =
        escapeAdminHTML(
            reporter?.username || report.userId || "مستخدم غير معروف"
        );

    const ownerName =
        escapeAdminHTML(
            owner?.username ||
            report.originalMessage?.username ||
            "مستخدم غير معروف"
        );

    const reporterId =
        escapeAdminHTML(
            String(
                reporter?.id ||
                report.userId ||
                "-"
            )
        );

    const ownerId =
        escapeAdminHTML(
            String(
                owner?.id ||
                report.originalMessage?.userId ||
                "-"
            )
        );

    const messageId =
        escapeAdminHTML(
            String(
                report.originalMessage?.id ||
                report.messageId ||
                "-"
            )
        );

    const status =
        report.status || "pending";

    const statusText =
        status === "pending"
            ? "🔴 معلق"
            : status === "resolved"
                ? "🟢 تمت المعالجة"
                : escapeAdminHTML(status);

    const date =
        report.createdAt
            ? new Date(
                report.createdAt
            ).toLocaleString("ar-MA")
            : "-";

    const ownerBanned =
        owner?.banned === true;

    const safeReportId =
        escapeAdminHTML(
            String(report.id || "")
        );

    const safeOwnerId =
        escapeAdminHTML(
            String(
                owner?.id ||
                report.originalMessage?.userId ||
                ""
            )
        );

    return `
        <article class="admin-report-card">

            <div class="admin-report-top">

                <strong>
                    🚩 بلاغ عن رسالة
                </strong>

                <span class="admin-status">
                    ${statusText}
                </span>

            </div>

            <div class="admin-report-reason">
                ⚠️ <strong>سبب البلاغ:</strong>
                ${reason}
            </div>

            <div class="admin-report-message">

                <small>💬 الرسالة المبلّغ عنها</small>

                <div class="admin-report-message-text">
                    ${message}
                </div>

            </div>

            <div class="admin-report-info">

                <div>
                    <small>👤 المبلّغ</small>
                    <span>
                        ${reporterName}
                        <br>
                        <small>ID: ${reporterId}</small>
                    </span>
                </div>

                <div>
                    <small>👤 صاحب الرسالة</small>
                    <span>
                        ${ownerName}
                        <br>
                        <small>ID: ${ownerId}</small>
                    </span>
                </div>

                <div>
                    <small>🆔 رقم الرسالة</small>
                    <span>${messageId}</span>
                </div>

                <div>
                    <small>🕐 التاريخ</small>
                    <span>${escapeAdminHTML(date)}</span>
                </div>

            </div>

            <div class="admin-report-actions">

                ${
                    ownerId
                        ? ownerBanned
                            ? `
                                <button
                                    class="admin-ban-button admin-unban"
                                    type="button"
                                    onclick="unbanAdminUser('${safeOwnerId}')"
                                >
                                    🔓 فك الحظر
                                </button>
                            `
                            : `
                                <button
                                    class="admin-ban-button"
                                    type="button"
                                    onclick="banAdminUser('${safeOwnerId}')"
                                >
                                    🚫 حظر
                                </button>
                            `
                        : ""
                }

                ${
                    ownerId
                        ? `
                            <button
                                class="admin-warning-button"
                                type="button"
                                onclick="warnAdminUser('${safeOwnerId}')"
                            >
                                ⚠️ تنبيه
                            </button>
                        `
                        : ""
                }

                ${
                    status === "pending"
                        ? `
                            <button
                                class="admin-resolve-button"
                                type="button"
                                onclick="resolveAdminReport('${safeReportId}')"
                            >
                                ✅ معالجة البلاغ
                            </button>
                        `
                        : `
                            <span class="admin-resolved-label">
                                ✅ تمت معالجة البلاغ
                            </span>
                        `
                }

            </div>

        </article>
    `;
}


/* =========================================
   REPORT ACTIONS
========================================= */

async function warnAdminUser(userId) {

    const message =
        prompt(
            "اكتب رسالة التنبيه للمستخدم:",
            "⚠️ تنبيه من إدارة UltraAI: المرجو احترام قوانين التطبيق."
        );

    if (message === null) return;

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch(
                "/admin-reports/users/" +
                encodeURIComponent(userId) +
                "/warn",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body: JSON.stringify({
                        message: message
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            alert(
                data.message ||
                "تعذر إرسال التنبيه."
            );

            return;
        }

        alert(
            data.message ||
            "تم إرسال التنبيه."
        );

    } catch (error) {

        console.error(
            "Admin warning action error:",
            error
        );

        alert(
            "تعذر الاتصال بالسيرفر."
        );
    }
}


async function resolveAdminReport(reportId) {

    if (
        !confirm(
            "واش متأكد بغيتي تعلم هاد البلاغ بأنه تمت معالجته؟"
        )
    ) {
        return;
    }

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch(
                "/admin-reports/" +
                encodeURIComponent(reportId) +
                "/resolve",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            alert(
                data.message ||
                "تعذر معالجة البلاغ."
            );

            return;
        }

        alert(
            data.message ||
            "تمت معالجة البلاغ."
        );

        await loadAdminReports();

        if (
            typeof loadAdminPendingPage ===
            "function"
        ) {
            await loadAdminPendingPage();
        }

    } catch (error) {

        console.error(
            "Admin resolve report error:",
            error
        );

        alert(
            "تعذر الاتصال بالسيرفر."
        );
    }
}


window.warnAdminUser =
    warnAdminUser;

window.resolveAdminReport =
    resolveAdminReport;


/* =========================================
   SECURITY
========================================= */

function escapeAdminHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


window.loadAdminPage =
    loadAdminPage;

window.loadAdminReports =
    loadAdminReports;

window.loadAdminUsers =
    loadAdminUsers;

window.addAdminMenuButton =
    addAdminMenuButton;


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setTimeout(
            addAdminMenuButton,
            300
        );

    }
);

/* =========================================
   BANNED USERS
========================================= */

async function loadAdminBannedUsers() {

    const list =
        document.getElementById("adminBannedUsersList");

    if (!list) return;

    const token =
        localStorage.getItem("token");

    if (!token) return;

    list.innerHTML = `
        <div class="admin-loading">
            جاري تحميل الحسابات المحظورة...
        </div>
    `;

    try {

        const response =
            await fetch("/admin-reports/users", {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            });

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            list.innerHTML = `
                <div class="admin-error">
                    ${escapeAdminHTML(
                        data.message ||
                        "تعذر تحميل الحسابات المحظورة"
                    )}
                </div>
            `;

            return;
        }

        const bannedUsers =
            Array.isArray(data.users)
                ? data.users.filter(
                    user => user.banned === true
                )
                : [];

        if (!bannedUsers.length) {

            list.innerHTML = `
                <div class="admin-empty">
                    <div>✅</div>
                    <strong>لا توجد حسابات محظورة</strong>
                    <p>حالياً ما كاين حتى حساب محظور.</p>
                </div>
            `;

            return;
        }

        list.innerHTML =
            bannedUsers
                .map(createUserCard)
                .join("");

    } catch (error) {

        console.error(
            "Admin banned users error:",
            error
        );

        list.innerHTML = `
            <div class="admin-error">
                تعذر الاتصال بالسيرفر.
            </div>
        `;
    }
}

window.loadAdminBannedUsers =
    loadAdminBannedUsers;


/* =========================================
   ADMIN SUB PAGES
========================================= */

async function adminFetchUsers() {

    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("NO_TOKEN");
    }

    const response = await fetch(
        "/admin-reports/users",
        {
            headers: {
                "Authorization":
                    "Bearer " + token
            }
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "تعذر تحميل الحسابات"
        );
    }

    return Array.isArray(data.users)
        ? data.users
        : [];
}


/* =========================================
   USERS PAGE
========================================= */

async function loadAdminUsersPage() {

    if (!(await isUltraAIAdmin())) {

        alert(
            "🚫 غير مسموح لك بالدخول إلى لوحة الإدارة."
        );

        loadPage("home");
        return;
    }

    const list =
        document.getElementById(
            "adminUsersList"
        );

    if (!list) return;

    list.innerHTML = `
        <div class="admin-loading">
            جاري تحميل الحسابات...
        </div>
    `;

    try {

        const users =
            await adminFetchUsers();

        const activeUsers =
            users.filter(
                user => user.banned !== true
            );

        const adminId =
            getAdminTokenPayload()?.id;

        const visibleUsers =
            activeUsers.filter(
                user =>
                    String(user.id) !==
                    String(adminId)
            );

        if (!visibleUsers.length) {

            list.innerHTML = `
                <div class="admin-empty">
                    <div>👥</div>
                    <strong>
                        لا توجد حسابات
                    </strong>
                </div>
            `;

            return;
        }

        adminUsersCache = visibleUsers;

        list.innerHTML =
            visibleUsers
                .map(createUserCard)
                .join("");

    } catch (error) {

        console.error(
            "Admin users page:",
            error
        );

        list.innerHTML = `
            <div class="admin-error">
                تعذر تحميل الحسابات.
            </div>
        `;
    }
}


/* =========================================
   REPORTS PAGE
========================================= */

async function adminFetchReports() {

    const token =
        localStorage.getItem("token");

    const response =
        await fetch(
            "/admin-reports",
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok || !data.success) {

        throw new Error(
            data.message ||
            "تعذر تحميل الإبلاغات"
        );
    }

    return Array.isArray(data.reports)
        ? data.reports
        : [];
}


async function loadAdminReportsPage() {

    if (!(await isUltraAIAdmin())) {

        alert(
            "🚫 غير مسموح لك بالدخول إلى لوحة الإدارة."
        );

        loadPage("home");
        return;
    }

    const list =
        document.getElementById(
            "adminReportsList"
        );

    if (!list) return;

    list.innerHTML = `
        <div class="admin-loading">
            جاري تحميل الإبلاغات...
        </div>
    `;

    try {

        const reports =
            await adminFetchReports();

        if (!reports.length) {

            list.innerHTML = `
                <div class="admin-empty">
                    <div>✅</div>
                    <strong>
                        لا توجد إبلاغات
                    </strong>
                </div>
            `;

            return;
        }

        list.innerHTML =
            reports
                .slice()
                .reverse()
                .map(createReportCard)
                .join("");

    } catch (error) {

        console.error(
            "Admin reports page:",
            error
        );

        list.innerHTML = `
            <div class="admin-error">
                تعذر تحميل الإبلاغات.
            </div>
        `;
    }
}


/* =========================================
   PENDING REPORTS PAGE
========================================= */

async function loadAdminPendingPage() {

    if (!(await isUltraAIAdmin())) {

        alert(
            "🚫 غير مسموح لك بالدخول إلى لوحة الإدارة."
        );

        loadPage("home");
        return;
    }

    const list =
        document.getElementById(
            "adminPendingReportsList"
        );

    if (!list) return;

    list.innerHTML = `
        <div class="admin-loading">
            جاري تحميل البلاغات المعلقة...
        </div>
    `;

    try {

        const reports =
            await adminFetchReports();

        const pending =
            reports.filter(
                report =>
                    report.status ===
                    "pending"
            );

        if (!pending.length) {

            list.innerHTML = `
                <div class="admin-empty">
                    <div>✅</div>
                    <strong>
                        لا توجد بلاغات معلقة
                    </strong>
                    <p>
                        جميع البلاغات تمت مراجعتها.
                    </p>
                </div>
            `;

            return;
        }

        list.innerHTML =
            pending
                .slice()
                .reverse()
                .map(createReportCard)
                .join("");

    } catch (error) {

        console.error(
            "Admin pending page:",
            error
        );

        list.innerHTML = `
            <div class="admin-error">
                تعذر تحميل البلاغات المعلقة.
            </div>
        `;
    }
}


/* =========================================
   BANNED USERS PAGE
========================================= */

async function loadAdminBannedPage() {

    if (!(await isUltraAIAdmin())) {

        alert(
            "🚫 غير مسموح لك بالدخول إلى لوحة الإدارة."
        );

        loadPage("home");
        return;
    }

    const list =
        document.getElementById(
            "adminBannedUsersList"
        );

    if (!list) return;

    list.innerHTML = `
        <div class="admin-loading">
            جاري تحميل الحسابات المحظورة...
        </div>
    `;

    try {

        const users =
            await adminFetchUsers();

        const bannedUsers =
            users.filter(
                user =>
                    user.banned === true
            );

        if (!bannedUsers.length) {

            list.innerHTML = `
                <div class="admin-empty">
                    <div>✅</div>
                    <strong>
                        لا توجد حسابات محظورة
                    </strong>
                    <p>
                        حالياً ما كاين حتى حساب محظور.
                    </p>
                </div>
            `;

            return;
        }

        list.innerHTML =
            bannedUsers
                .map(createUserCard)
                .join("");

    } catch (error) {

        console.error(
            "Admin banned page:",
            error
        );

        list.innerHTML = `
            <div class="admin-error">
                تعذر تحميل الحسابات المحظورة.
            </div>
        `;
    }
}


/* =========================================
   DASHBOARD COUNTS
========================================= */

async function loadAdminDashboardCounts() {

    try {

        const users =
            await adminFetchUsers();

        const reports =
            await adminFetchReports();

        const adminId =
            getAdminTokenPayload()?.id;

        const usersCount =
            users.filter(
                user =>
                    String(user.id) !==
                    String(adminId)
            ).length;

        const bannedCount =
            users.filter(
                user =>
                    user.banned === true
            ).length;

        const pendingCount =
            reports.filter(
                report =>
                    report.status ===
                    "pending"
            ).length;

        const usersEl =
            document.getElementById(
                "adminUsers"
            );

        const reportsEl =
            document.getElementById(
                "adminReports"
            );

        const pendingEl =
            document.getElementById(
                "adminPending"
            );

        const bannedEl =
            document.getElementById(
                "adminBanned"
            );

        if (usersEl)
            usersEl.textContent =
                usersCount;

        if (reportsEl)
            reportsEl.textContent =
                reports.length;

        if (pendingEl)
            pendingEl.textContent =
                pendingCount;

        if (bannedEl)
            bannedEl.textContent =
                bannedCount;

    } catch (error) {

        console.error(
            "Admin dashboard counts:",
            error
        );
    }
}


/* =========================================
   UPDATE ADMIN PAGE
========================================= */

const originalLoadAdminPage =
    loadAdminPage;

loadAdminPage = async function () {

    if (!(await isUltraAIAdmin())) {

        alert(
            "🚫 غير مسموح لك بالدخول إلى لوحة الإدارة."
        );

        loadPage("home");

        return;
    }

    await loadAdminDashboardCounts();
};


window.loadAdminUsersPage =
    loadAdminUsersPage;

window.loadAdminReportsPage =
    loadAdminReportsPage;

window.loadAdminPendingPage =
    loadAdminPendingPage;

window.loadAdminBannedPage =
    loadAdminBannedPage;


/*
 * =========================================
 * ADMIN BROADCAST
 * =========================================
 */

async function sendAdminBroadcast() {

    if (!(await isUltraAIAdmin())) {

        alert(
            "🚫 غير مسموح لك."
        );

        return;

    }


    const input =
        document.getElementById(
            "adminBroadcastMessage"
        );


    const status =
        document.getElementById(
            "adminBroadcastStatus"
        );


    if (!input) return;


    const message =
        String(
            input.value || ""
        ).trim();


    if (!message) {

        alert(
            "كتب الرسالة أولاً."
        );

        return;

    }


    if (message.length > 2000) {

        alert(
            "الرسالة طويلة بزاف."
        );

        return;

    }


    const token =
        localStorage.getItem(
            "token"
        );


    if (!token) {

        alert(
            "خاصك تسجل الدخول."
        );

        return;

    }


    const button =
        document.querySelector(
            ".admin-broadcast-button"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "⏳ جاري الإرسال...";

    }


    if (status) {

        status.textContent =
            "🤖 جاري تجهيز الترجمات وإرسال الرسالة...";

    }


    try {

        const response =
            await fetch(
                "/admin-broadcast",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token

                    },

                    body:
                        JSON.stringify({
                            message
                        })

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "تعذر إرسال الرسالة"
            );

        }


        input.value = "";


        if (status) {

            status.textContent =
                "✅ تم إرسال الرسالة لجميع المستخدمين.";

        }


        alert(
            "✅ وصلت رسالة الإدارة لجميع المستخدمين."
        );


    } catch (error) {

        console.error(
            "ADMIN BROADCAST ERROR:",
            error
        );


        if (status) {

            status.textContent =
                "❌ " +
                (
                    error.message ||
                    "تعذر إرسال الرسالة"
                );

        }


        alert(
            error.message ||
            "تعذر إرسال الرسالة."
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "📢 إرسال للجميع";

        }

    }

}


window.sendAdminBroadcast =
    sendAdminBroadcast;
