/* Initializations */

// selecting already-implemented-in-HTML SVGs
var svgMap = d3.select(".map"),
    svgBar = d3.select(".bar"),
    svgScatterplot = d3.select(".scatterplot");

// global variables
var incidents,
    incidentsOriginal, // constant final copy of dataset
    weatherFilterChoice = "all",
    phaseFilterChoice = "all",
    totalMaxCasualty; // the total casualty (fatal + serious + uninjured) for all incidents combined

/** START: World Map Code.
 * Citation: https://bl.ocks.org/d3noob/5c6eab54c8ca51929734b6f5cca2b231
 */

var projection = d3.geoMercator().center([39, 5]).scale(125);
var svgMapG = svgMap.append("g").attr("class", "svg1Group");

// load and display the World
d3.json("world-110m2.json").then(function (topology) {
    var path = d3.geoPath().projection(projection);
    var countries = topojson.feature(topology, topology.objects.countries)
        .features;
    svgMapG
        .selectAll(".world_map")
        .data(countries)
        .enter()
        .append("path")
        .attr("class", "world_map")
        .attr("d", path);

    // hover functions for country deleted
    // citation: https://youtu.be/aNbgrqRuoiE

    // .on("click", function (d) {
    //     var currentClass = d3.select(this).attr("class");

    //     if (currentClass === "selection") {
    //         d3.select(this).attr("class", "world_map");
    //     } else {
    //         d3.select(this).attr("class", "selection");
    //     }
    // })
    // .on("mouseover", function (d) {
    //     var currentClass = d3.select(this).attr("class");

    //     if (currentClass !== "selection") {
    //         d3.select(this).attr("class", "country_hover");
    //     }
    // })
    // .on("mouseout", function (d) {
    //     var currentClass = d3.select(this).attr("class");

    //     if (currentClass !== "selection") {
    //         d3.select(this).attr("class", "world_map");
    //     }
    // });
});

/** End of World Map Code */

/* START: Enter cities of plane incidents */

// data processing to make referecing values in dataset easier
function dataPreprocessor(row) {
    /* function to convert string to date
    var parseTime = d3.timeParse("%B %d, %Y");
    parseTime("June 30, 2015"); // Tue Jun 30 2015 00:00:00 GMT-0700 (PDT)
    
    Citation: https://github.com/d3/d3-time-format
    */
    var parseDate = d3.timeParse("%m/%d/%Y");

    return {
        accident_number: row["Accident_Number"],
        date: parseDate(row["Event_Date"]),

        location: row["Location"],
        country: row["Country"],

        lat: +row["Latitude"],
        long: +row["Longitude"],

        airport_code: row["Airport_Code"],
        airport_name: row["Airport_Name"],

        severity: row["Injury_Severity"],
        damage: row["Aircraft_Damage"],

        registration: row["Registration_Number"],
        make: row["Make"],
        model: row["Model"],
        schedule: row["Schedule"],
        carrier: row["Air_Carrier"],

        fatal: +row["Total_Fatal_Injuries"],
        serious: +row["Total_Serious_Injuries"],
        uninjured: +row["Total_Uninjured"],

        weather: row["Weather_Condition"],
        phase: row["Broad_Phase_of_Flight"],
    };
}

var damageCases;

// ["indigo", "orange", "yellow", "red"] = ["", "Substantial", "Minor", "Destroyed"]
// order is equal to the order in damageCases after initialization
let damageColors = ["indigo", "orange", "yellow", "red"];
let maxHumanLifeCost;

var minDate, maxDate;

d3.csv("aircraft_incidents.csv", dataPreprocessor).then(function (dataset) {
    // global aircraft_incidents.csv dataset, subject to applied filters
    // var incidents = dataset;
    incidents = dataset;
    incidentsOriginal = dataset;

    // citation on min/max methods: https://observablehq.com/@d3/d3-extent#:~:text=extent-,d3.,it%20returns%20the%20smallest%20number.
    minDate = d3.min(incidents, (d) => d.date);
    maxDate = d3.max(incidents, (d) => d.date);

    // all distinct aircraft damage cases
    let damageCasesDict = {};
    damageCases = [];
    incidentsOriginal.forEach((d) => {
        damageCasesDict[d.damage] = 0;
    });
    for (var key in damageCasesDict) {
        damageCases.push(key);
    }

    maxHumanLifeCost = d3.max(incidentsOriginal, function (d) {
        return computeHumanLifeCost(d);
    });

    // the total casualty (fatal + serious + uninjured) for all incidents
    // combined
    totalMaxCasualty = d3.sum(incidents, function (d) {
        return d.fatal + d.serious + d.uninjured;
    });

    updateAll();
    createSlider(minDate, maxDate);
});

function computeHumanLifeCost(d) {
    let humanLife = d.fatal * 5 + d.serious * 3 + d.uninjured;
    return humanLife;
}

// making colors
// citation: https://www.d3-graph-gallery.com/graph/custom_color.html
let myColor;

function updateMap() {
    var selectionCities = svgMapG
        .selectAll(".incident_city")
        .data(incidents, function (d) {
            return d.accident_number;
        });

    myColor = d3.scaleOrdinal().domain(damageCases).range(damageColors);

    // add cities dots where incidents occured
    // citation: https://youtu.be/aNbgrqRuoiE
    selectionCitiesG = selectionCities
        .enter()
        .append("g")
        .attr("class", "incident_city");

    // add circles with varying sizes depending on human life cost
    // fill colors depending on aircraft damage
    selectionCitiesG
        .append("circle")
        .attr("class", "city_circle")
        .attr("r", function (d) {
            let weightedLife = computeHumanLifeCost(d) * 0.01;
            if (weightedLife <= 2) {
                return 2;
            } else {
                return weightedLife;
            }
        })
        .attr("cx", function (d) {
            var coords = projection([d.long, d.lat]);
            return coords[0];
        })
        .attr("cy", function (d) {
            var coords = projection([d.long, d.lat]);
            return coords[1];
        })
        .attr("fill", function (d) {
            return myColor(d.damage);
        });

    var cityTextG = selectionCitiesG
        .append("g")
        .attr("class", "city_data")
        .attr("x", function (d) {
            var coords = projection([d.long, d.lat]);
            return coords[0];
        })
        .attr("y", function (d) {
            var coords = projection([d.long, d.lat]);
            return coords[1];
        });

    // adding text
    cityTextG
        .append("text")
        .attr("class", "city_data")
        .attr("x", function (d) {
            var coords = projection([d.long, d.lat]);
            return coords[0];
        })
        .attr("y", function (d) {
            var coords = projection([d.long, d.lat]);
            return coords[1];
        })
        .text(function (d) {
            return computeHumanLifeCost(d) >= 2
                ? "Fatal: " +
                      d.fatal +
                      ", Serious: " +
                      d.serious +
                      ", Uninjured: " +
                      d.serious
                : "";
        });

    // exit and remove unrelated letters
    selectionCities.exit().remove();

    // begin making legend
    let legend = svgMapG
        .append("g")
        .attr("id", "legend")
        .attr("transform", "translate(" + [2, 348] + ")");

    // append perimeter rectangle
    legend
        .append("rect")
        .attr("stroke-width", "0.5")
        .attr("stroke", "#777")
        .attr("height", "150px")
        .attr("width", "200px")
        .attr("fill", "white");

    addLegendAircraftDamage(legend);

    // add horizontal separator in legend
    legend
        .append("path")
        .attr("fill", "transparent")
        .attr("stroke-width", "0.5")
        .attr("stroke", "#777")
        .attr("d", "M 30 75 H 150");

    addLegendHumanLife(legend);
}

// makes aircraft part of Legend in map
function addLegendAircraftDamage(legend) {
    // append title of first part of legend: Aircraft Damage
    legend
        .append("text")
        .text("Aircraft Damage")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("transform", "translate(" + [4, 17] + ")");

    // appending all circles and description text for Aircraft Damage
    legend
        .append("circle")
        .attr("fill", "indigo")
        .attr("class", "legendCircles")
        .attr("r", "10px")
        .attr("transform", "translate(" + [30, 39] + ")");
    legend
        .append("text")
        .text("Unknown/NA")
        .attr("font-size", "8px")
        .attr("transform", "translate(" + [7, 65] + ")");

    let hSpaceAircraftDmaage = 50;

    legend
        .append("circle")
        .attr("fill", "yellow")
        .attr("class", "legendCircles")
        .attr("r", "10px")
        .attr(
            "transform",
            "translate(" + [30 + hSpaceAircraftDmaage, 39] + ")"
        );
    legend
        .append("text")
        .text("Minor")
        .attr("font-size", "8px")
        .attr(
            "transform",
            "translate(" + [7 + hSpaceAircraftDmaage + 12, 65] + ")"
        );

    legend
        .append("circle")
        .attr("fill", "orange")
        .attr("class", "legendCircles")
        .attr("r", "10px")
        .attr(
            "transform",
            "translate(" + [30 + hSpaceAircraftDmaage * 2, 39] + ")"
        );
    legend
        .append("text")
        .text("Substantial")
        .attr("font-size", "8px")
        .attr(
            "transform",
            "translate(" + [7 + hSpaceAircraftDmaage * 2 + 3, 65] + ")"
        );

    legend
        .append("circle")
        .attr("fill", "red")
        .attr("class", "legendCircles")
        .attr("r", "10px")
        .attr(
            "transform",
            "translate(" + [30 + hSpaceAircraftDmaage * 3, 39] + ")"
        );
    legend
        .append("text")
        .text("Destroyed")
        .attr("font-size", "8px")
        .attr(
            "transform",
            "translate(" + [7 + hSpaceAircraftDmaage * 3 + 5, 65] + ")"
        );
}

// makes human life of Legend in map
function addLegendHumanLife(legend) {
    let verticalDiff = 75;

    // append title of first part of legend: Aircraft Damage
    legend
        .append("text")
        .text("Human Life Cost*")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("transform", "translate(" + [4, 17 + verticalDiff] + ")");

    let yLevelCircles = 39 + verticalDiff;
    let yLevelText = 65 + verticalDiff;

    // appending all circles and description text for Aircraft Damage
    legend
        .append("circle")
        .attr("fill", "grey")
        .attr("class", "legendCircles")
        .attr("r", "2")
        .attr("transform", "translate(" + [30, yLevelCircles] + ")");
    legend
        .append("text")
        .text("⩽ 2")
        .attr("font-size", "8px")
        .attr("transform", "translate(" + [25, yLevelText] + ")");

    let hSpace = 50;

    legend
        .append("circle")
        .attr("fill", "grey")
        .attr("class", "legendCircles")
        .attr("r", "3")
        .attr("transform", "translate(" + [30 + hSpace, yLevelCircles] + ")");
    legend
        .append("text")
        .text("300")
        .attr("font-size", "8px")
        .attr("transform", "translate(" + [73, yLevelText] + ")");

    legend
        .append("circle")
        .attr("fill", "grey")
        .attr("class", "legendCircles")
        .attr("r", "6")
        .attr(
            "transform",
            "translate(" + [30 + hSpace * 2, yLevelCircles] + ")"
        );
    legend
        .append("text")
        .text("600")
        .attr("font-size", "8px")
        .attr("transform", "translate(" + [123, yLevelText] + ")");

    legend
        .append("circle")
        .attr("fill", "grey")
        .attr("class", "legendCircles")
        .attr("r", "10")
        .attr(
            "transform",
            "translate(" + [30 + hSpace * 3, yLevelCircles] + ")"
        );
    legend
        .append("text")
        .text("1000")
        .attr("font-size", "8px")
        .attr("transform", "translate(" + [170, yLevelText] + ")");
}

/**  makes a list containing dictionary of keys representing either "Fatal", 
 * "Serious", "Uninjured" and values representing total casaulties in
 *  those categories
 @return 
  0: {type: "fatal", counts: 9636}
  1: {type: "serious", counts: 1311}
  2: {type: "uninjured", counts: 173163}
  length: 3
  __proto__: Array(0) 
*/
function countAircraftIncident(incidents) {
    incidentData = [
        { type: "fatal", counts: 0 },
        { type: "serious", counts: 0 },
        { type: "uninjured", counts: 0 },
    ];

    incidents.forEach((d) => {
        incidentData[0]["counts"] += d.fatal;
        incidentData[1]["counts"] += d.serious;
        incidentData[2]["counts"] += d.uninjured;
    });

    return incidentData;
}

// create the bar chart for casualties
function updateBar() {
    // citation for histogram: https://www.tutorialsteacher.com/d3js/create-bar-chart-using-d3js

    // remove all made bar elements
    d3.selectAll("#bar_title").remove();
    d3.selectAll("#main_bar").remove();

    var width = svgBar.attr("width") - 100,
        height = svgBar.attr("height") - 150;

    svgBar
        .append("text")
        .attr("id", "bar_title")
        .attr("transform", "translate(" + [width / 2 - 60, 40] + ")")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Total Number of Casualty");

    var xScale = d3.scaleBand().range([0, width]).padding(0.4),
        yScale = d3.scaleLinear().range([height, 0]);

    var svgBarG = svgBar
        .append("g")
        .attr("id", "main_bar")
        .attr("transform", "translate(" + 80 + "," + 100 + ")");

    var incidentData = countAircraftIncident(incidents);

    // begin drawing histogram

    xScale.domain(
        incidentData.map(function (d) {
            return d.type;
        })
    );
    yScale.domain([0, totalMaxCasualty]);

    svgBarG
        .append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale));

    svgBarG.append("g").call(
        d3
            .axisLeft(yScale)
            .tickFormat(function (d) {
                return d;
            })
            .ticks(10)
    );

    var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    svgBarG
        .selectAll(".bar")
        .data(incidentData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function (d) {
            return xScale(d.type);
        })
        .attr("y", function (d) {
            return yScale(d.counts);
        })
        .attr("width", xScale.bandwidth())
        .attr("height", function (d) {
            return height - yScale(d.counts);
        })
        .style("fill", function (d) {
            return colorScale(d.type);
        });

    // appending raw number of casulaty for each type of casualty
    svgBarG
        .selectAll(".numberOfCasualty")
        .data(incidentData)
        .enter()
        .append("text")
        .attr("x", function (d, i) {
            if (d.counts / 100000 >= 1) {
                return xScale(d.type) - 7;
            } else if (d.counts / 10000 >= 1) {
                return xScale(d.type) - 2;
            } else if (d.counts / 1000 >= 1) {
                return xScale(d.type) + 3;
            } else if (d.counts / 100 >= 1) {
                return xScale(d.type) + 3;
            } else if (d.counts / 10 >= 1) {
                return xScale(d.type) + 9;
            } else {
                return xScale(d.type) + 14;
            }
        })
        .attr("y", function (d) {
            return yScale(d.counts) - 5;
        })
        .text(function (d) {
            return d.counts;
        });

    // find total casaulty
    var totalCasualty = d3.sum(incidentData, function (d) {
        return d.counts;
    });

    // appending percentage of casaulty based on type of casualty
    svgBarG
        .selectAll(".numberOfCasualty")
        .data(incidentData)
        .enter()
        .append("text")
        .attr("x", function (d, i) {
            var percentageCasualty = ((d.counts * 1.0) / totalCasualty) * 100;

            if (percentageCasualty === 100) {
                return xScale(d.type) - 1;
            } else if (percentageCasualty >= 10) {
                return xScale(d.type) - 5;
            } else if (percentageCasualty > 0) {
                return xScale(d.type) - 2;
            } else {
                return xScale(d.type) + 10;
            }
        })
        .attr("y", function (d) {
            return yScale(d.counts) - 25;
        })
        .attr("font-weight", "bold")
        .text(function (d) {
            /** Rounds a decimal value to 'decimals' places
            e.g. round(1.005, 2) => 1.01
            citation: https://www.jacklmoore.co3m/notes/rounding-in-javascript/
            */
            function round(value, decimals) {
                return Number(
                    Math.round(value + "e" + decimals) + "e-" + decimals
                );
            }

            var percentageCasualty = ((d.counts * 1.0) / totalCasualty) * 100;
            percentageCasualty = round(percentageCasualty, 2);
            return percentageCasualty + "%";
        });

    svgBarG
        .append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("y", height - 315)
        .attr("x", width - 50)
        .attr("text-anchor", "end")
        .attr("stroke", "black")
        .text("Type of Casualty");

    svgBarG
        .append("g")
        .call(
            d3
                .axisLeft(yScale)
                .tickFormat(function (d) {
                    return d;
                })
                .ticks(10)
        )
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "-5.1em")
        .attr("text-anchor", "end")
        .attr("stroke", "black")
        .text("Number of Casualty");
}

// slider current values
var sliderNewLeft, sliderNewRight;

// begin creating slider
function createSlider(minDate, maxDate) {
    var formatDateIntoYear = d3.timeFormat("%Y");
    minYear = +formatDateIntoYear(minDate);
    maxYear = +formatDateIntoYear(maxDate);

    // Source: https://steemit.com/utopian-io/@riyo.s94/how-to-use-bootstrap-slider
    // insert range slider
    var slider = new Slider("#range", {
        min: minYear,
        max: maxYear,
        value: [minYear, maxYear],
        range: true,
        tooltip: "always",
    });

    sliderNewLeft = minYear;
    sliderNewRight = maxYear;

    // slider on change function
    slider.on("change", function (event) {
        sliderNewLeft = event.newValue[0];
        sliderNewRight = event.newValue[1];

        updateSlider();
    });
}

// update slider function to modify incidents shown on slider change
updateSlider = function () {
    // Create a filtered array of incidents based on the slider range selected
    incidents = incidentsOriginal.filter(function (d) {
        return filterByAllParameters(d);
    });

    // update map and bar chart based on filtered incidents
    updateAll();
};

// update both map and bar with the new filtered incidents
function updateAll() {
    updateMap();
    updateBar();
    updateScatterplot();
}

/* 
Functions for category changes on X axis and Y axis 
*/

// Global function called when weather choice is changed
function onWeatherChanged() {
    // selecting current choice value
    var select = d3.select("#weatherSelector").node();

    // Get current value of select element
    weatherFilterChoice = select.options[select.selectedIndex].value;

    // Create a filtered array of incidents based on the weather selected
    incidents = incidentsOriginal.filter(function (d) {
        return filterByAllParameters(d);
    });

    updateAll();
}

// Global function called when "broad phase of flight" choice is changed
function onPhaseChanged() {
    // selecting current choice value
    var select = d3.select("#phaseSelector").node();

    // Get current value of select element
    phaseFilterChoice = select.options[select.selectedIndex].value;

    // Create a filtered array of incidents based on the weather selected
    incidents = incidentsOriginal.filter(function (d) {
        return filterByAllParameters(d);
    });

    updateAll();
}

// returns true iff this data element d has weather matching weatherFilterChoice
// and in the range of the slider
function filterByAllParameters(d) {
    var parseYear = d3.timeParse("%Y");
    return (
        filterByWeather(d) &&
        filterByPhase(d) &&
        d.date >= parseYear(sliderNewLeft) &&
        d.date <= parseYear(sliderNewRight)
    );
}

// returns true iff this data element d has weather matching weatherFilterChoice
function filterByWeather(d) {
    switch (weatherFilterChoice) {
        case "all":
            return true;
        case "unk/na":
            return d.weather === "" || d.weather === "UNK";
        default:
            return d.weather === weatherFilterChoice;
    }
}

// returns true iff this data element d has broad_phase_of_flight matching
// phaseFilterChoice
function filterByPhase(d) {
    switch (phaseFilterChoice) {
        case "all":
            return true;
        case "unk/na":
            return d.phase === "" || d.phase === "UNKNOWN";
        default:
            return d.phase === phaseFilterChoice;
    }
}

function updateScatterplot() {
    let padding = 40;

    d3.selectAll(".scatterplot_data").remove();

    var selectionCities = svgScatterplot
        .selectAll("g")
        .data(incidents, function (d) {
            return d;
        });

    var selectionCitiesG = selectionCities
        .enter()
        .append("g")
        .attr("class", "scatterplot_data");

    let limitedMaxDate = d3.max(incidents, function (d) {
        return d.date;
    });

    let limitedMinDate = d3.min(incidents, function (d) {
        return d.date;
    });

    let height = svgScatterplot.attr("height");
    let width = svgScatterplot.attr("width");

    let xScale = d3
        .scaleTime()
        .domain([limitedMinDate, limitedMaxDate])
        .range([padding, width - padding]);

    let yScale = d3
        .scaleLinear()
        .domain([0, maxHumanLifeCost])
        .range([height - padding, padding]);

    // add circles with varying sizes depending on human life cost
    // fill colors depending on aircraft damage
    selectionCitiesG
        .append("circle")
        .attr("class", "scatterplot_circle")
        .attr("r", function (d) {
            let weightedLife = computeHumanLifeCost(d) * 0.01;
            if (weightedLife <= 2) {
                return 2;
            } else {
                return weightedLife;
            }
        })
        .attr("cx", function (d) {
            return xScale(d.date);
        })
        .attr("cy", function (d) {
            return yScale(computeHumanLifeCost(d));
        })
        .attr("fill", function (d) {
            return myColor(d.damage);
        });

    // selectionCities.exit().remove();

    let x_axis = d3.axisBottom(xScale);
    let y_axis = d3.axisLeft(yScale);

    d3.selectAll(".scatterXAxis").remove();
    d3.selectAll(".scatterYAxis").remove();

    svgScatterplot
        .append("g")
        .call(x_axis)
        .attr("class", "scatterXAxis")
        .attr("transform", "translate (" + [0, height - padding] + ")");

    svgScatterplot
        .append("g")
        .call(y_axis)
        .attr("class", "scatterYAxis")
        .attr("transform", "translate (" + [padding, 0] + ")");

    svgScatterplot
        .append("text")
        .attr("class", "scatterTitle")
        .attr("font-weight", "bold")
        .attr(
            "transform",
            "translate (" + [width / 2 - padding * 2.5, padding] + ")"
        )
        .text("Human Life Cost v. Time");

    // adding text
    selectionCitiesG
        .append("text")
        .attr("class", "city_data")
        .attr("x", function (d) {
            return xScale(d.date);
        })
        .attr("y", function (d) {
            return yScale(computeHumanLifeCost(d));
        })
        .text(function (d) {
            return computeHumanLifeCost(d) >= 2
                ? d.location +
                      ". Fatal: " +
                      d.fatal +
                      ", Serious: " +
                      d.serious +
                      ", Uninjured: " +
                      d.serious
                : "";
        });
}
