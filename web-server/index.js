const express = require('express');
const cors = require('cors');

const PORT = 8080;

const app = express();

app.use(cors());

app.use('/clipboard-history', express.static('..'));

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});