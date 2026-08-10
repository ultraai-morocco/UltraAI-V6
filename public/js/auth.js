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

async function register() {

    const username =
        document.getElementById("registerUsername").value;

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
