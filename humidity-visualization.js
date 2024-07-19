// Define the region of interest (Eastern United States)
var roi = ee.Geometry.Rectangle([-100, 24, -66, 50]);

// Set the date range (using a known period from last year)
var endDate = ee.Date('2023-07-19');
var startDate = endDate.advance(-30, 'days');

// Load ERA5-Land reanalysis data
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_RAW')
  .filter(ee.Filter.date(startDate, endDate))
  .filterBounds(roi);

// Function to calculate relative humidity from dewpoint and air temperature
var calculateRH = function(image) {
  var dewpoint = image.select('dewpoint_temperature_2m');
  var temp = image.select('temperature_2m');
  
  // Constants for Magnus formula
  var a = 17.27;
  var b = 237.7;
  
  // Calculate saturation vapor pressure at air temperature and at dewpoint
  var es = temp.expression('611.0 * exp((a * (t - 273.15)) / (b + (t - 273.15)))', {a: a, b: b, t: temp});
  var e = dewpoint.expression('611.0 * exp((a * (t - 273.15)) / (b + (t - 273.15)))', {a: a, b: b, t: dewpoint});
  
  // Calculate relative humidity
  var rh = e.divide(es).multiply(100);
  
  return image.addBands(rh.rename('relative_humidity'));
};

// Apply the function to calculate relative humidity for each image
var humidityCollection = era5.map(calculateRH);

// Calculate the mean humidity over the time period
var meanHumidity = humidityCollection.select('relative_humidity').mean();

// Create a visualization for humidity
var humidityVis = {
  min: 0,
  max: 100,
  palette: ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
};

// Set up the map
Map.centerObject(roi, 4);

// Add the humidity layer to the map
Map.addLayer(meanHumidity, humidityVis, 'Mean Relative Humidity (%)');

// Print some information
print('Start date:', startDate.format('YYYY-MM-dd').getInfo());
print('End date:', endDate.format('YYYY-MM-dd').getInfo());
print('Number of images in collection:', era5.size().getInfo());

// Add a color bar legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

var legendTitle = ui.Label({
  value: 'Relative Humidity (%)',
  style: {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0'}
});
legend.add(legendTitle);

var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

var palette = humidityVis.palette;
var names = ['0-20', '20-40', '40-60', '60-80', '80-100'];
for (var i = 0; i < 5; i++) {
  legend.add(makeRow(palette[i], names[i]));
}

Map.add(legend);

// Error checking
if (era5.size().getInfo() === 0) {
  print('No images found. Please check the date range and dataset availability.');
} else {
  print('Visualization should be visible on the map.');
}
