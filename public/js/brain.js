(function () {

    "use strict";

    let memories = [];
    let events = [];
    let currentTab = "memories";

    function getToken() {
        return (
            localStorage.getItem("token") ||
            localStorage.getItem("authToken") ||
            ""
        );
    }

    async function api(
        url,
        options = {}
    ) {
        const token = getToken();

        const headers = {
            "Content-Type":
                "application/json",
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization =
                "Bearer " + token;
        }

        const response =
            await fetch(
                url,
                {
                    ...options,
                    headers
                }
            );

        const data =
            await response
                .json()
                .catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Request failed"
            );
        }

        return data;
    }

    function escapeHtml(text) {
        return String(text || "")
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    async function loadBrain() {
        try {
            const data =
                await api(
                    "/brain"
                );

            memories =
                Array.isArray(
                    data.items
                )
                    ? data.items
                    : [];

            const stats =
                data.stats ||
                {};

            document.getElementById(
                "statTotal"
            ).textContent =
                stats.active || 0;

            document.getElementById(
                "statProjects"
            ).textContent =
                stats.projects || 0;

            document.getElementById(
                "statGoals"
            ).textContent =
                stats.goals || 0;

            document.getElementById(
                "statEvents"
            ).textContent =
                stats.events || 0;

            document.getElementById(
                "brainEnabled"
            ).checked =
                data.enabled !== false;

            render();

            return data;
        } catch (error) {
            document.getElementById(
                "brainContent"
            ).innerHTML =
                `<div class="brain-empty">
                    ❌ ${escapeHtml(error.message)}
                </div>`;
        }
    }

    async function loadEvents() {
        try {
            const data =
                await api(
                    "/brain/events?limit=100"
                );

            events =
                Array.isArray(
                    data.events
                )
                    ? data.events
                    : [];

            render();
        } catch (error) {
            console.error(
                "Brain events:",
                error
            );
        }
    }

    function render() {
        const container =
            document.getElementById(
                "brainContent"
            );

        if (
            currentTab ===
            "events"
        ) {
            renderEvents(
                container
            );
            return;
        }

        if (
            currentTab ===
            "projects"
        ) {
            renderCategory(
                container,
                "project"
            );
            return;
        }

        if (
            currentTab ===
            "goals"
        ) {
            renderCategory(
                container,
                "goal"
            );
            return;
        }

        renderMemories(
            container
        );
    }

    function renderMemories(
        container
    ) {
        const query =
            document.getElementById(
                "brainSearch"
            ).value
                .trim()
                .toLowerCase();

        let list =
            memories.filter(
                item =>
                    item.status ===
                    "active"
            );

        if (query) {
            list =
                list.filter(
                    item =>
                        String(
                            item.text
                        )
                            .toLowerCase()
                            .includes(
                                query
                            ) ||
                        String(
                            item.key
                        )
                            .toLowerCase()
                            .includes(
                                query
                            ) ||
                        String(
                            item.category
                        )
                            .toLowerCase()
                            .includes(
                                query
                            )
                );
        }

        if (!list.length) {
            container.innerHTML =
                `<div class="brain-empty">
                    🧠 ما كايناش ذكريات هنا دابا.
                </div>`;
            return;
        }

        container.innerHTML =
            list.map(
                item =>
                    memoryCard(
                        item
                    )
            ).join("");
    }

    function renderCategory(
        container,
        category
    ) {
        const list =
            memories.filter(
                item =>
                    item.status ===
                        "active" &&
                    item.category ===
                        category
            );

        if (!list.length) {
            container.innerHTML =
                `<div class="brain-empty">
                    مازال ما عندك حتى عنصر هنا.
                </div>`;
            return;
        }

        container.innerHTML =
            list.map(
                memoryCard
            ).join("");
    }

    function renderEvents(
        container
    ) {
        if (!events.length) {
            container.innerHTML =
                `<div class="brain-empty">
                    📚 مازال ما تسجل حتى Learning Event.
                </div>`;
            return;
        }

        container.innerHTML =
            events.map(
                event =>
                    `<div class="brain-card">
                        <div class="brain-category">
                            ${escapeHtml(event.type)}
                        </div>
                        <div class="brain-text">
                            ${escapeHtml(event.text)}
                        </div>
                        <div class="brain-meta">
                            ${escapeHtml(event.createdAt || "")}
                        </div>
                    </div>`
            ).join("");
    }

    function memoryCard(
        item
    ) {
        return `
            <div
                class="brain-card"
                data-id="${escapeHtml(item.id)}"
            >
                <div class="brain-card-top">

                    <div>
                        <div class="brain-category">
                            ${escapeHtml(item.category)}
                            ·
                            ${Math.round(
                                Number(
                                    item.confidence ||
                                        0
                                ) * 100
                            )}%
                        </div>

                        <div class="brain-text">
                            ${escapeHtml(item.text)}
                        </div>

                        <div class="brain-meta">
                            المصدر:
                            ${escapeHtml(item.source)}
                            ${
                                item.usageCount
                                    ? ` · استعمل ${item.usageCount} مرة`
                                    : ""
                            }
                        </div>
                    </div>

                    <div class="brain-actions">
                        <button
                            onclick="window.UltraAIBrain.edit('${escapeHtml(item.id)}')"
                        >
                            ✏️
                        </button>

                        <button
                            onclick="window.UltraAIBrain.remove('${escapeHtml(item.id)}')"
                        >
                            🗑️
                        </button>
                    </div>

                </div>
            </div>
        `;
    }

    async function editMemory(
        id
    ) {
        const item =
            memories.find(
                x =>
                    String(x.id) ===
                    String(id)
            );

        if (!item) return;

        const text =
            prompt(
                "عدّل الذاكرة:",
                item.text
            );

        if (
            text === null ||
            !text.trim()
        ) {
            return;
        }

        try {
            await api(
                `/brain/${encodeURIComponent(id)}`,
                {
                    method:
                        "PATCH",

                    body:
                        JSON.stringify(
                            {
                                text:
                                    text.trim()
                            }
                        )
                }
            );

            await loadBrain();
        } catch (error) {
            alert(
                "❌ " +
                error.message
            );
        }
    }

    async function removeMemory(
        id
    ) {
        if (
            !confirm(
                "واش متأكد بغيتي تحذف هاد الذاكرة؟"
            )
        ) {
            return;
        }

        try {
            await api(
                `/brain/${encodeURIComponent(id)}`,
                {
                    method:
                        "DELETE"
                }
            );

            await loadBrain();
        } catch (error) {
            alert(
                "❌ " +
                error.message
            );
        }
    }

    async function addMemory() {
        const text =
            prompt(
                "شنو المعلومة اللي بغيتي Brain يتذكر؟"
            );

        if (
            text === null ||
            !text.trim()
        ) {
            return;
        }

        try {
            await api(
                "/brain",
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            {
                                text:
                                    text.trim(),
                                category:
                                    "general"
                            }
                        )
                }
            );

            await loadBrain();
        } catch (error) {
            alert(
                "❌ " +
                error.message
            );
        }
    }

    async function toggleBrain(
        enabled
    ) {
        try {
            await api(
                "/brain/settings/enabled",
                {
                    method:
                        "PATCH",

                    body:
                        JSON.stringify({
                            enabled
                        })
                }
            );
        } catch (error) {
            alert(
                "❌ " +
                error.message
            );
        }
    }

    function setup() {
        document
            .querySelectorAll(
                ".brain-tab"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                ".brain-tab"
                            )
                            .forEach(
                                x =>
                                    x.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );

                        currentTab =
                            button.dataset.tab;

                        if (
                            currentTab ===
                            "events"
                        ) {
                            loadEvents();
                        } else {
                            render();
                        }
                    }
                );
            });

        document
            .getElementById(
                "brainSearch"
            )
            .addEventListener(
                "input",
                render
            );

        document
            .getElementById(
                "brainEnabled"
            )
            .addEventListener(
                "change",
                event =>
                    toggleBrain(
                        event.target.checked
                    )
            );

        document
            .getElementById(
                "brainAddBtn"
            )
            .addEventListener(
                "click",
                addMemory
            );

        loadBrain();
    }

    window.UltraAIBrain = {
        edit:
            editMemory,
        remove:
            removeMemory,
        load:
            loadBrain
    };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            setup
        );
    } else {
        setup();
    }

})();
