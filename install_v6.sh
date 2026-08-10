#!/data/data/com.termux/files/usr/bin/bash

set -e

echo "=================================="
echo " UltraAI V6 Installer"
echo "=================================="

mkdir -p public
mkdir -p public/css
mkdir -p public/js
mkdir -p public/pages
mkdir -p public/assets

echo "✓ تم إنشاء المجلدات"

cat > public/index.html <<'EOF'
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1.0">

<title>UltraAI V6</title>

<link rel="stylesheet" href="css/style.css">

</head>

<body>

<div id="app"></div>

<script src="js/router.js"></script>
<script src="js/app.js"></script>

</body>

</html>
EOF

echo "✓ index.html"

cat > public/css/style.css <<'EOF'
*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:sans-serif;
}

body{
background:#0f172a;
color:white;
}

#app{
height:100vh;
}
EOF

echo "✓ style.css"

cat > public/js/router.js <<'EOF'
function showPage(name){

document.getElementById("title").innerText=name;

document.getElementById("page").innerHTML=
"<h2>"+name+"</h2>";

}
EOF

echo "✓ router.js"
cat >> public/js/app.js <<'EOF'
document.getElementById("app").innerHTML=`

<div class="sidebar">

<div class="logo">
🤖 UltraAI V6
</div>

<div class="menu">

<button onclick="showPage('🤖 الذكاء الاصطناعي')">
🤖 الذكاء الاصطناعي
</button>

<button onclick="showPage('💬 المحادثات')">
💬 المحادثات
</button>

<button onclick="showPage('🌍 الشات العالمي')">
🌍 الشات العالمي
</button>

<button onclick="showPage('🧠 الذاكرة')">
🧠 الذاكرة
</button>

<button onclick="showPage('📁 الملفات')">
📁 الملفات
</button>

<button onclick="showPage('⚙️ الإعدادات')">
⚙️ الإعدادات
</button>

</div>

</div>

<div class="content">

<div class="topbar">

<h2 id="title">
🤖 الذكاء الاصطناعي
</h2>

</div>

<div id="page" class="page">

<h2>
مرحباً بك في UltraAI V6
</h2>

<p>
تم إنشاء الواجهة الأساسية بنجاح.
</p>

</div>

</div>

`;
EOF

echo "✓ app.js"
cat >> public/css/style.css <<'EOF'

.sidebar{
width:260px;
height:100vh;
background:#111827;
position:fixed;
right:0;
top:0;
padding:20px;
overflow:auto;
}

.logo{
font-size:24px;
font-weight:bold;
text-align:center;
margin-bottom:25px;
}

.menu button{
width:100%;
padding:14px;
margin-bottom:10px;
border:none;
border-radius:12px;
background:#1f2937;
color:#fff;
cursor:pointer;
font-size:16px;
transition:.2s;
}

.menu button:hover{
background:#374151;
}

.content{
margin-right:260px;
min-height:100vh;
display:flex;
flex-direction:column;
}

.topbar{
height:65px;
background:#111827;
display:flex;
align-items:center;
padding:0 20px;
border-bottom:1px solid #222;
}

.page{
padding:25px;
flex:1;
}

@media(max-width:768px){

.sidebar{
width:75px;
}

.logo{
font-size:18px;
}

.menu button{
font-size:12px;
padding:10px;
}

.content{
margin-right:75px;
}

}

EOF

echo "✓ Sidebar CSS"
cat > public/pages/ai.html <<'EOF'
<h2>🤖 الذكاء الاصطناعي</h2>

<div id="messages"></div>

<div class="input-area">

<textarea
id="question"
placeholder="اكتب رسالتك..."></textarea>

<button id="sendBtn">
إرسال
</button>

</div>
EOF

echo "✓ ai.html"

cat > public/pages/chat.html <<'EOF'
<h2>💬 المحادثات</h2>

<div id="conversationList">

لا توجد محادثات حالياً

</div>
EOF

echo "✓ chat.html"

cat > public/pages/global.html <<'EOF'
<h2>🌍 الشات العالمي</h2>

<div id="globalMessages"></div>

<div class="input-area">

<textarea
id="globalMessage"
placeholder="اكتب رسالة..."></textarea>

<button>
إرسال
</button>

</div>
EOF

echo "✓ global.html"

cat > public/pages/memory.html <<'EOF'
<h2>🧠 الذاكرة</h2>

<p>
ستظهر الذاكرة هنا.
</p>
EOF

echo "✓ memory.html"

cat > public/pages/files.html <<'EOF'
<h2>📁 الملفات</h2>

<p>
ستظهر الملفات هنا.
</p>
EOF

echo "✓ files.html"

cat > public/pages/settings.html <<'EOF'
<h2>⚙️ الإعدادات</h2>

<p>
إعدادات التطبيق.
</p>
EOF

echo "✓ settings.html"

cat > public/pages/profile.html <<'EOF'
<h2>👤 الحساب</h2>

<p>
معلومات الحساب.
</p>
EOF

echo "✓ profile.html"
echo
echo "=================================="
echo "فحص الملفات..."
echo "=================================="

if [ -f public/js/app.js ]; then
node -c public/js/app.js
fi

if [ -f public/js/router.js ]; then
node -c public/js/router.js
fi

echo
echo "=================================="
echo "UltraAI V6 تم تثبيته بنجاح"
echo "=================================="
echo
echo "لتشغيل السيرفر:"
echo
echo "npm start"
echo
echo "ثم افتح:"
echo
echo "http://127.0.0.1:3000"
echo
