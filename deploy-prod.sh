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
rm -fr $TEMP_DIR
mkdir $TEMP_DIR && \
echo "Deployed to production org" && \
sfdx force:source:convert -r src -d $TEMP_DIR && \
sfdx force:mdapi:deploy -u $PROD_ORG_ALIAS -d $TEMP_DIR -w 10 && \
rm -fr $TEMP_DIR && \
echo "Deployed to production org" && \

# Revert prod DX config
echo "Cleaning project..." && \
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
