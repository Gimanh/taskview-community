source secret.sh;
# this is old script for uploading to the server

npm run build
rsync -vrP ./dist/* $USER@$SERVER_IP:/home/user_tmp/taskview-web-app