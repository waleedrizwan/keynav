// Records which [data-id] element was clicked. Listens on document, which Keynav
// does not tag, so it never makes an element look clickable by itself.
window.log = [];
document.addEventListener('click', (e) => {
  const el = e.target instanceof Element && e.target.closest('[data-id]');
  if (el) window.log.push(el.getAttribute('data-id'));
});
