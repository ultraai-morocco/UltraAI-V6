/* =====================================
   ULTRAAI FILES
===================================== */

function filesToken() {

    return localStorage.getItem("token") || "";

}


/* =========================
   LOAD FILES
========================= */

async function loadFiles() {

    const box =
        document.getElementById("filesList");

    if (!box) return;


    try {

        const response =
            await fetch("/files-api", {

                headers: {
                    Authorization:
                        "Bearer " + filesToken()
                }

            });


        const data =
            await response.json();


        if (!data.success) {

            box.innerHTML = `
                <div class="files-empty">
                    🔒 ${data.message || "يجب تسجيل الدخول"}
                </div>
            `;

            return;
        }


        if (!data.files || data.files.length === 0) {

            box.innerHTML = `
                <div class="files-empty">
                    📂
                    <strong>لا توجد ملفات بعد</strong>
                    <span>ارفع أول ملف لك من الأعلى</span>
                </div>
            `;

            return;
        }


        box.innerHTML =
            data.files.map(file => {

                const size =
                    formatFileSize(file.size);

                const name =
                    file.filename
                    .replace(/^[^_]+_\d+_[^_]+/, "")
                    || file.filename;


                return `

                    <div class="file-item">

                        <div class="file-icon">
                            ${getFileIcon(name)}
                        </div>

                        <div class="file-info">

                            <strong>
                                ${escapeFileText(name)}
                            </strong>

                            <span>
                                ${size}
                            </span>

                        </div>

                        <div class="file-actions">

                            <a
                                href="${file.url}"
                                target="_blank"
                                rel="noopener">
                                👁️
                            </a>

                            <button
                                type="button"
                                onclick="deleteUltraFile('${escapeFileText(file.filename)}')">
                                🗑️
                            </button>

                        </div>

                    </div>

                `;

            }).join("");


    } catch (error) {

        console.error("Files error:", error);

        box.innerHTML = `
            <div class="files-empty">
                ❌ تعذر تحميل الملفات
            </div>
        `;

    }

}


/* =========================
   UPLOAD
========================= */

async function uploadUltraFile(input) {

    if (!input || !input.files || !input.files[0]) {
        return;
    }


    const file =
        input.files[0];


    if (file.size > 10 * 1024 * 1024) {

        showUploadStatus(
            "❌ حجم الملف يجب ألا يتجاوز 10MB",
            true
        );

        input.value = "";

        return;
    }


    const formData =
        new FormData();

    formData.append("file", file);


    showUploadStatus(
        "⏳ جاري رفع الملف...",
        false
    );


    try {

        const response =
            await fetch("/files-api/upload", {

                method: "POST",

                headers: {
                    Authorization:
                        "Bearer " + filesToken()
                },

                body: formData

            });


        const data =
            await response.json();


        if (!data.success) {

            showUploadStatus(
                "❌ " +
                (data.message ||
                "فشل رفع الملف"),
                true
            );

            return;
        }


        showUploadStatus(
            "✅ تم رفع الملف بنجاح",
            false
        );


        input.value = "";


        loadFiles();


    } catch (error) {

        console.error("Upload error:", error);

        showUploadStatus(
            "❌ حدث خطأ أثناء رفع الملف",
            true
        );

    }

}


/* =========================
   DELETE
========================= */

async function deleteUltraFile(filename) {

    if (!confirm("هل تريد حذف هذا الملف؟")) {
        return;
    }


    try {

        const response =
            await fetch(
                "/files-api/" +
                encodeURIComponent(filename),
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            "Bearer " + filesToken()
                    }
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر حذف الملف"
            );

            return;
        }


        loadFiles();


    } catch (error) {

        console.error(error);

        alert("حدث خطأ أثناء حذف الملف");

    }

}


/* =========================
   HELPERS
========================= */

function formatFileSize(bytes) {

    if (!bytes) return "0 B";

    const units =
        ["B", "KB", "MB", "GB"];

    let i = 0;
    let size = bytes;

    while (
        size >= 1024 &&
        i < units.length - 1
    ) {

        size /= 1024;
        i++;

    }


    return (
        size.toFixed(size >= 10 ? 0 : 1)
        + " "
        + units[i]
    );

}


function getFileIcon(name) {

    const ext =
        name
        .split(".")
        .pop()
        .toLowerCase();


    if (
        ["jpg","jpeg","png","gif","webp","svg"]
        .includes(ext)
    ) {
        return "🖼️";
    }


    if (ext === "pdf") {
        return "📕";
    }


    if (
        ["doc","docx"]
        .includes(ext)
    ) {
        return "📘";
    }


    if (
        ["xls","xlsx","csv"]
        .includes(ext)
    ) {
        return "📊";
    }


    if (
        ["zip","rar","7z"]
        .includes(ext)
    ) {
        return "🗜️";
    }


    return "📄";

}


function escapeFileText(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function showUploadStatus(message, error) {

    const box =
        document.getElementById("uploadStatus");

    if (!box) return;


    box.textContent = message;

    box.className =
        error
            ? "upload-status error"
            : "upload-status success";

}


/* متاحة للـ router */

window.loadFiles = loadFiles;
window.uploadUltraFile = uploadUltraFile;
window.deleteUltraFile = deleteUltraFile;
