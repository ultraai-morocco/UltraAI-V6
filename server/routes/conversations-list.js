const express=require("express");
const router=express.Router();

const fs=require("fs");
const path=require("path");
const auth=require("../auth");

const file=path.join(__dirname,"../data/conversations.json");

function load(){
if(!fs.existsSync(file)) return [];
return JSON.parse(fs.readFileSync(file,"utf8")||"[]");
}

router.get("/",(req,res)=>{

const token=req.headers.authorization?.split(" ")[1];

if(!token){
return res.json({success:false,message:"يجب تسجيل الدخول"});
}

const user=auth.verifyToken(token);

if(!user){
return res.json({success:false,message:"رمز الدخول غير صالح"});
}

const list=load()
.filter(c=>c.userId===user.id)
.sort((a,b)=>b.id-a.id);

res.json({
success:true,
conversations:list
});

});

module.exports=router;
