import {readFileSync, statSync} from 'fs';
import * as path from 'path';
import {globSync} from 'glob';
import * as dotenv from 'dotenv';
import {Converter} from 'showdown';
import {pathesToFileTree, TNode} from "./FileTree";

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
    strikethrough: true,
    metadata: true,
    completeHTMLDocument: false
});

const template = readFileSync("content/template.html", {encoding: "utf8"});

converter.listen("anchors.after", (_, text) => {
    const pattern = /href="[^"]*/g;
    return text.replace(pattern, (match) => {
        match = match
            .replace(".md", "")
            .replace(/\/+/, "/")
            .replace(/href="[^/#]/, (relative) => {
                return relative.substring(0, relative.length - 1) + "/" + relative.substring(relative.length - 1)
            })
            .replace(/#.*/, (hash) => {
                hash = decodeURIComponent(hash)
                    .replace(/ /g, "")
                    .replace(/[&+$,\/:;=?@"{}|^¨~\[\]`\\*)(%.!'<>]/g, '')
                    .toLowerCase();
                return hash;
            });
        return match;
    })
});

export const getPosts = () => {
    const slugs: string[] = [];
    const posts = getFiles().map((fileinfo) => {
        const {dir, name} = path.parse(fileinfo.filename);
        let slug = `${dir}/${name}`;
        if (!slug.startsWith("/")) {
            slug = `/${slug}`;
        }
        slugs.push(slug);
        const title = fileinfo.name;

        const content = converter.makeHtml(readFileSync(fileinfo.filepath, {encoding: "utf8"}));
        const html = template.replace(/%title%/g, title).replace(/%content%/, content);


        return {slug, title, html, filename: fileinfo.filename};
    })
    slugs.sort();
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
            slug = `${current.name}${current.name.endsWith("/") ? "" : "/"}${slug}`;
        }
        const md = [...item.children.values()].map(({name}) => `* [${name}](${encodeURI(`${slug}/${name}`)})`).join("\n");
        const content = converter.makeHtml(md);
        const html = template.replace(/%title%/g, item.name).replace(/%content%/, content);
        return {slug, title: item.name, filename: slug, html}
    });
    return [...posts, ...linkLists]
}

