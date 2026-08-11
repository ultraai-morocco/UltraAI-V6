let adminInboxMessages = [];

function adminInboxEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getAdminInboxLanguage() {
    const lang =
        localStorage.getItem("language") ||
        localStorage.getItem("lang") ||
        "ar";

    if (lang === "fr") return "fr";
    if (lang === "en") return "en";

    return "ar";
}

function getAdminInboxText(message) {
    const lang = getAdminInboxLanguage();

    if (
        message.translations &&
        message.translations[lang]
    ) {
        return message.translations[lang];
    }

    return message.message || "";
}

async function loadAdminInbox() {

    const list =
        document.getElementById("adminInboxList");

    const status =
        document.getElementById("adminInboxStatus");

    if (!list) return;

    const token =
        localStorage.getItem("token");

    if (!token) {
        list.innerHTML = `
            <div class="admin-inbox-empty">
                <div>🔐</div>
                <p>خاصك تسجل الدخول أولاً.</p>
            </div>
        `;

        if (status) status.textContent = "";
        return;
    }

    try {

        const response = await fetch(
            "/admin-inbox",
            {
                headers: {
                    Authorization:
                        "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "تعذر تحميل الرسائل."
            );
        }

        adminInboxMessages =
            data.messages || [];

        renderAdminInbox();

    } catch (error) {

        console.error(
            "Admin inbox error:",
            error
        );

        if (status) {
            status.textContent =
                "❌ " + error.message;
        }

        list.innerHTML = "";
    }
}

function renderAdminInbox() {

    const list =
        document.getElementById("adminInboxList");

    const status =
        document.getElementById("adminInboxStatus");

    if (!list) return;

    if (!adminInboxMessages.length) {

        if (status) {
            status.textContent = "";
        }

        list.innerHTML = `
            <div class="admin-inbox-empty">
                <div>📭</div>
                <h3>ما عندك حتى رسالة</h3>
                <p>رسائل الإدارة غادي تظهر هنا.</p>
            </div>
        `;

        return;
    }

    if (status) {
        const unread =
            adminInboxMessages.filter(
                m => !m.read
            ).length;

        status.textContent =
            unread > 0
                ? `🔴 عندك ${unread} رسالة جديدة`
                : "✓ جميع الرسائل مقروءة";
    }

    list.innerHTML =
        adminInboxMessages
            .map(message => {

                const text =
                    getAdminInboxText(message);

                return `
                    <article
                        class="admin-inbox-card ${
                            message.read
                                ? "is-read"
                                : "is-unread"
                        }"
                        data-message-id="${adminInboxEscape(message.id)}"
                        onclick="openAdminMessage('${adminInboxEscape(message.id)}')"
                    >

                        <div class="admin-inbox-card-top">

                            <div class="admin-inbox-avatar">
                                👑
                            </div>

                            <div class="admin-inbox-meta">

                                <strong>
                                    ${adminInboxEscape(
                                        message.username ||
                                        "UltraAI"
                                    )}
                                </strong>

                                <span>
                                    ${adminInboxEscape(
                                        message.time || ""
                                    )}
                                </span>

                            </div>

                            ${
                                message.read
                                    ? `<span class="admin-inbox-read">✓</span>`
                                    : `<span class="admin-inbox-new">جديدة</span>`
                            }

                        </div>

                        <div class="admin-inbox-card-title">
                            📢 رسالة من الإدارة
                        </div>

                        <p class="admin-inbox-preview">
                            ${adminInboxEscape(text)}
                        </p>

                    </article>
                `;
            })
            .join("");
}

async function openAdminMessage(messageId) {

    const message =
        adminInboxMessages.find(
            m => String(m.id) === String(messageId)
        );

    if (!message) return;

    if (!message.read) {

        try {

            const token =
                localStorage.getItem("token");

            const response =
                await fetch(
                    "/admin-inbox/read",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                "Bearer " + token
                        },

                        body: JSON.stringify({
                            messageId:
                                String(messageId)
                        })
                    }
                );

            const data =
                await response.json();

            if (response.ok && data.success) {
                message.read = true;
            }

        } catch (error) {

            console.error(
                "Admin message read error:",
                error
            );
        }
    }

    showAdminMessageModal(message);
    renderAdminInbox();
}

function showAdminMessageModal(message) {

    const old =
        document.getElementById(
            "adminMessageModal"
        );

    if (old) old.remove();

    const text =
        getAdminInboxText(message);

    const modal =
        document.createElement("div");

    modal.id =
        "adminMessageModal";

    modal.className =
        "admin-message-modal";

    modal.innerHTML = `

        <div
            class="admin-message-overlay"
            onclick="closeAdminMessageModal()">
        </div>

        <div class="admin-message-dialog">

            <button
                class="admin-message-close"
                type="button"
                onclick="closeAdminMessageModal()">
                ×
            </button>

            <div class="admin-message-icon">
                👑
            </div>

            <h2>
                📢 رسالة من الإدارة
            </h2>

            <div class="admin-message-date">
                ${adminInboxEscape(
                    message.time || ""
                )}
            </div>

            <div class="admin-message-body">
                ${adminInboxEscape(text)}
            </div>

            <div class="admin-message-status">
                ✓ مقروءة
            </div>

        </div>
    `;

    document.body.appendChild(modal);
}

function closeAdminMessageModal() {

    const modal =
        document.getElementById(
            "adminMessageModal"
        );

    if (modal) {
        modal.remove();
    }
}

function getAdminInboxUnreadCount() {

    return adminInboxMessages.filter(
        m => !m.read
    ).length;
}

window.loadAdminInbox =
    loadAdminInbox;

window.openAdminMessage =
    openAdminMessage;

window.closeAdminMessageModal =
    closeAdminMessageModal;

window.getAdminInboxUnreadCount =
    getAdminInboxUnreadCount;
