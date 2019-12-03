require('dotenv').config();
const Client = require('ssh2').Client;
const fs = require('fs');
const conn = new Client();

const settings = {
    host: process.env.FTPS_HOST,
    port: process.env.FTPS_PORT,
    username: process.env.FTPS_USERNAME,
    password: process.env.FTPS_PASSWORD,
};

const filterForCorrectFile= (files, filename) => files.filter(file => file.filename === filename)[0];

const checkIfNewerTimestamp = (newTime, oldTime) => newTime > oldTime;

const updateRemoteFile = (sftp) => {
    const readStream = fs.createReadStream('../test-files/test.csv');
    const writeStream = sftp.createWriteStream('/test.csv');
    writeStream.on('close', () => {
        console.log('file transfer successful');
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
    sftp.fastGet('/test-two.txt', './test-two.txt', {}, (err) => {
        if (err) throw err;
        console.log('successfully downloaded file');
    });
}

const readRemoteFile = (sftp) => {
    sftp.readdir('/', (err, list) => {
        if (err) throw err;
        const file = filterForCorrectFile(list, 'test-two.txt');
        if (checkIfNewerTimestamp(process.env.CHECK_TIME, file.attrs.mtime)) remoteFileUpdated(sftp);
        else remoteFileNotUpdated();
    });
}

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;

        setInterval(() => {
            readRemoteFile(sftp);
        }, 2000);

        // updateRemoteFile(sftp);
    })
}).connect(settings);
