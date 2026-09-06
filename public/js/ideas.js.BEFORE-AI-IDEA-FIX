let selectedIdeaType = "general";
let selectedIdeaCount = 5;
let generatedIdeas = [];

function selectIdeaType(type, button) {

    selectedIdeaType = type;

    document
        .querySelectorAll(".idea-type")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");
}

function selectIdeaCount(count, button) {

    selectedIdeaCount = count;

    document
        .querySelectorAll(".idea-count")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");
}

async function generateIdeas() {

    const topic =
        document.getElementById("ideaTopic")?.value.trim() || "";

    const result =
        document.getElementById("ideasResult");

    if (!result) return;

    result.style.display = "block";

    result.innerHTML = `
        <div class="idea-loading">
            <div>✨</div>
            <strong>جاري توليد ${selectedIdeaCount} أفكار...</strong>
            <span>UltraAI يفكر في أفكار مناسبة لك</span>
        </div>
    `;

    try {

        const token =
            localStorage.getItem("token");

        const response =
            await fetch("/ideas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token
                        ? {
                            "Authorization":
                                "Bearer " + token
                        }
                        : {})
                },
                body: JSON.stringify({
                    topic,
                    type: selectedIdeaType,
                    count: selectedIdeaCount,
                    language: "ar"
                })
            });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "تعذر توليد الأفكار"
            );
        }

        generatedIdeas = Array.isArray(data.ideas)
            ? data.ideas
            : [];

        renderIdeas();

    } catch (error) {

        console.error("Ideas error:", error);

        result.innerHTML = `
            <div class="idea-error">
                ❌ تعذر توليد الأفكار حالياً
                <button onclick="generateIdeas()">
                    حاول مرة أخرى
                </button>
            </div>
        `;
    }
}

function renderIdeas() {

    const result =
        document.getElementById("ideasResult");

    if (!result) return;

    if (!generatedIdeas.length) {

        result.innerHTML = `
            <div class="idea-error">
                لم يتم العثور على أفكار.
            </div>
        `;

        return;
    }

    result.innerHTML = `
        <div class="ideas-results-header">
            <div>
                <strong>✨ أفكارك الجديدة</strong>
                <span>${generatedIdeas.length} أفكار</span>
            </div>

            <button onclick="generateIdeas()">
                🔄 جديد
            </button>
        </div>

        <div class="ideas-list">

            ${generatedIdeas.map((idea, index) => `

                <article class="idea-item">

                    <div class="idea-number">
                        ${index + 1}
                    </div>

                    <div class="idea-body">

                        <strong>
                            ${escapeIdea(idea.title)}
                        </strong>

                        <p>
                            ${escapeIdea(idea.description)}
                        </p>

                        <div class="idea-item-actions">

                            <button
                                onclick="copyIdea(${index})">
                                📋 نسخ
                            </button>

                            <button
                                onclick="saveIdea(${index})">
                                ⭐ حفظ
                            </button>

                            <button
                                onclick="developIdea(${index})">
                                🚀 طوّر الفكرة
                            </button>

                            <button
                                onclick="useIdea(${index})">
                                ▶️ استخدمها
                            </button>

                        </div>

                    </div>

                </article>

            `).join("")}

        </div>
    `;
}

function escapeIdea(text) {

    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function saveIdea(index) {

    const idea = generatedIdeas[index];

    if (!idea) return;

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("خاصك تسجل الدخول أولاً.");
        return;
    }

    try {

        const response =
            await fetch("/ideas-save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        "Bearer " + token
                },
                body: JSON.stringify({
                    title: idea.title,
                    description: idea.description,
                    type: selectedIdeaType
                })
            });

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "تعذر حفظ الفكرة"
            );
        }

        alert("تم حفظ الفكرة ⭐");

    } catch (error) {

        console.error(
            "Save idea error:",
            error
        );

        alert(
            error.message ||
            "تعذر حفظ الفكرة"
        );
    }
}

async function copyIdea(index) {

    const idea = generatedIdeas[index];

    if (!idea) return;

    const text =
        `${idea.title}\n\n${idea.description}`;

    try {

        await navigator.clipboard.writeText(text);

        alert("تم نسخ الفكرة ✅");

    } catch {

        alert("تعذر النسخ");
    }
}

function developIdea(index) {

    const idea = generatedIdeas[index];

    if (!idea) return;

    const text =
        `أريد تطوير هذه الفكرة بشكل كامل:

اسم الفكرة:
${idea.title}

الفكرة:
${idea.description}

قم بتحليلها وتطويرها إلى خطة عملية تشمل:
- الجمهور المستهدف
- طريقة التنفيذ
- المميزات
- طريقة الربح
- التكاليف المحتملة
- خطوات البدء
- المخاطر والحلول`;

    localStorage.setItem(
        "ideaToDevelop",
        text
    );

    localStorage.removeItem("activeConversationId");
    localStorage.removeItem("activeConversationMessages");

    loadPage("ai");
}

function useIdea(index) {

    const idea = generatedIdeas[index];

    if (!idea) return;

    const text =
        `ساعدني في تنفيذ هذه الفكرة:

${idea.title}

${idea.description}`;

    localStorage.setItem(
        "ideaToDevelop",
        text
    );

    localStorage.removeItem("activeConversationId");
    localStorage.removeItem("activeConversationMessages");

    loadPage("ai");
}
