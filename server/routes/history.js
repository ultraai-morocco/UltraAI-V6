const express = require("express");
const router = express.Router();

const db = require("../database");
const auth = require("../auth");


router.get("/:conversationId",(req,res)=>{

    const token =
        req.headers.authorization?.split(" ")[1];


    if(!token){

        return res.json({
            success:false,
            message:"يجب تسجيل الدخول"
        });

    }


    const user =
        auth.verifyToken(token);


    if(!user){

        return res.json({
            success:false,
            message:"رمز الدخول غير صالح"
        });

    }


    const conversationId =
        Number(
            req.params.conversationId
        );


    const chats =
        db.loadChats()
        .filter(c =>
            c.userId === user.id &&
            Number(
                c.conversationId || 0
            ) === conversationId
        )
        .map(c => {

            const item = {
                ...c
            };


            /*
               الصورة الجديدة
            */

            if(c.imageFile){

                item.image =
                    "/chat-image/" +
                    encodeURIComponent(
                        c.imageFile
                    );

            }


            /*
               الصور القديمة التي كانت
               مخزنة Base64 تبقى قابلة للعرض
            */

            if(
                !item.image &&
                c.image &&
                typeof c.image === "string"
            ){

                item.image =
                    c.image;

            }


            return item;

        });


    res.json({

        success:true,

        messages:chats

    });

});


module.exports = router;
