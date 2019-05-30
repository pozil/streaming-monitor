#!/bin/bash

# Set parameters
ORG_ALIAS="streaming-dev"
SERVER_ACTION_SERVICE_PACKAGE_ID="04t1t0000011vSv" # v1.7

echo ""
echo "Installing Streaming Monitor:"
echo "- Org alias:      $ORG_ALIAS"
echo ""

# Install script
echo "Cleaning previous scratch org..."
sfdx force:org:delete -p -u $ORG_ALIAS &> /dev/null
echo ""

echo "Creating scratch org..." && \
sfdx force:org:create -s -f config/project-scratch-def.json -a $ORG_ALIAS -d 30 && \
echo "" && \

echo "Installing server action service dependency..." && \
sfdx force:package:install --package $SERVER_ACTION_SERVICE_PACKAGE_ID -w 10 -u $ORG_ALIAS && \
echo "" && \

echo "Pushing source..." && \
sfdx force:source:push -u $ORG_ALIAS && \
echo "" && \

echo "Assigning permission sets..." && \
sfdx force:user:permset:assign -n Streaming_Monitor -u $ORG_ALIAS && \
echo "" && \

echo "Opening org..." && \
sfdx force:org:open -p lightning/n/smon__Streaming_Monitor -u $ORG_ALIAS && \
echo ""

EXIT_CODE="$?"

# Check exit code
echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Installation completed."
else
    echo "Installation failed."
fi
exit $EXIT_CODE
