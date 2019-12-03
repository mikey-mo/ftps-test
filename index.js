require('dotenv').config();
const Client = require('ssh2').Client;
const fs = require('fs');
const conn = new Client();

let DEFAULT_CHECK_TIME;

DEFAULT_CHECK_TIME = process.env.CHECK_TIME;

const settings = {
    host: process.env.FTPS_HOST,
    port: process.env.FTPS_PORT,
    username: process.env.FTPS_USERNAME,
    password: process.env.FTPS_PASSWORD,
};

const getUnixTimestamp = () => Math.floor(new Date().getTime() / 1000)

const filterForCorrectFile= (files, filename) => files.filter(file => file.filename === filename)[0];

const checkIfNewerTimestamp = (newTime, oldTime) => {
    console.log(newTime, oldTime);
    return newTime > oldTime;
}

const updateRemoteFile = (sftp) => {
    const readStream = fs.createReadStream('./test-files/FAN_DATA.csv');
    const writeStream = sftp.createWriteStream('/FAN_DATA.csv');
    writeStream.on('close', () => {
        console.log('file transfer to remote successful');
    });
    readStream.on('end', () => {
        console.log('read stream successful');
    });
    readStream.pipe( writeStream );
}

const remoteFileNotUpdated = () => {
    console.log('file was not updated');
};

const remoteFileUpdated = (sftp) => {
    sftp.fastGet('/FAN_DATA.csv', './test-files/FAN_DATA.csv', {}, (err) => {
        if (err) throw err;
        console.log('successfully updated local file');
        DEFAULT_CHECK_TIME = getUnixTimestamp();
    });
}

const readRemoteFile = (sftp) => {
    sftp.readdir('/', (err, list) => {
        if (err) throw err;
        try {
            const file = filterForCorrectFile(list, 'FAN_DATA.csv');
            if (checkIfNewerTimestamp(file.attrs.mtime, DEFAULT_CHECK_TIME)) remoteFileUpdated(sftp);
            else remoteFileNotUpdated();
        } catch (e) {
            console.log('error:', e);
        }
    });
}

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;

        setInterval(() => {
            readRemoteFile(sftp);
        }, 5000);

        // updateRemoteFile(sftp);
    })
}).connect(settings);
