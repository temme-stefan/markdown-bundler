import * as path from 'path';
import {emptyDir, ensureDir, outputFile} from 'fs-extra';
import { getPosts} from "./content/content";

const buildpath = "build";

async function emptyBuildFolder() {
    try {
        await ensureDir(buildpath);
        await emptyDir(buildpath);
    } catch (error) {
        console.log(error);
    }
}

emptyBuildFolder().then(async () => {
    const posts = getPosts();
    const replacements = new Map(posts.map(({slug,filename})=>[encodeURI(filename),encodeURI(slug)]));
    const reg = new RegExp(`(${[...replacements.keys()].join("|")})`,"g")
    const fixLinks = (html:string)=>html.replace(reg,(found)=>replacements.get(found) ??found);
    await Promise.all(posts.map(async post => {
        const p = path.join(buildpath, post.slug, "index.html");
        await outputFile(p, fixLinks(post.html));
    }))
    console.log("done");
});


