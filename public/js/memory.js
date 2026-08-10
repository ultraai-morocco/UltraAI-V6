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
