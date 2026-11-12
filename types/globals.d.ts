// Ambient types for the extension's content scripts.
interface Window {
  /** Set once content.js has initialised, so it never runs twice in a page. */
  __keynav?: boolean;
}
