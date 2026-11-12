import React, { useEffect, useState } from 'react';
import { acceptFor, uploadHeaderMedia } from '../../lib/dashboard/header-media';

/** Optional: replaces the approved sample a template's image, video or PDF header otherwise sends. */
export function HeaderMediaField({ s, format, media, onChange }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState('');
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const kind = format.toLowerCase();

  const choose = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadHeaderMedia(format, file);
      setPreview(format === 'IMAGE' ? URL.createObjectURL(file) : '');
      onChange({ ...uploaded, name: file.name });
    } catch (e) {
      setError(s.reason(e.reason));
      onChange(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ld-header-media">
      <p>
        <strong>{s.t(`headerMedia_${kind}`)}</strong> · {s.t(`headerMediaHint_${kind}`)}
      </p>
      {media && (
        <p className="ld-header-media-file" role="status">
          {preview && <img src={preview} alt="" width="64" height="64" />}
          <span dir="auto">{media.name}</span> <span className="ld-chip is-green">{s.t('headerMediaAdded')}</span>
        </p>
      )}
      <label className="ld-button">
        {busy ? s.t('headerMediaUploading') : media ? s.t('headerMediaReplace') : s.t('headerMediaAdd')}
        <input
          type="file"
          accept={acceptFor(format)}
          disabled={busy}
          onChange={choose}
          className="ld-visually-hidden"
        />
      </label>
      {error && (
        <p className="ld-inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
