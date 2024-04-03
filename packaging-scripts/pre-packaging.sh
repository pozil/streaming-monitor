#!/bin/bash
SCRIPT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd $SCRIPT_PATH/..

PACKAGING_ORG_ALIAS="streaming-prod"
TEMP_DIR="mdapi"

echo "Adding namespace in DX project..." && \
sed -i '' -e 's,"namespace": "","namespace": "smon",' sfdx-project.json && \
echo "" && \

echo "Deploying to packaging org..." && \
sf project deploy start -d src -o $PACKAGING_ORG_ALIAS && \
echo "" && \

echo "Opening packaging org..." && \
sf org open -p lightning/setup/Package/0331t000000Po8N/view -o $PACKAGING_ORG_ALIAS && \
echo "" && \

echo "Restoring project config..." && \
git checkout -- sfdx-project.json
EXIT_CODE="$?"

# Check exit code
echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
    echo "Deployment completed."
else
    echo "Deployment failed."
fi
exit $EXIT_CODE
