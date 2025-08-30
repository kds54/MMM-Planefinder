/* MagicMirror Module: MMM-Planefinder
 * Displays flight data from Planefinder
 */

Module.register("MMM-Planefinder", {
    // Default module config
    defaults: {
        planefinderIP: "192.168.1.1",
        shareCode: "", // Your share code if needed
        updateInterval: 30000, // 30 seconds
        maxFlights: 10,
        headerColor: "#4285f4", // Blue color for header
        animationSpeed: 1000,
        retryDelay: 2500
    },

    // Define required scripts
    getScripts: function() {
        return [];
    },

    // Define required styles
    getStyles: function() {
        return ["MMM-Planefinder.css"];
    },

    // Override start method
    start: function() {
        Log.info("Starting module: " + this.name);
        this.flights = [];
        this.loaded = false;
        this.airlines = {};
        this.airports = {};
        this.csvDataLoaded = false;
        
        // Request CSV data from node helper
        this.sendSocketNotification("GET_CSV_DATA", {});
        
        this.scheduleUpdate();
        this.updateTimer = null;
    },

    // Override dom generator
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "planefinder-wrapper";

        // Add separating line
        var separator = document.createElement("hr");
        separator.className = "planefinder-separator";
        wrapper.appendChild(separator);

        // Add "Flights Overhead" header
        var title = document.createElement("div");
        title.className = "planefinder-title";
        title.innerHTML = "Flights Overhead";
        wrapper.appendChild(title);

        if (!this.loaded) {
            var loadingDiv = document.createElement("div");
            loadingDiv.innerHTML = "Loading flight data...";
            loadingDiv.className = "dimmed light small";
            wrapper.appendChild(loadingDiv);
            return wrapper;
        }

        if (this.flights.length === 0) {
            var noFlightsDiv = document.createElement("div");
            noFlightsDiv.innerHTML = "No flights detected";
            noFlightsDiv.className = "dimmed light small";
            wrapper.appendChild(noFlightsDiv);
        } else {
            // Create and append flights table
            var table = this.createFlightsTable();
            wrapper.appendChild(table);
        }

        return wrapper;
    },

    // Create the flights table
    createFlightsTable: function() {
        // Create table
        var table = document.createElement("table");
        table.className = "planefinder-table";

        // Create header
        var header = document.createElement("thead");
        var headerRow = document.createElement("tr");
        headerRow.style.backgroundColor = this.config.headerColor;
        headerRow.style.color = "white";

        var headers = ["Flight", "Aircraft", "Route", "Altitude", "Speed"];
        headers.forEach(function(headerText) {
            var th = document.createElement("th");
            th.innerHTML = headerText;
            th.className = "planefinder-header";
            headerRow.appendChild(th);
        });

        header.appendChild(headerRow);
        table.appendChild(header);

        // Create body
        var tbody = document.createElement("tbody");
        
        for (var i = 0; i < Math.min(this.flights.length, this.config.maxFlights); i++) {
            var flight = this.flights[i];
            
            // Main flight row
            var row = document.createElement("tr");
            row.className = "planefinder-row";

            // Flight number
            var flightCell = document.createElement("td");
            flightCell.innerHTML = flight.ident || "N/A";
            flightCell.className = "planefinder-cell";
            row.appendChild(flightCell);

            // Aircraft type
            var typeCell = document.createElement("td");
            typeCell.innerHTML = flight.type || "N/A";
            typeCell.className = "planefinder-cell";
            row.appendChild(typeCell);

            // Route (Origin - Destination)
            var routeCell = document.createElement("td");
            routeCell.innerHTML = flight.route || "N/A";
            routeCell.className = "planefinder-cell";
            row.appendChild(routeCell);

            // Altitude
            var altCell = document.createElement("td");
            var altitude = flight.altitude ? flight.altitude + " ft" : "N/A";
            altCell.innerHTML = altitude;
            altCell.className = "planefinder-cell";
            row.appendChild(altCell);

            // Speed
            var speedCell = document.createElement("td");
            var speed = flight.speed ? flight.speed + " mph" : "N/A";
            speedCell.innerHTML = speed;
            speedCell.className = "planefinder-cell";
            row.appendChild(speedCell);

            tbody.appendChild(row);

            // Second row with decoded information
            var decodedRow = document.createElement("tr");
            decodedRow.className = "planefinder-decoded-row";

            // Create a single cell that spans all columns
            var decodedCell = document.createElement("td");
            decodedCell.colSpan = 5;
            decodedCell.className = "planefinder-decoded-cell";

            // Create the decoded information container
            var decodedContainer = document.createElement("div");
            decodedContainer.className = "planefinder-decoded-container";

            // Left side - Airline name
            var airlineDiv = document.createElement("div");
            airlineDiv.className = "planefinder-decoded-airline";
            var airlineCode = this.extractAirlineFromFlight(flight.ident);
            var airlineName = airlineCode ? this.getAirlineName(airlineCode) : "";
            airlineDiv.innerHTML = airlineName || "";

            // Right side - Airport names
            var airportsDiv = document.createElement("div");
            airportsDiv.className = "planefinder-decoded-airports";
            var decodedRoute = this.getDecodedRoute(flight.route);
            airportsDiv.innerHTML = decodedRoute || "";

            decodedContainer.appendChild(airlineDiv);
            decodedContainer.appendChild(airportsDiv);
            decodedCell.appendChild(decodedContainer);
            decodedRow.appendChild(decodedCell);

            tbody.appendChild(decodedRow);
        }

        table.appendChild(tbody);
        return table;
    },

    // Extract airline code from single flight number
    extractAirlineFromFlight: function(flightNumber) {
        if (!flightNumber || flightNumber === "N/A") {
            return null;
        }
        var airlineMatch = flightNumber.match(/^([A-Z]{2,3})/);
        return airlineMatch ? airlineMatch[1] : null;
    },

    // Get decoded route with full airport names
    getDecodedRoute: function(route) {
        if (!route || route === "Unknown" || route === "N/A") {
            return "";
        }

        var airports = route.split(/\s*[-→]\s*/);
        var decodedAirports = [];
        
        for (var i = 0; i < airports.length; i++) {
            var code = airports[i].trim();
            if (code && code.length >= 3) {
                var name = this.getAirportName(code);
                if (name !== "Airport") {
                    decodedAirports.push(name);
                }
            }
        }

        return decodedAirports.join(" - ");
    },

    // Get airline name from code
    getAirlineName: function(code) {
        if (!this.csvDataLoaded) {
            return "Airlines";
        }
        return this.airlines[code] || "Airlines";
    },

    // Get airport name from code
    getAirportName: function(code) {
        if (!this.csvDataLoaded) {
            return "Airport";
        }
        return this.airports[code] || "Airport";
    },

    // Schedule next update
    scheduleUpdate: function() {
        var self = this;
        this.updateTimer = setTimeout(function() {
            self.getFlightData();
        }, this.config.updateInterval);
    },

    // Get flight data from Planefinder via node helper
    getFlightData: function() {
        Log.info("MMM-Planefinder: Requesting flight data");
        this.sendSocketNotification("GET_FLIGHT_DATA", this.config);
    },

    // Handle notifications from node helper
    socketNotificationReceived: function(notification, payload) {
        if (notification === "FLIGHT_DATA_RECEIVED") {
            Log.info("MMM-Planefinder: Received flight data from node helper");
            this.processFlightData(payload);
        } else if (notification === "FLIGHT_DATA_ERROR") {
            Log.error("MMM-Planefinder: Error from node helper:", payload.error);
            this.scheduleUpdate();
        } else if (notification === "CSV_DATA_RECEIVED") {
            Log.info("MMM-Planefinder: Received CSV data from node helper");
            this.airlines = payload.airlines || {};
            this.airports = payload.airports || {};
            this.csvDataLoaded = true;
            Log.info("MMM-Planefinder: Loaded " + Object.keys(this.airlines).length + " airlines and " + Object.keys(this.airports).length + " airports");
        }
    },

    // Process flight data from API
    processFlightData: function(data) {
        Log.info("MMM-Planefinder: Processing flight data", data);
        this.flights = [];

        // Log the structure for debugging
        if (data) {
            Log.info("MMM-Planefinder: Data keys:", Object.keys(data));
        }

        // Handle different possible data structures
        var aircraftData = null;
        
        if (data && data.aircraft) {
            aircraftData = data.aircraft;
            Log.info("MMM-Planefinder: Found data.aircraft");
        } else if (data && Array.isArray(data)) {
            aircraftData = data;
            Log.info("MMM-Planefinder: Data is array");
        } else if (data && typeof data === 'object') {
            // Maybe the aircraft data is directly in the root
            aircraftData = data;
            Log.info("MMM-Planefinder: Using data as aircraft object");
        }

        if (aircraftData) {
            var processed = 0;
            
            // Handle both array and object formats
            if (Array.isArray(aircraftData)) {
                for (var i = 0; i < aircraftData.length; i++) {
                    var aircraft = aircraftData[i];
                    var flight = this.extractFlightData(aircraft);
                    if (flight) {
                        this.flights.push(flight);
                        processed++;
                    }
                }
            } else {
                for (var key in aircraftData) {
                    if (aircraftData.hasOwnProperty(key)) {
                        var aircraft = aircraftData[key];
                        var flight = this.extractFlightData(aircraft);
                        if (flight) {
                            this.flights.push(flight);
                            processed++;
                        }
                    }
                }
            }
            
            Log.info("MMM-Planefinder: Processed " + processed + " aircraft, found " + this.flights.length + " flights");
        } else {
            Log.warn("MMM-Planefinder: No aircraft data found in response");
        }

        // Sort flights by altitude (descending)
        this.flights.sort(function(a, b) {
            var altA = parseInt(a.altitude) || 0;
            var altB = parseInt(b.altitude) || 0;
            return altB - altA;
        });

        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
        this.scheduleUpdate();
    },

    // Extract flight data from aircraft object
    extractFlightData: function(aircraft) {
        if (!aircraft) return null;

        // Log first aircraft structure for debugging
        if (this.flights.length === 0) {
            Log.info("MMM-Planefinder: Sample aircraft object:", aircraft);
            Log.info("MMM-Planefinder: Aircraft keys:", Object.keys(aircraft));
        }

        // Try different possible field names for flight identifier
        var ident = aircraft.flight || aircraft.ident || aircraft.callsign || aircraft.call_sign || aircraft.registration;
        
        // Skip aircraft without any identifier or with empty identifiers
        if (!ident || ident.trim() === "" || ident === "N/A") {
            return null;
        }

        // Get route from the "Route" field (e.g., "ORD - BOS")
        var route = aircraft.Route || aircraft.route || "Unknown";

        return {
            ident: ident,
            type: aircraft.type || aircraft.aircraft_type || aircraft.actype || aircraft.model || "Unknown",
            route: route,
            altitude: aircraft.altitude || aircraft.alt || aircraft.alt_geom || 0,
            speed: aircraft.ground_speed || aircraft.speed || aircraft.gs || aircraft.vel || 0
        };
    },

    // Override suspend method
    suspend: function() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
    },

    // Override resume method
    resume: function() {
        this.scheduleUpdate();
    }
});
