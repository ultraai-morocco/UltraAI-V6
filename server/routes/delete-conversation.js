const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const auth = require("../auth");
const db = require("../database");


const file =
    path.join(
        __dirname,
        "../data/conversations.json"
    );


const imageDir =
    path.join(
        __dirname,
        "../data/chat-images"
    );


function load(){

    if(!fs.existsSync(file))
        return [];

    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        ) || "[]"
    );

}


function save(data){

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            2
        )
    );

}


function deleteImage(filename){

    if(!filename)
        return;


    const safeName =
        path.basename(filename);


    const imageFile =
        path.join(
            imageDir,
            safeName
        );


    if(fs.existsSync(imageFile)){

        try{

            fs.unlinkSync(
                imageFile
            );

        }catch(error){

            console.error(
                "Image delete error:",
                error
            );

        }

    }

}


router.delete("/:id",(req,res)=>{

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


    const id =
        Number(
            req.params.id
        );


    let conversations =
        load();


    const exists =
        conversations.find(c =>
            c.id === id &&
            c.userId === user.id
        );


    if(!exists){

        return res.json({
            success:false,
            message:"المحادثة غير موجودة"
        });

    }


    /*
       جلب رسائل المحادثة
       قبل حذفها
    */

    const allChats =
        db.loadChats();


    const conversationChats =
        allChats.filter(c =>
            Number(
                c.conversationId || 0
            ) === id &&
            c.userId === user.id
        );


    /*
       حذف الصور المرتبطة
    */

    conversationChats.forEach(chat => {

        if(chat.imageFile){

            deleteImage(
                chat.imageFile
            );

        }

    });


    /*
       حذف المحادثة
    */

    conversations =
        conversations.filter(c =>
            !(
                c.id === id &&
                c.userId === user.id
            )
        );


    save(
        conversations
    );


    /*
       حذف الرسائل
    */

    const chats =
        allChats.filter(c =>
            !(
                Number(
                    c.conversationId || 0
                ) === id &&
                c.userId === user.id
            )
        );


    db.saveChats(
        chats
    );


    res.json({

        success:true,

        message:
            "تم حذف المحادثة"

    });

});


module.exports = router;
