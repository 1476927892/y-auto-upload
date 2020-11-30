#!/usr/bin/env node
"use strict";
const fs = require("fs");
const Path = require("path");
const scp2 = require("scp2");
const Client = require("ssh2").Client;
const cwdPath = process.cwd(); //当前执行目录
const pathFile = Path.join(cwdPath, "../yau.json");
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
let execList = {}; //完成之后需要执行的命令
let sftp_online = null;
const conn = new Client();
fs.readFile(pathFile, "utf-8", function (err, data) {
  if (err) {
    throw new Error("读取配置文件失败");
  } else {
    try {
      console.log("读取配置文件");
      let json = JSON.parse(data);
      const curProConf = json[process.env.NODE_ENV]; //读取当前项目配置
      server = curProConf.server || json.server;
      YConfig = curProConf.YConfig;
      execList = curProConf.exec || {};
      YConfig.backupCount = YConfig.backupCount || 3;
      YConfig.buildDir = YConfig.buildDir || "dist";
      ssh2control();
    } catch (error) {
      throw new Error("读取配置文件失败");
    }
  }
});

const ssh2control = function () {
  conn
    .on("ready", function () {
      conn.sftp(function (err, sftp) {
        if (err) {
          conn.end();
          throw new Error("读取备份目录失败");
        }
        // sftp.removeListener;
        sftp_online = sftp;
        sftp.readdir(YConfig.path, function (err, list) {
          if (err) {
            conn.end();
            throw new Error("读取备份目录失败");
          } else {
            console.log("读取备份目录完成");
          }
          let bfIndex = list.findIndex((d) => {
            return d.filename == "backups";
          });
          if (bfIndex == -1) {
            console.log("创建备份文件夹完成");
            sftp.mkdir(`${YConfig.path}/${YConfig.backupName}`);
          }
          setTimeout(() => {
            backup.openBf();
          }, 100);
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
  openBf() {
    const th = this;
    //读取备份目录
    sftp_online.readdir(
      `${YConfig.path}/${YConfig.backupName}`,
      function (err, list) {
        if (err) {
          conn.end();
          throw new Error("读取备份目录失败");
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
              conn.end();
              throw new Error("删除备份文件出错");
            } else {
              console.log("删除多余备份完成");
            }
            th._startBf();
          });
        } else {
          th._startBf();
        }
      }
    );
  },
  _startBf() {
    console.log("开始备份");
    let date = new Date();
    let newFileName = `${YConfig.path}/${YConfig.backupName}/${
      YConfig.projectName
    }${date.toLocaleDateString()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.tar.gz`;
    // ` zip -q -r ${newFileName}  ${YConfig.path}/${YConfig.projectName}`,
    conn.exec(
      `tar czvf ${newFileName} ${YConfig.path}/${YConfig.projectName}`,
      function (err, stream) {
        if (err) {
          conn.end();
          throw new Error("备份失败");
        }
        stream
          .on("close", function () {
            console.log("备份完成");
            setTimeout(() => {
              upload();
            }, 2000);
          })
          .on("data", function (data) {
            console.log(data);
          });
      }
    );
  },
};
const upload = function () {
  exec_custom(execList.upload_before, "upload_before").then(() => {
    fn();
  });
  const fn = () => {
    conn.exec(
      `rm -rf ${YConfig.path}/${YConfig.projectName}/*`,
      function (err, stream) {
        if (err) {
          conn.end();
          throw new Error("清理项目文件失败！");
        } else {
          console.log("清理项目文件完成");
        }
        console.log("正在上传,请不要关闭。。。");
        stream
          .on("close", function () {
            // `./${YConfig.buildDir}/`,

            //循环判断是否需要创建文件夹，并去除重复文件夹
            const needDir = [];
            YConfig.buildDir.forEach((d) => {
              if (d.online) {
                const index = needDir.findIndex((d2) => {
                  return d2 == d.online;
                });
                if (index == -1) {
                  needDir.push(d.online);
                  sftp_online.mkdir(
                    `${YConfig.path}/${YConfig.projectName}/${d.online}`
                  );
                }
              }
            });
            let index = 0;
            setTimeout(() => {
              uploadFile_fn();
            }, 1000);
            //上传文件
            const uploadFile_fn = () => {
              const dir = YConfig.buildDir[index];
              let onlinePath = "";
              if (dir.online) {
                onlinePath = `${YConfig.path}/${YConfig.projectName}/${dir.online}`;
              } else {
                onlinePath = `${YConfig.path}/${YConfig.projectName}`;
              }
              scp2.scp(
                `./${dir.local}`,
                {
                  host: server.host,
                  username: server.username,
                  password: server.password,
                  port: server.port,
                  path: onlinePath,
                },
                function (err) {
                  if (err) {
                    conn.end();
                    throw new Error("上传失败" + err);
                  } else {
                    if (index == YConfig.buildDir.length - 1) {
                      console.log("上传完成");
                      exec_custom(execList.done, "done").then(() => {
                        conn.end();
                      });
                    } else {
                      index++;
                      uploadFile_fn();
                    }
                  }
                }
              );
            };
          })
          .on("data", function (data) {
            console.log("STDOUT: " + data);
          });
      }
    );
  };
};
//完成之后执行的自定义命令
const exec_custom = function (execs, text) {
  return new Promise(function (resolve, reject) {
    //为空直接停止
    if (execs.length == 0) {
      resolve();
    } else {
      conn.exec(execs.join("&&"), function (err, stream) {
        if (err) {
          reject();
          conn.end();
          throw new Error(text + "：命令执行失败");
        }
        console.log(text + "：开始执行，请稍后");
        stream
          .on("close", function () {
            console.log(text + "：命令执行完成");
            setTimeout(() => {
              resolve();
            }, 2000);
          })
          .on("data", function (data) {
            console.log(data);
          });
      });
    }
  });
};
