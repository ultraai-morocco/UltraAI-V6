const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const auth = require("../auth");

const reportsFile =
    path.join(
        __dirname,
        "../data/reports.json"
    );


function loadReports(){

    if(!fs.existsSync(reportsFile)){
        return [];
    }

    try{

        return JSON.parse(
            fs.readFileSync(
                reportsFile,
                "utf8"
            ) || "[]"
        );

    }catch(error){

        console.error(
            "REPORTS LOAD ERROR:",
            error
        );

        return [];

    }

}


function saveReports(reports){

    fs.writeFileSync(
        reportsFile,
        JSON.stringify(
            reports,
            null,
            2
        )
    );

}


/*
 * إنشاء إبلاغ
 *
 * POST /reports
 *
 * body:
 * {
 *   messageId,
 *   reason,
 *   message
 * }
 */

router.post("/", (req,res)=>{

    try{

        const token =
            req.headers.authorization?.split(" ")[1];

        if(!token){

            return res.status(401).json({
                success:false,
                message:"يجب تسجيل الدخول"
            });

        }


        const user =
            auth.verifyToken(token);

        if(!user){

            return res.status(401).json({
                success:false,
                message:"رمز الدخول غير صالح"
            });

        }


        const messageId =
            String(
                req.body.messageId || ""
            ).trim();

        const reason =
            String(
                req.body.reason || ""
            ).trim();

        const message =
            String(
                req.body.message || ""
            ).trim();


        if(!messageId){

            return res.status(400).json({
                success:false,
                message:"رقم الرسالة مطلوب"
            });

        }


        if(!reason){

            return res.status(400).json({
                success:false,
                message:"سبب الإبلاغ مطلوب"
            });

        }


        const reports =
            loadReports();


        /*
         * منع نفس المستخدم من
         * الإبلاغ عن نفس الرسالة
         * أكثر من مرة.
         */

        const alreadyReported =
            reports.some(report =>
                String(report.messageId) === messageId &&
                String(report.userId) === String(user.id) &&
                report.status === "pending"
            );


        if(alreadyReported){

            return res.json({
                success:false,
                message:"سبق ليك بلغتي على هاد الرسالة"
            });

        }


        const report = {

            id:
                Date.now().toString() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2,8),

            messageId,

            userId:
                user.id,

            reason,

            message,

            status:
                "pending",

            createdAt:
                new Date().toISOString()

        };


        reports.push(report);

        saveReports(reports);


        console.log(
            "🚩 NEW REPORT:",
            report.id,
            "MESSAGE:",
            messageId
        );


        return res.json({

            success:true,

            message:
                "تم إرسال الإبلاغ بنجاح"

        });


    }catch(error){

        console.error(
            "REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            message:
                "حدث خطأ أثناء إرسال الإبلاغ"

        });

    }

});


module.exports = router;
