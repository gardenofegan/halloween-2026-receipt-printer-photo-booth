const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

if (require.main === module) {
    const port = 3000;
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = { app };
