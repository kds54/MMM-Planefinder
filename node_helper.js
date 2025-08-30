/* MagicMirror Module: MMM-Planefinder
 * Node Helper for server-side API calls
 */

const NodeHelper = require("node_helper");
const request = require("request");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: MMM-Planefinder");
        this.airlines = {};
        this.airports = {};
        this.loadCSVData();
    },

    loadCSVData: function() {
        const self = this;
        const modulePath = path.resolve(__dirname);
        
        // Load airlines CSV
        const airlinesPath = path.join(modulePath, "airlines.csv");
        if (fs.existsSync(airlinesPath)) {
            try {
                const airlinesCSV = fs.readFileSync(airlinesPath, "utf8");
                this.parseCSV(airlinesCSV, this.airlines);
                console.log("MMM-Planefinder: Loaded", Object.keys(this.airlines).length, "airlines");
            } catch (error) {
                console.error("MMM-Planefinder: Error loading airlines.csv:", error);
            }
        } else {
            console.warn("MMM-Planefinder: airlines.csv not found at", airlinesPath);
        }

        // Load airports CSV
        const airportsPath = path.join(modulePath, "airports.csv");
        if (fs.existsSync(airportsPath)) {
            try {
                const airportsCSV = fs.readFileSync(airportsPath, "utf8");
                this.parseCSV(airportsCSV, this.airports);
                console.log("MMM-Planefinder: Loaded", Object.keys(this.airports).length, "airports");
            } catch (error) {
                console.error("MMM-Planefinder: Error loading airports.csv:", error);
            }
        } else {
            console.warn("MMM-Planefinder: airports.csv not found at", airportsPath);
        }
    },

    parseCSV: function(csvData, targetObject) {
        const lines = csvData.split('\n');
        for (let i = 1; i < lines.length; i++) { // Skip header row
            const line = lines[i].trim();
            if (line) {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const code = parts[0].trim();
                    const name = parts.slice(1).join(',').trim(); // Handle names with commas
                    targetObject[code] = name;
                }
            }
        }
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_FLIGHT_DATA") {
            this.getFlightData(payload);
        } else if (notification === "GET_CSV_DATA") {
            this.sendSocketNotification("CSV_DATA_RECEIVED", {
                airlines: this.airlines,
                airports: this.airports
            });
        }
    },

    getFlightData: function(config) {
        const self = this;
        let url = `http://${config.planefinderIP}:30053/ajax/aircraft`;
        
        if (config.shareCode && config.shareCode.trim() !== "") {
            url += `?sharecode=${config.shareCode}`;
        }

        console.log("MMM-Planefinder: Requesting data from:", url);

        const options = {
            url: url,
            method: "GET",
            timeout: 10000,
            headers: {
                'User-Agent': 'MagicMirror-Planefinder/1.0'
            }
        };

        request(options, function(error, response, body) {
            if (error) {
                console.error("MMM-Planefinder: Request error:", error);
                self.sendSocketNotification("FLIGHT_DATA_ERROR", {
                    error: error.message || "Network error"
                });
                return;
            }

            if (response.statusCode !== 200) {
                console.error("MMM-Planefinder: HTTP error:", response.statusCode);
                self.sendSocketNotification("FLIGHT_DATA_ERROR", {
                    error: `HTTP ${response.statusCode}: ${response.statusMessage}`
                });
                return;
            }

            try {
                const data = JSON.parse(body);
                console.log("MMM-Planefinder: Successfully received data");
                console.log("MMM-Planefinder: Data keys:", Object.keys(data));
                
                self.sendSocketNotification("FLIGHT_DATA_RECEIVED", data);
            } catch (parseError) {
                console.error("MMM-Planefinder: JSON parse error:", parseError);
                console.error("MMM-Planefinder: Response body:", body.substring(0, 500));
                self.sendSocketNotification("FLIGHT_DATA_ERROR", {
                    error: "Failed to parse response data"
                });
            }
        });
    }
});