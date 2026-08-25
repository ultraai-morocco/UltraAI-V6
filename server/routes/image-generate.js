const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const router = express.Router();

const execFileAsync = promisify(execFile);

const HF_SPACE =
    "https://mrfakename-z-image-turbo.hf.space";

const PUBLIC_DIR =
    path.join(
        __dirname,
        "..",
        "..",
        "public",
        "generated-images"
    );

fs.mkdirSync(PUBLIC_DIR, {
    recursive: true
});


/* =================================================
   توليد الصورة بواسطة Z-Image Turbo
================================================= */

async function generateImage(prompt) {

    const payload = {
        data: [
            prompt,
            1024,
            1024,
            9,
            42,
            true
        ]
    };

    console.log("🎨 Z-IMAGE REQUEST");

    const { stdout } = await execFileAsync("curl", [
        "-s",
        "--fail",
        "-X",
        "POST",
        `${HF_SPACE}/gradio_api/call/generate_image`,
        "-H",
        "Content-Type: application/json",
        "-d",
        JSON.stringify(payload)
    ]);

    console.log("========== Z-IMAGE CREATE ==========");
    console.log(stdout);
    console.log("====================================");

    const event = JSON.parse(stdout);

    if (!event.event_id) {
        throw new Error(
            "لم يتم الحصول على event_id من Z-Image"
        );
    }

    console.log(
        "🎨 Z-IMAGE EVENT:",
        event.event_id
    );

    const {
        stdout: resultText
    } = await execFileAsync("curl", [
        "-N",
        "-s",
        "--fail",
        `${HF_SPACE}/gradio_api/call/generate_image/${event.event_id}`
    ]);

    console.log("========== Z-IMAGE RESULT ==========");
    console.log(resultText);
    console.log("====================================");

    /*
     * نبحث عن رابط الصورة الذي يرجعه Gradio.
     */

    const patterns = [
        /"url":"(https?:\/\/[^"]+)"/,
        /"path":"(https?:\/\/[^"]+)"/,
        /(https:\/\/mrfakename-z-image-turbo\.hf\.space\/gradio_api\/file=[^"\\]+)/
    ];

    let imageUrl = null;

    for (const pattern of patterns) {

        const match =
            resultText.match(pattern);

        if (match && match[1]) {
            imageUrl =
                match[1]
                    .replace(/\\u0026/g, "&")
                    .replace(/\\\//g, "/");

            break;
        }
    }

    if (!imageUrl) {

        throw new Error(
            "Z-Image لم يرجع رابط الصورة:\n" +
            resultText.slice(0, 3000)
        );
    }

    console.log(
        "🖼️ Z-IMAGE URL:",
        imageUrl
    );

    return imageUrl;
}


/* =================================================
   POST /image-generate
================================================= */

router.post("/", async (req, res) => {

    try {

        const {
            prompt = ""
        } = req.body || {};

        const cleanPrompt =
            String(prompt).trim();

        if (!cleanPrompt) {

            return res.status(400).json({
                success: false,
                message: "Prompt مطلوب"
            });
        }

        console.log("");
        console.log(
            "🎨 IMAGE GENERATION START"
        );
        console.log(
            "PROMPT:",
            cleanPrompt
        );

        const imageUrl =
            await generateImage(
                cleanPrompt
            );

        const filename =
            `image-${crypto.randomUUID()}.png`;

        const outputPath =
            path.join(
                PUBLIC_DIR,
                filename
            );

        console.log(
            "📥 Download generated image..."
        );

        await execFileAsync("curl", [
            "-L",
            "--fail",
            "--silent",
            "--show-error",
            imageUrl,
            "-o",
            outputPath
        ]);

        if (
            !fs.existsSync(outputPath) ||
            fs.statSync(outputPath).size === 0
        ) {

            throw new Error(
                "فشل حفظ الصورة المولدة"
            );
        }

        const publicUrl =
            `/generated-images/${filename}`;

        console.log(
            "✅ IMAGE GENERATED:",
            publicUrl
        );

        return res.json({
            success: true,
            image: publicUrl,
            prompt: cleanPrompt,
            message:
                "تم توليد الصورة بنجاح"
        });

    } catch (error) {

        console.error(
            "❌ IMAGE GENERATION ERROR"
        );

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "فشل توليد الصورة"
        });
    }
});


module.exports = router;
