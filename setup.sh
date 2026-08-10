#!/data/data/com.termux/files/usr/bin/bash

echo "=================================="
echo "      UltraAI Installer v1.0"
echo "=================================="

mkdir -p \
public/css \
public/js \
public/assets \
server/routes \
server/middleware \
data \
uploads

touch data/users.json
touch data/chats.json
touch data/settings.json

echo "[]" > data/users.json
echo "[]" > data/chats.json
echo "{}" > data/settings.json

cat > package.json <<'EOF'
{
  "name":"ultraai",
  "version":"1.0.0",
  "type":"commonjs",
  "scripts":{
    "start":"node server/server.js"
  },
  "dependencies":{
    "express":"^5.2.1",
    "cors":"^2.8.5",
    "jsonwebtoken":"^9.0.2",
    "bcryptjs":"^3.0.2",
    "dotenv":"^17.2.2"
  }
}
EOF

echo
echo "Installing packages..."
npm install

echo
echo "✓ المرحلة الأولى اكتملت"
cat > server/server.js <<'EOF'
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.post("/ask", (req, res) => {

    const q = req.body.question || "";

    res.json({
        reply: "🤖 UltraAI استلم سؤالك: " + q
    });

});

const PORT = 3000;

app.listen(PORT, () => {
    console.log("UltraAI Server Running on http://127.0.0.1:" + PORT);
});
EOF

echo "✓ تم إنشاء server/server.js"
cat > public/index.html <<'EOF'
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>UltraAI</title>

<link rel="stylesheet" href="css/style.css">
</head>

<body>

<div id="app">

<h1>🤖 UltraAI</h1>

<div id="messages">

<div class="bot">
👋 مرحباً بك في UltraAI
</div>

</div>

<textarea id="question" placeholder="اكتب سؤالك..."></textarea>

<button id="sendBtn">
إرسال
</button>

</div>

<script src="js/app.js"></script>

</body>
</html>
EOF

cat > public/css/style.css <<'EOF'
body{
background:#111;
color:#fff;
font-family:Arial;
margin:0;
padding:20px;
}

#app{
max-width:700px;
margin:auto;
}

#messages{
height:400px;
overflow:auto;
border:1px solid #444;
padding:10px;
margin-bottom:15px;
}

.bot{
background:#222;
padding:10px;
margin:8px 0;
border-radius:10px;
}

.user{
background:#0a84ff;
padding:10px;
margin:8px 0;
border-radius:10px;
text-align:right;
}

textarea{
width:100%;
height:90px;
}

button{
width:100%;
padding:12px;
margin-top:10px;
font-size:18px;
}
EOF

cat > public/js/app.js <<'EOF'
const messages=document.getElementById("messages");

const question=document.getElementById("question");

document.getElementById("sendBtn").onclick=async()=>{

const text=question.value.trim();

if(!text)return;

messages.innerHTML+=`<div class="user">${text}</div>`;

question.value="";

const res=await fetch("/ask",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

question:text

})

});

const data=await res.json();

messages.innerHTML+=`<div class="bot">${data.reply}</div>`;

messages.scrollTop=messages.scrollHeight;

};
EOF

echo "✓ تم إنشاء واجهة UltraAI"
cat > server/database.js <<'EOF'
const fs=require("fs");
const path=require("path");

const USERS=path.join(__dirname,"..","data","users.json");
const CHATS=path.join(__dirname,"..","data","chats.json");

function loadUsers(){
try{
return JSON.parse(fs.readFileSync(USERS,"utf8"));
}catch{
return [];
}
}

function saveUsers(users){
fs.writeFileSync(USERS,JSON.stringify(users,null,2));
}

function loadChats(){
try{
return JSON.parse(fs.readFileSync(CHATS,"utf8"));
}catch{
return [];
}
}

function saveChats(chats){
fs.writeFileSync(CHATS,JSON.stringify(chats,null,2));
}

module.exports={
loadUsers,
saveUsers,
loadChats,
saveChats
};
EOF

echo "✓ database.js تم إنشاؤه"
cat > server/auth.js <<'EOF'
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");

const SECRET="UltraAI_SECRET_KEY";

function hashPassword(password){
return bcrypt.hashSync(password,10);
}

function checkPassword(password,hash){
return bcrypt.compareSync(password,hash);
}

function createToken(user){

return jwt.sign({

id:user.id,
username:user.username,
email:user.email

},SECRET,{expiresIn:"30d"});

}

function verifyToken(token){

try{

return jwt.verify(token,SECRET);

}catch{

return null;

}

}

module.exports={

hashPassword,
checkPassword,
createToken,
verifyToken

};
EOF

echo "✓ auth.js تم إنشاؤه"

cat > .env <<'EOF'
JWT_SECRET=UltraAI_SECRET_KEY
PORT=3000
GEMINI_API_KEY=
EOF

echo "✓ .env تم إنشاؤه"
##################################################
# UltraAI Part 3
##################################################

cat > server/routes/register.js <<'EOF'
const express = require("express");
const router = express.Router();

const db = require("../database");
const auth = require("../auth");

router.post("/", (req, res) => {

const {username,email,password}=req.body;

if(!username||!email||!password){

return res.json({
success:false,
message:"جميع الحقول مطلوبة"
});

}

const users=db.loadUsers();

if(users.find(u=>u.email===email)){

return res.json({
success:false,
message:"البريد الإلكتروني مستعمل"
});

}

users.push({

id:Date.now(),

username,

email,

password:auth.hashPassword(password),

createdAt:new Date().toISOString()

});

db.saveUsers(users);

res.json({

success:true,

message:"تم إنشاء الحساب"

});

});

module.exports=router;
EOF

echo "✓ register.js"

cat > server/routes/login.js <<'EOF'
const express=require("express");

const router=express.Router();

const db=require("../database");

const auth=require("../auth");

router.post("/",(req,res)=>{

const {email,password}=req.body;

const users=db.loadUsers();

const user=users.find(u=>u.email===email);

if(!user){

return res.json({

success:false,

message:"الحساب غير موجود"

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
EOF

echo "✓ login.js"
##################################################
# UltraAI Part 4
##################################################

cat > server/routes/chat.js <<'EOF'
const express=require("express");
const router=express.Router();

const db=require("../database");
const auth=require("../auth");

router.post("/",(req,res)=>{

const token=req.headers.authorization;

if(!token){

return res.json({
success:false,
message:"يجب تسجيل الدخول"
});

}

const user=auth.verifyToken(token);

if(!user){

return res.json({
success:false,
message:"رمز الدخول غير صالح"
});

}

const chats=db.loadChats();

const question=req.body.question||"";

const answer="🤖 UltraAI: استلمت سؤالك: "+question;

chats.push({

id:Date.now(),

userId:user.id,

question,

answer,

time:new Date().toISOString()

});

db.saveChats(chats);

res.json({

success:true,

reply:answer

});

});

module.exports=router;
EOF

echo "✓ chat.js"

cat > server/routes/profile.js <<'EOF'
const express=require("express");
const router=express.Router();

const auth=require("../auth");

router.get("/",(req,res)=>{

const token=req.headers.authorization;

if(!token){

return res.json({
success:false
});

}

const user=auth.verifyToken(token);

if(!user){

return res.json({
success:false
});

}

res.json({

success:true,

user

});

});

module.exports=router;
EOF

echo "✓ profile.js"
##################################################
# UltraAI Part 5
##################################################

cat > server/server.js <<'EOF'
const express=require("express");
const cors=require("cors");
const path=require("path");

const app=express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname,"..","public")));

app.use("/register",require("./routes/register"));
app.use("/login",require("./routes/login"));
app.use("/chat",require("./routes/chat"));
app.use("/profile",require("./routes/profile"));

app.get("/",(req,res)=>{

res.sendFile(
path.join(__dirname,"..","public","index.html")
);

});

const PORT=3000;

app.listen(PORT,()=>{

console.log("=================================");
console.log("🚀 UltraAI Server Started");
console.log("🌍 http://127.0.0.1:"+PORT);
console.log("=================================");

});
EOF

echo "✓ server.js"

cat > public/js/app.js <<'EOF'
let token="";

async function register(){

const username=document.getElementById("username").value;

const email=document.getElementById("email").value;

const password=document.getElementById("password").value;

const r=await fetch("/register",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

username,
email,
password

})

});

const d=await r.json();

alert(d.message);

}

async function login(){

const email=document.getElementById("loginEmail").value;

const password=document.getElementById("loginPassword").value;

const r=await fetch("/login",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

email,
password

})

});

const d=await r.json();

if(d.success){

token=d.token;

}

alert(d.message);

}

async function sendQuestion(){

const question=document.getElementById("question").value;

const r=await fetch("/chat",{

method:"POST",

headers:{

"Content-Type":"application/json",

Authorization:token

},

body:JSON.stringify({

question

})

});

const d=await r.json();

document.getElementById("messages").innerHTML+=
"<div class='user'>"+question+"</div>";

document.getElementById("messages").innerHTML+=
"<div class='bot'>"+d.reply+"</div>";

}
EOF

echo "✓ app.js"
##################################################
# UltraAI Part 6
##################################################

mkdir -p public

cat > public/index.html <<'EOF'
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>UltraAI</title>

<link rel="stylesheet" href="css/style.css">

</head>

<body>

<h1>🤖 UltraAI</h1>

<div id="messages"></div>

<textarea id="question" placeholder="اكتب سؤالك"></textarea>

<button onclick="sendQuestion()">
إرسال
</button>

<script src="js/app.js"></script>

</body>

</html>
EOF

echo "✓ index.html"

mkdir -p public/css

cat > public/css/style.css <<'EOF'
body{

background:#111;

color:white;

font-family:sans-serif;

margin:0;

padding:20px;

}

h1{

text-align:center;

}

#messages{

height:420px;

overflow:auto;

border:1px solid #444;

padding:10px;

margin-bottom:10px;

}

.user{

background:#0a84ff;

padding:10px;

margin:8px;

border-radius:10px;

}

.bot{

background:#333;

padding:10px;

margin:8px;

border-radius:10px;

}

textarea{

width:100%;

height:80px;

font-size:18px;

}

button{

width:100%;

height:50px;

font-size:18px;

margin-top:10px;

}
EOF

echo "✓ style.css"

mkdir -p public/js

cat > public/js/app.js <<'EOF'
let token="";

async function sendQuestion(){

const q=document.getElementById("question").value;

if(!q)return;

const r=await fetch("/chat",{

method:"POST",

headers:{

"Content-Type":"application/json",

Authorization:token

},

body:JSON.stringify({

question:q

})

});

const d=await r.json();

const m=document.getElementById("messages");

m.innerHTML+="<div class='user'>"+q+"</div>";

m.innerHTML+="<div class='bot'>"+d.reply+"</div>";

document.getElementById("question").value="";

m.scrollTop=m.scrollHeight;

}
EOF

echo "✓ public جاهز"

echo "==================================="

echo "UltraAI Part 6 Completed"

echo "==================================="./setup.sh
##################################################
# UltraAI Part 7
##################################################

mkdir -p data

touch data/chats.json

if [ ! -s data/chats.json ]; then
echo "[]" > data/chats.json
fi

echo "✓ chats.json جاهز"

cat > server/database.js <<'EOF'
const fs=require("fs");
const path=require("path");

const usersFile=path.join(__dirname,"..","data","users.json");
const chatsFile=path.join(__dirname,"..","data","chats.json");

function read(file){
try{
return JSON.parse(fs.readFileSync(file,"utf8"));
}catch(e){
return [];
}
}

function write(file,data){
fs.writeFileSync(file,JSON.stringify(data,null,2));
}

module.exports={

loadUsers(){
return read(usersFile);
},

saveUsers(data){
write(usersFile,data);
},

loadChats(){
return read(chatsFile);
},

saveChats(data){
write(chatsFile,data);
}

};
EOF

echo "✓ database.js updated"

echo "=================================="
echo "UltraAI Part 7 Completed"
echo "=================================="
##################################################
# UltraAI Part 8
##################################################

cat > server/routes/history.js <<'EOF'
const express=require("express");
const router=express.Router();

const db=require("../database");

router.get("/",(req,res)=>{

const chats=db.loadChats();

res.json({

success:true,

count:chats.length,

history:chats

});

});

module.exports=router;
EOF

echo "✓ history.js"

grep -q 'history' server/server.js || sed -i '/profile/a app.use("/history",require("./routes/history"));' server/server.js

echo "✓ history route added"

echo "=================================="
echo "UltraAI Part 8 Completed"
echo "=================================="
##################################################
# UltraAI Part 9
##################################################

cat > public/js/session.js <<'EOF'
function saveToken(token){
localStorage.setItem("token",token);
}

function getToken(){
return localStorage.getItem("token") || "";
}

function logout(){
localStorage.removeItem("token");
location.reload();
}
EOF

echo "✓ session.js"

grep -q "session.js" public/index.html || \
sed -i '/app.js/i <script src="js/session.js"></script>' public/index.html

echo "✓ session linked"

echo "=================================="
echo "UltraAI Part 9 Completed"
echo "=================================="
##################################################
# UltraAI Part 10
##################################################

cat > public/js/app.js <<'EOF'
let token=getToken();

async function login(){

const email=document.getElementById("loginEmail").value;

const password=document.getElementById("loginPassword").value;

const r=await fetch("/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email,
password
})

});

const d=await r.json();

if(d.success){

saveToken(d.token);

token=d.token;

}

alert(d.message);

}

async function sendQuestion(){

token=getToken();

if(!token){

alert("يجب تسجيل الدخول");

return;

}

const q=document.getElementById("question").value;

if(!q)return;

const r=await fetch("/chat",{

method:"POST",

headers:{

"Content-Type":"application/json",

Authorization:token

},

body:JSON.stringify({

question:q

})

});

const d=await r.json();

const m=document.getElementById("messages");

m.innerHTML+="<div class='user'>"+q+"</div>";

m.innerHTML+="<div class='bot'>"+d.reply+"</div>";

document.getElementById("question").value="";

m.scrollTop=m.scrollHeight;

}
EOF

echo "✓ app.js updated"

echo "=================================="
echo "UltraAI Part 10 Completed"
echo "=================================="
