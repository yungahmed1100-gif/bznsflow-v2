import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const WIDE = '(min-width: 1100px)';

/**
 * The state every six-tab Work shell shares: the open form and its values, the form's pick lists
 * (loaded once, when a form first opens), the preview drawer, and opening a record so that Back
 * returns to the same place (a chat, Customers, or the list scrolled where it was).
 * @param {object} o
 * @param {string} o.recordParam the URL parameter naming the open record (e.g. 'member', 'visit')
 * @param {() => Promise<object>} o.loadLists the forms' pick lists
 * @param {(message:string) => void} o.setError; @param {(reason:string) => string} o.reasonOf
 * @param {(section:string, extra?:object) => void} o.onGo
 * @param {(type:string) => void} [o.onOpenForm] runs before a form opens (Real Estate clears photos)
 * @param {() => void} [o.onCloseForm] runs when a form closes
 * @param {string} [o.initialAction] the link's ?action=, which may open a form
 * @param {(action: string) => [string, object?] | null} [o.formFor] the form (and preset) an action opens; keep it
 *   stable (module level, or useCallback over what it reads) so the form reopens only when that changes
 * @param {string} [o.place] where the workspace is (section and view); moving clears notices and re-applies the action
 * @param {() => void} [o.onPlaceChange] clears the previous place's notices
 */
export function useWorkspaceShell({
  recordParam,
  loadLists,
  setError,
  reasonOf,
  onGo,
  onOpenForm,
  onCloseForm,
  initialAction = '',
  formFor,
  place = '',
  onPlaceChange,
}) {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null),
    [values, setValues] = useState({}),
    [lists, setLists] = useState(null),
    [preview, setPreview] = useState(null);
  const scroll = useRef(0);
  const recordId = params.get(recordParam);
  const setParam = patch => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next);
  };
  const openForm = (type, preset = {}) => {
    setError('');
    setValues(preset);
    onOpenForm?.(type);
    setForm(type);
    if (!lists)
      loadLists()
        .then(setLists)
        .catch(e => setError(reasonOf(e.reason)));
    window.requestAnimationFrame?.(() =>
      document.querySelector('.hb-action-fields')?.scrollIntoView({ block: 'start' }),
    );
  };
  const closeForm = () => {
    onCloseForm?.();
    setForm(null);
    setValues({});
  };
  // Opening a record remembers where the list was; Back returns there with its filters.
  const openRecord = id => {
    scroll.current = window.scrollY;
    setPreview(null);
    setParam({ [recordParam]: id });
  };
  const openRow = id => (window.matchMedia?.(WIDE).matches ? setPreview(id) : openRecord(id));
  const back = () => {
    const from = params.get('from');
    if (from === 'chat' && params.get('chat')) return onGo('chats', { chat: params.get('chat') });
    if (from === 'customers') return onGo('customers');
    setParam({ [recordParam]: null });
  };
  // Five workspaces copied this effect, each leaving out what it read (Fitness missed the role).
  // The latest openForm/closeForm/onPlaceChange are read through a ref, so the effect runs when
  // the place, the action or the action's form changes, and only then.
  const latest = useRef(null);
  latest.current = { openForm, closeForm, onPlaceChange };
  useEffect(() => {
    if (!formFor) return;
    const { openForm: open, closeForm: close, onPlaceChange: moved } = latest.current;
    moved?.();
    const next = formFor(initialAction);
    if (next) open(...next);
    else close();
  }, [place, initialAction, formFor]);
  useLayoutEffect(() => {
    if (!recordId && scroll.current) {
      window.scrollTo(0, scroll.current);
      scroll.current = 0;
    }
  }, [recordId]);
  return {
    params,
    setParam,
    form,
    values,
    setValues,
    lists,
    setLists,
    preview,
    setPreview,
    openForm,
    closeForm,
    openRecord,
    openRow,
    back,
    recordId,
  };
}

/** Back's words: to the chat or Customers it came from, to the drill-down, else the sector's own list. */
export function backLabel(params, ar, { customers = ['Back to customers', 'العودة إلى العملاء'], fallback }) {
  const pick = pair => pair[ar ? 1 : 0];
  if (params.get('from') === 'chat') return pick(['Back to chat', 'العودة إلى المحادثة']);
  if (params.get('from') === 'customers') return pick(customers);
  if (params.get('metric')) return pick(['Back to source records', 'العودة إلى السجلات المصدرية']);
  return pick(fallback);
}
