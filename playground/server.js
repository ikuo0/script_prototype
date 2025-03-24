const path = require('path');
const express = require('express');
const app = express();
const PORT = 3000;

const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

app.listen(PORT, () => {
    console.log(`Playground running at http://localhost:${PORT}`);
});
