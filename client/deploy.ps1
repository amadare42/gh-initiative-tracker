$s3BucketName = "amadare-cloudfront-logs"
$s3DirName = "build"

function Step([string]$name) {
    $name = $name.Substring(0, [math]::min($name.Length, 40))

    $solidBlockChar = ([char]0x2588).ToString()
    $lineLen = 100
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
& aws s3 rm "s3://$s3BucketName/$s3DirName.old" --recursive --profile amadare --region eu-west-2; if(!$?) { throw }

Step "Move current client to old"
& aws s3 mv "s3://$s3BucketName/" "s3://$s3BucketName/$s3DirName.old" --recursive --profile amadare --region eu-west-2; if(!$?) { throw }

Step "Uploading client"
& aws s3 cp build "s3://$s3BucketName" --recursive --profile amadare --region eu-west-2; if(!$?) { throw }

Step "Done!"
