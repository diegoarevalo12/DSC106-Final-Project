let currentDataType = "temp"; // Default to temperature

document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
        d3.csv("data/Fem_Temp.csv"),
        d3.csv("data/Male_Temp.csv"),
        d3.csv("data/Fem_Act.csv"),
        d3.csv("data/Male_Act.csv")
    ]).then(function(files) {
        let femTemperature = files[0];
        let maleTemperature = files[1];
        let femActivity = files[2];
        let maleActivity = files[3];

        processAndStoreData(femTemperature, maleTemperature, femActivity, maleActivity);
    }).catch(function(error) {
        console.error("Error loading the CSV files:", error);
    });
});

let formattedData = { temp: {}, act: {} };

function processAndStoreData(femTemp, maleTemp, femAct, maleAct) {
    [femTemp, maleTemp, femAct, maleAct].forEach(dataset => {
        dataset.forEach(d => Object.keys(d).forEach(k => d[k] = +d[k]));
    });

    let numDays = femTemp.length / 1440;

    ["temp", "act"].forEach((type, index) => {
        let femData = index === 0 ? femTemp : femAct;
        let maleData = index === 0 ? maleTemp : maleAct;
        let avgFemalePerDay = [], avgMalePerDay = [];

        for (let day = 0; day < numDays; day++) {
            let startIdx = day * 1440, endIdx = (day + 1) * 1440;
            let dailyFemAvg = d3.mean(femData.slice(startIdx, endIdx).map(row => d3.mean(Object.values(row))));
            let dailyMaleAvg = d3.mean(maleData.slice(startIdx, endIdx).map(row => d3.mean(Object.values(row))));

            avgFemalePerDay.push({ day: day + 1, value: dailyFemAvg });
            avgMalePerDay.push({ day: day + 1, value: dailyMaleAvg });
        }

        formattedData[type] = { female: avgFemalePerDay, male: avgMaleAvgWrapper(avgMalePerDay) };
        // We use a helper function to ensure male data is stored properly.
        function avgMaleAvgWrapper(arr) { return arr; }
    });

    // Draw initial Temperature view
    drawLineChart(formattedData.temp.female, formattedData.temp.male, "Temperature (°C)");

    // Event Listeners
    document.getElementById("showTemperature").addEventListener("click", function () {
        currentDataType = "temp"; 
        drawLineChart(formattedData.temp.female, formattedData.temp.male, "Temperature (°C)");
    });

    document.getElementById("showActivity").addEventListener("click", function () {
        currentDataType = "act"; 
        drawLineChart(formattedData.act.female, formattedData.act.male, "Activity Level");
    });

    document.getElementById("showFemales").addEventListener("click", function () {
        drawLineChart(formattedData[currentDataType].female, null, currentDataType === "temp" ? "Temperature (°C)" : "Activity Level");
    });

    document.getElementById("showMales").addEventListener("click", function () {
        drawLineChart(null, formattedData[currentDataType].male, currentDataType === "temp" ? "Temperature (°C)" : "Activity Level");
    });

    document.getElementById("playPause").addEventListener("click", function () {
        if (!running) {
            running = true;
            d3.select(this).text("Pause");
            playAnimation();
        } else {
            running = false;
            d3.select(this).text("Play");
        }
    });

    drawBarChartRace(femTemp, femAct);
}

// Ensure tooltip exists only once
if (d3.select(".tooltip").empty()) {
    d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "lightgray")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("visibility", "hidden");
}
const tooltip = d3.select(".tooltip");

// Draw Chart with axes, dots, legends, labels, and tooltips
function drawLineChart(femaleData, maleData, yLabel) {
    const width = 800, height = 400, margin = { top: 50, right: 150, bottom: 60, left: 70 };

    d3.select("#chart").html(""); // Clear previous content

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Determine x-domain from available data
    const xDomain = [1, Math.max(femaleData ? femaleData.length : 0, maleData ? maleData.length : 0)];
    const xScale = d3.scaleLinear()
        .domain(xDomain)
        .range([0, width]);

    // Determine y-domain from available data arrays (or use defaults if missing)
    const allData = [];
    if (femaleData) { allData.push(...femaleData); }
    if (maleData) { allData.push(...maleData); }
    const yExtent = d3.extent(allData, d => d.value);
    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - 0.5, yExtent[1] + 0.5])
        .range([height, 0]);

    const lineGenerator = d3.line()
        .x(d => xScale(d.day))
        .y(d => yScale(d.value));

    // Add X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    // Add Y-axis
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Add X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Time (Days)");

    // Add Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(yLabel);

    // Plot female line and dots if data exists
    if (femaleData && femaleData.length) {
        svg.append("path")
            .datum(femaleData)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        svg.selectAll(".dot-female")
            .data(femaleData)
            .enter()
            .append("circle")
            .attr("class", "dot-female")
            .attr("cx", d => xScale(d.day))
            .attr("cy", d => yScale(d.value))
            .attr("r", 4)
            .attr("fill", "red")
            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .text(`Day ${d.day}: ${d.value.toFixed(2)} ${yLabel.includes("°C") ? "°C" : ""}`);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });
    }

    // Plot male line and dots if data exists
    if (maleData && maleData.length) {
        svg.append("path")
            .datum(maleData)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        svg.selectAll(".dot-male")
            .data(maleData)
            .enter()
            .append("circle")
            .attr("class", "dot-male")
            .attr("cx", d => xScale(d.day))
            .attr("cy", d => yScale(d.value))
            .attr("r", 4)
            .attr("fill", "blue")
            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .text(`Day ${d.day}: ${d.value.toFixed(2)} ${yLabel.includes("°C") ? "°C" : ""}`);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });
    }

    // Add legend
    svg.append("text")
        .attr("x", width + 10)
        .attr("y", 20)
        .attr("fill", "red")
        .text("Female");
    svg.append("text")
        .attr("x", width + 10)
        .attr("y", 40)
        .attr("fill", "blue")
        .text("Male");
}

function processBarChartData(femTemp, femAct) {
    console.log("Raw Temperature Data:", femTemp); 
    console.log("Raw Activity Data:", femAct); 

    let hourlyData = [];
    let numHours = femTemp.length / 60; // Convert minute data to hours

    for (let hour = 0; hour < numHours; hour++) {
        let startIdx = hour * 60, endIdx = (hour + 1) * 60;
        let dayNumber = Math.floor(hour / 24) + 1; // Calculate the day
        let hourOfDay = hour % 24; // Hour within the day

        let hourlyAvg = { day: dayNumber, hour: hourOfDay }; // Store Day and Hour Info

        // Calculate mean for each female mouse (Temperature & Activity)
        Object.keys(femTemp[0]).forEach(mouse => {
            if (mouse !== "day" && mouse !== "hour") { 
                hourlyAvg[`${mouse}_temp`] = d3.mean(femTemp.slice(startIdx, endIdx).map(row => row[mouse]));
                hourlyAvg[`${mouse}_act`] = d3.mean(femAct.slice(startIdx, endIdx).map(row => row[mouse]));
            }
        });

        console.log(`Day ${dayNumber}, Hour ${hourOfDay}:`, hourlyAvg); // Debugging
        hourlyData.push(hourlyAvg);
    }
    return hourlyData;
}

function drawBarChartRace(femTemp, femAct) {
    const width = 800, height = 700, margin = { top: 50, right: 50, bottom: 50, left: 150 };
    const barHeight = 20;
    const numMice = 13;
    const duration = 1000;

    let hourlyData = processBarChartData(femTemp, femAct);
    let minTemp = 35, maxTemp = 40;
    let maxActivity = d3.max(hourlyData, d => d3.max(Object.values(d).filter(v => typeof v === 'number')));

    let svg = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // X Scales for Temperature and Activity
    let xScaleTemp = d3.scaleLinear().domain([minTemp, maxTemp]).range([0, width / 2]);

    // Find the max activity value dynamically across all hours
    let maxActivityValue = d3.max(hourlyData, d =>
        d3.max(Object.keys(d).filter(k => k.includes("_act")).map(k => d[k]))
    );

    // Adjust xScaleAct to ensure correct proportions
    let xScaleAct = d3.scaleLinear()
        .domain([0, maxActivityValue])  // Scale based on the highest activity value
        .range([0, width - margin.right]);  // Keep it proportional to the width

    let yScale = d3.scaleBand()
        .domain(d3.range(numMice * 2)) // Multiply by 2 for Temp + Activity
        .range([0, numMice * 2 * barHeight])
        .padding(0.1);

    let xAxisTemp = d3.axisBottom(xScaleTemp).tickValues(d3.range(minTemp, maxTemp + 0.5, 0.5)).tickFormat(d => `${d.toFixed(1)}°C`);
    let xAxisAct = d3.axisBottom(xScaleAct).ticks(5);

    let yAxis = d3.axisLeft(yScale).tickFormat(i => `F${Math.floor(i / 2) + 1} ${i % 2 === 0 ? "Temp" : "Act"}`);

    // svg.append("g").attr("transform", `translate(0,${height})`).call(xAxisTemp);
    // svg.append("g").attr("transform", `translate(${width / 2},${height})`).call(xAxisAct);
    svg.append("g").call(yAxis);

    let bars = svg.selectAll(".bar")
        .data(Object.keys(hourlyData[0]).filter(d => d.includes("_temp") || d.includes("_act")))
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", (d, i) => yScale(i))
        .attr("height", yScale.bandwidth())
        .attr("fill", d => d.includes("_temp") ? "#FD2C4C" : "#FFA500");

    let labels = svg.selectAll(".label")
        .data(Object.keys(hourlyData[0]).filter(d => d.includes("_temp") || d.includes("_act")))
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("y", (d, i) => yScale(i) + yScale.bandwidth() / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "start");

    let hourText = svg.append("text")
        .attr("x", width - 180)
        .attr("y", -20)
        .attr("class", "hour-text")
        .style("font-size", "18px")
        .text("Day: 1, Hour: 0");

    let running = false;
    let currentHour = 0;
    let interval;

    function update(hour) {
        let data = hourlyData[hour];

        bars.transition().duration(duration)
            .attr("width", d => d.includes("_temp") ? xScaleTemp(data[d]) : xScaleAct(data[d]));

        labels.transition().duration(duration)
            .attr("x", d => {
                if (d.includes("_temp")) {
                    return xScaleTemp(data[d]) + 5; // Position slightly right of temperature bars
                } else {
                    return xScaleAct(data[d]) + 5; // Push activity labels further to the right
                }
            })
            .attr("y", (d, i) => yScale(i) + yScale.bandwidth() / 2 + 4) // Adjust vertical alignment
            .text(d => `${data[d].toFixed(2)}${d.includes("_temp") ? "°C" : ""}`);
        

        let currentDay = data.day;
        let currentHour = data.hour;
        hourText.text(`Day: ${currentDay}, Hour: ${currentHour + 1}`);
    }

    function playAnimation() {
        if (running) clearInterval(interval);
        running = true;
        interval = setInterval(() => {
            if (currentHour >= hourlyData.length - 1) currentHour = 0;
            else currentHour++;
            update(currentHour);
        }, duration);
    }
    
    // Add this immediately after `playAnimation()`
    d3.select("#resetButton").on("click", function () {
        clearInterval(interval); // Stop the animation if running
        running = false; // Mark animation as stopped
        currentHour = 0; // Reset to first hour
        update(currentHour); // Update chart to first hour
        d3.select("#playPause").text("Play"); // Reset Play button text
    });

    d3.select("#playPause").on("click", function () {
        if (running) {
            clearInterval(interval);
            running = false;
            d3.select(this).text("Play");
        } else {
            playAnimation();
            d3.select(this).text("Pause");
        }
    });

    update(0);
}

// Call the function with the processed temperature data
drawBarChartRace(femTemp, femAct);