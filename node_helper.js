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
        this.aircraft = {};
        this.loadCSVData();
    },

    loadCSVFile: function(filePath, callback) {
        var self = this;
        fs.readFile(filePath, 'utf8', function(err, data) {
            if (err) {
                console.error("MMM-Planefinder: Error reading CSV file:", filePath, err);
                callback(null);
                return;
            }
            
            try {
                var rows = [];
                var lines = data.split('\n');
                var headers = lines[0].split(',').map(h => h.trim());
                
                for (var i = 1; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line) {
                        var values = line.split(',').map(v => v.trim());
                        var row = {};
                        for (var j = 0; j < headers.length; j++) {
                            row[headers[j]] = values[j] || '';
                        }
                        rows.push(row);
                    }
                }
                callback(rows);
            } catch (parseError) {
                console.error("MMM-Planefinder: Error parsing CSV file:", filePath, parseError);
                callback(null);
            }
        });
    },

    loadCSVData: function() {
        var self = this;
        var airlines = {};
        var airports = {};
        var aircraft = {};
        const modulePath = path.resolve(__dirname);
        
        // Load airlines CSV
        this.loadCSVFile(__dirname + "/airlines.csv", function(data) {
            if (data) {
                data.forEach(function(row) {
                    if (row.code && row.name) {
                        airlines[row.code.trim()] = row.name.trim();
                    }
                });
                console.log("Loaded " + Object.keys(airlines).length + " airlines");
            }
            
            // Load airports CSV
            self.loadCSVFile(__dirname + "/airports.csv", function(data) {
                if (data) {
                    data.forEach(function(row) {
                        if (row.code && row.name) {
                            airports[row.code.trim()] = row.name.trim();
                        }
                    });
                    console.log("Loaded " + Object.keys(airports).length + " airports");
                }
                
                // Load aircraft CSV
                self.loadCSVFile(__dirname + "/aircraft.csv", function(data) {
                    if (data) {
                        data.forEach(function(row) {
                            if (row.code && row.name) {
                                aircraft[row.code.trim()] = row.name.trim();
                            }
                        });
                        console.log("Loaded " + Object.keys(aircraft).length + " aircraft types");
                    }
                    
                    // Send all data to the module
                    self.sendSocketNotification("CSV_DATA_RECEIVED", {
                        airlines: airlines,
                        airports: airports,
                        aircraft: aircraft
                    });
                });
            });
        });
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
        if (notification === "GET_CSV_DATA") {
            this.loadCSVData();
        } else if (notification === "GET_FLIGHT_DATA") {
            this.getFlightData(payload);
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