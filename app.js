const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricket.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("Server running at http://localhost:3002");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Convert DB object to response object
const convertDbObjectToResponseObject = (dbObject) => {
  if (dbObject) {
    return {
      playerId: dbObject.player_id,
      playerName: dbObject.player_name,
      jerseyNumber: dbObject.jersey_number,
      role: dbObject.role,
    };
  } else {
    console.error("dbObject is undefined or null.");
    return null;
  }
};

// Get list of players
app.get("/players/", async (request, response) => {
  try {
    const getPlayersQuery = `SELECT * FROM cricket_team;`;
    const playersArray = await db.all(getPlayersQuery);
    response.send(playersArray.map((eachPlayer) =>
      convertDbObjectToResponseObject(eachPlayer)
    ));
  } catch (error) {
    console.error(`Error fetching players: ${error.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// Create a new player
app.post("/players/", async (request, response) => {
  const playerDetails = request.body;
  const { playerName, jerseyNumber, role } = playerDetails;
  try {
    const addPlayerQuery = `
      INSERT INTO cricket_team (player_name, jersey_number, role)
      VALUES (?, ?, ?);`;
    const dbResponse = await db.run(addPlayerQuery, [playerName, jerseyNumber, role]);
    const playerId = dbResponse.lastId;
    response.status(201).send({ playerId });
  } catch (error) {
    console.error(`Error adding player: ${error.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// Get a player
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  try {
    const query = `SELECT * FROM cricket_team WHERE player_id = ?`;
    const dbObject = await db.get(query, [playerId]);
    if (dbObject) {
      response.send(convertDbObjectToResponseObject(dbObject));
    } else {
      response.status(404).send("Player not found");
    }
  } catch (error) {
    console.error(`Error fetching player: ${error.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// Update player
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName, jerseyNumber, role } = playerDetails;
  try {
    const updatePlayerQuery = `
      UPDATE cricket_team
      SET player_name = ?,
          jersey_number = ?,
          role = ?
      WHERE player_id = ?;`;
    await db.run(updatePlayerQuery, [playerName, jerseyNumber, role, playerId]);
    response.send("Player Details Updated");
  } catch (error) {
    console.error(`Error updating player: ${error.message}`);
    response.status(500).send("Internal Server Error");
  }
});

// Delete player
app.delete("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  try {
    const deletePlayerQuery = `DELETE FROM cricket_team WHERE player_id = ?`;
    await db.run(deletePlayerQuery, [playerId]);
    response.send("Player Removed");
  } catch (error) {
    console.error(`Error deleting player: ${error.message}`);
    response.status(500).send("Internal Server Error");
  }
});

module.exports = app;
