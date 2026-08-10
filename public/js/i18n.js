const UltraTranslations = {

    ar: {
        settings: "الإعدادات",
        customize: "تخصيص UltraAI",
        language: "اللغة",
        chooseLanguage: "اختر لغة تطبيق UltraAI",
        saveChats: "حفظ المحادثات",
        saveChatsDesc: "تحكم في حفظ محادثاتك في الذاكرة",
        notifications: "الإشعارات",
        notificationsDesc: "تنبيهات UltraAI",
        privacy: "الخصوصية",
        privacyDesc: "إدارة بيانات ومحادثات الحساب",
        accountData: "بيانات الحساب",
        deleteChats: "حذف جميع المحادثات",
        deleteAccount: "حذف الحساب نهائياً"
    },

    fr: {
        settings: "Paramètres",
        customize: "Personnaliser UltraAI",
        language: "Langue",
        chooseLanguage: "Choisissez la langue d'UltraAI",
        saveChats: "Enregistrer les conversations",
        saveChatsDesc: "Contrôler l'enregistrement de vos conversations",
        notifications: "Notifications",
        notificationsDesc: "Notifications UltraAI",
        privacy: "Confidentialité",
        privacyDesc: "Gérer les données et conversations",
        accountData: "Données du compte",
        deleteChats: "Supprimer toutes les conversations",
        deleteAccount: "Supprimer définitivement le compte"
    },

    en: {
        settings: "Settings",
        customize: "Customize UltraAI",
        language: "Language",
        chooseLanguage: "Choose the UltraAI language",
        saveChats: "Save conversations",
        saveChatsDesc: "Control conversation history storage",
        notifications: "Notifications",
        notificationsDesc: "UltraAI notifications",
        privacy: "Privacy",
        privacyDesc: "Manage account data and conversations",
        accountData: "Account data",
        deleteChats: "Delete all conversations",
        deleteAccount: "Delete account permanently"
    }

};


function applyLanguage(language) {

    const lang =
        UltraTranslations[language]
            ? language
            : "ar";

    document.documentElement.lang = lang;

    document.documentElement.dir =
        lang === "ar" ? "rtl" : "ltr";

    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {

            const key =
                element.dataset.i18n;

            if (UltraTranslations[lang][key]) {

                element.textContent =
                    UltraTranslations[lang][key];

            }

        });

    document
        .querySelectorAll("[data-i18n-placeholder]")
        .forEach(element => {

            const key =
                element.dataset.i18nPlaceholder;

            if (UltraTranslations[lang][key]) {
                element.placeholder =
                    UltraTranslations[lang][key];
            }

        });

    localStorage.setItem(
        "ultraLanguage",
        lang
    );
}


async function loadSavedLanguage() {

    const token =
        localStorage.getItem("token");

    let language =
        localStorage.getItem("ultraLanguage") || "ar";

    if (token) {

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

            if (
                data.success &&
                data.settings &&
                data.settings.language
            ) {

                language =
                    data.settings.language;

            }

        } catch (error) {

            console.error(
                "Language loading error:",
                error
            );

        }

    }

    applyLanguage(language);
}


window.applyLanguage =
    applyLanguage;

window.loadSavedLanguage =
    loadSavedLanguage;

window.UltraTranslations =
    UltraTranslations;
