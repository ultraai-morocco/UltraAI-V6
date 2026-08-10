const root = document.getElementById("root");


function makeHeader(target, title, subtitle = "") {

    const el = document.getElementById(target);

    if (!el) return;

    el.innerHTML = `

        <header class="v6-header">

            <button
                class="v6-back"
                type="button"
                onclick="loadPage('home')">
                ←
            </button>

            <div class="v6-header-title">

                <strong>${title}</strong>

                ${subtitle
                    ? `<span>${subtitle}</span>`
                    : ""
                }

            </div>

            <button
                class="v6-header-more"
                type="button"
                onclick="openPageMenu()">
                ⋮
            </button>

        </header>
    `;
}


async function loadPage(page) {

    try {

        closePageMenu();

        const response = await fetch(`/pages/${page}.html`);

        if (!response.ok) {
            throw new Error("Page not found: " + page);
        }

        root.innerHTML = await response.text();

        window.scrollTo(0, 0);


        /* AI */

        if (page === "ai") {

            makeHeader(
                "aiHeader",
                "UltraAI",
                "مساعدك الذكي"
            );

            if (typeof initAI === "function") {
                initAI();
            }

        }


        /* MEMORY */

        if (page === "memory") {

            makeHeader(
                "memoryHeader",
                "الذاكرة",
                "محادثاتك السابقة"
            );

            if (typeof loadMemory === "function") {
                loadMemory();
            }

        }


        /* CHAT */

        if (page === "chat") {

            makeHeader(
                "chatHeader",
                "المحادثات",
                "محادثاتك السابقة"
            );

            if (typeof loadMemory === "function") {
                loadMemory();
            }

        }


        /* PROFILE */

        if (page === "profile") {

            makeHeader(
                "profileHeader",
                "الحساب",
                "معلومات حسابك"
            );

            if (typeof loadProfile === "function") {
                loadProfile();
            }

        }


        /* SETTINGS */

        if (page === "settings") {

            makeHeader(
                "settingsHeader",
                "الإعدادات",
                "تخصيص UltraAI"
            );

            if (typeof loadSettings === "function") {
                loadSettings();
            }

        }


        /* GLOBAL CHAT */

        if (page === "global") {

            makeHeader(
                "globalHeader",
                "الشات العالمي",
                "تحدث مع مستخدمي UltraAI"
            );

            if (typeof loadGlobalChat === "function") {
                loadGlobalChat();
            }

        }


        /* FILES */

        if (page === "files") {

            makeHeader(
                "filesHeader",
                "الملفات",
                "ملفاتك"
            );

            if (typeof initFiles === "function") {
                initFiles();
            }

        }


        /* HOME */

        if (
            page === "home" &&
            typeof loadRecentConversations === "function"
        ) {

            loadRecentConversations();

        }


        /* ADMIN */

        if (page === "admin") {

            if (typeof loadAdminPage === "function") {
                loadAdminPage();
            }

        }


        /* ADMIN USERS */

        if (page === "admin-users") {

            if (typeof loadAdminUsersPage === "function") {
                loadAdminUsersPage();
            }

        }


        /* ADMIN REPORTS */

        if (page === "admin-reports") {

            if (typeof loadAdminReportsPage === "function") {
                loadAdminReportsPage();
            }

        }


        /* ADMIN PENDING REPORTS */

        if (page === "admin-pending") {

            if (typeof loadAdminPendingPage === "function") {
                loadAdminPendingPage();
            }

        }


        /* ADMIN BANNED USERS */

        if (page === "admin-banned") {

            if (typeof loadAdminBannedPage === "function") {
                loadAdminBannedPage();
            }

        }

    } catch (error) {

        console.error("Router error:", error);

        root.innerHTML = `

            <div class="welcome">

                <h2>حدث خطأ</h2>

                <p>
                    الصفحة غير متوفرة حالياً
                </p>

                <button
                    type="button"
                    onclick="loadPage('home')">
                    ← الرئيسية
                </button>

            </div>

        `;

    }

}


window.loadPage = loadPage;
window.makeHeader = makeHeader;
window.openPageMenu = openPageMenu;
window.closePageMenu = closePageMenu;
