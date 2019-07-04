PROD_ORG_ALIAS="streaming-prod"
TEMP_DIR="mdapi"

rm -fr $TEMP_DIR
mkdir $TEMP_DIR
sfdx force:source:convert -r src -d $TEMP_DIR &&
sfdx force:mdapi:deploy -u $PROD_ORG_ALIAS -d $TEMP_DIR -w 10
rm -fr $TEMP_DIR