#!/bin/bash

test=("set" "unset")
if [ -z $1 ] || [[ ! " ${test[@]} " =~ " ${1} " ]]
then
  echo "Usage: . eksrole.sh [set|unset]"
else
  case $1 in 
    set)
      echo "Assume role EKS"
			ROLE_ARN=arn:aws:iam::916049748016:role/CdkTemplateEksStack-eksClusterMastersRole6325E1D3-1I47G0YQKNZUI
			aws sts assume-role --role-arn $ROLE_ARN --role-session-name tirtawid | tee /tmp/temp.json
			
			export AWS_ACCESS_KEY_ID=$(jq -r .Credentials.AccessKeyId /tmp/temp.json)
			export AWS_SECRET_ACCESS_KEY=$(jq -r .Credentials.SecretAccessKey /tmp/temp.json)
			export AWS_SESSION_TOKEN=$(jq  -r .Credentials.SessionToken /tmp/temp.json)
			aws sts get-caller-identity
    ;;
    unset)
      echo "Unset variable AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN"
      unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
			aws sts get-caller-identity
  esac
fi

