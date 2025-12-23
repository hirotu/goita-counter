// ごいたカウンター (10点刻み)
(function () {
    const STORAGE_KEY = "goita-counter-v1";
    const META_KEY = "goita-counter-meta-v1";
    // 合計を強調する閾値はメタ情報で保持する（デフォルト 150）
    let THRESHOLD = 150;

    const defaultPlayers = [
        { name: "プレイヤー1", score: 0 },
        { name: "プレイヤー2", score: 0 },
        { name: "プレイヤー3", score: 0 },
        { name: "プレイヤー4", score: 0 },
    ];

    let state = {
        players: load() || defaultPlayers,
        lastAction: null, // for undo
    };

    const playersEl = document.getElementById("players");
    const resetBtn = document.getElementById("reset");
    const undoBtn = document.getElementById("undo");
    const total12El = document.getElementById("total12");
    const total34El = document.getElementById("total34");
    const thresholdInput = document.getElementById("thresholdInput");

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.players));
        } catch (e) {}
    }

    function saveMeta(meta) {
        try {
            localStorage.setItem(META_KEY, JSON.stringify(meta));
        } catch (e) {}
    }

    function loadMeta() {
        try {
            const raw = localStorage.getItem(META_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function render() {
        playersEl.innerHTML = "";
        state.players.forEach((p, idx) => {
            const card = document.createElement("div");
            card.className = "player";

            const nameInput = document.createElement("input");
            nameInput.className = "name";
            nameInput.value = p.name;
            nameInput.addEventListener("change", () => {
                const prev = p.name;
                p.name = nameInput.value.trim() || `プレイヤー${idx + 1}`;
                state.lastAction = {
                    type: "name",
                    payload: { idx, prevName: prev },
                };
                save();
                render();
            });

            const scoreEl = document.createElement("div");
            scoreEl.className = "score";
            scoreEl.textContent = p.score;

            const controls = document.createElement("div");
            controls.className = "controls";

            const minus = document.createElement("button");
            minus.textContent = "-10";
            minus.className = "negative";
            minus.addEventListener("click", () => changeScore(idx, -10));

            const plus = document.createElement("button");
            plus.textContent = "+10";
            plus.className = "primary";
            plus.addEventListener("click", () => changeScore(idx, +10));

            const setZero = document.createElement("button");
            setZero.textContent = "0にする";
            setZero.className = "ghost";
            setZero.addEventListener("click", () => {
                const prev = p.score;
                if (prev === 0) return;
                p.score = 0;
                state.lastAction = {
                    type: "change",
                    payload: { idx, delta: -prev },
                    prevScore: prev,
                };
                save();
                render();
            });

            controls.appendChild(minus);
            controls.appendChild(plus);
            controls.appendChild(setZero);

            card.appendChild(nameInput);
            card.appendChild(scoreEl);
            card.appendChild(controls);

            playersEl.appendChild(card);
        });

        undoBtn.disabled = !state.lastAction;

        // 合計を更新（存在しないプレイヤーは 0 と見なす）
        const s1 = (state.players[0] && Number(state.players[0].score)) || 0;
        const s2 = (state.players[1] && Number(state.players[1].score)) || 0;
        const s3 = (state.players[2] && Number(state.players[2].score)) || 0;
        const s4 = (state.players[3] && Number(state.players[3].score)) || 0;
        const name1 =
            (state.players[0] && state.players[0].name) || "プレイヤー1";
        const name2 =
            (state.players[1] && state.players[1].name) || "プレイヤー2";
        const name3 =
            (state.players[2] && state.players[2].name) || "プレイヤー3";
        const name4 =
            (state.players[3] && state.players[3].name) || "プレイヤー4";
        const sum13 = s1 + s3;
        const sum24 = s2 + s4;
        if (total12El) {
            total12El.textContent = `${name1}+${name3}: ${sum13}`;
            total12El.classList.toggle("over", sum13 >= THRESHOLD);
        }
        if (total34El) {
            total34El.textContent = `${name2}+${name4}: ${sum24}`;
            total34El.classList.toggle("over", sum24 >= THRESHOLD);
        }
    }

    function changeScore(idx, delta) {
        const p = state.players[idx];
        if (!p) return;
        const prev = p.score;
        p.score = Math.round((p.score + delta) / 10) * 10;
        state.lastAction = {
            type: "change",
            payload: { idx, delta },
            prevScore: prev,
        };
        save();
        render();
    }

    // 初期メタの読み込み（閾値など）
    (function initMeta() {
        const meta = loadMeta();
        if (meta && typeof meta.threshold === "number") {
            THRESHOLD = meta.threshold;
        }
        // UI に反映
        if (thresholdInput) thresholdInput.value = THRESHOLD;
    })();

    // 閾値入力の変更を監視して保存・再描画
    if (thresholdInput) {
        thresholdInput.addEventListener("change", () => {
            const v = Number(thresholdInput.value || 0);
            if (!Number.isFinite(v) || v < 0) return;
            // 10刻みで丸め
            const rounded = Math.round(v / 10) * 10;
            THRESHOLD = rounded;
            saveMeta({ threshold: THRESHOLD });
            render();
        });
    }

    // 追加/削除機能は削除されました

    resetBtn.addEventListener("click", () => {
        const prev = state.players.map((p) => p.score);
        state.players.forEach((p) => (p.score = 0));
        state.lastAction = { type: "reset", payload: { prev } };
        save();
        render();
    });

    undoBtn.addEventListener("click", () => {
        const a = state.lastAction;
        if (!a) return;
        switch (a.type) {
            case "change":
                if (
                    typeof a.payload.idx === "number" &&
                    typeof a.payload.delta === "number"
                ) {
                    const idx = a.payload.idx;
                    if (state.players[idx])
                        state.players[idx].score =
                            a.prevScore != null
                                ? a.prevScore
                                : state.players[idx].score - a.payload.delta;
                }
                break;
            case "name":
                if (state.players[a.payload.idx])
                    state.players[a.payload.idx].name = a.payload.prevName;
                break;
            // add/remove は実装されていないためここで扱わない
            case "reset":
                a.payload.prev.forEach((s, i) => {
                    if (state.players[i]) state.players[i].score = s;
                });
                break;
        }
        state.lastAction = null;
        save();
        render();
    });

    // キーボード: 1-9 でプレイヤー選択、Shift 同時で -10
    document.addEventListener("keydown", (e) => {
        if (
            document.activeElement &&
            (document.activeElement.tagName === "INPUT" ||
                document.activeElement.isContentEditable)
        )
            return;
        const k = e.key;
        if (!/^[1-9]$/.test(k)) return;
        const idx = Number(k) - 1;
        if (idx < 0 || idx >= state.players.length) return;
        if (e.shiftKey) changeScore(idx, -10);
        else changeScore(idx, +10);
    });

    // 初期表示
    render();
})();
