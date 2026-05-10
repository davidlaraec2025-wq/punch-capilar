// IntersectionObserver para animaciones de entrada
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.animate-entry').forEach(el => {
  observer.observe(el);
});

// Tabs de Guía de Uso
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    tabContents.forEach(content => {
      content.classList.add('hidden');
      content.classList.remove('active');
    });

    const targetContent = document.getElementById(`${tabName}-content`);
    if (targetContent) {
      targetContent.classList.remove('hidden');
      targetContent.classList.add('active');
    }
  });
});

// FAQ Acordeón
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
  const header = item.querySelector('.flex');
  const content = item.querySelector('.faq-content');
  const icon = item.querySelector('.faq-icon');

  header.addEventListener('click', () => {
    const isOpen = content.classList.contains('open');

    document.querySelectorAll('.faq-content').forEach(c => {
      c.classList.remove('open');
    });

    document.querySelectorAll('.faq-icon path').forEach(path => {
      path.setAttribute('d', 'M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8');
    });

    if (!isOpen) {
      content.classList.add('open');
      icon.querySelector('path').setAttribute('d', 'M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8');
    }
  });
});
