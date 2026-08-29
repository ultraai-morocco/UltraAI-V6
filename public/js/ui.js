function pageHeader(title, subtitle=""){

    return `
        <header class="v6-header">

            <button
                class="v6-back"
                type="button"
                onclick="loadPage('home')">
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

        </header>
    `;
}


function openPageMenu(){

    const menu = document.getElementById("sideMenu");

    if(menu){
        menu.classList.add("open");
    }

}


function closePageMenu(){

    const menu = document.getElementById("sideMenu");

    if(menu){
        menu.classList.remove("open");
    }

}


function toggleSideMenu(){

    const menu = document.getElementById("sideMenu");

    if(!menu) return;

    menu.classList.toggle("open");

}



window.updateAdminSidebarButton = async function() {
    const button = document.getElementById("adminPanelMenuButton");

    if (!button) return;

    button.style.display = "none";

    try {
        if (typeof isUltraAIAdmin !== "function") return;

        const isAdmin = await isUltraAIAdmin();

        if (isAdmin) {
            button.style.display = "flex";
        }
    } catch (error) {
        console.error("Admin sidebar check error:", error);
        button.style.display = "none";
    }
}

function openFromMenu(page){

    closePageMenu();

    setTimeout(() => {

        loadPage(page);

    },120);

}


function newAIConversation(){

    localStorage.removeItem("activeConversationId");
    localStorage.removeItem("activeConversationMessages");

    closePageMenu();

    loadPage("ai");

}


function logoutUltraAI(){

    /*
     * تسجيل الخروج محلي بالكامل.
     */
    localStorage.removeItem("token");
    localStorage.removeItem("activeConversationId");
    localStorage.removeItem("activeConversationMessages");

    closePageMenu();

    /*
     * Welcome محلية.
     * ما نعتمدوش على السيرفر باش Logout يبقى خدام
     * حتى أثناء Maintenance Mode.
     */
    const root =
        document.getElementById("root");

    if (root) {

        root.innerHTML = `
            <div class="welcome">

                <h1>🚀 UltraAI</h1>

                <p>
                    المساعد الذكي الجديد
                </p>

                <button
                    type="button"
                    onclick="loadPage('login')">
                    تسجيل الدخول
                </button>

                <button
                    type="button"
                    onclick="loadPage('register')">
                    إنشاء حساب
                </button>

            </div>
        `;

        window.scrollTo(0, 0);

        return;
    }

    window.location.href = "/";
}

function createSideMenu(){

    if(document.getElementById("sideMenu"))
        return;


    const menu = document.createElement("div");

    menu.id = "sideMenu";

    menu.innerHTML = `

        <div
            class="menu-overlay"
            onclick="closePageMenu()">
        </div>


        <aside class="side-panel">

            <div class="side-header">

                <div class="side-brand">

                    <div class="side-logo">
                        U
                    </div>

                    <div>
                        <strong>UltraAI</strong>
                        <span>V6</span>
                    </div>

                </div>

                <button
                    class="side-close"
                    onclick="closePageMenu()">

                    ×

                </button>

            </div>


            <div class="side-new-chat">

                <button
                    onclick="newAIConversation()">

                    ＋ محادثة جديدة

                </button>

            </div>


            <nav class="side-nav">

                <button onclick="openFromMenu('home')">
                    <span>⌂</span>
                    <b>الرئيسية</b>
                </button>

                <button onclick="newAIConversation()">
                    <span>🤖</span>
                    <b>AI</b>
                </button>

                <button onclick="openFromMenu('global')">
                    🌍 الشات العالمي
                </button>

                <button onclick="openFromMenu('video')">
                    <span>🎬</span>
                    <b>Video AI</b>
                </button>

                <button onclick="openFromMenu('auto-content')">
                    <span>🤖</span>
                    <b>Auto Content</b>
                </button>

                <button onclick="openFromMenu('memory')">
                    <span>🧠</span>
                    <b>الذاكرة</b>
                </button>

                <button onclick="openFromMenu('admin-inbox')" class="admin-inbox-menu-button">
                    <span class="admin-inbox-menu-icon">📩</span>
                    <b>رسائل الإدارة</b>
                    <span id="adminInboxBadge" class="admin-inbox-badge"></span>
                </button>

                <button
                    id="adminPanelMenuButton"
                    onclick="openFromMenu('admin')"
                    style="display:none;">
                    <span>👑</span>
                    <b>لوحة الإدارة</b>
                </button>

                <button onclick="openFromMenu('chat')">
                    <span>💬</span>
                    <b>المحادثات</b>
                </button>

                <button onclick="openFromMenu('files')">
                    <span>📁</span>
                    <b>الملفات</b>
                </button>

                <button onclick="openFromMenu('profile')">
                    <span>👤</span>
                    <b>الحساب</b>
                </button>

                <button onclick="openFromMenu('settings')">
                    <span>⚙️</span>
                    <b>الإعدادات</b>
                </button>
                <button onclick="openFromMenu('about')">
                    <span>ℹ️</span>
                    <b>حول UltraAI</b>
                </button>
                <button onclick="openFromMenu('privacy')">
                    <span>🔐</span>
                    <b>الخصوصية والشروط</b>
                </button>
                <button onclick="openFromMenu('support')">
                    <span>🆘</span>
                    <b>المساعدة والدعم</b>
                </button>

            </nav>


            <div class="side-bottom">

                <button
                    class="side-logout"
                    onclick="logoutUltraAI()">

                    <span>🚪</span>

                    <b>تسجيل الخروج</b>

                </button>

            </div>

        </aside>
    `;


    document.body.appendChild(menu);
        /*
     * من بعد ما تتصاوب القائمة الجانبية،
     * نتحقق من صلاحية Admin بعد تحميل كل الملفات.
     */
    setTimeout(() => {
        if (typeof window.updateAdminSidebarButton === "function") {
            window.updateAdminSidebarButton();
        }
    }, 300);


}


document.addEventListener("DOMContentLoaded",function(){

    createSideMenu();

});
