
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
