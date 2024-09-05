import * as path from 'path';
import {copy, emptyDir, ensureDir, outputFile} from 'fs-extra';
import {getPosts} from "./content/content";

const buildpath = "build";

async function emptyBuildFolder() {
    try {
        await ensureDir(buildpath);
        await emptyDir(buildpath);
    } catch (error) {
        console.log(error);
    }
}

async function addRobots() {
    const p = path.join(buildpath, "robots.txt");
    await outputFile(p, `
User-Agent: *
Disallow: /`);
}

async function addStyles() {
    await copy("style", path.join(buildpath, "style"));
}

async function addAPCalculator(){
    await copy("./APCalculator/APCalculator.js",path.join(buildpath,"Tools/AP Rechner/APCalculator.js"));
    await copy("./APCalculator/script.js",path.join(buildpath,"Tools/AP Rechner/script.js"));
    await copy("./APCalculator/form.css",path.join(buildpath,"Tools/AP Rechner/form.css"));
}
emptyBuildFolder().then(async () => {
    const posts = getPosts();
    await Promise.all([...posts.map(async post => {
        const p = path.join(buildpath, post.slug, "index.html");
        console.log("Creating", post.slug)
        await outputFile(p, post.html);
    }), addRobots(), addStyles(),addAPCalculator()])
    console.log("done");
});


