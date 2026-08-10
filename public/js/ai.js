let selectedImage = null;
let previewObjectURL = null;


/* ================================
   إنشاء محادثة
================================ */

async function createConversation(){

    const token = localStorage.getItem("token");

    const res = await fetch("/conversations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            title: "محادثة جديدة"
        })
    });

    const data = await res.json();

    if(!data.success){
        throw new Error(
            data.message || "تعذر إنشاء المحادثة"
        );
    }

    localStorage.setItem(
        "activeConversationId",
        String(data.conversation.id)
    );

    return data.conversation.id;
}


/* ================================
   التأكد من وجود محادثة
================================ */

async function ensureConversation(){

    let id = Number(
        localStorage.getItem("activeConversationId") || 0
    );

    if(!id){
        id = await createConversation();
    }

    return id;
}


/* ================================
   اختيار الصورة
================================ */

function handleImageSelect(event){

    const input = event.target;
    const file = input?.files?.[0];

    if(!file){
        return;
    }

    if(!file.type.startsWith("image/")){
        alert("الملف المختار ليس صورة.");
        input.value = "";
        return;
    }

    if(file.size > 10 * 1024 * 1024){
        alert("الصورة كبيرة جداً. الحد الأقصى 10MB.");
        input.value = "";
        return;
    }

    const preview =
        document.getElementById("imagePreview");

    const imageBox =
        document.getElementById("previewImageBox");

    if(!preview || !imageBox){
        console.error("❌ IMAGE PREVIEW NOT FOUND");
        return;
    }

    if(previewObjectURL){
        URL.revokeObjectURL(previewObjectURL);
    }

    previewObjectURL =
        URL.createObjectURL(file);

    imageBox.style.backgroundImage =
        `url("${previewObjectURL}")`;

    preview.classList.add("is-visible");
    preview.hidden = false;

    const reader = new FileReader();

    reader.onload = function(e){

        selectedImage = e.target.result;

        console.log(
            "✅ IMAGE READY:",
            selectedImage.length
        );
    };

    reader.onerror = function(){

        selectedImage = null;

        alert("تعذر تجهيز الصورة.");

        removeSelectedImage();
    };

    reader.readAsDataURL(file);

    document.getElementById("question")?.focus();
}


/* ================================
   حذف الصورة
================================ */

function removeSelectedImage(){

    selectedImage = null;

    if(previewObjectURL){
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
    }

    const input =
        document.getElementById("imageInput");

    const preview =
        document.getElementById("imagePreview");

    const imageBox =
        document.getElementById("previewImageBox");

    if(input){
        input.value = "";
    }

    if(imageBox){
        imageBox.style.backgroundImage = "none";
    }

    if(preview){
        preview.classList.remove("is-visible");
        preview.hidden = true;
    }
}


/* ================================
   إرسال السؤال
================================ */

async function sendQuestion(){

    const input =
        document.getElementById("question");

    const messages =
        document.getElementById("messages");

    if(!input || !messages){
        console.error("❌ AI ELEMENTS NOT FOUND");
        return;
    }

    const question =
        input.value.trim();

    const image =
        selectedImage;

    if(!question && !image){
        return;
    }

    /* حذف شاشة الترحيب */
    const empty =
        messages.querySelector(".ai-empty");

    if(empty){
        empty.remove();
    }

    const displayQuestion =
        question || "حلل لي هذه الصورة";

    /* عرض رسالة المستخدم */

    const userMessage =
        document.createElement("div");

    userMessage.className =
        "user message";

    if(image){

        const imageWrapper =
            document.createElement("div");

        imageWrapper.className =
            "user-image";

        const img =
            document.createElement("img");

        img.src = image;
        img.alt = "الصورة المرسلة";

        imageWrapper.appendChild(img);

        userMessage.appendChild(
            imageWrapper
        );
    }

    const text =
        document.createElement("div");

    text.textContent =
        displayQuestion;

    userMessage.appendChild(text);

    messages.appendChild(
        userMessage
    );

    /* تنظيف الإدخال */

    input.value = "";

    const imageToSend =
        image;

    removeSelectedImage();

    /* رسالة التحميل */

    const loading =
        document.createElement("div");

    loading.className =
        "bot message";

    loading.textContent =
        "جاري التفكير... 🤖";

    messages.appendChild(
        loading
    );

    messages.scrollTop =
        messages.scrollHeight;


    try{

        const conversationId =
            await ensureConversation();

        const token =
            localStorage.getItem("token");

        const response =
            await fetch("/chat", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token
                },

                body: JSON.stringify({

                    question:
                        displayQuestion,

                    conversationId,

                    image:
                        imageToSend || null
                })
            });


        const raw =
            await response.text();

        console.log(
            "CHAT STATUS:",
            response.status
        );

        console.log(
            "CHAT RESPONSE:",
            raw
        );


        let data;

        try{

            data =
                JSON.parse(raw);

        }catch(e){

            loading.textContent =
                "❌ السيرفر أرسل رداً غير صالح.";

            return;
        }


        if(!response.ok){

            loading.textContent =
                "❌ " +
                (
                    data.message ||
                    data.error ||
                    "حدث خطأ في السيرفر."
                );

            return;
        }


        if(data.success){

            loading.textContent =
                data.reply ||
                "لا يوجد رد.";

        }else{

            loading.textContent =
                "❌ " +
                (
                    data.message ||
                    "حدث خطأ."
                );
        }


        messages.scrollTop =
            messages.scrollHeight;

    }catch(error){

        console.error(
            "❌ CHAT ERROR:",
            error
        );

        loading.textContent =
            "❌ حدث خطأ في الاتصال بالسيرفر.";
    }
}


/* ================================
   تحميل AI
================================ */

async function initAI(){

    const messages =
        document.getElementById("messages");

    if(!messages){
        return;
    }


    /* زر الصورة */

    const imageButton =
        document.getElementById("imageButton");

    const imageInput =
        document.getElementById("imageInput");


    if(imageButton && imageInput){

        imageButton.onclick = function(){

            imageInput.click();

        };

        imageInput.onchange =
            handleImageSelect;
    }


    /* زر الإرسال */

    const sendButton =
        document.querySelector(
            ".ai-page .send-button"
        );

    if(sendButton){

        sendButton.onclick =
            sendQuestion;
    }


    /* Enter */

    const input =
        document.getElementById("question");

    if(input){

        input.onkeydown =
            function(event){

                if(
                    event.key === "Enter" &&
                    !event.shiftKey
                ){

                    event.preventDefault();

                    sendQuestion();
                }
            };
    }


    /* لا توجد محادثة */

    const conversationId =
        Number(
            localStorage.getItem(
                "activeConversationId"
            ) || 0
        );


    if(!conversationId){

        messages.innerHTML = `
            <div class="ai-empty">
                <div class="ai-empty-icon">🤖</div>
                <h2>كيف يمكنني مساعدتك؟</h2>
                <p>اسأل UltraAI عن أي شيء</p>
            </div>
        `;

        return;
    }


    /* تحميل التاريخ */

    messages.innerHTML = `
        <div class="loading-box">
            جاري تحميل المحادثة...
        </div>
    `;


    try{

        const token =
            localStorage.getItem("token");

        const res =
            await fetch(
                "/history/" + conversationId,
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const data =
            await res.json();


        if(
            !data.success ||
            !data.messages ||
            data.messages.length === 0
        ){

            messages.innerHTML = `
                <div class="ai-empty">
                    <div class="ai-empty-icon">🤖</div>
                    <h2>ابدأ المحادثة</h2>
                    <p>اكتب رسالتك في الأسفل.</p>
                </div>
            `;

            return;
        }


        messages.innerHTML = "";


        data.messages.forEach(function(m){

            const user =
                document.createElement("div");

            user.className =
                "user message";

            if(m.image){

                const wrapper =
                    document.createElement("div");

                wrapper.className =
                    "user-image";

                const img =
                    document.createElement("img");

                img.src = m.image;
                img.alt = "الصورة المرسلة";

                wrapper.appendChild(img);

                user.appendChild(wrapper);
            }

            const question =
                document.createElement("div");

            question.textContent =
                m.question || "";

            user.appendChild(question);


            const bot =
                document.createElement("div");

            bot.className =
                "bot message";

            bot.textContent =
                m.answer || "";

            messages.appendChild(user);
            messages.appendChild(bot);
        });


        messages.scrollTop =
            messages.scrollHeight;


    }catch(error){

        console.error(
            "❌ HISTORY ERROR:",
            error
        );

        messages.innerHTML =
            "❌ تعذر تحميل المحادثة.";
    }
}


/* ================================
   حماية HTML
================================ */

function escapeHTML(value){

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}


console.log(
    "✅ ULTRAAI AI.JS CLEAN VERSION LOADED"
);
