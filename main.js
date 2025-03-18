// Global variables to store data
let femActData, femTempData, maleActData, maleTempData;
let selectedGender = 'female';
let selectedPeriod = '24h';
let selectedMouse = 'average';

// Constants
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

// Colors
const COLORS = {
    temp: '#ef4444',
    tempLight: 'rgba(239, 68, 68, 0.1)',
    act: '#3b82f6',
    actLight: 'rgba(59, 130, 246, 0.1)',
    female: '#db2777',
    male: '#2563eb',
};

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for controls (existing code)
    document.getElementById('gender-select').addEventListener('change', function() {
        selectedGender = this.value;
        
        // Update mouse select options based on gender
        initializeMouseDropdown();
        
        updateVisualizations();
    });
    
    document.getElementById('time-period').addEventListener('change', function() {
        selectedPeriod = this.value;
        updateVisualizations();
    });
    
    document.getElementById('mouse-select').addEventListener('change', function() {
        selectedMouse = this.value;
        updateVisualizations();
    });
    
    // Load data - using numeric parsing for the CSV data
    Promise.all([
        d3.csv('data/Fem_Act.csv', d => {
            const parsed = {};
            Object.keys(d).forEach(key => {
                parsed[key] = parseFloat(d[key]);
            });
            return parsed;
        }),
        d3.csv('data/Fem_Temp.csv', d => {
            const parsed = {};
            Object.keys(d).forEach(key => {
                parsed[key] = parseFloat(d[key]);
            });
            return parsed;
        }),
        d3.csv('data/Male_Act.csv', d => {
            const parsed = {};
            Object.keys(d).forEach(key => {
                parsed[key] = parseFloat(d[key]);
            });
            return parsed;
        }),
        d3.csv('data/Male_Temp.csv', d => {
            const parsed = {};
            Object.keys(d).forEach(key => {
                parsed[key] = parseFloat(d[key]);
            });
            return parsed;
        })
    ]).then(function(files) {
        femActData = files[0];
        femTempData = files[1];
        maleActData = files[2];
        maleTempData = files[3];
        
        console.log("Data loaded successfully");
        console.log(`Female Activity: ${femActData.length} rows`);
        console.log(`Female Temperature: ${femTempData.length} rows`);
        console.log(`Male Activity: ${maleActData.length} rows`);
        console.log(`Male Temperature: ${maleTempData.length} rows`);
        
        // Debug check for male data - verify the structure and content
        if (maleActData && maleActData.length > 0) {
            console.log("Sample male activity data (first row):", maleActData[0]);
            console.log("Available male activity columns:", Object.keys(maleActData[0]));
        } else {
            console.error("Male activity data is empty or undefined!");
        }
        
        if (maleTempData && maleTempData.length > 0) {
            console.log("Sample male temperature data (first row):", maleTempData[0]);
            console.log("Available male temperature columns:", Object.keys(maleTempData[0]));
        } else {
            console.error("Male temperature data is empty or undefined!");
        }
        
        // Initialize mouse dropdown based on default gender (female)
        initializeMouseDropdown();
        
        // Initialize visualizations
        initializeVisualizations();
    }).catch(function(error) {
        // Add error handling for data loading
        console.error("Error loading data files:", error);
        alert("Error loading data. Please check console for details.");
    });
});

// Initialize all visualizations
function initializeVisualizations() {
    createTimeSeriesChart();
    createScatterPlot();
    createDailyActivityChart();
    createDailyTempChart();
    createActivityHeatmap();
    updateSummaryText();
    
    // Show success message
    console.log('All visualizations initialized successfully');
}

// Update all visualizations based on selection
function updateVisualizations() {
    // Clear existing visualizations
    d3.selectAll('.chart-container svg').remove();
    
    // Recreate charts with new selections
    createTimeSeriesChart();
    createScatterPlot();
    createDailyActivityChart();
    createDailyTempChart();
    createActivityHeatmap();
    updateSummaryText();
    
    // Log update
    console.log(`Updated visualizations: Gender=${selectedGender}, Period=${selectedPeriod}, Mouse=${selectedMouse}`);
}

// Process data based on current selection
function getFilteredData() {
    let actData = [];
    let tempData = [];
    
    // Filter by gender and verify data exists
    if (selectedGender === 'female') {
        if (!femActData || !femTempData) {
            console.error("Female data not available");
            return { actData: [], tempData: [] };
        }
        actData = [...femActData]; // Use spread operator to create a copy
        tempData = [...femTempData];
    } else {
        if (!maleActData || !maleTempData) {
            console.error("Male data not available");
            return { actData: [], tempData: [] };
        }
        actData = [...maleActData]; // Use spread operator to create a copy
        tempData = [...maleTempData];
    }
    
    // Add debug information
    console.log(`getFilteredData: ${selectedGender} data, actData length: ${actData.length}, tempData length: ${tempData.length}`);
    
    // Filter by time period
    let periodInMinutes;
    switch (selectedPeriod) {
        case '24h':
            periodInMinutes = MINUTES_PER_DAY;
            break;
        case '7d':
            periodInMinutes = MINUTES_PER_DAY * 7;
            break;
        case '14d':
            periodInMinutes = MINUTES_PER_DAY * 14;
            break;
        default:
            periodInMinutes = MINUTES_PER_DAY;
    }
    
    // Check if we have enough data for the selected period
    if (actData.length < periodInMinutes) {
        console.warn(`Not enough activity data for selected period. Requested: ${periodInMinutes}, Available: ${actData.length}`);
        periodInMinutes = Math.min(periodInMinutes, actData.length);
    }
    
    if (tempData.length < periodInMinutes) {
        console.warn(`Not enough temperature data for selected period. Requested: ${periodInMinutes}, Available: ${tempData.length}`);
        periodInMinutes = Math.min(periodInMinutes, tempData.length);
    }
    
    actData = actData.slice(0, periodInMinutes);
    tempData = tempData.slice(0, periodInMinutes);
    
    return { actData, tempData };
}

// Get list of mouse IDs based on gender selection
function getMouseIds() {
    const femaleIds = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13'];
    const maleIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13'];
    
    if (selectedGender === 'female') {
        return femaleIds;
    } else {
        return maleIds;
    }
}

// Calculate hourly averages for a dataset
function calculateHourlyAverages(data, mouseIds) {
    const hoursInPeriod = Math.floor(data.length / MINUTES_PER_HOUR);
    const hourlyData = [];
    
    for (let hour = 0; hour < hoursInPeriod; hour++) {
        const startIdx = hour * MINUTES_PER_HOUR;
        const endIdx = startIdx + MINUTES_PER_HOUR;
        const hourSlice = data.slice(startIdx, endIdx);
        
        // Calculate average for each mouse for this hour
        const hourAvg = { hour: hour % HOURS_PER_DAY };
        let sum = 0;
        let count = 0;
        
        mouseIds.forEach(id => {
            const values = hourSlice.map(row => parseFloat(row[id])).filter(val => !isNaN(val));
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                hourAvg[id] = avg;
                sum += avg;
                count++;
            }
        });
        
        // Calculate overall average for all selected mice
        hourAvg.average = count > 0 ? sum / count : 0;
        hourlyData.push(hourAvg);
    }
    
    return hourlyData;
}

// Create time series chart showing temperature and activity over time
function createTimeSeriesChart() {
    const { actData, tempData } = getFilteredData();
    
    // Check if we have data to display
    if (!actData || actData.length === 0 || !tempData || tempData.length === 0) {
        console.error("No data available for time series chart");
        
        // Display an error message in the chart container
        const container = document.getElementById('time-series-chart');
        d3.select(container)
            .append('div')
            .attr('class', 'error-message')
            .style('color', 'red')
            .style('padding', '20px')
            .style('text-align', 'center')
            .html('No data available for the selected options.');
            
        return;
    }
    
    const mouseIds = getMouseIds();
    
    // Container dimensions
    const container = document.getElementById('time-series-chart');
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 30, right: 50, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#time-series-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create tooltip div if it doesn't exist
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('padding', '10px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', 1000);
    }
    
    // Prepare data for visualization
    const combinedData = [];
    
    // If average is selected, calculate averages across all mice
    if (selectedMouse === 'average') {
        for (let i = 0; i < Math.min(actData.length, tempData.length); i++) {
            const actRow = actData[i];
            const tempRow = tempData[i];
            
            if (!actRow || !tempRow) {
                console.warn(`Missing data at index ${i}`);
                continue;
            }
            
            // Calculate average activity and temperature across all applicable mice
            let sumAct = 0, sumTemp = 0, countAct = 0, countTemp = 0;
            
            mouseIds.forEach(id => {
                if (actRow[id] !== undefined && !isNaN(actRow[id])) {
                    sumAct += actRow[id];
                    countAct++;
                }
                if (tempRow[id] !== undefined && !isNaN(tempRow[id])) {
                    sumTemp += tempRow[id];
                    countTemp++;
                }
            });
            
            const avgAct = countAct > 0 ? sumAct / countAct : 0;
            const avgTemp = countTemp > 0 ? sumTemp / countTemp : 0;
            
            combinedData.push({
                minute: i,
                activity: avgAct,
                temperature: avgTemp
            });
        }
    } else {
        // Use data for specific mouse
        for (let i = 0; i < Math.min(actData.length, tempData.length); i++) {
            const actRow = actData[i];
            const tempRow = tempData[i];
            
            if (!actRow || !tempRow) {
                console.warn(`Missing data at index ${i}`);
                continue;
            }
            
            const activity = actRow[selectedMouse];
            const temperature = tempRow[selectedMouse];
            
            combinedData.push({
                minute: i,
                activity: activity !== undefined && !isNaN(activity) ? activity : 0,
                temperature: temperature !== undefined && !isNaN(temperature) ? temperature : 0
            });
        }
    }
    
    // Check if we have any valid data points after processing
    if (combinedData.length === 0) {
        console.error("No valid data points for time series chart");
        
        // Display an error message in the chart container
        d3.select(container)
            .append('div')
            .attr('class', 'error-message')
            .style('color', 'red')
            .style('padding', '20px')
            .style('text-align', 'center')
            .html('No valid data points for the selected options.');
            
        return;
    }
    
    // Create scales
    const xScale = d3.scaleLinear()
        .domain([0, combinedData.length - 1])
        .range([0, chartWidth]);
    
    const yScaleTemp = d3.scaleLinear()
        .domain([
            d3.min(combinedData, d => d.temperature) * 0.99,
            d3.max(combinedData, d => d.temperature) * 1.01
        ])
        .range([chartHeight, 0]);
    
    const yScaleAct = d3.scaleLinear()
        .domain([0, d3.max(combinedData, d => d.activity) * 1.05])
        .range([chartHeight, 0]);
    
    // Create lines
    const tempLine = d3.line()
        .x(d => xScale(d.minute))
        .y(d => yScaleTemp(d.temperature))
        .curve(d3.curveMonotoneX);
    
    const actLine = d3.line()
        .x(d => xScale(d.minute))
        .y(d => yScaleAct(d.activity))
        .curve(d3.curveMonotoneX);
    
    // Add areas
    chart.append('path')
        .datum(combinedData)
        .attr('class', 'area-temp')
        .attr('d', d3.area()
            .x(d => xScale(d.minute))
            .y0(chartHeight)
            .y1(d => yScaleTemp(d.temperature))
            .curve(d3.curveMonotoneX)
        );
    
    chart.append('path')
        .datum(combinedData)
        .attr('class', 'area-act')
        .attr('d', d3.area()
            .x(d => xScale(d.minute))
            .y0(chartHeight)
            .y1(d => yScaleAct(d.activity))
            .curve(d3.curveMonotoneX)
        );
    
    // Add lines
    chart.append('path')
        .datum(combinedData)
        .attr('class', 'line-temp')
        .attr('d', tempLine);
    
    chart.append('path')
        .datum(combinedData)
        .attr('class', 'line-act')
        .attr('d', actLine);
    
    // Create x-axis with proper tick formatting
    const xAxis = d3.axisBottom(xScale);
    
    // Format the ticks differently based on the selected time period
    if (selectedPeriod === '24h') {
        // For 24-hour view, show hour marks (0h, 4h, 8h, etc.)
        xAxis.ticks(12)
            .tickFormat(d => {
                const hours = Math.floor(d / 60);
                return `${hours}h`;
            });
    } else if (selectedPeriod === '7d') {
        // For 7-day view, show one tick per day
        const dayWidth = MINUTES_PER_DAY;
        const dayTicks = [];
        for (let i = 0; i < 7; i++) {
            dayTicks.push(i * dayWidth);
        }
        xAxis.tickValues(dayTicks)
            .tickFormat(d => {
                const days = Math.floor(d / MINUTES_PER_DAY) + 1;
                return `Day ${days}`;
            });
    } else if (selectedPeriod === '14d') {
        // For 14-day view, show one tick every other day
        const dayWidth = MINUTES_PER_DAY;
        const dayTicks = [];
        for (let i = 0; i < 14; i += 2) {
            dayTicks.push(i * dayWidth);
        }
        xAxis.tickValues(dayTicks)
            .tickFormat(d => {
                const days = Math.floor(d / MINUTES_PER_DAY) + 1;
                return `Day ${days}`;
            });
    }
    
    // Create y-axes
    const yAxisTemp = d3.axisLeft(yScaleTemp)
        .ticks(5);
    
    const yAxisAct = d3.axisRight(yScaleAct)
        .ticks(5);
    
    // Add all axes to the chart
    chart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'middle')
        .attr('dy', '1em');
    
    chart.append('g')
        .attr('class', 'y-axis-temp')
        .call(yAxisTemp);
    
    chart.append('g')
        .attr('class', 'y-axis-act')
        .attr('transform', `translate(${chartWidth}, 0)`)
        .call(yAxisAct);
    
    // Add axis labels
    chart.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .text('Time');
    
    chart.append('text')
        .attr('class', 'y-axis-label-temp')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .style('text-anchor', 'middle')
        .style('fill', COLORS.temp)
        .text('Temperature (°C)');
    
    chart.append('text')
        .attr('class', 'y-axis-label-act')
        .attr('transform', 'rotate(90)')
        .attr('x', chartHeight / 2)
        .attr('y', -chartWidth - margin.right + 15)
        .style('text-anchor', 'middle')
        .style('fill', COLORS.act)
        .text('Activity Level');
    
    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${margin.left}, 10)`);
    
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', COLORS.temp);
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text('Temperature');
    
    legend.append('rect')
        .attr('x', 120)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', COLORS.act);
    
    legend.append('text')
        .attr('x', 140)
        .attr('y', 12)
        .text('Activity');
    
    // Add title
    const mouseLabel = selectedMouse === 'average' ? 'Average' : selectedMouse;
    const genderLabel = selectedGender === 'all' ? 'All Mice' : 
                       (selectedGender === 'female' ? 'Female Mice' : 'Male Mice');
    
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text(`${mouseLabel} - ${genderLabel}`);
    
    // Add tooltip capture rectangles
    const tooltipWidth = chartWidth / combinedData.length;
    chart.selectAll('.tooltip-area')
        .data(combinedData)
        .enter()
        .append('rect')
        .attr('class', 'tooltip-area')
        .attr('x', (d, i) => xScale(i) - tooltipWidth/2)
        .attr('y', 0)
        .attr('width', tooltipWidth)
        .attr('height', chartHeight)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            // Format time for display
            const minutes = d.minute;
            const hours = Math.floor(minutes / 60) % 24;
            const days = Math.floor(minutes / (24 * 60)) + 1;
            const timeDisplay = selectedPeriod === '24h' 
                ? `${hours}:${(minutes % 60).toString().padStart(2, '0')}`
                : `Day ${days}, ${hours}:${(minutes % 60).toString().padStart(2, '0')}`;
            
            // Show tooltip with data
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            
            tooltip.html(`
                <strong>Time:</strong> ${timeDisplay}<br>
                <strong>Temperature:</strong> ${d.temperature.toFixed(2)} °C<br>
                <strong>Activity:</strong> ${d.activity.toFixed(2)}
            `)
                .style('left', `${event.pageX + 15}px`)
                .style('top', `${event.pageY - 28}px`);
                
            // Add highlight circles at the current data point
            chart.append('circle')
                .attr('class', 'highlight-temp')
                .attr('cx', xScale(d.minute))
                .attr('cy', yScaleTemp(d.temperature))
                .attr('r', 5)
                .attr('fill', COLORS.temp)
                .attr('stroke', 'white');
                
            chart.append('circle')
                .attr('class', 'highlight-act')
                .attr('cx', xScale(d.minute))
                .attr('cy', yScaleAct(d.activity))
                .attr('r', 5)
                .attr('fill', COLORS.act)
                .attr('stroke', 'white');
        })
        .on('mouseout', function() {
            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
                
            // Remove highlight circles
            chart.selectAll('.highlight-temp, .highlight-act').remove();
        });
}

// Create scatter plot to show correlation between temperature and activity
function createScatterPlot() {
    const { actData, tempData } = getFilteredData();
    const mouseIds = getMouseIds();
    
    // Container dimensions
    const container = document.getElementById('scatter-plot');
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#scatter-plot')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Create tooltip div (if it doesn't exist)
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('padding', '10px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', 1000);
    }
    
    // Prepare data for scatter plot (no animation)
    const scatterData = [];
    
    // Sample data to prevent too many points
    const sampleRate = Math.max(1, Math.floor(actData.length / 300));
    
    // If a specific mouse is selected, we'll only show data for that mouse
    const isMouseSelected = selectedMouse !== 'average';
    
    for (let i = 0; i < actData.length; i += sampleRate) {
        // If a specific mouse is selected, only process that mouse's data
        const mousesToProcess = isMouseSelected ? [selectedMouse] : mouseIds;
        
        mousesToProcess.forEach(id => {
            const act = actData[i] ? actData[i][id] : null;
            const temp = tempData[i] ? tempData[i][id] : null;
            
            if (act !== null && temp !== null && !isNaN(act) && !isNaN(temp)) {
                // Add time information to data points
                const minute = i;
                const hour = Math.floor(minute / 60) % 24;
                const day = Math.floor(minute / (24 * 60)) + 1;
                
                scatterData.push({
                    mouseId: id,
                    activity: act,
                    temperature: temp,
                    minute: minute,
                    hour: hour,
                    day: day,
                    timeString: `Day ${day}, ${hour}:${(minute % 60).toString().padStart(2, '0')}`
                });
            }
        });
    }
    
    console.log("Scatter data points:", scatterData.length);
    console.log("Female points:", scatterData.filter(d => d.mouseId.startsWith('f')).length);
    console.log("Male points:", scatterData.filter(d => d.mouseId.startsWith('m')).length);
    
    // Create scales
    const xScale = d3.scaleLinear()
        .domain([
            d3.min(scatterData, d => d.temperature) * 0.99,
            d3.max(scatterData, d => d.temperature) * 1.01
        ])
        .range([0, chartWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(scatterData, d => d.activity) * 1.05])
        .range([chartHeight, 0]);
    
    // Create color scale based on mouse ID
    const colorScale = d => {
        // If a specific mouse is selected
        if (selectedMouse !== 'average') {
            // Highlight the selected mouse with full color
            if (d.mouseId === selectedMouse) {
                return d.mouseId.startsWith('f') ? COLORS.female : COLORS.male;
            }
            // For other mice, return a very light gray
            return '#e5e7eb';
        } else {
            // Regular coloring by gender for the "average" view
            return d.mouseId.startsWith('f') ? COLORS.female : COLORS.male;
        }
    };
    
    // Add dots
    chart.selectAll('.dot')
        .data(scatterData)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.temperature))
        .attr('cy', d => yScale(d.activity))
        .attr('r', d => d.mouseId === selectedMouse ? 4 : 3) // Slightly larger for selected mouse
        .attr('fill', d => colorScale(d))
        .attr('opacity', d => {
            if (selectedMouse !== 'average') {
                // Higher opacity for selected mouse, lower for others
                return d.mouseId === selectedMouse ? 0.8 : 0.3;
            }
            return 0.6; // Default opacity
        })
        .attr('stroke', d => colorScale(d))
        .attr('stroke-width', d => d.mouseId === selectedMouse ? 1.5 : 1) // Thicker stroke for selected mouse
        // Add tooltip event handlers
        .on('mouseover', function(event, d) {
            // Enlarge the dot on hover
            d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 6)
                .attr('opacity', 1);
            
            // Show tooltip
            tooltip.transition()
                .duration(100)
                .style('opacity', 0.9);
            
            // Format the tooltip content
            tooltip.html(`
                <strong>${d.mouseId.startsWith('f') ? 'Female ' : 'Male '}${d.mouseId.substring(1)}</strong><br>
                <strong>Time:</strong> ${d.timeString}<br>
                <strong>Temp:</strong> ${d.temperature.toFixed(2)}°C<br>
                <strong>Activity:</strong> ${d.activity.toFixed(2)}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseout', function() {
            // Return dot to original size
            d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 3)
                .attr('opacity', 0.6);
            
            // Hide tooltip
            tooltip.transition()
                .duration(100)
                .style('opacity', 0);
        });
    
    // Add regression line if enough data points
    if (scatterData.length >= 10) {
        // Calculate simple linear regression
        const xMean = d3.mean(scatterData, d => d.temperature);
        const yMean = d3.mean(scatterData, d => d.activity);
        
        let numerator = 0;
        let denominator = 0;
        
        scatterData.forEach(d => {
            const xDiff = d.temperature - xMean;
            const yDiff = d.activity - yMean;
            numerator += xDiff * yDiff;
            denominator += xDiff * xDiff;
        });
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = yMean - slope * xMean;
        
        // Calculate correlation coefficient
        let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
        
        scatterData.forEach(d => {
            sumXY += d.temperature * d.activity;
            sumX += d.temperature;
            sumY += d.activity;
            sumX2 += d.temperature * d.temperature;
            sumY2 += d.activity * d.activity;
        });
        
        const n = scatterData.length;
        const numeratorR = n * sumXY - sumX * sumY;
        const denominatorR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        const r = denominatorR !== 0 ? numeratorR / denominatorR : 0;
        
        // Create a line function using the regression parameters
        const regressionLine = d3.line()
            .x(d => d)
            .y(d => slope * d + intercept);
        
        // Add correlation text
        chart.append('text')
            .attr('x', chartWidth - 10)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .text(`Correlation (r): ${r.toFixed(3)}`);
    }
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d => `${d.toFixed(1)}°C`);
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(5);
    
    // Add axes to chart
    chart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);
    
    chart.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
    
    // Add axis labels
    chart.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .text('Temperature (°C)');
    
    chart.append('text')
        .attr('class', 'y-axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .style('text-anchor', 'middle')
        .text('Activity Level');
    
    // Add legend if showing all mice
    if (selectedMouse === 'average') {
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${margin.left}, 10)`);
        
        if (selectedGender === 'all') {
            legend.append('circle')
                .attr('cx', 7.5)
                .attr('cy', 7.5)
                .attr('r', 5)
                .attr('fill', COLORS.female);
            
            legend.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .text('Female');
            
            legend.append('circle')
                .attr('cx', 87.5)
                .attr('cy', 7.5)
                .attr('r', 5)
                .attr('fill', COLORS.male);
            
            legend.append('text')
                .attr('x', 100)
                .attr('y', 12)
                .text('Male');
        }
    }
    
    // Add title
    const mouseLabel = selectedMouse === 'average' ? 'All Mice' : selectedMouse;
    const genderLabel = selectedGender === 'all' ? '' : 
                       (selectedGender === 'female' ? '(Females)' : '(Males)');
    
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text(`Temperature vs Activity: ${mouseLabel} ${genderLabel}`);
}

// Create a 24-hour activity pattern chart
function createDailyActivityChart() {
    const { actData } = getFilteredData();
    const mouseIds = getMouseIds();
    
    // Container dimensions
    const container = document.getElementById('daily-activity-chart');
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#daily-activity-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Calculate hourly averages
    const hourlyData = calculateHourlyAverages(actData, mouseIds);
    
    // Use a different array for days in the dataset
    const dayCount = Math.floor(actData.length / (24 * 60));
    const daysData = [];
    
    // For each day in the dataset
    for (let day = 0; day < dayCount; day++) {
        // Get data for this day
        const start = day * 24;
        const end = start + 24;
        const dayHours = hourlyData.slice(start, end);
        
        // Skip if we don't have 24 hours
        if (dayHours.length < 24) continue;
        
        // Plot this day's data
        const dayData = dayHours.map((hour, i) => ({
            hour: i,
            activity: selectedMouse === 'average' ? hour.average : hour[selectedMouse] || 0
        }));
        
        daysData.push(dayData);
    }
    
    // Calculate the average across all days for each hour
    const avgDailyData = Array(24).fill().map((_, hour) => {
        const hourValues = daysData.map(day => day[hour].activity).filter(v => !isNaN(v));
        return {
            hour,
            activity: hourValues.length > 0 ? d3.mean(hourValues) : 0
        };
    });

    // Create tooltip div if it doesn't exist
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('padding', '10px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', 1000);
    }
    
    // Create scales
    const xScale = d3.scaleLinear()
        .domain([0, 23])
        .range([0, chartWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(avgDailyData, d => d.activity) * 1.1])
        .range([chartHeight, 0]);
    
    // Create line
    const activityLine = d3.line()
        .x(d => xScale(d.hour))
        .y(d => yScale(d.activity))
        .curve(d3.curveMonotoneX);
    
    // Add area
    chart.append('path')
        .datum(avgDailyData)
        .attr('class', 'area-act')
        .attr('d', d3.area()
            .x(d => xScale(d.hour))
            .y0(chartHeight)
            .y1(d => yScale(d.activity))
            .curve(d3.curveMonotoneX)
        );
    
    // Add line
    chart.append('path')
        .datum(avgDailyData)
        .attr('class', 'line-act')
        .attr('d', activityLine);

    // Make sure to remove any existing .point elements before adding new ones
    chart.selectAll('.point').remove();
    
    // Add points with tooltip functionality
    chart.selectAll('.point')
        .data(avgDailyData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.hour))
        .attr('cy', d => yScale(d.activity))
        .attr('r', 4)
        .attr('fill', COLORS.act)
        .on('mouseover', function(event, d) {
            // Enlarge the point on hover
            d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 7);
            
            // Show tooltip with formatted time
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            
            const hourFormatted = d.hour.toString().padStart(2, '0');
            
            tooltip.html(`
                <strong>Time:</strong> ${hourFormatted}:00<br>
                <strong>Activity:</strong> ${d.activity.toFixed(2)}<br>
                ${d.activity > overallAvg ? 
                  `<span style="color: #8AFF8A">Above average</span>` : 
                  `<span style="color: #FF8A8A">Below average</span>`}
            `)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 15}px`);
        })
        .on('mouseout', function() {
            // Return to original size
            d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 4);
            
            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
    
    // Add points
    chart.selectAll('.point')
        .data(avgDailyData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.hour))
        .attr('cy', d => yScale(d.activity))
        .attr('r', 4)
        .attr('fill', COLORS.act);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(12)
        .tickFormat(h => `${h}:00`);
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(5);
    
    // Add axes to chart
    chart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);
    
    chart.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
    
    // Highlight active/inactive periods
    // Mice are typically active at night (roughly 18:00-6:00)
    const activeStartHour = 18;
    const activeEndHour = 6;
    
    // Create the active period rectangle (wrapping around midnight)
    if (activeEndHour < activeStartHour) {
        // Evening active period (from active start to midnight)
        chart.append('rect')
            .attr('class', 'active-period')
            .attr('x', xScale(activeStartHour))
            .attr('y', 0)
            .attr('width', xScale(24) - xScale(activeStartHour))
            .attr('height', chartHeight)
            .attr('fill', 'rgba(0, 0, 0, 0.1)')
            .attr('opacity', 0.5);
        
        // Early morning active period (from midnight to active end)
        chart.append('rect')
            .attr('class', 'active-period')
            .attr('x', xScale(0))
            .attr('y', 0)
            .attr('width', xScale(activeEndHour))
            .attr('height', chartHeight)
            .attr('fill', 'rgba(0, 0, 0, 0.1)')
            .attr('opacity', 0.5);
    } else {
        chart.append('rect')
            .attr('class', 'active-period')
            .attr('x', xScale(activeStartHour))
            .attr('y', 0)
            .attr('width', xScale(activeEndHour) - xScale(activeStartHour))
            .attr('height', chartHeight)
            .attr('fill', 'rgba(0, 0, 0, 0.1)')
            .attr('opacity', 0.5);
    }
    
    // Add a dotted line for the overall average
    const overallAvg = d3.mean(avgDailyData, d => d.activity);
    
    chart.append('line')
        .attr('class', 'avg-line')
        .attr('x1', 0)
        .attr('y1', yScale(overallAvg))
        .attr('x2', chartWidth)
        .attr('y2', yScale(overallAvg))
        .attr('stroke', '#888')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    
    chart.append('text')
        .attr('class', 'avg-label')
        .attr('x', 5)
        .attr('y', yScale(overallAvg) - 5)
        .style('font-size', '10px')
        .style('fill', '#888')
        .text(`Avg: ${overallAvg.toFixed(1)}`);
    
    // Add axis labels
    chart.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .text('Hour of Day');
    
    chart.append('text')
        .attr('class', 'y-axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .style('text-anchor', 'middle')
        .text('Activity Level');
    
    // Add title
    const mouseLabel = selectedMouse === 'average' ? 'Average' : selectedMouse;
    const genderLabel = selectedGender === 'all' ? 'All Mice' : 
                       (selectedGender === 'female' ? 'Female Mice' : 'Male Mice');
    
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text(`${mouseLabel} Activity - ${genderLabel}`);
}

// Create a 24-hour temperature pattern chart
function createDailyTempChart() {
    const { tempData } = getFilteredData();
    const mouseIds = getMouseIds();
    
    // Container dimensions
    const container = document.getElementById('daily-temp-chart');
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#daily-temp-chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Calculate hourly averages
    const hourlyData = calculateHourlyAverages(tempData, mouseIds);

    // Create tooltip div if it doesn't exist
    let tooltip = d3.select('body').select('.tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('padding', '10px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', 1000);
    }
    
    // Use a different array for days in the dataset
    const dayCount = Math.floor(tempData.length / (24 * 60));
    const daysData = [];
    
    // For each day in the dataset
    for (let day = 0; day < dayCount; day++) {
        // Get data for this day
        const start = day * 24;
        const end = start + 24;
        const dayHours = hourlyData.slice(start, end);
        
        // Skip if we don't have 24 hours
        if (dayHours.length < 24) continue;
        
        // Plot this day's data
        const dayData = dayHours.map((hour, i) => ({
            hour: i,
            temperature: selectedMouse === 'average' ? hour.average : hour[selectedMouse] || 0
        }));
        
        daysData.push(dayData);
    }
    
    // Calculate the average across all days for each hour
    const avgDailyData = Array(24).fill().map((_, hour) => {
        const hourValues = daysData.map(day => day[hour].temperature).filter(v => !isNaN(v));
        return {
            hour,
            temperature: hourValues.length > 0 ? d3.mean(hourValues) : 0
        };
    });
    
    // Create scales
    const xScale = d3.scaleLinear()
        .domain([0, 23])
        .range([0, chartWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([
            d3.min(avgDailyData, d => d.temperature) * 0.99,
            d3.max(avgDailyData, d => d.temperature) * 1.01
        ])
        .range([chartHeight, 0]);
    
    // Create line
    const temperatureLine = d3.line()
        .x(d => xScale(d.hour))
        .y(d => yScale(d.temperature))
        .curve(d3.curveMonotoneX);
    
    // Add area
    chart.append('path')
        .datum(avgDailyData)
        .attr('class', 'area-temp')
        .attr('d', d3.area()
            .x(d => xScale(d.hour))
            .y0(chartHeight)
            .y1(d => yScale(d.temperature))
            .curve(d3.curveMonotoneX)
        );
    
    // Add line
    chart.append('path')
        .datum(avgDailyData)
        .attr('class', 'line-temp')
        .attr('d', temperatureLine);

    // Make sure to remove any existing .point elements before adding new ones
    chart.selectAll('.point').remove();
    
    // Add points with tooltip functionality
    chart.selectAll('.point')
        .data(avgDailyData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.hour))
        .attr('cy', d => yScale(d.temperature))
        .attr('r', 4)
        .attr('fill', COLORS.temp)
        .on('mouseover', function(event, d) {
            // Enlarge the point on hover
            d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 7);
            
            // Show tooltip with formatted time
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            
            const hourFormatted = d.hour.toString().padStart(2, '0');
            
            tooltip.html(`
                <strong>Time:</strong> ${hourFormatted}:00<br>
                <strong>Temperature:</strong> ${d.temperature.toFixed(2)} °C<br>
                ${d.temperature > overallAvg ? 
                  `<span style="color: #FF8A8A">Above average</span>` : 
                  `<span style="color: #8AFF8A">Below average</span>`}
            `)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 15}px`);
        })
        .on('mouseout', function() {
            // Return to original size
            d3.select(this)
                .transition()
                .duration(100)
                .attr('r', 4);
            
            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
    
    // Add points
    chart.selectAll('.point')
        .data(avgDailyData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.hour))
        .attr('cy', d => yScale(d.temperature))
        .attr('r', 4)
        .attr('fill', COLORS.temp);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(12)
        .tickFormat(h => `${h}:00`);
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `${d.toFixed(1)}°C`);
    
    // Add axes to chart
    chart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);
    
    chart.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
    
    // Highlight active/inactive periods (same as in activity chart)
    const activeStartHour = 18;
    const activeEndHour = 6;
    
    // Create the active period rectangle (wrapping around midnight)
    if (activeEndHour < activeStartHour) {
        // Evening active period (from active start to midnight)
        chart.append('rect')
            .attr('class', 'active-period')
            .attr('x', xScale(activeStartHour))
            .attr('y', 0)
            .attr('width', xScale(24) - xScale(activeStartHour))
            .attr('height', chartHeight)
            .attr('fill', 'rgba(0, 0, 0, 0.1)')
            .attr('opacity', 0.5);
        
        // Early morning active period (from midnight to active end)
        chart.append('rect')
            .attr('class', 'active-period')
            .attr('x', xScale(0))
            .attr('y', 0)
            .attr('width', xScale(activeEndHour))
            .attr('height', chartHeight)
            .attr('fill', 'rgba(0, 0, 0, 0.1)')
            .attr('opacity', 0.5);
    } else {
        chart.append('rect')
            .attr('class', 'active-period')
            .attr('x', xScale(activeStartHour))
            .attr('y', 0)
            .attr('width', xScale(activeEndHour) - xScale(activeStartHour))
            .attr('height', chartHeight)
            .attr('fill', 'rgba(0, 0, 0, 0.1)')
            .attr('opacity', 0.5);
    }
    
    // Add a dotted line for the overall average
    const overallAvg = d3.mean(avgDailyData, d => d.temperature);
    
    chart.append('line')
        .attr('class', 'avg-line')
        .attr('x1', 0)
        .attr('y1', yScale(overallAvg))
        .attr('x2', chartWidth)
        .attr('y2', yScale(overallAvg))
        .attr('stroke', '#888')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    
    chart.append('text')
        .attr('class', 'avg-label')
        .attr('x', 5)
        .attr('y', yScale(overallAvg) - 5)
        .style('font-size', '10px')
        .style('fill', '#888')
        .text(`Avg: ${overallAvg.toFixed(2)}°C`);
    
    // Add axis labels
    chart.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .text('Hour of Day');
    
    chart.append('text')
        .attr('class', 'y-axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .style('text-anchor', 'middle')
        .text('Temperature (°C)');
    
    // Add title
    const mouseLabel = selectedMouse === 'average' ? 'Average' : selectedMouse;
    const genderLabel = selectedGender === 'all' ? 'All Mice' : 
                       (selectedGender === 'female' ? 'Female Mice' : 'Male Mice');
    
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text(`${mouseLabel} Temperature - ${genderLabel}`);
}

// Create a heatmap to visualize activity patterns by hour and day
function createActivityHeatmap() {
    // Container dimensions
    const container = document.getElementById('activity-heatmap');
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#activity-heatmap')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Get data based on selected gender and mouse
    let actData;
    if (selectedGender === 'female') {
        actData = femActData;
    } else if (selectedGender === 'male') {
        actData = maleActData;
    } else {
        // Combine data for 'all' gender selection
        actData = femActData.map((row, i) => {
            const combined = {};
            // Include female data
            for (const key in row) {
                combined[key] = parseFloat(row[key]);
            }
            // Include male data if available
            if (i < maleActData.length) {
                for (const key in maleActData[i]) {
                    combined[key] = parseFloat(maleActData[i][key]);
                }
            }
            return combined;
        });
    }
    
    // Calculate number of days to show
    let days;
    switch (selectedPeriod) {
        case '24h':
            days = 1;
            break;
        case '7d':
            days = 7;
            break;
        case '14d':
            days = 14;
            break;
        default:
            days = 1;
    }
    
    // Limit days to available data
    const maxDays = Math.floor(actData.length / (24 * 60));
    days = Math.min(days, maxDays);
    
    // Get mouse IDs relevant to the selection
    const mouseIds = getMouseIds();
    
    // Prepare data for heatmap
    const heatmapData = [];
    
    // For each day
    for (let day = 0; day < days; day++) {
        // For each hour in the day
        for (let hour = 0; hour < 24; hour++) {
            // Calculate the starting and ending minute indices
            const startMinute = day * 24 * 60 + hour * 60;
            const endMinute = startMinute + 60;
            
            // Skip if we don't have data for this time period
            if (endMinute >= actData.length) continue;
            
            // Get activity data for this hour
            const hourData = actData.slice(startMinute, endMinute);
            
            // Calculate average activity for this hour
            let activity;
            
            if (selectedMouse === 'average') {
                // Calculate average across all mice
                let sum = 0;
                let count = 0;
                
                hourData.forEach(minute => {
                    mouseIds.forEach(id => {
                        if (!isNaN(minute[id])) {
                            sum += minute[id];
                            count++;
                        }
                    });
                });
                
                activity = count > 0 ? sum / count : 0;
            } else {
                // Calculate average for specific mouse
                const values = hourData.map(minute => minute[selectedMouse])
                                     .filter(v => !isNaN(v));
                activity = values.length > 0 ? d3.mean(values) : 0;
            }
            
            heatmapData.push({
                day,
                hour,
                activity
            });
        }
    }
    
    // Create scales
    const xScale = d3.scaleBand()
        .domain(d3.range(24))
        .range([0, chartWidth])
        .padding(0.05);
    
    const yScale = d3.scaleBand()
        .domain(d3.range(days))
        .range([0, chartHeight])
        .padding(0.05);
    
    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(heatmapData, d => d.activity) * 1.1]);
    
    // Add heatmap cells
    chart.selectAll('.cell')
        .data(heatmapData)
        .enter()
        .append('rect')
        .attr('class', 'cell')
        .attr('x', d => xScale(d.hour))
        .attr('y', d => yScale(d.day))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.activity))
        .on('mouseover', function(event, d) {
            // Show tooltip on hover
            const tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY + 10}px`);
            
            tooltip.html(`
                <strong>Day ${d.day + 1}, ${d.hour}:00</strong><br>
                Activity: ${d.activity.toFixed(2)}
            `);
        })
        .on('mouseout', function() {
            // Remove tooltip on mouseout
            d3.selectAll('.tooltip').remove();
        });
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => `${d}:00`);
    
    const yAxis = d3.axisLeft(yScale)
        .tickFormat(d => `Day ${d + 1}`);
    
    // Add axes to chart
    chart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    
    chart.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
    
    // Add color legend
    const legendWidth = 20;
    const legendHeight = chartHeight;
    
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - margin.right - legendWidth}, ${margin.top})`);
    
    // Create gradient for legend
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
        .attr('id', 'activity-gradient')
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');
    
    // Add color stops
    const colorDomain = colorScale.domain();
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colorScale(colorDomain[0]));
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorScale(colorDomain[1]));
    
    // Add gradient rectangle
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#activity-gradient)');
    
    // Add legend axis
    const legendScale = d3.scaleLinear()
        .domain(colorDomain)
        .range([legendHeight, 0]);
    
    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);
    
    legend.append('g')
        .attr('transform', `translate(${legendWidth}, 0)`)
        .call(legendAxis);
    
    // Add axis labels
    chart.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .text('Hour of Day');
    
    chart.append('text')
        .attr('class', 'y-axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -chartHeight / 2)
        .attr('y', -margin.left + 15)
        .style('text-anchor', 'middle')
        .text('Day');
    
    // Add title
    const mouseLabel = selectedMouse === 'average' ? 'Average' : selectedMouse;
    const genderLabel = selectedGender === 'all' ? 'All Mice' : 
                       (selectedGender === 'female' ? 'Female Mice' : 'Male Mice');
    
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text(`Activity Heatmap: ${mouseLabel} - ${genderLabel}`);
}

function initializeMouseDropdown() {
    const mouseSelect = document.getElementById('mouse-select');
    
    // Store the current selection before modifying the dropdown
    const currentSelection = mouseSelect.value;
    
    // Clear existing options except 'average'
    while (mouseSelect.options.length > 1) {
        mouseSelect.remove(1);
    }
    
    // Get mouse IDs based on current gender selection
    const mouseIds = selectedGender === 'female' ? 
                    ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13'] :
                    ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13'];
    
    // Add appropriate mouse options
    mouseIds.forEach((id, index) => {
        const option = document.createElement('option');
        option.value = id;
        option.text = `${selectedGender === 'female' ? 'Female' : 'Male'} ${index + 1}`;
        mouseSelect.add(option);
    });
    
    // Try to set the dropdown to a matching selection in the new gender,
    // or set to "average" if no appropriate match exists
    if (currentSelection !== 'average') {
        // If we switched from female to male or vice versa,
        // try to select the same index mouse in the new gender
        if (currentSelection.startsWith('f') && selectedGender === 'male') {
            // Convert f1 -> m1, f2 -> m2, etc.
            const index = currentSelection.substring(1);
            const newSelection = 'm' + index;
            
            // Check if this mouse exists in the options
            let found = false;
            for (let i = 0; i < mouseSelect.options.length; i++) {
                if (mouseSelect.options[i].value === newSelection) {
                    mouseSelect.value = newSelection;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                mouseSelect.value = 'average';
            }
        } 
        else if (currentSelection.startsWith('m') && selectedGender === 'female') {
            // Convert m1 -> f1, m2 -> f2, etc.
            const index = currentSelection.substring(1);
            const newSelection = 'f' + index;
            
            // Check if this mouse exists in the options
            let found = false;
            for (let i = 0; i < mouseSelect.options.length; i++) {
                if (mouseSelect.options[i].value === newSelection) {
                    mouseSelect.value = newSelection;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                mouseSelect.value = 'average';
            }
        }
        else {
            // If we're not changing gender, try to keep the same selection
            let found = false;
            for (let i = 0; i < mouseSelect.options.length; i++) {
                if (mouseSelect.options[i].value === currentSelection) {
                    mouseSelect.value = currentSelection;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                mouseSelect.value = 'average';
            }
        }
    } else {
        mouseSelect.value = 'average';
    }
    
    // Update the selectedMouse variable to match the new selection
    selectedMouse = mouseSelect.value;
}
// Update summary text with key findings
function updateSummaryText() {
    // Calculate correlations based on current selection
    function calculateCorrelation(actData, tempData, mouseId) {
        const activities = actData.map(d => parseFloat(d[mouseId])).filter(v => !isNaN(v));
        const temperatures = tempData.map(d => parseFloat(d[mouseId])).filter(v => !isNaN(v));
        
        // Use the minimum length of both arrays
        const n = Math.min(activities.length, temperatures.length);
        
        if (n < 10) return 0; // Not enough data
        
        let sumAct = 0, sumTemp = 0, sumActTemp = 0, sumActSq = 0, sumTempSq = 0;
        
        for (let i = 0; i < n; i++) {
            sumAct += activities[i];
            sumTemp += temperatures[i];
            sumActTemp += activities[i] * temperatures[i];
            sumActSq += activities[i] * activities[i];
            sumTempSq += temperatures[i] * temperatures[i];
        }
        
        const numerator = n * sumActTemp - sumAct * sumTemp;
        const denominator = Math.sqrt((n * sumActSq - sumAct * sumAct) * (n * sumTempSq - sumTemp * sumTemp));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }
    
    // Get correlations for female and male mice
    const femaleIds = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13'];
    const maleIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13'];
    
    const femaleCorrelations = femaleIds.map(id => {
        return {
            id,
            correlation: calculateCorrelation(femActData, femTempData, id)
        };
    });
    
    const maleCorrelations = maleIds.map(id => {
        return {
            id,
            correlation: calculateCorrelation(maleActData, maleTempData, id)
        };
    });
    
    // Calculate average correlations
    const avgFemaleCorrelation = d3.mean(femaleCorrelations, d => d.correlation);
    const avgMaleCorrelation = d3.mean(maleCorrelations, d => d.correlation);
    
    // Update correlation summary
    document.getElementById('correlation-summary').innerHTML = `
        <p>
            1. <b>Positive Correlation:</b> Body temperature is positively correlated with activity level for both male and female mice.
            <br>
            2. <b>Cyclical Pattern:</b> Body temperature and activity level are tightly synchronized with the light-dark cycle, rising and falling in tandem over each 24-hour period.
            <br>
            3. <b>Estrus Effect:</b> Females in estrus show slightly different patterns of activity and temperature, with increased activity level and  body temperature during ovulation days.
        </p>
    `;
    
    // Update conclusion
    document.getElementById('conclusion-text').innerHTML = `
        Based on our analysis, we can conclude that there is a ${avgFemaleCorrelation > 0.5 && avgMaleCorrelation > 0.5 ? 'strong' : 'moderate'} positive correlation between body temperature and activity levels in mice, 
        supporting the hypothesis that hotter mice tend to move more. This relationship is ${avgFemaleCorrelation > avgMaleCorrelation ? 'stronger in females than males' : 'stronger in males than females'}, 
        and both genders exhibit clear circadian rhythms that influence both temperature and activity patterns.
        
        Female mice maintain higher body temperatures on average, and their estrus cycles appear to influence temperature fluctuations, which may in turn affect activity levels.
        
        These findings suggest that body temperature is an important physiological parameter that is closely linked to activity levels in mice, 
        and monitoring temperature could provide valuable insights into behavioral patterns and overall health.
    `;
}