# barChart

![bar-chart](https://i.imgur.com/kM1rNMm.png)

## Setup

To set up your Power BI environment, follow the steps on this page: 
[Power BI Environment](https://docs.microsoft.com/en-us/power-bi/developer/custom-visual-develop-tutorial)

- Install dependencies: `npm install`.
- Host a local server: `pbiviz start`.
- Compile visual: `pbiviz package`.

After compiling the visual, import it into **Power Bi Desktop** using the .pbiviz file located in *barChart/dist/*.

## Usage
This chart accepts two sets of inputs: "Axis" and "Values" which are displayed on the x-axis and y-axis, respectively. The difference between each value is calculated automatically. Large inputs will be automatically truncated and converted into shorter representations. For example, a value of 1,400,000 will be displayed as 1.4M.

Shorter sets of data are ideal for this kind of chart because the information can become cluttered easily.

## Development Logs
Setting up the environment to develop custom visuals was challenging because I faced a bug during the `pbiviz new` project installation. The code for my visual was never read when I tried packaging (`pbiviz package`). Instead, an error was logged informing me that no bundles were read, and the visual was to remain in its initial state. This came from the fact that "import" and "export" were unreadable when parsing because `sourceType: module` had not been declared. After trying to insert `sourceType: module` into several different `.json` files, I ended up scrapping the project and installing a new one instead. I believe this bug came from the installation failing and I have yet to understand it completely.

Another challenge I faced involved Power BI's method of updating a visual. In D3, any `.attr()` set after entering data using `.enter()` *only* pertains to that new set of data. Therefore data that is not brand-new will not inheret any attributes set after declaring `.enter()`. As a result my bar chart was unable to resize itself. Although initial `x` and `y` attributes were set, they were never updated after resizing the SVG, and so they never moved or resized themselves. To fix this I had to write each `.attr()` twice: once for newly-entered data, and once for each update call.