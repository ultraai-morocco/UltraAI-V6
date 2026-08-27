
async function loadYouTubePageStatus() {

    const token =
        localStorage.getItem("token");

    if (!token) return;

    const status =
        document.getElementById("youtubeStatus");

    const uploadSection =
        document.getElementById("youtubeUploadSection");

    const button =
        document.getElementById("youtubeConnectPageBtn");

    try {

        const response =
            await fetch(
                "/youtube/status",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (
            response.ok &&
            data.success &&
            data.connected === true
        ) {

            if (status) {
                status.innerHTML = `
                    <div class="youtube-status-icon">
                        🟢
                    </div>

                    <h2>YouTube مربوط ✅</h2>

                    <p>
                        القناة ديالك مربوطة بـ UltraAI.
                    </p>
                `;
            }

            if (button) {
                button.style.display = "none";
            }

            if (uploadSection) {
                uploadSection.style.display = "block";
            }

            /* إظهار Auto YouTube */
            const autoSection =
                document.getElementById("youtubeAutoSection");

            if (autoSection) {
                autoSection.style.display = "block";
                console.log("✅ AUTO YOUTUBE SECTION VISIBLE");
            }

            /* تحميل إعدادات Auto YouTube */
            if (typeof bindYouTubeAutoButtons === "function") {
                bindYouTubeAutoButtons();
            }

            if (typeof loadYouTubeAutoSettings === "function") {
                await loadYouTubeAutoSettings();
            }

        }

    } catch (error) {

        console.error(
            "YouTube page status error:",
            error
        );
    }
}


/*
 * تشغيل الحالة مباشرة بعد تحميل صفحة YouTube
 * سواء دخل المستخدم من Router أو رجع من OAuth.
 */
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        loadYouTubePageStatus,
        { once: true }
    );
} else {
    loadYouTubePageStatus();
}


async function uploadYouTubeVideo() {

    console.log("🚀 YouTube upload button clicked");

    const token =
        localStorage.getItem("token");

    console.log("🔑 YouTube token:", token ? "FOUND" : "MISSING");

    if (!token) {
        alert("يجب تسجيل الدخول إلى UltraAI أولاً.");
        return;
    }

    const fileInput =
        document.getElementById("youtubeVideoFile");

    const titleInput =
        document.getElementById("youtubeVideoTitle");

    const descriptionInput =
        document.getElementById("youtubeVideoDescription");

    const privacyInput =
        document.getElementById("youtubePrivacyStatus");

    const button =
        document.getElementById("youtubeUploadBtn");

    const result =
        document.getElementById("youtubeUploadResult");

    const file =
        fileInput?.files?.[0];

    if (!file) {
        alert("اختار فيديو أولاً.");
        return;
    }

    if (!titleInput.value.trim()) {
        alert("دخل عنوان الفيديو.");
        titleInput.focus();
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        alert("النسخة التجريبية كتسمح بفيديو حتى 50MB.");
        return;
    }

    const formData =
        new FormData();

    formData.append(
        "video",
        file
    );

    formData.append(
        "title",
        titleInput.value.trim()
    );

    formData.append(
        "description",
        descriptionInput.value.trim()
    );

    formData.append(
        "privacyStatus",
        privacyInput.value
    );

    button.disabled = true;
    button.textContent = "⏳ جاري رفع الفيديو...";

    result.innerHTML =
        "⏳ جاري إرسال الفيديو إلى YouTube...";

    try {

        console.log("📤 Sending POST /youtube/upload");
        console.log("🎬 File:", file.name, file.size, file.type);

        const response =
            await fetch(
                "/youtube/upload",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + token
                    },

                    body: formData
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "فشل نشر الفيديو"
            );
        }

        result.innerHTML = `
            <div class="youtube-success">
                ✅ تم نشر الفيديو بنجاح!
                <br><br>
                <a
                    href="${data.url}"
                    target="_blank"
                    rel="noopener">
                    ▶️ فتح الفيديو على YouTube
                </a>
            </div>
        `;

    } catch (error) {

        console.error(
            "YouTube upload error:",
            error
        );

        result.innerHTML = `
            <div class="youtube-error">
                ❌ ${escapeYouTubeHtml(
                    error.message
                )}
            </div>
        `;

    } finally {

        button.disabled = false;
        button.textContent =
            "📤 نشر على YouTube";
    }
}


function escapeYouTubeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


window.uploadYouTubeVideo =
    uploadYouTubeVideo;

/* ربط زر نشر YouTube */
function bindYouTubeUploadButton() {

    const btn =
        document.getElementById("youtubeUploadBtn");

    if (!btn) {
        console.log("⚠️ YouTube upload button not found");
        return;
    }

    if (btn.dataset.youtubeBound === "true") {
        return;
    }

    btn.dataset.youtubeBound = "true";

    btn.addEventListener("click", async function(event) {

        event.preventDefault();
        event.stopPropagation();

        console.log("🚀 DIRECT YOUTUBE BUTTON CLICK");

        await uploadYouTubeVideo();
    });

    console.log("✅ YouTube upload button bound");
}

window.bindYouTubeUploadButton =
    bindYouTubeUploadButton;

/* FINAL BUTTON BINDING */
function initYouTubeButtons() {

    const connectBtn =
        document.getElementById("youtubeConnectPageBtn");

    const uploadBtn =
        document.getElementById("youtubeUploadBtn");

    if (connectBtn && connectBtn.dataset.bound !== "true") {

        connectBtn.dataset.bound = "true";

        connectBtn.addEventListener("click", function (event) {

            event.preventDefault();

            console.log("🚀 YOUTUBE CONNECT BUTTON CLICK");

            if (typeof window.connectYouTubePage === "function") {
                window.connectYouTubePage();
            }

        });

        console.log("✅ YouTube connect button bound");
    }

    if (uploadBtn && uploadBtn.dataset.bound !== "true") {

        uploadBtn.dataset.bound = "true";

        uploadBtn.addEventListener("click", async function (event) {

            event.preventDefault();

            console.log("🚀 YOUTUBE UPLOAD BUTTON CLICK");

            if (typeof window.uploadYouTubeVideo === "function") {
                await window.uploadYouTubeVideo();
            } else {
                console.error("❌ uploadYouTubeVideo غير موجودة");
            }

        });

        console.log("✅ YouTube upload button bound");
    }
}

window.initYouTubeButtons =
    initYouTubeButtons;

setTimeout(
    initYouTubeButtons,
    100
);


/* =================================================
   AUTO YOUTUBE SCHEDULER
================================================= */

async function loadYouTubeAutoSettings() {

    const token = localStorage.getItem("token");

    if (!token) return;

    const autoSection =
        document.getElementById("youtubeAutoSection");

    if (!autoSection) return;

    try {

        const response = await fetch(
            "/youtube-auto/",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "تعذر تحميل إعدادات Auto YouTube"
            );
        }

        autoSection.style.display = "block";

        const schedule = data.schedule || {};

        const morning =
            document.getElementById("youtubeAutoMorningTime");

        const evening =
            document.getElementById("youtubeAutoEveningTime");

        const privacy =
            document.getElementById("youtubeAutoPrivacy");

        if (morning) {
            morning.value =
                schedule.morningTime || "09:00";
        }

        if (evening) {
            evening.value =
                schedule.eveningTime || "20:00";
        }

        if (privacy) {
            privacy.value =
                schedule.privacyStatus || "private";
        }

        updateYouTubeAutoUI(schedule);

    } catch (error) {

        console.error(
            "YouTube Auto settings error:",
            error
        );
    }
}


/* حفظ الإعدادات */

async function saveYouTubeAutoSettings() {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("يجب تسجيل الدخول أولاً.");
        return;
    }

    const morning =
        document.getElementById(
            "youtubeAutoMorningTime"
        )?.value || "09:00";

    const evening =
        document.getElementById(
            "youtubeAutoEveningTime"
        )?.value || "20:00";

    const privacy =
        document.getElementById(
            "youtubeAutoPrivacy"
        )?.value || "private";

    const button =
        document.getElementById(
            "youtubeAutoSaveBtn"
        );

    const status =
        document.getElementById(
            "youtubeAutoStatus"
        );

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(morning)) {
        alert("وقت الصباح غير صحيح.");
        return;
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(evening)) {
        alert("وقت المساء غير صحيح.");
        return;
    }

    if (morning === evening) {
        alert("اختار وقتين مختلفين للصباح والمساء.");
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ جاري الحفظ...";
    }

    try {

        const response = await fetch(
            "/youtube-auto/settings",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },

                body: JSON.stringify({
                    morningTime: morning,
                    eveningTime: evening,
                    privacyStatus: privacy
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "تعذر حفظ إعدادات Auto YouTube."
            );
        }

        if (status) {
            status.innerHTML =
                "✅ تم حفظ إعدادات النشر التلقائي.";
        }

        updateYouTubeAutoUI(
            data.schedule || {}
        );

    } catch (error) {

        console.error(
            "Save YouTube Auto error:",
            error
        );

        if (status) {
            status.innerHTML =
                "❌ " +
                escapeYouTubeHtml(error.message);
        }

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "💾 حفظ الإعدادات";
        }
    }
}


/* تشغيل */

async function startYouTubeAuto() {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("يجب تسجيل الدخول أولاً.");
        return;
    }

    const button =
        document.getElementById(
            "youtubeAutoStartBtn"
        );

    const status =
        document.getElementById(
            "youtubeAutoStatus"
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            "⏳ جاري التشغيل...";
    }

    try {

        const response = await fetch(
            "/youtube-auto/start",
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

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "تعذر تشغيل النشر التلقائي."
            );
        }

        if (status) {
            status.innerHTML =
                "🟢 النشر التلقائي على YouTube شغال الآن.";
        }

        updateYouTubeAutoUI(
            data.schedule || {}
        );

    } catch (error) {

        console.error(
            "Start YouTube Auto error:",
            error
        );

        if (status) {
            status.innerHTML =
                "❌ " +
                escapeYouTubeHtml(error.message);
        }

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "▶️ تشغيل النشر التلقائي";
        }
    }
}


/* إيقاف */

async function stopYouTubeAuto() {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("يجب تسجيل الدخول أولاً.");
        return;
    }

    const button =
        document.getElementById(
            "youtubeAutoStopBtn"
        );

    const status =
        document.getElementById(
            "youtubeAutoStatus"
        );

    if (button) {
        button.disabled = true;
        button.textContent =
            "⏳ جاري الإيقاف...";
    }

    try {

        const response = await fetch(
            "/youtube-auto/stop",
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

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "تعذر إيقاف النشر التلقائي."
            );
        }

        if (status) {
            status.innerHTML =
                "⏸️ تم إيقاف النشر التلقائي.";
        }

        updateYouTubeAutoUI(
            data.schedule || {}
        );

    } catch (error) {

        console.error(
            "Stop YouTube Auto error:",
            error
        );

        if (status) {
            status.innerHTML =
                "❌ " +
                escapeYouTubeHtml(error.message);
        }

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "⏸️ إيقاف النشر التلقائي";
        }
    }
}


/* تحديث الحالة في الواجهة */

function updateYouTubeAutoUI(schedule) {

    const startBtn =
        document.getElementById(
            "youtubeAutoStartBtn"
        );

    const stopBtn =
        document.getElementById(
            "youtubeAutoStopBtn"
        );

    const status =
        document.getElementById(
            "youtubeAutoStatus"
        );

    if (!schedule) return;

    if (schedule.enabled === true) {

        if (startBtn) {
            startBtn.style.display = "none";
        }

        if (stopBtn) {
            stopBtn.style.display = "inline-block";
        }

        if (status) {
            status.innerHTML =
                "🟢 النشر التلقائي مفعّل<br>" +
                "🌅 " +
                escapeYouTubeHtml(
                    schedule.morningTime || "09:00"
                ) +
                " — " +
                "🌙 " +
                escapeYouTubeHtml(
                    schedule.eveningTime || "20:00"
                );
        }

    } else {

        if (startBtn) {
            startBtn.style.display = "inline-block";
        }

        if (stopBtn) {
            stopBtn.style.display = "none";
        }

        if (status) {
            status.innerHTML =
                "⚪ النشر التلقائي متوقف.";
        }
    }
}


/* ربط أزرار Auto YouTube */

function bindYouTubeAutoButtons() {

    const saveBtn =
        document.getElementById(
            "youtubeAutoSaveBtn"
        );

    const startBtn =
        document.getElementById(
            "youtubeAutoStartBtn"
        );

    const stopBtn =
        document.getElementById(
            "youtubeAutoStopBtn"
        );

    if (saveBtn &&
        saveBtn.dataset.bound !== "true") {

        saveBtn.dataset.bound = "true";

        saveBtn.addEventListener(
            "click",
            saveYouTubeAutoSettings
        );
    }

    if (startBtn &&
        startBtn.dataset.bound !== "true") {

        startBtn.dataset.bound = "true";

        startBtn.addEventListener(
            "click",
            startYouTubeAuto
        );
    }

    if (stopBtn &&
        stopBtn.dataset.bound !== "true") {

        stopBtn.dataset.bound = "true";

        stopBtn.addEventListener(
            "click",
            stopYouTubeAuto
        );
    }
}




/* تشغيل Auto YouTube عند تحميل الصفحة */

async function initYouTubeAutoScheduler() {

    const token =
        localStorage.getItem("token");

    if (!token) return;

    try {

        const response =
            await fetch(
                "/youtube/status",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (
            data.success &&
            data.connected === true
        ) {
            bindYouTubeAutoButtons();
            await loadYouTubeAutoSettings();
        }

    } catch (error) {

        console.error(
            "YouTube Auto init error:",
            error
        );
    }
}

window.saveYouTubeAutoSettings =
    saveYouTubeAutoSettings;

window.startYouTubeAuto =
    startYouTubeAuto;

window.stopYouTubeAuto =
    stopYouTubeAuto;

window.loadYouTubeAutoSettings =
    loadYouTubeAutoSettings;

window.initYouTubeAutoScheduler =
    initYouTubeAutoScheduler;

setTimeout(
    initYouTubeAutoScheduler,
    300
);
