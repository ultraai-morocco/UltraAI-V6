const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const router = express.Router();

const execFileAsync = promisify(execFile);

const HF_SPACE =
  "https://kulkas2pintu-wan555.hf.space";

const PUBLIC_DIR =
  path.join(__dirname, "..", "..", "public", "generated-videos");

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

async function downloadFile(url, output) {
  await execFileAsync("curl", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    url,
    "-o",
    output
  ]);
}

async function uploadImage(imagePath) {
  const { stdout } = await execFileAsync("curl", [
    "-s",
    "-X", "POST",
    `${HF_SPACE}/gradio_api/upload`,
    "-F", `files=@${imagePath}`
  ]);

  const result = JSON.parse(stdout);

  if (!Array.isArray(result) || !result[0]) {
    throw new Error("فشل رفع الصورة إلى Wan Space");
  }

  console.log("========== WAN UPLOAD PATH ==========");
  console.log(result[0]);
  console.log("=====================================");

  return result[0];
}

async function generateVideo(imageFile, prompt) {
  const uploadedPath = await uploadImage(imageFile);

  const imageData = {
    path: uploadedPath,
    orig_name: "test-image.png",
    mime_type: "image/png"
  };

  const payload = {
    data: [
      imageData,
      null,
      prompt || "make this image come alive, cinematic motion, smooth animation",
      4,
      "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
      3.5,
      1,
      1,
      42,
      true,
      6,
      "UniPCMultistep",
      3.0,
      16,
      true,
      true
    ]
  };

  const { stdout } = await execFileAsync("curl", [
    "-sS",
    "-X", "POST",
    `${HF_SPACE}/gradio_api/call/generate_video`,
    "-H", "Content-Type: application/json",
    "-d", JSON.stringify(payload)
  ]);

  const event = JSON.parse(stdout);

  console.log("========== WAN CREATE RESPONSE ==========");
  console.log(stdout);
  console.log("=========================================");

  if (!event.event_id) {
    throw new Error("لم يتم الحصول على event_id من Wan");
  }

  const { stdout: resultText } = await execFileAsync("curl", [
    "-N",
    "-sS",
    `${HF_SPACE}/gradio_api/call/generate_video/${event.event_id}`
  ]);

  console.log("========== WAN SSE RESULT ==========");
  console.log(resultText);
  console.log("====================================");

  const completeMatch = resultText.match(
    /event:\s*complete\s*[\r\n]+data:\s*(.+?)(?=\r?\nevent:|$)/s
  );

  if (!completeMatch) {
    const errorMatch = resultText.match(
      /event:\s*error\s*[\r\n]+data:\s*(.+?)(?=\r?\nevent:|$)/s
    );

    if (errorMatch) {
      throw new Error(
        "Wan أعاد خطأ أثناء توليد الفيديو: " +
        errorMatch[1].trim()
      );
    }

    throw new Error(
      "Wan لم يرجع نتيجة مكتملة:\n" +
      resultText.slice(0, 3000)
    );
  }

  let result;

  try {
    result = JSON.parse(completeMatch[1].trim());
  } catch (e) {
    throw new Error(
      "تعذر قراءة نتيجة Wan:\n" +
      completeMatch[1].slice(0, 3000)
    );
  }

  const videoUrl =
    result?.[0]?.video?.url ||
    result?.[1]?.url ||
    null;

  if (!videoUrl) {
    throw new Error(
      "Wan أكمل التوليد ولكن لم يرجع رابط الفيديو:\n" +
      JSON.stringify(result).slice(0, 3000)
    );
  }

  console.log("✅ WAN VIDEO URL:", videoUrl);

  return videoUrl;
}

router.post("/", async (req, res) => {
  let inputPath = null;

  try {
    const { image, prompt } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "الصورة مطلوبة"
      });
    }

    console.log("🎬 VIDEO GENERATION START");

    /*
     * image يمكن تكون:
     * - base64 data URL
     */

    if (typeof image === "string" && image.startsWith("data:")) {
      const match = image.match(
        /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/
      );

      if (!match) {
        throw new Error("صيغة الصورة غير صحيحة");
      }

      const ext =
        match[1] === "jpeg" ? "jpg" : match[1];

      inputPath = path.join(
        os.tmpdir(),
        `ultraai-video-${crypto.randomUUID()}.${ext}`
      );

      fs.writeFileSync(
        inputPath,
        Buffer.from(match[2], "base64")
      );
    } else {
      throw new Error(
        "حالياً خاص الصورة تكون base64 data URL"
      );
    }

    console.log("📤 Upload image...");

    const videoUrl =
      await generateVideo(inputPath, prompt);

    const filename =
      `video-${crypto.randomUUID()}.mp4`;

    const outputPath =
      path.join(PUBLIC_DIR, filename);

    console.log("📥 Download generated video...");

    await downloadFile(videoUrl, outputPath);

    const publicUrl =
      `/generated-videos/${filename}`;

    console.log("✅ VIDEO GENERATED:", publicUrl);

    return res.json({
      success: true,
      video: publicUrl,
      message: "تم توليد الفيديو بنجاح"
    });

  } catch (error) {
    console.error("❌ VIDEO GENERATION ERROR");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "فشل توليد الفيديو"
    });

  } finally {
    if (inputPath && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch {}
    }
  }
});

router.generateVideo = generateVideo;

module.exports = router;
