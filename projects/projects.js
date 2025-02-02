import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('projects.json');
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

if (projectsTitle) {
    projectsTitle.textContent = `My Projects (${projects.length})`;
}

renderProjects(projects, projectsContainer, 'h2');