# MMM-Planefinder
A MagicMirror to display over head aircraft.

**To use this module, you  MUST  have a local Raspberry Pi running the necessary software from planefinder.net.   Also required is USB receiver such as: https://www.amazon.com/dp/B008S7AVTC?ref=ppx_yo2ov_dt_b_fed_asin_title**

Download the planefinder software and install it following the instructions at https://forum.planefinder.net/threads/raspberry-pi-b-zero-rpi2-rpi3-rpi4-installation-instructions-for-raspbian-dump1090-data-feeder.241/

I implemented this MagicMirror module on a separate Raspberry Pi 4.  Clone the three files above to a folder at ~/MagicMirror/modules/MMM-Planefinder.
Run npm  install
Run nom  install request

Configure your module as below substituting the values as needed:
```
//MMM-Planefinder
      {
      module: "MMM-Planefinder",
      position: "top_right", // or any other position you prefer
      config: {
              planefinderIP: "192.168.1.1", // Your Planefinder Pi's IP
              shareCode: "", // Add your share code if needed
              updateInterval: 30000, // Update every 30 seconds
              maxFlights: 10, // Maximum number of flights to display
              headerColor: "#0F84E0", // Header background color
              animationSpeed: 1000, // DOM update animation speed
              retryDelay: 2500 // Delay before retrying failed requests
              }
      }
```
