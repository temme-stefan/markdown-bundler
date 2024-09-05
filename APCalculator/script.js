import { activate, leverage } from "./APCalculator.js";
let state = {
    expended: 0,
    total: 0,
    available: 0,
    level: 1,
    sktBased: [],
    other: [],
    valid: true,
};
function isSkt(row) {
    return row.hasOwnProperty("to");
}
function isTSpalte(col) {
    return ["A+", "A", "B", "C", "D", "E", "F", "G", "H"].includes(col);
}
const total = document.getElementById("totalAP");
const available = document.getElementById("totalAPout");
const level = document.getElementById("level");
const expanseTemplate = document.getElementById('expanse');
const expanses = document.getElementById('expanses');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const saveDialog = document.getElementById('saveDialog');
const loadDialog = document.getElementById('loadDialog');
const loadForm = document.getElementById('load');
const copyButton = document.getElementById('copyButton');
init();
function init() {
    total.addEventListener("change", () => updateNumber(total, (val) => state.total = val));
    level.addEventListener("change", () => updateNumber(level, (val) => state.level = val));
    initSave();
    initLoad();
    initCopy();
    loadState(state);
}
function initSave() {
    var _a;
    saveButton.addEventListener("click", () => {
        const s = new Date().toISOString();
        saveDialog.querySelector("input").value = `${s.substring(0, 10)}_${s.substring(11, 16)}`;
        saveDialog.showModal();
    });
    (_a = saveDialog.querySelector("button[value=cancel]")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (e) => {
        e.preventDefault();
        saveDialog.close();
    });
    saveDialog.addEventListener("close", () => {
        if (saveDialog.returnValue == "local") {
            storeState(saveDialog.querySelector("input").value);
        }
        if (saveDialog.returnValue == "download") {
            downloadState(saveDialog.querySelector("input").value);
        }
    });
}
function initLoad() {
    var _a;
    loadButton.addEventListener("click", () => {
        const select = loadDialog.querySelector("select");
        select.innerHTML = "";
        const states = getStoredStates();
        [...states.keys()].forEach(key => {
            const option = document.createElement("option");
            option.value = key;
            option.innerHTML = key;
            select.append(option);
        });
        loadDialog.showModal();
    });
    (_a = loadDialog.querySelector("button[value=cancel]")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", (e) => {
        e.preventDefault();
        loadDialog.close();
    });
    loadDialog.addEventListener("close", () => {
        var _a, _b, _c;
        if (loadDialog.returnValue == "load") {
            const data = new Map(new FormData(loadForm));
            const isFileUpload = ((_b = (_a = data.get("upload")) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "") !== "";
            if (isFileUpload) {
                var reader = new FileReader();
                reader.readAsText(data.get("upload"), "UTF-8");
                reader.onload = function (evt) {
                    var _a;
                    const text = (_a = evt.target) === null || _a === void 0 ? void 0 : _a.result;
                    loadState(JSON.parse(text));
                };
            }
            else {
                const key = (_c = data.get("saved")) !== null && _c !== void 0 ? _c : "";
                const newstate = getStoredStates().get(key);
                if (newstate) {
                    loadState(newstate);
                }
            }
        }
    });
}
function initCopy() {
    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(stateToString());
        const oldText = copyButton.innerText;
        copyButton.innerText = "Kopiert!";
        copyButton.disabled = true;
        setTimeout(() => {
            copyButton.innerText = oldText;
            copyButton.disabled = false;
        }, 5000);
    });
}
const storageKey = "ap_calculator";
function storeState(name) {
    const saved = getStoredStates();
    saved.set(name, state);
    localStorage.setItem(storageKey, JSON.stringify([...saved.entries()]));
}
function getStoredStates() {
    var _a;
    const stored = (_a = localStorage.getItem(storageKey)) !== null && _a !== void 0 ? _a : "[]";
    return new Map(JSON.parse(stored));
}
function downloadState(name) {
    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", data);
    anchor.setAttribute("download", name + ".json");
    document.body.appendChild(anchor); // required for firefox
    anchor.click();
    anchor.remove();
}
function loadState(newState) {
    state = newState;
    total.value = `${state.total}`;
    level.value = `${state.level}`;
    expanses.innerHTML = "";
    getRowsSorted().forEach(r => expanses.append(createNewExpanse(r)));
    update();
}
function getRowsSorted() {
    const rows = [...state.sktBased, ...state.other];
    rows.sort((a, b) => Math.sign(a.order - b.order));
    return rows;
}
function stateToString() {
    return [`Level: ${state.level}`,
        `AP: ${state.available} / ${state.total}`,
        ``,
        ...getRowsSorted().map(row => {
            const parts = [];
            if (isSkt(row)) {
                parts.push(row.description);
                parts.push(row.col);
                parts.push(`${row.activation ? "aktiviert" : row.from} --> ${row.to}`);
                parts.push(`${row.cost} AP`);
            }
            else {
                parts.push(row.description);
                parts.push("\t");
                parts.push(`${row.cost} AP`);
            }
            return parts.join("\t");
        })
    ].join("\n");
}
function validate() {
    state.valid = [total, level].reduce((akku, element) => {
        const valid = element.checkValidity();
        element.parentElement.dataset.validation = element.validationMessage;
        return valid && akku;
    }, true);
}
function update() {
    console.log("update");
    validate();
    if (state.valid) {
        updateExpanses();
        updateCalculation();
        updateUI();
    }
}
function updateFormUI(form) {
    //UI
    const isSktForm = form.querySelector('[name=type]').value == "skt";
    const isAktivation = isSktForm && form.querySelector('[name=activation]').checked;
    form.querySelectorAll("[name=col],[name=activation],[name=to]").forEach((el) => {
        el.disabled = !isSktForm;
    });
    form.querySelector("[name=from]").disabled = !isSktForm || isAktivation;
    form.querySelector("[name=cost]").readOnly = isSktForm;
    form.requestSubmit();
}
function updateExpanses() {
    const forms = [...expanses.querySelectorAll("form")].map((form, i) => {
        form.dataset.order = `${i}`;
        return { form, parsed: formToRow(form) };
    });
    const { skt, other } = forms.reduce(({ invalid, skt, other }, { form, parsed }) => {
        if (parsed === false) {
            invalid.push(form);
        }
        else if (isSkt(parsed)) {
            skt.push({ form, row: parsed });
        }
        else {
            other.push({ form, row: parsed });
        }
        return { invalid, skt, other };
    }, {
        invalid: [],
        skt: [],
        other: []
    });
    state.sktBased = skt.map(x => x.row);
    state.other = other.map(x => x.row);
}
function formToRow(form) {
    var _a, _b, _c, _d, _e, _f;
    const data = new Map(new FormData(form));
    const order = Number.parseInt((_a = form.dataset.order) !== null && _a !== void 0 ? _a : "");
    if (Number.isFinite(order)) {
        const { type, description, col, activation, from, to, cost } = {
            type: data.get("type"),
            description: (_b = data.get("description")) !== null && _b !== void 0 ? _b : "",
            col: (_c = data.get("col")) !== null && _c !== void 0 ? _c : "",
            activation: data.get("activation") === "on",
            from: Number.parseInt((_d = data.get("from")) !== null && _d !== void 0 ? _d : ""),
            to: Number.parseInt((_e = data.get("to")) !== null && _e !== void 0 ? _e : ""),
            cost: Number.parseInt((_f = data.get("cost")) !== null && _f !== void 0 ? _f : "")
        };
        if (type == "free" && Number.isFinite(cost) && description.length > 0) {
            return { order, type, description, cost };
        }
        if (type === "skt"
            && isTSpalte(col)
            && Number.isFinite(to)
            && description.length > 0) {
            let computedCost = 0;
            if (activation) {
                computedCost += activate(state.level, col);
                computedCost += leverage(0, to, state.level, col);
                return { order, type, description, cost: computedCost, activation, col, to };
            }
            if (!activation && Number.isFinite(from) && from <= to) {
                computedCost += leverage(from, to, state.level, col);
                return { order, type, description, cost: computedCost, activation, col, to, from };
            }
        }
    }
    return false;
}
function createNewExpanse(row = null) {
    const node = expanseTemplate.content.cloneNode(true);
    const form = node.querySelector("form");
    form.addEventListener("change", () => updateFormUI(form));
    form.addEventListener("submit", (ev) => {
        update();
        ev.preventDefault();
    });
    if (row) {
        form.dataset.order = `${row.order}`;
        Object.keys(row).forEach((key) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                // @ts-ignore
                const value = row[key];
                if (typeof value == "boolean") {
                    input.checked = value;
                }
                else {
                    input.value = `${value}`;
                }
            }
        });
    }
    updateFormUI(form);
    return node;
}
function updateUI() {
    available.innerHTML = `${state.available}`;
    const rows = [...state.sktBased, ...state.other];
    state.sktBased.forEach(r => {
        expanses.querySelector(`[data-order="${r.order}"] [name=cost]`).value = `${r.cost}`;
    });
    const allValid = rows.length == expanses.querySelectorAll("form").length;
    if (allValid) {
        expanses.append(createNewExpanse());
    }
}
function updateCalculation() {
    let expended = 0;
    state.sktBased.forEach(row => {
        expended += row.cost;
    });
    state.other.forEach(row => expended += row.cost);
    state.expended = expended;
    state.available = state.total - state.expended;
}
function updateNumber(target, setter) {
    const val = Number.parseInt(target.value);
    if (Number.isFinite(val)) {
        setter(val);
    }
    update();
}
