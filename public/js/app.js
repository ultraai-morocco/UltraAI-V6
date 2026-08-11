/* =========================================
   ULTRAAI STARTUP
   ========================================= */

(function () {

    const SPLASH_KEY = "ultraai_splash_seen";

    function playUltraAISound() {
        try {
            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) return;

            const ctx = new AudioContext();

            if (ctx.state === "suspended") {
                ctx.resume().catch(() => {});
            }

            const now = ctx.currentTime;

            const notes = [
                { f: 523.25, t: 0.00, d: 0.16 },
                { f: 659.25, t: 0.09, d: 0.18 },
                { f: 783.99, t: 0.18, d: 0.30 }
            ];

            notes.forEach(note => {

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.value = note.f;

                gain.gain.setValueAtTime(
                    0,
                    now + note.t
                );

                gain.gain.linearRampToValueAtTime(
                    0.045,
                    now + note.t + 0.025
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.001,
                    now + note.t + note.d
                );

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + note.t);
                osc.stop(now + note.t + note.d + 0.05);
            });

            setTimeout(() => {
                try {
                    ctx.close();
                } catch (_) {}
            }, 900);

        } catch (e) {
            console.log("UltraAI sound unavailable");
        }
    }


    function showUltraAISplash(nextPage) {

        if (sessionStorage.getItem(SPLASH_KEY) === "1") {
            loadPage(nextPage);
            return;
        }

        sessionStorage.setItem(SPLASH_KEY, "1");

        const splash = document.createElement("div");

        splash.id = "ultraaiSplash";

        splash.innerHTML = `
            <div class="ultraai-splash-bg">

                <div class="ultraai-glow glow-one"></div>
                <div class="ultraai-glow glow-two"></div>

                <div class="ultraai-logo-wrap">

                    <div class="ultraai-logo-ring">
                        <div class="ultraai-logo">
                            U
                        </div>
                    </div>

                    <div class="ultraai-name">
                        UltraAI
                    </div>

                    <div class="ultraai-line"></div>

                    <div class="ultraai-tagline">
                        ذكاء يفهمك
                    </div>

                </div>

                <div class="ultraai-loading">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

            </div>
        `;

        document.body.appendChild(splash);

        playUltraAISound();

        requestAnimationFrame(() => {
            splash.classList.add("show");
        });

        setTimeout(() => {
            splash.classList.add("hide");

            setTimeout(() => {

                splash.remove();

                loadPage(nextPage);

            }, 650);

        }, 2300);
    }


    function startUltraAI() {

        let firstPage = "welcome";

        const token =
            localStorage.getItem("token");

        if (token) {
            firstPage = "home";
        }

        showUltraAISplash(firstPage);
    }


    window.addEventListener("load", () => {
        startUltraAI();
    });


    /* =========================
       ULTRAAI LANGUAGE
       ========================= */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            if (
                typeof loadSavedLanguage ===
                "function"
            ) {
                loadSavedLanguage();
            }

        }
    );

})();
