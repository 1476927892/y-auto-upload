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
在项目根目录创建 yau.json
由于配置了服务器信息，建议git提交忽略此文件
{
  "server": {
    "host": "",
    "port": "",
    "username": "",
    "password": ""
  },
  "address": {
    "backupCount":3, //最大备份包数
    "path": "", //服务器目录  /usr/local/nginx/html
    "projectName": "",  //服务器存放项目的文件夹
    "backupName": ""  //备份文件夹
  }
}

```

## 使用

```
package.json

  "scripts": {
    "build:yau": "npm run build && yau",
  }
```
