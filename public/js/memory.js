let memoryConversations = [];


/* =========================
   تحميل المحادثات
========================= */

async function loadMemory() {

    const list =
        document.getElementById("memoryList");

    if (!list) return;


    list.innerHTML = `
        <div class="memory-loading">
            ⏳ جاري تحميل المحادثات...
        </div>
    `;


    const token =
        localStorage.getItem("token");


    if (!token) {

        list.innerHTML = `
            <div class="memory-empty">

                <h2>🔐</h2>

                <p>
                    يجب تسجيل الدخول أولاً.
                </p>

                <button onclick="loadPage('login')">
                    تسجيل الدخول
                </button>

            </div>
        `;

        return;
    }


    try {

        const response =
            await fetch(
                "/conversations-list",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            list.innerHTML = `
                <div class="memory-empty">

                    <h2>⚠️</h2>

                    <p>
                        ${
                            data.message ||
                            "تعذر تحميل المحادثات"
                        }
                    </p>

                </div>
            `;

            return;
        }


        memoryConversations =
            data.conversations || [];


        renderMemory(
            memoryConversations
        );


    } catch (error) {

        console.error(error);


        list.innerHTML = `
            <div class="memory-empty">

                <h2>❌</h2>

                <p>
                    تعذر الاتصال بالسيرفر.
                </p>

                <button onclick="loadMemory()">
                    إعادة المحاولة
                </button>

            </div>
        `;

    }

}


/* =========================
   عرض المحادثات
========================= */

function renderMemory(list) {

    const box =
        document.getElementById("memoryList");


    if (!box) return;


    if (!list.length) {

        box.innerHTML = `
            <div class="memory-empty">

                <div class="empty-icon">
                    🧠
                </div>

                <h2>
                    لا توجد محادثات
                </h2>

                <p>
                    ابدأ محادثة جديدة وستظهر هنا.
                </p>

                <button
                    onclick="loadPage('ai')">

                    ➕ محادثة جديدة

                </button>

            </div>
        `;

        return;
    }


    box.innerHTML =
        list.map(conv => {

            const date =
                new Date(conv.createdAt);


            const dateText =
                date.toLocaleDateString(
                    "ar-MA"
                );


            const timeText =
                date.toLocaleTimeString(
                    "ar-MA",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );


            const title =
                escapeMemoryText(
                    conv.title ||
                    "محادثة"
                );


            return `

                <div
                    class="memory-card"
                    data-conversation-id="${conv.id}"
                    ontouchstart="memoryTouchStart(event, ${conv.id})"
                    ontouchend="memoryTouchEnd(event, ${conv.id})"
                    ontouchmove="memoryTouchMove(event)"
                    onmousedown="memoryMouseDown(event, ${conv.id})"
                    onmouseup="memoryMouseUp(event, ${conv.id})"
                    onmouseleave="memoryMouseCancel()">

                    <div class="memory-main">

                        <div class="memory-icon">
                            💬
                        </div>

                        <div class="memory-info">

                            <h3>
                                ${title}
                            </h3>

                            <p>
                                ${dateText}
                                ·
                                ${timeText}
                            </p>

                        </div>

                    </div>

                </div>

            `;

        }).join("");

}


/* =========================
   الضغط العادي
========================= */

function openConversation(id) {

    localStorage.setItem(
        "activeConversationId",
        String(id)
    );

    localStorage.setItem(
        "currentConversationId",
        String(id)
    );


    loadPage("ai");

}


/* =========================
   الضغط المطول
========================= */

let memoryPressTimer = null;

let memoryPressMoved = false;


function memoryTouchStart(event, id) {

    memoryPressMoved = false;


    memoryPressTimer =
        setTimeout(() => {

            if (!memoryPressMoved) {

                openMemoryActions(id);

            }

        }, 600);

}


function memoryTouchMove() {

    memoryPressMoved = true;

    clearTimeout(
        memoryPressTimer
    );

}


function memoryTouchEnd(event, id) {

    clearTimeout(
        memoryPressTimer
    );


    if (!memoryPressMoved) {

        event.preventDefault();

        openConversation(id);

    }

}


function memoryMouseDown(event, id) {

    if (event.button !== 0)
        return;


    memoryPressTimer =
        setTimeout(() => {

            openMemoryActions(id);

        }, 600);

}


function memoryMouseUp(event, id) {

    if (event.button !== 0)
        return;


    const wasLongPress =
        memoryPressTimer !== null;


    clearTimeout(
        memoryPressTimer
    );


    memoryPressTimer = null;


    if (!wasLongPress)
        return;


    /*
       إذا كان التايمر مازال موجوداً
       فالضغط كان عادياً.
    */

}


function memoryMouseCancel() {

    clearTimeout(
        memoryPressTimer
    );

    memoryPressTimer = null;

}


/* =========================
   قائمة المحادثة
========================= */

function openMemoryActions(id) {

    const old =
        document.getElementById(
            "memoryActionMenu"
        );


    if (old) {
        old.remove();
    }


    const conversation =
        memoryConversations.find(
            c => Number(c.id) === Number(id)
        );


    if (!conversation)
        return;


    const menu =
        document.createElement("div");


    menu.id =
        "memoryActionMenu";


    menu.className =
        "memory-action-overlay";


    menu.innerHTML = `

        <div
            class="memory-action-box"
            onclick="event.stopPropagation()">

            <div class="memory-action-title">

                💬

                <strong>
                    ${escapeMemoryText(
                        conversation.title ||
                        "محادثة"
                    )}
                </strong>

            </div>


            <button
                class="memory-action-edit"
                onclick="renameConversation(${id})">

                ✏️
                تعديل اسم المحادثة

            </button>


            <button
                class="memory-action-delete"
                onclick="deleteMemory(${id})">

                🗑️
                حذف المحادثة

            </button>


            <button
                class="memory-action-cancel"
                onclick="closeMemoryActions()">

                إلغاء

            </button>

        </div>

    `;


    menu.onclick =
        closeMemoryActions;


    document.body.appendChild(menu);

}


/* =========================
   تعديل الاسم
========================= */

async function renameConversation(id) {

    closeMemoryActions();


    const conversation =
        memoryConversations.find(
            c => Number(c.id) === Number(id)
        );


    if (!conversation)
        return;


    const currentTitle =
        conversation.title ||
        "محادثة";


    const newTitle =
        prompt(
            "اكتب اسم المحادثة الجديد:",
            currentTitle
        );


    if (newTitle === null)
        return;


    const title =
        newTitle
        .replace(/\s+/g, " ")
        .trim();


    if (!title) {

        alert(
            "اسم المحادثة لا يمكن أن يكون فارغاً."
        );

        return;
    }


    const token =
        localStorage.getItem("token");


    try {

        const response =
            await fetch(
                "/conversations/" + id,
                {

                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token

                    },

                    body: JSON.stringify({
                        title
                    })

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر تعديل الاسم"
            );

            return;
        }


        const item =
            memoryConversations.find(
                c =>
                    Number(c.id) ===
                    Number(id)
            );


        if (item) {

            item.title =
                data.conversation.title;

        }


        renderMemory(
            memoryConversations
        );


    } catch (error) {

        console.error(error);

        alert(
            "حدث خطأ أثناء تعديل الاسم."
        );

    }

}


/* =========================
   حذف المحادثة
========================= */

async function deleteMemory(id) {

    closeMemoryActions();


    if (
        !confirm(
            "هل تريد حذف هذه المحادثة نهائياً؟"
        )
    ) {
        return;
    }


    const token =
        localStorage.getItem("token");


    try {

        const response =
            await fetch(
                "/delete-conversation/" + id,
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            "Bearer " + token

                    }

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر حذف المحادثة"
            );

            return;
        }


        memoryConversations =
            memoryConversations.filter(
                c =>
                    Number(c.id) !==
                    Number(id)
            );


        if (
            Number(
                localStorage.getItem(
                    "activeConversationId"
                )
            ) === Number(id)
        ) {

            localStorage.removeItem(
                "activeConversationId"
            );

        }


        renderMemory(
            memoryConversations
        );


    } catch (error) {

        console.error(error);

        alert(
            "حدث خطأ أثناء حذف المحادثة."
        );

    }

}


/* =========================
   إغلاق القائمة
========================= */

function closeMemoryActions() {

    const menu =
        document.getElementById(
            "memoryActionMenu"
        );


    if (menu) {
        menu.remove();
    }

}


/* =========================
   البحث
========================= */

function filterMemory() {

    const input =
        document.getElementById(
            "memorySearch"
        );


    if (!input)
        return;


    const text =
        input.value
        .trim()
        .toLowerCase();


    const filtered =
        memoryConversations.filter(
            conv =>
                String(
                    conv.title ||
                    "محادثة"
                )
                .toLowerCase()
                .includes(text)
        );


    renderMemory(filtered);

}


/* =========================
   حماية النص
========================= */

function escapeMemoryText(text) {

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ULTRAAI MEMORY PRO
========================================================= */

let memoryProData = {
    enabled: true,
    items: []
};


/* =========================
   تحميل Memory Pro
========================= */

async function loadMemoryPro() {

    const list =
        document.getElementById("memoryProList");

    const status =
        document.getElementById("memoryProStatus");

    const toggle =
        document.getElementById("memoryProToggle");

    if (!list) return;

    const token =
        localStorage.getItem("token");

    if (!token) {

        list.innerHTML = `
            <div class="memory-empty">
                🔐 يجب تسجيل الدخول أولاً.
            </div>
        `;

        return;
    }

    try {

        const response =
            await fetch(
                "/memory-pro",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!data.success) {

            list.innerHTML = `
                <div class="memory-empty">
                    ⚠️ ${
                        escapeMemoryText(
                            data.message ||
                            "تعذر تحميل Memory Pro"
                        )
                    }
                </div>
            `;

            return;
        }

        memoryProData = {
            enabled:
                data.enabled !== false,

            items:
                Array.isArray(data.items)
                    ? data.items
                    : []
        };

        updateMemoryProUI();

        renderMemoryPro();

    } catch (error) {

        console.error(
            "Memory Pro load error:",
            error
        );

        list.innerHTML = `
            <div class="memory-empty">
                ❌ تعذر الاتصال بالسيرفر.
            </div>
        `;

    }

}


/* =========================
   UI
========================= */

function updateMemoryProUI() {

    const status =
        document.getElementById(
            "memoryProStatus"
        );

    const toggle =
        document.getElementById(
            "memoryProToggle"
        );

    if (status) {

        status.textContent =
            memoryProData.enabled
                ? "🟢 Memory Pro مفعلة"
                : "⚪ Memory Pro متوقفة";

    }

    if (toggle) {

        toggle.textContent =
            memoryProData.enabled
                ? "🟢"
                : "⚪";

        toggle.title =
            memoryProData.enabled
                ? "إيقاف Memory Pro"
                : "تشغيل Memory Pro";

    }

}


/* =========================
   عرض Memory Pro
========================= */

function renderMemoryPro() {

    const box =
        document.getElementById(
            "memoryProList"
        );

    if (!box) return;

    const items =
        memoryProData.items || [];

    if (!items.length) {

        box.innerHTML = `
            <div class="memory-empty">

                <div class="empty-icon">
                    🧠
                </div>

                <h3>
                    لا توجد معلومات محفوظة
                </h3>

                <p>
                    أضف معلومة مهمة وسيتمكن UltraAI من استخدامها لاحقاً.
                </p>

            </div>
        `;

        return;
    }

    box.innerHTML =
        items.map(item => {

            const id =
                Number(item.id);

            const text =
                escapeMemoryText(
                    item.text || ""
                );

            const category =
                escapeMemoryText(
                    item.category || "general"
                );

            const date =
                item.updatedAt ||
                item.createdAt;

            const dateText =
                date
                    ? new Date(date)
                        .toLocaleDateString(
                            "ar-MA"
                        )
                    : "";

            return `

                <div
                    class="memory-pro-card"
                    data-memory-id="${id}">

                    <div class="memory-pro-card-top">

                        <span class="memory-pro-category">
                            ${category}
                        </span>

                        <span class="memory-pro-date">
                            ${dateText}
                        </span>

                    </div>

                    <div class="memory-pro-text">
                        ${text}
                    </div>

                    <div class="memory-pro-actions">

                        <button
                            type="button"
                            onclick="editMemoryPro(${id})">
                            ✏️ تعديل
                        </button>

                        <button
                            type="button"
                            onclick="deleteMemoryPro(${id})">
                            🗑️ حذف
                        </button>

                    </div>

                </div>

            `;

        }).join("");

}


/* =========================
   إضافة
========================= */

async function addMemoryPro() {

    const textarea =
        document.getElementById(
            "memoryProText"
        );

    const category =
        document.getElementById(
            "memoryProCategory"
        );

    if (!textarea) return;

    const text =
        textarea.value
            .replace(/\s+/g, " ")
            .trim();

    if (!text) {

        alert(
            "اكتب المعلومة أولاً."
        );

        return;
    }

    if (text.length > 500) {

        alert(
            "المعلومة طويلة جداً."
        );

        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {

        alert(
            "يجب تسجيل الدخول أولاً."
        );

        return;
    }

    try {

        const response =
            await fetch(
                "/memory-pro",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token

                    },

                    body:
                        JSON.stringify({

                            text,

                            category:
                                category
                                    ? category.value
                                    : "general"

                        })

                }
            );

        const data =
            await response.json();

        if (!data.success) {

            alert(
                data.message ||
                "تعذر حفظ المعلومة."
            );

            return;
        }

        memoryProData.items.unshift(
            data.item
        );

        memoryProData.items =
            memoryProData.items.slice(
                0,
                200
            );

        textarea.value = "";

        renderMemoryPro();

    } catch (error) {

        console.error(
            "Memory Pro add error:",
            error
        );

        alert(
            "حدث خطأ أثناء حفظ المعلومة."
        );

    }

}


/* =========================
   تعديل
========================= */

async function editMemoryPro(id) {

    const item =
        memoryProData.items.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!item) return;

    const text =
        prompt(
            "عدّل المعلومة:",
            item.text || ""
        );

    if (text === null)
        return;

    const cleanText =
        text
            .replace(/\s+/g, " ")
            .trim();

    if (!cleanText) {

        alert(
            "المعلومة لا يمكن أن تكون فارغة."
        );

        return;
    }

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch(
                "/memory-pro/" + id,
                {

                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token

                    },

                    body:
                        JSON.stringify({

                            text:
                                cleanText,

                            category:
                                item.category ||
                                "general"

                        })

                }
            );

        const data =
            await response.json();

        if (!data.success) {

            alert(
                data.message ||
                "تعذر تعديل المعلومة."
            );

            return;
        }

        const index =
            memoryProData.items.findIndex(
                item =>
                    Number(item.id) ===
                    Number(id)
            );

        if (index !== -1) {

            memoryProData.items[index] =
                data.item;

        }

        renderMemoryPro();

    } catch (error) {

        console.error(
            "Memory Pro edit error:",
            error
        );

        alert(
            "حدث خطأ أثناء تعديل المعلومة."
        );

    }

}


/* =========================
   حذف
========================= */

async function deleteMemoryPro(id) {

    if (
        !confirm(
            "هل تريد حذف هذه المعلومة نهائياً؟"
        )
    ) {
        return;
    }

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch(
                "/memory-pro/" + id,
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            "Bearer " + token

                    }

                }
            );

        const data =
            await response.json();

        if (!data.success) {

            alert(
                data.message ||
                "تعذر حذف المعلومة."
            );

            return;
        }

        memoryProData.items =
            memoryProData.items.filter(
                item =>
                    Number(item.id) !==
                    Number(id)
            );

        renderMemoryPro();

    } catch (error) {

        console.error(
            "Memory Pro delete error:",
            error
        );

        alert(
            "حدث خطأ أثناء حذف المعلومة."
        );

    }

}


/* =========================
   تشغيل / إيقاف
========================= */

async function toggleMemoryPro() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        alert(
            "يجب تسجيل الدخول أولاً."
        );

        return;
    }

    const newValue =
        !memoryProData.enabled;

    try {

        const response =
            await fetch(
                "/memory-pro/settings/enabled",
                {

                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token

                    },

                    body:
                        JSON.stringify({
                            enabled:
                                newValue
                        })

                }
            );

        const data =
            await response.json();

        if (!data.success) {

            alert(
                data.message ||
                "تعذر تغيير حالة Memory Pro."
            );

            return;
        }

        memoryProData.enabled =
            data.enabled !== false;

        updateMemoryProUI();

    } catch (error) {

        console.error(
            "Memory Pro toggle error:",
            error
        );

        alert(
            "حدث خطأ أثناء تغيير حالة Memory Pro."
        );

    }

}


/* =========================
   تحميل الاثنين
========================= */

function initMemoryPro() {

    const list =
        document.getElementById("memoryProList");

    if (!list) return;

    loadMemoryPro();

}

/*
   UltraAI V6 يستعمل SPA.
   لذلك DOMContentLoaded وحدها لا تكفي
   لأن memory.html قد يتم تحميلها بعد ذلك.
*/
document.addEventListener(
    "DOMContentLoaded",
    initMemoryPro
);

if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
) {
    setTimeout(
        initMemoryPro,
        50
    );
}



/* =========================================================
   توليد فكرة مشروع اعتماداً على Memory Pro
========================================================= */

function generateProjectIdeaFromMemory() {

    if (!memoryProData.enabled) {

        alert(
            "فعّل Memory Pro أولاً باش نقدر نستعمل المعلومات المحفوظة."
        );

        return;
    }

    const items =
        memoryProData.items || [];

    if (!items.length) {

        alert(
            "ما كايناش معلومات محفوظة بعد.\nأضف بعض المعلومات أولاً."
        );

        return;
    }

    const memoryText =
        items
            .slice(0, 30)
            .map(item => {

                const category =
                    String(
                        item.category ||
                        "general"
                    ).trim();

                const text =
                    String(
                        item.text ||
                        ""
                    ).trim();

                if (!text) return "";

                return (
                    "- [" +
                    category +
                    "] " +
                    text
                );

            })
            .filter(Boolean)
            .join("\n");

    const prompt = `
أريد منك توليد فكرة مشروع جديدة ومناسبة لي اعتماداً على المعلومات المحفوظة عني.

استعمل المعلومات التالية لفهم خبرتي واهتماماتي وأهدافي:

${memoryText}

المطلوب:
- اقترح فكرة مشروع عملية ومناسبة لي.
- لا تكرر مجرد المعلومات الموجودة؛ ابنِ عليها فكرة جديدة.
- وضّح لماذا تناسبني.
- اشرح طريقة البدء.
- حدد الزبناء المستهدفين.
- اقترح طريقة الربح.
- أعطني تقديراً أولياً للتكاليف إذا كان ذلك ممكناً.
- اقترح خطوات عملية لأول 30 يوماً.
- اذكر أهم المخاطر وكيف يمكن التعامل معها.

أريد إجابة عملية وواضحة، وليست مجرد فكرة عامة.
`;

    localStorage.setItem(
        "ideaToDevelop",
        prompt
    );

    localStorage.removeItem(
        "activeConversationId"
    );

    localStorage.removeItem(
        "activeConversationMessages"
    );

    loadPage("ai");
}
