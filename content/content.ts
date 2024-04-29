import {readFileSync, statSync} from 'fs';
import * as path from 'path';
import {globSync} from 'glob';
import * as dotenv from 'dotenv';
import {Converter} from 'showdown';

dotenv.config();

const base = process.env.MD_BASEFOLDER ?? "markdownfiles";
const glob = process.env.MD_GLOB ?? "*.md";

function readFilesSync(dir: string) {
    const files = globSync(`${dir}${path.sep}${glob}`);
    return files.map((filename: string) => {
        const name = path.parse(filename).name;
        const filepath = path.resolve(filename);
        const stat = statSync(filepath);
        const ext = path.parse(filename).ext;
        const isFile = stat.isFile();

        return {name, filename: path.relative(dir, filename), filepath, isFile, ext};
    });
}

const fileInfos = readFilesSync(base);
export const getFiles = () => fileInfos;

const converter = new Converter({
    tables: true,
    moreStyling: true,
    metadata: true,
    completeHTMLDocument: true
});

const fakeMeta = {title: "", lang: "de"}
converter.listen("completeHTMLDocument.before", (evtName, text, converter, options, globals) => {
    globals.metadata.parsed = {...globals.metadata.parsed, ...fakeMeta};
    return `<h1>${fakeMeta.title}</h1>\n${text}`;
});
export const getPosts = () => {
    const slugs: string[] = [];
    const posts = fileInfos.map((fileinfo) => {
        const {dir, name} = path.parse(fileinfo.filename);
        const slug = `${dir}${dir ? "/" : ""}${name}`;
        slugs.push(slug);
        const title = fileinfo.name;
        fakeMeta.title = title;
        const html = converter.makeHtml(readFileSync(fileinfo.filepath, {encoding: "utf8"}));

        return {slug, title, html, filename: fileinfo.filename};
    })

    const slugTree = pathesToFileTree(slugs);
    const folder: TNode[] = [];
    let stack = [slugTree];
    while (stack.length > 0) {
        const current = stack.pop();
        if (current.children.size > 0) {
            folder.push(current);
            stack.push(...current.children.values());
        }
    }
    const linkLists = folder.map((item) => {
        let slug = item.name;
        let current = item;
        while (current.parent != null) {
            current = current.parent;
            slug = `${current.name}/${slug}`;
        }
        fakeMeta.title = item.name;
        const md = [...item.children.values()].map(({name}) => `* [${name}](${encodeURI(name)})`).join("\n");
        const html = converter.makeHtml(md);
        return {slug, title: item.name, filename: slug, html}
    });
    return [...posts,...linkLists]
}

type TNode = { name: string, children: Map<string, TNode>, parent?: TNode }

function pathesToFileTree(pathes: string[]): TNode {
    const tree = {
        name: "",
        children: new Map(),
        parent: null
    };
    pathes.forEach(path => {
        const parts = path.split("/");
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!current.children.has(part)) {
                current.children.set(part, {name: part, children: new Map(), parent: current});
            }
            current = current.children.get(part);
        }
    });
    return tree;
}
