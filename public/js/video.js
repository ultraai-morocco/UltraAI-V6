let videoImageFile = null;

function initVideoAI() {

    const input = document.getElementById("videoImage");

    if (!input) return;

    input.addEventListener("change", function () {

        videoImageFile = this.files && this.files[0];

        if (!videoImageFile) return;

        const preview = document.getElementById("videoPreview");

        preview.innerHTML = "";

        const img = document.createElement("img");

        img.src = URL.createObjectURL(videoImageFile);

        img.style.width = "100%";
        img.style.maxHeight = "320px";
        img.style.objectFit = "contain";
        img.style.borderRadius = "16px";

        preview.appendChild(img);

        preview.style.display = "block";
    });
}


async function generateVideoAI() {

    const button =
        document.getElementById("generateVideoBtn");

    const status =
        document.getElementById("videoStatus");

    const result =
        document.getElementById("videoResult");

    const video =
        document.getElementById("generatedVideo");

    const download =
        document.getElementById("videoDownload");

    const prompt =
        document.getElementById("videoPrompt")?.value.trim()
        || "A cinematic smooth camera movement, realistic motion, beautiful lighting";

    if (!videoImageFile) {

        status.style.display = "block";
        status.textContent = "⚠️ اختار صورة أولاً";

        return;
    }

    try {

        button.disabled = true;
        button.textContent = "⏳ جاري توليد الفيديو...";

        status.style.display = "block";
        status.textContent =
            "🎬 جاري توليد الفيديو... ممكن ياخذ شوية الوقت.";

        result.style.display = "none";

        const base64 =
            await fileToDataURL(videoImageFile);

        const response = await fetch(
            "/video-generate",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    image: base64,
                    prompt: prompt
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message || "فشل توليد الفيديو"
            );
        }

        const videoUrl = data.video;

        video.src = videoUrl;

        download.href = videoUrl;

        result.style.display = "block";

        status.textContent =
            "✅ تم توليد الفيديو بنجاح";

        video.load();

    } catch (error) {

        console.error("VIDEO AI ERROR:", error);

        status.textContent =
            "❌ " + (error.message || "وقع خطأ");

    } finally {

        button.disabled = false;
        button.textContent = "🎬 توليد الفيديو";
    }
}


function fileToDataURL(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () =>
            resolve(reader.result);

        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}


window.initVideoAI = initVideoAI;
window.generateVideoAI = generateVideoAI;
