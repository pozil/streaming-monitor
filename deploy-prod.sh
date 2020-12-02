PROD_ORG_ALIAS="streaming-prod"
TEMP_DIR="mdapi"

echo "Add namespace in DX project..."
sed -i '' -e 's,"namespace": "","namespace": "smon",' sfdx-project.json
echo "Done"

echo "Deploying to production org..." && \
sfdx force:source:deploy -p src -u $PROD_ORG_ALIAS && \
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
