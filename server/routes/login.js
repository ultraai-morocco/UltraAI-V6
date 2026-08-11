const express=require("express");

const router=express.Router();

const db=require("../database");

const auth=require("../auth");

router.post("/",(req,res)=>{

const emailInput=String(req.body.email || "").trim().toLowerCase();
const {password}=req.body;

const users=db.loadUsers();

const user=users.find(u=>String(u.email || "").trim().toLowerCase()===emailInput);

if(!user){

return res.json({

success:false,

message:"الحساب غير موجود"

});

}

if(user.banned === true){

return res.json({

success:false,

message:"🚫 هذا الحساب محظور من استعمال UltraAI."

});

}

if(!auth.checkPassword(password,user.password)){

return res.json({

success:false,

message:"كلمة المرور خاطئة"

});

}

const token=auth.createToken(user);

res.json({

success:true,

message:"مرحباً "+user.username,

token

});

});

module.exports=router;
