import {activate, leverage, TSpalte} from "./APCalculator.js"

type baseRow = {
    order: number,
    description: string,
    cost: number
}
type otherRow = baseRow & {
    type: "free"
};
type sktActivation = baseRow & {
    type: "skt",
    col: TSpalte,
    to: number,
    activation: true,
}
type sktLevereage = baseRow & {
    type: "skt",
    col: TSpalte,
    to: number,
    from: number,
    activation: false
}
type sktRow = sktActivation | sktLevereage;

let state: {
    name?: string
    expended: number
    total: number
    available: number
    level: number
    sktBased: sktRow[]
    other: otherRow[]
    valid: boolean
} = {
    name: "",
    expended: 0,
    total: 0,
    available: 0,
    level: 1,
    sktBased: [],
    other: [],
    valid: true,
}

function isSkt(row: sktRow | otherRow): row is sktRow {
    return row.hasOwnProperty("to");
}

function isTSpalte(col: string): col is TSpalte {
    return ["A+", "A", "B", "C", "D", "E", "F", "G", "H"].includes(col);
}

const total = document.getElementById("totalAP") as HTMLInputElement;
const available = document.getElementById("totalAPout") as HTMLOutputElement;
const level = document.getElementById("level") as HTMLInputElement;
const expanseTemplate = document.getElementById('expanse') as HTMLTemplateElement;
const expanses = document.getElementById('expanses') as HTMLElement;
const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
const saveDialog = document.getElementById('saveDialog') as HTMLDialogElement;
const loadDialog = document.getElementById('loadDialog') as HTMLDialogElement;
const loadForm = document.getElementById('load') as HTMLFormElement;
const copyButton = document.getElementById('copyButton') as HTMLButtonElement;
init();


function init() {
    total.addEventListener("change", () => updateNumber(total, (val) => state.total = val))
    level.addEventListener("change", () => updateNumber(level, (val) => state.level = val))
    initSave();
    initLoad();
    initCopy();
    loadState(state);
}

function initSave() {
    saveButton.addEventListener("click", () => {
        const s = new Date().toISOString();
        const name = (state.name == "" || state.name == null) ? `${s.substring(0, 10)}_${s.substring(11, 16)}` : state.name;
        saveDialog.querySelector("input")!.value = name;
        saveDialog.showModal();
    });
    saveDialog.querySelector("button[value=cancel]")?.addEventListener("click", (e) => {
        e.preventDefault();
        saveDialog.close()
    })
    saveDialog.addEventListener("close", () => {
        if (saveDialog.returnValue == "local") {
            storeState(saveDialog.querySelector("input")!.value);
        }
        if (saveDialog.returnValue == "download") {
            downloadState(saveDialog.querySelector("input")!.value);
        }
    })
}

function initLoad() {
    loadButton.addEventListener("click", () => {
        const select = loadDialog.querySelector("select") as HTMLSelectElement;
        select.innerHTML = "";
        const states = getStoredStates();
        [...states.keys()].forEach(key => {
            const option = document.createElement("option");
            option.value = key;
            option.innerHTML = key
            select.append(option);
        });
        loadDialog.showModal()
    })
    loadDialog.querySelector("button[value=cancel]")?.addEventListener("click", (e) => {
        e.preventDefault();
        loadDialog.close()
    })
    loadDialog.addEventListener("close", () => {
        if (loadDialog.returnValue == "load") {
            const data = new Map(new FormData(loadForm));
            const isFileUpload = ((data.get("upload") as File)?.name ?? "") !== "";
            if (isFileUpload) {
                var reader = new FileReader();
                reader.readAsText(data.get("upload") as File, "UTF-8");
                reader.onload = function (evt) {
                    const text = evt.target?.result as string;
                    const newState = JSON.parse(text);
                    const filename = (data.get("upload") as File).name;
                    newState.name=filename.substring(0,filename.length-5);
                    loadState(newState)
                }
            } else {
                const key = data.get("saved") as string ?? "";
                const newstate = getStoredStates().get(key);
                if (newstate) {
                    newstate.name=key;
                    loadState(newstate);
                }
            }
        }
    })
}

function initCopy() {
    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(stateToString());
        const oldText = copyButton.innerText;
        copyButton.innerText = "Kopiert!";
        copyButton.disabled = true;
        setTimeout(() => {
            copyButton.innerText = oldText;
            copyButton.disabled = false
        }, 5000)

    })
}

const storageKey = "ap_calculator";

function storeState(name: string) {
    const saved = getStoredStates();
    saved.set(name, {...state, name});
    localStorage.setItem(storageKey, JSON.stringify([...saved.entries()]));
}

function getStoredStates() {
    const stored = localStorage.getItem(storageKey) ?? "[]";
    return new Map(JSON.parse(stored)) as Map<string, typeof state>;
}

function downloadState(name: string) {
    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", data);
    anchor.setAttribute("download", name + ".json");
    document.body.appendChild(anchor); // required for firefox
    anchor.click();
    anchor.remove();
}


function loadState(newState: typeof state) {
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
            const parts = [] as string[];
            if (isSkt(row)) {
                parts.push(row.description);
                parts.push(row.col);
                parts.push(`${row.activation ? "aktiviert" : row.from} --> ${row.to}`);
                parts.push(`${row.cost} AP`);
            } else {
                parts.push(row.description);
                parts.push("\t")
                parts.push(`${row.cost} AP`);
            }
            return parts.join("\t");
        })
    ].join("\n");
}

function validate() {
    state.valid = [total, level].reduce((akku, element) => {
        const valid = element.checkValidity();
        element.parentElement!.dataset.validation = element.validationMessage;
        return valid && akku;
    }, true);
}

function update() {
    console.log("update");
    validate();
    if (state.valid) {
        updateExpanses();
        updateCalculation();
        updateUI()
    }
}

function updateFormUI(form: HTMLFormElement) {
    //UI
    const isSktForm = (form.querySelector('[name=type]') as HTMLSelectElement).value == "skt";
    const isAktivation = isSktForm && (form.querySelector('[name=activation]') as HTMLInputElement).checked;
    form.querySelectorAll("[name=col],[name=activation],[name=to]").forEach((el) => {
        (el as HTMLInputElement).disabled = !isSktForm;
    });
    (form.querySelector("[name=from]") as HTMLInputElement).disabled = !isSktForm || isAktivation;
    (form.querySelector("[name=cost]") as HTMLInputElement).readOnly = isSktForm;
    form.requestSubmit()
}

function updateExpanses() {
    const forms = [...expanses.querySelectorAll("form")].map((form: HTMLFormElement, i) => {
        form.dataset.order = `${i}`;
        return {form, parsed: formToRow(form)}
    });
    const {skt, other} = forms.reduce(({invalid, skt, other}, {form, parsed}) => {
        if (parsed === false) {
            invalid.push(form);
        } else if (isSkt(parsed)) {
            skt.push({form, row: parsed});
        } else {
            other.push({form, row: parsed});
        }
        return {invalid, skt, other}
    }, {
        invalid: [] as HTMLFormElement[],
        skt: [] as { form: HTMLFormElement, row: sktRow }[],
        other: [] as { form: HTMLFormElement, row: otherRow }[]
    });
    state.sktBased = skt.map(x => x.row);
    state.other = other.map(x => x.row);
}

function formToRow(form: HTMLFormElement): sktRow | otherRow | false {
    const data = new Map(new FormData(form)) as Map<string, string>;
    const order = Number.parseInt(form.dataset.order ?? "");
    if (Number.isFinite(order)) {
        const {type, description, col, activation, from, to, cost} = {
            type: data.get("type"),
            description: data.get("description") ?? "",
            col: data.get("col") ?? "",
            activation: data.get("activation") === "on",
            from: Number.parseInt(data.get("from") ?? ""),
            to: Number.parseInt(data.get("to") ?? ""),
            cost: Number.parseInt(data.get("cost") ?? "")
        }

        if (type == "free" && Number.isFinite(cost) && description.length > 0) {
            return {order, type, description, cost}
        }
        if (
            type === "skt"
            && isTSpalte(col)
            && Number.isFinite(to)
            && description.length > 0
        ) {
            let computedCost = 0;
            if (activation) {
                computedCost += activate(state.level, col);
                computedCost += leverage(0, to, state.level, col);
                return {order, type, description, cost: computedCost, activation, col, to};
            }
            if (!activation && Number.isFinite(from) && from <= to) {
                computedCost += leverage(from, to, state.level, col);
                return {order, type, description, cost: computedCost, activation, col, to, from};
            }
        }

    }
    return false;
}

function createNewExpanse(row: sktRow | otherRow | null = null) {
    const node = expanseTemplate.content.cloneNode(true) as HTMLElement;
    const form = node.querySelector("form") as HTMLFormElement;
    form.addEventListener("change", () => updateFormUI(form));
    form.addEventListener("submit", (ev) => {
        update();
        ev.preventDefault();
    })
    if (row) {
        form.dataset.order = `${row.order}`;
        Object.keys(row).forEach((key) => {
            const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
            if (input) {
                // @ts-ignore
                const value = row[key];
                if (typeof value == "boolean") {
                    input.checked = value;
                } else {
                    input.value = `${value}`;
                }
            }
        })
    }
    updateFormUI(form);
    return node;
}


function updateUI() {
    available.innerHTML = `${state.available}`;
    const rows = [...state.sktBased, ...state.other];
    state.sktBased.forEach(r => {
        (expanses.querySelector(`[data-order="${r.order}"] [name=cost]`) as HTMLInputElement).value = `${r.cost}`;
    })
    const allValid = rows.length == expanses.querySelectorAll("form").length;
    if (allValid) {
        expanses.append(createNewExpanse())
    }
}

function updateCalculation() {
    let expended = 0;
    state.sktBased.forEach(row => {
        expended += row.cost
    });
    state.other.forEach(row => expended += row.cost);
    state.expended = expended;
    state.available = state.total - state.expended;
}

function updateNumber(target: HTMLInputElement, setter: (val: number) => void) {
    const val = Number.parseInt(target.value);
    if (Number.isFinite(val)) {
        setter(val);
    }
    update();
}

