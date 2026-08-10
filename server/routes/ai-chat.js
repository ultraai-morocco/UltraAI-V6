const express = require("express");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

const router = express.Router();

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


const FILE = path.join(
    __dirname,
    "..",
    "data",
    "ai-chats.json"
);


function loadChats(){

    try{
        return JSON.parse(
            fs.readFileSync(FILE,"utf8")
        );
    }catch{
        return [];
    }

}


function saveChats(data){

    fs.writeFileSync(
        FILE,
        JSON.stringify(data,null,2)
    );

}



router.post("/", async (req,res)=>{

try{


const message = (req.body.message || "").trim();


if(!message){

return res.json({
success:false,
message:"الرسالة فارغة"
});

}



const response = await client.chat.completions.create({

model:"llama-3.3-70b-versatile",

messages:[

{
role:"system",
content:"أنت مساعد UltraAI ذكي. أجب باللغة العربية بشكل مفيد."
},

{
role:"user",
content:message
}

]

});



const reply =
response.choices[0].message.content;



const chats = loadChats();


chats.push({

id:Date.now(),

question:message,

answer:reply,

time:new Date().toLocaleString("ar-MA")

});



if(chats.length > 1000){

chats.splice(
0,
chats.length-1000
);

}



saveChats(chats);



res.json({

success:true,

reply:reply

});



}catch(error){

console.log(error);


res.json({

success:false,

message:"خطأ في الذكاء الاصطناعي"

});


}


});



module.exports=router;
