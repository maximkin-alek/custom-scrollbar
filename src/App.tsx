import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import AppleScrollbar from './AppleScrollbar.tsx';
import './App.css';
import { TEXT } from './data.ts';

function App() {
  return (
    <div className="app">
      <h1 className="title">Custom scrollbar</h1>

      <h2 className="title">Overlayscrollbars-react</h2>
      {/* Реализация библиотеки overlayscrollbars-react */}
      <OverlayScrollbarsComponent
        defer
        className="block"
        options={{ scrollbars: { theme: 'os-theme-borsch', autoHide: 'scroll' } }}
      >
        {TEXT}
        <img
          src="https://i.pinimg.com/736x/e7/20/da/e720dae7575ae813e602940d5be8016c.jpg"
          alt=""
        />
      </OverlayScrollbarsComponent>

      {/* Кастомный вариант */}
      <h2 className="title">Custom</h2>
      <AppleScrollbar className="custom-container" size="s" fadeTimeout={1000}>
        <div className="long-content">{TEXT}</div>
        <img
          src="https://i.pinimg.com/736x/e7/20/da/e720dae7575ae813e602940d5be8016c.jpg"
          alt=""
        />
      </AppleScrollbar>

      <h3 className="title">Горизонтальный скролл</h3>
      <AppleScrollbar className="custom-container" size="m" fadeTimeout={1000}>
        <div style={{ display: 'flex', minWidth: 'max-content' }} className="">
          {new Array(15).fill('_').map((_, i) => (
            <div
              key={`h-${i}`}
              style={{
                minWidth: 100,
                margin: '0 10px',
                padding: '6px',
                background: 'yellow',
                borderRadius: 8,
              }}
            >
              Блок №{i + 1}
            </div>
          ))}
        </div>
      </AppleScrollbar>

      <h3 className="title">Вертикальный скролл</h3>
      <AppleScrollbar
        isTrack={false}
        className="custom-container"
        size="m"
        fadeTimeout={1000}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="">
          {new Array(15).fill('_').map((_, i) => (
            <div
              key={i}
              style={{
                minWidth: 100,
                margin: '0 10px',
                padding: '6px',
                background: 'yellow',
                borderRadius: 8,
              }}
            >
              Блок №{i + 1}
            </div>
          ))}
        </div>
      </AppleScrollbar>
    </div>
  );
}

export default App;
