let myIdeas = [];
let myIdeasFilter = "all";


async function loadMyIdeas() {

    const list =
        document.getElementById("myIdeasList");

    if (!list) return;

    list.innerHTML = `
        <div class="my-ideas-loading">
            جاري تحميل أفكارك...
        </div>
    `;

    const token =
        localStorage.getItem("token");

    if (!token) {

        list.innerHTML = `
            <div class="my-ideas-empty">
                🔐 خاصك تسجل الدخول باش تشوف أفكارك.
            </div>
        `;

        updateMyIdeasStats();

        return;
    }

    try {

        const response =
            await fetch("/ideas-list", {
                headers: {
                    "Authorization":
                        "Bearer " + token
                }
            });

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "تعذر جلب الأفكار"
            );
        }

        myIdeas =
            Array.isArray(data.ideas)
                ? data.ideas
                : [];

        updateMyIdeasStats();
        renderMyIdeas();

    } catch (error) {

        console.error(
            "My ideas error:",
            error
        );

        list.innerHTML = `
            <div class="my-ideas-error">
                ❌ تعذر تحميل أفكارك

                <button onclick="loadMyIdeas()">
                    حاول مرة أخرى
                </button>
            </div>
        `;
    }
}


function updateMyIdeasStats() {

    const total =
        document.getElementById("myIdeasTotal");

    const favorites =
        document.getElementById("myIdeasFavorites");

    const projects =
        document.getElementById("myIdeasProjects");

    if (total) {
        total.textContent =
            myIdeas.length;
    }

    if (favorites) {
        favorites.textContent =
            myIdeas.filter(
                idea => idea.favorite === true
            ).length;
    }

    if (projects) {
        projects.textContent =
            myIdeas.filter(
                idea => idea.type === "projects"
            ).length;
    }
}


function setMyIdeasFilter(filter, button) {

    myIdeasFilter =
        filter || "all";

    document
        .querySelectorAll(
            ".my-ideas-filter"
        )
        .forEach(btn => {
            btn.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    }

    renderMyIdeas();
}


function renderMyIdeas() {

    const list =
        document.getElementById("myIdeasList");

    if (!list) return;

    const search =
        document.getElementById("myIdeasSearch")
            ?.value
            .trim()
            .toLowerCase() || "";

    const filtered =
        myIdeas.filter(idea => {

            const title =
                String(idea.title || "")
                    .toLowerCase();

            const description =
                String(idea.description || "")
                    .toLowerCase();

            const matchesSearch =
                !search ||
                title.includes(search) ||
                description.includes(search);

            let matchesFilter = true;

            if (myIdeasFilter === "favorite") {
                matchesFilter =
                    idea.favorite === true;
            }

            if (
                myIdeasFilter === "projects" ||
                myIdeasFilter === "content" ||
                myIdeasFilter === "general"
            ) {
                matchesFilter =
                    idea.type === myIdeasFilter;
            }

            return (
                matchesSearch &&
                matchesFilter
            );
        });

    if (!filtered.length) {

        list.innerHTML = `
            <div class="my-ideas-empty">
                💡 لا توجد أفكار هنا.
            </div>
        `;

        return;
    }

    list.innerHTML =
        filtered.map(idea => {

            const originalIndex =
                myIdeas.indexOf(idea);

            const favorite =
                idea.favorite === true;

            return `
                <article class="my-idea-item">

                    <div class="my-idea-number">
                        ${originalIndex + 1}
                    </div>

                    <div class="my-idea-body">

                        <div class="my-idea-title-row">

                            <strong>
                                ${escapeMyIdea(
                                    idea.title
                                )}
                            </strong>

                            <button
                                type="button"
                                class="my-idea-favorite"
                                onclick="toggleMyIdeaFavorite(${originalIndex})"
                                title="${
                                    favorite
                                        ? "إزالة من المفضلة"
                                        : "إضافة للمفضلة"
                                }">

                                ${
                                    favorite
                                        ? "⭐"
                                        : "☆"
                                }

                            </button>

                        </div>

                        <p>
                            ${escapeMyIdea(
                                idea.description
                            )}
                        </p>

                        <small>
                            ${formatMyIdeaDate(
                                idea.createdAt
                            )}
                        </small>

                        <div class="my-idea-actions">

                            <button
                                type="button"
                                onclick="copyMyIdea(${originalIndex})">
                                📋 نسخ
                            </button>

                            <button
                                type="button"
                                onclick="developMyIdea(${originalIndex})">
                                🚀 طوّر
                            </button>

                            <button
                                type="button"
                                onclick="editMyIdea(${originalIndex})">
                                ✏️ تعديل
                            </button>

                            <button
                                type="button"
                                onclick="deleteMyIdea(${originalIndex})">
                                🗑️ حذف
                            </button>

                        </div>

                    </div>

                </article>
            `;

        }).join("");
}


function filterMyIdeas() {
    renderMyIdeas();
}


async function toggleMyIdeaFavorite(index) {

    const idea =
        myIdeas[index];

    if (!idea) return;

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("خاصك تسجل الدخول أولاً.");
        return;
    }

    const newValue =
        idea.favorite !== true;

    try {

        const response =
            await fetch(
                "/ideas-update/" +
                encodeURIComponent(idea.id),
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body: JSON.stringify({
                        favorite: newValue
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "تعذر تحديث المفضلة"
            );
        }

        myIdeas[index] =
            data.idea;

        updateMyIdeasStats();
        renderMyIdeas();

    } catch (error) {

        console.error(
            "Favorite idea error:",
            error
        );

        alert(
            error.message ||
            "تعذر تحديث المفضلة"
        );
    }
}


async function editMyIdea(index) {

    const idea =
        myIdeas[index];

    if (!idea) return;

    const newTitle =
        prompt(
            "عدّل عنوان الفكرة:",
            idea.title
        );

    if (newTitle === null) {
        return;
    }

    const title =
        newTitle.trim();

    if (!title) {
        alert("عنوان الفكرة مطلوب.");
        return;
    }

    const newDescription =
        prompt(
            "عدّل وصف الفكرة:",
            idea.description
        );

    if (newDescription === null) {
        return;
    }

    const description =
        newDescription.trim();

    if (!description) {
        alert("وصف الفكرة مطلوب.");
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("خاصك تسجل الدخول أولاً.");
        return;
    }

    try {

        const response =
            await fetch(
                "/ideas-update/" +
                encodeURIComponent(idea.id),
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body: JSON.stringify({
                        title,
                        description
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "تعذر تعديل الفكرة"
            );
        }

        myIdeas[index] =
            data.idea;

        updateMyIdeasStats();
        renderMyIdeas();

        alert("تم تعديل الفكرة ✏️");

    } catch (error) {

        console.error(
            "Edit idea error:",
            error
        );

        alert(
            error.message ||
            "تعذر تعديل الفكرة"
        );
    }
}


async function deleteMyIdea(index) {

    const idea =
        myIdeas[index];

    if (!idea) return;

    const confirmed =
        confirm(
            `واش متأكد بغيتي تحذف هاد الفكرة؟\n\n${idea.title}`
        );

    if (!confirmed) {
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("خاصك تسجل الدخول أولاً.");
        return;
    }

    try {

        const response =
            await fetch(
                "/ideas-delete/" +
                encodeURIComponent(idea.id),
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

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "تعذر حذف الفكرة"
            );
        }

        myIdeas.splice(index, 1);

        updateMyIdeasStats();
        renderMyIdeas();

        alert("تم حذف الفكرة 🗑️");

    } catch (error) {

        console.error(
            "Delete my idea error:",
            error
        );

        alert(
            error.message ||
            "تعذر حذف الفكرة"
        );
    }
}


function copyMyIdea(index) {

    const idea =
        myIdeas[index];

    if (!idea) return;

    const text =
        `${idea.title}\n\n${idea.description}`;

    navigator.clipboard
        .writeText(text)
        .then(() => {
            alert("تم نسخ الفكرة ✅");
        })
        .catch(() => {
            alert("تعذر النسخ");
        });
}


function developMyIdea(index) {

    const idea =
        myIdeas[index];

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

    localStorage.removeItem(
        "activeConversationId"
    );

    localStorage.removeItem(
        "activeConversationMessages"
    );

    loadPage("ai");
}


function escapeMyIdea(text) {

    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatMyIdeaDate(date) {

    if (!date) {
        return "";
    }

    try {

        return new Date(date)
            .toLocaleDateString(
                "ar-MA",
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                }
            );

    } catch {

        return "";
    }
}
