
async function loadSettings() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        loadPage("login");

        return;
    }


    try {

        const response =
            await fetch("/privacy", {

                headers: {

                    "Authorization":
                        "Bearer " + token

                }

            });


        const data =
            await response.json();


        if (!data.success)
            return;


        /*
           حفظ المحادثات
        */

        const checkbox =
            document.getElementById(
                "saveConversations"
            );


        if (checkbox) {

            checkbox.checked =
                data.settings.saveConversations !== false;

        }


        /*
           اللغة
        */

        const languageSelect =
            document.getElementById(
                "languageSelect"
            );


        if (languageSelect) {

            languageSelect.value =
                data.settings.language || "ar";

        }


        /*
           تطبيق اللغة
        */

        if (typeof applyLanguage === "function") {

            applyLanguage(
                data.settings.language || "ar"
            );

        }


    } catch (error) {

        console.error(
            "Settings error:",
            error
        );

    }

}


/*
   تغيير اللغة
*/

async function changeLanguage() {

    const select =
        document.getElementById(
            "languageSelect"
        );


    if (!select)
        return;


    const language =
        select.value;


    const token =
        localStorage.getItem("token");


    try {

        const response =
            await fetch("/privacy", {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token

                },

                body: JSON.stringify({

                    language

                })

            });


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر حفظ اللغة"
            );

            return;

        }


        /*
           تطبيق اللغة مباشرة
        */

        if (typeof applyLanguage === "function") {

            applyLanguage(language);

        }


    } catch (error) {

        console.error(error);

        alert(
            "تعذر الاتصال بالسيرفر"
        );

    }

}


/*
   تغيير حفظ المحادثات
*/

async function changePrivacySetting() {

    const checkbox =
        document.getElementById(
            "saveConversations"
        );


    if (!checkbox)
        return;


    const token =
        localStorage.getItem("token");


    try {

        const response =
            await fetch("/privacy", {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " + token

                },

                body: JSON.stringify({

                    saveConversations:
                        checkbox.checked

                })

            });


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر حفظ الإعداد"
            );


            checkbox.checked =
                !checkbox.checked;

        }


    } catch (error) {

        console.error(error);

        alert(
            "تعذر الاتصال بالسيرفر"
        );

    }

}


/*
   حذف جميع المحادثات
*/

async function deleteAllConversations() {

    const ok =
        confirm(
            "⚠️ واش متأكد؟\n\nغادي يتم حذف جميع المحادثات المحفوظة نهائياً."
        );


    if (!ok)
        return;


    const token =
        localStorage.getItem("token");


    try {

        const response =
            await fetch(
                "/privacy/conversations",
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            "Bearer " + token

                    }

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر حذف المحادثات"
            );

            return;

        }


        localStorage.removeItem(
            "activeConversationId"
        );


        localStorage.removeItem(
            "currentConversationId"
        );


        alert(
            "✅ تم حذف جميع المحادثات"
        );


        loadPage("memory");


    } catch (error) {

        console.error(error);

        alert(
            "تعذر الاتصال بالسيرفر"
        );

    }

}


/*
   حذف الحساب
*/

async function deleteAccount() {

    const first =
        confirm(
            "⚠️ تحذير\n\nحذف الحساب غادي يحذف الحساب والمحادثات والبيانات المرتبطة به نهائياً.\n\nواش متأكد؟"
        );


    if (!first)
        return;


    const second =
        confirm(
            "تأكيد نهائي:\n\nاضغط موافق فقط إذا كنت متأكد أنك تريد حذف الحساب نهائياً."
        );


    if (!second)
        return;


    const token =
        localStorage.getItem("token");


    try {

        const response =
            await fetch(
                "/delete-account",
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            "Bearer " + token

                    }

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "تعذر حذف الحساب"
            );

            return;

        }


        localStorage.clear();


        alert(
            "تم حذف الحساب بنجاح"
        );


        loadPage("welcome");


    } catch (error) {

        console.error(error);

        alert(
            "تعذر الاتصال بالسيرفر"
        );

    }

}


/*
   Exports
*/

window.loadSettings =
    loadSettings;

window.changeLanguage =
    changeLanguage;

window.changePrivacySetting =
    changePrivacySetting;

window.deleteAllConversations =
    deleteAllConversations;

window.deleteAccount =
    deleteAccount;

