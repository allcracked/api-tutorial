const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fetch = require('node-fetch');

const credentials = require('../../credentials.json');

const scopes = [
    'https://www.googleapis.com/auth/drive'
];
const auth = new google.auth.JWT(
    credentials.client_email, null,
    credentials.private_key, scopes
);
const drive = google.drive({version: 'v3', auth});

router.get('/', getFiles, async (req, res) => {
});

router.get('/:show/:season/:episode', async (req, res) => {
    // Checking if the right parameters have been added to the query
    if (req.params.show != null && req.params.season != null && req.params.episode != null) {
        // Defining the data that should be returned from the list
        const listOptions = {
            fields: 'files(id, name, mimeType, webContentLink, webViewLink, hasThumbnail, thumbnailLink, fullFileExtension, size, videoMediaMetadata)',
            supportsAllDrives: true,
            includeItemsFromAllDrives : true,
            driveId: '0ACUjyAk9Y3esUk9PVA',
            corpora: 'drive',
        };
        // Creating the query string for the file name
        const searchFor = req.params.show+req.params.season+'x'+req.params.episode+'.mp4'
    
        try {
            await drive.files.list(listOptions, async (err, mainRes) => {
                // Checking if there was an error while executing the list function
                if (err) {
                    res.status(500).json({error: err});
                } else {
                    const files = await mainRes.data.files;
                    // Filtering results with the file name specified in the query
                    const foundFile = Object.values(files).filter(file => {
                        return file.name == searchFor;
                    });

                    // Check if something was found while filtering the response
                    if (foundFile.length > 0) {
                        // Getting the access_token to authorize the downloadURL
                        const access_token = await getUserToken();
                        // Selecting the first file found and this is the one that will be returned
                        let returningFile = foundFile[0];
                        // Adding the downloadURL to the file object
                        returningFile.downloadURL = `https://www.googleapis.com/drive/v3/files/${returningFile.id}?alt=media&mimeType=${returningFile.mimeType}&access_token=${access_token}`;

                        try {
                            // Getting show data from the OMB API
                            let showData = await fetch('http://www.omdbapi.com/?apikey='+process.env.OMDBAPI+'&t='+req.params.show+'&Season='+req.params.season+'&Episode='+req.params.episode+'&type=series');
                            let responseData = await showData.json();
                            returningFile.showData = responseData;
                            // Returning the file object as JSON
                            res.json(returningFile);
                        } catch (error) {
                            res.status(500).json({error: 'Error while trying to get show data.'});
                        }
                    } else {
                        res.status(404).json({error: 'Did not find video file.'});
                    }
                }
            });
        } catch (error) {
            res.status(500).json({error: error});
        }
    } else {
        res.status(500).json({error: 'Did not receive the correct params.'});
    }
});

router.get('/:fileId', async (req, res) => {
    if (req.params.fileId != null) {
        const listOptions = {
            fields: 'id, name, mimeType, webContentLink, webViewLink, hasThumbnail, thumbnailLink, fullFileExtension, size, videoMediaMetadata',
            fileId: req.params.fileId,
            supportsTeamDrives: true,
            supportsAllDrives: true
        };

        try {
            await drive.files.get(listOptions, async (error, apiRes) => {
                if (error) {
                    res.status(500).json({error: error.message});
                } else {
                    const access_token = await getUserToken();
                    const file = await apiRes.data;
                    file.downloadURL = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&mimeType=${file.mimeType}&access_token=${access_token}`

                    res.json(file);
                }
            });
        } catch (error) {
            res.status(500).json({error: error.message});
        }
    } else {
        res.status(500).json({error: 'No file ID was shared.'});
    }
});

async function getFiles(req, res, next) {

    const listOptions = {
        fields: 'files(id, name, mimeType, webContentLink, webViewLink, hasThumbnail, thumbnailLink, fullFileExtension, size, videoMediaMetadata)',
        supportsAllDrives: true,
        includeItemsFromAllDrives : true,
        driveId: '0ACUjyAk9Y3esUk9PVA',
        corpora: 'drive',
    };

    try {
        await drive.files.list( listOptions , async (err, mainRes) => {
            if (err) {
                res.status(500).json({error: err});
            } else {
                const access_token = await getUserToken();
                const files = await mainRes.data.files;
                const videoFiles = Object.values(files).filter(file => {
                    if (file.mimeType.indexOf('video') != -1) {
                        file.downloadURL = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&mimeType=${file.mimeType}&access_token=${access_token}`
                    }
                    return file.mimeType.indexOf('video') != -1;
                });

                let dataPromises = new Array();
                
                        Object.values(files).map (async file => {
                            if (file.mimeType.indexOf('video') != -1) {
                                dataPromises.push(new Promise(
                                    async resolve => {
                                        const showInfo = file.name.substr(0, file.name.indexOf('.')).split('-')
                                        file.downloadURL = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&mimeType=${file.mimeType}&access_token=${access_token}`;
                                        
                                        let responseData;
                                        try {
                                            let showData = await fetch('http://www.omdbapi.com/?apikey='+process.env.OMDBAPI+'&t='+showInfo[0]+'&Season='+showInfo[1]+'&Episode='+showInfo[2]+'&type=series');
                                            responseData = await showData.json();
                                        } catch (error) {
                                            responseData = {data: 'No info found'};
                                        }
                                        
                                        file.showData = responseData;

                                        resolve(file);
                                    })
                                );
                            };
                        });

                Promise.all(dataPromises)
                    .then(values => {
                        res.json(values);
                    });

                next();
            }
        });
    } catch (error) {
        res.status(500).json({error: error});
        next();
    }
}

async function getUserToken() {
    const authorization = await auth.authorize();
    return authorization.access_token;
}

module.exports = router;