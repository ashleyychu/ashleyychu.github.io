let data = [];
let commits = [];
let xScale, yScale;
let brushSelection = null;
let commitProgress = 100;
let timeScale;
let manualSelection = new Set();
let selectedCommits = [];
let filteredCommits = [];



document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    updateScatterplot(commits.slice(0, VISIBLE_COUNT));
    renderItems(0);
    initializeFileScrolly();
});

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));

    
    commits = d3.groups(data, (d) => d.commit);
    filteredCommits = commits;

    processCommits();
    displayStats();
    createScatterplot();
    brushSelector();
    createSlider();
    createFileVisualization();
    

}


function processCommits() {
  commits = d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      return {
          id: commit,
          url: 'https://github.com/ashleyychu/ashleyychu.github.io/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
          lines: lines,
      };
  });

  filteredCommits = commits;

  timeScale = d3.scaleTime().domain(d3.extent(commits, (d) => d.datetime))
    .range([0, 100]);
}

function displayStats() {
  
    const dl = d3.select('#project-stats').append('dl').attr('class', 'stats');
  
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(filteredCommits.length);  // Update with selectedCommits

    dl.append('dt').text('Total commits');
    dl.append('dd').text(filteredCommits.length);  // Update with selectedCommits

    const numFiles = d3.groups(filteredCommits, (d) => d.file).length;
    dl.append('dt').text('Number of files in the codebase');
    dl.append('dd').text(numFiles);
  
    // Maximum file length (in lines)
    const maxFileLength = d3.max(
      d3.rollups(data, (v) => d3.max(v, (d) => d.line), (d) => d.file),
      (d) => d[1]
    );
    dl.append('dt').text('Maximum file length (in lines)');
    dl.append('dd').text(maxFileLength);
  
    // Average file length (in lines)
    const avgFileLength = d3.mean(
      d3.rollups(data, (v) => d3.max(v, (d) => d.line), (d) => d.file),
      (d) => d[1]
    );
    dl.append('dt').text('Average file length');
    dl.append('dd').text(avgFileLength.toFixed(2) + ' lines');
  
    // Average line length (in characters)
    const avgLineLength = d3.mean(data, (d) => d.length);
    dl.append('dt').text('Average line length');
    dl.append('dd').text(avgLineLength.toFixed(2) + ' characters');
  
  
    // Time of day that most work is done
    const workByPeriod = d3.rollups(
      data,
      (v) => v.length,
      (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
    );
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
    dl.append('dt').text('Most work done during');
    dl.append('dd').text(maxPeriod);
}




function createScatterplot() {
    const width = 1000;
    const height = 600;
    
    const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
    

    xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
      
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);


    // Add gridlines BEFORE the axes
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const colorScale = d3.scaleLinear()
    .domain([0, 6, 12, 18, 24]) 
    .range(['#1f77b4', '#6baed6', '#fdae61', '#e6550d', '#1f77b4']); 

    gridlines.selectAll('line')
    .attr('stroke', (d) => colorScale(d)); // Apply color based on time of day


    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    // Add Y axis
    svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    

    const dots = svg.append('g').attr('class', 'dots');
    
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    
    const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([5, 20]);
    
    dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 7)
    .attr('fill', 'steelblue')
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        updateTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
        d3.select(event.currentTarget).classed('selected', true);
    })
    .on('mouseleave', () => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipContent({});
        updateTooltipVisibility(false);
        d3.select(event.currentTarget).classed('selected', false);
    });
    
    

}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time'); // New element for time
    const author = document.getElementById('commit-author'); // New element for author
    const linesEdited = document.getElementById('commit-lines-edited'); // New element for lines edited
  
    if (Object.keys(commit).length === 0) return;

    // Update the existing commit fields
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });

    // Update the new fields
    time.textContent = commit.datetime?.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    author.textContent = commit.author;
    linesEdited.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function brushSelector() {
  const svg = document.querySelector('svg');

  d3.select(svg)
    .call(d3.brush().on('start brush end', (event) => brushed(event, selectedCommits)));

  d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function brushed(evt) {
  let brushSelection = evt.selection;
  selectedCommits = [];
  
  if (brushSelection) {
    selectedCommits = filteredCommits.filter((commit) => {
          let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
          let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
          let x = xScale(commit.datetime);
          let y = yScale(commit.hourFrac);
          return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
        });
  }
  updateSelection(selectedCommits);
  updateSelectionCount();
  updateLanguageBreakdown(selectedCommits);
}

function updateSelection(selectedCommits) {
  d3.selectAll('circle')
      .classed('selected', (d) => isCommitSelected(d, selectedCommits));
}

function isCommitSelected(commit, selectedCommits) {
  return selectedCommits.some((selectedCommit) => selectedCommit.id === commit.id);
}

function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  
    return selectedCommits;
}

function updateLanguageBreakdown(selectedCommits) {
  
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => (d && d.type) || 'Unknown' // Check if 'd' is defined and has 'type'
  );

  // Update DOM with breakdown
  container.innerHTML = '';  // Clear old breakdown
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
  return breakdown;
}


function createSlider() {
  const slider = document.getElementById('commit-slider');
  const timeDisplay = document.getElementById('commit-time');

  slider.value = commitProgress;
  timeDisplay.textContent = timeScale.invert(commitProgress).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

  slider.addEventListener('input', function () {
      commitProgress = +this.value;
      let commitMaxTime = timeScale.invert(commitProgress);
      timeDisplay.textContent = commitMaxTime.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

      filterCommitsByTime(commitMaxTime); // filters commits based on time
      updateScatterplot(filteredCommits); // update scatterplot with filtered commits
      createFileVisualization(); // update file visualization
      
  });

}

function filterCommitsByTime(commitMaxTime) {
  filteredCommits = commits.filter((commit) => commit.datetime <= commitMaxTime);
}



function updateScatterplot(filteredCommits, highlightedCommits = []) {
  let svg = d3.select('#chart').select('svg');

  // If there's no svg yet, create it
  if (svg.empty()) {
    svg = d3.select('#chart').append('svg')
      .attr('viewBox', `0 0 1000 600`)
      .style('overflow', 'visible');
  }

  // Define scales for the x and y axes
  // Use all commits for domain calculation to keep the scales consistent
  const allCommits = commits; // assuming 'commits' is your full dataset
  const xScale = d3.scaleTime().domain(d3.extent(filteredCommits, (d) => d.datetime)).range([0, 1000]).nice();
  const yScale = d3.scaleLinear().domain([0, 24]).range([600, 0]);

  // Remove old axes before adding new ones
  svg.selectAll('.x-axis').remove();
  svg.selectAll('.y-axis').remove();

  // Add the x and y axes
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, 600)`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(0, 0)`)
    .call(d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'));

  // Define the radius scale for the scatterplot based on all commits
  const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 20]);

  // Make sure we have a dots container
  const dots = svg.select('.dots');
  if (dots.empty()) {
    svg.append('g').attr('class', 'dots');
  }

  // Convert highlightedCommits array to a Set of ides for faster lookup
  const highlightedides = new Set(highlightedCommits.map(c => c.id));
  
  // Get visible commits for highlighting
  const visibleides = new Set(filteredCommits.map(c => c.id));

  // Update all circles - use join pattern for smooth transitions
  svg.select('.dots')
    .selectAll('circle')
    .data(filteredCommits, d => d.id) // Use id as key for stable identity
    .join(
      // Enter new elements
      enter => enter.append('circle')
        .attr('class', 'commit-point')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 0) // Start with radius 0 for animation
        .attr('fill', 'steelblue')
        .style('fill-opacity', d => visibleides.has(d.id) ? 0.9 : 0.3)
        .style('stroke', d => highlightedides.has(d.id) ? 'red' : 'none')
        .style('stroke-width', d => highlightedides.has(d.id) ? 2 : 0)
        .transition()
        .duration(300)
        .attr('r', d => rScale(d.totalLines)),
      
      // Update existing elements
      update => update
        .transition()
        .duration(300)
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .style('fill-opacity', d => visibleides.has(d.id) ? 0.9 : 0.3)
        .style('stroke', d => highlightedides.has(d.id) ? 'red' : 'none')
        .style('stroke-width', d => highlightedides.has(d.id) ? 2 : 0),
      
      // Exit elements that are no longer needed
      exit => exit
        .transition()
        .duration(300)
        .attr('r', 0)
        .remove()
    );
  
  // Add event listeners after transitions complete
  svg.select('.dots')
    .selectAll('circle')
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget)
        .style('fill-opacity', 1)
        .attr('r', d => rScale(d.totalLines) * 1.2); // Slightly larger on hover
        
      updateTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      const d = d3.select(event.currentTarget).datum();
      d3.select(event.currentTarget)
        .style('fill-opacity', visibleides.has(d.id) ? 0.9 : 0.3)
        .attr('r', rScale(d.totalLines));
        
      updateTooltipVisibility(false);
    })
    .on('click', (event, commit) => {
      const sortedCommits = [...commits].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      const commitIndex = sortedCommits.findIndex(c => c.id === commit.id);
      if (commitIndex >= 0) {
        const scrollTop = commitIndex * ITEM_HEIGHT;
        scrollContainer.property('scrollTop', scrollTop);
      }
    });
    

  // If you have a brush selector, apply it
  if (typeof brushSelector === 'function') {
    brushSelector();
  }
  
  if (typeof updateSelectionCount === 'function') {
    updateSelectionCount(selectedCommits);
  }
}

function createFileVisualization() {
  if (!filteredCommits || !Array.isArray(filteredCommits)) {
    console.warn("filteredCommits is not properly defined");
    return;
  }

  // Get all the lines from filtered commits
  let lines = filteredCommits.flatMap(commit => {
    // First check if commit exists and has lines property that's an array
    if (commit && commit.lines && Array.isArray(commit.lines)) {
      return commit.lines.filter(line => line && line.file); // Only return lines with a file property
    }
    return []; // Return empty array for invalid commits
  });
  
  if (lines.length === 0) {
    console.warn("No valid lines found in filteredCommits");
    d3.select('.files').html('<div>No files to display</div>');
    return;
  }
  
  // Group lines by file
  let files = d3.groups(lines, d => d.file || "unknown")
    .map(([name, fileLines]) => {
      return { name: name || "unknown", lines: fileLines };
    });

  files = d3.sort(files, (d) => -d.lines.length);

  // Clear previous file data
  d3.select('.files').selectAll('div').remove();

  // Create the file container
  let filesContainer = d3.select('.files').selectAll('div')
    .data(files)
    .enter()
    .append('div');

  // Append file name and line count to each div
  filesContainer.append('dt')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
    console.log(lines)
  // Create unit visualization - one div per line
  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));
}





// Constants for our scrolling functionality
let NUM_ITEMS = commits.length; // Should match your total commits length
let ITEM_HEIGHT = 200; // Increased height for narrative content
let VISIBLE_COUNT = 10; // Number of items visible at once
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

// Set up the scroll container
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');

// Add scroll event listener
scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  renderItems(startIndex);
});


function highlightCommit(commit) {
  // Update scatterplot with the highlighted commit
  updateScatterplot(visibleCommits, [commit]);
  
  // Scroll the visualization to focus on this commit if needed
  const svg = d3.select('#chart').select('svg');
  const point = svg.select('.dots')
    .selectAll('circle')
    .filter(d => d.id === commit.id);
    
  if (!point.empty()) {
    // Get the coordinates of the point
    const cx = +point.attr('cx');
    const cy = +point.attr('cy');
    
    // You could add code here to scroll/pan the visualization if needed
  }
}


// Keep track of currently visible commits
let visibleCommits = [];


function renderItems(startIndex) {
  console.log("renderItems called with startIndex:", startIndex);
  
  // Make sure items container exists
  const itemsContainer = d3.select('#items-container');
  if (itemsContainer.empty()) {
    console.error("Items container not found!");
    return;
  }
  
  // Clear previous items
  itemsContainer.selectAll('div').remove();
  
  // Sort all commits by date (newest first)
  const sortedCommits = [...commits].sort((a, b) => {
    const dateA = new Date(a.datetime || a.date);
    const dateB = new Date(b.datetime || b.date);
    return dateA - dateB; // Descending order (newest first)
  });
  
  // Get the slice of commits to display
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, sortedCommits.length);
  visibleCommits = sortedCommits.slice(startIndex, endIndex);
  
  console.log("Visible commits:", visibleCommits);
  
  if (visibleCommits.length === 0) {
    console.error("No commits to display!");
    return;
  }
  
  // Make sure we're updating the scatterplot
  updateScatterplot(visibleCommits);
  
  // Add more explicit styling to ensure visibility
  const items = itemsContainer.selectAll('div')
    .data(visibleCommits)
    .enter()
    .append('div')
    .attr('class', 'commit-item')
    .style('position', 'absolute')
    .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
    .style('left', '0')
    .style('width', '100%') 
    .style('height', `${ITEM_HEIGHT}px`)
    .style('background-color', 'white')
    .style('border-bottom', '1px solid #eee')
    .style('padding', '10px')
    .style('box-sizing', 'border-box')
    .style('z-index', '10')
    .style('display', 'block')
    .style('overflow', 'auto');
  
  // Add content to each item
  items.html((d, index) => {
    // Format the date for display
    const commitDate = new Date(d.datetime || d.date);
    const formattedDate = commitDate.toLocaleString("en", {dateStyle: "full", timeStyle: "short"});
    
    // Count unique files modified (if available)
    const uniqueFileCount = d.lines && Array.isArray(d.lines) ? 
      d3.rollups(d.lines, D => D.length, file => file.file).length : 
      'several';
    
    return `
      <div class="commit-header">
        <span class="commit-id">${d.id || 'Unknown'}</span>
        <span class="commit-message">${d.datetime || 'No date'}</span>
        <span class="commit-author">${d.author || 'Unknown'}</span>
      </div>
      <div class="commit-narrative">
        <p>
          On ${formattedDate}, I made
          <a href="${d.url || '#'}" target="_blank">
            ${index + startIndex != 0 ? 'another lovely commit' : 'my first commit, and it was lovely'}
          </a>. 
          I edited ${d.totalLines || 'several'} lines across ${uniqueFileCount} files. 
          Then I looked over all I had made, and I saw that it was very good.
        </p>
      </div>
    `;
  });
  
  // Add click handler
  items.on('click', (event, d) => {
    console.log("Commit clicked:", d);
    highlightCommit(d);
    
    // Visual feedback for selection
    itemsContainer.selectAll('.commit-item').classed('selected', false);
    d3.select(event.currentTarget).classed('selected', true);
  });
  
  console.log(`Rendered ${items.size()} items`);
}



// Constants for file scrolly
let FILE_ITEM_HEIGHT = 200;
let FILE_VISIBLE_COUNT = 10;
let fileData = [];
let visibleFiles = [];

// Initialize file scrolly after data is loaded
function initializeFileScrolly() {
  // Process data to get file information
  processFileData();
  
  // Set up the scroll container
  const fileScrollContainer = d3.select('#file-scroll-container');
  const fileSpacer = d3.select('#file-spacer');
  const totalFileHeight = (fileData.length - 1) * FILE_ITEM_HEIGHT;
  
  fileSpacer.style('height', `${totalFileHeight}px`);
  
  // Add scroll event listener
  fileScrollContainer.on('scroll', () => {
    const scrollTop = fileScrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / FILE_ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, fileData.length - FILE_VISIBLE_COUNT));
    renderFileItems(startIndex);
  });
  
  // Initial render
  renderFileItems(0);
}

// Process data to get file information
function processFileData() {
  // Get all lines from all commits
  const allLines = commits.flatMap(commit => commit.lines || []);
  
  // Group lines by file
  const fileGroups = d3.groups(allLines, d => d.file || "unknown");
  
  // Create file data structure
  fileData = fileGroups.map(([fileName, lines]) => {
    return {
      name: fileName,
      totalLines: lines.length,
      maxLine: d3.max(lines, d => d.line || 0),
      types: Array.from(new Set(lines.map(d => d.type || "unknown"))),
      firstCommit: d3.min(lines, d => d.datetime),
      lastCommit: d3.max(lines, d => d.datetime)
    };
  });
  
  // Sort files by total lines (descending)
  fileData = d3.sort(fileData, d => -d.totalLines);
}

// Render file items in the scrolly
function renderFileItems(startIndex) {
  console.log("renderFileItems called with startIndex:", startIndex);
  
  // Make sure items container exists
  const fileItemsContainer = d3.select('#file-items-container');
  if (fileItemsContainer.empty()) {
    console.error("File items container not found!");
    return;
  }
  
  // Clear previous items
  fileItemsContainer.selectAll('div').remove();
  
  // Get the slice of files to display
  const endIndex = Math.min(startIndex + FILE_VISIBLE_COUNT, fileData.length);
  visibleFiles = fileData.slice(startIndex, endIndex);
  
  if (visibleFiles.length === 0) {
    console.error("No files to display!");
    return;
  }
  
  // Update the visualization
  displayFileVisualization(visibleFiles);
  
  // Add items to the container
  const items = fileItemsContainer.selectAll('div')
    .data(visibleFiles)
    .enter()
    .append('div')
    .attr('class', 'file-item commit-item') // Reuse commit-item styling
    .style('position', 'absolute')
    .style('top', (_, idx) => `${idx * FILE_ITEM_HEIGHT}px`)
    .style('width', '100%')
    .style('height', `${FILE_ITEM_HEIGHT}px`);
  
  // Add content to each item
  items.html((d, index) => {
    // Format dates if available
    const firstDate = d.firstCommit ? new Date(d.firstCommit).toLocaleDateString() : 'unknown';
    const lastDate = d.lastCommit ? new Date(d.lastCommit).toLocaleDateString() : 'unknown';
    
    return `
      <div class="commit-header">
        <span class="commit-id">${d.name || 'Unknown'}</span>
      </div>
      <div class="commit-narrative">
        <p>
          This file contains ${d.totalLines} lines of code.
          It was first modified on ${firstDate} and last updated on ${lastDate}.
          ${d.types.length > 1 
            ? `It contains multiple types: ${d.types.join(', ')}.` 
            : `It's written in ${d.types[0]}.`}
        </p>
      </div>
    `;
  });
  
  // Add click handler
  items.on('click', (event, d) => {
    console.log("File clicked:", d);
    highlightFile(d);
    
    // Visual feedback for selection
    fileItemsContainer.selectAll('.file-item').classed('selected', false);
    d3.select(event.currentTarget).classed('selected', true);
  });
  
  console.log(`Rendered ${items.size()} file items`);
}

function displayFileVisualization(files) {
  const container = d3.select('#file-sizes-visualization');
  container.selectAll('*').remove();
  
  const width = 400;
  const height = 500;
  const margin = { top: 20, right: 20, bottom: 40, left: 150 };
  
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
  
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(files, d => d.totalLines)])
    .range([margin.left, width - margin.right]);
  
  const yScale = d3.scaleBand()
    .domain(files.map(d => d.name))
    .range([margin.top, height - margin.bottom])
    .padding(0.2);
  
  // File type colors
  const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  
  // Add bars for each file
  svg.selectAll('.file-bar')
    .data(files)
    .enter()
    .append('rect')
    .attr('class', 'file-bar')
    .attr('x', margin.left)
    .attr('y', d => yScale(d.name))
    .attr('width', d => xScale(d.totalLines) - margin.left)
    .attr('height', yScale.bandwidth())
    .attr('fill', d => fileTypeColors(d.types[0] || 'unknown'))
    .style('opacity', 0.8);
  
  // Add labels for each file
  svg.selectAll('.file-label')
    .data(files)
    .enter()
    .append('text')
    .attr('class', 'file-label')
    .attr('x', margin.left - 5)
    .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .style('font-size', '12px')
    .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name);
  
  // Add x axis
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .append('text')
    .attr('x', width - margin.right)
    .attr('y', 35)
    .attr('fill', 'black')
    .style('font-size', '12px')
    .style('text-anchor', 'end')
    .text('Total Lines');
}

function highlightFile(file) {
  // Highlight the file in the visualization
  const svg = d3.select('#file-sizes-visualization').select('svg');
  
  svg.selectAll('.file-bar')
    .style('opacity', d => d.name === file.name ? 1 : 0.5)
    .style('stroke', d => d.name === file.name ? 'black' : 'none')
    .style('stroke-width', d => d.name === file.name ? 2 : 0);
}