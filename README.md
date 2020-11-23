# y-auto-upload

```
项目打包之后自动上传到服务器目录，并备份
```

## 安装

```
npm install y-auto-upload -D
```

## 配置

```
在项目父级目录创建 yau.json
{
  "server": {
    "host": "", //服务器ip
    "port": "", //服务器端口
    "username": "", //登录用户
    "password": "" //密码
  },
  //每个项目的名字（注意要和启动命令传入参数一致）
  "projectName":{
       //配置此项之后将覆盖外层配置服务
      "server": {
        "host": "", //服务器ip
        "port": "", //服务器端口
        "username": "", //登录用户
        "password": "" //密码
      },
      "YConfig": {
          "backupCount":3, //最大备份包数
          "path": "", //服务器目录  /usr/local/nginx/html
          "projectName": "",  //服务器存放项目的文件夹
          "backupName": "",  //备份文件夹
          "buildDir": [{local:"dist",online:"projectName"}], //需要上传的文件夹,或文件夹 local：本地目录，online：线上目录（不传默认为projectName）
        },
        //自定义命令
        "exec": {
          "upload_before": ["cd /root"], //上传文件之前执行
          "done": [] ,//最后执行
        }
  }
}

```

## 使用

```
package.json

 "scripts": {
    "start": "cross-env NODE_ENV=projectName node ./lib/index.js"
  },
```
