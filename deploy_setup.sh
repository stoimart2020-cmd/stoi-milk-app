#!/bin/bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -N "" -q
cat ~/.ssh/github_deploy_key.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy_key
