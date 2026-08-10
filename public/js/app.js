window.onload = () => {

    loadPage("welcome");

};

/* =========================
   ULTRAAI LANGUAGE
========================= */

document.addEventListener("DOMContentLoaded", () => {

    if (typeof loadSavedLanguage === "function") {
        loadSavedLanguage();
    }

});
