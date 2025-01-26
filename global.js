console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: '/projects/', title: 'Projects' },
    { url: '/contact/', title: 'Contact Me' },
    { url: 'https://github.com/ashleyychu', title: 'My Github' },
    { url: '/portfolio_resume.pdf', title: 'My Resume' }
  ];


let nav = document.createElement('nav');
document.body.prepend(nav);


const rootElement = document.documentElement;
rootElement.classList.add("home"); 


const ARE_WE_HOME = document.documentElement.classList.contains('home');

for (let p of pages) {
    
    let url = p.url;
    let title = p.title;

    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
  }

let navLinks = $$("nav a");

let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );

if (currentLink) {
// or if (currentLink !== undefined)
    currentLink.classList.add('current');
}


  let colorscheme = document.createElement('colorscheme');
  document.body.prepend(colorscheme);

  document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select>
              <option value='light dark'>Automatic</option>
              <option value='light'>Light</option>
              <option value='dark'>Dark</option>
          </select>
      </label>`
  );

let select = document.querySelector("select");

select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);

    document.documentElement.style.setProperty('color-scheme', event.target.value);
});
