const express = require("express");
const fs = require("fs");
const path = require("path");
const authMiddleware = require("../middleware/auth");
const kvUsers = require("../kv-users");

const router = express.Router();

router.post("/upload", authMiddleware, async (req, res) => {
    try {
        const userId =
            req.user?.id ||
            req.user?.userId ||
            req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "تعذر تحديد المستخدم."
            });
        }

        const user = await kvUsers.findUserById(String(userId));

        if (!user?.tiktok?.accessToken) {
            return res.status(400).json({
                success: false,
                message: "حساب TikTok غير مربوط."
            });
        }

        const requestedVideo = String(
            req.body?.videoPath || ""
        ).trim();

        if (!requestedVideo) {
            return res.status(400).json({
                success: false,
                message: "مسار الفيديو مطلوب."
            });
        }

        const cleanVideoPath =
            requestedVideo
                .replace(/^https?:\/\/[^/]+/, "")
                .replace(/^\/+/, "");

        const videoPath = path.join(
            __dirname,
            "..",
            "..",
            "public",
            cleanVideoPath
        );

        const publicRoot = path.resolve(
            __dirname,
            "..",
            "..",
            "public"
        );

        const resolvedVideoPath =
            path.resolve(videoPath);

        if (
            resolvedVideoPath !== publicRoot &&
            !resolvedVideoPath.startsWith(publicRoot + path.sep)
        ) {
            return res.status(400).json({
                success: false,
                message: "مسار الفيديو غير مسموح."
            });
        }

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({
                success: false,
                message: "الفيديو غير موجود."
            });
        }

        const stat = fs.statSync(videoPath);
        const accessToken = user.tiktok.accessToken;

        console.log("🎵 TikTok Draft Upload:", {
            userId: String(userId),
            size: stat.size,
            file: path.basename(videoPath)
        });

        const initResponse = await fetch(
            "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json; charset=UTF-8"
                },
                body: JSON.stringify({
                    source_info: {
                        source: "FILE_UPLOAD",
                        video_size: stat.size,
                        chunk_size: stat.size,
                        total_chunk_count: 1
                    }
                })
            }
        );

        const initData = await initResponse.json();

        console.log("🎵 TikTok INIT:", {
            status: initResponse.status,
            data: initData
        });

        if (!initResponse.ok || !initData?.data?.upload_url) {
            return res.status(502).json({
                success: false,
                message: "TikTok رفض بدء رفع الفيديو.",
                tiktok: initData
            });
        }

        const uploadUrl = initData.data.upload_url;
        const videoBuffer = fs.readFileSync(videoPath);

        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "video/mp4",
                "Content-Length": String(videoBuffer.length),
                "Content-Range": `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`
            },
            body: videoBuffer
        });

        const uploadText = await uploadResponse.text();

        console.log("🎵 TikTok UPLOAD:", {
            status: uploadResponse.status,
            response: uploadText
        });

        if (!uploadResponse.ok) {
            return res.status(502).json({
                success: false,
                message: "فشل رفع الفيديو إلى TikTok.",
                status: uploadResponse.status,
                response: uploadText
            });
        }

        return res.json({
            success: true,
            message: "✅ تم رفع الفيديو إلى TikTok كـ Draft.",
            tiktok: {
                uploadStatus: uploadResponse.status,
                response: uploadText
            }
        });

    } catch (error) {
        console.error("❌ TikTok upload error:", error);

        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء رفع الفيديو.",
            error: error.message
        });
    }
});

/* =================================================
   TIKTOK DIRECT PUBLISH
================================================= */

router.post("/publish", authMiddleware, async (req, res) => {
    try {
        const userId =
            req.user?.id ||
            req.user?.userId ||
            req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "تعذر تحديد المستخدم."
            });
        }

        const user =
            await kvUsers.findUserById(String(userId));

        if (!user?.tiktok?.accessToken) {
            return res.status(400).json({
                success: false,
                message: "حساب TikTok غير مربوط."
            });
        }

        const requestedVideo =
            String(req.body?.videoPath || "").trim();

        const title =
            String(req.body?.title || "").trim();

        if (!requestedVideo) {
            return res.status(400).json({
                success: false,
                message: "مسار الفيديو مطلوب."
            });
        }

        const cleanVideoPath =
            requestedVideo
                .replace(/^https?:\/\/[^/]+/, "")
                .replace(/^\/+/, "");

        const videoPath = path.join(
            __dirname,
            "..",
            "..",
            "public",
            cleanVideoPath
        );

        const publicRoot =
            path.resolve(
                __dirname,
                "..",
                "..",
                "public"
            );

        const resolvedVideoPath =
            path.resolve(videoPath);

        if (
            resolvedVideoPath !== publicRoot &&
            !resolvedVideoPath.startsWith(
                publicRoot + path.sep
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "مسار الفيديو غير مسموح."
            });
        }

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({
                success: false,
                message: "الفيديو غير موجود."
            });
        }

        const stat =
            fs.statSync(videoPath);

        const accessToken =
            user.tiktok.accessToken;

        /*
         * 1. Get creator information
         */
        const creatorResponse = await fetch(
            "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
            {
                method: "POST",
                headers: {
                    "Authorization":
                        `Bearer ${accessToken}`,
                    "Content-Type":
                        "application/json; charset=UTF-8"
                }
            }
        );

        const creatorData =
            await creatorResponse.json();

        console.log("🎵 TikTok CREATOR INFO:", {
            status: creatorResponse.status,
            data: creatorData
        });

        if (
            !creatorResponse.ok ||
            creatorData?.error?.code !== "ok" ||
            !creatorData?.data
        ) {
            return res.status(502).json({
                success: false,
                message:
                    "تعذر الحصول على معلومات حساب TikTok.",
                tiktok: creatorData
            });
        }

        const creator =
            creatorData.data;

        const privacyOptions =
            Array.isArray(
                creator.privacy_level_options
            )
                ? creator.privacy_level_options
                : [];

        if (!privacyOptions.length) {
            return res.status(400).json({
                success: false,
                message:
                    "TikTok لم يرجع مستويات الخصوصية المتاحة.",
                tiktok: creatorData
            });
        }

        /*
         * Prefer PUBLIC if TikTok allows it.
         * Otherwise use the first allowed level.
         */
        const privacyLevel =
            privacyOptions.includes("PUBLIC_TO_EVERYONE")
                ? "PUBLIC_TO_EVERYONE"
                : privacyOptions[0];

        /*
         * TikTok title is limited.
         */
        const postTitle =
            (title || "UltraAI")
                .slice(0, 2200);

        /*
         * 2. Initialize Direct Post
         */
        const initResponse = await fetch(
            "https://open.tiktokapis.com/v2/post/publish/video/init/",
            {
                method: "POST",
                headers: {
                    "Authorization":
                        `Bearer ${accessToken}`,
                    "Content-Type":
                        "application/json; charset=UTF-8"
                },
                body: JSON.stringify({
                    post_info: {
                        title: postTitle,
                        privacy_level:
                            privacyLevel,
                        disable_comment: false,
                        disable_duet: false,
                        disable_stitch: false
                    },
                    source_info: {
                        source: "FILE_UPLOAD",
                        video_size: stat.size,
                        chunk_size: stat.size,
                        total_chunk_count: 1
                    }
                })
            }
        );

        const initData =
            await initResponse.json();

        console.log("🎵 TikTok DIRECT INIT:", {
            status: initResponse.status,
            data: initData
        });

        if (
            !initResponse.ok ||
            initData?.error?.code !== "ok" ||
            !initData?.data?.upload_url
        ) {
            return res.status(502).json({
                success: false,
                message:
                    "TikTok رفض بدء النشر المباشر.",
                tiktok: initData
            });
        }

        /*
         * 3. Upload video
         */
        const uploadUrl =
            initData.data.upload_url;

        const videoBuffer =
            fs.readFileSync(videoPath);

        const uploadResponse =
            await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type":
                        "video/mp4",
                    "Content-Length":
                        String(videoBuffer.length),
                    "Content-Range":
                        `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`
                },
                body: videoBuffer
            });

        const uploadText =
            await uploadResponse.text();

        console.log("🎵 TikTok DIRECT UPLOAD:", {
            status: uploadResponse.status,
            response: uploadText
        });

        if (!uploadResponse.ok) {
            return res.status(502).json({
                success: false,
                message:
                    "فشل رفع الفيديو للنشر المباشر.",
                status:
                    uploadResponse.status,
                response:
                    uploadText
            });
        }

        return res.json({
            success: true,
            message:
                "✅ تم إرسال الفيديو إلى TikTok للنشر المباشر.",
            publish_id:
                initData.data.publish_id,
            privacy_level:
                privacyLevel,
            tiktok: {
                uploadStatus:
                    uploadResponse.status
            }
        });

    } catch (error) {
        console.error(
            "❌ TikTok Direct Publish error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "حدث خطأ أثناء النشر المباشر على TikTok.",
            error:
                error.message
        });
    }
});

module.exports = router;
