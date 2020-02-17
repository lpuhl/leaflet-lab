/* Map of GeoJSON data from MegaCities.geojson */

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

// //added at Example 2.3 line 20...function to attach popups to each mapped feature
// function onEachFeatureDemo(feature, layer) {
//     //no property named popupContent; instead, create html string with all properties
//     var popupContent = "";
//     if (feature.properties) {
//         //loop to add feature property names and values to html string
//         for (var property in feature.properties){
//             popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
//         }
//         layer.bindPopup(popupContent);
//     };
// };

//Step 1: Create new sequence controls
function createSequenceControls(map, attributes){
  var SequenceControl = L.Control.extend({
      options: {
          position: 'bottomleft'
      },
      onAdd: function (map) {
          // create the control container div with a particular class name
          var container = L.DomUtil.create('div', 'sequence-control-container');

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
      updatePropSymbols(map, attributes[index]);
   });

   // input listener for slider
  $('.range-slider').on('input', function(){
      //Step 6: get the new index value
      var index = $(this).val();
      // console.log('index:', index);
      // pass new attribute to update symbols
      updatePropSymbols(map, attributes[index]);
  });
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
  updateLegend(map, attribute);
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
          var props = layer.feature.properties;

          //update each feature's radius based on new attribute values
          var radius = calcPropRadius(props[attribute]);
          layer.setRadius(radius);

          createPopup(props, attribute, layer, radius);

        };
    });
};

function createPopup(props, attribute, layer, radius) {
  //add city to popup content string
  var popupContent = "<p id='city'>" + props.City + "</p>";

  //add formatted attribute to panel content string
  var year = attribute //.split("_")[1];
  popupContent += "<p><b>Median rent in " + year + ":</b> $" + props[attribute];

  //replace the layer popup
  layer.bindPopup(popupContent, {
      offset: new L.Point(0,-radius),
      closeButton: false
  });
};

function updateLegend(map, attribute) {
  var legendContent = "<p>Median Rent in " + attribute + "</p>";
  $('#temporal-legend').html(legendContent);
  console.log('updateLegend');
  //get the max, mean, and min values as an object
  var circleValues = getCircleValues(map, attribute);
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

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

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

function pointToLayerFx(feature, latlng, attributes) {
  // Assign the current attribute based on the first index of the attributes array
  var attribute = attributes[0];
  //check
  var markerOptions = {
     // radius: 8,
     fillColor: "#ff7800",
     color: "#000",
     weight: 1,
     opacity: 1,
     fillOpacity: 0.8
  };
  //Step 5: For each feature, determine its value for the selected attribute
  var attValue = Number(feature.properties[attribute]);

  //Step 6: Give each feature's circle marker a radius based on its attribute value
  markerOptions.radius = calcPropRadius(attValue);

  //create circle marker layer
  var markerLayer = L.circleMarker(latlng, markerOptions);

  createPopup(feature.properties, attribute, markerLayer, markerOptions.radius);
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
function createPropSymbols(data, map, attributes) {
  //create a Leaflet GeoJSON layer and add it to the map
  L.geoJson(data, {
      pointToLayer: function(feature, latlng) {
        return pointToLayerFx(feature, latlng, attributes);
      }
  }).addTo(map);
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

function createLegend (map, attributes) {
  console.log('createLegend');
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

  updateLegend(map, attributes[0]);
};

// build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with rent values
        if (attribute.indexOf("20") > -1){
            attributes.push(attribute);
        };
    };
    //check result
    // console.log(attributes);
    return attributes;
};

// function to retrieve the data and place it on the map
function getData(map){
    //load the data
    $.ajax("data/top15cities_rents.geojson", {
        dataType: "json",
        success: function(response){
          var attributes = processData(response);
          // call function to create proportional symbols
          createPropSymbols(response, map, attributes);
          createSequenceControls(map, attributes);
          createLegend(map, attributes);
          // var geoJsonLayer = L.geoJSON(response, {
            // filter: function(feature, layer) {
            //   return feature.properties.Pop_2015 > 20;
            // },
            // onEachFeature: onEachFeatureDemo,
            // pointToLayer: function (feature, latlng) {
            //   return L. circleMarker(latlng, geojsonMarkerOptions);
            // }
          // });
          // //create a L.markerClusterGroup layer
          // var markers = L.markerClusterGroup();
          // //add geojson to marker cluster layer
          // markers.addLayer(geoJsonLayer);
          // //add marker cluster layer to map
          // map.addLayer(markers);

          // //create a Leaflet GeoJSON layer and add it to the map
          // L.geoJSON(response, {
          //   // filter: function(feature, layer) {
          //   //   return feature.properties.Pop_2015 > 20;
          //   // },
          //   onEachFeature: onEachFeatureDemo,
          //   pointToLayer: function (feature, latlng) {
          //     return L. circleMarker(latlng, geojsonMarkerOptions);
          //   }
          // }).addTo(map);
        }
    });
};

$(document).ready(createMap);
