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

module.exports = router;
