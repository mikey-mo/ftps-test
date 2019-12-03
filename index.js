require('dotenv').config();
const Client = require('ssh2').Client;
const fs = require('fs');
const csvWriter = require('csv-write-stream');

let DEFAULT_CHECK_TIME;
let TICKET_HOLDER = false;
let ATTENDED_GAMES = 20;
DEFAULT_CHECK_TIME = process.env.CHECK_TIME;

const conn = new Client();
const settings = {
    host: process.env.FTPS_HOST,
    port: process.env.FTPS_PORT,
    username: process.env.FTPS_USERNAME,
    password: process.env.FTPS_PASSWORD,
};

const getUnixTimestamp = () => Math.floor(new Date().getTime() / 1000)

const filterForCorrectFile= (files, filename) => files.filter(file => file.filename === filename)[0];

const checkIfNewerTimestamp = (newTime, oldTime) => newTime > oldTime;

const updateRemoteFile = (sftp) => {
    const readStream = fs.createReadStream('./test-files/FAN_DATA.csv');
    const writeStream = sftp.createWriteStream('/FAN_DATA.csv');
    writeStream.on('close', () => {
        console.log('file transfer to remote successful');
        DEFAULT_CHECK_TIME = getUnixTimestamp();
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
    });
    DEFAULT_CHECK_TIME = getUnixTimestamp();
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

const updateLocalFile = (sftp) => {
    const writer = csvWriter({ sendHeaders: false, includeEndRowDelimiter: true });
    writer.pipe(fs.createWriteStream('./test-files/FAN_DATA.csv', { flags: 'as+', includeEndRowDelimiter: true }));
    writer.write({
        email: 'email@email.com',
        birthday: 123123412,
        ticket_holder: !TICKET_HOLDER,
        attended_games: ++ATTENDED_GAMES,
    });
    TICKET_HOLDER = !TICKET_HOLDER;
    writer.end();
    console.log('updated local file');
    updateRemoteFile(sftp);
}

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;
        setInterval(() => {
            readRemoteFile(sftp);
        }, 10000);
        setInterval(() => {
            updateLocalFile(sftp);
        }, 30000);
    })
}).connect(settings);
