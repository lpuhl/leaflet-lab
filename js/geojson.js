var filter = 'default';
var currentYear = 2011;
var citiesLayer = null
//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var map = L.map('map', {
        center: [39.8, -98.58],
        zoom: 4
    });

    //add base tilelayer
    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      	subdomains: 'abcd',
      	minZoom: 0,
      	maxZoom: 20,
      	ext: 'png'
    }).addTo(map);

    //call getData function
    getData(map);
};

//Step 1: Create new sequence controls
function createSequenceControls(features, map, years){
  var SequenceControl = L.Control.extend({
      options: {
          position: 'bottomleft'
      },
      onAdd: function (map) {
          // create the control container div with a particular class name
          var container = L.DomUtil.create('div', 'sequence-control-container');
          $(container).append('<p class="yearLabel">Year</p>');
          $(container).append('<input class="range-slider" type="range">');
          $(container).append('<button class="skip" id="reverse">Reverse</button>');
          $(container).append('<button class="skip" id="forward">Skip</button>');

          //kill any mouse event listeners on the map
          $(container).on('mousedown dblclick', function(e){
              L.DomEvent.stopPropagation(e);
          });

          return container;
      }
  });

  map.addControl(new SequenceControl());

  $('#reverse').html('<img src="img/noun_Reverse.png">');
  $('#forward').html('<img src="img/noun_Next.png">');

  //create range input element (slider)
  $('.range-slider').attr({
      max: 6,
      min: 0,
      value: 0,
      step: 1
  });

  //Step 5: click listener for buttons
   $('.skip').click(function(){
     //get the old index value
     var index = $('.range-slider').val();
     //increment or decrement depending on button clicked
     if ($(this).attr('id') == 'forward'){
         index++;
         //if past the last attribute, wrap around to first attribute
         index = index > 6 ? 0 : index;
     } else if ($(this).attr('id') == 'reverse'){
         index--;
         //if past the first attribute, wrap around to last attribute
         index = index < 0 ? 6 : index;
     };
     //Step 8: update slider
     $('.range-slider').val(index);
     // console.log('incremented index', index);
     // pass new attribute to update symbols
      updatePropSymbols(map, years[index], features);
      currentYear = years[index];
      // console.log('currentYear', currentYear);
   });

   // input listener for slider
  $('.range-slider').on('input', function(){
      //Step 6: get the new index value
      var index = $(this).val();
      // console.log('index:', index);
      // pass new attribute to update symbols
      updatePropSymbols(map, years[index], features);
      currentYear = years[index];
      // console.log('currentYear', currentYear);
  });
};

function createFilterControl(map, features, years){
  var FilterControl = L.Control.extend({
      options: {
          position: 'bottomleft' //'topright'
      },
      onAdd: function (map) {
          // create the control container div with a particular class name
          var container = L.DomUtil.create('div', 'filter-control-container switch-toggle switch-3 switch-candy tooltip' );

          $(container).append('<input id="less" name="state-d" type="radio" checked="" /><label for="less"><span class="tooltiptext">Show cities with median rents of less than $1000</span>\< $1000</label>');
          $(container).append('<input id="default" name="state-d" type="radio" checked="checked" /><label for="default" class="default"><span class="tooltiptext">Show all</span>Show All</label>');
          $(container).append('<input id="more" name="state-d" type="radio"/><label for="more"><span class="tooltiptext">Show cities with median rents of $1000 or more</span>&ge; $1000</label>');

          //kill any mouse event listeners on the map
          $(container).on('mousedown dblclick', function(e){
              L.DomEvent.stopPropagation(e);
          });

          return container;
      }
  });
  map.addControl(new FilterControl());

  // //Step 5: click listener for buttons
   $('#less').click(function(){
     filter = 'less';
     filterRents(map, filter, features);
  });
  $('#more').click(function(){
    filter = 'more';
    filterRents(map, filter, features);
   });
   $('#default').click(function(){
     filter = 'clear';
     filterRents(map, filter, features);
  });
};

function filterRents(map, filter, features){
    if(map.hasLayer(citiesLayer)){
      map.removeLayer(citiesLayer);
    };
    citiesLayer = L.geoJson(features, {
        pointToLayer: function(feature, latlng) {
          return pointToLayerFx(feature, latlng, currentYear);
        },
        filter: function(feature, layer) {
          if (filter == 'less') {
            return feature.properties[currentYear] < 1000;
          }
          else if (filter == 'more') {
            return feature.properties[currentYear] >= 1000;
          }
          else if (filter = 'default') {
            return feature.properties[currentYear]
          }
        }
    });
    citiesLayer.addTo(map);
    updateLegend(map, currentYear)
}


//Step 10: Resize proportional symbols according to new year value from slider
function updatePropSymbols(map, year, features){
  currentYear = year;
  updateLegend(map, year);
  // Each circle is its own layer.
  map.eachLayer(function(layer){
      if (layer.feature && layer.feature.properties[year]){
        //access feature properties
        var props = layer.feature.properties;

        //update each feature's radius based on new year values
        var radius = calcPropRadius(props[year]);
        layer.setRadius(radius);

        createPopup(props, year, layer, radius);
      };
  });
  filterRents(map, filter, features);
};

function createPopup(props, year, layer, radius) {
  //add city to popup content string
  var popupContent = "<p id='city'>" + props.City + "</p>";

  //add formatted attribute to panel content string
  var rentYear = year //.split("_")[1];
  popupContent += "<p><b>Median rent in " + rentYear + ":</b> $" + props[year];

  //replace the layer popup
  layer.bindPopup(popupContent, {
      offset: new L.Point(0,-radius),
      closeButton: false
  });
};

function updateLegend(map, year) {
  var legendContent = "<p>Median Rent in " + year + "</p>";
  $('#temporal-legend').html(legendContent);
  //get the max, mean, and min values as an object
  var circleValues = getCircleValues(map, year);
  for (var key in circleValues) {
    //get the radius
    var radius = calcPropRadius(circleValues[key]);
    //Step 3: assign the cy and r attributes
    $('#'+key).attr({
        cy: 69 - radius,
        r: radius
    });
    //Step 4: add legend text
    $('#'+key+'-text').text("$" + circleValues[key]);
  }
}

//Calculate the max, mean, and min values of rents for the given year
function getCircleValues(map, year){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the rent value for the given year for each city
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[year]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

function pointToLayerFx(feature, latlng, years) {
  // console.log('pointToLayerFx running; year:', years);
  if (typeof years == "object") {
    // console.log(years);
    // Assign the current attribute based on the first index of the years array
    var year = years[0];
  }
  else {
    var year = years;
  }
  //check
  var markerOptions = {
     // radius: 8,
     fillColor: "#ff7800",
     color: "#000",
     weight: 1,
     opacity: 1,
     fillOpacity: 0.8
  };
  //Step 5: For each feature (city), determine its value for the selected attribute
  var attValue = Number(feature.properties[year]);

  //Step 6: Give each feature's circle marker a radius based on its attribute value
  markerOptions.radius = calcPropRadius(attValue);

  //create circle marker layer
  var markerLayer = L.circleMarker(latlng, markerOptions);

  createPopup(feature.properties, year, markerLayer, markerOptions.radius);
  //event listeners to open popup on hover

  markerLayer.on({
      mouseover: function(){
          this.openPopup();
      },
      mouseout: function(){
          this.closePopup();
      }
      // ,
      // click: function(){
      //     $("#panel").html(popupContent);
      // }
  });

  //return the circle marker to the L.geoJson pointToLayer option
  return markerLayer;
};

//Step 3: Add circle markers for point features to the map
function createPropSymbols(data, map, years) {
  //create a Leaflet GeoJSON layer and add it to the map
  citiesLayer = L.geoJson(data, {
      pointToLayer: function(feature, latlng) {
        return pointToLayerFx(feature, latlng, years);
      }
  });
  citiesLayer.addTo(map);
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 1;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};

function createLegend (map, years) {
  var LegendControl = L.Control.extend({
      options: {
          position: 'bottomright'
      },
      onAdd: function (map) {
          // create the control container with a particular class name
          var container = L.DomUtil.create('div', 'legend-control-container');
          //add temporal legend div to container
          $(container).append('<div id="temporal-legend">')
          //Step 1: start attribute legend svg string
          var svg = '<svg id="attribute-legend" width="160px" height="100px">';
          //array of circle names to base loop on
          var circles = {
            "max":35,
            "mean":50,
            "min":65
          };
          //Step 2: loop to add each circle and text to svg string
          // for (var i = 0; i < circles.length; i++){
          for (var circle in circles) {
              //circle string
              svg += '<circle class="legend-circle" id="' + circle +
              '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="30"/>';
              //text string
              svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
          };
          //close svg string
          svg += "</svg>";
          //add attribute legend svg to container
          $(container).append(svg);
          return container;
      }
  });
  map.addControl(new LegendControl());

  updateLegend(map, years[0]);
};

// build an attributes array from the data
function processData(data){
    //empty array to hold years
    var years = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with rent values
        if (attribute.indexOf("20") > -1){
            years.push(attribute);
        };
    };
    //check result
    // console.log(years);
    return years;
};

// function to retrieve the data and place it on the map
function getData(map){
    //load the data
    $.ajax("data/top15cities_rents.geojson", {
        dataType: "json",
        success: function(response){
          var years = processData(response);
          // call function to create proportional symbols
          createPropSymbols(response, map, years);
          createSequenceControls(response, map, years);
          createFilterControl(map, response, years);
          createLegend(map, years);
        }
    });
};

$(document).ready(createMap);
