/**
 * Whether a click on a link should be handled in the page: a plain left click.
 * Cmd/Ctrl-click, Shift-click and Alt-click keep the browser's meaning (new tab,
 * new window, download), so a link that also navigates in place must check this
 * before preventDefault.
 * @param {MouseEvent | { button?: number, metaKey?: boolean, ctrlKey?: boolean, shiftKey?: boolean, altKey?: boolean }} event
 */
export const isPlainClick = event =>
  (event.button ?? 0) === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/**
 * The onClick for a link that also works in place: a plain click runs `go`
 * instead of loading the link; any other click keeps the browser's meaning.
 * @param {(event: MouseEvent) => void} go
 */
export const inPlace = go => event => {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  go(event);
};
