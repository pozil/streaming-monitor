const fs = require('fs');

const DX_PROJECT_CONFIG_PATH = 'sfdx-project.json';

// Read DX project config
const projectConfigJson = fs.readFileSync(DX_PROJECT_CONFIG_PATH);
const projectConfig = JSON.parse(projectConfigJson);
// Set namespace for package
projectConfig.namespace = 'smon';
// Write DX project config
fs.unlinkSync(DX_PROJECT_CONFIG_PATH);
fs.writeFileSync(
    DX_PROJECT_CONFIG_PATH,
    JSON.stringify(projectConfig),
    (error) => {
        if (error) {
            throw error;
        }
    }
);
process.exit(0);
