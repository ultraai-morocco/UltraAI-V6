async function loadFacebookStatus() {

    console.log("📘 loadFacebookStatus() STARTED");

    const status =
        document.getElementById(
            "facebookStatus"
        );

    const actions =
        document.getElementById(
            "facebookActions"
        );

    if (!status || !actions) {
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {

        status.innerHTML =
            "خاصك تسجل الدخول أولاً.";

        return;
    }

    try {

        const response =
            await fetch(
                "/facebook/status",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        console.log("📘 FACEBOOK STATUS:", data);

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "تعذر تحميل الحالة."
            );
        }


        if (data.connected === true) {

            status.innerHTML = `
                <div>
                    🟢 Facebook مربوط
                </div>

                <strong>
                    ${escapeFacebookHtml(
                        data.pageName
                    )}
                </strong>

                <div style="margin-top:15px;">
                    <button
                        type="button"
                        onclick="disconnectFacebook()">
                        🔌 فصل Facebook
                    </button>
                </div>
            `;

            actions.innerHTML = "";

            return;
        }


        status.innerHTML = `
            <div>
                🔴 مازال ما ربطنا حتى Page
            </div>
        `;


        if (
            Array.isArray(data.pages) &&
            data.pages.length > 0
        ) {

            actions.innerHTML = `

                <h3>
                    اختار الصفحة:
                </h3>

                ${data.pages.map(
                    page => `
                        <button
                            type="button"
                            style="display:block;margin:10px 0;"
                            onclick="selectFacebookPage('${escapeFacebookAttr(page.id)}')">

                            📄
                            ${escapeFacebookHtml(
                                page.name
                            )}

                        </button>
                    `
                ).join("")}

            `;

        } else {

            actions.innerHTML = `
                <button
                    type="button"
                    onclick="connectFacebook()">

                    📘 ربط Facebook
                </button>
            `;

        }

    } catch (error) {

        console.error(
            "Facebook status error:",
            error
        );

        status.innerHTML =
            "❌ تعذر التحقق من Facebook.";

        actions.innerHTML = `
            <button
                type="button"
                onclick="connectFacebook()">

                📘 إعادة ربط Facebook
            </button>
        `;
    }
}


/* =========================================
   CONNECT
========================================= */

function connectFacebook() {

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert(
            "خاصك تسجل الدخول أولاً."
        );
        return;
    }

    window.location.href =
        "/facebook/connect?token=" +
        encodeURIComponent(token);
}


/* =========================================
   SELECT PAGE
========================================= */

async function selectFacebookPage(pageId) {

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert(
            "خاصك تسجل الدخول أولاً."
        );
        return;
    }

    try {

        const response =
            await fetch(
                "/facebook/select-page",
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
                            pageId
                        })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.message ||
                "تعذر ربط الصفحة."
            );
        }

        alert(
            "✅ تم ربط صفحة Facebook بنجاح!"
        );

        await loadFacebookStatus();

    } catch (error) {

        console.error(
            "Facebook page select error:",
            error
        );

        alert(
            "❌ " +
            (
                error.message ||
                "تعذر ربط الصفحة."
            )
        );
    }
}


/* =========================================
   DISCONNECT
========================================= */

async function disconnectFacebook() {

    const token =
        localStorage.getItem("token");

    if (!token) {
        return;
    }

    if (
        !confirm(
            "واش متأكد بغيتي تفصل Facebook؟"
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                "/facebook/disconnect",
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

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.message ||
                "تعذر فصل Facebook."
            );
        }

        await loadFacebookStatus();

    } catch (error) {

        alert(
            "❌ " +
            (
                error.message ||
                "تعذر فصل Facebook."
            )
        );
    }
}


/* =========================================
   ESCAPE
========================================= */

function escapeFacebookHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeFacebookAttr(value) {

    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


/* =========================================
   PUBLISH TEST POST
========================================= */

async function publishFacebookPost() {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("خاصك تسجل الدخول أولاً.");
        return;
    }

    const message =
        document.getElementById("facebookMessage")
        ?.value.trim() || "";

    const imageUrl =
        document.getElementById("facebookImageUrl")
        ?.value.trim() || "";

    const result =
        document.getElementById("facebookPublishResult");

    if (!message && !imageUrl) {
        if (result) {
            result.innerHTML =
                "⚠️ كتب رسالة أو دخل رابط صورة.";
        }
        return;
    }

    if (imageUrl && !imageUrl.startsWith("https://")) {
        if (result) {
            result.innerHTML =
                "⚠️ رابط الصورة خاصو يبدأ بـ HTTPS.";
        }
        return;
    }

    if (result) {
        result.innerHTML = "⏳ جاري النشر...";
    }

    try {
        const response = await fetch(
            "/facebook/publish",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    message,
                    imageUrl
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "فشل نشر المنشور."
            );
        }

        if (result) {
            result.innerHTML =
                "✅ تم نشر المنشور بنجاح!";
        }

        document.getElementById(
            "facebookMessage"
        ).value = "";

        document.getElementById(
            "facebookImageUrl"
        ).value = "";

    } catch (error) {

        console.error(
            "Facebook publish error:",
            error
        );

        if (result) {
            result.innerHTML =
                "❌ " +
                (error.message || "تعذر نشر المنشور.");
        }
    }
}

window.publishFacebookPost =
    publishFacebookPost;


window.connectFacebook =
    connectFacebook;

window.loadFacebookStatus =
    loadFacebookStatus;

window.selectFacebookPage =
    selectFacebookPage;

window.disconnectFacebook =
    disconnectFacebook;
