const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth");

const {
  getUserSchedule,
  saveUserSchedule
} = require("../youtube-auto-scheduler");

/*
 * استخراج User ID
 */
function getUserId(req) {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?._id ||
    null
  );
}

/*
 * GET /youtube-auto
 *
 * جلب إعدادات المستخدم
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "تعذر تحديد المستخدم."
      });
    }

    const schedule = await getUserSchedule(userId);

    return res.json({
      success: true,
      schedule: schedule || {
        enabled: false,
        morningTime: "09:00",
        eveningTime: "20:00",
        privacyStatus: "private"
      }
    });

  } catch (error) {
    console.error("YOUTUBE AUTO GET ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر تحميل إعدادات Auto YouTube."
    });
  }
});


/*
 * POST /youtube-auto/settings
 *
 * حفظ إعدادات النشر
 */
router.post(
  "/settings",
  authMiddleware,
  async (req, res) => {

    try {

      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "تعذر تحديد المستخدم."
        });
      }

      const {
        morningTime = "09:00",
        eveningTime = "20:00",
        privacyStatus = "private"
      } = req.body || {};

      /*
       * التحقق من الوقت
       */
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

      if (
        !timeRegex.test(String(morningTime)) ||
        !timeRegex.test(String(eveningTime))
      ) {
        return res.status(400).json({
          success: false,
          message: "صيغة الوقت غير صحيحة. مثال: 09:00"
        });
      }

      /*
       * الخصوصية
       */
      const allowedPrivacy = [
        "public",
        "unlisted",
        "private"
      ];

      const cleanPrivacy =
        allowedPrivacy.includes(privacyStatus)
          ? privacyStatus
          : "private";

      const schedule = await saveUserSchedule(
        userId,
        {
          enabled: false,
          morningTime: String(morningTime),
          eveningTime: String(eveningTime),
          privacyStatus: cleanPrivacy
        }
      );

      return res.json({
        success: true,
        message: "تم حفظ إعدادات Auto YouTube ✅",
        schedule
      });

    } catch (error) {

      console.error(
        "YOUTUBE AUTO SETTINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "تعذر حفظ إعدادات Auto YouTube."
      });

    }
  }
);


/*
 * POST /youtube-auto/start
 *
 * تشغيل النشر التلقائي
 */
router.post(
  "/start",
  authMiddleware,
  async (req, res) => {

    try {

      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "تعذر تحديد المستخدم."
        });
      }

      const oldSchedule =
        await getUserSchedule(userId) || {};

      const schedule =
        await saveUserSchedule(
          userId,
          {
            ...oldSchedule,
            enabled: true,
            startedAt:
              new Date().toISOString()
          }
        );

      return res.json({
        success: true,
        message:
          "تم تشغيل النشر التلقائي على YouTube ▶️",
        schedule
      });

    } catch (error) {

      console.error(
        "YOUTUBE AUTO START ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "تعذر تشغيل النشر التلقائي."
      });

    }
  }
);


/*
 * POST /youtube-auto/stop
 *
 * إيقاف النشر التلقائي
 */
router.post(
  "/stop",
  authMiddleware,
  async (req, res) => {

    try {

      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "تعذر تحديد المستخدم."
        });
      }

      const oldSchedule =
        await getUserSchedule(userId) || {};

      const schedule =
        await saveUserSchedule(
          userId,
          {
            ...oldSchedule,
            enabled: false,
            stoppedAt:
              new Date().toISOString()
          }
        );

      return res.json({
        success: true,
        message:
          "تم إيقاف النشر التلقائي ⏸️",
        schedule
      });

    } catch (error) {

      console.error(
        "YOUTUBE AUTO STOP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "تعذر إيقاف النشر التلقائي."
      });

    }
  }
);


module.exports = router;
