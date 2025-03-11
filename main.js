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
    // Default to Female Data First
    d3.select("#visualization-title").text("The Relationship Between Temperature and Activity: Female Mice");

    // Convert all dataset values to numeric
    [femTemp, maleTemp, femAct, maleAct].forEach(dataset => {
        dataset.forEach(d => {
            Object.keys(d).forEach(k => d[k] = +d[k]); // Convert values to numeric
        });
    });

    let numDays = femTemp.length / 1440; // Total days

    ["temp", "act"].forEach((type, index) => {
        let femData = index === 0 ? femTemp : femAct;
        let maleData = index === 0 ? maleTemp : maleAct;
        let avgFemalePerDay = [], avgMalePerDay = [];

        for (let day = 0; day < numDays; day++) {
            let startIdx = day * 1440, endIdx = (day + 1) * 1440;

            // Calculate mean values per day
            let dailyFemAvg = d3.mean(femData.slice(startIdx, endIdx).map(row => d3.mean(Object.values(row))));
            let dailyMaleAvg = d3.mean(maleData.slice(startIdx, endIdx).map(row => d3.mean(Object.values(row))));

            avgFemalePerDay.push({ day: day + 1, value: dailyFemAvg });
            avgMalePerDay.push({ day: day + 1, value: dailyMaleAvg });
        }

        formattedData[type] = { female: avgFemalePerDay, male: avgMalePerDay }; // Assign values
    });

    drawDualAxisChart(
        formattedData.temp.female, formattedData.act.female,
        "Female Temperature (°C)", "Female Activity Level", "female"
    );    

    // Attach event listeners to buttons
    document.getElementById("showFemales").addEventListener("click", function () {
        d3.select("#visualization-title").text("The Relationship Between Temperature and Activity: Female Mice");
        drawDualAxisChart(formattedData.temp.female, formattedData.act.female, "Female Temperature (°C)", "Female Activity Level", "female");
    });
    
    document.getElementById("showMales").addEventListener("click", function () {
        d3.select("#visualization-title").text("The Relationship Between Temperature and Activity: Male Mice");
        drawDualAxisChart(formattedData.temp.male, formattedData.act.male, "Male Temperature (°C)", "Male Activity Level", "male");
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

    // Call bar chart visualization
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

function drawDualAxisChart(tempData, actData, tempLabel, actLabel, gender) {
    d3.select("#chart-container").selectAll(".chart-subtitle").remove(); // Remove existing subtitles before inserting a new one
    d3.select("#chart").html(""); // Clear previous chart

    // Insert a subtitle dynamically
    d3.select("#chart-container")
        .insert("h3", ":first-child")
        .attr("class", "chart-subtitle")
        .style("text-align", "center")
        .style("margin-bottom", "10px")
        .text(gender === "female" ? "Female Mice Data" : "Male Mice Data");

    const svg = d3.select("#chart").append("svg")
        .attr("width", 850)
        .attr("height", 450);

    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
        .domain([1, tempData.length])
        .range([0, width]);

    const yScaleTemp = d3.scaleLinear()
        .domain([d3.min(tempData, d => d.value) - 0.5, d3.max(tempData, d => d.value) + 0.5])
        .range([height, 0]);

    const yScaleAct = d3.scaleLinear()
        .domain([d3.min(actData, d => d.value) - 5, d3.max(actData, d => d.value) + 5])
        .range([height, 0]);

    const lineTemp = d3.line()
        .x(d => xScale(d.day))
        .y(d => yScaleTemp(d.value));

    const lineAct = d3.line()
        .x(d => xScale(d.day))
        .y(d => yScaleAct(d.value));

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const colorScale = {
        temp: "red",      // Red for temperature (female & male)
        act: "orange"     // Orange for activity (female & male)
    };

    const legendData = [
        { label: "Temperature", color: "red" },
        { label: "Activity", color: "orange" }
    ];
    
    const legend = svg.selectAll(".legend")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);
    
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", d => d.color);
    
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(d => d.label);    
        
    // Tooltip
    const tooltip = d3.select(".tooltip");

    function showTooltip(event, d, type) {
        let valueLabel = type === "temp" ? "Temperature" : "Activity";
        let unit = type === "temp" ? "°C" : "";
    
        tooltip.style("visibility", "visible")
            .html(`Day: ${d.day}<br>${valueLabel}: ${d.value.toFixed(2)}${unit}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    }
    
    function hideTooltip() {
        tooltip.style("visibility", "hidden");
    }

    // Temperature Line
    g.append("path")
        .datum(tempData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", lineTemp);

    // Activity Line
    g.append("path")
        .datum(actData)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("d", lineAct);

    // Data points for Temperature
    g.selectAll(".temp-dot")
        .data(tempData)
        .enter()
        .append("circle")
        .attr("class", "temp-dot")
        .attr("cx", d => xScale(d.day))
        .attr("cy", d => yScaleTemp(d.value))
        .attr("r", 5)
        .attr("fill", "red")
        .on("mouseover", (event, d) => showTooltip(event, d, "temp"))  // <-- Pass "temp"
        .on("mouseout", hideTooltip);

    // Data points for Activity
    g.selectAll(".act-dot")
        .data(actData)
        .enter()
        .append("circle")
        .attr("class", "act-dot")
        .attr("cx", d => xScale(d.day))
        .attr("cy", d => yScaleAct(d.value))
        .attr("r", 5)
        .attr("fill", "orange")
        .on("mouseover", (event, d) => showTooltip(event, d, "act"))  // <-- Pass "act"
        .on("mouseout", hideTooltip);

    // Axes
    g.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(xScale));
    g.append("g").call(d3.axisLeft(yScaleTemp));
    g.append("g").attr("transform", `translate(${width}, 0)`).call(d3.axisRight(yScaleAct));

    // Labels
    g.append("text")
        .attr("transform", `translate(${width / 2}, ${height + 40})`)
        .style("text-anchor", "middle")
        .text("Time (Days)");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .text(tempLabel);

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", width + margin.right - 15)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .text(actLabel);
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