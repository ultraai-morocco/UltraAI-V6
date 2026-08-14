const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const auth = require("../auth");
const kvUsers = require("../kv-users");

const MAINTENANCE_KEY = ["ultraai", "system", "maintenance"];

const SETTINGS_FILE = path.join(
    __dirname,
    "..",
    "data",
    "settings.json"
);

const DEFAULT_MAINTENANCE = {
    enabled: false,
    message: "🛠️ جاري الصيانة، المرجو المحاولة لاحقاً."
};


/* =========================================
   HELPERS
========================================= */

function getFileSettings() {

    try {

        if (!fs.existsSync(SETTINGS_FILE)) {
            return {};
        }

        const raw =
            fs.readFileSync(
                SETTINGS_FILE,
                "utf8"
            ) || "{}";

        const data = JSON.parse(raw);

        return data &&
            typeof data === "object"
            ? data
            : {};

    } catch (error) {

        console.error(
            "MAINTENANCE SETTINGS READ ERROR:",
            error
        );

        return {};
    }
}


function saveFileSettings(settings) {

    try {

        const dir =
            path.dirname(SETTINGS_FILE);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(
                dir,
                {
                    recursive: true
                }
            );
        }

        fs.writeFileSync(
            SETTINGS_FILE,
            JSON.stringify(
                settings,
                null,
                2
            ),
            "utf8"
        );

        return true;

    } catch (error) {

        console.error(
            "MAINTENANCE SETTINGS WRITE ERROR:",
            error
        );

        return false;
    }
}


function getFileMaintenance() {

    const settings =
        getFileSettings();

    const maintenance =
        settings.maintenance;

    if (
        maintenance &&
        typeof maintenance === "object"
    ) {

        return {
            ...DEFAULT_MAINTENANCE,
            ...maintenance
        };
    }

    return {
        ...DEFAULT_MAINTENANCE
    };
}


function saveFileMaintenance(maintenance) {

    const settings =
        getFileSettings();

    settings.maintenance =
        maintenance;

    return saveFileSettings(
        settings
    );
}


/*
 * واش Deno KV متوفر؟
 */
function isDenoKVAvailable() {

    return (
        typeof Deno !== "undefined" &&
        typeof Deno.openKv === "function"
    );
}


/* =========================================
   GET MAINTENANCE
========================================= */

async function getMaintenance() {

    /*
     * Deno Deploy
     */
    if (isDenoKVAvailable()) {

        try {

            const kv =
                await kvUsers.getKV();

            const result =
                await kv.get(
                    MAINTENANCE_KEY
                );

            return (
                result.value ||
                DEFAULT_MAINTENANCE
            );

        } catch (error) {

            console.error(
                "DENO KV MAINTENANCE ERROR:",
                error
            );

            /*
             * fallback للملف
             */
            return getFileMaintenance();
        }
    }

    /*
     * Termux / Node
     */
    return getFileMaintenance();
}


/* =========================================
   ADMIN CHECK
========================================= */

async function isAdmin(req) {

    try {

        const header =
            req.headers.authorization || "";

        if (
            !header.startsWith("Bearer ")
        ) {
            return false;
        }

        const token =
            header
                .slice(7)
                .trim();

        if (!token) {
            return false;
        }

        const user =
            await auth.getUserFromToken(
                token
            );

        if (!user) {
            return false;
        }

        return (
            String(user.id) ===
            String(
                process.env.ULTRAAI_ADMIN_ID
            )
        );

    } catch (error) {

        console.error(
            "MAINTENANCE ADMIN CHECK ERROR:",
            error
        );

        return false;
    }
}


/* =========================================
   GET /maintenance
========================================= */

router.get("/", async (req, res) => {

    try {

        const maintenance =
            await getMaintenance();

        const admin = await isAdmin(req);

        return res.json({
            success: true,
            maintenance,
            isAdmin: admin
        });

    } catch (error) {

        console.error(
            "MAINTENANCE GET ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "تعذر تحميل حالة الصيانة."
        });
    }
});


/* =========================================
   POST /maintenance
========================================= */

router.post("/", async (req, res) => {

    try {

        if (!(await isAdmin(req))) {

            return res.status(403).json({
                success: false,
                message:
                    "غير مسموح."
            });
        }

        const enabled =
            req.body.enabled === true;

        const message =
            String(
                req.body.message ||
                DEFAULT_MAINTENANCE.message
            ).trim();

        const maintenance = {

            enabled,

            message:
                message ||
                DEFAULT_MAINTENANCE.message,

            updatedAt:
                new Date().toISOString()
        };


        /*
         * Deno Deploy
         */
        if (isDenoKVAvailable()) {

            try {

                const kv =
                    await kvUsers.getKV();

                await kv.set(
                    MAINTENANCE_KEY,
                    maintenance
                );

            } catch (error) {

                console.error(
                    "DENO KV MAINTENANCE SAVE ERROR:",
                    error
                );

                /*
                 * fallback للملف
                 */
                if (
                    !saveFileMaintenance(
                        maintenance
                    )
                ) {

                    throw error;
                }
            }

        } else {

            /*
             * Termux / Node
             */
            if (
                !saveFileMaintenance(
                    maintenance
                )
            ) {

                throw new Error(
                    "تعذر حفظ إعدادات الصيانة."
                );
            }
        }


        console.log(
            enabled
                ? "🔴 MAINTENANCE ENABLED"
                : "🟢 MAINTENANCE DISABLED"
        );


        return res.json({

            success: true,

            maintenance

        });

    } catch (error) {

        console.error(
            "MAINTENANCE UPDATE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "تعذر تحديث وضع الصيانة."
        });
    }
});


module.exports = router;
