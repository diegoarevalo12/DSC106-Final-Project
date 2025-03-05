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
