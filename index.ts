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

emptyBuildFolder().then(async () => {
    const posts = getPosts();
    await Promise.all([...posts.map(async post => {
        const p = path.join(buildpath, post.slug, "index.html");
        console.log("Creating", post.slug)
        await outputFile(p, post.html);
    }), addRobots(), addStyles()])
    console.log("done");
});


