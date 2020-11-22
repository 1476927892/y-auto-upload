#!/usr/bin/env node
"use strict";
const fs = require("fs");
const Path = require("path");
const scp2 = require("scp2");
const Client = require("ssh2").Client;
const cwdPath = process.cwd(); //当前执行目录
const pathFile = Path.join(cwdPath, "./yau.json");
let YConfig = {
  backupCount: 3, //备份包数量
  path: "", //服务器路径
  projectName: "", //项目文件夹名称
  backupName: "", //备份目录名称
  buildDir: "", //打包之后要上传的目录 默认dist
};
//需要在项目根同级目录建立yau.json文件，然后git忽略这个文件{YConfig:{},server:{}}
let server = {
  host: "",
  port: "",
  username: "",
  password: "",
};
const conn = new Client();
fs.readFile(pathFile, "utf-8", function (err, data) {
  if (err) {
    console.log(err);
  } else {
    try {
      console.log("读取配置文件");
      let json = JSON.parse(data);
      server = json.server;
      YConfig = json.YConfig;
      YConfig.backupCount = YConfig.backupCount || 3;
      YConfig.buildDir = YConfig.buildDir || "dist";
      ssh2control();
    } catch (error) {
      console.log(error);
    }
  }
});

const ssh2control = function () {
  conn
    .on("ready", function () {
      conn.sftp(function (err, sftp) {
        if (err) {
          console.log("读取项目目录失败");
          conn.end();
        }
        // sftp.removeListener;
        sftp.readdir(YConfig.path, function (err, list) {
          if (err) {
            console.log("读取项目目录失败");
            conn.end();
          } else {
            console.log("读取项目目录完成");
          }
          let bfIndex = list.findIndex((d) => {
            return d.filename == "backups";
          });
          if (bfIndex == -1) {
            console.log("创建备份文件夹完成");
            sftp.mkdir(`${YConfig.path}/${YConfig.backupName}`);
          }
          backup.openBf(sftp);
        });
      });
    })
    .connect({
      host: server.host,
      username: server.username,
      password: server.password,
      port: server.port,
    });
};

//备份项目
const backup = {
  openBf(sftp) {
    const th = this;
    //读取备份目录
    sftp.readdir(`${YConfig.path}/${YConfig.backupName}`, function (err, list) {
      if (err) {
        console.log("读取备份目录失败");
        conn.end();
      }
      // console.log(list);
      let arr = list.filter((d) => {
        return d.filename.indexOf(YConfig.projectName) != -1;
      });
      let delFile = "";
      //倒叙
      arr = arr.sort((a, b) => {
        return b.attrs.atime - a.attrs.atime;
      });
      for (let i = 0; i < arr.length; i++) {
        let file = arr[i];
        if (i >= YConfig.backupCount - 1) {
          delFile += ` ${YConfig.path}/${YConfig.backupName}/${file.filename}`;
        }
      }
      if (delFile) {
        //删除文件
        conn.exec(`rm${delFile}`, function (err) {
          if (err) {
            console.log("删除备份文件出错");
            conn.end();
          } else {
            console.log("删除多余备份完成");
          }
          th._startBf();
        });
      } else {
        th._startBf();
      }
    });
  },
  _startBf() {
    console.log("开始备份");
    let date = new Date();
    let newFileName = `${YConfig.path}/${YConfig.backupName}/${
      YConfig.projectName
    }${date.toLocaleDateString()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.zip`;
    conn.exec(
      `zip -q -r ${newFileName} ${YConfig.path}/${YConfig.projectName}`,
      function (err, stream) {
        if (err) {
          console.log("备份失败");
        }
        stream
          .on("close", function () {
            console.log("备份完成");
            upload();
          })
          .on("data", function (data) {
            console.log(data);
          });
      }
    );
  },
};
const upload = function () {
  conn.exec(
    `rm -rf ${YConfig.path}/${YConfig.projectName}/*`,
    function (err, stream) {
      if (err) {
        console.log("清理项目文件失败！");
        conn.end();
      } else {
        console.log("清理项目文件完成");
      }
      console.log("正在上传,请不要关闭。。。");
      stream
        .on("close", function () {
          let files = "";
          if (typeof YConfig.buildDir == "string") {
            files = `./${YConfig.buildDir}/`;
          } else {
            YConfig.buildDir.forEach((d) => {
              if (files == "") {
                files = `./${d}`;
              } else {
                files += ` ./${d}`;
              }
            });
          }
          // `./${YConfig.buildDir}/`,
          scp2.scp(
            files,
            {
              host: server.host,
              username: server.username,
              password: server.password,
              port: server.port,
              path: `${YConfig.path}/${YConfig.projectName}`,
            },
            function (err) {
              if (err) {
                console.log("上传失败", err);
              } else {
                console.log("上传完成");
              }
              conn.end();
            }
          );
        })
        .on("data", function (data) {
          console.log("STDOUT: " + data);
        });
    }
  );
};
