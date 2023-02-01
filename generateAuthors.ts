#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net
import { stringify, parse } from "https://deno.land/std@0.175.0/encoding/yaml.ts";
import { parse as flagParse } from "https://deno.land/std@0.175.0/flags/mod.ts";

interface CategoryInfo {
  name: string;
  wallpapers: Wallpaper[];
}

interface Wallpaper {
  author_name: string;
  author_url: string;
  source_url?: string;
  image_url: string;
  modified: boolean;
}
const wallpapers: Array<{wallpaper: Wallpaper, dir: string}> = [];

const args = flagParse(Deno.args)
const _prFiles = await fetch(`https://api.github.com/repos/${args.base}/pulls/${args.num}/files`)
const prFiles = await _prFiles.json()

for (const file of prFiles.filter(file => file.status === "added")) {
    const wallpaper = {
        author_name: args.name,
        author_url: args.authorurl ?? `https://github.com/${args.name}`,
        source_url: args.source ?? null,
        image_url: args.image ?? file.filename.split("/").slice(-1)[0],
        modified: args.modified ?? false,
    } as Wallpaper;
    wallpapers.push({
        wallpaper,
        dir: file.filename.split('/')[0]
    })
}

const prDirs = prFiles.map(file => file.filename.split('/')[0]).filter((e: string, i: number, a: string[]) => a.indexOf(e) === i)
for await (const dir of prDirs) {
    let content: CategoryInfo;

    try {
      content = parse(await Deno.readTextFile(`./${dir}/.authors.yml`)) as CategoryInfo;
    } catch (_) {
      console.warn(`No README.md found in ${dir}`);
      continue;
    }

    const currentDirWalls = wallpapers.filter(wallpaper => wallpaper.dir === dir);
    for (const wallpaper of currentDirWalls) {
        content.wallpapers.push(wallpaper.wallpaper)
    }

    await Deno.writeTextFile(`${dir}/.authors.yml`, stringify(content));
    console.log(`Generated .authors.yml for ${dir}`);
}
