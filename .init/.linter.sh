#!/bin/bash
cd /home/kavia/workspace/code-generation/conceptquest-learning-platform-231874-231885/web_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

