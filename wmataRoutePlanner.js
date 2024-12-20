const path = require("path");
require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
process.stdin.setEncoding("utf8");

// MongoDB setup
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.qsmpv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
app.set("views", path.join(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

//const portNumber = process.argv[2];

app.listen(process.env.PORT, (err) => {
    if(err) {
        console.log("Starting server failed.");
    } else {
        console.log(`Web server started and running at http://localhost:${process.env.PORT}`);
        promptUser();
    }
});

function promptUser() {
    const prompt = "Stop to shutdown the server: ";
    process.stdout.write(prompt);
    process.stdin.on("readable", function() {
        const input = process.stdin.read();
        if(input !== null){
            const command = input.trim();
            if(command.toLowerCase() === "stop") {
                process.stdout.write("Shutting down the server\n");
                process.exit(0);
            } else {
                process.stdout.write(`Invalid command\n`);
            }
            process.stdin.resume();
            promptUser();
        }
    });
}

// Station codes mapping
const stationCodes = {
    "Addison Road-Seat Pleasant": "G03",
    "Anacostia": "F06",
    "Archives-Navy Memorial-Penn Quarter": "F02",
    "Arlington Cemetery": "C06",
    "Ashburn": "N12",
    "Ballston-MU": "K04",
    "Benning Road": "G01",
    "Bethesda": "A09",
    "Braddock Road": "C12",
    "Branch Ave": "F11",
    "Brookland-CUA": "B05",
    "Capitol Heights": "G02",
    "Capitol South": "D05",
    "Cheverly": "D11",
    "Clarendon": "K02",
    "Cleveland Park": "A05",
    "College Park-U of Md": "E09",
    "Columbia Heights": "E04",
    "Congress Heights": "F07",
    "Court House": "K01",
    "Crystal City": "C09",
    "Deanwood": "D10",
    "Downtown Largo": "G05",
    "Dunn Loring-Merrifield": "K07",
    "Dupont Circle": "A03",
    "East Falls Church": "K05",
    "Eastern Market": "D06",
    "Eisenhower Avenue": "C14",
    "Farragut North": "A02",
    "Farragut West": "C03",
    "Federal Center SW": "D04",
    "Federal Triangle": "D01",
    "Foggy Bottom-GWU": "C04",
    "Forest Glen": "B09",
    "Fort Totten": ["B06", "E06"],
    "Franconia-Springfield": "J03",
    "Friendship Heights": "A08",
    "Gallery Pl-Chinatown": ["B01", "F01"],
    "Georgia Ave-Petworth": "E05",
    "Glenmont": "B11",
    "Greenbelt": "E10",
    "Greensboro": "N03",
    "Grosvenor-Strathmore": "A11",
    "Herndon": "N08",
    "Huntington": "C15",
    "Hyattsville Crossing": "E08",
    "Innovation Center": "N09",
    "Judiciary Square": "B02",
    "King St-Old Town": "C13",
    "L'Enfant Plaza": ["D03", "F03"],
    "Landover": "D12",
    "Loudoun Gateway": "N11",
    "McLean": "N01",
    "McPherson Square": "C02",
    "Medical Center": "A10",
    "Metro Center": ["A01", "C01"],
    "Minnesota Ave": "D09",
    "Morgan Boulevard": "G04",
    "Mt Vernon Sq 7th St-Convention Center": "E01",
    "Navy Yard-Ballpark": "F05",
    "Naylor Road": "F09",
    "New Carrollton": "D13",
    "NoMa-Gallaudet U": "B35",
    "North Bethesda": "A12",
    "Pentagon": "C07",
    "Pentagon City": "C08",
    "Potomac Ave": "D07",
    "Potomac Yard": "C11",
    "Reston Town Center": "N07",
    "Rhode Island Ave-Brentwood": "B04",
    "Rockville": "A14",
    "Ronald Reagan Washington National Airport": "C10",
    "Rosslyn": "C05",
    "Shady Grove": "A15",
    "Shaw-Howard U": "E02",
    "Silver Spring": "B08",
    "Smithsonian": "D02",
    "Southern Avenue": "F08",
    "Spring Hill": "N04",
    "Stadium-Armory": "D08",
    "Suitland": "F10",
    "Takoma": "B07",
    "Tenleytown-AU": "A07",
    "Twinbrook": "A13",
    "Tysons": "N02",
    "U Street/African-Amer Civil War Memorial/Cardozo": "E03",
    "Union Station": "B03",
    "Van Dorn Street": "J02",
    "Van Ness-UDC": "A06",
    "Vienna/Fairfax-GMU": "K08",
    "Virginia Square-GMU": "K03",
    "Washington Dulles International Airport": "N10",
    "Waterfront": "F04",
    "West Falls Church": "K06",
    "West Hyattsville": "E07",
    "Wheaton": "B10",
    "Wiehle-Reston East": "N06",
    "Woodley Park-Zoo/Adams Morgan": "A04"
};

// Route to display the form
app.get("/", (req, res) => {
    res.render("index", { 
        stations: Object.keys(stationCodes),
        currentPage: "general" 
    });
});

// Route for College Park specific page
app.get("/college-park", async (req, res) => {
    const client = new MongoClient(uri, { 
        tls: true, 
        serverApi: ServerApiVersion.v1,
      
    });

    try {
        await client.connect();
        const collection = client.db("CMSC335Final").collection("wmata");
        
        // Get all available destinations from MongoDB
        const destinations = await collection.distinct("toStation");
        destinations.sort();

        res.render("index", { 
            stations: Object.keys(stationCodes),
            collegeDestinations: destinations,
            currentPage: "collegePark"
        });
    } catch (error) {
        console.error("Error:", error);
        res.render("error", { error: error.message });
    } finally {
        await client.close();
    }
});

// Route for general queries
app.post("/getInfo", async (req, res) => {
    const start = Array.isArray(stationCodes[req.body.fromStation]) ? 
        stationCodes[req.body.fromStation][0] : 
        stationCodes[req.body.fromStation];
    const end = Array.isArray(stationCodes[req.body.toStation]) ? 
        stationCodes[req.body.toStation][0] : 
        stationCodes[req.body.toStation];
    
    try {
        const response = await fetch(
            `https://api.wmata.com/Rail.svc/json/jSrcStationToDstStationInfo?FromStationCode=${start}&ToStationCode=${end}`,
            {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'api_key': '8735e3d470f44dc6abca0e456bc197d5',
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Please select a different source or destination station! Status: ${response.status}`);
        }

        const data = await response.json();
        res.render("results", { 
            data: data.StationToStationInfos[0],
            fromStation: req.body.fromStation,
            toStation: req.body.toStation,
            source: "WMATA API",
            currentPage: "general",
            fare: req.body.fare
        });
    } catch (error) {
        console.error('Error:', error);
        res.render("error", { error: error.message });
    }
});

// Route for College Park specific queries
app.post("/getCollegeParkRoute", async (req, res) => {
    const client = new MongoClient(uri, { 
        tls: true, 
        serverApi: ServerApiVersion.v1,
       
    });
    
    try {
        await client.connect();
        const collection = client.db("CMSC335Final").collection("wmata");

        const routeInfo = await collection.findOne({
            toStation: req.body.toStation
        });

        if (!routeInfo) {
            throw new Error("Route not found in database");
        }

        res.render("results", { 
            data: routeInfo.StationToStationInfos[0],
            fromStation: "College Park-U of Md",
            toStation: req.body.toStation,
            source: "Stored Data",
            currentPage: "collegePark",
            fare: req.body.fare
        });
    } catch (error) {
        console.error("Error:", error);
        res.render("error", { error: error.message });
    } finally {
        await client.close();
    }
});

/*const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Web server started and running at http://localhost:${port}`);
    console.log("Stop to shutdown the server: ");
}); */