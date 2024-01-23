// converts a BallotReady export JSON file into a Origin Data Source for the XPOC browser extension
// Usage: node convert.js <dbPath> <logoPath> [<outputPath>]

const fs = require('fs');

const log = (...args) => { 
    // uncomment to enable logging
    //console.log(...args);
} 

const platformFilter = (platform) => {
    if (platform === "Twitter") return "X";
    else return platform;
}

// read an image file, and encode it as a base64 data URL format
function convertImage(path) {
    const imageBuffer = fs.readFileSync(path);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    return dataUrl;
}

const getCanonicalContact = {
    'Website': (url) => { 
        // string out the protocol and trailing slash, and lowercase
        return url.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '').toLowerCase();
    },

    'Instagram': (url) => { 
        // remove url scheme (http(s)://)
        url = url.replace(/(^\w+:|^)\/\//, '');
        // remove query params and anchor
        if (url.includes('?') || url.includes('#')) {
            console.log("Instagram account URL contains query parameters or an anchor:", url);
        }
        url = url.split('?')[0].split('#')[0];
        // remove trailing slash, and only keep path after instagram.com/
        let path = url.replace(/\/$/, '').split('/').slice(1).join('/');
        if (path.split('/').length > 1) {
            console.log("Non-standard Instagram account URL:", url);
            return '';
        }
        // only keep the username
        return path.split('/').pop();
     },

     'X': (url) => { 
        // ballotpedia only stores the account name; simply return the input value
        return url;
    },

    'YouTube': (url) => {
        // remove trailing slash, and only keep what's after youtube.com/ (channel or user)
        const parts = url.replace(/\/$/, '').split('/');
        if (parts[parts.length - 2] === 'channel') {
            return parts[parts.length - 2] + '/' + parts[parts.length - 1];
        } else {
            return parts.pop();
        }
    },

    'LinkedIn': (url) => {
        if (!url.includes('/in/') && !url.includes('/pub/') && !url.includes('/company/')) {
            console.log("Unrecognized LinkedIn account URL:", url);
        }
        // remove url scheme (http(s)://)
        url = url.replace(/(^\w+:|^)\/\//, '');
        // remove trailing slash, and only keep path after linkedin.com/
        let path = url.replace(/\/$/, '').split('/').slice(1).join('/');
        if (path.includes('about')) {
            log("LinkedIn about path:", path);
        }
        // remove anything past the username (remove query params and trailing slash)
        path = path.split('?')[0].replace(/\/$/, '');
        // remove trailing '/about' if it exists
        path = path.replace(/\/about$/, '');
        if (path.split('/').length > 2) {
            console.log("Non-standard LinkedIn account URL:", url);
            return '';
        }
        return path;
    },

    'Facebook': (url) => { 
        // remove url scheme (http(s)://)
        url = url.replace(/(^\w+:|^)\/\//, '');
        // remove trailing slash, and only keep path after facebook.com/
        let path = url.replace(/\/$/, '').split('/').slice(1).join('/');
        if (path.startsWith('profile.php?id=')) {
            // we have a profile.php?id=<id> url; remove anything past the id (we assume id is the first query param)
            const pathParts = path.split('&');
            if (pathParts.length > 1) {
                console.log("Facebook profile.php URL contains too many query parameters (only need 'id')", url);
            }
            const profilePath = pathParts[0];
            log("Facebook profile path:", profilePath);
            return profilePath;
        }
        if (path.startsWith('people/')) {
            // we have a people/<username>/<id> url; remove anything past the username
            const peoplePathParts = path.split('/');
            let peoplePath = peoplePathParts[0] + '/' + peoplePathParts[1] + '/' + peoplePathParts[2];
            // remove anything past the id
            if (peoplePath.includes('?') || peoplePath.includes('#')) {
                console.log("Facebook people/ URL contains query parameters or an anchor:", url);
            }
            peoplePath = peoplePath.split('?')[0].split('#')[0];
            log("Facebook people path:", peoplePath);
            return peoplePath;
        }
        if (path.startsWith('p/')) {
            // we have a p/<username> url; remove anything past the username
            if (path.includes('?') || path.includes('#')) {
                console.log("Facebook p/ URL contains query parameters or an anchor:", url);
            }
            path.split('?')[0].split('#')[0].replace(/\/$/, '');
            log("Facebook p path:", path);
            return path;
        }
        // if we get here, we assume we have a standard account URL (e.g. <username>)
        // remove anything past the username (remove query params and trailing slash)
        path = path.split('?')[0].replace(/\/$/, '');
        // remove trailing '/about' if it exists
        path = path.replace(/\/about$/, '');
        if (path.includes('?') || path.includes('/')) {
            console.log("Unrecognized Facebook URL", url);
            return '';
        }
        return path;
     }
}

// Function to read JSON file and process data
const processData = (filePath) => {
    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }

        const elements = JSON.parse(data);

        const entry = [];
        const nameToIndexMap = {};
        const contactTables = {
            'Website': {},
            'Instagram': {},
            'X': {},
            'YouTube': {},
            'LinkedIn': {},
            'Facebook': {}
        };

        elements.forEach(element => {
            const name = element['Ballotpedia URL'].split('/').pop();
            log("Name:", name);

            // Check if name is already in the map
            if (!(name in nameToIndexMap)) {
                // If not, add name to array and map
                entry.push(name);
                nameToIndexMap[name] = entry.length - 1;
                log("Added to map:", name);
            }

            // Get the index from the map
            const nameIndex = nameToIndexMap[name];
            
            // Add contact to the corresponding table
            const platform = platformFilter(element.contact_type);
            if (platform in contactTables) {
                const contact = getCanonicalContact[platform](element.contact);
                if (contact) {
                    log("Adding contact:", contact, "to table:", platform);
                    contactTables[platform][contact] = nameIndex;
                } else {
                    log("Skipping contact:", element.contact, "for table:", platform);
                }
            } else {
                console.log("Error: Contact type not found:", name, platform);
            }
        });

        console.log("ballotpedia_entry size:", entry.length);
        // print how many entries are in each table
        console.log("Website entries count:", Object.keys(contactTables['Website']).length);
        console.log("Instagram entries count:", Object.keys(contactTables['Instagram']).length);
        console.log("Twitter entries count:", Object.keys(contactTables['X']).length);
        console.log("YouTube entries count:", Object.keys(contactTables['YouTube']).length);
        console.log("LinkedIn entries count:", Object.keys(contactTables['LinkedIn']).length);
        console.log("Facebook entries count:", Object.keys(contactTables['Facebook']).length);
    
        // prepare the logo
        

        const outputData = {
            source: {
                name: "Ballotpedia",
                logo: base64EncodedLogo,
                website: "https://www.ballotpedia.org",
                supportedPlatforms: ["Instagram", "Facebook", "X", "LinkedIn", "YouTube"]
            },
            entry: entry,
            contactTables
        };

        // Write the data to a JSON file
        fs.writeFile(outFilePath, JSON.stringify(outputData, null, 2), (err) => {
            if (err) {
                console.error("Error writing file:", err);
                return;
            }
            console.log(`Data successfully written to ${outFilePath}`);
        });
    
    });
};

// Get the file path from command line arguments
const dbPath = process.argv[2];
const logoPath = process.argv[3];
const outFilePath = process.argv[4] || 'ballotpedia.json';

// Validate filePath
if (!dbPath || !logoPath) {
    console.error("Usage: node convert.js <dbPath> <logoPath> [<outputPath>]");
    process.exit(1);
}

const base64EncodedLogo = convertImage(logoPath);

processData(dbPath);
