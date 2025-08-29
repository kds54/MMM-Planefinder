/* MagicMirror Module: MMM-Planefinder
 * Node Helper for server-side API calls
 */

const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: MMM-Planefinder");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_FLIGHT_DATA") {
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