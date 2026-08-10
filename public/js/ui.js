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

    localStorage.removeItem("token");
    localStorage.removeItem("activeConversationId");
    localStorage.removeItem("activeConversationMessages");

    closePageMenu();

    loadPage("welcome");

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

                <button onclick="openFromMenu('memory')">
                    <span>🧠</span>
                    <b>الذاكرة</b>
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

}


document.addEventListener("DOMContentLoaded",function(){

    createSideMenu();

});
