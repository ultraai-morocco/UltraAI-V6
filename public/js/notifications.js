/* =========================================
   ULTRAAI NOTIFICATIONS
   ========================================= */

async function loadNotifications() {
    const list = document.getElementById("notificationsList");
    const countEl = document.getElementById("notificationsUnreadCount");

    const token = localStorage.getItem("token");

    if (!token) {
        if (list) {
            list.innerHTML = `
                <div class="notifications-empty">
                    🔐 خاصك تسجل الدخول باش تشوف الإشعارات.
                </div>
            `;
        }
        return;
    }

    if (list) {
        list.innerHTML = `
            <div class="notifications-loading">
                جاري تحميل الإشعارات...
            </div>
        `;
    }

    try {
        const response = await fetch("/notifications", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "تعذر تحميل الإشعارات"
            );
        }

        const notifications =
            Array.isArray(data.notifications)
                ? data.notifications
                : [];

        updateNotificationBadge(
            Number(data.unreadCount || 0)
        );

        if (!list) return;

        if (!notifications.length) {
            list.innerHTML = `
                <div class="notifications-empty">
                    <div class="notifications-empty-icon">🔔</div>
                    <strong>ما عندك حتى إشعار</strong>
                    <span>غادي يبان هنا أي تنبيه جديد من UltraAI.</span>
                </div>
            `;
            return;
        }

        list.innerHTML = notifications
            .map(renderNotification)
            .join("");

    } catch (error) {
        console.error(
            "Notifications error:",
            error
        );

        if (list) {
            list.innerHTML = `
                <div class="notifications-error">
                    ❌ تعذر تحميل الإشعارات
                </div>
            `;
        }
    }
}

function renderNotification(notification) {
    const id = escapeNotificationHTML(
        String(notification.id || "")
    );

    const title = escapeNotificationHTML(
        notification.title || "إشعار"
    );

    const message = escapeNotificationHTML(
        notification.message || ""
    );

    const createdAt = notification.createdAt
        ? formatNotificationDate(notification.createdAt)
        : "";

    const unread =
        notification.read !== true;

    return `
        <div
            class="notification-card ${unread ? "unread" : ""}"
            data-notification-id="${id}"
        >
            <div class="notification-icon">
                ${unread ? "🔴" : "🔔"}
            </div>

            <div class="notification-content">
                <strong>${title}</strong>

                <p>${message}</p>

                <small>${createdAt}</small>
            </div>

            ${
                unread
                    ? `
                    <button
                        type="button"
                        class="notification-read-button"
                        onclick="markNotificationRead('${id}')"
                    >
                        ✓
                    </button>
                    `
                    : ""
            }
        </div>
    `;
}

async function markNotificationRead(id) {
    const token = localStorage.getItem("token");

    if (!token || !id) return;

    try {
        const response = await fetch(
            `/notifications/${encodeURIComponent(id)}/read`,
            {
                method: "POST",
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
                "تعذر تحديث الإشعار"
            );
        }

        await loadNotifications();
        await updateNotificationBadgeFromServer();

    } catch (error) {
        console.error(
            "Mark notification read error:",
            error
        );
    }
}

async function markAllNotificationsRead() {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
        const response = await fetch(
            "/notifications/read-all",
            {
                method: "POST",
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
                "تعذر تحديث الإشعارات"
            );
        }

        await loadNotifications();
        updateNotificationBadge(0);

    } catch (error) {
        console.error(
            "Read all notifications error:",
            error
        );
    }
}

async function updateNotificationBadgeFromServer() {
    const token = localStorage.getItem("token");

    if (!token) {
        updateNotificationBadge(0);
        return;
    }

    try {
        const response = await fetch(
            "/notifications",
            {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (
            response.ok &&
            data.success
        ) {
            updateNotificationBadge(
                Number(data.unreadCount || 0)
            );
        }
    } catch (error) {
        console.error(
            "Notification badge error:",
            error
        );
    }
}


/* =========================================
   NOTIFICATIONS PANEL
   ========================================= */

function openNotificationsPanel() {
    let panel = document.getElementById("ultraNotificationsPanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "ultraNotificationsPanel";
        panel.className = "ultra-notifications-panel";

        panel.innerHTML = `
            <div class="ultra-notifications-overlay"
                 onclick="closeNotificationsPanel()"></div>

            <div class="ultra-notifications-card">

                <div class="ultra-notifications-header">
                    <div>
                        <strong>🔔 الإشعارات</strong>
                        <span>تنبيهات UltraAI</span>
                    </div>

                    <button
                        type="button"
                        class="ultra-notifications-close"
                        onclick="closeNotificationsPanel()">
                        ×
                    </button>
                </div>

                <div class="ultra-notifications-actions">
                    <button
                        type="button"
                        onclick="markAllNotificationsRead()">
                        ✓ قراءة الكل
                    </button>
                </div>

                <div id="notificationsList">
                    <div class="notifications-loading">
                        جاري تحميل الإشعارات...
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(panel);
    }

    panel.classList.add("open");
    loadNotifications();
}

function closeNotificationsPanel() {
    const panel =
        document.getElementById("ultraNotificationsPanel");

    if (panel) {
        panel.classList.remove("open");
    }
}

window.openNotificationsPanel =
    openNotificationsPanel;

window.closeNotificationsPanel =
    closeNotificationsPanel;

function updateNotificationBadge(count) {
    const badge =
        document.getElementById(
            "notificationBadge"
        );

    if (!badge) return;

    const value = Number(count || 0);

    if (value > 0) {
        badge.textContent =
            value > 99 ? "99+" : String(value);

        badge.style.display = "flex";
    } else {
        badge.textContent = "";
        badge.style.display = "none";
    }
}

function formatNotificationDate(value) {
    try {
        return new Date(value)
            .toLocaleString("ar-MA");
    } catch {
        return String(value || "");
    }
}

function escapeNotificationHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.loadNotifications =
    loadNotifications;

window.markNotificationRead =
    markNotificationRead;

window.markAllNotificationsRead =
    markAllNotificationsRead;

window.updateNotificationBadge =
    updateNotificationBadge;

window.updateNotificationBadgeFromServer =
    updateNotificationBadgeFromServer;
