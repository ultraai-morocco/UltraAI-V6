const root = document.getElementById("root");


function makeHeader(target, title, subtitle = "") {
    let el = document.getElementById(target);

    if (!el) {
        el = document.createElement("header");
        el.id = target;
        el.className = "v6-header";

        if (root) {
            root.prepend(el);
        } else {
            document.body.prepend(el);
        }
    }

    el.className = "v6-header";

    el.innerHTML = `
        <button
            class="v6-back"
            type="button"
            onclick="history.back()">
            ←
        </button>

        <div class="v6-header-title">
            <strong>${title}</strong>
            ${subtitle ? `<span>${subtitle}</span>` : ""}
        </div>

        <button
            class="v6-header-more"
            type="button"
            onclick="openPageMenu()">
            ⋮
        </button>
    `;
}

async function loadPage(page) {

    try {

        closePageMenu();

        const token = localStorage.getItem("token");

          const response = await fetch(
              `/pages/${page}.html`,
              {
                  headers: token
                      ? {
                          "Authorization": "Bearer " + token
                      }
                      : {}
              }
          );

        if (!response.ok) {

            /*
             * UltraAI Maintenance Mode
             */
            if (response.status === 503) {

                try {
                    const maintenanceData =
                        await response.json();

                    /*
                     * Admin can enter UltraAI even during maintenance.
                     */
                    if (maintenanceData.isAdmin === true) {
                        throw new Error("ADMIN_MAINTENANCE_BYPASS");
                    }

                    root.innerHTML = `
                        <div class="welcome ultraai-maintenance-page">
                            <div style="font-size:64px;margin-bottom:20px;">
                                🛠️
                            </div>

                            <h2>
                                جاري الصيانة
                            </h2>

                            <p>
                                ${
                                    maintenanceData.message ||
                                    "نقوم حالياً بإجراء بعض التحسينات على UltraAI، المرجو المحاولة لاحقاً."
                                }
                            </p>
                        </div>
                    `;

                    return;

                } catch (error) {

                    if (error && error.message === "ADMIN_MAINTENANCE_BYPASS") {
                        /*
                         * Admin bypass.
                         * Continue loading the requested page.
                         */
                    } else {

                        root.innerHTML = `
                            <div class="welcome ultraai-maintenance-page">
                                <div style="font-size:64px;margin-bottom:20px;">
                                    🛠️
                                </div>

                                <h2>
                                    جاري الصيانة
                                </h2>

                                <p>
                                    نقوم حالياً بإجراء بعض التحسينات على UltraAI، المرجو المحاولة لاحقاً.
                                </p>
                            </div>
                        `;

                        return;
                    }
                }
            }

            throw new Error("Page not found: " + page);
        }

        root.innerHTML = await response.text();

        window.scrollTo(0, 0);



        /* AUTO CONTENT */

        if (page === "auto-content") {

            const oldScript =
                document.getElementById("autoContentScript");

            if (oldScript) {
                oldScript.remove();
            }

            await new Promise((resolve, reject) => {

                const script =
                    document.createElement("script");

                script.id =
                    "autoContentScript";

                script.src =
                    "/js/auto-content.js?v=20260820-tiktok-access";

                script.onload = () => {
                    console.log(
                        "✅ AUTO CONTENT JS LOADED"
                    );
                    resolve();
                };

                script.onerror = () => {
                    console.error(
                        "❌ AUTO CONTENT JS FAILED"
                    );
                    reject(
                        new Error(
                            "Failed to load auto-content.js"
                        )
                    );
                };

                document.body.appendChild(script);
            });

        }

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


        /* IDEAS */
        if (page === "ideas") {
            makeHeader(
                "ideasHeader",
                "توليد الأفكار",
                "اكتشف أفكاراً جديدة مع UltraAI"
            );

            if (typeof initIdeas === "function") {
                initIdeas();
            }
        }

        /* MY IDEAS */

        if (page === "my-ideas") {

            makeHeader(
                "myIdeasHeader",
                "أفكاري",
                "الأفكار التي حفظتها"
            );

            if (typeof loadMyIdeas === "function") {
                loadMyIdeas();
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

        /* ABOUT ULTRAAI */
        /* PRIVACY & TERMS */
        /* SUPPORT */
        if (page === "support") {
            makeHeader(
                "supportHeader",
                "المساعدة والدعم",
                "مركز مساعدة UltraAI"
            );
        }

        if (page === "privacy") {
            makeHeader(
                "privacyHeader",
                "الخصوصية والشروط",
                "سياسة الخصوصية وشروط الاستخدام"
            );
        }

        if (page === "about") {
            makeHeader(
                "aboutHeader",
                "حول UltraAI",
                "معلومات عن التطبيق"
            );
        }

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


        /* NOTIFICATIONS */
    if (page === "notifications") {
        makeHeader(
            "notificationsHeader",
            "الإشعارات",
            "تنبيهات UltraAI"
        );

        if (typeof loadNotifications === "function") {
            loadNotifications();
        }
    }

    /* FORGOT PASSWORD */
        if (page === "forgot-password") {
            // الصفحة تعتمد على auth.js فقط
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

            setTimeout(() => {

                if (
                    typeof window.loadAdminMaintenance ===
                    "function"
                ) {
                    window.loadAdminMaintenance();
                }

            }, 300);

        }


        /* ADMIN INBOX */
        if (page === "admin-inbox") {

            makeHeader(
                "adminInboxHeader",
                "رسائل الإدارة",
                "رسائل خاصة من UltraAI"
            );

            if (typeof loadAdminInbox === "function") {
                loadAdminInbox();
            }
        }

        /* ADMIN USERS */


        /* HOME NOTIFICATIONS */
        if (page === "home") {
            if (
                typeof loadHomeNotifications ===
                "function"
            ) {
                loadHomeNotifications();
            }
        }

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


        /* ADMIN MAINTENANCE */

        if (page === "admin-maintenance") {

            if (typeof loadAdminMaintenance === "function") {
                setTimeout(() => {
                    loadAdminMaintenance();
                }, 50);
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
