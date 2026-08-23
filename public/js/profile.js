async function loadProfile() {

    const nameElement =
        document.getElementById("profileName");

    const emailElement =
        document.getElementById("profileEmail");

    const phoneElement =
        document.getElementById("profilePhone");

    const avatarElement =
        document.getElementById("profileAvatar");

    if (!nameElement) return;

    const token =
        localStorage.getItem("token");

    if (!token) {
        nameElement.textContent = "غير مسجل الدخول";
        return;
    }

    try {

        const response =
            await fetch("/profile", {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            });

        const data =
            await response.json();

        if (!data.success || !data.user) {
            nameElement.textContent =
                "تعذر تحميل الحساب";
            return;
        }

        const user = data.user;
    
    const accountStatusText =
        document.getElementById("accountStatusText");

    const emailStatusText =
        document.getElementById("emailStatusText");

    const phoneStatusText =
        document.getElementById("phoneStatusText");

    if (accountStatusText) {
        accountStatusText.textContent = "الحساب مفعل";
    }

    if (emailStatusText) {
        emailStatusText.textContent =
            user.email
                ? "البريد الإلكتروني مضاف"
                : "لم تتم إضافة البريد الإلكتروني";
    }

    if (phoneStatusText) {
        phoneStatusText.textContent =
            user.phone
                ? "رقم الهاتف مضاف"
                : "لم تتم إضافة رقم الهاتف";
    }


        nameElement.textContent =
            user.username || "المستخدم";

        if (emailElement) {
            emailElement.textContent =
                user.email || "بدون بريد";
        }

        if (phoneElement) {
            phoneElement.textContent =
                user.phone || "لم تتم إضافة رقم الهاتف";
        }

        if (avatarElement) {

            if (user.avatar) {

                avatarElement.innerHTML =
                    `<img src="${user.avatar}" alt="صورة الحساب">`;

            } else {

                avatarElement.innerHTML = "🌍";

            }
        }

    } catch (error) {

        console.error("Profile error:", error);

        nameElement.textContent =
            "تعذر الاتصال بالسيرفر";
    }
}


/* اختيار صورة الحساب */

async function chooseProfileImage() {

    const input =
        document.getElementById("profileImageInput");

    if (!input) return;

    input.click();
}


async function uploadProfileImage(event) {

    const file =
        event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {

        alert("اختار صورة فقط");
        return;
    }

    const reader = new FileReader();

    reader.onload = async function () {

        const image =
            new Image();

        image.onload = async function () {

            const canvas =
                document.createElement("canvas");

            const maxSize = 256;

            let width = image.width;
            let height = image.height;

            if (width > height) {

                if (width > maxSize) {
                    height =
                        height * maxSize / width;
                    width = maxSize;
                }

            } else {

                if (height > maxSize) {
                    width =
                        width * maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx =
                canvas.getContext("2d");

            ctx.drawImage(
                image,
                0,
                0,
                width,
                height
            );

            const avatar =
                canvas.toDataURL(
                    "image/jpeg",
                    0.75
                );

            const token =
                localStorage.getItem("token");

            try {

                const response =
                    await fetch("/profile/avatar", {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " + token
                        },

                        body: JSON.stringify({
                            avatar
                        })
                    });

                const data =
                    await response.json();

                if (!data.success) {

                    alert(
                        data.message ||
                        "تعذر حفظ الصورة"
                    );

                    return;
                }

                alert("تم تغيير صورة الحساب ✅");

                loadProfile();

            } catch (error) {

                console.error(error);

                alert(
                    "تعذر الاتصال بالسيرفر"
                );
            }

        };

        image.src = reader.result;
    };

    reader.readAsDataURL(file);
}


window.loadProfile = loadProfile;
window.chooseProfileImage = chooseProfileImage;
window.uploadProfileImage = uploadProfileImage;


/* =========================
   تعديل الحساب
========================= */

function openEditProfile() {

    const box =
        document.getElementById("editProfileBox");

    if (!box) return;

    const name =
        document.getElementById("profileNameInfo")
        ?.textContent || "";

    const phone =
        document.getElementById("profilePhone")
        ?.textContent || "";

    document.getElementById(
        "editProfileName"
    ).value =
        name === "-" ? "" : name;

    document.getElementById(
        "editProfilePhone"
    ).value =
        phone.includes("لم تتم") ? "" : phone;

    box.style.display = "block";

    box.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function closeEditProfile() {

    const box =
        document.getElementById("editProfileBox");

    if (box)
        box.style.display = "none";
}


async function saveProfileData() {

    const username =
        document.getElementById(
            "editProfileName"
        ).value.trim();

    const phone =
        document.getElementById(
            "editProfilePhone"
        ).value.trim();

    const token =
        localStorage.getItem("token");

    if (!username) {
        alert("اكتب الاسم");
        return;
    }

    try {

        const response =
            await fetch("/profile", {

                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token
                },

                body: JSON.stringify({
                    username,
                    phone
                })
            });

        const data =
            await response.json();

        if (!data.success) {

            alert(
                data.message ||
                "تعذر حفظ المعلومات"
            );

            return;
        }

        alert("تم تحديث الحساب ✅");

        closeEditProfile();

        loadProfile();

    } catch (error) {

        console.error(error);

        alert("تعذر الاتصال بالسيرفر");
    }
}


/* =========================
   تغيير كلمة المرور
========================= */

function openChangePassword() {

    const box =
        document.getElementById("passwordBox");

    if (!box) return;

    box.style.display = "block";

    box.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function closeChangePassword() {

    const box =
        document.getElementById("passwordBox");

    if (box)
        box.style.display = "none";
}


async function saveNewPassword() {

    const currentPassword =
        document.getElementById(
            "currentPassword"
        ).value;

    const newPassword =
        document.getElementById(
            "newPassword"
        ).value;

    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        ).value;

    if (!currentPassword ||
        !newPassword ||
        !confirmPassword) {

        alert("عمر جميع الحقول");
        return;
    }

    if (newPassword !== confirmPassword) {

        alert(
            "كلمتا المرور غير متطابقتين"
        );

        return;
    }

    if (newPassword.length < 6) {

        alert(
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
        );

        return;
    }

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch("/profile/password", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token
                },

                body: JSON.stringify({

                    currentPassword,
                    newPassword

                })
            });

        const data =
            await response.json();

        if (!data.success) {

            alert(
                data.message ||
                "تعذر تغيير كلمة المرور"
            );

            return;
        }

        alert(
            "تم تغيير كلمة المرور بنجاح ✅"
        );

        document.getElementById(
            "currentPassword"
        ).value = "";

        document.getElementById(
            "newPassword"
        ).value = "";

        document.getElementById(
            "confirmPassword"
        ).value = "";

        closeChangePassword();

    } catch (error) {

        console.error(error);

        alert("تعذر الاتصال بالسيرفر");
    }
}


/* إعادة عرض معلومات الحساب */

const oldLoadProfile =
    window.loadProfile;

window.loadProfile = async function () {

    await oldLoadProfile();

    const name =
        document.getElementById(
            "profileName"
        )?.textContent || "";

    const email =
        document.getElementById(
            "profileEmail"
        )?.textContent || "";

    const nameInfo =
        document.getElementById(
            "profileNameInfo"
        );

    const emailInfo =
        document.getElementById(
            "profileEmailInfo"
        );

    if (nameInfo)
        nameInfo.textContent = name;

    if (emailInfo)
        emailInfo.textContent = email;

    const token =
        localStorage.getItem("token");

    if (!token) return;

    try {

        const response =
            await fetch("/profile", {

                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            });

        const data =
            await response.json();

        if (
            data.success &&
            data.user
        ) {

            const date =
                document.getElementById(
                    "profileCreatedAt"
                );

            if (date &&
                data.user.createdAt) {

                date.textContent =
                    new Date(
                        data.user.createdAt
                    ).toLocaleDateString(
                        "ar-MA"
                    );
            }
        }

    } catch {}
};


window.openEditProfile =
    openEditProfile;

window.closeEditProfile =
    closeEditProfile;

window.saveProfileData =
    saveProfileData;

window.openChangePassword =
    openChangePassword;

window.closeChangePassword =
    closeChangePassword;

window.saveNewPassword =
    saveNewPassword;

/* =================================================
   YOUTUBE OAUTH
================================================= */

async function connectYouTube() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("يجب تسجيل الدخول أولاً.");
        return;
    }

    const btn = document.getElementById("youtubeConnectBtn");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "⏳ جاري فتح YouTube...";
    }

    try {
        const response = await fetch(
            "/youtube/connect?token=" +
            encodeURIComponent(token)
        );

        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "فشل الاتصال بـ YouTube");
        }

        window.location.href = response.url;

    } catch (error) {
        console.error("YouTube connect error:", error);

        alert(
            "تعذر بدء ربط YouTube.\n\n" +
            (error.message || "حدث خطأ غير معروف")
        );

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = "▶️ ربط YouTube";
        }
    }
}

async function loadYouTubeStatus() {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
        const response = await fetch(
            "/youtube/status?token=" +
            encodeURIComponent(token)
        );

        const data = await response.json();

        const btn = document.getElementById(
            "youtubeConnectBtn"
        );

        const text = document.getElementById(
            "youtubeConnectText"
        );

        if (!btn || !text) return;

        if (data.success && data.connected) {
            text.textContent = "YouTube مربوط ✅";
            btn.disabled = true;
        } else {
            text.textContent = "ربط YouTube";
            btn.disabled = false;
        }

    } catch (error) {
        console.error(
            "YouTube status error:",
            error
        );
    }
}

window.connectYouTube = connectYouTube;
window.loadYouTubeStatus = loadYouTubeStatus;

/* =========================================
   AUTO YOUTUBE - PAGE CONNECTION
========================================= */

function connectYouTubePage() {

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("يجب تسجيل الدخول إلى UltraAI أولاً.");
        return;
    }

    const button =
        document.getElementById("youtubeConnectPageBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "جاري فتح YouTube...";
    }

    const url =
        "/youtube/connect?token=" +
        encodeURIComponent(token);

    window.location.href = url;
}

window.connectYouTubePage =
    connectYouTubePage;
