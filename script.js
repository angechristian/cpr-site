// Mobile navigation and small page details; the site remains usable without JavaScript.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu');
    navigation.classList.remove('is-open');
  };

  menuButton.addEventListener('click', () => {
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isExpanded));
    menuButton.setAttribute('aria-label', isExpanded ? 'Ouvrir le menu' : 'Fermer le menu');
    navigation.classList.toggle('is-open', !isExpanded);
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 681px)').matches) closeMenu();
  });
}

const renderMeetings = (meetings = []) => {
  const schedule = document.querySelector('#schedule');
  if (!schedule) return;

  schedule.innerHTML = '';

  if (!meetings.length) {
    const emptyState = document.createElement('p');
    emptyState.className = 'schedule-empty';
    emptyState.textContent = 'Aucune rencontre n’est enregistrée pour le moment.';
    schedule.appendChild(emptyState);
    return;
  }

  meetings.forEach((meeting) => {
    const row = document.createElement('article');
    row.className = 'session-row';
    row.setAttribute('role', 'listitem');

    row.innerHTML = `
      <div class="session-date">
        <strong>${meeting.day || 'Rencontre'}</strong>
        <span>${meeting.time || 'Heure non définie'} · ${meeting.location || 'lieu non défini'}</span>
      </div>
      <div class="session-theme">
        <span class="session-label">Thème de prière</span>
        <h3>${meeting.title || 'Rencontre de prière'}</h3>
        <p>${meeting.verse || 'Texte biblique à confirmer'}</p>
      </div>
      <div class="session-people">
        <span><b>Animation</b> ${meeting.leader || 'À confirmer'}</span>
        <span><b>Modération</b> ${meeting.moderator || 'À confirmer'}</span>
      </div>
    `;

    schedule.appendChild(row);
  });
};

const renderSocials = (socials = []) => {
  const topBar = document.querySelector('#social-top-bar');
  if (!topBar) return;

  topBar.innerHTML = '';

  if (!socials.length) {
    topBar.innerHTML = '<span class="social-placeholder">Réseaux à configurer</span>';
    return;
  }

  socials.forEach((social) => {
    const link = document.createElement('a');
    link.href = social.url || '#';
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.className = 'social-icon';
    link.setAttribute('aria-label', social.label || 'Réseau social');
    link.innerHTML = `<span>${social.icon || '•'}</span>`;
    topBar.appendChild(link);
  });
};

const loadMeetings = async () => {
  try {
    const response = await fetch('/api/meetings');
    if (!response.ok) {
      throw new Error('Unable to fetch meetings');
    }

    const data = await response.json();
    renderMeetings(Array.isArray(data.meetings) ? data.meetings : []);
  } catch (error) {
    console.error('Failed to load meetings:', error);
    renderMeetings([]);
  }
};

const loadSocials = async () => {
  try {
    const response = await fetch('/api/socials');
    if (!response.ok) {
      throw new Error('Unable to fetch socials');
    }

    const data = await response.json();
    renderSocials(Array.isArray(data.socials) ? data.socials : []);
  } catch (error) {
    console.error('Failed to load socials:', error);
    renderSocials([]);
  }
};

loadMeetings();
loadSocials();

const yearElement = document.querySelector('#current-year');
if (yearElement) yearElement.textContent = new Date().getFullYear();

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.impact-grid, .service-card, .photo-strip img, .commitment-grid').forEach((element, index) => {
    element.classList.add('reveal-on-scroll');
    element.style.setProperty('--reveal-delay', `${(index % 4) * 75}ms`);
    revealObserver.observe(element);
  });
}
