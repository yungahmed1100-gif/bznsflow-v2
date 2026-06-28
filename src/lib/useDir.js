import { useEffect, useState } from 'react';

// Returns +1 for LTR and -1 for RTL so x-axis motion (tilt, magnetic, slide)
// mirrors correctly in Arabic. SSG-safe: defaults to LTR on the server, then
// reads the real <html dir> after hydration.
export function useDirSign() {
  const [sign, setSign] = useState(1);
  useEffect(() => {
    const rtl = document.documentElement.getAttribute('dir') === 'rtl';
    setSign(rtl ? -1 : 1);
  }, []);
  return sign;
}
