const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const FILE = path.join(
    __dirname,
    "..",
    "data",
    "ai-chats.json"
);


router.get("/", (req,res)=>{

    try{

        const chats = JSON.parse(
            fs.readFileSync(FILE,"utf8")
        );

        res.json({
            success:true,
            chats:chats
        });


    }catch(error){

        res.json({
            success:false,
            chats:[]
        });

    }

});


module.exports = router;
