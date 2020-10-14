
# Garry's Mod Addon Tool | GMAT
![Version](https://img.shields.io/github/package-json/v/Leeous/gmod-addon-tool?style=flat-square)
![Build](https://img.shields.io/github/workflow/status/Leeous/gmod-addon-tool/Build?style=flat-square)
![Downloads](https://img.shields.io/github/downloads/Leeous/gmod-addon-tool/total?style=flat-square)
![CommitsSinceRelease](https://img.shields.io/github/commits-since/Leeous/gmod-addon-tool/latest?style=flat-square)
[![](https://img.shields.io/badge/Donate-%243-orange?style=flat-square)](https://www.buymeacoffee.com/Leeous)

  

A light-weight Electron GUI for `gmad` and `gmpublish` that allows you to create/update/extract Garry's Mod addons very easily.

As of `v2.0`, you can upload and update your addons, as well as extract GMA files.

![](https://i.imgur.com/UYD6q0x.png)

## Instructions

Download a [release](https://github.com/Leeous/gmod-addon-tool/releases) and run `gmod-addon-tool.exe`.
  
### Troubleshooting

Make sure you [follow the wiki's directions](https://wiki.garrysmod.com/page/Workshop_Addon_Creation) to the _letter_.

Common mistakes you should be aware of,
* your addon icon not being a baseline JPG will cause your upload to fail, which can usually be fixed by exporting your icon in Paint (Windows), Gimp, or Photoshop.

* having an unallowed file (or an incorrect folder structure) in your addon's directory will cause your upload to fail, [here's a list](https://github.com/Facepunch/gmad/blob/master/include/AddonWhiteList.h) of allowed files which should also give you an idea of where to place things

* not being logged into Steam will obviously cause uploads to fail

* you **must** have Garry's Mod installed to use this tool, since it utilizes `gmad.exe` and `gmpublish.exe` which can be found in `/GarrysMod/bin/` 

Otherwise, [create an issue](https://github.com/Leeous/gmod-addon-tool/issues/new) or send me a tweet/DM.

### Social

[@LeeTheCoder](https://twitter.com/LeeTheCoder)

[Leeous.com](https://leeous.com)