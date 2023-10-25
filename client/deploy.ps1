$s3BucketName = "turns.amadare.top"
$s3DirName = "build"
$awsProfile = "amadare"
$awsRegion = "eu-west-2"
$awsCloudFrontDistributionId = "EADQZHX6PHPZF"

function Step([string]$name) {
    $name = $name.Substring(0, [math]::min($name.Length, 40))

    $solidBlockChar = '-'
    $lineLen = 50
    $nameLen = $name.Length

    $leftLen = [math]::floor(($lineLen - $nameLen) / 2)
    $rightLen = $lineLen - $nameLen - $leftLen

    $left = $solidBlockChar * $leftLen
    $right = $solidBlockChar * $rightLen

    Write-Host "$left[ $name ]$right"
}

Step "Cleaning old build files"
& rm -r ./build/*; if(!$?) { throw }

Step "Building client"
& npm run build; if(!$?) { throw }

Step "Remove old client"
& aws s3 rm "s3://$s3BucketName/$s3DirName.old" --recursive --profile $awsProfile --region $awsRegion; if(!$?) { throw }

Step "Move current client to old"
& aws s3 mv "s3://$s3BucketName/" "s3://$s3BucketName/$s3DirName.old" --recursive --profile $awsProfile --region $awsRegion; if(!$?) { throw }

Step "Uploading client"
& aws s3 cp build "s3://$s3BucketName" --recursive --profile $awsProfile --region eu-west-2; if(!$?) { throw }

Step "Invalidate CloudFront cache"
$invalidationId = & aws cloudfront create-invalidation --distribution-id $awsCloudFrontDistributionId --paths "/*" --profile $awsProfile --region $awsRegion `
    | ConvertFrom-Json | Select-Object -ExpandProperty Invalidation | Select-Object -ExpandProperty Id; if(!$?) { throw }
Write-Host "Invalidation ID: $invalidationId"

Step "Waiting for invalidation to complete"
& aws cloudfront wait invalidation-completed --distribution-id $awsCloudFrontDistributionId --id $invalidationId --profile $awsProfile --region $awsRegion; if(!$?) { throw }


Step "Done!"
