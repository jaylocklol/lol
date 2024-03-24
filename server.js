const express = require('express');
const server = express();

server.all(`/`, (req, res) => {
    res.send(`Please connect me to a hosting website in-order to work 24/7.`);
});

function keepAlive() {
    server.listen(3000, () => {
        console.log('Up');
    });
}

module.exports = keepAlive;