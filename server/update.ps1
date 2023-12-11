npm run build:release
aws lambda update-function-code --function-name arn:aws:lambda:eu-west-2:486070138579:function:test-ws-api --zip-file "fileb://$(Resolve-Path ./server.zip)" --profile amadare --region eu-west-2 --no-paginate
