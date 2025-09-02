# MMM-Planefinder
![IMG_1476](https://github.com/user-attachments/assets/cb073ed1-4fd0-4778-ad85-e9fe262f1698)


A MagicMirror to display over head aircraft without any API calls.

***This module was created with help from articifial intelligence***

**To use this module, you  MUST  have a local Raspberry Pi (2 or 3 but preferebly 4) with a static IP address running the necessary software from planefinder.net.   Also required is USB receiver such as: https://www.amazon.com/dp/B008S7AVTC?ref=ppx_yo2ov_dt_b_fed_asin_title**

The Raspberry Pi with the receiver "looks" for aircraft overhead and exports the listing with all of the necessary information for this module about the flights.  No  API calls are made to any service.

1. Using a dedicated Raspberry Pi, download the planefinder software and install it following the instructions at https://forum.planefinder.net/threads/raspberry-pi-b-zero-rpi2-rpi3-rpi4-installation-instructions-for-raspbian-dump1090-data-feeder.241/

2. Create an free account and register the Raspberry Pi receiver at the planefinder.net website.

3. On the Raspberry Pithat is running ***MagicMirror***, navigate to:

```
bash
cd ~/MagicMirror/modules
```
    
4. Download the module:
   
```
bash
git clone https://github.com/kds54/MMM-Planefinder
```

5.  Navigate to the newly created module folder

```
bash
cd ~/MagicMirror/modules/MMM-Planefinder
npm install
npm install request
```

6. Configure the config.js file as follows.  Be sure to insert the static IP of the Raspberry Pi receiver.

```
//MMM-Planefinder
			{
    				module: "MMM-Planefinder",
    				position: "top_right", // or any other position you prefer
    				config: {
        				planefinderIP: "", // Your Planefinder Pi's IP
        				updateInterval: 30000, // Update every 30 seconds
        				maxFlights: 10, // Maximum number of flights to display
                        headerColor: "#0F84E0", // Header background color
        				animationSpeed: 1000, // DOM update animation speed
        				retryDelay: 2500 // Delay before retrying failed requests

				}
			}
```
7. Edit the ***airlines.csv*** and ***airports.csv*** and ***aircraft.csv*** files in the module folder to display the decoded names of the airlines and airports close to your loation.
