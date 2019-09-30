const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

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
    res.json(res.files);
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
                res.files = videoFiles;
            }
            next();
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