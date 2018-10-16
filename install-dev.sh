#!/bin/bash

# Set parameters
ORG_ALIAS="streaming"
SERVER_ACTION_SERVICE_PACKAGE_ID="04t1t000000XfCt" # v1.6

echo ""
echo "Installing Streaming Monitor:"
echo "- Org alias:      $ORG_ALIAS"
echo ""

# Install script
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
sfdx force:user:permset:assign -n Streaming_Monitor -u $ORG_ALIAS
EXIT_CODE="$?"

# Check exit code
echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Installation completed."
else
    echo "Installation failed."
fi
exit $EXIT_CODE
