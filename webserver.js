const path = require("path");
const express = require("express");
const app = express();
const LISTEN_PORT = 80;
const playground = require("./playground");

app.use("/characters", express.static(__dirname + "/characters"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/js", express.static(__dirname + "/js"));
app.use("/images", express.static(__dirname + "/images"));

app.get("/", (request, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/character/:id", (req, res) =>{
    res.setHeader("SameSite", "None");
    res.sendFile(path.join(__dirname, `/characters/${req.params.id}.html`));
});

app.get("/snapshot/:membershipType/:membershipId/:characterId/:timestamp", (req, res) => {
    playground.create_snapshot(req.params.membershipType, req.params.membershipId, req.params.characterId, req.params.timestamp, (results) => {
        res.sendFile(path.join(__dirname, `/characters/${results}.html`));
    });
});

app.get("/characters/:membershipType/:membershipId", (req, res) => {
    playground.retrieve_characters(req.params.membershipType, req.params.membershipId, (results, errorCode) => {
        if(errorCode != undefined) {
            res.status(errorCode);
            res.send("error");
            return;
        }
        res.send(results);
    });
});

app.get("/search/:bungiename/:bungiehash", (req, res) => {
    playground.search_players(`${req.params.bungiename}#${req.params.bungiehash}`, (results) => {
        res.send(results);
    });
});

playground.character_startup(startup);


function startup() {
    app.listen(LISTEN_PORT);
    console.log("Web Server active");
}