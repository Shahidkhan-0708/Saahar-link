// Saahar-Link App Logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme Toggle
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const currentTheme = localStorage.getItem('saahar-theme') || 'dark';

  document.body.setAttribute('data-theme', currentTheme);
  themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('saahar-theme', newTheme);
  });

  // 2. Filter Chips
  const chips = document.querySelectorAll('.tag-chip');
  const cards = document.querySelectorAll('.service-card');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const filter = chip.getAttribute('data-filter');
      filterCards(filter, searchInput.value.trim().toLowerCase());
    });
  });

  // 3. Search Filter
  const searchInput = document.getElementById('service-search-input');
  const searchBtn = document.getElementById('btn-search-trigger');

  function filterCards(categoryFilter, searchQuery) {
    cards.forEach(card => {
      const cardCategory = card.getAttribute('data-category');
      const cardText = card.innerText.toLowerCase();

      const matchesCategory = (categoryFilter === 'all' || cardCategory === categoryFilter);
      const matchesSearch = !searchQuery || cardText.includes(searchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  searchInput.addEventListener('input', () => {
    const activeChip = document.querySelector('.tag-chip.active');
    const filter = activeChip ? activeChip.getAttribute('data-filter') : 'all';
    filterCards(filter, searchInput.value.trim().toLowerCase());
  });

  searchBtn.addEventListener('click', () => {
    const activeChip = document.querySelector('.tag-chip.active');
    const filter = activeChip ? activeChip.getAttribute('data-filter') : 'all';
    filterCards(filter, searchInput.value.trim().toLowerCase());
  });

  // 4. Quick Connect Form Simulation
  const connectForm = document.getElementById('quick-connect-form');
  const feedbackMsg = document.getElementById('form-feedback-message');

  connectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name').value;
    feedbackMsg.className = 'form-response success';
    feedbackMsg.textContent = `Thank you, ${name}! Your inquiry has been routed to the local urban coordinator. Tracking reference: #SL-${Math.floor(1000 + Math.random() * 9000)}`;
    connectForm.reset();

    setTimeout(() => {
      feedbackMsg.style.display = 'none';
    }, 6000);
  });

  // 5. Stat Counter Animation
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  function runCounterAnimation() {
    if (animated) return;
    const statsSection = document.getElementById('stats');
    if (!statsSection) return;

    const rect = statsSection.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.85) {
      animated = true;
      statNumbers.forEach(stat => {
        const target = parseFloat(stat.getAttribute('data-target'));
        const originalText = stat.innerText;
        let start = 0;
        const duration = 1200;
        const startTime = performance.now();

        function updateNumber(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const current = Math.floor(progress * target);
          
          if (target > 1000) {
            stat.innerText = current.toLocaleString() + '+';
          } else if (target < 100 && target > 50) {
            stat.innerText = (progress * target).toFixed(1) + '%';
          } else if (target <= 20) {
            stat.innerText = current + ' Min';
          } else {
            stat.innerText = current + '+';
          }

          if (progress < 1) {
            requestAnimationFrame(updateNumber);
          } else {
            stat.innerText = originalText;
          }
        }

        requestAnimationFrame(updateNumber);
      });
    }
  }

  window.addEventListener('scroll', runCounterAnimation);
  runCounterAnimation();
});
