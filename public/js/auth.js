async function sendOTP() {

    const email = document.getElementById("registerEmail").value;

    if (!email) {
        alert("أدخل البريد الإلكتروني");
        return;
    }

    const res = await fetch("/send-otp", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email
        })

    });

    const data = await res.json();

    alert(data.message);

}


async function generateRandomUsername() {

    const input =
        document.getElementById(
            "registerUsername"
        );

    const button =
        document.getElementById(
            "randomUsernameButton"
        );

    if (!input) return;

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ جاري...";
    }

    try {

        const response =
            await fetch(
                "/register/random-username"
            );

        const data =
            await response.json();

        if (
            data.success &&
            data.username
        ) {

            input.value = data.username;
            input.focus();

        } else {

            alert(
                data.message ||
                "تعذر اختيار اسم عشوائي"
            );
        }

    } catch (error) {

        console.error(
            "RANDOM USERNAME ERROR:",
            error
        );

        alert(
            "تعذر الاتصال بالسيرفر"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                "🎲 اسم عشوائي";
        }
    }
}

async function register() {

    const username =
        document.getElementById("registerUsername").value.trim();

    const email =
        document.getElementById("registerEmail").value;

    const phone =
        document.getElementById("registerPhone").value;

    const password =
        document.getElementById("registerPassword").value;

    const otp =
        document.getElementById("registerOTP").value;

    const res = await fetch("/register", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            username,

            email,

            phone,

            password,

            otp

        })

    });

    const data = await res.json();

    alert(data.message);

    if (data.success) {

loadPage("login");

    }

}

async function login() {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    const res = await fetch("/login", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            email,

            password

        })

    });

    const data = await res.json();

    alert(data.message);

    if (data.success) {

        localStorage.setItem("token", data.token);

loadPage("home");
    }

}


/* =========================================
   FORGOT PASSWORD
   ========================================= */

async function sendResetOTP() {

    const email =
        document.getElementById("resetEmail")?.value.trim();

    if (!email) {
        alert("أدخل البريد الإلكتروني.");
        return;
    }

    try {

        const res = await fetch("/send-otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email
            })
        });

        const data = await res.json();

        alert(data.message);

        if (data.success) {

            document.getElementById("forgotStep1")
                .style.display = "none";

            document.getElementById("forgotStep2")
                .style.display = "block";
        }

    } catch (error) {

        console.error(
            "SEND RESET OTP ERROR:",
            error
        );

        alert("تعذر إرسال رمز التحقق.");
    }
}


async function resetPassword() {

    const email =
        document.getElementById("resetEmail")?.value.trim();

    const otp =
        document.getElementById("resetOTP")?.value.trim();

    const newPassword =
        document.getElementById("resetNewPassword")?.value;

    const confirmPassword =
        document.getElementById("resetConfirmPassword")?.value;


    if (!email || !otp || !newPassword || !confirmPassword) {

        alert("عمر جميع الخانات.");

        return;
    }


    if (newPassword.length < 6) {

        alert(
            "كلمة السر خاصها تكون 6 أحرف على الأقل."
        );

        return;
    }


    if (newPassword !== confirmPassword) {

        alert(
            "كلمتا السر غير متطابقتين."
        );

        return;
    }


    try {

        const res = await fetch(
            "/reset-password",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    otp,
                    newPassword
                })
            }
        );


        const data = await res.json();

        alert(data.message);


        if (data.success) {

            loadPage("login");
        }

    } catch (error) {

        console.error(
            "RESET PASSWORD ERROR:",
            error
        );

        alert(
            "تعذر تغيير كلمة السر."
        );
    }
}


window.sendResetOTP = sendResetOTP;
window.resetPassword = resetPassword;
