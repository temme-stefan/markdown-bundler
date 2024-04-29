export type TNode = { name: string, children: Map<string, TNode>, parent?: TNode }

export function pathesToFileTree(pathes: string[]): TNode {
    const tree = {
        name: "/",
        children: new Map(),
        parent: null
    };
    pathes.forEach(path => {
        const parts = path.split("/");
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part == "") continue;
            if (!current.children.has(part)) {
                current.children.set(part, {name: part, children: new Map(), parent: current});
            }
            current = current.children.get(part);
        }
    });
    return tree;
}