// Created by weixi on 2026/11/26.

export default function SearchIcon({ name }: { name: 'search' | 'close' | 'article' | 'column' | 'enter' | 'back' }) {
  const book = name === 'column';
  return <svg aria-hidden="true" viewBox={book ? '0 0 20 20' : '0 0 24 24'} fill="none" stroke="currentColor"
    strokeWidth={book ? 1.45 : name === 'search' ? 1.75 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6.7" /><path d="m16 16 4.5 4.5" /></>}
    {name === 'article' && <path d="M6 3.5h8l4 4v13H6zM14 3.5v4h4M9 12h6M9 15.5h5" />}
    {book && <><path d="M3.2 4.6Q6.4 3.5 9.8 5.2V15.6Q6.5 14.1 3.2 15.2ZM16.8 4.6Q13.6 3.5 10.2 5.2V15.6Q13.5 14.1 16.8 15.2Z" />
      <path d="M13.2 4.3V8.7L14.4 7.7L15.5 8.7V4.4" strokeWidth="1.2" /></>}
    {name === 'close' && <path d="M5 5l14 14M19 5 5 19" />}
    {name === 'enter' && <path d="M20 6v7a2 2 0 0 1-2 2H5m5-5-5 5 5 5" />}
    {name === 'back' && <path d="M19 12H5m6-6-6 6 6 6" />}
  </svg>;
}
