console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        return [];
    }
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement) return;
    
    containerElement.innerHTML = '';
    
    projects.forEach(project => {
        const article = document.createElement('article');
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
            <small>Year: ${project.year}</small>
        `;
        containerElement.appendChild(article);
    });
}

// Navigation code (keep your existing navigation code)
let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact Me' },
    { url: 'https://github.com/ashleyychu', title: 'My Github' },
    { url: 'portfolio_resume.pdf', title: 'My Resume' }
];

const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Create navigation
let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    
    if (url.startsWith('http')) {
        a.target = '_blank';
    }
    
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    );
    
    nav.append(a);
}

// Color scheme switcher
document.body.insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`
);

let select = document.querySelector(".color-scheme select");

// Function to set color scheme
function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    select.value = colorScheme;
    localStorage.colorScheme = colorScheme;
}

// Load saved color scheme preference
if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

// Handle color scheme changes
select.addEventListener('input', function(event) {
    setColorScheme(event.target.value);
});

// Optional: Contact form handling
let form = document.querySelector('form');
form?.addEventListener('submit', function(event) {
    event.preventDefault();
    
    let data = new FormData(form);
    let url = form.action + '?';
    let params = [];
    
    for (let [name, value] of data) {
        params.push(`${name}=${encodeURIComponent(value)}`);
    }
    
    url += params.join('&');
    location.href = url;
});