PROD_ORG_ALIAS="streaming-prod"
TEMP_DIR="mdapi"

# Update DX config for prod
echo "Updating DX project config for production..."
node install-scripts/release-prod.js && \
echo "Done"
EXIT_CODE="$?"

# Check exit code
echo ""
if [ "$EXIT_CODE" != 0 ]; then
    echo "Installation failed."
    exit $EXIT_CODE
fi

# Deploy to prod org
echo "Deploying to production org..." && \
sfdx force:source:deploy -p src -u $PROD_ORG_ALIAS && \
echo "" && \

# Restoring DX config
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
