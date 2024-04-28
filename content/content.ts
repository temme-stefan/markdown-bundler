import {statSync,readFileSync}  from 'fs';
import * as path from 'path';
import {globSync}  from 'glob';
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
export const getFiles = ()=>fileInfos;

const converter = new Converter({
    tables: true,
    moreStyling:true,
    metadata: true,
    completeHTMLDocument:true
});

const fakeMeta={title:"",lang:"de"}
converter.listen("completeHTMLDocument.before",(evtName, text, converter, options, globals)=>{
    globals.metadata.parsed={...globals.metadata.parsed,...fakeMeta};
    return `<h1>${fakeMeta.title}</h1>\n${text}`;
});
export const getPosts = ()=>fileInfos.map((fileinfo)=>{
    const {dir,name} = path.parse(fileinfo.filename);
    const slug = `${dir}/${name}`;
    const title = fileinfo.name;
    fakeMeta.title = title;
    const html = converter.makeHtml(readFileSync(fileinfo.filepath,{encoding:"utf8"}));

    return {slug, title, html,filename:fileinfo.filename};
})

