let data = [];
let xScale, yScale;
let brushSelection = null;


document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    // brushSelector()
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


    //processCommits();
    displayStats();
    createScatterplot();
    brushSelector();
    console.log(commits);

}

let commits = d3.groups(data, (d) => d.commit);
console.log(commits)

function processCommits() {
commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
    let first = lines[0];
    let { author, date, time, timezone, datetime } = first;
    let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
    };

    Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: false, // Prevents the property from being deleted or changed
        writable: false, // Prevents the value of the property from being changed
        enumerable: false // Prevents the property from being listed in for...in loops
    });

    return ret;
    });
}

function displayStats() {
    processCommits();
  
    const dl = d3.select('#project-stats').append('dl').attr('class', 'stats');
  
    // Total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Number of files in the codebase
    const numFiles = d3.groups(data, (d) => d.file).length;
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
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    // Add Y axis
    svg
    .append('g')
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
    })
    .on('mouseleave', () => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipContent({});
        updateTooltipVisibility(false);
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
    
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function isCommitSelected(commit) {
    if (!brushSelection) return false;

    const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
    const max = { x: brushSelection[1][0], y: brushSelection[1][1] };

    // Get the x and y coordinates of the commit
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    // Check if the commit's coordinates are within the brush selection bounds
    return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
}


function updateSelection() {
    // Ensure the `selected` class is added to the right dots based on the brush selection
    d3.selectAll('circle')
        .classed('selected', (d) => isCommitSelected(d));  // Apply 'selected' class to matching dots
}

function updateSelectionCount() {
    const selectedCommits = brushSelection
      ? commits.filter(isCommitSelected)
      : [];
  
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
      ? commits.filter(isCommitSelected)
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
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