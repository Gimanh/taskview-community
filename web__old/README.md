## Build 
- `npm run build` - build project
- `npx cap open ios` |  `npx cap open android` - open project
- `npx cap sync` -  sync data with `XCode`

## Update web version
- `bash build-upload.sh` - will build and upload dist to the server
- connect to the server via `ssh`
- `cp -r /home/user_tmp/taskview-web-app/* /taskview/app/web/` - copy `dis` from `/home/user_tmp/taskview-web-app` to `taskview`


## Hot update mobile version
- `bash add-update.sh` | `bash add-update.sh prod` - command by default creates `dev` branch mode, for prod version you have to call second version
- when we run container we also mount `- /home/user_tmp/taskview-updates:/usr/src/app/updates`. Module which is responsible 
  for updates will use this build