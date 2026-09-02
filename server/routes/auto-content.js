const express = require("express");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const router = express.Router();

const execFileAsync = promisify(execFile);

const authMiddleware = require("../middleware/auth");

const videoGenerator =
    require("./video-generate");

const GroqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const DATA_FILE = path.join(
    __dirname,
    "..",
    "data",
    "auto-content.json"
);

const IMAGE_HF_SPACE =
    "https://mrfakename-z-image-turbo.hf.space";

const IMAGE_PUBLIC_DIR =
    path.join(
        __dirname,
        "..",
        "..",
        "public",
        "generated-images"
    );

fs.mkdirSync(IMAGE_PUBLIC_DIR, {
    recursive: true
});


/* =================================================
   DATA
================================================= */

function loadData() {

    try {

        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }

        const raw =
            fs.readFileSync(DATA_FILE, "utf8") || "[]";

        const data =
            JSON.parse(raw);

        return Array.isArray(data)
            ? data
            : [];

    } catch (error) {

        console.error(
            "AUTO CONTENT LOAD ERROR:",
            error
        );

        return [];
    }
}


function saveData(data) {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}


/* =================================================
   Z-IMAGE TURBO
================================================= */

async function generateImage(prompt) {

    const cleanPrompt =
        String(prompt || "").trim();

    if (!cleanPrompt) {
        throw new Error(
            "IMAGE_PROMPT_EMPTY"
        );
    }

    console.log("");
    console.log(
        "🎨 Z-IMAGE GENERATION START"
    );

    console.log(
        "PROMPT:",
        cleanPrompt
    );

    const payload = {
        data: [
            cleanPrompt,
            1024,
            1024,
            9,
            42,
            true
        ]
    };

    const {
        stdout
    } = await execFileAsync("curl", [
        "-s",
        "--fail",
        "-X",
        "POST",
        `${IMAGE_HF_SPACE}/gradio_api/call/generate_image`,
        "-H",
        "Content-Type: application/json",
        "-H",
        `Authorization: Bearer ${process.env.HF_TOKEN}`,
        "-d",
        JSON.stringify(payload)
    ]);

    const event =
        JSON.parse(stdout);

    console.log(
        "🎨 Z-IMAGE EVENT:",
        event.event_id
    );

    if (!event.event_id) {

        throw new Error(
            "لم يتم الحصول على event_id من Z-Image"
        );
    }

    const {
        stdout: resultText
    } = await execFileAsync("curl", [
        "-N",
        "-s",
        "--fail",
        "-H",
        `Authorization: Bearer ${process.env.HF_TOKEN}`,
        `${IMAGE_HF_SPACE}/gradio_api/call/generate_image/${event.event_id}`
    ]);

    console.log(
        "========== Z-IMAGE RESULT =========="
    );

    console.log(
        resultText.slice(0, 4000)
    );

    console.log(
        "===================================="
    );


    /*
     * Gradio قد يرجع URL أو path.
     */

    const patterns = [

        /"url":"(https?:\/\/[^"]+)"/,

        /"path":"(https?:\/\/[^"]+)"/,

        /(https:\/\/mrfakename-z-image-turbo\.hf\.space\/gradio_api\/file=[^"\\\s]+)/
    ];

    let imageUrl = null;

    for (
        const pattern of patterns
    ) {

        const match =
            resultText.match(pattern);

        if (
            match &&
            match[1]
        ) {

            imageUrl =
                match[1]
                    .replace(
                        /\\u0026/g,
                        "&"
                    )
                    .replace(
                        /\\\//g,
                        "/"
                    );

            break;
        }
    }


    if (!imageUrl) {

        throw new Error(
            "Z-Image لم يرجع رابط الصورة:\n" +
            resultText.slice(0, 2000)
        );
    }


    const filename =
        `image-${crypto.randomUUID()}.png`;

    const outputPath =
        path.join(
            IMAGE_PUBLIC_DIR,
            filename
        );


    console.log(
        "📥 Download Z-Image..."
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
        "✅ Z-IMAGE SAVED:",
        publicUrl
    );


    return publicUrl;
}


/* =================================================
   TIKTOK ACCESS
================================================= */

function checkTikTokAccess(req) {

    const accessFile =
        path.join(
            __dirname,
            "..",
            "data",
            "tiktok-access.json"
        );

    let accessData = {};

    try {

        if (
            fs.existsSync(accessFile)
        ) {

            accessData =
                JSON.parse(
                    fs.readFileSync(
                        accessFile,
                        "utf8"
                    ) || "{}"
                );
        }

    } catch (error) {

        console.error(
            "TIKTOK ACCESS CHECK ERROR:",
            error
        );

        return {
            error: true
        };
    }


    const currentUserId =
        req.user.id ||
        req.user.userId ||
        req.user._id;


    const access =
        accessData[
            String(currentUserId)
        ];


    const expiresAt =
        access?.expiresAt
            ? new Date(
                access.expiresAt
            ).getTime()
            : 0;


    const tiktokActive =
        access?.enabled === true &&
        Number.isFinite(expiresAt) &&
        expiresAt > Date.now();


    const isAdmin =
        req.user &&
        String(
            req.user.id ||
            req.user.userId ||
            req.user._id
        ) ===
        String(
            process.env.ULTRAAI_ADMIN_ID
        );


    return {
        error: false,
        allowed:
            isAdmin ||
            tiktokActive
    };
}


/* =================================================
   GENERATE AUTO CONTENT
================================================= */

router.post(
    "/generate",
    authMiddleware,
    async (req, res) => {

        /*
         * TikTok Free Access
         */

        const access =
            checkTikTokAccess(req);


        if (access.error) {

            return res.status(500).json({
                success: false,
                message:
                    "تعذر التحقق من صلاحية TikTok."
            });
        }


        if (!access.allowed) {

            return res.status(403).json({
                success: false,
                code:
                    "TIKTOK_FREE_EXPIRED",
                message:
                    "مدة TikTok المجانية منتهية أو غير مفعلة."
            });
        }


        try {

            const {
                niche = "",
                language = "ar",
                audience = ""
            } = req.body || {};


            const cleanNiche =
                String(niche).trim();

            const cleanLanguage =
                String(language).trim();

            const cleanAudience =
                String(audience).trim();


            if (!cleanNiche) {

                return res.status(400).json({
                    success: false,
                    message:
                        "النيش مطلوب."
                });
            }


            const languageName =
                cleanLanguage === "en"
                    ? "الإنجليزية"
                    : cleanLanguage === "fr"
                        ? "الفرنسية"
                        : "العربية";


            /* =====================================
               GROQ
            ===================================== */

            const prompt = `
أنت خبير محترف في صناعة محتوى TikTok قصير وقابل للانتشار.

النيش:
${cleanNiche}

الجمهور المستهدف:
${cleanAudience || "جمهور عام مهتم بهذا المجال"}

لغة المحتوى:
${languageName}

أنشئ منشورين مختلفين تماماً:
1. منشور صباحي.
2. منشور مسائي.

مهم جداً:

- لا تكرر نفس الفكرة.
- اجعل كل فكرة مناسبة لفيديو TikTok قصير.
- Hook قوي جداً في البداية.
- Script واضح وقابل للتحويل إلى فيديو.
- لا تجعل السكريبت طويلاً.
- لا تستخدم معلومات مشكوكاً فيها.
- لا تضع مقدمة عامة.
- لا تستخدم Markdown.
- imagePrompt يجب أن يكون وصفاً بصرياً واضحاً ومفصلاً لصناعة صورة مناسبة للفيديو.
- imagePrompt يجب أن يكون باللغة الإنجليزية.
- لا تضع نصوصاً أو شعارات أو Watermarks داخل الصورة.
- اجعل الصورة واقعية وسينمائية ومناسبة لـ TikTok.
- الصورة يجب أن تعبر مباشرة عن موضوع الفيديو.
- أرجع JSON فقط.

الصيغة:

{
  "morning": {
    "title": "",
    "hook": "",
    "script": "",
    "caption": "",
    "hashtags": [],
    "imagePrompt": ""
  },
  "evening": {
    "title": "",
    "hook": "",
    "script": "",
    "caption": "",
    "hashtags": [],
    "imagePrompt": ""
  }
}
`;


            const completion =
                await GroqClient
                    .chat
                    .completions
                    .create({

                        model:
                            "openai/gpt-oss-120b",

                        messages: [

                            {
                                role: "system",

                                content:
                                    "أنت خبير في صناعة محتوى TikTok وتحويل النيشات إلى أفكار فيديو وصور جذابة."
                            },

                            {
                                role: "user",

                                content:
                                    prompt
                            }
                        ],

                        temperature:
                            1.05,

                        max_tokens:
                            2200
                    });


            const raw =
                completion
                    .choices?.[0]
                    ?.message
                    ?.content || "";


            let parsed;


            try {

                const clean =
                    raw
                        .replace(
                            /^```json/i,
                            ""
                        )
                        .replace(
                            /^```/i,
                            ""
                        )
                        .replace(
                            /```$/i,
                            ""
                        )
                        .trim();


                parsed =
                    JSON.parse(clean);

            } catch (parseError) {

                console.error(
                    "AUTO CONTENT JSON ERROR:",
                    raw
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "تعذر تجهيز المحتوى."
                });
            }


            if (
                !parsed ||
                !parsed.morning ||
                !parsed.evening
            ) {

                return res.status(500).json({
                    success: false,
                    message:
                        "النتيجة غير مكتملة."
                });
            }


            /*
             * نتأكد من وجود imagePrompt.
             */

            if (
                !parsed.morning.imagePrompt ||
                !parsed.evening.imagePrompt
            ) {

                return res.status(500).json({
                    success: false,
                    message:
                        "تعذر تجهيز أوصاف الصور."
                });
            }


            const userId =
                req.user.id ||
                req.user.userId ||
                req.user._id;


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "تعذر تحديد المستخدم."
                });
            }


            /* =====================================
               IMAGE 1
            ===================================== */

            console.log(
                "🌅 GENERATING MORNING IMAGE..."
            );


            const morningImage =
                await generateImage(
                    parsed.morning.imagePrompt
                );


            /* =====================================
               IMAGE 2
            ===================================== */

            console.log(
                "🌙 GENERATING EVENING IMAGE..."
            );


            const eveningImage =
                await generateImage(
                    parsed.evening.imagePrompt
                );


            /* =====================================
               SAVE
            ===================================== */

            const data =
                loadData();


            const item = {

                id:
                    Date.now().toString() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .substring(2, 8),

                userId:
                    String(userId),

                niche:
                    cleanNiche,

                language:
                    cleanLanguage,

                audience:
                    cleanAudience,

                morning: {

                    ...parsed.morning,

                    image:
                        morningImage,

                    video:
                        null
                },

                evening: {

                    ...parsed.evening,

                    image:
                        eveningImage,

                    video:
                        null
                },

                status:
                    "draft",

                createdAt:
                    new Date().toISOString()
            };


            data.push(item);

            saveData(data);


            console.log(
                "✅ AUTO CONTENT + IMAGES SAVED"
            );


            return res.json({

                success:
                    true,

                content:
                    item
            });


        } catch (error) {

            console.error(
                "AUTO CONTENT ERROR:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "تعذر توليد المحتوى حالياً."
            });
        }
    }
);



/* =================================================
   GENERATE VIDEO FOR AUTO CONTENT
================================================= */

router.post(
    "/video",
    authMiddleware,
    async (req, res) => {

        try {

            const {
                contentId,
                slot
            } = req.body || {};

            if (!contentId) {
                return res.status(400).json({
                    success: false,
                    message: "معرف المحتوى مطلوب."
                });
            }

            if (!["morning", "evening"].includes(slot)) {
                return res.status(400).json({
                    success: false,
                    message: "نوع المنشور غير صحيح."
                });
            }

            const userId =
                req.user.id ||
                req.user.userId ||
                req.user._id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "تعذر تحديد المستخدم."
                });
            }

            const data = loadData();

            const item = data.find(
                entry =>
                    String(entry.id) === String(contentId) &&
                    String(entry.userId) === String(userId)
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "المحتوى غير موجود."
                });
            }

            const post = item[slot];

            if (!post || !post.image) {
                return res.status(400).json({
                    success: false,
                    message: "صورة المنشور غير موجودة."
                });
            }

            if (
                post.video &&
                String(post.video).trim()
            ) {
                return res.json({
                    success: true,
                    video: post.video,
                    message: "الفيديو موجود مسبقاً."
                });
            }

            const imagePath =
                path.join(
                    __dirname,
                    "..",
                    "..",
                    "public",
                    post.image.replace(/^\/+/, "")
                );

            if (!fs.existsSync(imagePath)) {
                return res.status(404).json({
                    success: false,
                    message: "ملف الصورة غير موجود على السيرفر."
                });
            }

            console.log(
                `🎬 AUTO VIDEO START: ${slot}`
            );

            const videoUrl =
                await videoGenerator.generateVideo(
                    imagePath,
                    post.script ||
                    post.hook ||
                    "smooth cinematic motion, natural movement, realistic camera movement"
                );

            const filename =
                `auto-video-${crypto.randomUUID()}.mp4`;

            const outputPath =
                path.join(
                    __dirname,
                    "..",
                    "..",
                    "public",
                    "generated-videos",
                    filename
                );

            fs.mkdirSync(
                path.dirname(outputPath),
                { recursive: true }
            );

            await execFileAsync("curl", [
                "-L",
                "--fail",
                "--silent",
                "--show-error",
                videoUrl,
                "-o",
                outputPath
            ]);

            if (
                !fs.existsSync(outputPath) ||
                fs.statSync(outputPath).size === 0
            ) {
                throw new Error(
                    "فشل حفظ الفيديو المولد."
                );
            }

            const publicVideo =
                `/generated-videos/${filename}`;

            item[slot].video =
                publicVideo;

            saveData(data);

            console.log(
                "✅ AUTO VIDEO SAVED:",
                publicVideo
            );

            return res.json({
                success: true,
                video: publicVideo,
                contentId,
                slot,
                message: "تم توليد الفيديو بنجاح."
            });

        } catch (error) {

            console.error(
                "AUTO VIDEO ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "تعذر توليد الفيديو."
            });
        }
    }
);


/* =================================================
   LIST USER CONTENT
================================================= */

router.get(
    "/",
    authMiddleware,
    (req, res) => {

        try {

            const userId =
                req.user.id ||
                req.user.userId ||
                req.user._id;


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "تعذر تحديد المستخدم."
                });
            }


            const data =
                loadData();


            const userContent =
                data.filter(
                    item =>
                        String(
                            item.userId
                        ) ===
                        String(
                            userId
                        )
                );


            res.json({

                success:
                    true,

                content:
                    userContent
            });


        } catch (error) {

            console.error(
                "AUTO CONTENT LIST ERROR:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "تعذر تحميل المحتوى."
            });
        }
    }
);


module.exports = router;
