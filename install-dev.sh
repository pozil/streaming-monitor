#!/bin/bash

# Set parameters
ORG_ALIAS="streaming"

echo ""
echo "Installing Streaming Monitor DEV org ($ORG_ALIAS)"
echo ""

# Install script
echo "Cleaning previous scratch org..."
sf org delete scratch -p -o $ORG_ALIAS &> /dev/null
echo ""

echo "Creating scratch org..." && \
sf org create scratch -f config/project-scratch-def.json -a $ORG_ALIAS -d -y 30 && \
echo "" && \

echo "Pushing source..." && \
sf project deploy start && \
echo "" && \

echo "Assigning permission sets..." && \
sf org assign permset -n Streaming_Monitor && \
echo "" && \

echo "Opening org..." && \
sf org open -p lightning/n/Streaming_Monitor && \
echo ""

EXIT_CODE="$?"
echo ""

# Check exit code
echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Installation completed."
else
    echo "Installation failed."
fi
exit $EXIT_CODE
