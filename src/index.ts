import './z-zoomer.ts'
import { ZZoomer } from './z-zoomer.ts';

// Add navigation in demo page.
const navItems = document.querySelectorAll('section h2');
const nav = document.createElement('nav');
nav.innerHTML = /* html */`
    <div class="nav-burger">
        <svg viewBox="0 0 120 80" version="1.0" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <rect x="15" width="90" height="15" rx="10"></rect>
            <rect x="15" y="30" width="90" height="15" rx="10"></rect>
            <rect x="15" y="60" width="90" height="15" rx="10"></rect>
        </svg>
    </div>
`;

[...navItems].forEach((el) => {
    const navLink = document.createElement('a');
    const headingLink = document.createElement('a');

    navLink.href=`#${el.id}`;
    navLink.textContent = el.textContent;

    headingLink.href=`#${el.id}`;
    headingLink.textContent = '# ';

    nav.append(navLink);
    el.prepend(headingLink);
})

document.body.querySelector('header')?.after(nav);

// max demo
document.querySelector('#max-demo-reset-btn')?.addEventListener('click', () => {
    (document.querySelector('#max-demo') as ZZoomer)?.reset();
})

// disabled demo
document.querySelector('#disabled-demo-btn')?.addEventListener('click', () => {
    document.querySelector('#disabled-demo')?.toggleAttribute('disabled');
})

// events demo
document.querySelector('#events-demo')?.addEventListener('zoomchange', (e) => {
    const { isZoomed } = (e as CustomEvent).detail;
    document.querySelector('#events-demo-result')!.textContent = isZoomed;
})

// real life demo
const realLifeCarousel = document.querySelector('#real-life-demo-carousel');
const realLifeCarouselZoomers = realLifeCarousel?.querySelectorAll('.real-life-demo-zoomer');

if (realLifeCarousel && realLifeCarouselZoomers?.length) {
    realLifeCarouselZoomers.forEach(zoomer => {
        zoomer.addEventListener('zoomchange', (e) => {
            const { isZoomed } = (e as CustomEvent).detail;
            realLifeCarousel.toggleAttribute('disabled', isZoomed)
        })
    })
}
