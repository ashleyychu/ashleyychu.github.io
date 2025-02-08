import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('projects.json');

let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year
);

let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

if (projectsTitle) {
  projectsTitle.textContent = `My Projects (${projects.length})`;
}

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let sliceGenerator = d3.pie().value((d) => d.value);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

let selectedIndex = -1;
let currentData = data;
let currentQuery = '';

function applyFilters(projects, query, selectedYear) {
  let filteredProjects = projects;
  
  if (query) {
    filteredProjects = filteredProjects.filter(project => {
      let values = Object.values(project).join(' ').toLowerCase();
      return values.includes(query.toLowerCase());
    });
  }
  
  if (selectedYear) {
    filteredProjects = filteredProjects.filter(project => project.year === selectedYear);
  }
  
  return filteredProjects;
}

function renderPieChart(projectsGiven, maintainStructure = false) {
  let svg = d3.select('svg');
  svg.selectAll('path').remove();

  let displayData = maintainStructure ? currentData : d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  ).map(([year, count]) => ({ value: count, label: year }));

  if (!maintainStructure) {
    currentData = displayData;
  }

  let arcData = sliceGenerator(displayData);

  svg.selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', arcGenerator)
    .attr('fill', (_, i) => colors(i))
    .attr('class', (_, i) => i === selectedIndex ? 'selected pie-slice' : 'pie-slice')
    .on('click', (_, d, i) => handleSliceClick(arcData.indexOf(d), displayData));

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  displayData.forEach((d, idx) => {
    legend.append('li')
      .attr('class', idx === selectedIndex ? 'selected' : '')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => handleSliceClick(idx, displayData));
  });
}

function handleSliceClick(idx, displayData) {
  selectedIndex = selectedIndex === idx ? -1 : idx;
  
  let selectedYear = selectedIndex === -1 ? null : displayData[selectedIndex].label;
  let filteredProjects = applyFilters(projects, currentQuery, selectedYear);

  let svg = d3.select('svg');
  svg.selectAll('path')
    .attr('class', (_, i) => (i === selectedIndex ? 'selected pie-slice' : 'pie-slice'));

  let legend = d3.select('.legend');
  legend.selectAll('li')
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects, true);
}

renderPieChart(projects);
renderProjects(projects, projectsContainer, 'h2');

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  currentQuery = event.target.value;
  
  let selectedYear = selectedIndex === -1 ? null : currentData[selectedIndex].label;
  let filteredProjects = applyFilters(projects, currentQuery, selectedYear);

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});