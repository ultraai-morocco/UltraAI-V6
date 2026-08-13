let globalRefreshTimer = null;
let globalCurrentUser = null;
let globalLastMessageId = 0;


/* =========================================
   تحميل الشات العالمي
========================================= */

async function loadGlobalChat() {

    const box =
        document.getElementById("globalMessages");

    if (!box) return;

    const token =
        localStorage.getItem("token");

    if (!token) {

        box.innerHTML = `
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


    /* جلب معلومات المستخدم */

    try {

        const profileResponse =
            await fetch("/profile", {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            });

        const profileData =
            await profileResponse.json();

        if (
            profileData.success &&
            profileData.user
        ) {

            globalCurrentUser =
                profileData.user;

        }

    } catch (error) {

        console.log(
            "Profile loading error:",
            error
        );

    }


    await loadGlobalMessagesOnly();


    clearInterval(globalRefreshTimer);


    globalRefreshTimer =
        setInterval(() => {

            if (
                document.getElementById(
                    "globalMessages"
                )
            ) {

                loadGlobalMessagesOnly();

            } else {

                clearInterval(
                    globalRefreshTimer
                );

            }

        }, 1000);

}


/* =========================================
   تحميل الرسائل
========================================= */

async function loadGlobalMessagesOnly() {

    try {

        const response =
            await fetch("/global-chat");

        const data =
            await response.json();

        if (!data.success) {

            return;

        }

        renderGlobalMessages(
            data.messages || []
        );

    } catch (error) {

        console.error(
            "Global messages error:",
            error
        );

    }

}


/* =========================================
   عرض الرسائل
========================================= */

function renderGlobalMessages(messages) {
    const box =
        document.getElementById("globalMessages");

    if (!box) return;

    const myToken =
        localStorage.getItem("token");

    let myId = "";

    try {
        const payload =
            JSON.parse(
                atob(
                    myToken.split(".")[1]
                )
            );

        myId = String(payload.id);
    } catch {}

    /*
     * إذا ما كايناش رسائل
     */
    if (!messages.length) {
        if (!box.children.length) {
            box.innerHTML = `
                <div class="global-empty">
                    🌍
                    <h3>مرحبا بالشات العالمي</h3>
                    <p>كن أول واحد يكتب رسالة.</p>
                </div>
            `;
        }

        return;
    }

    /*
     * نحيدو شاشة "ما كايناش رسائل"
     * غير إذا كانت موجودة.
     */
    const empty = box.querySelector(".global-empty");

    if (empty) {
        empty.remove();
    }

    /*
     * نعرفو واش المستخدم قريب للقاع
     */
    const wasNearBottom =
        box.scrollHeight -
        box.scrollTop -
        box.clientHeight < 120;

    /*
     * نضيفو غير الرسائل اللي مازال ما كايناش
     * في DOM.
     */
    messages.forEach(item => {

        const messageId =
            String(item.id || "");

        if (!messageId) return;

        if (
            box.querySelector(
                `[data-message-id="${messageId}"]`
            )
        ) {
            return;
        }

        const mine =
            String(item.userId) === myId;

        const avatar =
            item.avatar
                ? `<img src="${escapeGlobal(item.avatar)}" alt="">`
                : `<span class="global-default-avatar">🌍</span>`;

        const div =
            document.createElement("div");

        div.className =
            `global-message ${mine ? "mine" : "other"}`;

        div.dataset.messageId =
            messageId;

        div.innerHTML = `
            <div class="global-user">

                <div class="global-avatar">
                    ${avatar}
                </div>

                <div class="global-user-info">

                    <strong>
                        ${escapeGlobal(
                            item.username || "مستخدم"
                        )}
                    </strong>

                    <small>
                        ${escapeGlobal(
                            item.time || ""
                        )}
                    </small>

                </div>

            </div>

            <div class="global-text">
                ${escapeGlobal(
                    item.message
                )}
            </div>

            <div class="global-message-actions">

                <button
                    class="global-report-button"
                    onclick="reportGlobalMessage('${messageId.replace(/'/g, "\\'")}')"
                    type="button"
                >
                    🚩 إبلاغ
                </button>

            </div>
        `;

        box.appendChild(div);
    });

    /*
     * نهبطو للقاع غير إذا كان المستخدم
     * أصلاً قريب للقاع.
     */
    if (wasNearBottom) {
        requestAnimationFrame(() => {
            box.scrollTop =
                box.scrollHeight;
        });
    }
}

/* =========================================
   الإبلاغ عن رسالة
========================================= */

async function reportGlobalMessage(messageId) {

    if (!messageId) {

        alert("❌ تعذر تحديد الرسالة.");

        return;
    }


    const reason =
        prompt(
            "سبب الإبلاغ:\n\n" +
            "1 - كلام سيء أو إساءة\n" +
            "2 - سبام\n" +
            "3 - تهديد\n" +
            "4 - محتوى غير مناسب\n" +
            "5 - سبب آخر\n\n" +
            "كتب السبب:"
        );


    if (!reason || !reason.trim()) {

        return;
    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        alert("❌ خاصك تسجل الدخول أولاً.");

        return;
    }


    try {

        const response =
            await fetch(
                "/reports",
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

                            messageId:
                                String(messageId),

                            reason:
                                reason.trim(),

                            message:
                                ""

                        })

                }
            );


        const data =
            await response.json();


        if (data.success) {

            alert(
                "✅ تم إرسال الإبلاغ للإدارة."
            );

        } else {

            alert(
                "⚠️ " +
                (
                    data.message ||
                    "تعذر إرسال الإبلاغ."
                )
            );

        }


    } catch (error) {

        console.error(
            "REPORT ERROR:",
            error
        );


        alert(
            "❌ حدث خطأ أثناء إرسال الإبلاغ."
        );

    }

}


async function sendGlobalMessage() {

    const input =
        document.getElementById(
            "globalMessage"
        );

    if (!input) return;


    const message =
        input.value.trim();


    if (!message) return;


    const token =
        localStorage.getItem("token");


    if (!token) {

        loadPage("login");

        return;

    }


    input.disabled = true;


    try {

        const response =
            await fetch(
                "/global-chat",
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
                            message
                        })

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر إرسال الرسالة"
            );

            return;

        }


        input.value = "";


        await loadGlobalMessagesOnly();


        input.focus();


    } catch (error) {

        console.error(
            "Send global message error:",
            error
        );


        alert(
            "تعذر الاتصال بالسيرفر"
        );


    } finally {

        input.disabled = false;

    }

}


/* =========================================
   Enter للإرسال
========================================= */

function handleGlobalKey(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendGlobalMessage();

    }

}


/* =========================================
   حماية النص
========================================= */

function escapeGlobal(value) {

    return String(value)

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


window.loadGlobalChat =
    loadGlobalChat;

window.sendGlobalMessage =
    sendGlobalMessage;

window.handleGlobalKey =
    handleGlobalKey;

window.reportGlobalMessage =
    reportGlobalMessage;

