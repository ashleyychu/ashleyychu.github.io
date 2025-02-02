import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// Load and display latest projects
const projects = await fetchJSON('./projects/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h3');

// Load and display GitHub stats
try {
    const githubData = await fetchGitHubData('ashleyychu');
    const profileStats = document.querySelector('#profile-stats');
    
    if (profileStats) {
        profileStats.innerHTML = `
            <dl>
                <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
                <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
                <dt>Followers:</dt><dd>${githubData.followers}</dd>
                <dt>Following:</dt><dd>${githubData.following}</dd>
            </dl>
        `;
    }
} catch (error) {
    console.error('Error fetching GitHub data:', error);
}