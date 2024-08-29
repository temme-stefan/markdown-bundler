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

const createNav = (slugs:string[]):string=>{
    slugs.sort();
    const slugTree = pathesToFileTree(slugs);
    const folder=[];
    const htmlLines=["<ul>"]
    const createLink= (item:TNode)=>{
        folder.push(item.name);
        htmlLines.push(`<li><a href="${folder.join("/")}">${item.name}</a></li>`)
        folder.pop()
    }
    const startGroup= (item:TNode)=>{
        folder.push(item.name);
        htmlLines.push(`<li><details><summary>${item.name}</summary><ul>`)
    }

    const endGroup = (item:TNode)=>{
        htmlLines.push(`</ul></details></li>`);
        folder.pop()
    }
    const walkNode = (item:TNode)=>{
        if (item.children.size > 0){
            startGroup(item);
            item.children.forEach(child=>walkNode(child));
            endGroup(item);
        }
        else{
            createLink(item);
        }
    }
    htmlLines.push(`<li><a href="/">Start</a></li>`)
    folder.push("")
    slugTree.children.forEach(walkNode);
    htmlLines.push("</ul>");

    return htmlLines.join("\n");
}

export const getPosts = () => {
    const slugToFileinfo: Map<string,ReturnType<typeof getFiles>[0]> = new Map();
   getFiles().map((fileinfo) => {
       const {dir, name} = path.parse(fileinfo.filename);
       let slug = `${dir}/${name}`;
       if (!slug.startsWith("/")) {
           slug = `/${slug}`;
       }
       slugToFileinfo.set(slug, fileinfo);
   });

   const nav = createNav([...slugToFileinfo.keys()]);

   const posts = [...slugToFileinfo.entries()].map(([slug,fileinfo])=>{
        const title = fileinfo.name;
        const content = converter.makeHtml(readFileSync(fileinfo.filepath, {encoding: "utf8"}));
        const html = template
            .replace(/%title%/g, title)
            .replace(/%content%/, content)
            .replace(/%nav%/, nav);
        return {slug, title, html, filename: fileinfo.filename};
    })
    const startTitle = "Die Gezeichneten der Familie"
    const startpage = {slug:"/",title:startTitle,html:template
            .replace(/%title%/g, startTitle)
            .replace(/%content%/, "<p>Notizen und Gedanken zu unserer Gezeichnetenkampagne.</p>")
            .replace(/%nav%/, nav)}
    return [startpage,...posts]
}

