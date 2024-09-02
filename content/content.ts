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
const startTitle = "Die Gezeichneten der Familie";
const startPage = "content/startpage.md";

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

const createNav = (slugs: string[]): string => {
    slugs.sort();
    const slugTree = pathesToFileTree(slugs);
    const folder = [];
    const htmlLines = ["<div>","<ul>"]
    const createLink = (item: TNode) => {
        folder.push(item.name);
        htmlLines.push(`<li><a href="${folder.join("/")}">${item.name}</a></li>`)
        folder.pop()
    }
    const startGroup = (item: TNode) => {
        folder.push(item.name);
        htmlLines.push(`<li><details name="navgroup_depth_${folder.length}"><summary>${item.name}</summary><ul>`)
    }

    const endGroup = () => {
        htmlLines.push(`</ul></details></li>`);
        folder.pop()
    }
    const walkNode = (item: TNode) => {
        if (item.children.size > 0) {
            startGroup(item);
            item.children.forEach(child => walkNode(child));
            endGroup();
        } else {
            createLink(item);
        }
    }
    htmlLines.push(`<li><a href="/">Start</a></li>`)
    folder.push("")
    const reserved = ["Archiv", "Andrew", "Frag den Meister"];
    const [navItems, resItems] = [...slugTree.children.values()].reduce(([nav, res], c) => {
        if (reserved.some(r => r.includes(c.name))) {
            res.push(c);
        } else {
            nav.push(c);
        }
        return [nav, res];
    }, [[], []]);
    const nodeComparer = (a: TNode, b: TNode) => {
        const aHasChilds = a.children.size > 0;
        const bHasChilds = b.children.size > 0;
        return aHasChilds === bHasChilds ? (a.name < b.name ? -1 : 1) : (bHasChilds ? -1 : 1);
    }
    navItems.sort(nodeComparer);
    resItems.sort(nodeComparer);

    navItems.forEach(walkNode);
    htmlLines.push("</ul>");
    htmlLines.push("<ul>");
    resItems.forEach(walkNode);
    htmlLines.push("</ul>","</div>");
    return htmlLines.join("\n");
}

export const getPosts = () => {
    const slugToFileinfo: Map<string, ReturnType<typeof getFiles>[0]> = new Map();
    getFiles().map((fileinfo) => {
        const {dir, name} = path.parse(fileinfo.filename);
        let slug = `${dir}/${name}`;
        if (!slug.startsWith("/")) {
            slug = `/${slug}`;
        }
        slugToFileinfo.set(slug, fileinfo);
    });

    const nav = createNav([...slugToFileinfo.keys()]);

    function renderToTemplate(filepath: string, title: string) {
        const content = converter.makeHtml(readFileSync(filepath, {encoding: "utf8"}));
        const html = template
            .replace(/%title%/g, title)
            .replace(/%content%/, content)
            .replace(/%nav%/, nav);
        return html;
    }

    const posts = [...slugToFileinfo.entries()].map(([slug, fileinfo]) => {
        const title = fileinfo.name;
        const filepath = fileinfo.filepath;
        const html = renderToTemplate(filepath, title);
        return {slug, title, html, filename: fileinfo.filename};
    })
    const startpage = {slug: "/", title: startTitle, html: renderToTemplate(startPage, startTitle)}
    return [startpage, ...posts]
}

