#!/usr/bin/env node
"use strict";
const fs = require("fs");
const Path = require("path");
const { cosmiconfig } = require("cosmiconfig");
const explorer = cosmiconfig("yau.json");
let configPath = "../../yau.json";
explorer
  .search()
  .then((result) => {
    // result.config is the parsed configuration object.
    // result.filepath is the path to the config file that was found.
    // result.isEmpty is true if there was nothing to parse in the config file.
    console.log(result);
  })
  .catch((error) => {
    // Do something constructive.
    console.log(error);
  });
// fs.readFile(pathFile, "utf-8", function (err, data) {
//   if (err) {
//     console.log(err, "读取服务器配置文件失败");
//   } else {
//     try {
//       console.log("读取配置文件");
//       let json = JSON.parse(data);
//       console.log(json);
//     } catch (error) {
//       console.log(err, "读取服务器配置文件失败");
//     }
//   }
// });
