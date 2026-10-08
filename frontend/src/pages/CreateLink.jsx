import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, copyText } from '../api.js';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function CreateLink() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Preview of the chosen image
  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(event) {
    const chosen = event.target.files && event.target.files[0];
    if (!chosen) return;

    if (!ALLOWED.includes(chosen.type)) {
      setError('Only JPG, PNG, WEBP or GIF images are allowed.');
      return;
    }
    if (chosen.size > MAX_SIZE) {
      setError('Image is too large. Maximum size is 10 MB.');
      return;
    }
    setError('');
    setFile(chosen);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setCopied(false);

    if (!file) return setError('Please choose an image.');
    if (!title.trim()) return setError('Caption / title is required.');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title.trim());
    formData.append('description', description.trim());

    setLoading(true);
    try {
      const data = await api.createLink(formData);
      setResult(data.link);
      setFile(null);
      setTitle('');
      setDescription('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const ok = await copyText(result.shortUrl);
    setCopied(ok);
    if (!ok) setError('Could not copy. Please copy the link manually.');
  }

  function handleShare() {
    if (!result) return;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(result.shortUrl)}&text=${encodeURIComponent(
      result.title
    )}`;
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && typeof tg.openTelegramLink === 'function') {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank', 'noopener');
    }
  }

  return (
    <div>
      {result && (
        <section className="card">
          <h2 className="card-title">✅ Link created</h2>
          <div className="result-url">{result.shortUrl}</div>
          <div className="row">
            <button type="button" className="btn" onClick={handleCopy}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleShare}>
              Share
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            <Link to="/">View all links →</Link>
          </p>
        </section>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <h2 className="card-title">Create New Link</h2>

        {error && <div className="notice error">{error}</div>}

        <div className="field">
          <label>Image</label>
          <label className="upload-box" htmlFor="image-input">
            {preview ? (
              <img src={preview} alt="Selected preview" />
            ) : (
              <>
                <span style={{ fontSize: 28 }}>🖼️</span>
                <span>Tap to choose an image</span>
                <span className="hint">JPG, PNG, WEBP, GIF · max 10 MB</span>
              </>
            )}
          </label>
          <input
            id="image-input"
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFile}
          />
        </div>

        <div className="field">
          <label htmlFor="title">Caption / Title</label>
          <input
            id="title"
            className="input"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="আজকের ভাইরাল লিংক"
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            className="textarea"
            value={description}
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short text shown in the share preview"
          />
        </div>

        <button type="submit" className="btn btn-block" disabled={loading}>
          {loading ? 'Uploading & generating...' : 'Generate Link'}
        </button>
      </form>
    </div>
  );
  }
